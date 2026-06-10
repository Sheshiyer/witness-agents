// src/wiring/graphs/daily-witness.ts
// Production atomic task graph for the Standalone Daily Witness flow.
// This is the second concrete example (besides the Dyad).

import type { AtomicTask, FactLock } from '@witness/orchestration';

/**
 * Creates an atomic task graph for a standalone daily witness / mirror session.
 *
 * Perspectives:
 * - aletheios: structural clarity, identity stack, dharma for the day
 * - pichet: somatic felt-sense, relational field, bodily knowing for the day
 * - synthesis: integrated daily field + one clear practice or question
 *
 * Locked facts typically include: current kosha, dominant center, anti-dependency score,
 * recent mirror data, user state, etc.
 *
 * Note: Grounded context injection is handled by the orchestrator (P2-W2-SC-T15).
 * Tasks with requiresGrounding: true will have retrieved passages injected
 * AFTER the FactLock section, BEFORE the system prompt.
 */
export function createDailyWitnessGraph(lock: FactLock): AtomicTask<'aletheios' | 'pichet' | 'synthesis'>[] {
  return [
    {
      id: 'aletheios-daily',
      perspective: 'aletheios',
      dependsOn: [],
      targetTokens: 1400,
      temperature: 0.28,
      // Synthesis and structural layers benefit from grounding for richer daily field resonance.
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        // Note: grounding param passed for backward compat; orchestrator handles injection
        return {
          system: `You are Aletheios: the clear, structural witness for the daily field.
Map the locked facts (especially current kosha, dominant center, anti-dependency, and recent context) into precise meaning for today.
Be exact and integrative.`,
          user: `Produce the Aletheios daily structural witnessing.
Focus on what the locked facts say about the current field and the most important structural theme for this day.`,
        };
      },
    },
    {
      id: 'pichet-daily',
      perspective: 'pichet',
      dependsOn: [],
      targetTokens: 1400,
      temperature: 0.38,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        return {
          system: `You are Pichet: the somatic, embodied, relational witness for the daily field.
Honor the locked facts while surfacing how they feel in the body and in relationship to self/world today.
Never contradict the FACT LOCK.`,
          user: `Produce the Pichet daily somatic witnessing.
Pay special attention to the dominant center and any somatic or relational texture implied by the locked facts and recent context.`,
        };
      },
    },
    {
      id: 'daily-synthesis',
      perspective: 'synthesis',
      dependsOn: ['aletheios-daily', 'pichet-daily'],
      targetTokens: 1800,
      temperature: 0.22,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        return {
          system: `You are the final Daily Witness synthesis.
You receive Aletheios (structural) and Pichet (somatic) streams.
Weave them into one coherent daily field report while strictly respecting the locked facts.
End with one clear, actionable practice or question for the day.`,
          user: `Synthesize the two daily witness streams into a single integrated daily witnessing.
Respect all locked facts (kosha, center, anti-dependency score, etc.).
Deliver the strongest single sentence that captures today's field + one practical next step.`,
        };
      },
    },
  ];
}
