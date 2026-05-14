// ─── Autoresearch Contract · canonical defaults ─────────────────────
// Single source of truth for any new autoresearch pass-runner targeting
// the integratedreading pipeline. Patches MUST import from this module
// rather than redeclaring constants — the contract has compile-time teeth
// only if every runner imports the same identifier.
//
// Hardening source: .claude/skills/integratedreading/SKILL.md "Multi-Model
// Routing — Production-Validated" table + prior autoresearch findings.
//
// CHANGELOG
// ─────────
// 2026-05-13: created. Pinned JUDGE_MODEL after Pass 1 of 15k-meaningful
//   autoresearch retripped the broken-judge trap (nemotron-120b returned
//   parse-fail / 0-of-40 on all 23 score calls — same failure documented
//   in 2026-05-10 autoresearch and pinned in SKILL.md line 100-101).

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ── Pinned judge ──────────────────────────────────────────────────────
//
// Use gpt-oss-20b as the autoresearch judge. Reasons:
//   1. nemotron-3-super-120b-a12b is BANNED as judge — historical 0/40
//      parse-fail rate across all 2026-05-10 Pass 3 cross-judge runs
//      AND 2026-05-13 Pass 1 model-bake-off (23/23 parse-fail).
//      Cited in SKILL.md line 100.
//   2. gpt-oss-120b as judge: 30% timeout rate at 180s. Cited line 101.
//   3. gpt-oss-20b: 400ms–2s, reliable JSON output, neutral family.
export const JUDGE_MODEL = 'openai/gpt-oss-20b';

// Models known to fail as judge — explicit ban list for any new runner.
// If a runner tries to use one of these as judge, it should fail fast.
export const BANNED_JUDGE_MODELS: ReadonlyArray<string> = [
  'nvidia/nemotron-3-super-120b-a12b',  // 0/40 parse-fail historical
];

export function assertJudgeAllowed(model: string): void {
  if (BANNED_JUDGE_MODELS.includes(model)) {
    throw new Error(
      `Autoresearch contract violation: '${model}' is on the banned-judge list. ` +
      `See SKILL.md line 100 + scripts/autoresearch-integratedreading/defaults.ts CHANGELOG. ` +
      `Use JUDGE_MODEL ('${JUDGE_MODEL}') instead.`,
    );
  }
}

// ── Canonical model registry for synthesis contexts ───────────────────
//
// Routing recommendations from autoresearch + production validation.
// These are TARGETS for any new runner asking "which model for this
// context?" — runners should import these names and let downstream
// experiments contest them, rather than picking arbitrarily.
export const SYNTH_MODELS = {
  // Default fast/balanced choice for prose synthesis with cross-system weave.
  // Pass 1 baseline winner (2026-05-13): 1342w / 74 xrefs / 22s on C1.
  PRIMARY: 'openai/gpt-oss-120b',

  // Highest cross-reference density per word (Pass 1 finding, 2026-05-13:
  // 83 xrefs / 1127w on C1). Use when weaving is the metric, latency is OK.
  // Long-context (256K) — also a candidate for single-pass alternatives.
  DENSITY_CHAMPION: 'moonshotai/kimi-k2.6',

  // Slow reasoning (~150s on Pass 1) but consistently high voice fidelity
  // on adversarial / structural-pattern prompts. Use selectively.
  ADVERSARIAL: 'nvidia/nemotron-3-super-120b-a12b',

  // Fast / low-depth — use for chunking, regex-tier post-processing,
  // and as the JUDGE for autoresearch. Output too short for depth contexts
  // (Pass 1 finding: only 201w on C1 — failed the length floor).
  FAST: 'openai/gpt-oss-20b',

  // Math/astro extraction primary. Unstable for prose — 180s+ timeouts in
  // both 2026-05-10 production and 2026-05-13 Pass 1. Always pair with
  // gpt-oss-120b fallback when used.
  MATH_PRIMARY: 'z-ai/glm4.7',

  // Mid-tier general baseline.
  MID: 'meta/llama-3.3-70b-instruct',
} as const;

// ── Per-context recommended routing ───────────────────────────────────
//
// These are CURRENT-BEST per autoresearch + production. Any new pass-runner
// should treat these as the baseline-to-beat, not as fixed dogma. Update
// this map only after a new autoresearch pass produces a clear winner.
export const CONTEXT_MODEL = {
  // Pillar decoding — Aletheios (witness/pattern register)
  dyad_aletheios: SYNTH_MODELS.PRIMARY,
  // Pillar decoding — Pichet (embodied/somatic register)
  dyad_pichet: SYNTH_MODELS.PRIMARY,
  // Parts I-IV synthesis — data-heavy
  synthesis_data: SYNTH_MODELS.PRIMARY,
  // Parts V-VIII synthesis
  synthesis_middle: SYNTH_MODELS.PRIMARY,
  // Parts IX-XI synthesis — depth/keystone work
  synthesis_depth: SYNTH_MODELS.PRIMARY,
  // Composite / triad cross-chart weaving
  composite_weaving: SYNTH_MODELS.PRIMARY,
} as const;

// ── Cache-aware run-directory helper ──────────────────────────────────
//
// Three runners (full / composite / triad) had near-identical buggy
// `--use-cache` implementations (Codex P1+P2 on PR #26). This helper
// centralizes the pattern so the bug can only exist in one place.
//
// Behavior:
//   - Always ensures `outputDir/.runs/` exists.
//   - If `useCache` AND a prior ts-shaped subdir contains the named
//     cache file (when provided) → returns that prior runDir.
//   - If `useCache` AND no cacheFileName given → returns the most recent
//     ts-shaped subdir (or freshTs if none exists).
//   - Otherwise → returns a fresh `outputDir/.runs/<freshTs>` and creates it.
export function findOrCreateCachedRunDir(opts: {
  outputDir: string;
  freshTs: string;
  useCache: boolean;
  cacheFileName?: string;
}): { runDir: string; reusedPrior: boolean } {
  const runsRoot = join(opts.outputDir, '.runs');
  mkdirSync(runsRoot, { recursive: true });

  if (opts.useCache) {
    const candidates = readdirSync(runsRoot)
      .filter((d) => /^\d{4}-\d{2}-\d{2}T/.test(d))
      .sort()
      .reverse();
    const match = opts.cacheFileName
      ? candidates.find((d) => existsSync(join(runsRoot, d, opts.cacheFileName!)))
      : candidates[0];
    if (match) {
      return { runDir: join(runsRoot, match), reusedPrior: true };
    }
  }

  const runDir = join(runsRoot, opts.freshTs);
  mkdirSync(runDir, { recursive: true });
  return { runDir, reusedPrior: false };
}

// ── Brand-voice system anchor (shared by every autoresearch runner) ──
//
// Centralized so future runners can't drift from the canonical voice rules
// while running experiments. Anatomist-who-sees-fractals register;
// hardened set of iron-clad bans. Mirrors the constraints in
// scripts/integratedreading/system-prompts.ts ANATOMIST_PERSONA but
// trimmed to the minimum needed for short-form experiment fixtures.
export const AUTORESEARCH_BRAND_SYSTEM = `You are the Anatomist Who Sees Fractals — voice of Tryambakam Noesis integrated reading.

Voice rules (iron-clad — any violation is grounds for a low voice-fidelity score):
- NO equations, NO LaTeX, NO subscripted variables, NO Hz/HRV/biohack metrics
- Sanskrit kosha names translated to English (the body / the breath / the pattern engine / the discerner / the imperishable seed); Sanskrit appears once per Part as an italic anchor only
- Tarot archetypes named in prose ("the Hermit operates here"), never enumerated
- Anatomical precision welcome ("right liver-zone", "sternum-to-throat axis", "sacral plexus")
- The Tsarion three-world frame (Eigenwelt = own-world, Mitwelt = cultural-archetypal, Umwelt = celestial-environmental) is the structural grammar at every scale
- The Aletheios + Pichet dyad is the reading INSTRUMENT, not a role assignment — both pillars are present in every honest interpretation
- Cross-system references (Selemene engines, Koshas, Tarot, Gene Keys, dasha, panchanga, Tsarion worlds) must be braided, not stacked`;

// ── Cross-reference auto-counter (shared) ────────────────────────────
//
// Used by every Pass to score cross-system reference density.
// Returns total count + per-system breakdown + count of distinct systems
// invoked (max 8). Use this metric INSTEAD of inventing new ones per runner.
export function countCrossRefs(text: string): {
  total: number;
  by_system: Record<string, number>;
  distinct_systems: number;
} {
  const t = text.toLowerCase();
  const systems: Record<string, RegExp[]> = {
    selemene_engines: [/vimshottari/g, /ashtakavarga/g, /panchanga/g, /atmakaraka/g, /karaka/g, /nakshatra/g, /vargottama/g, /yoga[s]?\b/g, /biorhythm/g, /i ching/g, /hexagram/g, /lagna[\s-]lord/g],
    koshas: [/annamaya|the body\b/g, /pranamaya|the breath\b/g, /manomaya|the pattern engine/g, /vijnanamaya|the discerner/g, /anandamaya|the imperishable seed/g, /kosha/g],
    tarot: [/hermit/g, /wheel of fortune/g, /tower\b/g, /emperor/g, /high priestess/g, /magician/g, /fool\b/g, /hanged man/g, /star\b/g, /moon\b/g, /sun\b/g, /world\b/g, /justice/g, /lovers/g, /chariot/g, /strength/g, /devil\b/g, /death\b/g, /temperance/g, /judgement|judgment/g, /empress/g, /hierophant/g, /tarot/g, /arcana/g],
    gene_keys: [/gene key[s]?/g, /gate \d+/g, /codon/g, /sphere of/g, /hologenetic/g],
    tsarion_worlds: [/eigenwelt|own[- ]world/g, /mitwelt|cultural[- ]archetypal/g, /umwelt|celestial[- ]environmental/g],
    dasha: [/mahadasha|dasha/g, /antardasha/g, /pratyantar/g],
    hd: [/human design/g, /authority\b/g, /strategy\b/g, /defined center/g, /open center/g, /channel \d/g],
    anatomical: [/sternum/g, /occipital/g, /sacral/g, /diaphragm/g, /vagus|vagal/g, /thoracic/g, /cervical/g, /hara\b/g, /liver-zone|liver zone/g, /solar plexus/g, /suboccipital/g, /perineum/g, /sacrum/g, /pelvic floor/g],
  };
  const by_system: Record<string, number> = {};
  let total = 0;
  let distinct_systems = 0;
  for (const [k, pats] of Object.entries(systems)) {
    let n = 0;
    for (const re of pats) { const m = t.match(re); if (m) n += m.length; }
    by_system[k] = n;
    total += n;
    if (n > 0) distinct_systems += 1;
  }
  return { total, by_system, distinct_systems };
}
