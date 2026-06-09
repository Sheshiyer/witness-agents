// ─── /integratedreading — Full Pipeline (Selemene + NVIDIA Dyad + HTML) ───
// End-to-end runner combining everything:
//   1. Load config (subject, birth data, optional source docx)
//   2. Fetch Selemene 16 engines in parallel (real chart calculations)
//   3. Run NVIDIA Aletheios + Pichet pillars (gpt-oss-120b)
//   4. Two-pass synthesis (kimi-k2-instruct, Parts I-VI then VII-XI, 5500-7500 words target)
//   5. Chunk into 11-Part structure (regex V2, minimax not used in single-shot path)
//   6. Render HTML + PDF via Chrome headless
//
// Usage:
//   node --import tsx scripts/integratedreading-full.ts <config.json>

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { findOrCreateCachedRunDir } from './autoresearch-integratedreading/defaults.js';

// Multi-provider LlmClient: NIM → Ollama → OpenRouter (LLM_PROVIDER=auto|nim|ollama|openrouter).
import { LlmClient as NvidiaClient, MODELS } from './integratedreading/llm-client.js';
import {
  ANATOMIST_PERSONA,
  KOSHA_GRAMMAR,
  DYADIC_LOOP,
  aletheiosPillarPrompt,
  pichetPillarPrompt,
  synthesisPromptA,
  synthesisPromptB,
  synthesisPromptC,
} from './integratedreading/system-prompts.js';
import {
  fetchAllEngines,
  loadSelemeneKey,
  type SelemeneEngineOutput,
  type BirthData,
} from './integratedreading/selemene/fetcher.js';
import {
  toWheelInputs,
  toKoshaLayerSignals,
  toMahadashaInput,
  computePanchaBhuta,
  moonRashiFromPanchanga,
} from './integratedreading/selemene/mapper.js';
import {
  computeDriftReport,
  formatDriftReportMarkdown,
  type HardenedReference,
} from './integratedreading/selemene/drift-report.js';
import { renderHTMLPage, renderPart, renderViz } from './integratedreading/render/templates.js';
import { renderMahadashaTimeline } from './integratedreading/render/svg/mahadasha-timeline.js';
import { renderKoshaStack } from './integratedreading/render/svg/kosha-stack.js';
import { renderKundaliChart } from './integratedreading/render/svg/kundali-chart.js';
import { renderSelemeneWheel } from './integratedreading/render/svg/selemene-wheel.js';
import { renderPanchaBhuta } from './integratedreading/render/svg/pancha-bhuta.js';

// ──────────────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────────────

interface RunConfig {
  source_path?: string;
  subject: string;
  birth_date: string;
  birth_time?: string;
  birth_place?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  lagna: string;
  atmakaraka?: string;
  birth_nakshatra?: string;       // hardened docx value
  placements: Array<{ planet: string; sign: string; house?: number; retrograde?: boolean; degree?: string; condition?: string }>;
  mahadasha?: {                   // hardened docx value (DOCX wins over Selemene for rendering)
    current_lord: string;
    current_ends_iso?: string;
    next_lord: string;
    next_starts_iso?: string;
    next_duration_years?: number;
  };
  output_dir: string;
  pdf?: boolean;
}

interface AuthoritativeMoon {
  rashi: string;
  nakshatra?: string;
  longitude?: number;
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
    profile?: string;      // e.g. "6/3"
    hd_type?: string;      // e.g. "Manifesting Generator" (engine key is hd_type)
    authority?: string;    // e.g. "Emotional"
    definition?: string;   // e.g. "Split"
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
  'Return ONLY the final user-facing Markdown.',
  'NEVER output: planning notes, scratchpad, calculations, uncertainty, meta commentary, or self-corrections.',
  'FORBIDDEN anywhere in output (including implied reasoning):',
  '  - "The user wants", "Wait,", "I need to", "Let\'s", "Now, let\'s"',
  '  - "Key constraints", "Structure required", "Chart facts to respect"',
  '  - "Need a table", "Word count:", "Given the lack of"',
  '  - Any sentence starting with "First," or "Step 1:" describing your own process',
  'If a chart fact is uncertain, STATE THE LOCKED FACT VERBATIM rather than reasoning about it.',
].join('\n');

const META_LEAKAGE_PATTERNS: RegExp[] = [
  /(^|\n)The user wants\b/i,
  /(^|\n)Key constraints\b/i,
  /(^|\n)Wait,\s/i,
  /(^|\n)I need to\b/i,
  /(^|\n)Let'?s\b/i,
  /(^|\n)Need a table\b/i,
  /(^|\n)Structure required:\b/i,
  /(^|\n)Chart facts to respect:\b/i,
  /(^|\n)Word count:\s*\d/i,
  /(^|\n)Now, let'?s\b/i,
  /(^|\n)Given the lack of specific planetary placements/i,
];

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function loadNvidiaKey(): string {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
  const envPath = join(homedir(), '.claude', '.env');
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf-8').match(/^NVIDIA_API_KEY=(\S+)/m);
    if (m) { process.env.NVIDIA_API_KEY = m[1]; return m[1]; }
  }
  throw new Error('NVIDIA_API_KEY not found in env or ~/.claude/.env');
}

function extractToMarkdown(sourcePath: string): string {
  const ext = sourcePath.toLowerCase().split('.').pop();
  if (ext === 'md' || ext === 'txt') return readFileSync(sourcePath, 'utf-8');
  if (ext === 'docx') return execSync(`pandoc -f docx -t markdown "${sourcePath}"`, { encoding: 'utf-8' });
  throw new Error(`Unsupported source extension: ${ext}`);
}

function mdToHtml(md: string): string {
  if (!md.trim()) return '';
  try {
    return execSync('pandoc -f markdown -t html5 --syntax-highlighting=none', { input: md, encoding: 'utf-8' });
  } catch {
    return md.split(/\n\n+/).map((p) => `<p>${p}</p>`).join('\n');
  }
}

function resolveAuthoritativeMoon(selemene: SelemeneEngineOutput[]): AuthoritativeMoon | undefined {
  const panchanga = selemene.find((o) => o.engine_id === 'panchanga' && o.result && !o._error)?.result;
  const moon = moonRashiFromPanchanga(panchanga);
  return moon.rashi === 'UNKNOWN' ? undefined : moon;
}

function buildAuthoritativeMoonMandate(subject: string, moon?: AuthoritativeMoon): string {
  if (!moon) return '';
  const degree = typeof moon.longitude === 'number' ? ` @ ${moon.longitude.toFixed(3)}°` : '';
  const nakshatra = moon.nakshatra ? ` (Nakshatra ${moon.nakshatra})` : '';
  return [
    `AUTHORITATIVE MOON FACT FOR ${subject}: Moon rashi is ${moon.rashi}${degree}${nakshatra}.`,
    'Treat this as fixed chart truth derived from panchanga. Do not speculate, hedge, or replace it with any other Moon sign.',
    'If any draft reasoning suggests Cancer/Karka, Taurus/Vrishabha, or any non-authoritative Moon sign, discard that reasoning and rewrite from the authoritative chart fact.',
  ].join(' ');
}

function resolveAuthoritativeFacts(cfg: RunConfig, selemene: SelemeneEngineOutput[]): AuthoritativeFacts {
  const panchanga = selemene.find((o) => o.engine_id === 'panchanga' && o.result && !o._error)?.result;
  const moon = moonRashiFromPanchanga(panchanga);

  let sunRashi: string | undefined;
  const sunPlacement = cfg.placements?.find((p: any) => (p.planet || '').toLowerCase() === 'sun');
  if (sunPlacement?.sign) {
    sunRashi = sunPlacement.sign;
  } else {
    const pSun = panchanga?.sun_rashi || panchanga?.sun?.rashi;
    if (pSun) sunRashi = pSun;
  }

  // NEW: Human Design (engine key: human-design)
  const hd = selemene.find((o) => o.engine_id === 'human-design' && o.result && !o._error)?.result;
  const hdProfile = hd?.profile || (cfg as any).hd_profile;
  const hdType = hd?.hd_type || hd?.type;
  const hdAuthority = hd?.authority;
  const hdDefinition = hd?.definition;

  // NEW: Gene Keys (engine key: gene-keys)
  const gk = selemene.find((o) => o.engine_id === 'gene-keys' && o.result && !o._error)?.result;
  const act = gk?.activation_sequence || {};

  // NEW: Numerology (engine key: numerology)
  const num = selemene.find((o) => o.engine_id === 'numerology' && o.result && !o._error)?.result;

  // NEW: Vimshottari details (engine key: vimshottari) — enhance existing mahadasha
  const vim = selemene.find((o) => o.engine_id === 'vimshottari' && o.result && !o._error)?.result;
  const cur = vim?.current_period || {};
  const birthNak = vim?.birth_nakshatra?.name;

  const facts: AuthoritativeFacts = {
    lagna: cfg.lagna || panchanga?.lagna || panchanga?.ascendant || panchanga?.lagna_sign,
    moon: moon.rashi !== 'UNKNOWN' ? { rashi: moon.rashi, nakshatra: moon.nakshatra, longitude: moon.longitude } : undefined,
    sun: sunRashi ? { rashi: sunRashi } : undefined,
    atmakaraka: cfg.atmakaraka || panchanga?.atmakaraka,
    current_mahadasha: cfg.mahadasha?.current_lord || (panchanga?.mahadasha?.current_lord) || cur.mahadasha?.planet,
    next_mahadasha: cfg.mahadasha?.next_lord || (panchanga?.mahadasha?.next_lord),
    // NEW multi-system sections
    human_design: (hdProfile || hdType || hdAuthority || hdDefinition) ? {
      profile: hdProfile,
      hd_type: hdType,
      authority: hdAuthority,
      definition: hdDefinition,
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
  return facts;
}

function buildAuthoritativeFactsMandate(subject: string, facts?: AuthoritativeFacts): string {
  if (!facts) return '';
  const lines: string[] = [];
  lines.push(`════════════════════════════════════════════════════════════════════════`);
  lines.push(`CRITICAL AUTHORITATIVE FACTS FOR ${subject} — MANDATORY COMPLIANCE`);
  lines.push(`════════════════════════════════════════════════════════════════════════`);
  lines.push(`STOP. Read these facts FIRST. They are LOCKED and CANNOT be changed.`);
  lines.push(`Any draft that contradicts these facts will be REJECTED and regenerated.`);
  lines.push(``);
  if (facts.lagna) lines.push(`• Lagna (rising sign): ${facts.lagna} ← LOCKED`);
  if (facts.moon) {
    const deg = typeof facts.moon.longitude === 'number' ? ` @ ${facts.moon.longitude.toFixed(3)}°` : '';
    const nak = facts.moon.nakshatra ? `, Nakshatra ${facts.moon.nakshatra}` : '';
    lines.push(`• Moon rashi: ${facts.moon.rashi}${deg}${nak} ← LOCKED (per panchanga lunar_longitude)`);
  }
  if (facts.sun) lines.push(`• Sun rashi: ${facts.sun.rashi} ← LOCKED`);
  if (facts.atmakaraka) lines.push(`• Atmakaraka (soul significator): ${facts.atmakaraka} ← LOCKED`);
  if (facts.current_mahadasha) lines.push(`• Current Mahadasha lord: ${facts.current_mahadasha} ← LOCKED`);
  if (facts.next_mahadasha) lines.push(`• Next Mahadasha lord: ${facts.next_mahadasha} ← LOCKED`);
  // NEW multi-system mandate lines (explicit contradictions only)
  if (facts.human_design) {
    const h = facts.human_design;
    const parts: string[] = [];
    if (h.profile) parts.push(`Profile ${h.profile}`);
    if (h.hd_type) parts.push(h.hd_type);
    if (h.authority) parts.push(`${h.authority} Authority`);
    if (h.definition) parts.push(`${h.definition} Definition`);
    if (parts.length) lines.push(`• Human Design: ${parts.join(', ')} ← LOCKED`);
  }
  if (facts.gene_keys) {
    const g = facts.gene_keys;
    const parts: string[] = [];
    if (g.lifes_work) parts.push(`Life's Work ${g.lifes_work.join('/')}`);
    if (g.evolution) parts.push(`Evolution ${g.evolution.join('/')}`);
    if (g.radiance) parts.push(`Radiance ${g.radiance.join('/')}`);
    if (g.purpose) parts.push(`Purpose ${g.purpose.join('/')}`);
    if (parts.length) lines.push(`• Gene Keys: ${parts.join(', ')} ← LOCKED`);
  }
  if (facts.numerology) {
    const n = facts.numerology;
    const parts: string[] = [];
    if (n.life_path) parts.push(`Life Path ${n.life_path}`);
    if (n.expression) parts.push(`Expression ${n.expression}`);
    if (n.soul_urge) parts.push(`Soul Urge ${n.soul_urge}`);
    if (n.personality) parts.push(`Personality ${n.personality}`);
    if (parts.length) lines.push(`• Numerology: ${parts.join(', ')} ← LOCKED`);
  }
  if (facts.vimshottari) {
    const v = facts.vimshottari;
    const parts: string[] = [];
    if (v.current_mahadasha) parts.push(`Mahadasha ${v.current_mahadasha}`);
    if (v.current_antardasha) parts.push(`Antardasha ${v.current_antardasha}`);
    if (v.current_pratyantardasha) parts.push(`Pratyantardasha ${v.current_pratyantardasha}`);
    if (v.birth_nakshatra) parts.push(`Birth Nakshatra ${v.birth_nakshatra}`);
    if (parts.length) lines.push(`• Vimshottari: ${parts.join(', ')} ← LOCKED`);
  }
  lines.push(``);
  lines.push(`DO NOT WRITE any of these contradictions:`);
  if (facts.gene_keys?.lifes_work) {
    const [a, b] = facts.gene_keys.lifes_work;
    lines.push(`  ✗ "Life's Work" with any number other than ${a}/${b}`);
  }
  if (facts.gene_keys?.evolution) {
    const [a, b] = facts.gene_keys.evolution;
    lines.push(`  ✗ "Evolution" with any number other than ${a}/${b}`);
  }
  if (facts.numerology?.life_path) {
    lines.push(`  ✗ "Life Path" with any number other than ${facts.numerology.life_path}`);
  }
  if (facts.human_design?.authority) {
    lines.push(`  ✗ Authority as anything other than "${facts.human_design.authority}"`);
  }
  if (facts.human_design?.profile) {
    lines.push(`  ✗ Profile as anything other than "${facts.human_design.profile}"`);
  }
  if (facts.vimshottari?.current_mahadasha) {
    lines.push(`  ✗ "Mahadasha" with anything other than ${facts.vimshottari.current_mahadasha}`);
  }
  if (facts.vimshottari?.current_antardasha) {
    lines.push(`  ✗ "Antardasha" with anything other than ${facts.vimshottari.current_antardasha}`);
  }
  if (facts.vimshottari?.current_pratyantardasha) {
    lines.push(`  ✗ "Pratyantardasha" with anything other than ${facts.vimshottari.current_pratyantardasha}`);
  }
  lines.push(``);
  lines.push(`════════════════════════════════════════════════════════════════════════`);
  return lines.join('\n');
}

// Short reminder appended to user prompts and prepended to system prompts
function buildFactsReminder(facts: AuthoritativeFacts): string {
  const items: string[] = [];
  if (facts.lagna) items.push(`Lagna: ${facts.lagna}`);
  if (facts.moon?.rashi) items.push(`Moon rashi: ${facts.moon.rashi} (${facts.moon.nakshatra || ''})`);
  if (facts.sun?.rashi) items.push(`Sun rashi: ${facts.sun.rashi}`);
  if (facts.atmakaraka) items.push(`Atmakaraka: ${facts.atmakaraka}`);
  if (facts.gene_keys?.lifes_work) items.push(`GK Life's Work: ${facts.gene_keys.lifes_work.join('/')}`);
  if (facts.gene_keys?.evolution) items.push(`GK Evolution: ${facts.gene_keys.evolution.join('/')}`);
  if (facts.gene_keys?.radiance) items.push(`GK Radiance: ${facts.gene_keys.radiance.join('/')}`);
  if (facts.gene_keys?.purpose) items.push(`GK Purpose: ${facts.gene_keys.purpose.join('/')}`);
  if (facts.numerology?.life_path) items.push(`Num Life Path: ${facts.numerology.life_path}`);
  if (facts.numerology?.expression) items.push(`Num Expression: ${facts.numerology.expression}`);
  if (facts.numerology?.soul_urge) items.push(`Num Soul Urge: ${facts.numerology.soul_urge}`);
  if (facts.numerology?.personality) items.push(`Num Personality: ${facts.numerology.personality}`);
  if (facts.human_design?.profile) items.push(`HD Profile: ${facts.human_design.profile}`);
      if (facts.human_design?.hd_type) items.push(`HD Type: ${facts.human_design.hd_type}`);
  if (facts.human_design?.authority) items.push(`HD Authority: ${facts.human_design.authority}`);
  if (facts.human_design?.definition) items.push(`HD Definition: ${facts.human_design.definition}`);
  if (facts.vimshottari?.current_mahadasha) items.push(`Mahadasha: ${facts.vimshottari.current_mahadasha}`);
  if (facts.vimshottari?.current_antardasha) items.push(`Antardasha: ${facts.vimshottari.current_antardasha}`);
  if (facts.vimshottari?.current_pratyantardasha) items.push(`Pratyantardasha: ${facts.vimshottari.current_pratyantardasha}`);
  if (items.length === 0) return '';
  return `LOCKED FACTS — Use ONLY these exact values. Any contradiction is a FAILURE:\n${items.map(i => `• ${i}`).join('\n')}`;
}

function sliceFromHeader(raw: string, firstHeader: string): string {
  const idx = raw.indexOf(firstHeader);
  return idx >= 0 ? raw.slice(idx).trim() : raw.trim();
}

function detectMetaLeakage(markdown: string): string | undefined {
  const match = META_LEAKAGE_PATTERNS.find((pattern) => pattern.test(markdown));
  return match ? `meta scratchpad leaked (${match})` : undefined;
}

function detectMoonPollution(markdown: string, moon?: AuthoritativeMoon): string | undefined {
  if (!moon) return undefined;
  const badSigns = ['Karka', 'Cancer', 'Vrishabha', 'Taurus'].filter((sign) => sign !== moon.rashi);
  // TIGHTENED: Only match direct assignments, not general mentions
  // "Moon in Cancer", "Cancer Moon", "Moon rashi Cancer" — direct assignments
  // NOT: "Moon...whatever...Cancer" within 80 chars
  const moonPatterns = [
    new RegExp(`\\b(?:moon|chandra)\\s+(?:in|is|as|rashi)\\s+(?:${badSigns.join('|')})\\b`, 'i'),
    new RegExp(`\\b(?:${badSigns.join('|')})\\s+(?:moon|chandra)\\b`, 'i'),
  ];
  const match = moonPatterns.find((pattern) => pattern.test(markdown));
  return match ? `Moon-sign pollution detected (${match})` : undefined;
}

function detectFactContradiction(markdown: string, facts?: AuthoritativeFacts): string | undefined {
  if (!facts) return undefined;
  const text = markdown;

  // Moon (explicit contradictions only)
  if (facts.moon?.rashi) {
    const badMoon = ['Karka', 'Cancer', 'Vrishabha', 'Taurus'].filter((sign) => sign !== facts.moon!.rashi);
    const moonPats = [
      new RegExp(`\\b(?:moon|chandra)\\b[^.]{0,40}?\\b(?:in|is|as|falls\\s+in|placed\\s+in|rests\\s+in|occupies)\\b[^.]{0,20}?\\b(?:${badMoon.join('|')})\\b`, 'i'),
      new RegExp(`\\b(?:${badMoon.join('|')})\\s+(?:moon|chandra)\\b`, 'i'),
      new RegExp(`\\b(?:moon|chandra)\\b[^.\\n]{0,40}\\brashi\\b[^.\\n]{0,30}\\b(?:${badMoon.join('|')})\\b`, 'i'),
    ];
    if (moonPats.some((p) => p.test(text))) return `explicit Moon rashi contradiction (not ${facts.moon.rashi})`;
  }

  // Lagna / rising / ascendant (explicit only)
  if (facts.lagna) {
    const otherLagnas = ['Mesha','Aries','Vrishabha','Taurus','Mithuna','Gemini','Karka','Cancer','Simha','Leo','Tula','Libra','Vrishchika','Scorpio','Dhanu','Sagittarius','Makara','Capricorn','Kumbha','Aquarius','Meena','Pisces']
      .filter((s) => !facts.lagna!.toLowerCase().includes(s.toLowerCase().slice(0, 3)));
    if (otherLagnas.length > 0) {
      const lagnaPat = new RegExp(`\\b(?:lagna|rising|ascendant|asc)\\s+(?:in|is|as|falls in|placed in)\\s+(?:${otherLagnas.join('|')})\\b`, 'i');
      if (lagnaPat.test(text)) return `explicit Lagna contradiction (not ${facts.lagna})`;
    }
  }

  // Sun rashi (explicit)
  if (facts.sun?.rashi) {
    const badSun = ['Mesha','Aries','Vrishabha','Taurus','Mithuna','Gemini','Karka','Cancer','Simha','Leo','Kanya','Virgo','Tula','Libra','Vrishchika','Scorpio','Dhanu','Sagittarius','Makara','Capricorn','Kumbha','Aquarius','Meena','Pisces']
      .filter((s) => s.toLowerCase() !== facts.sun!.rashi.toLowerCase());
    if (badSun.length) {
      const sunPat = new RegExp(`\\b(?:sun|surya)\\s+(?:in|is|as|falls in|placed in|occupies|rashi)\\s+(?:${badSun.join('|')})\\b`, 'i');
      if (sunPat.test(text)) return `explicit Sun rashi contradiction (not ${facts.sun.rashi})`;
    }
  }

  // Atmakaraka (explicit)
  if (facts.atmakaraka) {
    const wrongAK = new RegExp(`\\batmakaraka\\b[^.\\n]{0,30}\\b(?:is|in|as)\\s+(?!${facts.atmakaraka})`, 'i');
    if (wrongAK.test(text)) return `explicit Atmakaraka contradiction (not ${facts.atmakaraka})`;
  }

  // Current Mahadasha (explicit lord name)
  // IMPORTANT: Only match direct assignments, not comma-separated lists
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

function validateMarkdownDraft(raw: string, firstHeader: string, moon?: AuthoritativeMoon, facts?: AuthoritativeFacts): { content: string; issue?: string } {
  const content = sliceFromHeader(raw, firstHeader);
  const issue = detectMetaLeakage(content) ?? detectMoonPollution(content, moon) ?? detectFactContradiction(content, facts);
  return { content, issue };
}

async function generateMarkdownPass(opts: {
  label: string;
  firstHeader: string;
  cachePath: string;
  useCache: boolean;
  model: string;
  client: NvidiaClient;
  systemPrompt: string;
  userPrompt: string;
  authoritativeMoon?: AuthoritativeMoon;
  authoritativeFacts?: AuthoritativeFacts;
  maxTokens?: number;
  temperature?: number;
  retryTemperature?: number;
  fallbackClients?: PassClientOption[];
}): Promise<string> {
  const {
    label,
    firstHeader,
    cachePath,
    useCache,
    model,
    client,
    systemPrompt,
    userPrompt,
    authoritativeMoon,
    authoritativeFacts,
    maxTokens = 8192,
    temperature = 0.2,           // Lowered from 0.5 to reduce hallucination
    retryTemperature = 0.1,      // Lowered from 0.2
    fallbackClients = [],
  } = opts;
  if (useCache && existsSync(cachePath)) {
    const cached = await readFile(cachePath, 'utf-8');
    const validated = validateMarkdownDraft(cached, firstHeader, authoritativeMoon, authoritativeFacts);
    if (!validated.issue) {
      console.log(`  ✓ ${label} cached (${(validated.content.length / 1024).toFixed(1)} KB)`);
      return validated.content;
    }
    console.log(`  ⚠ ${label} cache invalid: ${validated.issue}; regenerating`);
  }

  let lastIssue = '';
  let lastOutput = '';
  const passClients: PassClientOption[] = [
    { name: 'primary', client },
    ...fallbackClients,
  ];

  // Build a short facts reminder to append to user prompt
  const factsReminder = authoritativeFacts ? buildFactsReminder(authoritativeFacts) : '';

  for (const passClient of passClients) {
    // More attempts: 3 for primary, 2 for fallbacks (was 2/1)
    const attempts = passClient.name === 'primary' ? 3 : 2;
    if (passClient.name !== 'primary') {
      console.log(`    ↻ ${label} retrying via ${passClient.name}`);
    }
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const retryHint = attempt === 1
        ? ''
        : `CORRECTION: previous draft failed validation because ${lastIssue}. Return only the final markdown beginning with "${firstHeader}". Do not include planning text or speculative reasoning that contradicts authoritative chart facts (lagna, moon rashi, sun, atmakaraka, mahadasha).`;
      try {
        // Build system prompt with facts at the BEGINNING (primacy effect)
        const systemContent = [
          factsReminder ? `AUTHORITATIVE FACTS — USE ONLY THESE VALUES:\n${factsReminder}` : '',
          systemPrompt,
          STRUCTURED_OUTPUT_ONLY_RULES,
          retryHint,
        ].filter(Boolean).join('\n\n');

        // Build user prompt with facts at the END (recency effect)
        const userContent = userPrompt + (factsReminder ? `\n\n---\n${factsReminder}` : '');

        const res = await passClient.client.callWithRetry({
          model,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userContent },
          ],
          max_tokens: maxTokens,
          temperature: attempt === 1 ? temperature : retryTemperature,
          timeout_ms: 300_000,
        });
        const validated = validateMarkdownDraft(res.content, firstHeader, authoritativeMoon, authoritativeFacts);
        if (!validated.issue) {
          await writeFile(cachePath, validated.content);
          console.log(`    ✓ ${label} ${res.latency_ms}ms · ${res.completion_tokens}tk · ${validated.content.length} chars`);
          return validated.content;
        }
        lastIssue = validated.issue;
        lastOutput = validated.content || res.content;
        console.log(`    ⚠ ${label} validation failed: ${lastIssue}`);
      } catch (err: any) {
        lastIssue = err?.message || String(err);
        console.log(`    ⚠ ${label} provider ${passClient.name} failed: ${lastIssue}`);
      }
    }
  }

  console.warn(`  ⚠ ${label} validation exhausted all retries — proceeding with last output despite: ${lastIssue}`);
  return lastOutput || '';
}

// ──────────────────────────────────────────────────────────────────────
// LAYERED ANNEALING PIPELINE (A/B test vs single-pass)
// 4-phase progressive cooling: creative → structural → numeric → dasha
// Each phase operates on the output of the previous one.
// ──────────────────────────────────────────────────────────────────────

interface AnnealingLayer {
  label: string;
  temperature: number;
  maxTokens: number;
  validate: (text: string, facts?: AuthoritativeFacts) => string | undefined;
  buildSystemPrompt: (facts: AuthoritativeFacts) => string;
  buildUserPrompt: (draft: string, facts: AuthoritativeFacts) => string;
}

/** Validate ONLY meta leakage + Moon pollution (creative layer) */
// ──────────────────────────────────────────────────────────────────────
// Build chart summary for prompts (digest of placements + Selemene)
// ──────────────────────────────────────────────────────────────────────

function buildChartSummary(cfg: RunConfig, selemene: SelemeneEngineOutput[]): any {
  const authoritativeMoon = resolveAuthoritativeMoon(selemene);
  const summary: any = {
    subject: cfg.subject,
    birth: `${cfg.birth_date} ${cfg.birth_time ?? ''} ${cfg.timezone ?? ''}`.trim(),
    birth_place: cfg.birth_place,
    lagna: cfg.lagna,
    atmakaraka: cfg.atmakaraka,
    placements: cfg.placements,
    birth_nakshatra: cfg.birth_nakshatra,    // hardened docx value
    authoritative_moon: authoritativeMoon,
    authoritative_constraints: authoritativeMoon
      ? [buildAuthoritativeMoonMandate(cfg.subject, authoritativeMoon)]
      : [],
    authoritative_facts: resolveAuthoritativeFacts(cfg, selemene),
    authoritative_facts_mandate: buildAuthoritativeFactsMandate(cfg.subject, resolveAuthoritativeFacts(cfg, selemene)),
  };
  // Hardened Reference Data principle: docx-supplied mahadasha wins.
  // Selemene mahadasha is used ONLY as fallback when docx doesn't provide it.
  if (cfg.mahadasha) {
    summary.mahadasha = cfg.mahadasha;
    summary._mahadasha_source = 'docx (hardened)';
  } else {
    const vim = selemene.find((o) => o.engine_id === 'vimshottari' && !o._error);
    const md = vim?.result?.current_period?.mahadasha;
    const next = vim?.result?.timeline?.mahadashas?.find((m: any) => new Date(m.start_date) > new Date(md?.end || 0));
    if (md && next) {
      summary.mahadasha = {
        current_lord: md.planet,
        current_ends_iso: md.end,
        next_lord: next.planet,
        next_starts_iso: next.start_date,
        next_duration_years: next.duration_years,
      };
      summary._mahadasha_source = 'selemene (no docx fallback)';
    }
  }
  // Engine witness prompts — included for LLM context but explicitly marked as engine output
  summary.engine_witness_prompts = selemene
    .filter((o) => !o._error && o.witness_prompt)
    .map((o) => ({ engine: o.engine_id, prompt: o.witness_prompt!.slice(0, 280), consciousness_level: o.consciousness_level }));
  return summary;
}

function buildEngineResultsForPrompts(selemene: SelemeneEngineOutput[]): any[] {
  return selemene.filter((o) => !o._error).map((o) => ({
    engine: o.engine_id.replace(/-/g, '_'),
    model: 'selemene-native-rust',
    output: {
      key_signal: o.witness_prompt?.slice(0, 200) || '',
      structural_facts: o.result ? Object.keys(o.result).slice(0, 6) : [],
      consciousness_level: o.consciousness_level,
      // Trim result to keep tokens manageable
      result_summary: JSON.stringify(o.result).slice(0, 800),
    },
  }));
}

// ──────────────────────────────────────────────────────────────────────
// Markdown chunking into 11-Part structure
// ──────────────────────────────────────────────────────────────────────

interface ReadingChunks {
  opening?: string;
  part1?: string; part2?: string; part3?: string; part4?: string;
  part5?: string; part6?: string; part7?: string; part8?: string;
  part9?: string; part10?: string; part11?: string;
}

const ROMAN_TO_NUM: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7,
  'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11,
};

function chunkMarkdown(md: string): ReadingChunks {
  const chunks: ReadingChunks = {};
  const sections = ('\n' + md).split(/\n## /);
  for (let i = 1; i < sections.length; i++) {
    const block = sections[i];
    const head = block.split('\n')[0];
    const body = '## ' + block;
    if (/^opening/i.test(head)) chunks.opening = body;
    else {
      const m = head.match(/^Part\s+([IVX]+)/i);
      if (m) {
        const n = ROMAN_TO_NUM[m[1].toUpperCase()];
        if (n) chunks[`part${n}` as keyof ReadingChunks] = body;
      }
    }
  }
  return chunks;
}

// ──────────────────────────────────────────────────────────────────────
// Part metadata
// ──────────────────────────────────────────────────────────────────────

const PART_META = [
  { num: 1,  roman: 'I',    title: 'The Convergence Map',           subtitle: 'Where five systems agree — the bedrock of the chart.' },
  { num: 2,  roman: 'II',   title: 'The Vedic Foundation',          subtitle: 'Sign by sign, house by house, the substrate everything stands on.' },
  { num: 3,  roman: 'III',  title: 'The Karmic Architecture',       subtitle: 'Where the soul came from, where it is going, what repeats until transmuted.' },
  { num: 4,  roman: 'IV',   title: 'Career & Dharma',               subtitle: 'The work the body is built to author at world-scale.' },
  { num: 5,  roman: 'V',    title: 'Wealth & Money',                subtitle: 'How resources flow when dharma flows.' },
  { num: 6,  roman: 'VI',   title: 'Love, Marriage, Spouse',        subtitle: 'The partnership the chart is structurally configured for.' },
  { num: 7,  roman: 'VII',  title: 'Health & Energy Body',          subtitle: 'Constitution, sensitivities, practices the body is wired for.' },
  { num: 8,  roman: 'VIII', title: 'Family, Roots, Soul Lineage',   subtitle: 'Mother, father, lineage karma, the modes of growth the chart supports.' },
  { num: 9,  roman: 'IX',   title: 'The Master Timeline',           subtitle: 'When the dasha cycles open, when the karmic load shifts.' },
  { num: 10, roman: 'X',    title: 'Practices & Anti-Dependency',   subtitle: 'What the system makes you no longer need.' },
  { num: 11, roman: 'XI',   title: 'Final Synthesis',               subtitle: 'The whole chart compressed. The lesson. The one practice that ties it together.' },
];

// ──────────────────────────────────────────────────────────────────────
// HTML body assembly (mirrors render-from-docx pattern)
// ──────────────────────────────────────────────────────────────────────

function assembleBody(chunks: ReadingChunks, cfg: RunConfig, selemene: SelemeneEngineOutput[]): string {
  let body = '';

  if (chunks.opening) {
    body += `<section class="opening">${mdToHtml(chunks.opening)}</section>`;
  }

  // Build SVGs — all data-driven
  const hasPlacements = cfg.placements && cfg.placements.length > 0;
  const hasSelemene = selemene.some((o) => !o._error);

  // Hardened Reference Data principle: use docx mahadasha for rendering if present.
  // Fall back to Selemene only when no docx truth is supplied.
  const vim = selemene.find((o) => o.engine_id === 'vimshottari');
  const selemeneMd = vim ? toMahadashaInput(vim) : undefined;
  const mdData = cfg.mahadasha
    ? { ...cfg.mahadasha, next_duration_years: cfg.mahadasha.next_duration_years ?? 0 }
    : selemeneMd;
  const pbData = hasPlacements ? computePanchaBhuta(cfg.placements) : undefined;
  const hasPb = pbData && Object.values(pbData).some((v) => v > 0);

  const kundali = hasPlacements ? renderKundaliChart({
    lagna: cfg.lagna,
    placements: cfg.placements as any,
    atmakaraka: cfg.atmakaraka,
    subject_name: cfg.subject,
  }, { width: 480 }) : '';
  const dashaTimeline = mdData ? renderMahadashaTimeline(mdData, { width: 720 }) : '';
  const panchaBhuta = hasPb ? renderPanchaBhuta(pbData!, { width: 420 }) : '';
  const selemeneWheel = hasSelemene ? renderSelemeneWheel(toWheelInputs(selemene), { width: 540 }) : '';
  const koshaMandala = hasSelemene ? renderKoshaStack({
    width: 420,
    subject: cfg.subject,
    intensities: toKoshaLayerSignals(selemene),
  }) : '';

  // Part I + Selemene wheel
  body += renderPart(1, 'I', PART_META[0].title, PART_META[0].subtitle, mdToHtml(chunks.part1 || ''));
  if (selemeneWheel) {
    const okCount = selemene.filter((o) => !o._error).length;
    body += renderViz('The Sixteen-Engine Convergence', selemeneWheel,
      `Live Selemene output, ${okCount} of 16 engines returned real chart calculations. Spoke length encodes signal strength from each engine; color names the Kosha layer it serves.`);
  }

  // Part II + Kundali + Pancha Bhuta
  body += renderPart(2, 'II', PART_META[1].title, PART_META[1].subtitle, mdToHtml(chunks.part2 || ''));
  if (kundali) body += renderViz('Vedic D-1 · Rashi Chart', kundali, 'South Indian-style natal chart. Lagna tinted gold. Atmakaraka — soul-significator — carries a gold dot.');
  if (panchaBhuta) body += renderViz('Pancha Bhuta · Five-Element Distribution', panchaBhuta, "The chart's elemental signature, counted from actual placements.");

  body += renderPart(3, 'III', PART_META[2].title, PART_META[2].subtitle, mdToHtml(chunks.part3 || ''));
  body += renderPart(4, 'IV', PART_META[3].title, PART_META[3].subtitle, mdToHtml(chunks.part4 || ''));
  body += renderPart(5, 'V', PART_META[4].title, PART_META[4].subtitle, mdToHtml(chunks.part5 || ''));
  body += renderPart(6, 'VI', PART_META[5].title, PART_META[5].subtitle, mdToHtml(chunks.part6 || ''));

  // Part VII + Kosha mandala
  body += renderPart(7, 'VII', PART_META[6].title, PART_META[6].subtitle, mdToHtml(chunks.part7 || ''));
  if (koshaMandala) body += renderViz('Five-Layer Stack · Kosha Mandala', koshaMandala,
    "Five algebraic layers of consciousness rendered concentrically. Each ring's stroke + fill is driven by the average signal of engines routing to that layer (engine-count + intensity-% badge on each ring).");

  body += renderPart(8, 'VIII', PART_META[7].title, PART_META[7].subtitle, mdToHtml(chunks.part8 || ''));

  // Part IX + Mahadasha
  body += renderPart(9, 'IX', PART_META[8].title, PART_META[8].subtitle, mdToHtml(chunks.part9 || ''));
  if (dashaTimeline) body += renderViz('Mahadasha Timeline', dashaTimeline,
    'Real Vimshottari from Swiss Ephemeris. The closing dasha hands over to the opening dasha at the gold-arrow pivot.');

  body += renderPart(10, 'X', PART_META[9].title, PART_META[9].subtitle, mdToHtml(chunks.part10 || ''));
  body += renderPart(11, 'XI', PART_META[10].title, PART_META[10].subtitle, mdToHtml(chunks.part11 || ''));

  return body;
}

// ──────────────────────────────────────────────────────────────────────
// PDF export via Chrome headless
// ──────────────────────────────────────────────────────────────────────

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
function exportPDF(htmlPath: string, pdfPath: string): boolean {
  if (!existsSync(CHROME_BIN)) return false;
  try {
    execSync(`"${CHROME_BIN}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf-no-header --print-to-pdf="${pdfPath}" --virtual-time-budget=10000 --hide-scrollbars "file://${htmlPath}"`,
      { stdio: 'pipe', timeout: 90_000 });
    return existsSync(pdfPath);
  } catch (err: any) {
    console.warn(`  ⚠ PDF: ${err.message.slice(0, 100)}`);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Main pipeline
// ──────────────────────────────────────────────────────────────────────

async function main() {
  const configPath = process.argv[2];
  if (!configPath) { console.error('Usage: integratedreading-full.ts <config.json>'); process.exit(1); }
  const cfg: RunConfig = JSON.parse(await readFile(configPath, 'utf-8'));
  const useCache = process.argv.includes('--use-cache');

  console.log('═══ integratedreading-full ═══');
  console.log(`  Subject: ${cfg.subject}`);
  console.log(`  Birth:   ${cfg.birth_date} ${cfg.birth_time ?? ''} (${cfg.timezone ?? 'IST'})`);
  console.log(`  Output:  ${cfg.output_dir}`);

  await mkdir(cfg.output_dir, { recursive: true });
  const slug = cfg.subject.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  // Cache-aware run-dir: shared helper from autoresearch-integratedreading/defaults.ts.
  // Reuses most recent prior ts-shaped subdir when --use-cache; otherwise fresh ts dir.
  const { runDir, reusedPrior } = findOrCreateCachedRunDir({
    outputDir: cfg.output_dir,
    freshTs: ts,
    useCache,
  });
  if (reusedPrior) console.log(`  ↻ Reusing prior run dir for --use-cache`);
  console.log(`  Run:     ${runDir}`);

  // LlmClient pulls NVIDIA_API_KEY + OPENROUTER_API_KEY itself; we still call
  // loadNvidiaKey() for the existing preflight log line but no longer require it.
  try { loadNvidiaKey(); } catch { /* allow OpenRouter-only runs */ }
  const nvidia = new NvidiaClient();
  const avail = (nvidia as any).availability;
  const fallbackClients: PassClientOption[] = [];
  if (avail.openrouter) fallbackClients.push({ name: 'openrouter', client: new NvidiaClient({ provider: 'openrouter', quiet: true }) });
  if (avail.nim) fallbackClients.push({ name: 'nim', client: new NvidiaClient({ provider: 'nim', quiet: true }) });
  console.log(`  ✓ LlmClient: nim=${avail.nim} ollama=${avail.ollama} openrouter=${avail.openrouter} mode=${avail.selected}`);

  // ── Phase 1: Fetch Selemene (real chart data) ───────────────────
  const selemeneCachePath = join(runDir, `01_selemene_${slug}.json`);
  let selemene: SelemeneEngineOutput[];
  if (useCache && existsSync(selemeneCachePath)) {
    selemene = JSON.parse(await readFile(selemeneCachePath, 'utf-8'));
    console.log(`  ✓ Selemene cached (${selemene.length} engines)`);
  } else {
    const selemeneKey = await loadSelemeneKey();
    if (!selemeneKey) throw new Error('SELEMENE_API_KEY not found');
    console.log(`  → Fetching Selemene 16 engines (parallel)...`);
    const t0 = Date.now();
    selemene = await fetchAllEngines({
      date: cfg.birth_date,
      time: cfg.birth_time,
      timezone: cfg.timezone ?? 'Asia/Kolkata',
      latitude: cfg.latitude,
      longitude: cfg.longitude,
      name: cfg.subject,
    }, { api_key: selemeneKey });
    const ok = selemene.filter((o) => !o._error).length;
    console.log(`    ✓ ${ok}/16 engines · ${Date.now() - t0}ms`);
    await writeFile(selemeneCachePath, JSON.stringify(selemene, null, 2));
  }

  // ── Drift report: compare DOCX-hardened values vs Selemene under-test ──
  // DOCX is truth. Selemene is the system under test. Drift is calibration signal,
  // not a reason to overwrite the rendered reading.
  if (cfg.mahadasha || cfg.birth_nakshatra) {
    const reference: HardenedReference = {
      subject: cfg.subject,
      lagna: cfg.lagna,
      atmakaraka: cfg.atmakaraka,
      birth_nakshatra: cfg.birth_nakshatra,
      mahadasha: cfg.mahadasha,
    };
    const drift = computeDriftReport(reference, selemene);
    const driftPath = join(runDir, `00_drift_${slug}.md`);
    await writeFile(driftPath, formatDriftReportMarkdown(drift));
    const symbol = drift.summary.critical > 0 ? '✗' : drift.summary.major > 0 ? '⚠⚠' : drift.summary.minor > 0 ? '⚠' : '✓';
    console.log(`  ${symbol} Drift: aligned=${drift.summary.aligned} minor=${drift.summary.minor} major=${drift.summary.major} critical=${drift.summary.critical}`);
    console.log(`     ↳ ${basename(driftPath)}`);
  }

  // ── Build chart summary + engine results for NVIDIA prompts ─────
  const chartSummary = buildChartSummary(cfg, selemene);
  const engineResults = buildEngineResultsForPrompts(selemene);
  const authoritativeMoonMandate = buildAuthoritativeMoonMandate(cfg.subject, chartSummary.authoritative_moon);
  const factsMandate = chartSummary.authoritative_facts_mandate || '';
  const af = chartSummary.authoritative_facts || {};
  const extra = [
    af.human_design ? 'hd' : '',
    af.gene_keys ? 'gk' : '',
    af.numerology ? 'num' : '',
    af.vimshottari ? 'vim' : '',
  ].filter(Boolean).join('+');
  console.log(`  ✓ Authoritative facts: lagna=${af.lagna || 'n/a'} moon=${af.moon?.rashi || 'n/a'} sun=${af.sun?.rashi || 'n/a'} ak=${af.atmakaraka || 'n/a'} md=${af.current_mahadasha || 'n/a'}${extra ? ' +'+extra : ''}`);

  // ── Phase 2 + 3 (parallel): Aletheios + Pichet pillars ─────────
  const aletheiosCachePath = join(runDir, `04_aletheios_${slug}.md`);
  const pichetCachePath = join(runDir, `05_pichet_${slug}.md`);
  let aletheios: string, pichet: string;
  if (useCache && existsSync(aletheiosCachePath) && existsSync(pichetCachePath)) {
    const cachedAletheios = await readFile(aletheiosCachePath, 'utf-8');
    const cachedPichet = await readFile(pichetCachePath, 'utf-8');
    const validAletheios = validateMarkdownDraft(cachedAletheios, `## Aletheios — Structural-Pattern Witness for ${cfg.subject}`, chartSummary.authoritative_moon, chartSummary.authoritative_facts);
    const validPichet = validateMarkdownDraft(cachedPichet, `## Pichet — Embodied Reading for ${cfg.subject}`, chartSummary.authoritative_moon, chartSummary.authoritative_facts);
    if (!validAletheios.issue && !validPichet.issue) {
      aletheios = validAletheios.content;
      pichet = validPichet.content;
      console.log(`  ✓ Pillars cached`);
    } else {
      console.log(`  ⚠ Pillar cache invalid; regenerating`);
      aletheios = '';
      pichet = '';
    }
  } else {
    aletheios = '';
    pichet = '';
  }
  if (!aletheios || !pichet) {
    console.log(`  → Running Aletheios + Pichet pillars (gpt-oss-120b, parallel)...`);
    [aletheios, pichet] = await Promise.all([
      generateMarkdownPass({
        label: 'Aletheios',
        firstHeader: `## Aletheios — Structural-Pattern Witness for ${cfg.subject}`,
        cachePath: aletheiosCachePath,
        useCache,
        model: MODELS.GPT_OSS_120B,
        client: nvidia,
        systemPrompt: [ANATOMIST_PERSONA, KOSHA_GRAMMAR, authoritativeMoonMandate, factsMandate, 'ROLE: Aletheios. Pillar function: structural-pattern witness.'].filter(Boolean).join('\n\n'),
        userPrompt: aletheiosPillarPrompt(cfg.subject, engineResults, chartSummary),
        authoritativeMoon: chartSummary.authoritative_moon,
        authoritativeFacts: chartSummary.authoritative_facts,
        maxTokens: 4096,
        temperature: 0.4,
        fallbackClients,
      }),
      generateMarkdownPass({
        label: 'Pichet',
        firstHeader: `## Pichet — Embodied Reading for ${cfg.subject}`,
        cachePath: pichetCachePath,
        useCache,
        model: MODELS.GPT_OSS_120B,
        client: nvidia,
        systemPrompt: [ANATOMIST_PERSONA, KOSHA_GRAMMAR, authoritativeMoonMandate, factsMandate, 'ROLE: Pichet. Pillar function: embodied-felt witness.'].filter(Boolean).join('\n\n'),
        userPrompt: pichetPillarPrompt(cfg.subject, engineResults, chartSummary),
        authoritativeMoon: chartSummary.authoritative_moon,
        authoritativeFacts: chartSummary.authoritative_facts,
        maxTokens: 4096,
        temperature: 0.6,
        fallbackClients,
      }),
    ]);
  }

  // ── Phase 4-6: Three-pass synthesis (gpt-oss-120b) ─────────────────
  // 3-pass split: Opening + Parts I-IV (A), Parts V-VIII (B), Parts IX-XI (C)
  // Target: 12,500+ words combined. Replaces prior two-pass.
  const synthACachePath = join(runDir, `06a_synthesis_${slug}.md`);
  const synthBCachePath = join(runDir, `06b_synthesis_${slug}.md`);
  const synthCCachePath = join(runDir, `06c_synthesis_${slug}.md`);
  let passA: string, passB: string, passC: string;
  // Select best available model: OpenAI GPT-4o/4.5 → NIM gpt-oss-120b
  const avail = (nvidia as any).availability || {};
  const SYNTH_MODEL = avail.openai ? 'gpt-4o' : MODELS.GPT_OSS_120B;
  console.log(`  → Synthesis model: ${SYNTH_MODEL} (openai=${avail.openai}, nim=${avail.nim})`);
  
  // CRITICAL: factsMandate FIRST so LLM sees authoritative facts before persona/grammar
  const synthesisSystemPrompt = [factsMandate, authoritativeMoonMandate, ANATOMIST_PERSONA, KOSHA_GRAMMAR, DYADIC_LOOP].filter(Boolean).join('\n\n');

  // ── Phase 4-6: Three-pass synthesis with per-pass temperature annealing ─────────────────
  // A/B-tested architecture (default since 2026-06-06):
  //   Pass A (Identity/Structure): T=0.35 — creative + structural facts
  //   Pass B (Wealth/Career/Love): T=0.25 — mixed structural + numeric
  //   Pass C (Timeline/Dasha):     T=0.15 — dasha triple + numeric heavy
  // Lower T in later passes suppresses hallucination of harder constraints
  // without sacrificing creative voice in early passes.
  const synthTemps = { A: { temp: 0.35, retry: 0.25 }, B: { temp: 0.25, retry: 0.15 }, C: { temp: 0.15, retry: 0.08 } };

  console.log(`  → Synthesis Pass A — Opening + Parts I-IV (gpt-oss-120b, T=${synthTemps.A.temp})...`);
  passA = await generateMarkdownPass({
    label: 'Pass A',
    firstHeader: `# Integrated Reading — ${cfg.subject}`,
    cachePath: synthACachePath,
    useCache,
    model: SYNTH_MODEL,
    client: nvidia,
    systemPrompt: synthesisSystemPrompt,
    userPrompt: synthesisPromptA(cfg.subject, aletheios, pichet, chartSummary, {}),
    authoritativeMoon: chartSummary.authoritative_moon,
    authoritativeFacts: chartSummary.authoritative_facts,
    temperature: synthTemps.A.temp,
    retryTemperature: synthTemps.A.retry,
    fallbackClients,
  });
  console.log(`  → Synthesis Pass B — Parts V-VIII (gpt-oss-120b, T=${synthTemps.B.temp})...`);
  passB = await generateMarkdownPass({
    label: 'Pass B',
    firstHeader: '## Part V — Wealth & Money',
    cachePath: synthBCachePath,
    useCache,
    model: SYNTH_MODEL,
    client: nvidia,
    systemPrompt: synthesisSystemPrompt,
    userPrompt: synthesisPromptB(cfg.subject, aletheios, pichet, chartSummary, {}, passA),
    authoritativeMoon: chartSummary.authoritative_moon,
    authoritativeFacts: chartSummary.authoritative_facts,
    temperature: synthTemps.B.temp,
    retryTemperature: synthTemps.B.retry,
    fallbackClients,
  });
  console.log(`  → Synthesis Pass C — Parts IX-XI (gpt-oss-120b, T=${synthTemps.C.temp})...`);
  passC = await generateMarkdownPass({
    label: 'Pass C',
    firstHeader: '## Part IX — The Master Timeline',
    cachePath: synthCCachePath,
    useCache,
    model: SYNTH_MODEL,
    client: nvidia,
    systemPrompt: synthesisSystemPrompt,
    userPrompt: synthesisPromptC(cfg.subject, aletheios, pichet, chartSummary, {}, passA, passB),
    authoritativeMoon: chartSummary.authoritative_moon,
    authoritativeFacts: chartSummary.authoritative_facts,
    temperature: synthTemps.C.temp,
    retryTemperature: synthTemps.C.retry,
    fallbackClients,
  });
  const fullSynthesis = passA.trimEnd() + '\n\n' + passB.trim() + '\n\n' + passC.trimStart();
  await writeFile(join(runDir, `06_synthesis_${slug}.md`), fullSynthesis);
  const wordCount = fullSynthesis.split(/\s+/).filter(Boolean).length;
  console.log(`  ✓ Combined synthesis: ${wordCount.toLocaleString()} words (target 12,500+)`);

  // ── Phase 6: Chunk + render HTML ────────────────────────────────
  const chunks = chunkMarkdown(fullSynthesis);
  const partsFound = Object.keys(chunks).filter((k) => chunks[k as keyof ReadingChunks]).length;
  console.log(`  ✓ Chunked into ${partsFound} sections`);

  const hasPlacements = cfg.placements && cfg.placements.length > 0;
  const coverSVG = hasPlacements ? renderKundaliChart({
    lagna: cfg.lagna,
    placements: cfg.placements as any,
    atmakaraka: cfg.atmakaraka,
    subject_name: cfg.subject,
  }, { width: 440 }) : undefined;

  const body = assembleBody(chunks, cfg, selemene);
  const html = renderHTMLPage({
    title: `Integrated Reading — ${cfg.subject}`,
    cover: {
      subject: cfg.subject,
      birth_date: cfg.birth_date,
      birth_time: cfg.birth_time,
      birth_place: cfg.birth_place,
      cover_mandala_svg: coverSVG,
    },
    body,
  });

  const htmlPath = join(cfg.output_dir, `${slug}-reading.html`);
  await writeFile(htmlPath, html);
  console.log(`  ✓ HTML → ${basename(htmlPath)} (${(html.length / 1024).toFixed(1)} KB)`);

  // ── Phase 7: PDF export ─────────────────────────────────────────
  if (cfg.pdf !== false) {
    const pdfPath = htmlPath.replace(/\.html$/, '.pdf');
    if (exportPDF(htmlPath, pdfPath)) {
      console.log(`  ✓ PDF  → ${basename(pdfPath)}`);
    }
  }

  console.log('\n═══ COMPLETE ═══');
  console.log(`  Word count: ${wordCount.toLocaleString()} (target 12,500+)`);
  console.log(`  Run dir:    ${runDir}`);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
