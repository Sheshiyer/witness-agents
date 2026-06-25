// packages/orchestration/tests/service.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFactLock,
  WitnessOrchestrator,
  assemble,
  InProcessWitnessOrchestrationService,
  type WitnessOrchestrationService,
  type OrchestrateRequest,
  type GroundingProvider,
  type RetrievalQuery,
  type GroundedPassage,
} from '../src/index.js';

// A minimal in-memory implementation of the service interface for testing the contract
class InMemoryWitnessOrchestrationService implements WitnessOrchestrationService {
  async orchestrate(req: OrchestrateRequest) {
    const orchestrator = new WitnessOrchestrator(async (task) => ({
      taskId: task.id,
      perspective: task.perspective,
      content: `synthesized-${task.id}`,
      latencyMs: 10,
    }));

    const results = await orchestrator.execute(req.tasks, req.factLock);
    return assemble(results, req.factLock, {
      maxRepairIterations: req.options?.maxRepairIterations ?? 1,
      repairExecutor: async () => 'repaired',
    });
  }
}

test('WitnessOrchestrationService interface can be implemented and used', async () => {
  const service: WitnessOrchestrationService = new InMemoryWitnessOrchestrationService();

  const lock = createFactLock({
    subjectId: 'svc-test',
    subject: 'Service Test',
    facts: { moon: 'Kanya' },
  });

  const tasks = [
    {
      id: 't1',
      perspective: 'test',
      dependsOn: [],
      targetTokens: 100,
      buildPrompts: () => ({ system: '', user: '' }),
    },
  ];

  const result = await service.orchestrate({ factLock: lock, tasks });

  assert.ok(result.output.includes('synthesized-t1'));
  assert.ok(result.repairIterations >= 0);
});

test('InProcessWitnessOrchestrationService forwards GroundingProvider and retrieval signals (P2-W1)', async () => {
  const lock = createFactLock({
    subjectId: 'grounded-test',
    subject: 'Grounded Subject',
    facts: { topic: 'witness reliability' },
  });

  const tasks = [
    {
      id: 't1',
      perspective: 'aletheios',
      dependsOn: [],
      targetTokens: 100,
      requiresGrounding: true,
      buildPrompts: (l: any, prior: any, g?: any) => ({
        system: `Grounded system. ${g && g.length ? 'Has ' + g.length + ' passages.' : 'No passages.'}`,
        user: 'Do the work.',
      }),
    },
  ];

  // Mock provider that returns one high-relevance passage
  const mockProvider: GroundingProvider = {
    async retrieve(q: RetrievalQuery): Promise<GroundedPassage[]> {
      return [
        {
          id: 'p1',
          source: 'test-corpus',
          excerpt: 'Witness agents must respect the FactLock above all.',
          score: 0.92,
          provenance: 'sourced-fact',
        },
      ];
    },
  };

  const retrievalEvents: any[] = [];
  const observer = {
    onRetrievalStart: (i: any) => retrievalEvents.push({ type: 'start', ...i }),
    onRetrievalComplete: (i: any) => retrievalEvents.push({ type: 'complete', ...i }),
  };

  const executor = async (task: any, _lock: any, _prior: any, grounding?: any) => ({
    taskId: task.id,
    perspective: task.perspective,
    content: `synthesized with ${grounding?.length || 0} passages`,
    latencyMs: 5,
  });

  const service = new InProcessWitnessOrchestrationService(executor, {
    observer,
    groundingProvider: mockProvider,
    defaultMinRelevance: 0.65,
  });

  const result = await service.orchestrate({ factLock: lock, tasks });

  assert.ok(result.output.includes('synthesized with 1 passages'));
  assert.equal(retrievalEvents.length, 2);
  assert.equal(retrievalEvents[0].type, 'start');
  assert.equal(retrievalEvents[1].type, 'complete');
  assert.equal(retrievalEvents[1].passageCount, 1);
  assert.ok(retrievalEvents[1].avgRelevance >= 0.9);
});

test('InProcess service respects retrievalBudgetTokens via estimateCost (P2 T11 budget path)', async () => {
  const lock = createFactLock({ subjectId: 'budget-test', subject: 'Budgeted', facts: { x: 1 } });

  const tasks = [{
    id: 't1',
    perspective: 'test',
    dependsOn: [],
    targetTokens: 50,
    requiresGrounding: true,
    buildPrompts: (l: any, p: any, g?: any) => ({ system: `g:${g?.length || 0}`, user: '' }),
  }];

  const budgetProvider: GroundingProvider = {
    async retrieve(): Promise<GroundedPassage[]> { return [{ id: 'p', source: 'x', excerpt: 'y', score: 0.9, provenance: 'sourced-fact' }]; },
    async estimateCost() { return { latencyMs: 10, tokens: 999999 }; }, // would exceed any small budget
  };

  const events: any[] = [];
  const obs = {
    onRetrievalStart: (i: any) => events.push({ t: 'start', ...i }),
    onRetrievalComplete: (i: any) => events.push({ t: 'complete', ...i }),
  };

  const exec = async (task: any, _l: any, _pr: any, g?: any) => ({ taskId: task.id, perspective: task.perspective, content: `g=${g?.length || 0}`, latencyMs: 1 });

  const svc = new InProcessWitnessOrchestrationService(exec, {
    observer: obs,
    groundingProvider: budgetProvider,
    defaultRetrievalBudgetTokens: 100,
  });

  const res = await svc.orchestrate({ factLock: lock, tasks });
  // Because estimate exceeded budget, retrieval should have been skipped → 0 passages injected
  assert.ok(res.output.includes('g=0'));
  // We should still have seen start + a complete (with 0 passages) for observability
  const completes = events.filter(e => e.t === 'complete');
  assert.ok(completes.length >= 1);
  assert.equal(completes[0].passageCount, 0);
});

test('InProcess service decrements aggregate retrievalBudgetTokens across tasks (P2 T11)', async () => {
  const lock = createFactLock({ subjectId: 'aggregate-budget', subject: 'Budgeted', facts: { x: 1 } });
  const tasks = ['t1', 't2'].map(id => ({
    id,
    perspective: 'test',
    dependsOn: [],
    targetTokens: 50,
    requiresGrounding: true,
    buildPrompts: () => ({ system: '', user: '' }),
  }));

  let retrieveCalls = 0;
  const budgetProvider: GroundingProvider = {
    async retrieve(): Promise<GroundedPassage[]> {
      retrieveCalls += 1;
      return [{ id: `p${retrieveCalls}`, source: 'x', excerpt: 'budgeted passage', score: 0.9, provenance: 'sourced-fact' }];
    },
    async estimateCost() { return { latencyMs: 10, tokens: 60 }; },
  };

  const exec = async (task: any, _l: any, _pr: any, g?: any) => ({
    taskId: task.id,
    perspective: task.perspective,
    content: `${task.id}:g=${g?.length || 0}`,
    latencyMs: 1,
  });

  const svc = new InProcessWitnessOrchestrationService(exec, {
    groundingProvider: budgetProvider,
    defaultRetrievalBudgetTokens: 100,
  });

  const res = await svc.orchestrate({ factLock: lock, tasks });
  assert.equal(retrieveCalls, 1);
  assert.ok(res.output.includes('t1:g=1'));
  assert.ok(res.output.includes('t2:g=0'));
});

test('InProcess service enforces maxRetrievalLatencyMs as default-deny timeout', async () => {
  const lock = createFactLock({ subjectId: 'timeout-test', subject: 'Timeout', facts: { x: 1 } });
  const tasks = [{
    id: 'slow',
    perspective: 'test',
    dependsOn: [],
    targetTokens: 50,
    requiresGrounding: true,
    buildPrompts: () => ({ system: '', user: '' }),
  }];

  const slowProvider: GroundingProvider = {
    async retrieve(): Promise<GroundedPassage[]> {
      await new Promise(resolve => setTimeout(resolve, 40));
      return [{ id: 'late', source: 'slow', excerpt: 'too late', score: 0.9, provenance: 'sourced-fact' }];
    },
  };

  const exec = async (task: any, _l: any, _pr: any, g?: any) => ({
    taskId: task.id,
    perspective: task.perspective,
    content: `g=${g?.length || 0}`,
    latencyMs: 1,
  });

  const svc = new InProcessWitnessOrchestrationService(exec, {
    groundingProvider: slowProvider,
    defaultMaxRetrievalLatencyMs: 5,
  });

  const res = await svc.orchestrate({ factLock: lock, tasks });
  assert.ok(res.output.includes('g=0'));
});
