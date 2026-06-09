#!/usr/bin/env node --import tsx
// ─── /integratedreading — Unified Mode Orchestrator ────────────────────
// Single runner for all reading modes including the new default:
//   solo-integrated (1 subject, 5-systems convergence — the Selemene default)
//   partner-synastry, business-partners, composite-triad, family-penta, team-synergy, etc.
//
// Mode-specific knowledge lives in scripts/integratedreading/modes/<mode>.md
// (per docs/plans/2026-05-14-reading-modes-design.md § Section 1).
//
// CLI:
//   node --import tsx scripts/integratedreading-mode.ts \
//     --subjects-dir <path>         # dir or single .json file
//     --output-dir <path> \
//     [--mode <name> | --auto]      # --auto (or --mode auto) selects solo-integrated for 1 subject, partner-synastry for romantic dyad, etc.
//     [--use-cache]                 # reuse most recent prior .runs/ subdir
//     [--skip-solos]                # don't auto-chain solo synthesis
//     [--dry-run]                   # parse + validate + print plan, no API calls
//
// --auto makes the integrated 5-systems pipeline the default process (see INTEGRATED_5SYSTEMS_GAP_ANALYSIS.md).
//
// Closes #38 (P1.1) + 5-systems default wiring.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';

import {
  parseModeDoc,
  summarizeLessons,
  getPassTemplate,
  getTargetWordsForRegister,
  type ParsedModeDoc,
  type PassSpec,
  type RegisterBand,
} from './integratedreading/modes/parser.js';
import { moonRashiFromPanchanga } from './integratedreading/selemene/mapper.js';
import {
  fetchAllEngines,
  loadSelemeneKey,
  type SelemeneEngineOutput,
} from './integratedreading/selemene/fetcher.js';
import { resolveLevel, type ConsciousnessLevel } from './integratedreading/level-resolver.js';
import { composeLexiconBlock, KNOWN_ENGINE_IDS } from './integratedreading/engine-lexicons-parser.js';
import { renderByTopology } from './integratedreading/render/svg/index.js';
import {
  renderInteractiveHTMLPage,
  renderFigIndex,
  createFigureRegistry,
  renderVizPlate,
  type PartBlock,
} from './integratedreading/render/templates.js';
import { execSync } from 'node:child_process';
import {
  ANATOMIST_PERSONA,
  KOSHA_GRAMMAR,
  DYADIC_LOOP,
} from './integratedreading/system-prompts.js';
// LlmClient is a drop-in replacement for NvidiaClient with full fallback chain:
// NIM → Ollama (local or gateway) → OpenRouter. Honors LLM_PROVIDER=auto|nim|ollama|openrouter.
import { LlmClient as NvidiaClient } from './integratedreading/llm-client.js';
import {
  SYNTH_MODELS,
  findOrCreateCachedRunDir,
  countCrossRefs,
} from './autoresearch-integratedreading/defaults.js';

// ────────────────────────────────────────────────────────────────────────
// CLI parsing
// ────────────────────────────────────────────────────────────────────────

interface CliArgs {
  mode: string | undefined;
  subjectsDir: string;
  outputDir: string;
  useCache: boolean;
  skipSolos: boolean;
  dryRun: boolean;
  auto: boolean;
  /**
   * Admin/CLI override of the user's stored consciousness_level (1-5).
   * From CLI we treat the runner as admin by convention — this is the
   * dev/test/admin entry point. API callers go through the resolver +
   * auth middleware path which gates the override.
   */
  level?: ConsciousnessLevel;
}

function parseArgs(argv: string[]): CliArgs {
  const getFlag = (name: string): string | undefined => {
    const idx = argv.indexOf(`--${name}`);
    if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
    return undefined;
  };
  const hasFlag = (name: string): boolean => argv.includes(`--${name}`);

  const mode = getFlag('mode');
  const subjectsDir = getFlag('subjects-dir');
  const outputDir = getFlag('output-dir');
  const rawLevel = getFlag('level');
  const auto = hasFlag('auto') || mode === 'auto';

  if ((!mode && !auto) || !subjectsDir || !outputDir) {
    console.error('Usage: integratedreading-mode.ts --subjects-dir <path> --output-dir <path> [--mode <name> | --auto] [--use-cache] [--skip-solos] [--dry-run] [--level 1-5]');
    process.exit(1);
  }

  let level: ConsciousnessLevel | undefined;
  if (rawLevel !== undefined) {
    const n = parseInt(rawLevel, 10);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      console.error(`--level must be an integer 1-5; got '${rawLevel}'`);
      process.exit(1);
    }
    level = n as ConsciousnessLevel;
  }

  return {
    mode: mode || undefined,
    subjectsDir,
    outputDir,
    useCache: hasFlag('use-cache'),
    skipSolos: hasFlag('skip-solos'),
    dryRun: hasFlag('dry-run'),
    auto,
    level,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Subject loading
// ────────────────────────────────────────────────────────────────────────

/**
 * Per-subject relationship declaration. Optional but strongly recommended for
 * modes that have semantic role contracts (family-triad, family-penta,
 * partner-synastry). The orchestrator surfaces this into the `subject_roster`
 * template variable so every pass system prompt knows who-is-what.
 *
 * Roles are mode-defined (see modes/_schema.md frontmatter `roles:` array).
 * Common roles: mother, father, child, sibling, partner-A, partner-B,
 * root-1, root-2, branch-1, branch-2, branch-3.
 *
 * `relations` carries kinship edges by the slug of the other subject's file
 * (without the `01_` prefix). Example: { spouse: 'nateshan', children: ['witnessalchemist'] }.
 */
interface SubjectRelationship {
  role?: string;
  relations?: Record<string, string | string[]>;
  notes?: string;
}

interface SubjectConfig {
  subject: string;
  birth_date?: string;
  birth_time?: string;
  birth_place?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  lagna?: string;
  atmakaraka?: string;
  placements?: any[];
  mahadasha?: {
    current_lord?: string;
    current_ends_iso?: string;
    next_lord?: string;
    next_starts_iso?: string;
    next_duration_years?: number;
  };
  relationship?: SubjectRelationship;
  output_dir?: string;
  source_path?: string;
  [key: string]: any;
}

function loadSubjects(subjectsDir: string): SubjectConfig[] {
  if (!existsSync(subjectsDir)) {
    throw new Error(`Subjects directory not found: ${subjectsDir}`);
  }
  const files = readdirSync(subjectsDir)
    .filter((f) => /^\d+_.+\.json$/.test(f))
    .sort();   // lexical → ordinal positions

  if (files.length === 0) {
    throw new Error(`No subject configs in ${subjectsDir}. Expected files matching 01_*.json, 02_*.json, ...`);
  }

  return files.map((f) => {
    const path = join(subjectsDir, f);
    const cfg = JSON.parse(readFileSync(path, 'utf-8')) as SubjectConfig;
    if (!cfg.subject) {
      throw new Error(`${path}: missing required field 'subject'`);
    }
    return cfg;
  });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

interface AuthoritativeMoon {
  rashi: string;
  nakshatra?: string;
  longitude?: number;
  source: 'solo-cache' | 'live-panchanga';
}

interface AuthoritativeFacts {
  lagna?: string;
  moon?: {
    rashi: string;
    nakshatra?: string;
    longitude?: number;
  };
  sun?: {
    rashi: string;
  };
  atmakaraka?: string;
  current_mahadasha?: string;
  next_mahadasha?: string;
  // NEW multi-system (sourced from Selemene engines: human-design, gene-keys, numerology, vimshottari)
  human_design?: {
    profile?: string;
    hd_type?: string;
    authority?: string;
    definition?: string;
  };
  gene_keys?: {
    lifes_work?: [number, number];
    evolution?: [number, number];
    radiance?: [number, number];
    purpose?: [number, number];
  };
  numerology?: {
    life_path?: number;
    expression?: number;
    soul_urge?: number;
    personality?: number;
  };
  vimshottari?: {
    current_mahadasha?: string;
    current_antardasha?: string;
    current_pratyantardasha?: string;
    birth_nakshatra?: string;
  };
}

interface PassClientOption {
  name: string;
  client: NvidiaClient;
}

const STRUCTURED_OUTPUT_ONLY_RULES = [
  'FINAL OUTPUT ONLY — NO META COMMENTARY:',
  'Return ONLY the final user-facing reading content for this pass.',
  'NEVER output: planning notes, scratchpad, calculations, uncertainty, meta commentary, or self-corrections.',
  'FORBIDDEN anywhere in output (including implied reasoning):',
  '  - "The user wants", "Wait,", "I need to", "Let\'s", "Now, let\'s"',
  '  - "Key requirements", "Key constraints", "Structure required", "Chart facts to respect"',
  '  - "Need a table", "Word count:", "Given the lack of"',
  '  - Any sentence starting with "First," or "Step 1:" describing your own process',
  'If a chart fact is uncertain, STATE THE LOCKED FACT VERBATIM rather than reasoning about it.',
].join('\n');

const META_LEAKAGE_PATTERNS: RegExp[] = [
  /(^|\n)The user wants\b/i,
  /(^|\n)Key requirements\b/i,
  /(^|\n)Key constraints\b/i,
  /(^|\n)Wait,\s/i,
  /(^|\n)I need to\b/i,
  /(^|\n)Let'?s\b/i,
  /(^|\n)Need a table\b/i,
  /(^|\n)Structure required:?\b/i,
  /(^|\n)Chart facts to respect:?\b/i,
  /(^|\n)Word count:\s*\d/i,
  /(^|\n)Now, let'?s\b/i,
  /(^|\n)Given the lack of specific planetary placements/i,
];

function detectMetaLeakage(markdown: string): string | undefined {
  const match = META_LEAKAGE_PATTERNS.find((pattern) => pattern.test(markdown));
  return match ? `meta scratchpad leaked (${match})` : undefined;
}

function detectMoonPollution(markdown: string, moon?: AuthoritativeMoon): string | undefined {
  if (!moon) return undefined;
  const badSigns = ['Karka', 'Cancer', 'Vrishabha', 'Taurus'].filter((sign) => sign !== moon.rashi);
  const moonPatterns = [
    // Direct assignment only: "Moon is in Karka" or "Chandra placed in Cancer"
    new RegExp(`\\b(?:moon|chandra)\\s+(?:in|is|as|falls\\s+in|placed\\s+in|rests\\s+in|occupies)\\s+(?:${badSigns.join('|')})\\b`, 'i'),
    // Reversed: "Karka Moon" or "Cancer chandra"
    new RegExp(`\\b(?:${badSigns.join('|')})\\s+(?:moon|chandra)\\b`, 'i'),
    // NOTE: Removed gap-based regex that caused false positives in synastry
    // when discussing partner's chart in same passage
  ];
  const match = moonPatterns.find((pattern) => pattern.test(markdown));
  return match ? `Moon-sign pollution detected (${match})` : undefined;
}

function detectFactContradiction(markdown: string, facts?: AuthoritativeFacts): string | undefined {
  if (!facts) return undefined;
  const text = markdown;

  if (facts.moon?.rashi) {
    const badMoon = ['Karka', 'Cancer', 'Vrishabha', 'Taurus'].filter((sign) => sign !== facts.moon!.rashi);
    const moonPats = [
      // Direct assignment only — avoid false positives in synastry where partner's chart is discussed
      new RegExp(`\\b(?:moon|chandra)\\s+(?:in|is|as|falls\\s+in|placed\\s+in|rests\\s+in|occupies)\\s+(?:${badMoon.join('|')})\\b`, 'i'),
      new RegExp(`\\b(?:${badMoon.join('|')})\\s+(?:moon|chandra)\\b`, 'i'),
    ];
    if (moonPats.some((p) => p.test(text))) return `explicit Moon rashi contradiction (not ${facts.moon.rashi})`;
  }

  if (facts.lagna) {
    const otherLagnas = ['Mesha','Aries','Vrishabha','Taurus','Mithuna','Gemini','Karka','Cancer','Simha','Leo','Tula','Libra','Vrishchika','Scorpio','Dhanu','Sagittarius','Makara','Capricorn','Kumbha','Aquarius','Meena','Pisces']
      .filter((s) => !facts.lagna!.toLowerCase().includes(s.toLowerCase().slice(0, 3)));
    if (otherLagnas.length > 0) {
      const lagnaPat = new RegExp(`\\b(?:lagna|rising|ascendant|asc)\\s+(?:in|is|as|falls in|placed in)\\s+(?:${otherLagnas.join('|')})\\b`, 'i');
      if (lagnaPat.test(text)) return `explicit Lagna contradiction (not ${facts.lagna})`;
    }
  }

  if (facts.sun?.rashi) {
    const badSun = ['Mesha','Aries','Vrishabha','Taurus','Mithuna','Gemini','Karka','Cancer','Simha','Leo','Kanya','Virgo','Tula','Libra','Vrishchika','Scorpio','Dhanu','Sagittarius','Makara','Capricorn','Kumbha','Aquarius','Meena','Pisces']
      .filter((s) => s.toLowerCase() !== facts.sun!.rashi.toLowerCase());
    if (badSun.length) {
      const sunPat = new RegExp(`\\b(?:sun|surya)\\s+(?:in|is|as|falls in|placed in|occupies|rashi)\\s+(?:${badSun.join('|')})\\b`, 'i');
      if (sunPat.test(text)) return `explicit Sun rashi contradiction (not ${facts.sun.rashi})`;
    }
  }

  if (facts.atmakaraka) {
    const wrongAK = new RegExp(`\\batmakaraka\\b[^.\\n]{0,30}\\b(?:is|in|as)\\s+(?!${facts.atmakaraka})`, 'i');
    if (wrongAK.test(text)) return `explicit Atmakaraka contradiction (not ${facts.atmakaraka})`;
  }

  if (facts.current_mahadasha) {
    const badMD = ['Surya','Sun','Chandra','Moon','Mangal','Mars','Budha','Mercury','Guru','Jupiter','Shukra','Venus','Shani','Saturn','Rahu','Ketu']
      .filter((p) => p.toLowerCase() !== facts.current_mahadasha!.toLowerCase());
    if (badMD.length) {
      const patterns = [
        new RegExp(`\\b(?:current\\s+)?mahadasha\\s+(?:of|is|lord)\\s+(${badMD.join("|")})\\b`, "i"),
        new RegExp(`\\b(${badMD.join("|")})\\s+mahadasha\\b`, "i"),
      ];
      if (patterns.some(p => p.test(text))) return `explicit current Mahadasha contradiction (not ${facts.current_mahadasha})`;
    }
  }

  // NEW: Human Design profile / type / authority / definition (explicit only)
  if (facts.human_design) {
    const h = facts.human_design;
    if (h.profile) {
      const wrongProfiles = ['1/3','1/4','2/4','2/5','3/5','3/6','4/6','4/1','5/1','5/2','6/2','6/3'].filter(p => p !== h.profile);
      const profPat = new RegExp(`\\b(?:profile|hd profile|human design profile)\\b[^.]{0,30}\\b(?:${wrongProfiles.join('|')})\\b`, 'i');
      if (profPat.test(text)) return `explicit HD profile contradiction (not ${h.profile})`;
    }
    if (h.hd_type) {
      const wrongTypes = ['Manifestor','Generator','Manifesting Generator','Projector','Reflector'].filter(t => !h.hd_type!.toLowerCase().includes(t.toLowerCase().slice(0,4)));
      if (wrongTypes.length) {
        const typePat = new RegExp(`\\b(?:type|hd type|human design type)\\b[^.]{0,30}\\b(?:${wrongTypes.join('|')})\\b`, 'i');
        if (typePat.test(text)) return `explicit HD type contradiction (not ${h.hd_type})`;
      }
    }
    if (h.authority) {
      const wrongAuth = ['Emotional','Sacral','Splenic','Ego','Self','Lunar','Mental','None'].filter(a => a.toLowerCase() !== h.authority!.toLowerCase());
      const authPat = new RegExp(`\\b(?:authority|emotional authority|authority is)\\b[^.]{0,30}\\b(?:${wrongAuth.join('|')})\\b`, 'i');
      if (authPat.test(text)) return `explicit HD authority contradiction (not ${h.authority})`;
    }
  }

  // NEW: Gene Keys activation sequence (explicit main ones)
  // IMPORTANT: Only match when the specific sequence name is mentioned, not generic "gene key"
  if (facts.gene_keys) {
    const g = facts.gene_keys;
    const checkGK = (label: string, pair?: [number, number]) => {
      if (!pair) return undefined;
      const [a, b] = pair;
      // Only trigger on explicit "[Label] is/has/= [wrong number]" patterns
      const labelVariants = label.toLowerCase().replace(/'/g, "'?").replace(/\s+/g, "\\s*");
      const pat = new RegExp(`\\b${labelVariants}\\b[^.\\n]{0,20}\\b(\\d+)(?:[/,\\s]+(\\d+))?\\b`, 'i');
      const match = text.match(pat);
      if (match) {
        const n1 = parseInt(match[1], 10);
        const n2 = match[2] ? parseInt(match[2], 10) : undefined;
        if (n2 !== undefined) {
          const isCorrect = (n1 === a && n2 === b) || (n1 === b && n2 === a);
          if (!isCorrect) return `explicit Gene Key ${label} contradiction (not ${a}/${b})`;
        } else {
          if (n1 !== a && n1 !== b) return `explicit Gene Key ${label} contradiction (not ${a}/${b})`;
        }
      }
      return undefined;
    };
    const res1 = checkGK("Life's Work", g.lifes_work); if (res1) return res1;
    const res2 = checkGK("Evolution", g.evolution); if (res2) return res2;
    const res3 = checkGK("Radiance", g.radiance); if (res3) return res3;
    const res4 = checkGK("Purpose", g.purpose); if (res4) return res4;
  }

  // NEW: Numerology core numbers (explicit)
  if (facts.numerology) {
    const n = facts.numerology;
    const numChecks: Array<[string, number | undefined]> = [
      ["life path", n.life_path],
      ["expression", n.expression],
      ["soul urge", n.soul_urge],
      ["personality", n.personality],
    ];
    for (const [label, val] of numChecks) {
      if (!val) continue;
      const wrong = Array.from({length:33}, (_,i)=>i+1).filter(v => v !== val);
      const pat = new RegExp(`\\b(?:${label})\\b[^.]{0,30}\\b(?:${wrong.join("|")})\\b`, "i");
      if (pat.test(text)) return `explicit Numerology ${label} contradiction (not ${val})`;
    }
  }

  // NEW: Vimshottari sub-periods (explicit lord)
  // IMPORTANT: Only match direct assignments, not comma-separated lists
  if (facts.vimshottari) {
    const v = facts.vimshottari;
    const lords = ["Surya","Sun","Chandra","Moon","Mangal","Mars","Budha","Mercury","Guru","Jupiter","Shukra","Venus","Shani","Saturn","Rahu","Ketu"];
    if (v.current_antardasha) {
      const bad = lords.filter(p => p.toLowerCase() !== v.current_antardasha!.toLowerCase());
      const patterns = [
        new RegExp(`\\b(?:antardasha|sub.?dasha)\\s+(?:of|is)\\s+(${bad.join("|")})\\b`, "i"),
        new RegExp(`\\b(${bad.join("|")})\\s+(?:antardasha|sub.?dasha)\\b`, "i"),
      ];
      if (patterns.some(p => p.test(text))) return `explicit Antardasha contradiction (not ${v.current_antardasha})`;
    }
    if (v.current_pratyantardasha) {
      const bad = lords.filter(p => p.toLowerCase() !== v.current_pratyantardasha!.toLowerCase());
      const patterns = [
        new RegExp(`\\b(?:pratyantardasha|praty.?antardasha)\\s+(?:of|is)\\s+(${bad.join("|")})\\b`, "i"),
        new RegExp(`\\b(${bad.join("|")})\\s+(?:pratyantardasha|praty.?antardasha)\\b`, "i"),
      ];
      if (patterns.some(p => p.test(text))) return `explicit Pratyantardasha contradiction (not ${v.current_pratyantardasha})`;
    }
  }

  return undefined;
}

function validatePassDraft(markdown: string, soloRuns: SoloRun[]): string | undefined {
  const metaLeak = detectMetaLeakage(markdown);
  if (metaLeak) return metaLeak;
  for (const run of soloRuns) {
    // In multi-subject modes (synastry, etc.), filter out text about OTHER subjects
    // to avoid false positives when partner's chart is discussed in same pass
    const otherSubjects = soloRuns
      .filter((r) => r.slug !== run.slug)
      .map((r) => r.subject);
    const relevantText = extractSubjectRelevantText(markdown, run.subject, otherSubjects);
    
    const moonIssue = detectMoonPollution(relevantText, run.authoritativeMoon);
    if (moonIssue) return moonIssue;
    const factIssue = detectFactContradiction(relevantText, run.authoritativeFacts);
    if (factIssue) return factIssue;
  }
  return undefined;
}

/** Extract text relevant to a specific subject, excluding paragraphs about other subjects.
 *  Uses simple heuristics: paragraphs mentioning other subject names are excluded.
 */
function extractSubjectRelevantText(markdown: string, subject: string, otherSubjects: string[]): string {
  if (otherSubjects.length === 0) return markdown;
  
  const paragraphs = markdown.split(/\n\n+/);
  const otherNames = otherSubjects.flatMap((s) => {
    const parts = s.split(/\s+/);
    return [s, ...parts.filter((p) => p.length > 3)]; // include full name and significant parts
  });
  
  return paragraphs
    .filter((para) => {
      // Keep paragraph if it mentions current subject OR doesn't mention any other subject
      const mentionsCurrent = para.toLowerCase().includes(subject.toLowerCase().slice(0, 10));
      const mentionsOther = otherNames.some((name) => 
        para.toLowerCase().includes(name.toLowerCase().slice(0, Math.min(name.length, 15)))
      );
      return mentionsCurrent || !mentionsOther;
    })
    .join('\n\n');
}

function readPanchangaFromSoloCache(synthesisPath: string, slug: string): any | undefined {
  const selemenePath = join(dirname(synthesisPath), `01_selemene_${slug}.json`);
  if (!existsSync(selemenePath)) return undefined;
  try {
    const outputs = JSON.parse(readFileSync(selemenePath, 'utf-8')) as SelemeneEngineOutput[];
    return outputs.find((o) => o.engine_id === 'panchanga' && o.result && !o._error)?.result;
  } catch {
    return undefined;
  }
}

async function fetchPanchangaForSubject(cfg: SubjectConfig): Promise<any | undefined> {
  if (!cfg.birth_date) return undefined;
  const selemeneKey = await loadSelemeneKey();
  if (!selemeneKey) return undefined;
  const [panchanga] = await fetchAllEngines({
    date: cfg.birth_date,
    time: cfg.birth_time,
    timezone: cfg.timezone ?? 'Asia/Kolkata',
    latitude: cfg.latitude,
    longitude: cfg.longitude,
    name: cfg.subject,
  }, {
    api_key: selemeneKey,
    engines: ['panchanga'],
  });
  if (!panchanga || panchanga._error) return undefined;
  return panchanga.result;
}

async function resolveAuthoritativeMoon(cfg: SubjectConfig, slug: string, synthesisPath: string): Promise<AuthoritativeMoon | undefined> {
  const cached = moonRashiFromPanchanga(readPanchangaFromSoloCache(synthesisPath, slug));
  if (cached.rashi !== 'UNKNOWN') return { ...cached, source: 'solo-cache' };

  const live = moonRashiFromPanchanga(await fetchPanchangaForSubject(cfg));
  if (live.rashi !== 'UNKNOWN') return { ...live, source: 'live-panchanga' };

  return undefined;
}

function assertMoonIntegrity(cfg: SubjectConfig, run: SoloRun): void {
  if (run.slug !== 'vandana-g') return;
  if (!run.authoritativeMoon) {
    throw new Error(
      `Unable to resolve authoritative Moon rashi for ${cfg.subject}; refusing to trust cached synthesis ${run.synthesisPath}`,
    );
  }
  if (run.authoritativeMoon.rashi !== 'Kanya') {
    throw new Error(
      `Authoritative Moon rashi mismatch for ${cfg.subject}: expected Kanya, got ${run.authoritativeMoon.rashi}`,
    );
  }

  const pollutionPatterns = [
    /\b(?:moon|chandra)[^.\n]{0,80}\b(?:karka|cancer|vrishabha|taurus)\b/i,
    /\b(?:karka|cancer|vrishabha|taurus)\b[^.\n]{0,80}\b(?:moon|chandra)\b/i,
    /\b(?:moon|chandra)\s+(?:in|as|is|falls in)\s+(?:karka|cancer|vrishabha|taurus)\b/i,
  ];
  if (pollutionPatterns.some((pattern) => pattern.test(run.synthesis))) {
    throw new Error(
      `Detected polluted Moon-rashi cache for ${cfg.subject} in ${run.synthesisPath}; delete the cached solo run and rerun with authoritative panchanga.`,
    );
  }
}

function buildAuthoritativeMoonMandates(soloRuns: SoloRun[]): string {
  return soloRuns
    .filter((run) => run.authoritativeMoon)
    .map((run) => {
      const moon = run.authoritativeMoon!;
      const degree = typeof moon.longitude === 'number' ? ` @ ${moon.longitude.toFixed(3)}°` : '';
      const nakshatra = moon.nakshatra ? ` (Nakshatra ${moon.nakshatra})` : '';
      return `AUTHORITATIVE ${run.subject} Moon rashi: ${moon.rashi}${degree}${nakshatra}. Treat this as fixed chart truth and reject any contrary Moon-sign inference.`;
    })
    .join('\n');
}

async function resolveAuthoritativeFacts(cfg: SubjectConfig, slug: string, synthesisPath: string): Promise<AuthoritativeFacts | undefined> {
  // Prefer the selemene json sibling to the synthesis (now loads full engines for multi-system facts)
  const selemenePath = join(dirname(synthesisPath), `01_selemene_${slug}.json`);
  let outputs: any[] = [];
  let panchanga: any | undefined;
  if (existsSync(selemenePath)) {
    try {
      outputs = JSON.parse(readFileSync(selemenePath, 'utf-8')) as any[];
      panchanga = outputs.find((o: any) => o.engine_id === 'panchanga' && o.result && !o._error)?.result;
    } catch {}
  }
  if ((!panchanga || outputs.length < 5) && cfg.birth_date) {
    // live fallback for the relevant engines (panchanga + the 4 new + vim)
    const selemeneKey = await loadSelemeneKey();
    if (selemeneKey) {
      outputs = await fetchAllEngines({
        date: cfg.birth_date,
        time: cfg.birth_time,
        timezone: cfg.timezone ?? 'Asia/Kolkata',
        latitude: cfg.latitude,
        longitude: cfg.longitude,
        name: cfg.subject,
      }, { api_key: selemeneKey, engines: ['panchanga', 'human-design', 'gene-keys', 'numerology', 'vimshottari'] });
      panchanga = outputs.find((o: any) => o.engine_id === 'panchanga' && o.result && !o._error)?.result;
    }
  }

  const moon = moonRashiFromPanchanga(panchanga);

  // Extract new systems from outputs (cache or live)
  const hd = outputs.find((o: any) => o.engine_id === 'human-design' && o.result && !o._error)?.result;
  const gk = outputs.find((o: any) => o.engine_id === 'gene-keys' && o.result && !o._error)?.result;
  const num = outputs.find((o: any) => o.engine_id === 'numerology' && o.result && !o._error)?.result;
  const vim = outputs.find((o: any) => o.engine_id === 'vimshottari' && o.result && !o._error)?.result;
  const act = gk?.activation_sequence || {};
  const cur = vim?.current_period || {};
  const birthNak = vim?.birth_nakshatra?.name;

  const facts: AuthoritativeFacts = {
    lagna: cfg.lagna || panchanga?.lagna || panchanga?.ascendant,
    moon: moon.rashi !== 'UNKNOWN' ? { rashi: moon.rashi, nakshatra: moon.nakshatra, longitude: moon.longitude } : undefined,
    sun: (cfg as any).sun_rashi || panchanga?.sun_rashi ? { rashi: (cfg as any).sun_rashi || panchanga?.sun_rashi } : undefined,
    atmakaraka: cfg.atmakaraka || panchanga?.atmakaraka,
    current_mahadasha: cfg.mahadasha?.current_lord || panchanga?.mahadasha?.current_lord || cur.mahadasha?.planet,
    next_mahadasha: cfg.mahadasha?.next_lord || panchanga?.mahadasha?.next_lord,
    // NEW multi-system
    human_design: (hd?.profile || hd?.hd_type || hd?.authority || hd?.definition || (cfg as any).hd_profile) ? {
      profile: hd?.profile || (cfg as any).hd_profile,
      hd_type: hd?.hd_type || hd?.type,
      authority: hd?.authority,
      definition: hd?.definition,
    } : undefined,
    gene_keys: (act.lifes_work || act.evolution || act.radiance || act.purpose) ? {
      lifes_work: act.lifes_work,
      evolution: act.evolution,
      radiance: act.radiance,
      purpose: act.purpose,
    } : undefined,
    numerology: num ? {
      life_path: num.life_path?.value,
      expression: num.expression?.value,
      soul_urge: num.soul_urge?.value,
      personality: num.personality?.value,
    } : undefined,
    vimshottari: (cur.mahadasha || cur.antardasha || cur.pratyantardasha || birthNak) ? {
      current_mahadasha: cur.mahadasha?.planet,
      current_antardasha: cur.antardasha?.planet,
      current_pratyantardasha: cur.pratyantardasha?.planet,
      birth_nakshatra: birthNak,
    } : undefined,
  };
  return (facts.lagna || facts.moon || facts.atmakaraka || facts.current_mahadasha || facts.human_design || facts.gene_keys || facts.numerology || facts.vimshottari) ? facts : undefined;
}

function buildAuthoritativeFactsMandates(soloRuns: SoloRun[]): string {
  const blocks = soloRuns
    .filter((run) => run.authoritativeFacts)
    .map((run) => {
      const f = run.authoritativeFacts!;
      const lines: string[] = [];
      lines.push(`════════════════════════════════════════════════════════════════════════`);
      lines.push(`CRITICAL AUTHORITATIVE FACTS FOR ${run.subject} — MANDATORY COMPLIANCE`);
      lines.push(`════════════════════════════════════════════════════════════════════════`);
      lines.push(`STOP. Read these facts FIRST. They are LOCKED and CANNOT be changed.`);
      lines.push(``);
      if (f.lagna) lines.push(`• Lagna: ${f.lagna} ← LOCKED`);
      if (f.moon) {
        const deg = typeof f.moon.longitude === 'number' ? ` @ ${f.moon.longitude.toFixed(3)}°` : '';
        const nak = f.moon.nakshatra ? ` (${f.moon.nakshatra})` : '';
        lines.push(`• Moon: ${f.moon.rashi}${deg}${nak} ← LOCKED`);
      }
      if (f.sun) lines.push(`• Sun: ${f.sun.rashi} ← LOCKED`);
      if (f.atmakaraka) lines.push(`• Atmakaraka: ${f.atmakaraka} ← LOCKED`);
      if (f.current_mahadasha) lines.push(`• Current Mahadasha: ${f.current_mahadasha} ← LOCKED`);
      // Multi-system facts
      if (f.human_design) {
        const h = f.human_design;
        const p: string[] = [];
        if (h.profile) p.push(`Profile ${h.profile}`);
        if (h.hd_type) p.push(h.hd_type);
        if (h.authority) p.push(`${h.authority} Authority`);
        if (p.length) lines.push(`• Human Design: ${p.join(', ')} ← LOCKED`);
      }
      if (f.gene_keys?.lifes_work) lines.push(`• Gene Keys Life's Work: ${f.gene_keys.lifes_work.join('/')} ← LOCKED`);
      if (f.gene_keys?.evolution) lines.push(`• Gene Keys Evolution: ${f.gene_keys.evolution.join('/')} ← LOCKED`);
      if (f.numerology?.life_path) lines.push(`• Numerology Life Path: ${f.numerology.life_path} ← LOCKED`);
      if (f.vimshottari?.current_antardasha) lines.push(`• Vimshottari Antardasha: ${f.vimshottari.current_antardasha} ← LOCKED`);
      lines.push(``);
      lines.push(`DO NOT contradict these facts. Any draft that does will be REJECTED.`);
      lines.push(`════════════════════════════════════════════════════════════════════════`);
      return lines.join('\n');
    });
  return blocks.join('\n\n');
}

// ────────────────────────────────────────────────────────────────────────
// Solo synthesis lookup + auto-chain
// ────────────────────────────────────────────────────────────────────────

function findExistingSolo(subjectOutputDir: string | undefined, slug: string): string | undefined {
  if (!subjectOutputDir) return undefined;
  const runsRoot = join(subjectOutputDir, '.runs');
  if (!existsSync(runsRoot)) return undefined;
  const candidates = readdirSync(runsRoot)
    .filter((d) => /^\d{4}-/.test(d))
    .sort()
    .reverse();
  for (const d of candidates) {
    const path = join(runsRoot, d, `06_synthesis_${slug}.md`);
    if (existsSync(path)) return path;
  }
  return undefined;
}

interface SoloRun {
  subject: string;
  slug: string;
  synthesisPath: string;
  synthesis: string;
  authoritativeMoon?: AuthoritativeMoon;
  authoritativeFacts?: AuthoritativeFacts;
}

async function chainSolo(cfg: SubjectConfig, cfgFilePath: string): Promise<void> {
  return new Promise((res, rej) => {
    const proc = spawn('node', [
      '--import', 'tsx',
      join(dirname(new URL(import.meta.url).pathname), 'integratedreading-full.ts'),
      cfgFilePath,
    ], { stdio: 'inherit' });
    proc.on('exit', (code) => {
      if (code === 0) res();
      else rej(new Error(`integratedreading-full.ts exited with code ${code} for subject ${cfg.subject}`));
    });
    proc.on('error', rej);
  });
}

async function ensureSolos(
  subjects: SubjectConfig[],
  subjectsDir: string,
  skipSolos: boolean,
): Promise<SoloRun[]> {
  const slugs = subjects.map((s) => slugify(s.subject));
  // Locate existing
  const existing: Array<SoloRun | undefined> = subjects.map((cfg, i) => {
    const path = findExistingSolo(cfg.output_dir, slugs[i]);
    if (!path) return undefined;
    return {
      subject: cfg.subject,
      slug: slugs[i],
      synthesisPath: path,
      synthesis: readFileSync(path, 'utf-8'),
    };
  });

  const missing = subjects.filter((_, i) => !existing[i]);
  if (missing.length > 0) {
    if (skipSolos) {
      const names = missing.map((m) => m.subject).join(', ');
      throw new Error(`--skip-solos but missing solos for: ${names}`);
    }
    console.log(`  → chaining ${missing.length} missing solo(s) in parallel: ${missing.map((m) => m.subject).join(', ')}`);
    // For each missing subject, derive its cfg file path from the subjects directory
    const filesInDir = readdirSync(subjectsDir).filter((f) => /^\d+_.+\.json$/.test(f)).sort();
    await Promise.all(missing.map((cfg) => {
      const i = subjects.indexOf(cfg);
      const cfgFilePath = join(subjectsDir, filesInDir[i]);
      return chainSolo(cfg, cfgFilePath);
    }));
    // Re-scan after spawn completes
    for (let i = 0; i < subjects.length; i++) {
      if (existing[i]) continue;
      const path = findExistingSolo(subjects[i].output_dir, slugs[i]);
      if (!path) throw new Error(`Solo synthesis still missing for ${subjects[i].subject} after chaining`);
      existing[i] = {
        subject: subjects[i].subject,
        slug: slugs[i],
        synthesisPath: path,
        synthesis: readFileSync(path, 'utf-8'),
      };
    }
  }

  await Promise.all(subjects.map(async (cfg, i) => {
    const run = existing[i];
    if (!run) return;
    run.authoritativeMoon = await resolveAuthoritativeMoon(cfg, run.slug, run.synthesisPath);
    run.authoritativeFacts = await resolveAuthoritativeFacts(cfg, run.slug, run.synthesisPath);
    assertMoonIntegrity(cfg, run);
  }));

  return existing as SoloRun[];
}

// ────────────────────────────────────────────────────────────────────────
// Interpolation
// ────────────────────────────────────────────────────────────────────────

interface InterpolationContext {
  subject_names: string;
  subject_roster: string;
  prior_pass: string;
  lessons_summary: string;
  overlay_summary: string;
  bridge_mandates: string;
  pass_title: string;
  target_words: string;
}

function buildOverlaySummary(doc: ParsedModeDoc): string {
  const ews = doc.frontmatter.engine_overlay_weights;
  const foreground = Object.entries(ews).filter(([, w]) => w > 1).sort(([, a], [, b]) => b - a);
  const background = Object.entries(ews).filter(([, w]) => w < 1).sort(([, a], [, b]) => a - b);
  const foreText = foreground.length > 0
    ? `Foreground engines (weight > 1.0): ${foreground.map(([k, w]) => `${k} ${w}`).join(', ')}.`
    : '';
  const backText = background.length > 0
    ? `Background engines (weight < 1.0): ${background.map(([k, w]) => `${k} ${w}`).join(', ')}.`
    : '';
  const houseText = `House overlay: ${doc.frontmatter.house_overlay.join(', ')}.`;
  return [foreText, backText, houseText].filter(Boolean).join(' ');
}

function buildBridgeMandates(doc: ParsedModeDoc): string {
  return doc.frontmatter.bridge_mandates.map((m, i) => `${i + 1}. ${m}`).join('\n');
}

function interpolate(template: string, ctx: InterpolationContext): string {
  let out = template;
  for (const [key, value] of Object.entries(ctx)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────
// LLM API key
// ────────────────────────────────────────────────────────────────────────

function loadNvidiaKey(): string {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
  const envPath = join(homedir(), '.claude', '.env');
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf-8').match(/^NVIDIA_API_KEY=(\S+)/m);
    if (m) { process.env.NVIDIA_API_KEY = m[1]; return m[1]; }
  }
  throw new Error('NVIDIA_API_KEY not found (env or ~/.claude/.env)');
}

// ────────────────────────────────────────────────────────────────────────
// Pass execution
// ────────────────────────────────────────────────────────────────────────

interface PassResult {
  pass: PassSpec;
  content: string;
  words: number;
  xrefs: number;
  latency_ms: number;
  model: string;
}

async function executePass(
  client: NvidiaClient,
  pass: PassSpec,
  doc: ParsedModeDoc,
  ctx: InterpolationContext,
  soloRuns: SoloRun[],
  register: RegisterBand,
  lexiconBlock: string,
  fallbackClients: PassClientOption[],
): Promise<PassResult> {
  // Resolve per-register pass template. If the mode doc declares a
  // register_variants override for this pass+register, use that template;
  // otherwise fall back to the canonical pass_plan template.
  const template = getPassTemplate(doc, pass.id, register);

  // Per-pass effective target_words — uses register variant when declared.
  // (We pass the original pass.target_words into the interpolation context
  // for backward-compat, but the system prompt below reports the register-
  // aware target so the LLM aims at the right band.)
  const effectiveTargetWords = pass.target_words;

  const userPrompt = interpolate(template, {
    ...ctx,
    pass_title: pass.title,
    target_words: String(effectiveTargetWords),
  });

  // Prepend the solo syntheses as context for the first pass; subsequent passes
  // rely on prior_pass + lessons_summary instead (to avoid blowing the context window).
  const soloContext = ctx.prior_pass === ''
    ? '\n\n## SOURCE SOLO SYNTHESES (input data — do not echo back verbatim, synthesize)\n\n' +
      soloRuns.map((s) => `### ${s.subject.toUpperCase()}\n${s.synthesis.slice(0, 14000)}`).join('\n\n')
    : '';

  // Build a concise facts reminder to append at the END of the user prompt (recency effect)
  const factsReminder = soloRuns
    .filter((s) => s.authoritativeFacts)
    .map((s) => {
      const f = s.authoritativeFacts!;
      const items: string[] = [];
      if (f.lagna) items.push(`Lagna: ${f.lagna}`);
      if (f.moon?.rashi) items.push(`Moon: ${f.moon.rashi}`);
      if (f.sun?.rashi) items.push(`Sun: ${f.sun.rashi}`);
      if (f.atmakaraka) items.push(`AK: ${f.atmakaraka}`);
      if (f.vimshottari?.current_mahadasha) items.push(`MD: ${f.vimshottari.current_mahadasha}`);
      if (f.human_design?.profile) items.push(`HD: ${f.human_design.profile}`);
      return `${s.subject}: ${items.join(' · ')}`;
    })
    .join('\n');
  const factsBlock = factsReminder ? `\n\n---\nLOCKED FACTS — State ONLY these values:\n${factsReminder}` : '';

  // For L1-L3 register, prefer the traditional Vedic register guidance.
  // For L4-L5, use the framework-native ANATOMIST_PERSONA + KOSHA_GRAMMAR
  // + DYADIC_LOOP block. Both registers still receive the mode's overlay
  // rules + bridge mandates + lessons summary + the per-engine lexicon
  // block for the engines this mode foregrounds.
  const registerHeader = register === 'l1_l3'
    ? `## Voice Register: L1-L3 (Traditional Vedic Astrology)

You are producing a reading for a user at consciousness_level 1-3. They expect
TRADITIONAL Vedic astrology vocabulary — Lagna, Rashi, Nakshatra, dasha
periods, yogas, doshas, remedies — not framework-native jargon. Use the
familiar 11-Part Kundali conventions (Core Birth Chart, Past Life, Career,
Money, Love, Marriage, Health, Family, Timeline, Remedies, Final Guidance).
Remedies (mantras, gemstones, donations, fasting, temple practices) are
ALLOWED and expected at this register. Avoid: Aletheios/Pichet dyad, Koshas-
as-Clifford-algebras, Eigenwelt/Mitwelt/Umwelt, AKSHARA seed,
anti-dependency telos. Stay in the practical, age-ranged, honest-prediction
register.`
    : `${ANATOMIST_PERSONA}\n\n${KOSHA_GRAMMAR}\n\n${DYADIC_LOOP}`;

  // CRITICAL: Bridge mandates (containing authoritative facts) FIRST so LLM sees them before persona/rules
  const system = `## MANDATORY FACTS — READ FIRST\n\n${ctx.bridge_mandates}\n\n` +
    `${registerHeader}\n\n` +
    (ctx.lessons_summary ? `${ctx.lessons_summary}\n\n` : '') +
    `## Mode Overlay Rules\n\n${ctx.overlay_summary}` +
    (lexiconBlock ? `\n\n${lexiconBlock}` : '');

  const model = pass.model ?? SYNTH_MODELS.PRIMARY;
  let lastIssue = '';
  let lastOutput = '';
  const passClients: PassClientOption[] = [
    { name: 'primary', client },
    ...fallbackClients,
  ];

  for (const passClient of passClients) {
    const attempts = passClient.name === 'primary' ? 2 : 1;
    if (passClient.name !== 'primary') {
      console.log(`      ↻ ${pass.id} retrying via ${passClient.name}`);
    }
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const retryHint = attempt === 1
        ? ''
        : `CORRECTION: previous draft failed validation because ${lastIssue}. Return only the final pass content with no planning text or speculative reasoning that contradicts authoritative facts (lagna, moon, sun, atmakaraka, mahadasha).`;
      try {
        const result = await passClient.client.callWithRetry({
          model,
          messages: [
            { role: 'system', content: [system, STRUCTURED_OUTPUT_ONLY_RULES, retryHint].filter(Boolean).join('\n\n') },
            { role: 'user', content: userPrompt + soloContext + factsBlock },
          ],
          max_tokens: 8192,
          temperature: attempt === 1 ? 0.5 : 0.2,
          timeout_ms: 360_000,
        }, 1);

        const content = result.content.trim();
        const issue = validatePassDraft(content, soloRuns);
        if (!issue) {
          const words = content.split(/\s+/).filter(Boolean).length;
          const xrefs = countCrossRefs(content).total;
          return {
            pass,
            content,
            words,
            xrefs,
            latency_ms: result.latency_ms,
            model: result.model,
          };
        }
        lastIssue = issue;
        lastOutput = content;
        console.log(`      ⚠ ${pass.id} validation failed: ${lastIssue}`);
      } catch (err: any) {
        lastIssue = err?.message || String(err);
        console.log(`      ⚠ ${pass.id} provider ${passClient.name} failed: ${lastIssue}`);
      }
    }
  }

  console.warn(`  ⚠ ${pass.id} validation exhausted all retries — proceeding with last output despite: ${lastIssue}`);
  const words = lastOutput.split(/\s+/).filter(Boolean).length;
  const xrefs = countCrossRefs(lastOutput).total;
  return {
    pass,
    content: lastOutput,
    words,
    xrefs,
    latency_ms: 0,
    model: 'fallback',
  };
}

// ────────────────────────────────────────────────────────────────────────
// Linear vs hierarchical execution
// ────────────────────────────────────────────────────────────────────────

async function runLinear(
  client: NvidiaClient,
  doc: ParsedModeDoc,
  baseCtx: Omit<InterpolationContext, 'prior_pass' | 'pass_title' | 'target_words'>,
  soloRuns: SoloRun[],
  runDir: string,
  register: RegisterBand,
  lexiconBlock: string,
  fallbackClients: PassClientOption[],
): Promise<PassResult[]> {
  const results: PassResult[] = [];
  let assembled = '';
  for (const pass of doc.frontmatter.pass_plan) {
    const cachePath = join(runDir, `pass_${pass.id}.md`);
    if (existsSync(cachePath)) {
      const cached = readFileSync(cachePath, 'utf-8');
      const issue = validatePassDraft(cached, soloRuns);
      if (!issue) {
        const words = cached.split(/\s+/).filter(Boolean).length;
        const xrefs = countCrossRefs(cached).total;
        console.log(`    ✓ Pass ${pass.id} cached: ${words}w · ${xrefs} xrefs`);
        results.push({ pass, content: cached, words, xrefs, latency_ms: 0, model: pass.model ?? SYNTH_MODELS.PRIMARY });
        assembled += '\n\n' + cached;
        continue;
      }
      console.log(`    ⚠ Pass ${pass.id} cache invalid: ${issue}; regenerating`);
    }
    console.log(`    → Pass ${pass.id} (${pass.title})…`);
    const ctx: InterpolationContext = {
      ...baseCtx,
      prior_pass: assembled.slice(-4000),
      pass_title: pass.title,
      target_words: String(pass.target_words),
    };
    const result = await executePass(client, pass, doc, ctx, soloRuns, register, lexiconBlock, fallbackClients);
    await writeFile(cachePath, result.content);
    console.log(`      ${result.latency_ms}ms · ${result.words}w · ${result.xrefs} xrefs (target ${pass.target_words}w, model ${result.model})`);
    results.push(result);
    assembled += '\n\n' + result.content;
  }
  return results;
}

async function runHierarchical(
  client: NvidiaClient,
  doc: ParsedModeDoc,
  baseCtx: Omit<InterpolationContext, 'prior_pass' | 'pass_title' | 'target_words'>,
  soloRuns: SoloRun[],
  runDir: string,
  register: RegisterBand,
  lexiconBlock: string,
  fallbackClients: PassClientOption[],
): Promise<PassResult[]> {
  // Hierarchical: first pass is outline; subsequent passes carry it forward.
  const [outlinePass, ...expansions] = doc.frontmatter.pass_plan;
  const outlineCachePath = join(runDir, `pass_${outlinePass.id}.md`);
  let outlineContent: string;
  let outlineResult: PassResult;
  if (existsSync(outlineCachePath)) {
    outlineContent = readFileSync(outlineCachePath, 'utf-8');
    const issue = validatePassDraft(outlineContent, soloRuns);
    if (!issue) {
      const words = outlineContent.split(/\s+/).filter(Boolean).length;
      const xrefs = countCrossRefs(outlineContent).total;
      console.log(`    ✓ Outline cached: ${words}w · ${xrefs} xrefs`);
      outlineResult = { pass: outlinePass, content: outlineContent, words, xrefs, latency_ms: 0, model: outlinePass.model ?? SYNTH_MODELS.PRIMARY };
    } else {
      console.log(`    ⚠ Outline cache invalid: ${issue}; regenerating`);
      outlineContent = '';
      outlineResult = undefined as unknown as PassResult;
    }
  } else {
    outlineContent = '';
    outlineResult = undefined as unknown as PassResult;
  }
  if (!outlineContent) {
    console.log(`    → Outline pass (${outlinePass.title})…`);
    const ctx: InterpolationContext = {
      ...baseCtx,
      prior_pass: '',
      pass_title: outlinePass.title,
      target_words: String(outlinePass.target_words),
    };
    outlineResult = await executePass(client, outlinePass, doc, ctx, soloRuns, register, lexiconBlock, fallbackClients);
    outlineContent = outlineResult.content;
    await writeFile(outlineCachePath, outlineContent);
    console.log(`      ${outlineResult.latency_ms}ms · ${outlineResult.words}w · ${outlineResult.xrefs} xrefs`);
  }

  const results: PassResult[] = [outlineResult];
  let assembled = outlineContent;
  for (const pass of expansions) {
    const cachePath = join(runDir, `pass_${pass.id}.md`);
    if (existsSync(cachePath)) {
      const cached = readFileSync(cachePath, 'utf-8');
      const issue = validatePassDraft(cached, soloRuns);
      if (!issue) {
        const words = cached.split(/\s+/).filter(Boolean).length;
        const xrefs = countCrossRefs(cached).total;
        console.log(`    ✓ Pass ${pass.id} cached: ${words}w · ${xrefs} xrefs`);
        results.push({ pass, content: cached, words, xrefs, latency_ms: 0, model: pass.model ?? SYNTH_MODELS.PRIMARY });
        assembled += '\n\n' + cached;
        continue;
      }
      console.log(`    ⚠ Pass ${pass.id} cache invalid: ${issue}; regenerating`);
    }
    console.log(`    → Pass ${pass.id} (${pass.title})…`);
    // Expansion passes always carry the outline + their prior expansion
    const priorWithOutline =
      `## OUTLINE (anchor reference for this expansion)\n\n${outlineContent}\n\n## PRIOR EXPANSION PASSES\n\n${assembled.slice(-3500)}`;
    const ctx: InterpolationContext = {
      ...baseCtx,
      prior_pass: priorWithOutline,
      pass_title: pass.title,
      target_words: String(pass.target_words),
    };
    const result = await executePass(client, pass, doc, ctx, soloRuns, register, lexiconBlock, fallbackClients);
    await writeFile(cachePath, result.content);
    console.log(`      ${result.latency_ms}ms · ${result.words}w · ${result.xrefs} xrefs (target ${pass.target_words}w)`);
    results.push(result);
    assembled += '\n\n' + result.content;
  }
  return results;
}

// ────────────────────────────────────────────────────────────────────────
// Render + assemble final output
// ────────────────────────────────────────────────────────────────────────

interface AssembledReport {
  markdown: string;
  total_words: number;
  total_xrefs: number;
  total_latency_ms: number;
  pass_metrics: Array<{ id: string; title: string; words: number; xrefs: number; target_words: number; latency_ms: number; model: string }>;
}

function assemble(passes: PassResult[]): AssembledReport {
  const markdown = passes.map((p) => p.content.trim()).join('\n\n---\n\n');
  return {
    markdown,
    total_words: passes.reduce((sum, p) => sum + p.words, 0),
    total_xrefs: passes.reduce((sum, p) => sum + p.xrefs, 0),
    total_latency_ms: passes.reduce((sum, p) => sum + p.latency_ms, 0),
    pass_metrics: passes.map((p) => ({
      id: p.pass.id,
      title: p.pass.title,
      words: p.words,
      xrefs: p.xrefs,
      target_words: p.pass.target_words,
      latency_ms: p.latency_ms,
      model: p.model,
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // ─── Auto-resolve mode if --auto or mode omitted / "auto" ─────────
  let effectiveMode = args.mode;
  let subjectsForAuto: SubjectConfig[] | null = null;

  if (args.auto || !effectiveMode || effectiveMode === 'auto') {
    // Peek subjects early to decide the mode (required for default wiring)
    subjectsForAuto = loadSubjects(args.subjectsDir);
    effectiveMode = resolveDefaultMode(subjectsForAuto);
    console.log(`  ♻︎ --auto resolved to mode: ${effectiveMode} (subject count = ${subjectsForAuto.length})`);
  }

  if (!effectiveMode) {
    throw new Error('No mode resolved. Use --mode <name> or --auto');
  }

  // ─── Load mode doc ────────────────────────────────────────────────
  const modeDocPath = resolve(
    new URL(import.meta.url).pathname,
    '..',
    'integratedreading/modes',
    `${effectiveMode}.md`,
  );
  if (!existsSync(modeDocPath)) {
    throw new Error(`Mode doc not found: ${modeDocPath}\nAvailable modes: ${listAvailableModes().join(', ')}`);
  }
  const doc = parseModeDoc(modeDocPath);

  // ─── Resolve consciousness level + register ──────────────────────
  // CLI runs as admin by convention (the dev/test/admin entry point).
  // Default to level 5 for backward-compat with existing fixtures.
  // API callers go through the resolver + auth middleware path
  // (gated by CallerIdentity, not by this CLI's admin assumption).
  const resolved = resolveLevel({
    user_id: 'cli-runner',
    admin_override: args.level,
    caller_tier: 'initiate',
    caller_is_admin: true,
    default_level: 5,
  });
  const register = resolved.register_band;
  const effectiveLevel = resolved.effective_level;

  // ─── Compose engine-lexicon block for foregrounded engines ───────
  // Engines weighted >= 1.0 in this mode's overlay are "foregrounded"
  // and get their register-specific lexicon injected into the system
  // prompt. Weight 0.0 engines are skipped entirely.
  const allForegrounded = Object.entries(doc.frontmatter.engine_overlay_weights)
    .filter(([, weight]) => weight >= 1.0)
    .map(([id]) => id);
  const knownSet = new Set<string>(KNOWN_ENGINE_IDS as ReadonlyArray<string>);
  const foregroundedEngines = allForegrounded.filter((id) => knownSet.has(id));
  const unknownForegrounded = allForegrounded.filter((id) => !knownSet.has(id));
  if (unknownForegrounded.length > 0) {
    console.warn(`  ⚠ unrecognized engine ids in overlay (no lexicon available): ${unknownForegrounded.join(', ')}`);
  }
  let lexiconBlock = '';
  try {
    lexiconBlock = composeLexiconBlock(foregroundedEngines, register);
  } catch (err: any) {
    console.warn(`  ⚠ engine-lexicon compose skipped: ${err.message}`);
  }

  // ─── Per-register target_words band (variants override canonical) ─
  const regTargetWords = getTargetWordsForRegister(doc, register);

  console.log('═══ integratedreading-mode ═══');
  console.log(`  Mode:        ${doc.frontmatter.mode}`);
  console.log(`  Architecture: ${doc.frontmatter.architecture}`);
  console.log(`  Topology:    ${doc.frontmatter.svg_topology}`);
  console.log(`  Passes:      ${doc.frontmatter.pass_plan.length}`);
  console.log(`  Target:      ${regTargetWords.min}–${regTargetWords.max} words`);
  console.log(`  Level:        ${effectiveLevel} (${register}, source=${resolved.source})`);
  console.log(`  Lexicons:    ${foregroundedEngines.length} foregrounded engine(s)${lexiconBlock ? '' : ' — empty block'}`);

  // ─── Load subjects ────────────────────────────────────────────────
  const subjects = subjectsForAuto ?? loadSubjects(args.subjectsDir);
  const sc = doc.frontmatter.subject_count;
  if (subjects.length < sc.min || subjects.length > sc.max) {
    throw new Error(`Mode '${doc.frontmatter.mode}' requires ${sc.min === sc.max ? sc.min : `${sc.min}-${sc.max}`} subjects; found ${subjects.length}`);
  }
  console.log(`  Subjects:    ${subjects.map((s) => s.subject).join(' × ')}`);

  if (args.dryRun) {
    console.log('\n[DRY RUN — exit before any API calls]');
    process.exit(0);
  }

  // ─── Run directory (cache-aware) ──────────────────────────────────
  await mkdir(args.outputDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runSlug = slugify(`${doc.frontmatter.mode}-${subjects.map((s) => slugify(s.subject)).join('-x-')}`);
  const { runDir, reusedPrior } = findOrCreateCachedRunDir({
    outputDir: args.outputDir,
    freshTs: ts,
    useCache: args.useCache,
    cacheFileName: `${runSlug}.md`,
  });
  if (reusedPrior) console.log(`  ↻ Reusing prior run dir for --use-cache`);
  console.log(`  Run dir:     ${runDir}`);

  // ─── Auto-chain missing solos ────────────────────────────────────
  console.log(`\n→ Phase: solo synthesis acquisition`);
  const soloRuns = await ensureSolos(subjects, args.subjectsDir, args.skipSolos);
  console.log(`  ✓ ${soloRuns.length} solo syntheses loaded`);

  // ─── Pass execution ──────────────────────────────────────────────
  console.log(`\n→ Phase: ${doc.frontmatter.architecture} multi-pass synthesis`);
  // loadNvidiaKey is still referenced for backward-compat env preflight but is
  // now optional — LlmClient pulls both NVIDIA_API_KEY and OPENROUTER_API_KEY
  // from process.env or ~/.claude/.env on its own. The constructor below honors
  // LLM_PROVIDER (auto|nim|openrouter) — default 'auto' tries NIM first and
  // falls back to OpenRouter on hard failure (4xx, 410 EOL, empty content, or
  // retry-exhausted 5xx/timeout).
  try { loadNvidiaKey(); } catch { /* allow OpenRouter-only runs */ }
  const client = new NvidiaClient();
  const avail = (client as any).availability;
  const fallbackClients: PassClientOption[] = [];
  if (avail.openrouter) fallbackClients.push({ name: 'openrouter', client: new NvidiaClient({ provider: 'openrouter', quiet: true }) });
  if (avail.nim) fallbackClients.push({ name: 'nim', client: new NvidiaClient({ provider: 'nim', quiet: true }) });
  console.log(`  ✓ LlmClient: nim=${avail.nim} ollama=${avail.ollama} openrouter=${avail.openrouter} mode=${avail.selected}`);
  const authoritativeMoonMandates = buildAuthoritativeMoonMandates(soloRuns);
  const authoritativeFactsMandates = buildAuthoritativeFactsMandates(soloRuns);
  const baseCtx: Omit<InterpolationContext, 'prior_pass' | 'pass_title' | 'target_words'> = {
    subject_names: subjects.map((s) => s.subject).join(', '),
    subject_roster: subjects.map((s, i) => {
      const baseLine = `${i + 1}. ${s.subject}${s.lagna ? ` — ${s.lagna} Lagna` : ''}${s.atmakaraka ? `, AK ${s.atmakaraka}` : ''}`;
      if (!s.relationship) return baseLine;
      const role = s.relationship.role ? `   ROLE: ${s.relationship.role}` : '';
      const relations = s.relationship.relations
        ? `   RELATIONS: ${Object.entries(s.relationship.relations).map(([k, v]) =>
            `${k}=${Array.isArray(v) ? v.join('+') : v}`).join('; ')}`
        : '';
      const notes = s.relationship.notes ? `   NOTES: ${s.relationship.notes}` : '';
      return [baseLine, role, relations, notes].filter(Boolean).join('\n');
    }).join('\n'),
    lessons_summary: summarizeLessons(doc.lessons),
    overlay_summary: buildOverlaySummary(doc),
    bridge_mandates: [authoritativeMoonMandates, authoritativeFactsMandates, buildBridgeMandates(doc)].filter(Boolean).join('\n'),
  };

  const passes = doc.frontmatter.architecture === 'hierarchical'
    ? await runHierarchical(client, doc, baseCtx, soloRuns, runDir, register, lexiconBlock, fallbackClients)
    : await runLinear(client, doc, baseCtx, soloRuns, runDir, register, lexiconBlock, fallbackClients);

  // ─── Assemble + render ───────────────────────────────────────────
  const report = assemble(passes);
  const assembledPath = join(runDir, `${runSlug}.md`);
  await writeFile(assembledPath, report.markdown);
  console.log(`\n✓ Assembled: ${assembledPath} (${report.total_words.toLocaleString()} words · ${report.total_xrefs} cross-refs)`);

  // Metric report — includes consciousness-level provenance so post-hoc
  // audits / autoresearch can attribute outputs to the right register.
  const metricPath = join(runDir, `metrics_${runSlug}.json`);
  const reportWithLevel = {
    ...report,
    effective_consciousness_level: effectiveLevel,
    register_band: register,
    level_source: resolved.source,
    target_words_band: regTargetWords,
    foregrounded_engines: foregroundedEngines,
  };
  await writeFile(metricPath, JSON.stringify(reportWithLevel, null, 2));
  console.log(`✓ Metrics:   ${metricPath}`);

  // ─── SVG topology dispatch ───────────────────────────────────────
  const topology = doc.frontmatter.svg_topology;
  let svgString = '';
  try {
    if (topology === 'dyad-arc' && subjects.length === 2) {
      svgString = renderByTopology(topology, buildDyadSvgData(subjects), { width: 640 });
    } else if (topology === 'triad-triangle' && subjects.length === 3) {
      svgString = renderByTopology(topology, buildTriadSvgData(subjects), { width: 720 });
    } else if (topology === 'pentagon' && subjects.length === 5) {
      svgString = renderByTopology(topology, buildPentaSvgData(subjects), { width: 720 });
    } else if (topology === 'web-graph' && subjects.length >= 4 && subjects.length <= 12) {
      svgString = renderByTopology(topology, buildTeamWebSvgData(subjects), { width: 880 });
    } else {
      console.log(`  (SVG topology '${topology}' renderer not yet available — emitting placeholder)`);
    }
    if (svgString) {
      await writeFile(join(runDir, `${runSlug}.svg`), svgString);
      console.log(`✓ SVG:       ${runSlug}.svg (${topology})`);
    }
  } catch (err: any) {
    console.warn(`  ⚠ SVG render skipped: ${err.message}`);
  }

  // ─── Interactive HTML render (P2.1 wired) ────────────────────────
  try {
    const figs = createFigureRegistry();
    const partBlocks: PartBlock[] = report.pass_metrics.map((m, i) => ({
      partNum: i + 1,
      romanNumeral: toRoman(i + 1),
      title: m.title,
      subtitle: `~${m.words.toLocaleString()} words · ${m.xrefs} cross-references`,
      contentHtml: mdToHtmlBlock(passes[i].content),
      // Attach the SVG only to the first Part as a sticky-viz column anchor
      vizHtml: i === 0 && svgString ? renderVizPlate({
        figNo: figs.next(`${doc.frontmatter.mode} field`),
        title: `${doc.frontmatter.mode === 'composite-dyad' ? 'Composite Dyad Field' : doc.frontmatter.mode === 'composite-triad' ? 'Triadic Field' : 'Field'}`,
        svg: svgString,
        caption: doc.frontmatter.bridge_mandates[0],
      }) : undefined,
    }));
    const html = renderInteractiveHTMLPage({
      title: `${doc.frontmatter.mode} — ${subjects.map((s) => s.subject).join(' × ')}`,
      cover: {
        subject: subjects.map((s) => s.subject).join(' × '),
        birth_date: subjects[0].birth_date || '',
        cover_mandala_svg: svgString,
      },
      topology,
      mode: doc.frontmatter.mode,
      bridge_mandate: doc.frontmatter.bridge_mandates[0],
      parts: partBlocks,
      fig_index_html: renderFigIndex(figs.list()),
      is_composite: subjects.length >= 2,
      composite_subject_a: subjects[0]?.subject,
      composite_subject_b: subjects.slice(1).map((s) => s.subject).join(' × '),
    });
    const htmlPath = join(runDir, `${runSlug}.html`);
    await writeFile(htmlPath, html);
    console.log(`✓ HTML:      ${runSlug}.html (interactive, ${(html.length / 1024).toFixed(1)} KB)`);
  } catch (err: any) {
    console.warn(`  ⚠ Interactive HTML render skipped: ${err.message}`);
  }

  // ─── Summary ─────────────────────────────────────────────────────
  console.log('\n═══ summary ═══');
  console.log(`  Level:       ${effectiveLevel} (${register})`);
  console.log(`  Total words: ${report.total_words.toLocaleString()} (target ${regTargetWords.min}-${regTargetWords.max})`);
  console.log(`  Cross-refs:  ${report.total_xrefs}`);
  console.log(`  Latency:     ${(report.total_latency_ms / 1000).toFixed(0)}s total`);
  for (const m of report.pass_metrics) {
    const hit = m.words >= m.target_words * 0.8 ? '✓' : '⚠';
    console.log(`    ${hit} Pass ${m.id}: ${m.words}w / ${m.target_words}w target · ${m.xrefs} xrefs`);
  }
}

// Roman numeral converter for Part headings
function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
    [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'],
    [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let s = ''; let r = n;
  for (const [v, sym] of map) { while (r >= v) { s += sym; r -= v; } }
  return s;
}

// Markdown → HTML via pandoc (fallback to minimal regex if pandoc absent)
function mdToHtmlBlock(md: string): string {
  if (!md.trim()) return '';
  let html: string;
  try {
    html = execSync('pandoc -f markdown -t html5 --syntax-highlighting=none', {
      input: md,
      encoding: 'utf-8',
    });
  } catch {
    html = md
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .split(/\n\n+/).map((p) => p.startsWith('<') ? p : `<p>${p}</p>`).join('\n');
  }
  // Post-process: first convert <table> elements into editorial layouts
  // (definition-list cascade OR bento card grid based on table shape),
  // THEN wrap remaining top-level blocks in <div class="verse"> for the
  // scroll-driven illumination.
  html = transformTables(html);
  return wrapVerses(html);
}

/**
 * Transform <table> elements into editorial-first layouts that play
 * nicely with the verse-illumination scroll system. Two strategies:
 *
 *  - Bento card grid (.data-cards): when the table is a "per-subject
 *    comparison" (first-column header includes 'native' | 'subject' |
 *    'person' | 'member' OR matches one of the subject names heuristically
 *    in the table body). Each row becomes a card with the row label as
 *    eyebrow and remaining cells as a definition list. Grid auto-fits
 *    1-3 columns by viewport.
 *
 *  - Definition-list cascade (.data-cascade): default for all other
 *    tables. Each row becomes a verse with the row label as <h4> and
 *    the remaining cells as a <dl>. Reads as continuous prose.
 *
 * Tables that don't have a header row, or have only one column, are
 * left as <table> elements (probably layout tables that shouldn't be
 * touched).
 */
function transformTables(html: string): string {
  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/g, (full, inner: string) => {
    // Extract header row (thead > tr > th, or first tr > th)
    const theadMatch = inner.match(/<thead[^>]*>([\s\S]*?)<\/thead>/);
    let headerHtml = '';
    let bodyHtml = '';
    if (theadMatch) {
      headerHtml = theadMatch[1];
      bodyHtml = inner.replace(theadMatch[0], '');
    } else {
      // Fallback: first <tr> is the header
      const firstRowMatch = inner.match(/<tr[^>]*>[\s\S]*?<\/tr>/);
      if (firstRowMatch && firstRowMatch[0].includes('<th')) {
        headerHtml = firstRowMatch[0];
        bodyHtml = inner.replace(firstRowMatch[0], '');
      } else {
        return full; // No header — leave as <table>
      }
    }

    const headerCells = [...headerHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => stripTags(m[1]).trim());
    if (headerCells.length < 2) return full;

    // Pull body rows
    const bodyTbody = bodyHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
    const rowSource = bodyTbody ? bodyTbody[1] : bodyHtml;
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    const rows: string[][] = [];
    let rm: RegExpExecArray | null;
    while ((rm = rowRegex.exec(rowSource)) !== null) {
      const cells = [...rm[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((cm) => cm[1].trim());
      if (cells.length === headerCells.length) rows.push(cells);
    }
    if (rows.length === 0) return full;

    // Decide format: bento cards if first-column header is a "subject"
    // identifier OR if there are 2-4 rows (likely comparison shape).
    const firstColHeader = headerCells[0].toLowerCase();
    const isSubjectAxis = /^(native|subject|person|member|partner|chart|individual)$/i.test(firstColHeader);
    const useCards = isSubjectAxis && rows.length >= 2 && rows.length <= 6;

    if (useCards) {
      return renderBentoCards(headerCells, rows);
    }
    return renderCascade(headerCells, rows);
  });
}

function renderBentoCards(headers: string[], rows: string[][]): string {
  const cards = rows.map((row) => {
    const label = stripTags(row[0]).trim();
    const defs = headers.slice(1).map((h, i) => {
      const value = row[i + 1] ?? '';
      return `<div class="data-pair"><dt>${escapeAttr(h)}</dt><dd>${value}</dd></div>`;
    }).join('');
    return `<article class="data-card">
      <header class="data-card-label">${label}</header>
      <dl class="data-card-list">${defs}</dl>
    </article>`;
  }).join('');
  return `<div class="verse"><div class="data-cards">${cards}</div></div>`;
}

function renderCascade(headers: string[], rows: string[][]): string {
  const entries = rows.map((row) => {
    const label = stripTags(row[0]).trim();
    const defs = headers.slice(1).map((h, i) => {
      const value = row[i + 1] ?? '';
      return `<div class="data-pair"><dt>${escapeAttr(h)}</dt><dd>${value}</dd></div>`;
    }).join('');
    return `<div class="verse data-entry">
      <h4 class="data-entry-label">${label}</h4>
      <dl class="data-entry-list">${defs}</dl>
    </div>`;
  }).join('\n');
  return `<div class="data-cascade">${entries}</div>`;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Wrap each top-level prose block (<p>, <h2>, <h3>, <h4>, <ul>, <ol>,
 * <blockquote>, <table>) in a <div class="verse"> so the reader experiences
 * one focused 2-3 line "verse" at a time via the CSS scroll-illumination
 * animation. Skips elements that are already verses, and preserves figure
 * / svg / pre blocks (those need different treatment).
 *
 * Splits long paragraphs (>180 words OR >2 sentence-end markers) into
 * sentence-grouped verse fragments so a 600-word block doesn't read as
 * one verse — it reads as ~3 verses each 2-3 lines long.
 */
function wrapVerses(html: string): string {
  const blockRe = /(<(?:p|h2|h3|h4|ul|ol|blockquote|table)[^>]*>[\s\S]*?<\/(?:p|h2|h3|h4|ul|ol|blockquote|table)>)/g;
  return html.replace(blockRe, (match, block: string) => {
    const tagMatch = block.match(/^<(p|h2|h3|h4|ul|ol|blockquote|table)/);
    const tag = tagMatch ? tagMatch[1] : 'p';
    const isHeading = tag === 'h2' || tag === 'h3' || tag === 'h4';
    const anchorClass = isHeading ? 'verse verse-anchor' : 'verse';

    // For long paragraphs, split into sentence-grouped sub-verses
    if (tag === 'p') {
      const text = block.replace(/<\/?p[^>]*>/g, '');
      const words = text.split(/\s+/).filter(Boolean).length;
      // sentence-end count (rough — counts ". " and "? " and "! ")
      const sentenceEnds = (text.match(/[.!?]\s+(?=[A-Z“"])/g) || []).length;
      if (words > 160 && sentenceEnds >= 3) {
        // Split on sentence boundaries, group into chunks of ~2-3 sentences
        const parts = text.split(/(?<=[.!?])\s+(?=[A-Z“"])/);
        const chunks: string[] = [];
        let current: string[] = [];
        let currentWords = 0;
        for (const p of parts) {
          const w = p.split(/\s+/).filter(Boolean).length;
          current.push(p);
          currentWords += w;
          if (currentWords >= 55 || current.length >= 3) {
            chunks.push(current.join(' '));
            current = [];
            currentWords = 0;
          }
        }
        if (current.length) chunks.push(current.join(' '));
        return chunks.map((c) => `<div class="${anchorClass}"><p>${c}</p></div>`).join('\n');
      }
    }
    return `<div class="${anchorClass}">${block}</div>`;
  });
}

function listAvailableModes(): string[] {
  const modesDir = resolve(new URL(import.meta.url).pathname, '..', 'integratedreading/modes');
  if (!existsSync(modesDir)) return [];
  return readdirSync(modesDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => f.replace(/\.md$/, ''));
}

/**
 * Resolve the canonical mode for a given set of subjects when --auto (or --mode auto) is used.
 * This makes integrated 5-systems the default process as requested.
 */
function resolveDefaultMode(subjects: SubjectConfig[]): string {
  const count = subjects.length;
  if (count === 1) return 'solo-integrated';
  if (count === 2) {
    const rel = (subjects[0]?.relationship || subjects[1]?.relationship || '').toLowerCase();
    if (rel.includes('business') || rel.includes('partner')) return 'business-partners';
    return 'partner-synastry'; // default for romantic dyad
  }
  if (count === 3) return 'composite-triad';
  if (count >= 4 && count <= 5) return 'family-penta';
  return 'team-synergy';
}

// SVG data builders — minimal shape needed by existing renderers
function buildDyadSvgData(subjects: SubjectConfig[]) {
  const [a, b] = subjects;
  return {
    subject_a: a.subject,
    subject_b: b.subject,
    a_mahadasha: a.mahadasha ? {
      current: a.mahadasha.current_lord || '',
      next: a.mahadasha.next_lord || '',
      transition_iso: a.mahadasha.current_ends_iso,
    } : undefined,
    b_mahadasha: b.mahadasha ? {
      current: b.mahadasha.current_lord || '',
      next: b.mahadasha.next_lord || '',
      transition_iso: b.mahadasha.current_ends_iso,
    } : undefined,
    shared_atmakaraka: a.atmakaraka && b.atmakaraka && a.atmakaraka === b.atmakaraka ? a.atmakaraka : undefined,
  };
}

function buildTriadSvgData(subjects: SubjectConfig[]) {
  const colors = ['#10B5A7', '#0B50FB', '#C5A017'];   // emerald, indigo, gold
  return {
    subjects: subjects.map((s, i) => ({
      name: s.subject,
      arc_color: colors[i % colors.length],
      current_mahadasha_lord: s.mahadasha?.current_lord,
      next_mahadasha_lord: s.mahadasha?.next_lord,
      next_mahadasha_iso: s.mahadasha?.current_ends_iso,
    })),
    shared_keys: [],
  };
}

function buildPentaSvgData(subjects: SubjectConfig[]) {
  // Convention: positions 1+2 = roots (warm tones), 3-5 = branches (cool tones)
  const colors = [
    '#F0EDE3', // root-1: parchment (warm)
    '#C5A017', // root-2: sacred-gold (warm)
    '#10B5A7', // branch-1: coherence-emerald
    '#0B50FB', // branch-2: flow-indigo
    '#2D0050', // branch-3: witness-violet
  ];
  return {
    subjects: subjects.slice(0, 5).map((s, i) => ({
      name: s.subject,
      arc_color: colors[i],
      role: i < 2 ? 'root' as const : 'branch' as const,
      current_mahadasha_lord: s.mahadasha?.current_lord,
      next_mahadasha_lord: s.mahadasha?.next_lord,
      next_mahadasha_iso: s.mahadasha?.current_ends_iso,
    })) as [any, any, any, any, any],
    dominant_pairs: [[0, 1]] as Array<[number, number]>,  // root-pair always dominant
    shared_keys: [],
  };
}

function buildTeamWebSvgData(subjects: SubjectConfig[]) {
  // Default round-robin cluster assignment (outline pass will refine).
  // In a live run the OUTLINE pass produces the actual role-cluster map;
  // for the static SVG render we apply a deterministic default so the
  // shape renders cleanly even before the cluster-reading pass writes back.
  const clusters: Array<'visionaries' | 'operators' | 'integrators' | 'connectors'> = [
    'visionaries', 'operators', 'integrators', 'connectors',
  ];
  return {
    members: subjects.map((s, i) => ({
      name: s.subject,
      role_cluster: clusters[i % clusters.length],
      current_mahadasha_lord: s.mahadasha?.current_lord,
      next_mahadasha_lord: s.mahadasha?.next_lord,
      next_mahadasha_iso: s.mahadasha?.current_ends_iso,
    })),
    // Default critical-path edges: first member of each cluster pair
    // (replaced by outline-pass output when wired through P6 autoresearch)
    critical_path_edges: subjects.length >= 4 ? [
      { a: 0, b: 1, weight: 0.8 },
      { a: 0, b: 2, weight: 0.6 },
      { a: 1, b: 3, weight: 0.6 },
    ] : [],
    joint_operative_archetype: '',
    shared_keys: [],
  };
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
