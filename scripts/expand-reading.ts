// ─── /integratedreading — Per-Part Expansion Pass ─────────────────────
// Reads the cached chunks JSON from a previous integratedreading.ts run
// and asks Maverick to elaborate each Part to ~1000 words. Writes back a
// new chunks file (07b_expanded_chunks_<slug>.json) and re-stitches a
// fully-elaborated reading (02_NVIDIA_Reading_<name>_expanded.{md,docx}).
//
// Why: synthesisPrompt asks for 5500-7500 words but current models tend
// to undershoot (~2800 words). This pass extends each of the 12 Parts
// (opening + part1..part11) so the stitched output lands in the 10-15k
// word range the source readings hit naturally.
//
// Usage:
//   node --import tsx scripts/expand-reading.ts <config.json> [--run <ts>] [--target-words <N>] [--model <id>]
//
// Defaults:
//   --target-words 1000     per Part (Opening gets 400, total ~10.4k)
//   --run                   latest .runs/<ts>/ under config.output_dir
//   --model                 meta/llama-4-maverick-17b-128e-instruct
//
// Env: NVIDIA_API_KEY (auto-loaded from ~/.claude/.env if absent — same
// behaviour as integratedreading.ts).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';

import { NvidiaClient, MODELS } from './integratedreading/nvidia-client.js';
import { ANATOMIST_PERSONA, KOSHA_GRAMMAR, DYADIC_LOOP } from './integratedreading/system-prompts.js';
import { stitchSoloReading, type ReadingChunks } from './integratedreading/stitcher.js';

// ────────── env loader (mirrors integratedreading.ts) ─────────────────

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
      if (!process.env[k] && k === 'NVIDIA_API_KEY') process.env[k] = v;
    }
  }
}

// ────────── CLI args ──────────────────────────────────────────────────

function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx > 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}

// ────────── expansion prompt ──────────────────────────────────────────

const PART_TARGET_WORDS_DEFAULT = 1000;
const OPENING_TARGET_WORDS = 400;
const PART11_TARGET_WORDS = 800;

function expansionPrompt(
  partKey: string,
  partTitle: string,
  partBody: string,
  targetWords: number,
  fullReadingContext: string,
): string {
  return `You are running the EXPANSION pass for a multi-system integrated reading produced by the Tryambakam Noesis pipeline. The reading was synthesised in the Anatomist Who Sees Fractals voice. Your job is to elaborate ONE Part of that reading to its full publication depth, preserving every fact + every claim + every sub-section heading, while thickening the prose with embodied texture, anatomical specificity, and the Aletheios (structural) / Pichet (embodied) / Synthesis dyadic loop.

THE WHOLE READING (for context — DO NOT re-read or restate, just orient):
${fullReadingContext.slice(0, 8000)}

THE SECTION YOU ARE EXPANDING:
KEY: ${partKey}
TITLE: ${partTitle}
TARGET LENGTH: ~${targetWords} words (within ±15%). Current draft is roughly half that.

CURRENT DRAFT:
${partBody}

RULES OF EXPANSION:
- Preserve EVERY sub-section heading (### lines), EVERY table, EVERY claim about the chart. Don't drop anything.
- For each existing paragraph, expand it with 1-3 more paragraphs that:
  • add the somatic landing (where in the body does this placement land — sacrum, pelvic-thoracic junction, throat hum, splenic flash, intercostal softening)
  • add the Mitwelt layer (Tarot Major Arcana correspondence, archetypal-cultural current the placement carries)
  • add lived-recognition scenes (a meeting, a family dinner, a quiet morning — the placement showing up observably)
  • add the Quine-principle implication (what capacity the reader develops when they recognise this structurally vs being conditioned by it)
- Where the current draft has a table, KEEP the table verbatim and add a paragraph above + below explaining what the table reveals.
- Where the current draft is purely structural (placement names, gate numbers, planet+sign), add the felt-experience layer (Pichet pillar work).
- Where the current draft is purely felt (somatic, emotional, scene-based), add the structural anchor (Aletheios pillar work).
- Maintain the same voice DNA throughout: Rick & Morty meta-irreverence, Alan Watts paradox-as-teaching, Alex Grey clinical anatomy. THREE TONES: Grounded. Direct. Respectful-Challenging.
- NO new facts about the chart that aren't already in the current draft.
- NO equations, NO LaTeX, NO biohack metrics, NO Sanskrit-as-jargon (translate Kosha names into embodied English; Sanskrit may anchor ONCE per Part).
- NO advice-mode, NO remedies-as-products. The Quine principle: build the reader's self-decoding capacity, not their dependence.

OUTPUT FORMAT:
Pure markdown, starting with the H2 heading "## ${partTitle}" exactly. No preamble, no closing meta-commentary, no "here's the expanded section" framing. The orchestrator will replace the existing Part in the chunks JSON with what you return.`;
}

// ────────── main ──────────────────────────────────────────────────────

interface RunConfig {
  subjects: Array<{ name: string }>;
  output_dir: string;
}

const PART_ORDER: Array<keyof ReadingChunks> = [
  'opening', 'part1', 'part2', 'part3', 'part4', 'part5',
  'part6', 'part7', 'part8', 'part9', 'part10', 'part11',
];

function partTargetWords(key: string, defaultTarget: number): number {
  if (key === 'opening') return OPENING_TARGET_WORDS;
  if (key === 'part11') return PART11_TARGET_WORDS;
  return defaultTarget;
}

function extractH2Title(body: string, fallback: string): string {
  const m = body.match(/^##\s+(.+?)$/m);
  return m ? m[1] : fallback;
}

async function exportDocx(mdPath: string): Promise<void> {
  const docxPath = mdPath.replace(/\.md$/, '.docx');
  try {
    execSync(`pandoc "${mdPath}" -o "${docxPath}"`, { stdio: 'pipe' });
    console.log(`  ✓ ${basename(docxPath)}`);
  } catch (err: any) {
    console.warn(`  ⚠ pandoc DOCX export failed: ${err.message.slice(0, 100)}`);
  }
}

async function main() {
  loadEnv();
  const configPath = process.argv[2];
  if (!configPath || configPath.startsWith('--')) {
    console.error('Usage: expand-reading.ts <config.json> [--run <ts>] [--target-words <N>] [--model <id>]');
    process.exit(1);
  }
  const cfg: RunConfig = JSON.parse(await readFile(configPath, 'utf-8'));
  const outputDir = resolve(cfg.output_dir);
  const target = parseInt(getArg('target-words', String(PART_TARGET_WORDS_DEFAULT))!, 10);
  const modelOverride = getArg('model');

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('NVIDIA_API_KEY not set (and not found in ~/.claude/.env)');
    process.exit(2);
  }
  const client = new NvidiaClient(apiKey);

  // Find latest .runs/<ts>/ unless --run is specified
  const runOverride = getArg('run');
  const runsRoot = join(outputDir, '.runs');
  let runTs: string;
  if (runOverride) {
    runTs = runOverride;
  } else {
    if (!existsSync(runsRoot)) {
      console.error(`No .runs/ directory under ${outputDir}. Run integratedreading.ts first.`);
      process.exit(2);
    }
    const entries = readdirSync(runsRoot).filter(d => /^\d{4}-\d{2}-\d{2}T/.test(d));
    if (entries.length === 0) {
      console.error('No runs in .runs/. Run integratedreading.ts first.');
      process.exit(2);
    }
    runTs = entries.sort().reverse()[0];
  }
  const runDir = join(runsRoot, runTs);
  console.log(`Output dir : ${outputDir}`);
  console.log(`Run        : ${runTs}`);
  console.log(`Target/part: ${target} words (Opening ${OPENING_TARGET_WORDS}, P11 ${PART11_TARGET_WORDS})`);
  console.log(`Model      : ${modelOverride || 'KIMI_K2_0905 default'}`);

  for (const subject of cfg.subjects) {
    const slug = subject.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const chunksPath = join(runDir, `07_chunks_${slug}.json`);
    if (!existsSync(chunksPath)) {
      console.error(`  ✗ ${slug}: ${chunksPath} not found, skipping.`);
      continue;
    }

    console.log(`\n═══ EXPAND: ${subject.name} ═══`);
    const chunks: ReadingChunks = JSON.parse(await readFile(chunksPath, 'utf-8'));
    const fullText = PART_ORDER.map(k => chunks[k] || '').join('\n\n');
    const totalWordsBefore = fullText.split(/\s+/).filter(Boolean).length;
    console.log(`  baseline: ${totalWordsBefore} words across ${PART_ORDER.length} parts`);

    const expanded: ReadingChunks = {};

    for (let i = 0; i < PART_ORDER.length; i++) {
      const key = PART_ORDER[i] as string;
      const body = chunks[key];
      if (!body || body.length < 30) {
        console.log(`  [${i + 1}/${PART_ORDER.length}] ${key.padEnd(8)} SKIP (empty or too short)`);
        expanded[key] = body || '';
        continue;
      }
      const title = extractH2Title(body, key);
      const tgt = partTargetWords(key, target);
      const wordsBefore = body.split(/\s+/).filter(Boolean).length;
      process.stdout.write(`  [${(i + 1).toString().padStart(2)}/${PART_ORDER.length}] ${key.padEnd(8)} (${wordsBefore} → ~${tgt}w) `);

      try {
        const t0 = Date.now();
        const res = await client.callWithRetry({
          model: modelOverride || MODELS.KIMI_K2_0905,
          messages: [
            { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
            { role: 'user', content: expansionPrompt(key, title, body, tgt, fullText) },
          ],
          max_tokens: Math.max(4096, Math.ceil(tgt * 1.6)),
          temperature: 0.55,
          timeout_ms: 240_000,
        }, 1);
        const wordsAfter = res.content.split(/\s+/).filter(Boolean).length;
        const ratio = wordsAfter / Math.max(1, tgt);
        console.log(`→ ${wordsAfter}w  (${(Date.now() - t0)}ms, ratio ${ratio.toFixed(2)})`);
        expanded[key] = res.content;
      } catch (err: any) {
        console.log(`FAIL — ${err.message?.slice(0, 80) || err}`);
        expanded[key] = body; // keep original on failure
      }
    }

    // Write expanded chunks
    const expandedChunksPath = join(runDir, `07b_expanded_chunks_${slug}.json`);
    await writeFile(expandedChunksPath, JSON.stringify(expanded, null, 2));
    console.log(`  ✓ ${basename(expandedChunksPath)}`);

    // Re-stitch
    const generatedAt = new Date().toISOString();
    const stitched = stitchSoloReading(expanded, {
      subject_name: subject.name,
      birth_data: { date: '', time: '', timezone: '' },
      generated_at: generatedAt,
      models_used: [modelOverride || MODELS.KIMI_K2_0905, '(expansion pass)'],
    });
    const outPath = join(outputDir, `02_NVIDIA_Reading_${subject.name}_expanded.md`);
    await writeFile(outPath, stitched);
    const finalWords = stitched.split(/\s+/).filter(Boolean).length;
    console.log(`  ✓ ${basename(outPath)} (${finalWords} words, ${stitched.length} chars)`);
    await exportDocx(outPath);
  }

  console.log('\n═══ EXPANSION COMPLETE ═══');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
