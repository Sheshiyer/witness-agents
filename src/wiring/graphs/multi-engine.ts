// src/wiring/graphs/multi-engine.ts
// Generic multi-engine witness graph. Useful when you have many Selemene engines
// and want to run them through Aletheios + Pichet lenses + fusion.
//
// Note: Grounded context injection is handled by the orchestrator (P2-W2-SC-T15).
// Tasks with requiresGrounding: true will have retrieved passages injected
// AFTER the FactLock section, BEFORE the system prompt.

import type { AtomicTask, FactLock } from '@witness/orchestration';

export function createMultiEngineWitnessGraph(lock: FactLock): AtomicTask<'aletheios' | 'pichet' | 'engine-fusion' | 'synthesis'>[] {
  return [
    {
      id: 'aletheios-multi',
      perspective: 'aletheios',
      dependsOn: [],
      targetTokens: 1300,
      temperature: 0.22,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        // Note: grounding param passed for backward compat; orchestrator handles injection
        return {
          system: `Aletheios multi-engine analysis. Structural clarity across all engines + locked facts only.`,
          user: `Structural map of the subject using every available engine output. Focus on convergence and high-signal divergence.`,
        };
      },
    },
    {
      id: 'pichet-multi',
      perspective: 'pichet',
      dependsOn: [],
      targetTokens: 1300,
      temperature: 0.30,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        return {
          system: `Pichet multi-engine analysis. Embodied and relational reading of the engine results + locked facts.`,
          user: `How does the multi-engine data field feel? What is the somatic/relational texture?`,
        };
      },
    },
    {
      id: 'engine-fusion-raw',
      perspective: 'engine-fusion',
      dependsOn: [],
      targetTokens: 1400,
      temperature: 0.08,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        return {
          system: `Raw engine fusion. List key signals per engine, then overall high-confidence synthesis. No storytelling.`,
          user: `Fuse outputs from all Selemene engines. Be exhaustive on agreements and explicit disagreements.`,
        };
      },
    },
    {
      id: 'multi-engine-synthesis',
      perspective: 'synthesis',
      dependsOn: ['aletheios-multi', 'pichet-multi', 'engine-fusion-raw'],
      targetTokens: 1900,
      temperature: 0.18,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        return {
          system: `Final multi-engine witness synthesis. Locked facts are the spine. Integrate structural, somatic, and raw data layers.`,
          user: `Deliver the integrated multi-engine witness report with clearest patterns and open questions.`,
        };
      },
    },
  ];
}
