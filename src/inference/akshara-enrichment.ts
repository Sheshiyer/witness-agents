// ─── Witness Agents — AKSHARA Inference Enrichment ─────────────────────
// Issue #22: Wires the AKSHARA Mirror into the Dyad Inference Engine.
// At initiate tier, extracts key concepts from the query, runs them
// through AksharaMirror.processIntention(), and injects Sanskrit
// morpheme encoding as an additional system message for the LLM.
//
// This is OPTIONAL — non-initiate tiers see zero overhead.

import type { InferenceMessage } from './types.js';
import type { WitnessInterpretation, Tier } from '../types/interpretation.js';
import { AksharaMirror, AKSHARA_MORPHEMES } from '../protocols/akshara-mirror.js';
import type { MirrorOutput, SanskritMorpheme } from '../protocols/akshara-mirror.js';

// ═══════════════════════════════════════════════════════════════════════
// AKSHARA ENRICHMENT — Sanskrit seed-form injection for initiate tier
// ═══════════════════════════════════════════════════════════════════════

export class AksharaEnrichment {
  private mirror: AksharaMirror;

  constructor(mirror: AksharaMirror) {
    this.mirror = mirror;
  }

  /**
   * Enrich inference messages with AKSHARA Sanskrit morpheme encoding.
   *
   * Only fires at `initiate` tier. All other tiers return messages unchanged
   * with zero processing overhead.
   *
   * Injects an additional system message between the existing system and
   * user messages containing Devanagari encoding, morpheme breakdown,
   * Kha-Ba-La structure, and LLM grounding instruction.
   */
  enrichMessages(
    messages: InferenceMessage[],
    interpretation: WitnessInterpretation,
    tier: Tier,
  ): InferenceMessage[] {
    // ─── Gate: only initiate tier gets AKSHARA enrichment ────────
    if (tier !== 'initiate') return messages;

    // ─── Process intention through the mirror ────────────────────
    const mirrorOutput = this.mirror.processIntention({
      intention: interpretation.query,
      user_id: interpretation.id,
      session_id: `akshara-enrich-${interpretation.id}`,
    });

    // ─── Build the AKSHARA system message ────────────────────────
    const aksharaContent = this.buildAksharaMessage(mirrorOutput);

    // ─── Inject between system and user messages ─────────────────
    // Find the boundary: all system messages first, then inject, then rest
    const systemMessages: InferenceMessage[] = [];
    const nonSystemMessages: InferenceMessage[] = [];
    let pastSystem = false;

    for (const msg of messages) {
      if (!pastSystem && msg.role === 'system') {
        systemMessages.push(msg);
      } else {
        pastSystem = true;
        nonSystemMessages.push(msg);
      }
    }

    const aksharaMsg: InferenceMessage = {
      role: 'system',
      content: aksharaContent,
    };

    return [...systemMessages, aksharaMsg, ...nonSystemMessages];
  }

  // ─── Private: Build AKSHARA message content ────────────────────

  private buildAksharaMessage(output: MirrorOutput): string {
    const parts: string[] = [];

    // Header
    parts.push('── AKSHARA MIRROR: Sanskrit Seed-Forms ──');
    parts.push('');

    // Devanagari encoded form
    parts.push(`Encoded form: ${output.encoded_form}`);
    parts.push('');

    // Morpheme breakdown
    parts.push('Morpheme breakdown:');
    for (const m of output.morphemes) {
      parts.push(`  ${m.sanskrit} (${m.transliteration}) → ${m.meaning}`);
    }
    parts.push('');

    // Kha-Ba-La structure explanation
    parts.push('Kha-Ba-La structure:');
    const fields = output.morphemes.filter(m => this.getMorphemeCategory(m.transliteration) === 'field');
    const forms = output.morphemes.filter(m => this.getMorphemeCategory(m.transliteration) === 'form');
    const frictions = output.morphemes.filter(m => this.getMorphemeCategory(m.transliteration) === 'friction');

    if (fields.length > 0) {
      parts.push(`  Kha (field/observer): ${fields.map(f => f.transliteration).join(', ')}`);
    }
    if (forms.length > 0) {
      parts.push(`  Ba (form/vessel): ${forms.map(f => f.transliteration).join(', ')}`);
    }
    if (frictions.length > 0) {
      parts.push(`  La (friction/resistance): ${frictions.map(f => f.transliteration).join(', ')}`);
    }

    // Also include quality/action/state morphemes
    const others = output.morphemes.filter(m => {
      const cat = this.getMorphemeCategory(m.transliteration);
      return cat !== 'field' && cat !== 'form' && cat !== 'friction';
    });
    if (others.length > 0) {
      parts.push(`  Quality/Action/State: ${others.map(o => o.transliteration).join(', ')}`);
    }
    parts.push('');

    // Quine check result
    if (output.quine_check) {
      parts.push('Quine check: ✓ Self-referential encoding valid');
    } else {
      parts.push('Quine check: ○ Partial encoding (triad incomplete)');
    }
    parts.push('');

    // LLM grounding instruction
    parts.push('Ground your response in these Sanskrit seed-forms. Let the morphemes shape your language — use transliterations naturally where they add precision.');

    return parts.join('\n');
  }

  /**
   * Look up the category for a morpheme transliteration.
   * Uses the AKSHARA_MORPHEMES library from the mirror.
   */
  private getMorphemeCategory(transliteration: string): string {
    const found = AKSHARA_MORPHEMES.find(
      (m: SanskritMorpheme) => m.transliteration === transliteration,
    );
    return found?.category ?? 'unknown';
  }
}
