// src/wiring/graphs/multi-engine.ts
// Generic multi-engine witness graph. Useful when you have many Selemene engines
// and want to run them through Aletheios + Pichet lenses + fusion.

import type { AtomicTask, FactLock } from '@witness/orchestration';
import { injectGroundedContext } from '@witness/orchestration';

export function createMultiEngineWitnessGraph(lock: FactLock): AtomicTask<'aletheios' | 'pichet' | 'engine-fusion' | 'synthesis'>[] {
  return [
    {
      id: 'aletheios-multi',
      perspective: 'aletheios',
      dependsOn: [],
      targetTokens: 1300,
      temperature: 0.22,
      requiresGrounding: true,
      buildPrompts: (lock, prior, grounding) => {
        const grounded = injectGroundedContext(lock, grounding);
        return {
          system: `Aletheios multi-engine analysis. Structural clarity across all engines + locked facts only.${grounded ? '\n\n' + grounded : ''}`,
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
      buildPrompts: (lock, prior, grounding) => {
        const grounded = injectGroundedContext(lock, grounding);
        return {
          system: `Pichet multi-engine analysis. Embodied and relational reading of the engine results + locked facts.${grounded ? '\n\n' + grounded : ''}`,
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
      buildPrompts: (lock, prior, grounding) => {
        const grounded = injectGroundedContext(lock, grounding);
        return {
          system: `Raw engine fusion. List key signals per engine, then overall high-confidence synthesis. No storytelling.${grounded ? '\n\n' + grounded : ''}`,
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
      buildPrompts: (lock, prior, grounding) => {
        const grounded = injectGroundedContext(lock, grounding);
        return {
          system: `Final multi-engine witness synthesis. Locked facts are the spine. Integrate structural, somatic, and raw data layers.${grounded ? '\n\n' + grounded : ''}`,
          user: `Deliver the integrated multi-engine witness report with clearest patterns and open questions.`,
        };
      },
    },
  ];
}
