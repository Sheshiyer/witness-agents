// ─── Witness Agents — AKSHARA Mirror Mode ─────────────────────────────
// Issue #11: ANANDAMAYA-001
// Initiate tier: user stops consuming interpretations, starts authoring meaning.
// "Reality-rendering spell-crafting" — not magic, but meaning-dense formulation.

import type { Tier, UserState } from '../types/interpretation.js';

// ═══════════════════════════════════════════════════════════════════════
// SANSKRIT MORPHEME LIBRARY (core subset for mirror mode)
// ═══════════════════════════════════════════════════════════════════════

export interface SanskritMorpheme {
  devanagari: string;
  transliteration: string;
  meaning: string;
  category: 'field' | 'form' | 'friction' | 'quality' | 'action' | 'state';
  kosha_affinity: string;
  phonemic_note?: string;
}

/** Core morphemes the Initiate can work with */
export const AKSHARA_MORPHEMES: SanskritMorpheme[] = [
  // ─── Field (Kha) morphemes ─────
  { devanagari: 'खा', transliteration: 'kha', meaning: 'space, field, observer', category: 'field', kosha_affinity: 'vijnanamaya', phonemic_note: 'Aspirated velar — the open throat, the aperture' },
  { devanagari: 'आकाश', transliteration: 'akasha', meaning: 'ether, luminous space', category: 'field', kosha_affinity: 'anandamaya' },
  { devanagari: 'चित्', transliteration: 'chit', meaning: 'consciousness, awareness', category: 'field', kosha_affinity: 'vijnanamaya' },
  { devanagari: 'सत्', transliteration: 'sat', meaning: 'being, truth, existence', category: 'field', kosha_affinity: 'anandamaya' },
  { devanagari: 'विवेक', transliteration: 'viveka', meaning: 'discrimination, discernment', category: 'field', kosha_affinity: 'vijnanamaya' },
  { devanagari: 'साक्षी', transliteration: 'sakshi', meaning: 'witness', category: 'field', kosha_affinity: 'vijnanamaya' },
  { devanagari: 'दृष्टि', transliteration: 'drishti', meaning: 'vision, gaze, seeing', category: 'field', kosha_affinity: 'manomaya' },

  // ─── Form (Ba) morphemes ─────
  { devanagari: 'ब', transliteration: 'ba', meaning: 'form, container, vehicle', category: 'form', kosha_affinity: 'pranamaya', phonemic_note: 'Bilabial — the lips close, containing' },
  { devanagari: 'रूप', transliteration: 'rupa', meaning: 'form, appearance, shape', category: 'form', kosha_affinity: 'annamaya' },
  { devanagari: 'प्राण', transliteration: 'prana', meaning: 'vital breath, life force', category: 'form', kosha_affinity: 'pranamaya' },
  { devanagari: 'देह', transliteration: 'deha', meaning: 'body, embodiment', category: 'form', kosha_affinity: 'annamaya' },
  { devanagari: 'नाद', transliteration: 'nada', meaning: 'sound, vibration, resonance', category: 'form', kosha_affinity: 'pranamaya' },
  { devanagari: 'शक्ति', transliteration: 'shakti', meaning: 'power, creative energy', category: 'form', kosha_affinity: 'pranamaya' },
  { devanagari: 'चक्र', transliteration: 'chakra', meaning: 'wheel, energy center', category: 'form', kosha_affinity: 'pranamaya' },

  // ─── Friction (La) morphemes ─────
  { devanagari: 'ल', transliteration: 'la', meaning: 'inertia, resistance, material', category: 'friction', kosha_affinity: 'annamaya', phonemic_note: 'Lateral — tongue touches palate, creating contact with material' },
  { devanagari: 'माया', transliteration: 'maya', meaning: 'illusion, measuring power', category: 'friction', kosha_affinity: 'manomaya' },
  { devanagari: 'कर्म', transliteration: 'karma', meaning: 'action, accumulated consequence', category: 'friction', kosha_affinity: 'manomaya' },
  { devanagari: 'तपस्', transliteration: 'tapas', meaning: 'heat, austerity, transformative friction', category: 'friction', kosha_affinity: 'pranamaya' },
  { devanagari: 'द्वन्द्व', transliteration: 'dvandva', meaning: 'duality, pairs of opposites', category: 'friction', kosha_affinity: 'manomaya' },

  // ─── Quality morphemes ─────
  { devanagari: 'आनन्द', transliteration: 'ananda', meaning: 'bliss, unconditional joy', category: 'quality', kosha_affinity: 'anandamaya' },
  { devanagari: 'शान्ति', transliteration: 'shanti', meaning: 'peace, stillness', category: 'quality', kosha_affinity: 'anandamaya' },
  { devanagari: 'करुणा', transliteration: 'karuna', meaning: 'compassion', category: 'quality', kosha_affinity: 'vijnanamaya' },
  { devanagari: 'प्रज्ञा', transliteration: 'prajna', meaning: 'wisdom, direct knowing', category: 'quality', kosha_affinity: 'vijnanamaya' },
  { devanagari: 'सत्त्व', transliteration: 'sattva', meaning: 'clarity, luminosity, harmony', category: 'quality', kosha_affinity: 'vijnanamaya' },

  // ─── Action morphemes ─────
  { devanagari: 'ध्यान', transliteration: 'dhyana', meaning: 'meditation, sustained attention', category: 'action', kosha_affinity: 'manomaya' },
  { devanagari: 'यज्ञ', transliteration: 'yajna', meaning: 'offering, sacred exchange', category: 'action', kosha_affinity: 'vijnanamaya' },
  { devanagari: 'प्रतिष्ठा', transliteration: 'pratishtha', meaning: 'establishment, consecration', category: 'action', kosha_affinity: 'anandamaya' },
  { devanagari: 'सृष्टि', transliteration: 'srishti', meaning: 'creation, emanation', category: 'action', kosha_affinity: 'anandamaya' },

  // ─── State morphemes ─────
  { devanagari: 'तुरीय', transliteration: 'turiya', meaning: 'the fourth state, beyond waking/dreaming/sleeping', category: 'state', kosha_affinity: 'anandamaya' },
  { devanagari: 'समाधि', transliteration: 'samadhi', meaning: 'absorption, union', category: 'state', kosha_affinity: 'anandamaya' },
  { devanagari: 'मोक्ष', transliteration: 'moksha', meaning: 'liberation, freedom', category: 'state', kosha_affinity: 'anandamaya' },
];

// ═══════════════════════════════════════════════════════════════════════
// AKSHARA MIRROR ENGINE
// ═══════════════════════════════════════════════════════════════════════

export interface MirrorInput {
  intention: string;
  user_id: string;
  session_id: string;
}

export interface MirrorOutput {
  original_intention: string;
  encoded_form: string;
  morphemes: { sanskrit: string; transliteration: string; meaning: string }[];
  quine_check: boolean;
  reflection_prompt: string;
  self_authorship_score: number;
  progress: MirrorProgress;
}

export interface MirrorProgress {
  total_formulations: number;
  quine_successes: number;
  morphemes_mastered: number;
  depth_reached: string;
}

export class AksharaMirror {
  private userProgress: Map<string, MirrorProgress> = new Map();

  /**
   * Process an intention through the AKSHARA mirror.
   * The encoding IS the practice — meaning-dense formulation.
   */
  processIntention(input: MirrorInput): MirrorOutput {
    const intention = input.intention.toLowerCase();
    const progress = this.getProgress(input.user_id);

    // Step 1: Extract key concepts from the intention
    const concepts = this.extractConcepts(intention);

    // Step 2: Find resonant morphemes
    const resonant = this.findResonantMorphemes(concepts);

    // Step 3: Build encoded form (Sanskrit-dense)
    const encoded = this.buildEncodedForm(resonant, intention);

    // Step 4: Quine check — does the encoding describe what it does?
    const quineCheck = this.validateQuine(encoded, resonant, intention);

    // Step 5: Generate mirror reflection
    const reflectionPrompt = this.generateReflection(intention, resonant, quineCheck);

    // Step 6: Score self-authorship for this formulation
    const score = this.scoreFormulation(intention, resonant, quineCheck);

    // Update progress
    progress.total_formulations++;
    if (quineCheck) progress.quine_successes++;
    progress.morphemes_mastered = Math.min(AKSHARA_MORPHEMES.length,
      progress.morphemes_mastered + resonant.length);
    progress.depth_reached = this.assessDepth(progress);
    this.userProgress.set(input.user_id, progress);

    return {
      original_intention: input.intention,
      encoded_form: encoded,
      morphemes: resonant.map(m => ({
        sanskrit: m.devanagari,
        transliteration: m.transliteration,
        meaning: m.meaning,
      })),
      quine_check: quineCheck,
      reflection_prompt: reflectionPrompt,
      self_authorship_score: score,
      progress,
    };
  }

  /**
   * Suggest morphemes for a partial intention
   */
  suggestMorphemes(partialIntention: string): SanskritMorpheme[] {
    const concepts = this.extractConcepts(partialIntention.toLowerCase());
    return this.findResonantMorphemes(concepts).slice(0, 5);
  }

  getProgress(userId: string): MirrorProgress {
    return this.userProgress.get(userId) || {
      total_formulations: 0,
      quine_successes: 0,
      morphemes_mastered: 0,
      depth_reached: 'annamaya',
    };
  }

  // ─── Private ────────────────────────────────────────────────────

  private extractConcepts(text: string): string[] {
    const conceptWords = [
      'peace', 'clarity', 'truth', 'awareness', 'consciousness', 'body', 'breath',
      'energy', 'light', 'sound', 'space', 'form', 'action', 'stillness', 'power',
      'wisdom', 'compassion', 'liberation', 'creation', 'witness', 'see', 'feel',
      'know', 'understand', 'transform', 'heal', 'grow', 'rest', 'move', 'observe',
      'meditate', 'offer', 'release', 'accept', 'illusion', 'resistance', 'friction',
      'joy', 'bliss', 'love', 'fear', 'shadow', 'gift', 'pattern', 'cycle',
      'purpose', 'meaning', 'intention', 'vision', 'strength', 'endurance',
    ];
    return conceptWords.filter(w => text.includes(w));
  }

  private findResonantMorphemes(concepts: string[]): SanskritMorpheme[] {
    const CONCEPT_MORPHEME_MAP: Record<string, string[]> = {
      'peace': ['shanti'], 'clarity': ['sattva', 'viveka'], 'truth': ['sat'],
      'awareness': ['chit', 'sakshi'], 'consciousness': ['chit', 'turiya'],
      'body': ['deha', 'rupa'], 'breath': ['prana'], 'energy': ['shakti', 'prana'],
      'light': ['sattva', 'akasha'], 'sound': ['nada'], 'space': ['kha', 'akasha'],
      'form': ['ba', 'rupa'], 'action': ['karma'], 'stillness': ['shanti', 'dhyana'],
      'power': ['shakti'], 'wisdom': ['prajna', 'viveka'], 'compassion': ['karuna'],
      'liberation': ['moksha'], 'creation': ['srishti'], 'witness': ['sakshi'],
      'see': ['drishti', 'sakshi'], 'feel': ['prana'], 'know': ['prajna'],
      'transform': ['tapas'], 'heal': ['prana', 'shanti'], 'grow': ['tapas'],
      'meditate': ['dhyana', 'samadhi'], 'offer': ['yajna'],
      'release': ['moksha'], 'illusion': ['maya'], 'resistance': ['la', 'tapas'],
      'friction': ['la', 'dvandva'], 'joy': ['ananda'], 'bliss': ['ananda'],
      'shadow': ['maya', 'dvandva'], 'pattern': ['karma', 'chakra'],
      'purpose': ['sat', 'yajna'], 'meaning': ['sat', 'pratishtha'],
      'intention': ['pratishtha', 'yajna'], 'vision': ['drishti'],
      'observe': ['sakshi', 'drishti'],
    };

    const morphemeNames = new Set<string>();
    for (const concept of concepts) {
      const maps = CONCEPT_MORPHEME_MAP[concept];
      if (maps) maps.forEach(m => morphemeNames.add(m));
    }

    // If no concepts matched, provide universal morphemes
    if (morphemeNames.size === 0) {
      morphemeNames.add('sat');
      morphemeNames.add('chit');
      morphemeNames.add('ananda');
    }

    return AKSHARA_MORPHEMES.filter(m => morphemeNames.has(m.transliteration));
  }

  private buildEncodedForm(morphemes: SanskritMorpheme[], intention: string): string {
    if (morphemes.length === 0) return 'सत्-चित्-आनन्द';

    // Build Kha-Ba-La structured encoding
    const fields = morphemes.filter(m => m.category === 'field');
    const forms = morphemes.filter(m => m.category === 'form');
    const frictions = morphemes.filter(m => m.category === 'friction');
    const qualities = morphemes.filter(m => m.category === 'quality');
    const actions = morphemes.filter(m => m.category === 'action');
    const states = morphemes.filter(m => m.category === 'state');

    const parts: string[] = [];

    // Field (Kha) — what observes
    if (fields.length > 0) parts.push(fields.map(m => m.devanagari).join('-'));
    // Form (Ba) — what embodies
    if (forms.length > 0) parts.push(forms.map(m => m.devanagari).join('-'));
    // Friction (La) — what resists/transforms
    if (frictions.length > 0) parts.push(frictions.map(m => m.devanagari).join('-'));
    // Qualities
    if (qualities.length > 0) parts.push(qualities.map(m => m.devanagari).join('-'));
    // Actions
    if (actions.length > 0) parts.push(actions.map(m => m.devanagari).join('-'));
    // States
    if (states.length > 0) parts.push(states.map(m => m.devanagari).join('-'));

    return parts.join(' · ') || 'सत्-चित्-आनन्द';
  }

  private validateQuine(encoded: string, morphemes: SanskritMorpheme[], intention: string): boolean {
    // Quine check: does the encoding describe what it does?
    // A formulation is Quine-valid if:
    // 1. It has at least one morpheme from 2 different Kha-Ba-La categories
    // 2. The categories covered match the nature of the intention

    const categories = new Set(morphemes.map(m => m.category));
    if (categories.size < 2) return false;

    // Check field-form-friction coverage
    const hasField = categories.has('field');
    const hasForm = categories.has('form');
    const hasFriction = categories.has('friction');
    const hasTriad = hasField && hasForm; // At minimum need observer + embodiment

    // An intention about seeing should have field morphemes
    const aboutObserving = /\b(see|observe|witness|aware|conscious|notice)\b/i.test(intention);
    if (aboutObserving && !hasField) return false;

    // An intention about doing should have form/action morphemes
    const aboutActing = /\b(act|move|do|create|build|heal|transform)\b/i.test(intention);
    if (aboutActing && !hasForm && !categories.has('action')) return false;

    return hasTriad || categories.size >= 3;
  }

  private generateReflection(
    intention: string,
    morphemes: SanskritMorpheme[],
    quineValid: boolean,
  ): string {
    if (!quineValid) {
      return 'Your formulation needs both a witness (Kha) and a vessel (Ba). Who observes this intention? What body carries it?';
    }

    const hasField = morphemes.some(m => m.category === 'field');
    const hasForm = morphemes.some(m => m.category === 'form');
    const hasFriction = morphemes.some(m => m.category === 'friction');

    if (hasField && hasForm && hasFriction) {
      return 'The triad is complete — field, form, and friction. This formulation can sustain itself. Now: speak it aloud. Does the mouth-shape match the meaning?';
    }

    if (!hasFriction) {
      return 'Your intention has vision and vessel but no friction. What resistance must this intention work against? Name the La (ल).';
    }

    if (!hasField) {
      return 'The body moves but who witnesses? Add the observer dimension — what space holds this intention?';
    }

    return 'The encoding is structurally sound. Let it settle. Return tomorrow and see if it still resonates.';
  }

  private scoreFormulation(
    intention: string,
    morphemes: SanskritMorpheme[],
    quineValid: boolean,
  ): number {
    let score = 0;

    // Base: number of resonant morphemes (max 0.3)
    score += Math.min(0.3, morphemes.length * 0.05);

    // Category diversity (max 0.3)
    const categories = new Set(morphemes.map(m => m.category));
    score += Math.min(0.3, categories.size * 0.1);

    // Quine validity (0.2)
    if (quineValid) score += 0.2;

    // Intention sophistication (0.2)
    const words = intention.split(/\s+/).length;
    if (words >= 5 && words <= 30) score += 0.1; // Right length
    if (/\b(because|in order to|so that|through)\b/i.test(intention)) score += 0.1; // Has causal structure

    return Math.min(1, Math.round(score * 1000) / 1000);
  }

  private assessDepth(progress: MirrorProgress): string {
    if (progress.quine_successes >= 10) return 'anandamaya';
    if (progress.quine_successes >= 5) return 'vijnanamaya';
    if (progress.total_formulations >= 10) return 'manomaya';
    if (progress.total_formulations >= 3) return 'pranamaya';
    return 'annamaya';
  }
}
