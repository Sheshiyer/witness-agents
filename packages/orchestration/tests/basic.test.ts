// packages/orchestration/tests/basic.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFactLock,
  WitnessOrchestrator,
  assemble,
  injectGroundedContext,
  createMetricsCollector,
  type AtomicTask,
  type FactLock,
  type TaskResult,
} from '../src/index.js';

test('FactLock is created with frozen timestamp and version', () => {
  const lock = createFactLock({
    subjectId: 'test-1',
    subject: 'Test Subject',
    facts: { moon: 'Kanya', lagna: 'Gemini' },
  });

  assert.ok(lock.frozenAt);
  assert.ok(lock.version.startsWith('fl-'));
  assert.equal(lock.subject, 'Test Subject');
  assert.equal(lock.facts.moon.value, 'Kanya');
});

test('WitnessOrchestrator executes simple dependency graph', async () => {
  const lock = createFactLock({
    subjectId: 'test-2',
    subject: 'Test',
    facts: { foo: 'bar' },
  });

  const tasks: AtomicTask[] = [
    {
      id: 'a',
      perspective: 'test',
      dependsOn: [],
      targetTokens: 100,
      buildPrompts: () => ({ system: 'sys', user: 'user' }),
    },
    {
      id: 'b',
      perspective: 'test',
      dependsOn: ['a'],
      targetTokens: 100,
      buildPrompts: (l, prior) => ({ system: 'sys', user: `prior: ${Object.keys(prior).join(',')}` }),
    },
  ];

  const fakeExecutor = async (task: AtomicTask, _lock: FactLock, prior: Record<string, string>) => ({
    taskId: task.id,
    perspective: task.perspective,
    content: `result-${task.id} priorKeys:${Object.keys(prior).join(',')}`,
    latencyMs: 5,
  });

  const orchestrator = new WitnessOrchestrator(fakeExecutor);
  const results = await orchestrator.execute(tasks, lock);

  assert.equal(results.length, 2);
  assert.equal(results[0].taskId, 'a');
  assert.equal(results[1].taskId, 'b');
  assert.ok(results[1].content.includes('priorKeys:a'));
});

test('assemble stitches results and can run repair', async () => {
  const lock = createFactLock({
    subjectId: 'test-3',
    subject: 'Test',
    facts: { moon: 'Kanya' },
  });

  // Intentionally violate the lock so the mechanical checker fires and repair is exercised
  const results: TaskResult[] = [
    { taskId: 't1', perspective: 'a', content: 'moon is not Kanya. Everything is fine.', latencyMs: 1 },
  ];

  const repaired = await assemble(results, lock, {
    maxRepairIterations: 1,
    repairExecutor: async () => 'Moon is in Kanya. Repaired.',
  });

  assert.ok(repaired.output.includes('Repaired'));
  assert.equal(repaired.repairIterations, 1);
});

test('injectGroundedContext produces standardized citation block after FactLock (P2 helper)', () => {
  const lock = createFactLock({ subjectId: 'h', subject: 'H', facts: { a: 1 } });
  const passages = [
    { id: 'p1', source: 'demo:corpus', excerpt: 'Locked facts are the spine.', score: 0.91, provenance: 'sourced-fact' as const },
  ];
  const block = injectGroundedContext(lock, passages);
  assert.ok(block.includes('Retrieved Context'));
  assert.ok(block.includes('sourced-fact'));
  assert.ok(block.includes('Locked facts are the spine.'));
  assert.ok(block.includes('demo:corpus'));
  // Empty case returns ''
  assert.equal(injectGroundedContext(lock, []), '');
  assert.equal(injectGroundedContext(lock, undefined as any), '');
});

test('createMetricsCollector captures retrieval signals (P2 metrics)', () => {
  const { observer, getMetrics, reset } = createMetricsCollector();
  reset();

  // Simulate retrieval flow
  observer.onRetrievalStart?.({ taskId: 't1', perspective: 'aletheios' });
  observer.onRetrievalComplete?.({ taskId: 't1', perspective: 'aletheios', passageCount: 2, avgRelevance: 0.88, latencyMs: 12, costUsd: 0 });
  observer.onRetrievalStart?.({ taskId: 't2', perspective: 'pichet' });
  observer.onRetrievalComplete?.({ taskId: 't2', perspective: 'pichet', passageCount: 1, avgRelevance: 0.71, latencyMs: 7, costUsd: 0 });

  const m = getMetrics();
  assert.ok(m.retrieval);
  assert.equal(m.retrieval.calls, 2);
  assert.equal(m.retrieval.totalPassages, 3);
  assert.ok(m.retrieval.avgRelevance > 0.7);
  assert.equal(m.retrieval.byPerspective.aletheios.calls, 1);
  assert.equal(m.retrieval.byPerspective.pichet.passages, 1);
  assert.equal(m.retrieval.byPerspective.aletheios.avgRelevance, 0.88);
});
