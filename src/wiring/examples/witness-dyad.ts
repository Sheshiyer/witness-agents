// src/wiring/examples/witness-dyad.ts
/**
 * Example: Wiring Aletheios + Pichet + Selemene using Atomic Fact-Locked Decomposition.
 *
 * This is a Phase 1 demonstration of how to orchestrate the core witness perspectives
 * with locked subject facts, dependency-aware execution, and assembly-time repair.
 *
 * In a real integration you would:
 *   - Pull real Selemene engine outputs into the FactLock
 *   - Use the project's actual inference executor (see src/inference)
 *   - Plug the final assembled output into your existing pipeline/synthesis
 */

import {
  createFactLock,
  WitnessOrchestrator,
  AtomicTask,
  FactLock,
  assemble,
  createWitnessInferenceExecutor,
  createCheapRepairExecutor,
  createDyadWitnessGraph,
} from '../index.js';

// 1. Create a frozen FactLock from subject data (normally from Selemene + user input)
const subjectLock: FactLock = createFactLock({
  subjectId: 'witness-alchemist-1991',
  subject: 'Cumbipuram Nateshan Sheshnarayan Iyer (The Witness Alchemist)',
  facts: {
    moonRashi: 'Kanya',
    moonNakshatra: 'Uttara Phalguni',
    moonDegrees: 159.831,
    lagna: 'Gemini',
    currentMahadasha: 'Rahu',
    hdType: '2/4 Generator',
    relationshipStatus: 'unmarried_long_term_10_years',
  },
  sources: {
    moonRashi: 'selemene:panchanga',
    currentMahadasha: 'selemene:vimshottari',
    hdType: 'user:provided',
  },
});

// 2. Define atomic tasks for the dyad

const tasks: AtomicTask<'aletheios' | 'pichet' | 'selemene' | 'synthesis'>[] = [
  {
    id: 'aletheios-core',
    perspective: 'aletheios',
    dependsOn: [],
    targetTokens: 1800,
    temperature: 0.35,
    buildPrompts: (_lock: any, _prior: Record<string, string>) => ({
      system: `You are Aletheios — the clear, structural, integrative witness perspective.
Focus on identity stack, structure, and precise mapping of the locked facts into meaning.
Stay extremely faithful to the FACT LOCK.`,
      user: `Produce the Aletheios core witnessing for this subject.
Emphasize how the locked facts (especially Moon, Lagna, Mahadasha, and relationship status) shape the current field.
Keep it concise but complete.`,
    }),
  },
  {
    id: 'pichet-core',
    perspective: 'pichet',
    dependsOn: [],
    targetTokens: 1800,
    temperature: 0.45,
    buildPrompts: (_lock: any, _prior: Record<string, string>) => ({
      system: `You are Pichet — the somatic, felt-sense, relational witness perspective.
Honor the locked facts while surfacing embodied and relational texture.
Never contradict the FACT LOCK.`,
      user: `Produce the Pichet core witnessing.
Pay special attention to how the 10-year unmarried relationship status and current Mahadasha feel in the body and in partnership.`,
    }),
  },
  {
    id: 'selemene-anchors',
    perspective: 'selemene',
    dependsOn: [],
    targetTokens: 1200,
    temperature: 0.2,
    buildPrompts: (_lock: any, _prior: Record<string, string>) => ({
      system: `You are the Selemene anchor layer. Your job is to restate the most important locked facts with extreme precision and minimal interpretation.`,
      user: `List the key Selemene-derived anchors (Moon, Lagna, Mahadasha, key yogas if known) for this subject using only the locked facts. No elaboration.`,
    }),
  },
  {
    id: 'dyad-synthesis',
    perspective: 'synthesis',
    dependsOn: ['aletheios-core', 'pichet-core', 'selemene-anchors'],
    targetTokens: 2200,
    temperature: 0.25,
    buildPrompts: (_lock: any, _prior: Record<string, string>) => ({
      system: `You are the final witness synthesis layer.
You receive independent witnessings from Aletheios, Pichet, and the Selemene anchors.
Your job is to weave them into one coherent dyadic field while STRICTLY respecting the FACT LOCK.
Highlight points of convergence and productive tension. Never override locked facts.`,
      user: `Synthesize the three prior witness streams into a single integrated dyad witnessing.
Use the locked facts as the non-negotiable spine of the output.`,
    }),
  },
];

// 3. Real executor wired to the project's inference + routing
const realExecutor = createWitnessInferenceExecutor({
  // tier will be picked from env or default to subscriber
});

// 3b. Cheap repair executor (narrow, low-token, low-temp)
const cheapRepairExecutor = createCheapRepairExecutor({
  // same config as above
});

// 4. Run the orchestrated flow using the production dyad graph
export async function runWitnessDyadExample() {
  const orchestrator = new WitnessOrchestrator(realExecutor, { maxParallel: 2 });

  console.log('=== Phase 1: Atomic Fact-Locked Witness Dyad (Real Executor) ===');
  console.log(`Subject: ${subjectLock.subject}`);
  console.log(`Locked facts: ${Object.keys(subjectLock.facts).join(', ')}`);

  // Use the real production graph
  const tasks = createDyadWitnessGraph(subjectLock);

  const taskResults = await orchestrator.execute(tasks, subjectLock);

  const assembly = await assemble(taskResults, subjectLock, {
    maxRepairIterations: 1,
    repairExecutor: cheapRepairExecutor,
  });

  console.log('\n--- Final Assembled Output (truncated) ---');
  console.log(assembly.output.slice(0, 800) + '\n...');
  console.log(`\nContradictions found: ${assembly.contradictions.length}`);
  console.log(`Repair iterations: ${assembly.repairIterations}`);

  return assembly;
}

// Uncomment to run standalone:
// runWitnessDyadExample().catch(console.error);
