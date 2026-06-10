// src/wiring/graphs/research-synthesis.ts
// Graph for research-style synthesis over multiple Selemene engines + perspectives.
// Proves the pattern works for "multi-engine" fusion flows (beyond pure dyad/daily).
//
// Note: Grounded context injection is handled by the orchestrator (P2-W2-SC-T15).
// Tasks with requiresGrounding: true will have retrieved passages injected
// AFTER the FactLock section, BEFORE the system prompt.

import type { AtomicTask, FactLock } from '@witness/orchestration';

export function createResearchSynthesisGraph(lock: FactLock): AtomicTask<'aletheios' | 'pichet' | 'engine-fusion' | 'synthesis'>[] {
  return [
    // Perspective 1: Aletheios structural reading of the research question
    {
      id: 'aletheios-research',
      perspective: 'aletheios',
      dependsOn: [],
      targetTokens: 1500,
      temperature: 0.25,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        // Note: grounding param passed for backward compat; orchestrator handles injection
        return {
          system: `You are Aletheios doing research synthesis. Map locked facts + engine outputs into clean structural themes, contradictions, and open questions. Be rigorous.`,
          user: `Produce the Aletheios structural analysis of this research subject. Focus on identity stack convergence/divergence across engines and the locked facts.`,
        };
      },
    },
    // Perspective 2: Pichet somatic/embodied implications of the research
    {
      id: 'pichet-research',
      perspective: 'pichet',
      dependsOn: [],
      targetTokens: 1500,
      temperature: 0.32,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        return {
          system: `You are Pichet doing research synthesis. Surface the felt, relational, and somatic texture of the findings while strictly honoring the locked facts.`,
          user: `Produce the Pichet embodied reading of this research. How do the locked facts and engine results land in the body/field?`,
        };
      },
    },
    // Engine fusion pass (pure data layer, low temp) — benefits from grounding for cross-engine resonance
    {
      id: 'engine-fusion',
      perspective: 'engine-fusion',
      dependsOn: [],
      targetTokens: 1100,
      temperature: 0.1,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        return {
          system: `You are the engine fusion layer. You only synthesize raw Selemene engine outputs. No interpretation beyond what the data directly supports. Cite engines explicitly.`,
          user: `Fuse the available engine results for this subject. Highlight agreements, disagreements, and high-confidence signals. Stay extremely close to the data.`,
        };
      },
    },
    // Final cross-synthesis
    {
      id: 'research-synthesis',
      perspective: 'synthesis',
      dependsOn: ['aletheios-research', 'pichet-research', 'engine-fusion'],
      targetTokens: 2100,
      temperature: 0.2,
      requiresGrounding: true,
      buildPrompts: (_lock, _prior, _grounding) => {
        return {
          system: `You are the final research synthesis layer. Weave the structural (Aletheios), somatic (Pichet), and raw engine fusion streams into one coherent research report. Locked facts are non-negotiable.`,
          user: `Produce the final integrated research synthesis. Surface the strongest patterns, the most important open questions, and any actionable implications while remaining faithful to the locked facts.`,
        };
      },
    },
  ];
}
