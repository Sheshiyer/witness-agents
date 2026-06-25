import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFactLock,
  InProcessWitnessOrchestrationService,
  type GroundedPassage,
  type GroundingProvider,
} from '@witness/orchestration';
import {
  createDailyWitnessGraph,
  createDyadWitnessGraph,
  createMultiEngineWitnessGraph,
  createResearchSynthesisGraph,
  createSectionWitnessGraph,
} from '../src/wiring/index.js';

const mockProvider: GroundingProvider = {
  async retrieve(): Promise<GroundedPassage[]> {
    return [{
      id: 'p1',
      source: 'review:graph',
      excerpt: 'A stable source mirror that adds resonance without replacing locked facts.',
      score: 0.91,
      provenance: 'sourced-fact',
    }];
  },
};

async function runGraph(
  tasks: ReturnType<typeof createDailyWitnessGraph>,
): Promise<{ retrievalCalls: number; promptSnapshots: string[]; output: string }> {
  let retrievalCalls = 0;
  const provider: GroundingProvider = {
    async retrieve(query) {
      retrievalCalls += 1;
      return mockProvider.retrieve(query);
    },
  };
  const promptSnapshots: string[] = [];
  const svc = new InProcessWitnessOrchestrationService(
    async (task, lock, prior, grounding) => {
      const prompts = task.buildPrompts(lock, prior, grounding);
      promptSnapshots.push(`${prompts.system}\n${prompts.user}`);
      return {
        taskId: task.id,
        perspective: task.perspective,
        content: `${task.id}:g=${grounding?.length ?? 0}`,
        latencyMs: 1,
      };
    },
    { groundingProvider: provider },
  );
  const lock = createFactLock({
    subjectId: 'graph-test',
    subject: 'Graph Test',
    facts: {
      moon: 'Kanya',
      relationship: 'unmarried_long_term_10_years',
      center: 'heart',
      panchanga: 'available',
    },
  });
  const result = await svc.orchestrate({ factLock: lock, tasks });
  return { retrievalCalls, promptSnapshots, output: result.output };
}

test('P2 graph grounding is standardized across daily, dyad, research, and multi-engine graphs', async () => {
  const lock = createFactLock({
    subjectId: 'graph-test',
    subject: 'Graph Test',
    facts: { moon: 'Kanya', relationship: 'unmarried_long_term_10_years', center: 'heart' },
  });
  const graphSets = [
    { name: 'daily', tasks: createDailyWitnessGraph(lock), expectedCalls: 3 },
    { name: 'dyad', tasks: createDyadWitnessGraph(lock), expectedCalls: 3 },
    { name: 'research', tasks: createResearchSynthesisGraph(lock), expectedCalls: 4 },
    { name: 'multi', tasks: createMultiEngineWitnessGraph(lock), expectedCalls: 4 },
  ];

  for (const graph of graphSets) {
    const result = await runGraph(graph.tasks as ReturnType<typeof createDailyWitnessGraph>);
    assert.equal(result.retrievalCalls, graph.expectedCalls, `${graph.name} grounding call count`);
    assert.ok(result.output.includes('g=1'), `${graph.name} receives grounded passages`);
    assert.ok(
      result.promptSnapshots.some(prompt => prompt.includes('Retrieved Context') && prompt.includes('resonance mirrors only')),
      `${graph.name} prompt uses standardized grounding block`,
    );
  }
});

test('section witness graph uses resonance-only grounding guardrail wording', async () => {
  const lock = createFactLock({
    subjectId: 'section-test',
    subject: 'Section Test',
    facts: {
      name: 'Section Test',
      panchanga: 'available',
      engines: { panchanga: { tithi: 'Ekadashi' } },
    },
  });
  const tasks = createSectionWitnessGraph(lock, { includeSynthesis: false });
  assert.ok(tasks.length > 0);

  const groundedTask = tasks.find(task => task.requiresGrounding);
  assert.ok(groundedTask);
  const prompts = groundedTask.buildPrompts(lock, {}, [{
    id: 'p',
    source: 'section:review',
    excerpt: 'Layer-specific supporting mirror.',
    score: 0.9,
    provenance: 'sourced-fact',
  }]);
  assert.ok(prompts.system.includes('resonance mirrors'));
  assert.ok(prompts.user.includes('never treat them as authority over the FactLock'));
});
