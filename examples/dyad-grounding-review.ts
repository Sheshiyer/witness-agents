/**
 * P2 Example: Grounded Dyad Review Harness
 *
 * Runs the dyad graph with a deterministic mock GroundingProvider so reviewers
 * can inspect grounding behavior without live LLM or NVIDIA keys.
 *
 * Run with:
 *   npx tsx examples/dyad-grounding-review.ts
 */

import {
  createFactLock,
  createDyadWitnessGraph,
  InProcessWitnessOrchestrationService,
  type GroundedPassage,
  type GroundingProvider,
} from '../src/wiring/index.js';

const lock = createFactLock({
  subjectId: 'review-dyad',
  subject: 'Review Dyad',
  facts: {
    moon: 'Kanya',
    relationship: 'unmarried_long_term_10_years',
    mahadasha: 'Venus',
  },
});

let retrievalCalls = 0;
const groundingProvider: GroundingProvider = {
  async retrieve(): Promise<GroundedPassage[]> {
    retrievalCalls += 1;
    return [{
      id: `dyad-review-${retrievalCalls}`,
      source: 'review:dyad',
      excerpt: 'The 10-year relationship is a stable relational spine that should be witnessed as continuity rather than resolved as a problem.',
      score: 0.9,
      provenance: 'sourced-fact',
    }];
  },
  async estimateCost() {
    return { latencyMs: 5, tokens: 120, costUsd: 0 };
  },
};

const promptSnapshots: string[] = [];
const service = new InProcessWitnessOrchestrationService(
  async (task, factLock, prior, grounding) => {
    const prompts = task.buildPrompts(factLock, prior, grounding);
    promptSnapshots.push(`\n--- ${task.id} ---\n${prompts.system}\n${prompts.user}`);
    return {
      taskId: task.id,
      perspective: task.perspective,
      content: `[${task.perspective}] grounded output for ${task.id}; passages=${grounding?.length ?? 0}`,
      latencyMs: 5,
    };
  },
  {
    groundingProvider,
    defaultMinRelevance: 0.65,
    defaultRetrievalBudgetTokens: 1_000,
    defaultMaxRetrievalLatencyMs: 250,
  },
);

const result = await service.orchestrate({
  factLock: lock,
  tasks: createDyadWitnessGraph(lock),
});

console.log('=== Grounded Dyad Review ===');
console.log(`retrievalCalls=${retrievalCalls}`);
console.log(`taskResults=${result.taskResults.length}`);
console.log(`contradictions=${result.contradictions.length}`);
console.log(`repairIterations=${result.repairIterations}`);
console.log('\n=== Output Preview ===');
console.log(result.output.slice(0, 1200));
console.log('\n=== Prompt Injection Evidence ===');
console.log(promptSnapshots.filter(p => p.includes('Retrieved Context')).join('\n'));
