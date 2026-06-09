/**
 * Full End-to-End Example: Daily Atomic Wiring + Layer 3 Meta-Patterns
 *
 * This script exercises the complete Phase 1+ flow:
 *   1. Create a realistic FactLock (simulating decoder state + Selemene daily output)
 *   2. Use createDailyWitnessGraph (the production daily graph)
 *   3. Run via real inference adapter (falls back to mock if no keys)
 *   4. Assemble with cheap repair executor (forces "fast" role + tiny budget)
 *   5. Enrich a simulated Layer 3 MetaPattern with the atomic daily field
 *
 * Run with:
 *   npx tsx examples/daily-atomic-layer3.ts
 *
 * To use real models, set one of:
 *   NVIDIA_API_KEY=...   or   OPENROUTER_API_KEY=...
 */

import {
  createFactLock,
  createDailyWitnessGraph,
  createWitnessInferenceExecutor,
  createCheapRepairExecutor,
  InProcessWitnessOrchestrationService,
  NoopGroundingProvider,
  type FactLock,
  type OrchestrationObserver,
  type GroundingProvider,
  type RetrievalQuery,
  type GroundedPassage,
} from '../src/wiring/index.js';

// ---------------------------------------------------------------------------
// 1. Simulate a realistic daily FactLock (what decoder-ring + Selemene would give us)
// ---------------------------------------------------------------------------
const dailyFactLock: FactLock = createFactLock({
  subjectId: 'daily-2026-06-08-alice',
  subject: 'Alice (Daily Witness)',
  facts: {
    dominant_center: 'heart',
    active_kosha: 'manomaya',
    anti_dependency_score: 0.38,
    recursion_detected: false,
    current_engine: 'panchanga',
    relationship_status: 'unmarried_long_term_10_years',
    current_mahadasha: 'Rahu',
  },
  sources: {
    dominant_center: 'decoder-state',
    active_kosha: 'decoder-state',
    anti_dependency_score: 'anti-dependency-tracker',
    current_engine: 'engine-rotation',
    current_mahadasha: 'selemene:vimshottari',
  },
});

// ---------------------------------------------------------------------------
// 2. Build the production daily atomic graph
// ---------------------------------------------------------------------------
const dailyTasks = createDailyWitnessGraph(dailyFactLock);

// ---------------------------------------------------------------------------
// 3. Create real (or mock) executors
// ---------------------------------------------------------------------------
let executor;
let repairExecutor;

try {
  // This will succeed if keys are present
  executor = createWitnessInferenceExecutor({
    tier: 'subscriber',
  });
  repairExecutor = createCheapRepairExecutor({
    tier: 'subscriber',
  });
  console.log('✓ Using real inference adapter (NVIDIA/OpenRouter)');
} catch {
  // No keys — use a deterministic mock so the example always runs
  console.log('⚠ No LLM keys found — using deterministic mock executor for demo');
  executor = async (task: any) => ({
    taskId: task.id,
    perspective: task.perspective,
    content: `[${task.perspective.toUpperCase()}] Atomic daily output for ${task.id}\n` +
             `Locked facts respected: dominant_center=heart, anti_dependency=0.38, current_mahadasha=Rahu.\n` +
             `This is the synthesized perspective for today's field.`,
    latencyMs: 42,
    model: 'mock-fast',
  });
  repairExecutor = async () => 'REPAIRED: facts locked correctly.';
}

// ---------------------------------------------------------------------------
  // 4. Demonstrate optional grounding (P2) — Noop by default, or a mock provider
  // ---------------------------------------------------------------------------
  // For real usage you would pass a GroundingProvider backed by NVIDIA NeMo Retriever (embedding + rerank).
  // Here we show both the noop path and a mock provider that returns one high-relevance passage.
  const useMockGrounding = process.env.DEMO_MOCK_GROUNDING === '1';

  const mockGroundingProvider: GroundingProvider = {
    async retrieve(q: RetrievalQuery): Promise<GroundedPassage[]> {
      return [
        {
          id: 'demo-passage-1',
          source: 'demo-corpus:daily-mirror',
          excerpt: 'Daily field is strongest when locked facts (center, kosha, anti-dependency) are honored as the spine.',
          score: 0.87,
          provenance: 'sourced-fact',
          metadata: { demo: true },
        },
      ];
    },
  };

  const groundingProvider = useMockGrounding ? mockGroundingProvider : NoopGroundingProvider;

  // ---------------------------------------------------------------------------
  // 5. Run the atomic daily witness flow via the clean service + observer (now with optional grounding)
  // ---------------------------------------------------------------------------
  const observer: OrchestrationObserver = {
    onTaskStart: (t) => console.log(`  [start] ${t.perspective}:${t.id}`),
    onTaskComplete: (r) => console.log(`  [done]  ${r.perspective} (${r.latencyMs}ms)`),
    onWaveComplete: (w, count) => console.log(`  [wave ${w}] ${count} tasks`),
    onContradiction: (c) => console.log(`  [contra] ${c.description}`),
    onRepair: () => console.log('  [repair] applied'),
    onAssemblyComplete: (s) => console.log(`  [assembly] ${s.totalTasks} tasks, ${s.contradictions} contradictions, ${s.repairIterations} repairs`),
    onRetrievalStart: (i) => console.log(`  [retrieval:start] ${i.perspective}:${i.taskId}`),
    onRetrievalComplete: (i) => console.log(`  [retrieval:done] ${i.perspective} passages=${i.passageCount} avgRel=${i.avgRelevance?.toFixed?.(2) || i.avgRelevance} latency=${i.latencyMs}ms`),
  };

  const service = new InProcessWitnessOrchestrationService(executor, {
    defaultMaxParallel: 2,
    defaultMaxRepairIterations: 1,
    observer,
    groundingProvider,
    defaultMinRelevance: 0.65,
  });

  console.log('\n=== Running Atomic Daily Witness Graph (via InProcessService, grounding=' + (useMockGrounding ? 'mock' : 'noop') + ') ===');
  console.log(`Subject: ${dailyFactLock.subject}`);
  console.log(`Tasks: ${dailyTasks.map(t => t.id).join(' → ')}`);

  const response = await service.orchestrate({
    factLock: dailyFactLock,
    tasks: dailyTasks,
    options: { maxParallel: 2, maxRepairIterations: 1 },
  });

  // Also demonstrate the cheap repair executor explicitly in assembleOnly path if needed
  const assembled = await service.assembleOnly(response.taskResults, dailyFactLock, {
    maxRepairIterations: 1,
  });

console.log(`\nCompleted ${response.taskResults.length} atomic tasks`);
console.log(`Assembly complete (repairs: ${assembled.repairIterations})`);
console.log(`Contradictions found: ${assembled.contradictions.length}`);
if (assembled.contradictions.length > 0) {
  assembled.contradictions.forEach(c => console.log('  -', c.description));
}

// ---------------------------------------------------------------------------
// 6. Simulate Layer 3 Meta-Pattern enrichment (as done inside daily-mirror.ts)
// ---------------------------------------------------------------------------
const layer3Resonance = `Cross-engine resonance between ${dailyFactLock.facts.current_engine} and heart center. ` +
                        `Anti-dependency at ${dailyFactLock.facts.anti_dependency_score}. ` +
                        `Atomic daily field: ${assembled.output.slice(0, 180)}...`;

const simulatedLayer3 = {
  layer: 3,
  pattern_name: 'Heart-Rahu Unfolding',
  resonance_description: layer3Resonance,
  cross_references: [
    { engine: 'panchanga', link: 'tithi → dominant_center' },
    { engine: 'vedic-clock', link: 'nakshatra → current_mahadasha' },
  ],
  finders_whisper: 'Twelve more mirrors exist beyond the daily four.',
  graduation_note: undefined,
};

console.log('\n=== Simulated Layer 3 Meta-Pattern (enriched by atomic daily) ===');
console.log(JSON.stringify(simulatedLayer3, null, 2));

// ---------------------------------------------------------------------------
// 7. Full "Daily Atomic + Layer 3" payload (what a consumer would receive)
// ---------------------------------------------------------------------------
const dailyAtomicPlusLayer3 = {
  layer1: { engine: dailyFactLock.facts.current_engine, raw: '...' },
  layer2: { question: assembled.output.split('\n').slice(0, 3).join(' '), source: 'atomic-wiring' },
  layer3: simulatedLayer3,
  atomic_trace: {
    tasks: dailyTasks.map(t => t.id),
    contradictions: assembled.contradictions.length,
    repair_iterations: assembled.repairIterations,
  },
};

console.log('\n=== Complete Daily Atomic + Layer 3 Payload ===');
console.log(JSON.stringify(dailyAtomicPlusLayer3, null, 2));

console.log('\n✓ End-to-end daily atomic + Layer 3 example completed successfully.');
console.log('   Swap in real keys + createWitnessInferenceExecutor to run against live models.');
console.log('   Set DEMO_MOCK_GROUNDING=1 to exercise the retrieval injection path with a mock GroundingProvider.');
