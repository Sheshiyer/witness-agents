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
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';

import { NvidiaClient, MODELS } from './integratedreading/nvidia-client.js';
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

// ──────────────────────────────────────────────────────────────────────
// Build chart summary for prompts (digest of placements + Selemene)
// ──────────────────────────────────────────────────────────────────────

function buildChartSummary(cfg: RunConfig, selemene: SelemeneEngineOutput[]): any {
  const summary: any = {
    subject: cfg.subject,
    birth: `${cfg.birth_date} ${cfg.birth_time ?? ''} ${cfg.timezone ?? ''}`.trim(),
    birth_place: cfg.birth_place,
    lagna: cfg.lagna,
    atmakaraka: cfg.atmakaraka,
    placements: cfg.placements,
    birth_nakshatra: cfg.birth_nakshatra,    // hardened docx value
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
  const slug = cfg.subject.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = join(cfg.output_dir, '.runs', useCache ? (readdirSync(join(cfg.output_dir, '.runs') || '.').sort().pop() || ts) : ts);
  await mkdir(runDir, { recursive: true });
  console.log(`  Run:     ${runDir}`);

  const nvidiaKey = loadNvidiaKey();
  const nvidia = new NvidiaClient(nvidiaKey);

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

  // ── Phase 2 + 3 (parallel): Aletheios + Pichet pillars ─────────
  const aletheiosCachePath = join(runDir, `04_aletheios_${slug}.md`);
  const pichetCachePath = join(runDir, `05_pichet_${slug}.md`);
  let aletheios: string, pichet: string;
  if (useCache && existsSync(aletheiosCachePath) && existsSync(pichetCachePath)) {
    aletheios = await readFile(aletheiosCachePath, 'utf-8');
    pichet = await readFile(pichetCachePath, 'utf-8');
    console.log(`  ✓ Pillars cached`);
  } else {
    console.log(`  → Running Aletheios + Pichet pillars (gpt-oss-120b, parallel)...`);
    const [aRes, pRes] = await Promise.all([
      nvidia.callWithRetry({
        model: MODELS.GPT_OSS_120B,
        messages: [
          { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\nROLE: Aletheios. Pillar function: structural-pattern witness.' },
          { role: 'user', content: aletheiosPillarPrompt(cfg.subject, engineResults, chartSummary) },
        ],
        max_tokens: 4096, temperature: 0.4, timeout_ms: 240_000,
      }),
      nvidia.callWithRetry({
        model: MODELS.GPT_OSS_120B,
        messages: [
          { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\nROLE: Pichet. Pillar function: embodied-felt witness.' },
          { role: 'user', content: pichetPillarPrompt(cfg.subject, engineResults, chartSummary) },
        ],
        max_tokens: 4096, temperature: 0.6, timeout_ms: 240_000,
      }),
    ]);
    aletheios = aRes.content;
    pichet = pRes.content;
    await writeFile(aletheiosCachePath, aletheios);
    await writeFile(pichetCachePath, pichet);
    console.log(`    ✓ Aletheios ${aRes.latency_ms}ms · Pichet ${pRes.latency_ms}ms`);
  }

  // ── Phase 4-6: Three-pass synthesis (gpt-oss-120b) ─────────────────
  // 3-pass split: Opening + Parts I-IV (A), Parts V-VIII (B), Parts IX-XI (C)
  // Target: 12,500+ words combined. Replaces prior two-pass.
  const synthACachePath = join(runDir, `06a_synthesis_${slug}.md`);
  const synthBCachePath = join(runDir, `06b_synthesis_${slug}.md`);
  const synthCCachePath = join(runDir, `06c_synthesis_${slug}.md`);
  let passA: string, passB: string, passC: string;
  const SYNTH_MODEL = MODELS.GPT_OSS_120B;

  if (useCache && existsSync(synthACachePath)) {
    passA = await readFile(synthACachePath, 'utf-8');
    console.log(`  ✓ Synthesis Pass A cached (${(passA.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`  → Synthesis Pass A — Opening + Parts I-IV (gpt-oss-120b)...`);
    const aRes = await nvidia.callWithRetry({
      model: SYNTH_MODEL,
      messages: [
        { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
        { role: 'user', content: synthesisPromptA(cfg.subject, aletheios, pichet, chartSummary, {}) },
      ],
      max_tokens: 8192, temperature: 0.5, timeout_ms: 300_000,
    });
    passA = aRes.content;
    await writeFile(synthACachePath, passA);
    console.log(`    ✓ Pass A ${aRes.latency_ms}ms · ${aRes.completion_tokens}tk · ${passA.length} chars`);
  }
  if (useCache && existsSync(synthBCachePath)) {
    passB = await readFile(synthBCachePath, 'utf-8');
    console.log(`  ✓ Synthesis Pass B cached (${(passB.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`  → Synthesis Pass B — Parts V-VIII (gpt-oss-120b)...`);
    const bRes = await nvidia.callWithRetry({
      model: SYNTH_MODEL,
      messages: [
        { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
        { role: 'user', content: synthesisPromptB(cfg.subject, aletheios, pichet, chartSummary, {}, passA) },
      ],
      max_tokens: 8192, temperature: 0.5, timeout_ms: 300_000,
    });
    passB = bRes.content;
    await writeFile(synthBCachePath, passB);
    console.log(`    ✓ Pass B ${bRes.latency_ms}ms · ${bRes.completion_tokens}tk · ${passB.length} chars`);
  }
  if (useCache && existsSync(synthCCachePath)) {
    passC = await readFile(synthCCachePath, 'utf-8');
    console.log(`  ✓ Synthesis Pass C cached (${(passC.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`  → Synthesis Pass C — Parts IX-XI (gpt-oss-120b)...`);
    const cRes = await nvidia.callWithRetry({
      model: SYNTH_MODEL,
      messages: [
        { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
        { role: 'user', content: synthesisPromptC(cfg.subject, aletheios, pichet, chartSummary, {}, passA, passB) },
      ],
      max_tokens: 8192, temperature: 0.5, timeout_ms: 300_000,
    });
    passC = cRes.content;
    await writeFile(synthCCachePath, passC);
    console.log(`    ✓ Pass C ${cRes.latency_ms}ms · ${cRes.completion_tokens}tk · ${passC.length} chars`);
  }
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
