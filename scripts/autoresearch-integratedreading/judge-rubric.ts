// ─── Autoresearch /integratedreading — Judge Rubric ─────────────────
// Scoring prompts + parsing for evaluating generated readings against the
// Anatomist Who Sees Fractals brand voice + framework grammar.

const ANTI_PATTERN_PHRASES = [
  // Diluted spiritual vocabulary
  'journey', 'path forward', 'spiritual path', 'your healing', 'healing journey',
  'manifesting', 'manifest', 'abundance flowing', 'high vibration', 'low vibration',
  'authentic self', 'higher self', 'true self', 'awakening',
  // Optimization-frame
  'optimize', 'optimization', 'biohack', 'productivity hack', 'life hack',
  // Tradition-template remedies
  'wear yellow sapphire', 'gemstone for', 'on Thursday at sunrise', 'donate iron',
  'chant the mantra', 'recite 108 times', 'feed black dogs',
  // Performative spirituality
  'the universe is calling', 'cosmic alignment', 'divine timing', 'sacred journey',
  'energy will flow', 'release the blockage', 'clear the chakras',
  // Generic life-coach
  'embrace the change', 'lean into', 'trust the process', 'go with the flow',
];

export interface JudgeScore {
  voice_fidelity: number;       // 0-10
  insight_depth: number;        // 0-10
  conciseness: number;          // 0-10
  anti_pattern_absence: number; // 0-10
  total: number;                // 0-40
  anti_pattern_incidents: string[];
  notes: string;
  raw_response: string;
}

export function judgePrompt(reading: string, baseStandard?: string): string {
  const baseBlock = baseStandard
    ? `\n\n=== BASE STANDARD (gold reference) ===\n${baseStandard.slice(0, 8000)}\n=== END BASE ===\n`
    : '';
  return `You are evaluating an integrated chart reading written for Tryambakam Noesis (the Anatomist Who Sees Fractals brand voice).

RUBRIC (score each 0-10, total /40):

1. VOICE FIDELITY (0-10): Does it read as the Anatomist Who Sees Fractals?
   - Clinical precision at visionary scale (PubMed × Alex Grey)
   - Three tones: Grounded, Direct, Respectful-Challenging
   - Kha-Ba-La structural (not decoration)
   - Quine principle (system succeeds when no longer needed) deployed
   - 10 = indistinguishable from native Anatomist; 5 = generic-spiritual leakage; 0 = wrong voice entirely

2. INSIGHT DEPTH (0-10): Is the layered grammar deployed?
   - Eigenwelt + Mitwelt + Umwelt all addressed?
   - Cl(0)–Cl(7) Kosha algebra at body resolution?
   - Tarot Major Arcana at field resolution?
   - Sidereal cosmological positioning at Umwelt?
   - 10 = all layers, structurally; 5 = surface mention; 0 = missing entirely

3. CONCISENESS (0-10): No padding, no filler
   - Every claim earns its space
   - No redundancy, no rambling
   - 10 = surgical; 5 = some padding; 0 = bloated

4. ANTI-PATTERN ABSENCE (0-10): Subtract 1 per occurrence (max -10)
   AVOID phrases (each occurrence -1): journey, path, healing, manifesting, abundance, vibration, authentic self, higher self, optimization, hacks, "the universe is calling", "embrace the change", gemstone prescriptions, mantra-counts, "trust the process"
   Also flag: generic-spiritual padding, life-coach language, tradition-template remedies-as-products

OUTPUT FORMAT (must be valid JSON):
{
  "voice_fidelity": <0-10>,
  "insight_depth": <0-10>,
  "conciseness": <0-10>,
  "anti_pattern_absence": <0-10>,
  "anti_pattern_incidents": ["specific quote 1", "specific quote 2"],
  "notes": "<2-3 sentences explaining the strongest and weakest aspects>"
}

NO commentary outside the JSON. Be precise.${baseBlock}

=== READING TO SCORE ===
${reading.slice(0, 14_000)}
=== END READING ===

Output the JSON object ONLY.`;
}

export function parseJudgeResponse(text: string): JudgeScore {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i < 0 || j <= i) {
    return {
      voice_fidelity: 0,
      insight_depth: 0,
      conciseness: 0,
      anti_pattern_absence: 0,
      total: 0,
      anti_pattern_incidents: [],
      notes: 'parse-failed',
      raw_response: text,
    };
  }
  try {
    const parsed = JSON.parse(s.slice(i, j + 1));
    const v = clampScore(parsed.voice_fidelity);
    const ins = clampScore(parsed.insight_depth);
    const c = clampScore(parsed.conciseness);
    const a = clampScore(parsed.anti_pattern_absence);
    return {
      voice_fidelity: v,
      insight_depth: ins,
      conciseness: c,
      anti_pattern_absence: a,
      total: v + ins + c + a,
      anti_pattern_incidents: Array.isArray(parsed.anti_pattern_incidents) ? parsed.anti_pattern_incidents : [],
      notes: String(parsed.notes || ''),
      raw_response: text,
    };
  } catch {
    return {
      voice_fidelity: 0,
      insight_depth: 0,
      conciseness: 0,
      anti_pattern_absence: 0,
      total: 0,
      anti_pattern_incidents: [],
      notes: 'parse-failed',
      raw_response: text,
    };
  }
}

function clampScore(n: any): number {
  const x = Number(n);
  if (!isFinite(x)) return 0;
  return Math.max(0, Math.min(10, x));
}

/** Mechanical anti-pattern detector — runs before LLM judge. Lower-bound count. */
export function detectAntiPatternsLocal(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const phrase of ANTI_PATTERN_PHRASES) {
    let idx = 0;
    while ((idx = lower.indexOf(phrase.toLowerCase(), idx)) !== -1) {
      // Capture context window for this incident
      const start = Math.max(0, idx - 30);
      const end = Math.min(text.length, idx + phrase.length + 30);
      found.push(text.slice(start, end).replace(/\n/g, ' '));
      idx += phrase.length;
      if (found.length >= 30) break; // cap
    }
    if (found.length >= 30) break;
  }
  return found;
}
