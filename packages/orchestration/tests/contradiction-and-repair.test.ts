// packages/orchestration/tests/contradiction-and-repair.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFactLock,
  assemble,
  detectContradictions,
  createSimpleLLMFactChecker,
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
