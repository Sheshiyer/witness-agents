// ─── Autoresearch /integratedreading — Variation Matrix ─────────────
// What we vary across 3 passes: models per phase + prompt scaffolding.

import { MODELS } from '../integratedreading/nvidia-client.js';
import {
  ANATOMIST_PERSONA,
  KOSHA_GRAMMAR,
  DYADIC_LOOP,
} from '../integratedreading/system-prompts.js';

// ──────────────────────────────────────────────────────────────────────
// Pass 1 — Model variations (3 high-leverage phases)
// ──────────────────────────────────────────────────────────────────────

export interface ModelVariant {
  id: string;             // unique identifier for this trial
  phase: string;          // e.g., 'synthesis', 'chunking', 'aletheios', 'pichet'
  variant_name: string;   // 'baseline', 'A', 'B'
  model: string;
  max_tokens: number;
  temperature: number;
  notes: string;
}

export const PASS1_VARIANTS: ModelVariant[] = [
  // ── Synthesis phase variations ───────────────────────────
  {
    id: 'P1-syn-baseline',
    phase: 'synthesis',
    variant_name: 'baseline',
    model: MODELS.KIMI_K2,
    max_tokens: 8192,
    temperature: 0.5,
    notes: 'Current production: Kimi K2 (95s, 2690tk)',
  },
  {
    id: 'P1-syn-A',
    phase: 'synthesis',
    variant_name: 'A',
    model: MODELS.GPT_OSS_120B,
    max_tokens: 8192,
    temperature: 0.5,
    notes: 'Variant A: gpt-oss-120b (autoresearch winner for analytical/witness)',
  },
  {
    id: 'P1-syn-B',
    phase: 'synthesis',
    variant_name: 'B',
    model: MODELS.NEMOTRON_120B,
    max_tokens: 8192,
    temperature: 0.5,
    notes: 'Variant B: nemotron-120b (different family, different reasoning style)',
  },

  // ── Chunking phase variations (243s baseline = wall-clock killer) ──
  {
    id: 'P1-chunk-baseline',
    phase: 'chunking',
    variant_name: 'baseline',
    model: MODELS.MINIMAX,
    max_tokens: 8192,
    temperature: 0.1,
    notes: 'Current production: minimax-m2.7 (243s — slow)',
  },
  {
    id: 'P1-chunk-A',
    phase: 'chunking',
    variant_name: 'A',
    model: MODELS.GPT_OSS_20B,
    max_tokens: 8192,
    temperature: 0.1,
    notes: 'Variant A: gpt-oss-20b (~400ms — 600x faster)',
  },
  {
    id: 'P1-chunk-B',
    phase: 'chunking',
    variant_name: 'B',
    model: 'regex',  // sentinel — no LLM call
    max_tokens: 0,
    temperature: 0,
    notes: 'Variant B: regex-only chunker (0ms — instant; tests if LLM chunking is needed at all)',
  },

  // ── Pillar variations (test voice differentiation) ───────────
  {
    id: 'P1-aletheios-baseline',
    phase: 'aletheios',
    variant_name: 'baseline',
    model: MODELS.GPT_OSS_120B,
    max_tokens: 4096,
    temperature: 0.4,
    notes: 'Current production: gpt-oss-120b (66-103s, autoresearch May 2026 winner)',
  },
  {
    id: 'P1-aletheios-A',
    phase: 'aletheios',
    variant_name: 'A',
    model: MODELS.NEMOTRON_120B,
    max_tokens: 4096,
    temperature: 0.4,
    notes: 'Variant A: nemotron-120b (reasoning-class, different family)',
  },
  {
    id: 'P1-pichet-baseline',
    phase: 'pichet',
    variant_name: 'baseline',
    model: MODELS.GPT_OSS_120B,
    max_tokens: 4096,
    temperature: 0.6,
    notes: 'Current production: gpt-oss-120b (autoresearch May 2026 winner unanimous)',
  },
  {
    id: 'P1-pichet-A',
    phase: 'pichet',
    variant_name: 'A',
    model: MODELS.KIMI_K2,
    max_tokens: 4096,
    temperature: 0.6,
    notes: 'Variant A: kimi-k2 (autoresearch noted as strong somatic alternative, ~11s)',
  },
];

// ──────────────────────────────────────────────────────────────────────
// Pass 2 — Prompt scaffolding variations (apply to Pass 1 winners)
// ──────────────────────────────────────────────────────────────────────

export interface PromptVariant {
  id: string;
  variant_name: string;
  system_prompt_factory: (role: 'aletheios' | 'pichet' | 'synthesis') => string;
  notes: string;
}

const ROLE_NOTES: Record<string, string> = {
  aletheios: '\n\nROLE: Aletheios. Pillar function: structural-pattern witness. Tone: analytical-precision, structural recognition.',
  pichet: '\n\nROLE: Pichet. Pillar function: embodied-felt witness. Tone: warmer register, somatic-rhythm-felt.',
  synthesis: '\n\nROLE: Synthesis. Hold both pillars together. Three world-frames: Eigenwelt + Mitwelt + Umwelt simultaneously.',
};

export const PASS2_PROMPT_VARIANTS: PromptVariant[] = [
  {
    id: 'P2-prompt-V1-current',
    variant_name: 'V1-current',
    system_prompt_factory: (role) =>
      ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP + (ROLE_NOTES[role] || ''),
    notes: 'Current: full ANATOMIST + KOSHA_GRAMMAR + DYADIC_LOOP (~3500 tokens system)',
  },
  {
    id: 'P2-prompt-V2-compressed',
    variant_name: 'V2-compressed',
    system_prompt_factory: (role) =>
      ANATOMIST_PERSONA + (ROLE_NOTES[role] || ''),
    notes: 'V2: ANATOMIST only — drop redundant grammar prompts; test if brevity helps voice',
  },
  {
    id: 'P2-prompt-V3-anti-pattern-explicit',
    variant_name: 'V3-anti-pattern-explicit',
    system_prompt_factory: (role) => `${ANATOMIST_PERSONA}

${KOSHA_GRAMMAR}

ANTI-PATTERNS (refuse to write any of these — even paraphrased):
- "the universe is calling/aligning/conspiring"
- "your healing journey", "spiritual path", "abundance flowing"
- "manifest", "high vibration", "authentic self", "higher self"
- "embrace the change", "trust the process", "lean into"
- "wear yellow sapphire", "chant 108 times", "donate iron on Saturday"
- "release the blockage", "clear the chakras", "energy will flow"
- "optimize", "biohack", "productivity"

WHEN YOU CATCH YOURSELF reaching for these, write the precise structural fact instead.

GOOD examples (Anatomist voice):
- "The Cl(7) octonionic AKSHARA coupling is non-decomposable; once formed, it cannot be cleanly separated."
- "Phase-lock at Cl(1) is the algebra of mutual breath. Two oscillators in phase-lock share phase information across the coupling."
- "The Atmakaraka's exalted dignity reaches its 16-year operational tenure on September 14, 2026 at 05:48 IST."

BAD examples (do NOT write):
- "Your soul's journey is opening to a new chapter of healing and abundance."
- "Trust that the universe is bringing you exactly what you need."
- "Wear yellow sapphire on Thursday morning to amplify Jupiter's blessings."
${ROLE_NOTES[role] || ''}`,
    notes: 'V3: explicit anti-pattern list + GOOD/BAD examples — test if explicit refusal reduces leakage',
  },
];

// ──────────────────────────────────────────────────────────────────────
// Judges
// ──────────────────────────────────────────────────────────────────────

// Switched 2026-05-10: gpt-oss-120b judge was timing out at 180s on ~30%
// of calls, corrupting score data into 0/40 false negatives. gpt-oss-20b
// is the autoresearch-validated fast variant (~400ms-2s). Trade marginal
// scoring nuance for reliable score data.
export const PRIMARY_JUDGE = MODELS.GPT_OSS_20B;        // Pass 1 + Pass 2 (fast, reliable)
export const ALTERNATE_JUDGE = MODELS.NEMOTRON_120B;     // Pass 3 cross-judge (different family)

// ──────────────────────────────────────────────────────────────────────
// Sections to judge — only the highest-leverage parts of each reading
// ──────────────────────────────────────────────────────────────────────

export const JUDGED_SECTIONS = [
  'frame',
  'identity_eigenwelt',
  'mahadasha_transition',
  'anti_dependency',
] as const;

export type JudgedSection = typeof JUDGED_SECTIONS[number];
