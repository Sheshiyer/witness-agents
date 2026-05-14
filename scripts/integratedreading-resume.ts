// ─── /integratedreading-resume — Resume from checkpoint ─────────────
// Picks up a partially-failed integratedreading run from any phase.
// Reads checkpointed JSON/MD files in .runs/<ts>/ and continues forward.
//
// Usage:
//   node --import tsx scripts/integratedreading-resume.ts \
//     --base-dir /Volumes/madara/.../723 \
//     --run <2026-05-10T01-45-57> \
//     --subjects Harshita,WitnessAlchemist \
//     --skip-astro              # skip Phase 2 (use empty astroMath)
//     --start-from <phase>      # phase to start from: astro|engines|pillars|synthesis|chunking|composite

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';

import { NvidiaClient, MODELS } from './integratedreading/nvidia-client.js';
import {
  ANATOMIST_PERSONA,
  KOSHA_GRAMMAR,
  DYADIC_LOOP,
  engineMicroReadingPrompt,
  aletheiosPillarPrompt,
  pichetPillarPrompt,
  synthesisPrompt,
  synthesisPromptA,
  synthesisPromptB,
  chunkingPrompt,
  compositePrompt,
} from './integratedreading/system-prompts.js';
import { stitchSoloReading, stitchCompositeReading } from './integratedreading/stitcher.js';

function loadEnv() {
  if (process.env.NVIDIA_API_KEY) return;
  const p = join(homedir(), '.claude', '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]] && m[1] === 'NVIDIA_API_KEY') {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

function getArg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx > 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function tryParseJSON(text: string): any {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i < 0 || j <= i) return { _raw: text };
  try { return JSON.parse(s.slice(i, j + 1)); } catch { return { _raw: text }; }
}

const ENGINE_MODELS: Record<string, string> = {
  vimshottari:     MODELS.GPT_OSS_120B,
  human_design:    MODELS.GPT_OSS_120B,
  gene_keys:       MODELS.KIMI_K2,
  tarot:           MODELS.KIMI_K2,
  numerology:      MODELS.GPT_OSS_20B,
  biorhythm:       MODELS.GPT_OSS_20B,
  vedic_yogas:     MODELS.GPT_OSS_120B,  // glm fallback to gpt-oss-120b for stability
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
  const base = { birth_data: ingestion.birth_data, key_facts: ingestion.key_facts };
  const am = astroMath || {};
  switch (engine) {
    case 'vimshottari': return { ...base, mahadasha: ingestion.mahadasha, antardasha_first_24mo: am.antardasha_first_24mo };
    case 'human_design': return { ...base, human_design: ingestion.human_design };
    case 'gene_keys': return { ...base, gene_keys: ingestion.gene_keys };
    case 'tarot': return { ...base, vedic: ingestion.vedic, gene_keys: ingestion.gene_keys, atmakaraka_dignity: am.atmakaraka_dignity };
    case 'numerology': return { ...base, vedic_lagna: ingestion.vedic?.lagna };
    case 'biorhythm': return { ...base };
    case 'vedic_yogas': return { ...base, vedic: ingestion.vedic, atmakaraka_dignity: am.atmakaraka_dignity };
    case 'western_tropical': return { ...base, western: ingestion.western };
    case 'panchanga': return { ...base, panchanga_at_md_transition: am.panchanga_at_md_transition };
    case 'biofield': return { ...base, vedic: ingestion.vedic, human_design: ingestion.human_design };
    case 'face_reading': return { ...base, vedic_lagna: ingestion.vedic?.lagna };
    case 'nadabrahman': return { ...base, vedic: { lagna: ingestion.vedic?.lagna, moon: ingestion.vedic?.moon_rashi } };
    case 'i_ching': return { ...base, gene_keys: ingestion.gene_keys, mahadasha: ingestion.mahadasha };
    case 'enneagram': return { ...base, vedic: ingestion.vedic, human_design: ingestion.human_design };
    case 'sacred_geometry': return { ...base, pancha_bhuta: am.pancha_bhuta_distribution };
    case 'sigil_forge': return { ...base, atmakaraka: ingestion.vedic?.atmakaraka };
    default: return base;
  }
}

async function main() {
  loadEnv();
  if (!process.env.NVIDIA_API_KEY) {
    console.error('FATAL: NVIDIA_API_KEY not set');
    process.exit(1);
  }
  const baseDir = resolve(getArg('base-dir'));
  const runTs = getArg('run');
  const runDir = join(baseDir, '.runs', runTs);
  if (!existsSync(runDir)) {
    console.error(`FATAL: run dir not found: ${runDir}`);
    process.exit(1);
  }
  const subjectNames = getArg('subjects').split(',').map((s) => s.trim());
  const skipAstro = hasFlag('skip-astro');
  const startFrom = getArg('start-from', 'auto');

  const client = new NvidiaClient(process.env.NVIDIA_API_KEY!);

  console.log('═══ /integratedreading-resume ═══');
  console.log(`Run dir:       ${runDir}`);
  console.log(`Subjects:      ${subjectNames.join(', ')}`);
  console.log(`Skip astro:    ${skipAstro}`);
  console.log(`Start from:    ${startFrom}`);

  const subjectStates: any[] = [];

  for (const name of subjectNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    console.log(`\n═══ ${name} (slug=${slug}) ═══`);
    const state: any = { name, slug };

    // Load ingestion (required)
    const ingestionPath = join(runDir, `01_ingestion_${slug}.json`);
    if (!existsSync(ingestionPath)) {
      console.error(`  ✗ missing ${ingestionPath} — cannot resume`);
      continue;
    }
    state.ingestion = JSON.parse(await readFile(ingestionPath, 'utf-8'));
    console.log(`  ✓ ingestion loaded`);

    // Load astroMath (optional — empty if skip)
    const astroPath = join(runDir, `02_astro_${slug}.json`);
    if (skipAstro || !existsSync(astroPath)) {
      console.log(`  ⊘ astro skipped — using empty astroMath`);
      state.astroMath = {};
      await writeFile(astroPath, JSON.stringify({ _skipped: true }, null, 2));
    } else {
      try {
        state.astroMath = JSON.parse(await readFile(astroPath, 'utf-8'));
        console.log(`  ✓ astroMath loaded (${Object.keys(state.astroMath).length} keys)`);
      } catch {
        state.astroMath = {};
      }
    }

    // Engines
    const enginesPath = join(runDir, `03_engines_${slug}.json`);
    if (existsSync(enginesPath)) {
      state.engineResults = JSON.parse(await readFile(enginesPath, 'utf-8'));
      console.log(`  ✓ engines cached (${state.engineResults.length})`);
    } else {
      console.log(`  → running 16 engine micro-readings (parallel)...`);
      const promises = ENGINE_LIST.map(async (engine) => {
        const model = ENGINE_MODELS[engine];
        const input = buildEngineInput(engine, state.ingestion, state.astroMath);
        try {
          const res = await client.callWithRetry({
            model,
            messages: [
              { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + DYADIC_LOOP },
              { role: 'user', content: engineMicroReadingPrompt(engine, name, input) },
            ],
            max_tokens: 1024,
            temperature: 0.4,
          }, 1);
          return { engine, model, output: tryParseJSON(res.content), latency_ms: res.latency_ms };
        } catch (err: any) {
          return { engine, model, output: { _error: err.message }, latency_ms: 0 };
        }
      });
      state.engineResults = await Promise.all(promises);
      await writeFile(enginesPath, JSON.stringify(state.engineResults, null, 2));
      const ok = state.engineResults.filter((r: any) => !r.output._error).length;
      console.log(`    ✓ ${ok}/${ENGINE_LIST.length} engines`);
    }

    // Pillars
    const aletheiosPath = join(runDir, `04_aletheios_${slug}.md`);
    const pichetPath = join(runDir, `05_pichet_${slug}.md`);
    if (existsSync(aletheiosPath) && existsSync(pichetPath)) {
      state.aletheios = await readFile(aletheiosPath, 'utf-8');
      state.pichet = await readFile(pichetPath, 'utf-8');
      console.log(`  ✓ pillars cached`);
    } else {
      console.log(`  → running Aletheios + Pichet (parallel)...`);
      const [a, p] = await Promise.all([
        client.callWithRetry({
          model: MODELS.GPT_OSS_120B,
          messages: [
            { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\nROLE: Aletheios.' },
            { role: 'user', content: aletheiosPillarPrompt(name, state.engineResults, state.ingestion) },
          ],
          max_tokens: 4096, temperature: 0.4, timeout_ms: 240_000,
        }),
        client.callWithRetry({
          model: MODELS.GPT_OSS_120B,
          messages: [
            { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\nROLE: Pichet.' },
            { role: 'user', content: pichetPillarPrompt(name, state.engineResults, state.ingestion) },
          ],
          max_tokens: 4096, temperature: 0.6, timeout_ms: 240_000,
        }),
      ]);
      state.aletheios = a.content;
      state.pichet = p.content;
      await writeFile(aletheiosPath, state.aletheios);
      await writeFile(pichetPath, state.pichet);
      console.log(`    ✓ Aletheios ${a.latency_ms}ms · Pichet ${p.latency_ms}ms`);
    }

    // Synthesis — two-pass for source-DOCX depth (5500-7500 words)
    const synthPath = join(runDir, `06_synthesis_${slug}.md`);
    const synthPathA = join(runDir, `06a_synthesis_${slug}.md`);
    const synthPathB = join(runDir, `06b_synthesis_${slug}.md`);
    if (existsSync(synthPath)) {
      state.synthesis = await readFile(synthPath, 'utf-8');
      console.log(`  ✓ synthesis cached`);
    } else {
      // Pass A — Opening + Parts I-VI
      let passA: string;
      if (existsSync(synthPathA)) {
        passA = await readFile(synthPathA, 'utf-8');
        console.log(`  ✓ synthesis Pass A cached`);
      } else {
        console.log(`  → synthesis Pass A — Opening + Parts I-VI (kimi-k2-instruct)...`);
        const rA = await client.callWithRetry({
          model: MODELS.KIMI_K2,
          messages: [
            { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
            { role: 'user', content: synthesisPromptA(name, state.aletheios, state.pichet, state.ingestion, state.astroMath) },
          ],
          max_tokens: 8192, temperature: 0.5, timeout_ms: 240_000,
        });
        passA = rA.content;
        await writeFile(synthPathA, passA);
        console.log(`    ✓ Pass A ${rA.latency_ms}ms · ${rA.completion_tokens}tk · ${passA.length} chars`);
      }
      // Pass B — Parts VII-XI
      let passB: string;
      if (existsSync(synthPathB)) {
        passB = await readFile(synthPathB, 'utf-8');
        console.log(`  ✓ synthesis Pass B cached`);
      } else {
        console.log(`  → synthesis Pass B — Parts VII-XI (kimi-k2-instruct)...`);
        const rB = await client.callWithRetry({
          model: MODELS.KIMI_K2,
          messages: [
            { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
            { role: 'user', content: synthesisPromptB(name, state.aletheios, state.pichet, state.ingestion, state.astroMath, passA) },
          ],
          max_tokens: 8192, temperature: 0.5, timeout_ms: 240_000,
        });
        passB = rB.content;
        await writeFile(synthPathB, passB);
        console.log(`    ✓ Pass B ${rB.latency_ms}ms · ${rB.completion_tokens}tk · ${passB.length} chars`);
      }
      // Concatenate
      state.synthesis = passA.trimEnd() + '\n\n' + passB.trimStart();
      await writeFile(synthPath, state.synthesis);
      console.log(`    ✓ stitched: ${state.synthesis.length} chars total`);
    }

    // Chunking — prefer minimax; regex V2 fallback for failure
    const chunksPath = join(runDir, `07_chunks_${slug}.json`);
    if (existsSync(chunksPath)) {
      state.chunks = JSON.parse(await readFile(chunksPath, 'utf-8'));
      console.log(`  ✓ chunks cached (${Object.keys(state.chunks).length} sections)`);
    } else {
      const { chunkingPrompt } = await import('./integratedreading/system-prompts.js');
      console.log(`  → chunking (minimax-m2.7 with regex V2 fallback)...`);
      let chunks: Record<string, string> = {};
      try {
        const r = await client.callWithRetry({
          model: MODELS.MINIMAX,
          messages: [
            { role: 'system', content: 'You output strictly valid JSON. No prose, no commentary, no markdown fences.' },
            { role: 'user', content: chunkingPrompt(state.synthesis) },
          ],
          max_tokens: 8192, temperature: 0.1, timeout_ms: 360_000,
        }, 1);
        let s = r.content.trim();
        const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fence) s = fence[1].trim();
        const i = s.indexOf('{'); const j = s.lastIndexOf('}');
        if (i >= 0 && j > i) chunks = JSON.parse(s.slice(i, j + 1));
        console.log(`    ✓ minimax ${r.latency_ms}ms · ${Object.keys(chunks).length} sections`);
      } catch (err: any) {
        console.warn(`    ⚠ minimax failed: ${err.message.slice(0, 80)} — falling back to regex V2`);
        // V2 regex chunker — handles both leading-header AND preamble cases
        const sections = ('\n' + state.synthesis).split(/\n## /);
        for (let i = 1; i < sections.length; i++) {
          const block = sections[i];
          const head = block.split('\n')[0].toLowerCase();
          const body = '## ' + block;
          if (head.includes('opening')) chunks.opening = body;
          else if (head.match(/part i\b/)) chunks.part1 = body;
          else if (head.match(/part ii\b/)) chunks.part2 = body;
          else if (head.match(/part iii\b/)) chunks.part3 = body;
          else if (head.match(/part iv\b/)) chunks.part4 = body;
          else if (head.match(/part v\b/)) chunks.part5 = body;
          else if (head.match(/part vi\b/)) chunks.part6 = body;
          else if (head.match(/part vii\b/)) chunks.part7 = body;
          else if (head.match(/part viii\b/)) chunks.part8 = body;
          else if (head.match(/part ix\b/)) chunks.part9 = body;
          else if (head.match(/part x\b/) && !head.match(/part xi\b/)) chunks.part10 = body;
          else if (head.match(/part xi\b/)) chunks.part11 = body;
        }
        console.log(`    ✓ regex V2 split into ${Object.keys(chunks).length} sections`);
      }
      state.chunks = chunks;
      await writeFile(chunksPath, JSON.stringify(chunks, null, 2));
    }

    subjectStates.push(state);
  }

  // Stitch finals
  const generatedAt = new Date().toISOString();
  const modelsUsed = ['gpt-oss-120b', 'gpt-oss-20b', 'kimi-k2-instruct', 'glm4.7', 'nemotron-120b'];

  console.log('\n— Stitching solo readings —');
  for (const state of subjectStates) {
    const md = stitchSoloReading(state.chunks, {
      subject_name: state.name,
      birth_data: { date: state.ingestion?.birth_data?.date || '', time: state.ingestion?.birth_data?.time || '', timezone: state.ingestion?.birth_data?.timezone || '' },
      generated_at: generatedAt,
      models_used: modelsUsed,
    });
    const outPath = join(baseDir, `02_NVIDIA_Reading_${state.name}.md`);
    await writeFile(outPath, md);
    console.log(`  ✓ ${outPath} (${md.length} chars)`);
  }

  // Composite (if dyad)
  if (subjectStates.length === 2) {
    const compositePath = join(runDir, `08_composite.md`);
    let compositeContent: string;
    if (existsSync(compositePath)) {
      compositeContent = await readFile(compositePath, 'utf-8');
      console.log(`  ✓ composite cached`);
    } else {
      console.log('\n— Phase 8: Composite (kimi-k2-instruct) —');
      const r = await client.callWithRetry({
        model: MODELS.KIMI_K2,
        messages: [
          { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
          { role: 'user', content: compositePrompt(subjectStates[0].name, subjectStates[1].name, subjectStates[0].synthesis, subjectStates[1].synthesis, subjectStates[1].astroMath?.cross_resonance || subjectStates[0].astroMath?.cross_resonance || {}) },
        ],
        max_tokens: 8192, temperature: 0.5, timeout_ms: 240_000,
      });
      compositeContent = r.content;
      await writeFile(compositePath, compositeContent);
      console.log(`    ✓ ${r.latency_ms}ms · ${r.completion_tokens}tk`);
    }
    const compositeMd = stitchCompositeReading(compositeContent, {
      subject_name: `${subjectStates[0].name} × ${subjectStates[1].name}`,
      birth_data: { date: '', time: '', timezone: '' },
      generated_at: generatedAt,
      models_used: modelsUsed,
      is_composite: true,
      composite_subject_a: subjectStates[0].name,
      composite_subject_b: subjectStates[1].name,
    });
    const compositeOutPath = join(baseDir, `03_NVIDIA_Composite.md`);
    await writeFile(compositeOutPath, compositeMd);
    console.log(`  ✓ ${compositeOutPath}`);
  }

  // DOCX export
  console.log('\n— DOCX export —');
  for (const state of subjectStates) {
    const md = join(baseDir, `02_NVIDIA_Reading_${state.name}.md`);
    if (!existsSync(md)) continue;
    try {
      execSync(`pandoc "${md}" -o "${md.replace(/\.md$/, '.docx')}"`);
      console.log(`  ✓ ${basename(md).replace(/\.md$/, '.docx')}`);
    } catch (err: any) {
      console.warn(`  ⚠ ${basename(md)}: ${err.message.slice(0, 80)}`);
    }
  }
  const compMd = join(baseDir, `03_NVIDIA_Composite.md`);
  if (existsSync(compMd)) {
    try {
      execSync(`pandoc "${compMd}" -o "${compMd.replace(/\.md$/, '.docx')}"`);
      console.log(`  ✓ 03_NVIDIA_Composite.docx`);
    } catch (err: any) {
      console.warn(`  ⚠ composite docx: ${err.message.slice(0, 80)}`);
    }
  }

  console.log('\n═══ RESUME COMPLETE ═══');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
