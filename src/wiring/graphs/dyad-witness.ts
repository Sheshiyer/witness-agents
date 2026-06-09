// src/wiring/graphs/dyad-witness.ts
// Production-grade atomic task graph for a full Aletheios + Pichet + Selemene dyad witness flow.
// This is the first concrete "real" graph using the atomic wiring pattern.

import type { AtomicTask, FactLock } from '@witness/orchestration';
import { injectGroundedContext } from '@witness/orchestration';

/**
 * Creates a production dyad witness task graph.
 *
 * Perspectives:
 * - aletheios: structural, integrative, clear
 * - pichet: somatic, relational, felt-sense
 * - selemene: precise engine anchors (no interpretation)
 * - synthesis: cross-perspective weaving + final witness field
 */
export function createDyadWitnessGraph(lock: FactLock): AtomicTask<'aletheios' | 'pichet' | 'selemene' | 'synthesis'>[] {
  return [
    // === Identity layer (parallel) ===
    {
      id: 'aletheios-identity',
      perspective: 'aletheios',
      dependsOn: [],
      targetTokens: 1600,
      temperature: 0.32,
      requiresGrounding: true,
      buildPrompts: (lock, prior, grounding) => {
        const grounded = injectGroundedContext(lock, grounding);
        return {
          system: `You are Aletheios: the clear, structural, integrative witness.
Your job is to map the locked facts into precise meaning structures (identity stack, dharma, current field).
Be exact. Never soften or reinterpret locked facts.${grounded ? '\n\n' + grounded : ''}`,
          user: `Give the Aletheios identity witnessing for this subject.
Focus on how the locked Moon, Lagna, current Mahadasha, and relationship status form the current structural field.
Use clear sections.`,
        };
      },
    },
    {
      id: 'pichet-identity',
      perspective: 'pichet',
      dependsOn: [],
      targetTokens: 1600,
      temperature: 0.42,
      requiresGrounding: true,
      buildPrompts: (lock, prior, grounding) => {
        const grounded = injectGroundedContext(lock, grounding);
        return {
          system: `You are Pichet: the somatic, embodied, relational witness.
Honor the locked facts while surfacing felt texture, relational field, and bodily knowing.
Never contradict the FACT LOCK.${grounded ? '\n\n' + grounded : ''}`,
          user: `Give the Pichet identity witnessing.
Especially attend to the 10-year unmarried long-term relationship and how the current Mahadasha is felt somatically and relationally.`,
        };
      },
    },

    // === Precise engine anchors (cheap, high-fidelity) — keep pure, no grounding to protect precision contract ===
    {
      id: 'selemene-anchors',
      perspective: 'selemene',
      dependsOn: [],
      targetTokens: 900,
      temperature: 0.15,
      buildPrompts: () => ({
        system: `You are the Selemene precision layer. Restate only what is locked. No poetry.`,
        user: `Extract and clearly restate the core Selemene-derived anchors for this subject (Moon rashi + nakshatra + degrees, Lagna, current and upcoming Mahadasha, relationship status). Use the locked facts only.`,
      }),
    },

    // === Synthesis (depends on the three above) ===
    {
      id: 'dyad-synthesis',
      perspective: 'synthesis',
      dependsOn: ['aletheios-identity', 'pichet-identity', 'selemene-anchors'],
      targetTokens: 2400,
      temperature: 0.26,
      requiresGrounding: true,
      buildPrompts: (lock, prior, grounding) => {
        const grounded = injectGroundedContext(lock, grounding);
        return {
          system: `You are the final Witness Dyad synthesis.
You receive three independent streams:
- Aletheios (structural)
- Pichet (somatic/relational)
- Selemene anchors (precise facts)

Weave them into one coherent field. The locked facts are non-negotiable spine.
Surface convergences, productive tensions, and the living quality of the partnership field.${grounded ? '\n\n' + grounded : ''}`,
          user: `Synthesize the three prior streams into a single integrated dyad witnessing.
Respect the locked facts (especially the 10-year relationship status and current Mahadasha) at every step.
End with the strongest single sentence that captures the current joint field.`,
        };
      },
    },
  ];
}
