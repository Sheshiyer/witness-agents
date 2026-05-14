// ─── /integratedreading — Multi-Model NVIDIA Runner ─────────────────
// The orchestrator. Wires nvidia-client + system-prompts + stitcher into
// the 10-phase workflow. Re-runnable per-subject; dyadic when 2 subjects.
//
// Usage:
//   node --import tsx scripts/integratedreading.ts <config.json>
//
// Env:
//   NVIDIA_API_KEY (required; auto-loads from ~/.claude/.env if not set)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename, resolve } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import { NvidiaClient, MODELS, type ChatMessage } from './integratedreading/nvidia-client.js';
import {
  ANATOMIST_PERSONA,
  KOSHA_GRAMMAR,
  DYADIC_LOOP,
  ingestionPrompt,
  astroMathPrompt,
  engineMicroReadingPrompt,
  aletheiosPillarPrompt,
  pichetPillarPrompt,
  synthesisPrompt,
  chunkingPrompt,
  compositePrompt,
  adversarialReviewPrompt,
} from './integratedreading/system-prompts.js';
import {
  stitchSoloReading,
  stitchCompositeReading,
  type ReadingChunks,
} from './integratedreading/stitcher.js';

// ──────────────────────────────────────────────────────────────────────
// Config + Env
// ──────────────────────────────────────────────────────────────────────

interface SubjectConfig {
  name: string;
  birth_date: string;
  birth_time: string;
  timezone: string;
  latitude: number;
  longitude: number;
  source_reading_path?: string;
  chart_summary?: Record<string, any>;
}

interface RunConfig {
  subjects: SubjectConfig[];
  output_dir: string;
  depth?: 'free' | 'subscriber' | 'enterprise' | 'initiate';
  resume_from?: 'ingestion' | 'astro' | 'engines' | 'pillars' | 'synthesis' | 'chunking' | 'composite' | 'stitch';
}

function loadEnv(): void {
  if (process.env.NVIDIA_API_KEY) return;
  const candidates = [
    join(homedir(), '.claude', '.env'),
    join(homedir(), '.env'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const txt = readFileSync(p, 'utf-8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (!m) continue;
      const k = m[1];
      const v = m[2].replace(/^["']|["']$/g, '');
      if (!process.env[k] && (k === 'NVIDIA_API_KEY' || k === 'OPENROUTER_API_KEY')) {
        process.env[k] = v;
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Phase helpers
// ──────────────────────────────────────────────────────────────────────

function tryParseJSON(text: string): any {
  // Extract JSON from ```json fences or between first { and matching }
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // Find first { and last }
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i < 0 || j <= i) return { _raw: text };
  try {
    return JSON.parse(s.slice(i, j + 1));
  } catch {
    return { _raw: text };
  }
}

async function extractDocxToText(path: string): Promise<string> {
  if (!existsSync(path)) {
    console.warn(`  ⚠ source reading not found: ${path}`);
    return '';
  }
  const ext = path.toLowerCase().split('.').pop();
  if (ext === 'md' || ext === 'txt') return await readFile(path, 'utf-8');
  if (ext === 'docx') {
    try {
      const tmpFile = `/tmp/integratedreading-${Date.now()}.md`;
      execSync(`pandoc -f docx -t markdown "${path}" -o "${tmpFile}"`);
      const txt = await readFile(tmpFile, 'utf-8');
      return txt;
    } catch (err: any) {
      console.error(`  ✗ pandoc failed for ${path}: ${err.message}`);
      return '';
    }
  }
  return '';
}

// Per-engine routing table (mirrors SKILL.md)
const ENGINE_MODELS: Record<string, string> = {
  vimshottari:     MODELS.GPT_OSS_120B,
  human_design:    MODELS.GPT_OSS_120B,
  gene_keys:       MODELS.KIMI_K2,
  tarot:           MODELS.KIMI_K2,
  numerology:      MODELS.GPT_OSS_20B,
  biorhythm:       MODELS.GPT_OSS_20B,
  vedic_yogas:     MODELS.GLM_47,        // GLM gets the math/sidereal yoga work
  western_tropical: MODELS.GPT_OSS_20B,
  panchanga:       MODELS.GPT_OSS_120B,
  biofield:        MODELS.KIMI_K2,
  face_reading:    MODELS.GPT_OSS_20B,
  nadabrahman:     MODELS.KIMI_K2,
  i_ching:         MODELS.GPT_OSS_120B,
  enneagram:       MODELS.GPT_OSS_120B,
  sacred_geometry: MODELS.NEMOTRON_120B,
  sigil_forge:     MODELS.KIMI_K2,
};

const ENGINE_LIST = Object.keys(ENGINE_MODELS);

function buildEngineInput(engine: string, ingestion: any, astroMath: any): any {
  // Slice the relevant data for each engine — keeps prompts focused.
  const base = {
    birth_data: ingestion.birth_data,
    key_facts: ingestion.key_facts,
  };
  switch (engine) {
    case 'vimshottari':
      return { ...base, mahadasha: ingestion.mahadasha, antardasha_first_24mo: astroMath.antardasha_first_24mo };
    case 'human_design':
      return { ...base, human_design: ingestion.human_design };
    case 'gene_keys':
      return { ...base, gene_keys: ingestion.gene_keys };
    case 'tarot':
      return { ...base, vedic: ingestion.vedic, gene_keys: ingestion.gene_keys, atmakaraka_dignity: astroMath.atmakaraka_dignity };
    case 'numerology':
      return { ...base, vedic_lagna: ingestion.vedic?.lagna };
    case 'biorhythm':
      return { ...base };
    case 'vedic_yogas':
      return { ...base, vedic: ingestion.vedic, atmakaraka_dignity: astroMath.atmakaraka_dignity };
    case 'western_tropical':
      return { ...base, western: ingestion.western };
    case 'panchanga':
      return { ...base, panchanga_at_md_transition: astroMath.panchanga_at_md_transition };
    case 'biofield':
      return { ...base, vedic: ingestion.vedic, human_design: ingestion.human_design };
    case 'face_reading':
      return { ...base, vedic_lagna: ingestion.vedic?.lagna };
    case 'nadabrahman':
      return { ...base, vedic: { lagna: ingestion.vedic?.lagna, moon: ingestion.vedic?.moon_rashi } };
    case 'i_ching':
      return { ...base, gene_keys: ingestion.gene_keys, mahadasha: ingestion.mahadasha };
    case 'enneagram':
      return { ...base, vedic: ingestion.vedic, human_design: ingestion.human_design };
    case 'sacred_geometry':
      return { ...base, pancha_bhuta: astroMath.pancha_bhuta_distribution };
    case 'sigil_forge':
      return { ...base, atmakaraka: ingestion.vedic?.atmakaraka };
    default:
      return base;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Main orchestrator
// ──────────────────────────────────────────────────────────────────────

async function processSubject(
  client: NvidiaClient,
  subject: SubjectConfig,
  runDir: string,
  partnerIngestion?: any,
): Promise<{ ingestion: any; astroMath: any; synthesis: string; chunks: ReadingChunks }> {
  const slug = subject.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  console.log(`\n═══ SUBJECT: ${subject.name} ═══`);

  // ── Phase 1: Ingestion ─────────────────────────────────────────────
  console.log('  [1/7] Ingestion (gpt-oss-120b)...');
  let sourceText = '';
  if (subject.source_reading_path) {
    sourceText = await extractDocxToText(subject.source_reading_path);
  }
  if (subject.chart_summary) {
    sourceText += '\n\n## Pre-extracted chart summary\n```json\n' + JSON.stringify(subject.chart_summary, null, 2) + '\n```\n';
  }
  if (!sourceText.trim()) {
    sourceText = `Birth: ${subject.birth_date} ${subject.birth_time} ${subject.timezone}, lat=${subject.latitude}, lon=${subject.longitude}. (No source reading provided — synthesize from birth data alone.)`;
  }

  const ingestionRes = await client.callWithRetry({
    model: MODELS.GPT_OSS_120B,
    messages: [
      { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR },
      { role: 'user', content: ingestionPrompt(subject.name, sourceText.slice(0, 60_000)) },
    ],
    max_tokens: 3500,
    temperature: 0.2,
  });
  const ingestion = tryParseJSON(ingestionRes.content);
  await writeFile(join(runDir, `01_ingestion_${slug}.json`), JSON.stringify(ingestion, null, 2));
  console.log(`        ✓ ${ingestionRes.latency_ms}ms · ${ingestionRes.completion_tokens}tk`);

  // ── Phase 2: Astro math ────────────────────────────────────────────
  // Production lesson 2026-05-10: GLM-4.7 had 100% failure rate for one subject
  // (10 timeouts across primary + alias retry chains, ~12 min wasted).
  // New chain: GLM-4.7 best-effort (60s timeout) → gpt-oss-120b fallback.
  console.log('  [2/7] Astro/math (glm4.7 primary, gpt-oss-120b fallback, skip-on-fail)...');
  let astroRes: any;
  let astroMath: any = {};
  try {
    astroRes = await client.callWithRetry({
      model: MODELS.GLM_47,
      messages: [
        { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR },
        { role: 'user', content: astroMathPrompt(subject.name, ingestion, partnerIngestion) },
      ],
      max_tokens: 3000,
      temperature: 0.2,
      timeout_ms: 90_000,  // tight cap on GLM since it's flaky
    }, 1);
    astroMath = tryParseJSON(astroRes.content);
    console.log(`        ✓ glm4.7 ${astroRes.latency_ms}ms · ${astroRes.completion_tokens}tk`);
  } catch (err: any) {
    console.warn(`     ↳ glm4.7 failed (${err.message.slice(0,60)}), falling back to gpt-oss-120b...`);
    try {
      astroRes = await client.callWithRetry({
        model: MODELS.GPT_OSS_120B,
        messages: [
          { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR },
          { role: 'user', content: astroMathPrompt(subject.name, ingestion, partnerIngestion) },
        ],
        max_tokens: 3000,
        temperature: 0.2,
        timeout_ms: 180_000,
      }, 1);
      astroMath = tryParseJSON(astroRes.content);
      console.log(`        ✓ gpt-oss-120b fallback ${astroRes.latency_ms}ms · ${astroRes.completion_tokens}tk`);
    } catch (err2: any) {
      console.warn(`     ↳ gpt-oss-120b fallback also failed (${err2.message.slice(0,60)}), proceeding with empty astroMath`);
      astroMath = { _skipped: true, _reason: err2.message };
    }
  }
  await writeFile(join(runDir, `02_astro_${slug}.json`), JSON.stringify(astroMath, null, 2));

  // ── Phase 3: Per-engine micro-readings (parallel) ──────────────────
  console.log(`  [3/7] Per-engine micro-readings (16 parallel, mixed routing)...`);
  const enginePromises = ENGINE_LIST.map(async (engine) => {
    const model = ENGINE_MODELS[engine];
    const input = buildEngineInput(engine, ingestion, astroMath);
    try {
      const res = await client.callWithRetry({
        model,
        messages: [
          { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + DYADIC_LOOP },
          { role: 'user', content: engineMicroReadingPrompt(engine, subject.name, input) },
        ],
        max_tokens: 1024,
        temperature: 0.4,
      }, 1);
      const parsed = tryParseJSON(res.content);
      return { engine, model, output: parsed, latency_ms: res.latency_ms };
    } catch (err: any) {
      return { engine, model, output: { _error: err.message }, latency_ms: 0 };
    }
  });

  const engineResults = await Promise.all(enginePromises);
  await writeFile(join(runDir, `03_engines_${slug}.json`), JSON.stringify(engineResults, null, 2));
  const okEngines = engineResults.filter((r) => !r.output._error).length;
  const uniqueModels = Array.from(new Set(engineResults.map((r) => r.model.split('/')[1])));
  console.log(`        ✓ ${okEngines}/${ENGINE_LIST.length} engines · models=[${uniqueModels.join(', ')}]`);

  // ── Phase 4 + 5: Aletheios + Pichet pillars (parallel) ─────────────
  console.log('  [4-5/7] Aletheios + Pichet pillars (gpt-oss-120b parallel)...');
  const [aletheiosRes, pichetRes] = await Promise.all([
    client.callWithRetry({
      model: MODELS.GPT_OSS_120B,
      messages: [
        { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\nROLE: Aletheios. Pillar function: structural-pattern witness. Tone: analytical-precision, structural recognition. Etymology Aletheia (Gk) — unconcealment, truth-as-revealing.' },
        { role: 'user', content: aletheiosPillarPrompt(subject.name, engineResults, ingestion) },
      ],
      max_tokens: 4096,
      temperature: 0.4,
    }),
    client.callWithRetry({
      model: MODELS.GPT_OSS_120B,
      messages: [
        { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\nROLE: Pichet. Pillar function: embodied-felt witness. Tone: warmer register than Aletheios, somatic-rhythm-felt. Etymology Pichet (Thai) — victory through endurance.' },
        { role: 'user', content: pichetPillarPrompt(subject.name, engineResults, ingestion) },
      ],
      max_tokens: 4096,
      temperature: 0.6,
    }),
  ]);
  await writeFile(join(runDir, `04_aletheios_${slug}.md`), aletheiosRes.content);
  await writeFile(join(runDir, `05_pichet_${slug}.md`), pichetRes.content);
  console.log(`        ✓ Aletheios ${aletheiosRes.latency_ms}ms · Pichet ${pichetRes.latency_ms}ms`);

  // ── Phase 6: Synthesis (Kimi 0905) ─────────────────────────────────
  console.log('  [6/7] Synthesis (kimi-k2-instruct-0905)...');
  const synthesisRes = await client.callWithRetry({
    model: MODELS.KIMI_K2_0905,
    messages: [
      { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
      { role: 'user', content: synthesisPrompt(subject.name, aletheiosRes.content, pichetRes.content, ingestion, astroMath) },
    ],
    max_tokens: 8192,
    temperature: 0.5,
    timeout_ms: 240_000,
  });
  await writeFile(join(runDir, `06_synthesis_${slug}.md`), synthesisRes.content);
  console.log(`        ✓ ${synthesisRes.latency_ms}ms · ${synthesisRes.completion_tokens}tk`);

  // ── Phase 7: Chunking (Minimax) ────────────────────────────────────
  console.log('  [7/7] Chunking (minimax-m2.7)...');
  let chunks: ReadingChunks = {};
  try {
    const chunkRes = await client.callWithRetry({
      model: MODELS.MINIMAX,
      messages: [
        { role: 'system', content: 'You output strictly valid JSON. No prose, no commentary, no markdown fences.' },
        { role: 'user', content: chunkingPrompt(synthesisRes.content) },
      ],
      max_tokens: 8192,
      temperature: 0.1,
      timeout_ms: 360_000,
    }, 1);
    chunks = tryParseJSON(chunkRes.content);
    await writeFile(join(runDir, `07_chunks_${slug}.json`), JSON.stringify(chunks, null, 2));
    console.log(`        ✓ ${chunkRes.latency_ms}ms · sections=[${Object.keys(chunks).filter(k => !k.startsWith('_')).join(', ')}]`);
  } catch (err: any) {
    console.warn(`        ⚠ minimax chunking failed, using regex fallback: ${err.message.slice(0,80)}`);
    chunks = chunkByRegex(synthesisRes.content);
  }

  return { ingestion, astroMath, synthesis: synthesisRes.content, chunks };
}

function chunkByRegex(synth: string): ReadingChunks {
  const chunks: ReadingChunks = {};
  const sections = synth.split(/\n## /);
  for (let i = 1; i < sections.length; i++) {
    const block = sections[i];
    const head = block.split('\n')[0].toLowerCase();
    const body = '## ' + block;
    if (head.includes('frame')) chunks.frame = body;
    else if (head.includes('eigenwelt') || head.includes('cl(')) chunks.identity_eigenwelt = (chunks.identity_eigenwelt || '') + '\n\n' + body;
    else if (head.includes('mitwelt') || head.includes('tarot')) chunks.identity_mitwelt = (chunks.identity_mitwelt || '') + '\n\n' + body;
    else if (head.includes('umwelt') || head.includes('sidereal') || head.includes('cosmological')) chunks.identity_umwelt = (chunks.identity_umwelt || '') + '\n\n' + body;
    else if (head.includes('mahadasha') || head.includes('transition')) chunks.mahadasha_transition = body;
    else if (head.includes('engine') || head.includes('routing')) chunks.engine_routing_audit = body;
    else if (head.includes('anti-dependency') || head.includes('milestone')) chunks.anti_dependency = body;
    else if (head.includes('closing') || head.includes('final')) chunks.closing = body;
  }
  return chunks;
}

async function main(): Promise<void> {
  loadEnv();
  if (!process.env.NVIDIA_API_KEY) {
    console.error('FATAL: NVIDIA_API_KEY not set and not found in ~/.claude/.env');
    process.exit(1);
  }

  const configPath = process.argv[2];
  if (!configPath) {
    console.error('Usage: integratedreading.ts <config.json>');
    process.exit(1);
  }
  const cfg: RunConfig = JSON.parse(await readFile(configPath, 'utf-8'));
  const outputDir = resolve(cfg.output_dir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = join(outputDir, '.runs', ts);
  await mkdir(runDir, { recursive: true });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  /integratedreading — Multi-Model NVIDIA Workflow');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Output dir:  ${outputDir}`);
  console.log(`  Run dir:     ${runDir}`);
  console.log(`  Subjects:    ${cfg.subjects.map((s) => s.name).join(' × ')}`);
  console.log(`  Mode:        ${cfg.subjects.length === 2 ? 'DYAD' : 'SOLO'}`);
  console.log('═══════════════════════════════════════════════════════════');

  const client = new NvidiaClient(process.env.NVIDIA_API_KEY!);
  const subjectResults: Awaited<ReturnType<typeof processSubject>>[] = [];

  // First pass: ingest both, so partner data is available for cross-resonance
  console.log('\n— Phase 1 (parallel ingestion of all subjects) —');
  const ingestions = await Promise.all(
    cfg.subjects.map(async (s) => {
      // We just need the ingestion output here; full processing comes after.
      // But the simplest is to run full processSubject twice with sequential calls so partner data carries through.
      return null as any;
    }),
  );

  // Sequential processing per subject (each can use prior subject's ingestion as partner)
  const allIngestions: any[] = [];
  for (let i = 0; i < cfg.subjects.length; i++) {
    const partner = i > 0 ? allIngestions[0] : undefined;
    const result = await processSubject(client, cfg.subjects[i], runDir, partner);
    subjectResults.push(result);
    allIngestions.push(result.ingestion);
  }

  const generatedAt = new Date().toISOString();
  const modelsUsed = [
    MODELS.GPT_OSS_120B,
    MODELS.GLM_47,
    MODELS.GPT_OSS_20B,
    MODELS.KIMI_K2,
    MODELS.NEMOTRON_120B,
    MODELS.KIMI_K2_0905,
    MODELS.MINIMAX,
  ];

  // ── Solo readings: stitch + write ──────────────────────────────────
  console.log('\n— Stitching solo readings —');
  for (let i = 0; i < cfg.subjects.length; i++) {
    const subject = cfg.subjects[i];
    const result = subjectResults[i];
    const slug = subject.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const md = stitchSoloReading(result.chunks, {
      subject_name: subject.name,
      birth_data: { date: subject.birth_date, time: subject.birth_time, timezone: subject.timezone },
      generated_at: generatedAt,
      models_used: modelsUsed,
    });
    const outPath = join(outputDir, `02_NVIDIA_Reading_${subject.name}.md`);
    await writeFile(outPath, md);
    console.log(`  ✓ ${outPath} (${md.length} chars)`);
  }

  // ── Composite (if dyad) ────────────────────────────────────────────
  if (cfg.subjects.length === 2) {
    console.log('\n— Phase 8: Composite (kimi-k2-instruct-0905) —');
    const a = cfg.subjects[0];
    const b = cfg.subjects[1];
    const compositeRes = await client.callWithRetry({
      model: MODELS.KIMI_K2_0905,
      messages: [
        { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
        { role: 'user', content: compositePrompt(a.name, b.name, subjectResults[0].synthesis, subjectResults[1].synthesis, subjectResults[1].astroMath?.cross_resonance || subjectResults[0].astroMath?.cross_resonance || {}) },
      ],
      max_tokens: 8192,
      temperature: 0.5,
      timeout_ms: 240_000,
    });
    await writeFile(join(runDir, `08_composite.md`), compositeRes.content);
    console.log(`  ✓ ${compositeRes.latency_ms}ms · ${compositeRes.completion_tokens}tk`);

    const compositeMd = stitchCompositeReading(compositeRes.content, {
      subject_name: `${a.name} × ${b.name}`,
      birth_data: { date: '', time: '', timezone: '' },
      generated_at: generatedAt,
      models_used: modelsUsed,
      is_composite: true,
      composite_subject_a: a.name,
      composite_subject_b: b.name,
    });
    const compositePath = join(outputDir, `03_NVIDIA_Composite.md`);
    await writeFile(compositePath, compositeMd);
    console.log(`  ✓ ${compositePath} (${compositeMd.length} chars)`);

    // ── Phase 9: Adversarial review (Nemotron) ───────────────────────
    console.log('\n— Phase 9: Adversarial review (nemotron-120b) —');
    try {
      const reviewRes = await client.callWithRetry({
        model: MODELS.NEMOTRON_120B,
        messages: [
          { role: 'system', content: ANATOMIST_PERSONA },
          { role: 'user', content: adversarialReviewPrompt(compositeRes.content) },
        ],
        max_tokens: 2500,
        temperature: 0.3,
        timeout_ms: 300_000,
      });
      await writeFile(join(runDir, `09_adversarial_review.md`), reviewRes.content);
      console.log(`  ✓ ${reviewRes.latency_ms}ms · review saved`);
    } catch (err: any) {
      console.warn(`  ⚠ adversarial review skipped: ${err.message.slice(0, 80)}`);
    }
  }

  // ── DOCX export ────────────────────────────────────────────────────
  console.log('\n— DOCX export —');
  const mdFiles = [
    ...cfg.subjects.map((s) => join(outputDir, `02_NVIDIA_Reading_${s.name}.md`)),
    ...(cfg.subjects.length === 2 ? [join(outputDir, `03_NVIDIA_Composite.md`)] : []),
  ];
  for (const md of mdFiles) {
    if (!existsSync(md)) continue;
    const docx = md.replace(/\.md$/, '.docx');
    try {
      execSync(`pandoc "${md}" -o "${docx}"`);
      console.log(`  ✓ ${basename(docx)}`);
    } catch (err: any) {
      console.warn(`  ⚠ docx export failed for ${basename(md)}: ${err.message.slice(0,80)}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  COMPLETE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Outputs:  ${outputDir}`);
  console.log(`  Run logs: ${runDir}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
