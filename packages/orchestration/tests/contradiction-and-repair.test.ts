// packages/orchestration/tests/contradiction-and-repair.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFactLock,
  assemble,
  detectContradictions,
  createSimpleLLMFactChecker,
  createGroundedLLMFactChecker,
} from '../src/index.js';

const mockLock = createFactLock({
  subjectId: 'test-contradiction',
  subject: 'Test Subject',
  facts: {
    moonRashi: 'Kanya',
    lagna: 'Gemini',
    currentMahadasha: 'Rahu',
    relationshipStatus: 'unmarried_long_term_10_years',
  },
});

test('detectContradictions catches direct negation of locked fact', () => {
  // The mechanical checker looks for explicit negation/contrast of the *locked* (correct) value
  const badOutput = 'moonRashi is not Kanya. This feels nurturing and protective. Lagna is Gemini as locked.';
  const issues = detectContradictions(badOutput, mockLock);
  assert.ok(issues.length > 0);
  assert.ok(issues.some(i => i.description.includes('moonRashi')));
});

test('detectContradictions does not false-positive on correct locked facts', () => {
  const goodOutput = 'Moon rashi is Kanya at 159.831° in Uttara Phalguni. Lagna is Gemini. Current Mahadasha is Rahu.';
  const issues = detectContradictions(goodOutput, mockLock);
  assert.equal(issues.length, 0);
});

test('assemble runs repair when contradictions are present', async () => {
  const badResult = [{
    taskId: 'test-task',
    perspective: 'test',
    content: 'moonRashi is not Kanya, which is very emotional. Lagna Gemini.',
    latencyMs: 10,
  }];

  let repairCalled = false;
  const assembly = await assemble(badResult as any, mockLock, {
    maxRepairIterations: 1,
    repairExecutor: async (prompt) => {
      repairCalled = true;
      return 'Moon is in Kanya. Repaired section respecting lock.';
    },
  });

  assert.ok(repairCalled);
  assert.ok(assembly.output.includes('Kanya'));
  assert.ok(assembly.repairIterations >= 1);
});

test('createSimpleLLMFactChecker can be used (mocked)', async () => {
  const mockCallModel = async () => ({
    content: JSON.stringify([
      { key: 'moonRashi', statedValue: 'Karka' },
    ]),
  });

  const checker = createSimpleLLMFactChecker(mockCallModel);
  const issues = await checker('The moon is in Karka.', mockLock);

  assert.ok(issues.length > 0);
  assert.ok(issues[0].description.includes('moonRashi'));
});

test('assemble with factChecker integrates structured issues', async () => {
  const results = [{ taskId: 't1', perspective: 'a', content: 'Everything is fine.', latencyMs: 5 }];

  const mockChecker = async () => [{
    type: 'fact-violation' as const,
    description: 'Structured: moonRashi wrong',
    excerpt: 'bad excerpt',
  }];

  const assembly = await assemble(results as any, mockLock, {
    maxRepairIterations: 1,
    repairExecutor: async () => 'fixed',
    factChecker: mockChecker,
  });

  assert.ok(assembly.contradictions.some(c => c.description.includes('Structured')));
});

// P3: Retrieval-augmented repair test
test('assemble uses groundingProvider during repair when provided', async () => {
  const badResult = [{
    taskId: 'test-task',
    perspective: 'test',
    content: 'moonRashi is not Kanya, which feels wrong. Lagna Gemini.',
    latencyMs: 10,
  }];

  let retrieveCalled = false;
  let capturedRepairPrompt = '';

  const mockGroundingProvider = {
    async retrieve(query: any) {
      retrieveCalled = true;
      assert.equal(query.perspective, 'repair');
      assert.equal(query.taskId, 'assembler-repair');
      assert.equal(query.subjectId, 'test-contradiction');
      return [{
        id: 'passage-1',
        source: 'user-history:2024-moon-analysis',
        excerpt: 'The Moon was in Kanya (Virgo) during the natal period, indicating analytical nature.',
        score: 0.89,
        provenance: 'sourced-fact' as const,
      }];
    },
  };

  const assembly = await assemble(badResult as any, mockLock, {
    maxRepairIterations: 1,
    repairExecutor: async (prompt) => {
      capturedRepairPrompt = prompt;
      return 'Moon is in Kanya. Repaired section respecting lock.';
    },
    groundingProvider: mockGroundingProvider,
  });

  // Verify grounding was called during repair
  assert.ok(retrieveCalled, 'groundingProvider.retrieve should be called during repair');

  // Verify the retrieved passage was injected into the repair prompt
  assert.ok(
    capturedRepairPrompt.includes('Supporting mirrors from corpus'),
    'Repair prompt should include supporting mirrors section'
  );
  assert.ok(
    capturedRepairPrompt.includes('user-history:2024-moon-analysis'),
    'Repair prompt should include the passage source'
  );
  assert.ok(
    capturedRepairPrompt.includes('0.89'),
    'Repair prompt should include the relevance score'
  );
  assert.ok(
    capturedRepairPrompt.includes('never override locked facts'),
    'Repair prompt should include the resonance-only guard'
  );

  // Contract still holds
  assert.ok(assembly.output.includes('Kanya'));
  assert.ok(assembly.repairIterations >= 1);
});

// P3: Grounded fact-checker test
test('createGroundedLLMFactChecker retrieves context and detects violations', async () => {
  let retrieveCalled = false;
  let capturedSystem = '';

  const mockGroundingProvider = {
    async retrieve(query: any) {
      retrieveCalled = true;
      assert.equal(query.perspective, 'fact-check');
      assert.equal(query.taskId, 'fact-checker');
      return [{
        id: 'passage-1',
        source: 'canonical:vedic-jyotish',
        excerpt: 'Kanya (Virgo) is an earth sign ruled by Mercury.',
        score: 0.92,
        provenance: 'sourced-fact' as const,
      }];
    },
  };

  const mockCallModel = async (system: string, user: string) => {
    capturedSystem = system;
    // Return a claim that contradicts the locked fact
    return {
      content: JSON.stringify([
        { key: 'moonRashi', statedValue: 'Karka' },
      ]),
    };
  };

  const checker = createGroundedLLMFactChecker(mockCallModel, mockGroundingProvider);
  const issues = await checker('The moon is in Karka, a water sign.', mockLock);

  // Verify grounding was retrieved
  assert.ok(retrieveCalled, 'groundingProvider.retrieve should be called during fact-check');

  // Verify grounded context was injected into system prompt
  assert.ok(
    capturedSystem.includes('SUPPORTING CONTEXT'),
    'System prompt should include supporting context section'
  );
  assert.ok(
    capturedSystem.includes('canonical:vedic-jyotish'),
    'System prompt should include the passage source'
  );
  assert.ok(
    capturedSystem.includes('locked facts always take precedence'),
    'System prompt should include the precedence guard'
  );

  // Verify contradiction was detected
  assert.ok(issues.length > 0, 'Should detect contradiction');
  assert.ok(issues[0].description.includes('moonRashi'), 'Should identify moonRashi as the violated key');
  assert.ok(issues[0].description.includes('Grounded check'), 'Should mark as grounded check');
});

test('createGroundedLLMFactChecker gracefully degrades on retrieval failure', async () => {
  const mockGroundingProvider = {
    async retrieve(_query: any) {
      throw new Error('Retrieval failed');
    },
  };

  const mockCallModel = async () => ({
    content: JSON.stringify([]),
  });

  const checker = createGroundedLLMFactChecker(mockCallModel, mockGroundingProvider);
  // Should not throw, should return empty (graceful degradation)
  const issues = await checker('Some text', mockLock);
  assert.ok(Array.isArray(issues), 'Should return array even on retrieval failure');
});
