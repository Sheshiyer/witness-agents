// ─── Autoresearch /integratedreading — Orchestrator ─────────────────
// Optimizes the integratedreading workflow against a base standard:
// - Pass 1: vary models on synthesis, chunking, pillars
// - Pass 2: vary system-prompt scaffolding (winners only)
// - Pass 3: cross-judge audit with alternate model family
//
// Inputs:
//   --base-dir <path>    Directory holding 02_NVIDIA_Reading_*.md and .runs/<ts>/
//   --subjects A,B       Comma-separated subject names matching base files
//
// Output:
//   audit-output/integratedreading-autoresearch-<ts>/
//     pass1-trials.json
//     pass2-trials.json
//     pass3-cross-judge.json
//     SUMMARY-FINAL.md

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';

import { NvidiaClient, MODELS } from './integratedreading/nvidia-client.js';
import {
  ANATOMIST_PERSONA,
  KOSHA_GRAMMAR,
  DYADIC_LOOP,
  synthesisPrompt,
  chunkingPrompt,
  aletheiosPillarPrompt,
  pichetPillarPrompt,
} from './integratedreading/system-prompts.js';
import {
  judgePrompt,
  parseJudgeResponse,
  detectAntiPatternsLocal,
  type JudgeScore,
} from './autoresearch-integratedreading/judge-rubric.js';
import {
  PASS1_VARIANTS,
  PASS2_PROMPT_VARIANTS,
  PRIMARY_JUDGE,
  ALTERNATE_JUDGE,
  type ModelVariant,
} from './autoresearch-integratedreading/variations.js';

// ──────────────────────────────────────────────────────────────────────
// Env loading
// ──────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────
// Args
// ──────────────────────────────────────────────────────────────────────

function getArg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx > 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

// ──────────────────────────────────────────────────────────────────────
// Trial result types
// ──────────────────────────────────────────────────────────────────────

interface Trial {
  pass: 1 | 2 | 3;
  variant_id: string;
  variant_name: string;
  phase: string;
  subject: string;
  model: string;
  prompt_variant?: string;
  generation_latency_ms: number;
  generation_tokens: number;
  output_chars: number;
  judge: 'primary' | 'alternate';
  score: JudgeScore;
  local_anti_patterns: string[];
  output_path: string;
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

async function judgeOutput(
  client: NvidiaClient,
  output: string,
  baseStandard: string | undefined,
  judge: 'primary' | 'alternate',
): Promise<JudgeScore> {
  const judgeModel = judge === 'primary' ? PRIMARY_JUDGE : ALTERNATE_JUDGE;
  const res = await client.callWithRetry({
    model: judgeModel,
    messages: [
      { role: 'system', content: 'You are a precise rubric-based scorer. Output only valid JSON.' },
      { role: 'user', content: judgePrompt(output, baseStandard) },
    ],
    max_tokens: 1200,
    temperature: 0.2,
    timeout_ms: 300_000,
  }, 2);
  return parseJudgeResponse(res.content);
}

function regexChunker(synth: string): Record<string, string> {
  const chunks: Record<string, string> = {};
  const sections = synth.split(/\n## /);
  for (let i = 1; i < sections.length; i++) {
    const block = sections[i];
    const head = block.split('\n')[0].toLowerCase();
    const body = '## ' + block;
    if (head.includes('frame')) chunks.frame = body;
    else if (head.includes('eigenwelt') || head.includes('cl(')) chunks.identity_eigenwelt = (chunks.identity_eigenwelt || '') + '\n\n' + body;
    else if (head.includes('mitwelt') || head.includes('tarot')) chunks.identity_mitwelt = (chunks.identity_mitwelt || '') + '\n\n' + body;
    else if (head.includes('umwelt') || head.includes('sidereal')) chunks.identity_umwelt = (chunks.identity_umwelt || '') + '\n\n' + body;
    else if (head.includes('mahadasha') || head.includes('transition')) chunks.mahadasha_transition = body;
    else if (head.includes('engine')) chunks.engine_routing_audit = body;
    else if (head.includes('anti-dependency') || head.includes('milestone')) chunks.anti_dependency = body;
    else if (head.includes('closing') || head.includes('final')) chunks.closing = body;
  }
  return chunks;
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv();
  if (!process.env.NVIDIA_API_KEY) {
    console.error('FATAL: NVIDIA_API_KEY not set');
    process.exit(1);
  }

  const baseDir = resolve(getArg('base-dir', '/Volumes/madara/2026/twc-vault/01-Projects/723'));
  const subjectsArg = getArg('subjects', 'Harshita,WitnessAlchemist');
  const subjects = subjectsArg.split(',').map((s) => s.trim());
  const passSelect = getArg('pass', 'all');  // 'all', '1', '2', '3'

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = resolve(process.cwd(), 'audit-output', `integratedreading-autoresearch-${ts}`);
  await mkdir(outDir, { recursive: true });

  // Load base outputs and run-state
  console.log('═══ AUTORESEARCH /integratedreading ═══');
  console.log(`Base dir:  ${baseDir}`);
  console.log(`Subjects:  ${subjects.join(', ')}`);
  console.log(`Pass(es):  ${passSelect}`);
  console.log(`Output:    ${outDir}`);

  // Find latest .runs subdir for source data
  const runsRoot = join(baseDir, '.runs');
  const runDirs = existsSync(runsRoot)
    ? readdirSync(runsRoot).filter((d) => /^\d{4}-/.test(d)).sort().reverse()
    : [];
  if (runDirs.length === 0) {
    console.error('FATAL: no .runs/ directory found — pipeline must have completed first');
    process.exit(1);
  }
  const latestRun = join(runsRoot, runDirs[0]);
  console.log(`Source run: ${latestRun}`);

  // Load per-subject pipeline state
  type SubjectState = {
    name: string;
    slug: string;
    ingestion: any;
    astroMath: any;
    engineResults: any[];
    aletheios: string;
    pichet: string;
    synthesis: string;
    finalReading: string;
  };

  const subjectStates: SubjectState[] = [];
  for (const subj of subjects) {
    const slug = subj.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const finalPath = join(baseDir, `02_NVIDIA_Reading_${subj}.md`);
    if (!existsSync(finalPath)) {
      console.error(`FATAL: missing ${finalPath} — pipeline incomplete for ${subj}`);
      process.exit(1);
    }
    const finalReading = await readFile(finalPath, 'utf-8');

    const readJsonSafe = (p: string): any => {
      if (!existsSync(p)) return {};
      try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return {}; }
    };
    const readTextSafe = (p: string): string => {
      if (!existsSync(p)) return '';
      try { return readFileSync(p, 'utf-8'); } catch { return ''; }
    };

    subjectStates.push({
      name: subj,
      slug,
      ingestion: readJsonSafe(join(latestRun, `01_ingestion_${slug}.json`)),
      astroMath: readJsonSafe(join(latestRun, `02_astro_${slug}.json`)),
      engineResults: readJsonSafe(join(latestRun, `03_engines_${slug}.json`)),
      aletheios: readTextSafe(join(latestRun, `04_aletheios_${slug}.md`)),
      pichet: readTextSafe(join(latestRun, `05_pichet_${slug}.md`)),
      synthesis: readTextSafe(join(latestRun, `06_synthesis_${slug}.md`)),
      finalReading,
    });
  }

  const client = new NvidiaClient(process.env.NVIDIA_API_KEY!);
  const allTrials: Trial[] = [];

  // ──────────────────────────────────────────────────────────────────
  // PASS 1 — Model variations
  // ──────────────────────────────────────────────────────────────────

  if (passSelect === 'all' || passSelect === '1') {
    console.log('\n═══ PASS 1 — MODEL VARIATIONS ═══');
    const pass1Variants = PASS1_VARIANTS.filter((v) => v.variant_name !== 'baseline');

    // Run all variants × subjects in parallel waves to avoid rate limits
    for (const variant of pass1Variants) {
      for (const state of subjectStates) {
        console.log(`\n  [${variant.id}] phase=${variant.phase} model=${variant.model.split('/')[1]} subject=${state.name}`);
        const start = Date.now();
        let output = '';
        let tokens = 0;

        try {
          if (variant.phase === 'synthesis') {
            const sys = ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP;
            const res = await client.callWithRetry({
              model: variant.model,
              messages: [
                { role: 'system', content: sys },
                { role: 'user', content: synthesisPrompt(state.name, state.aletheios, state.pichet, state.ingestion, state.astroMath) },
              ],
              max_tokens: variant.max_tokens,
              temperature: variant.temperature,
              timeout_ms: 240_000,
            }, 1);
            output = res.content;
            tokens = res.completion_tokens;
          } else if (variant.phase === 'chunking') {
            if (variant.model === 'regex') {
              const chunks = regexChunker(state.synthesis);
              output = JSON.stringify(chunks, null, 2);
              tokens = 0;
            } else {
              const res = await client.callWithRetry({
                model: variant.model,
                messages: [
                  { role: 'system', content: 'You output strictly valid JSON. No prose, no commentary, no markdown fences.' },
                  { role: 'user', content: chunkingPrompt(state.synthesis) },
                ],
                max_tokens: variant.max_tokens,
                temperature: variant.temperature,
                timeout_ms: 360_000,
              }, 1);
              output = res.content;
              tokens = res.completion_tokens;
            }
          } else if (variant.phase === 'aletheios') {
            const sys = ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\nROLE: Aletheios. Pillar function: structural-pattern witness.';
            const res = await client.callWithRetry({
              model: variant.model,
              messages: [
                { role: 'system', content: sys },
                { role: 'user', content: aletheiosPillarPrompt(state.name, state.engineResults, state.ingestion) },
              ],
              max_tokens: variant.max_tokens,
              temperature: variant.temperature,
              timeout_ms: 240_000,
            }, 1);
            output = res.content;
            tokens = res.completion_tokens;
          } else if (variant.phase === 'pichet') {
            const sys = ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\nROLE: Pichet. Pillar function: embodied-felt witness.';
            const res = await client.callWithRetry({
              model: variant.model,
              messages: [
                { role: 'system', content: sys },
                { role: 'user', content: pichetPillarPrompt(state.name, state.engineResults, state.ingestion) },
              ],
              max_tokens: variant.max_tokens,
              temperature: variant.temperature,
              timeout_ms: 240_000,
            }, 1);
            output = res.content;
            tokens = res.completion_tokens;
          }
        } catch (err: any) {
          console.warn(`    ✗ generation failed: ${err.message.slice(0, 80)}`);
          continue;
        }

        const latency = Date.now() - start;
        console.log(`    ✓ gen ${latency}ms · ${output.length} chars · ${tokens} tk · judging...`);

        const localPatterns = detectAntiPatternsLocal(output);
        let score: JudgeScore;
        try {
          score = await judgeOutput(client, output, state.finalReading, 'primary');
        } catch (err: any) {
          console.warn(`    ✗ judge failed: ${err.message.slice(0, 80)}`);
          score = { voice_fidelity: 0, insight_depth: 0, conciseness: 0, anti_pattern_absence: 0, total: 0, anti_pattern_incidents: [], notes: 'judge-failed', raw_response: '' };
        }
        console.log(`    → V${score.voice_fidelity}/I${score.insight_depth}/C${score.conciseness}/A${score.anti_pattern_absence} = ${score.total}/40 · local AP=${localPatterns.length}`);

        // Save output for inspection
        const outFile = join(outDir, `pass1-${variant.id}-${state.slug}.txt`);
        await writeFile(outFile, output);

        allTrials.push({
          pass: 1,
          variant_id: variant.id,
          variant_name: variant.variant_name,
          phase: variant.phase,
          subject: state.name,
          model: variant.model,
          generation_latency_ms: latency,
          generation_tokens: tokens,
          output_chars: output.length,
          judge: 'primary',
          score,
          local_anti_patterns: localPatterns,
          output_path: outFile,
        });
        await writeFile(join(outDir, 'pass1-trials.json'), JSON.stringify(allTrials.filter((t) => t.pass === 1), null, 2));
      }
    }

    // Also score the BASELINE (current production) for each phase × subject
    console.log('\n  [baseline] Scoring current production outputs...');
    for (const state of subjectStates) {
      const baselineMap = {
        synthesis: state.synthesis,
        aletheios: state.aletheios,
        pichet: state.pichet,
      };
      for (const [phase, content] of Object.entries(baselineMap)) {
        if (!content) continue;
        const baselineVariant = PASS1_VARIANTS.find((v) => v.phase === phase && v.variant_name === 'baseline');
        if (!baselineVariant) continue;
        const localPatterns = detectAntiPatternsLocal(content);
        try {
          const score = await judgeOutput(client, content, undefined, 'primary');
          console.log(`    [${baselineVariant.id}/${state.name}] V${score.voice_fidelity}/I${score.insight_depth}/C${score.conciseness}/A${score.anti_pattern_absence} = ${score.total}/40`);
          allTrials.push({
            pass: 1,
            variant_id: baselineVariant.id,
            variant_name: 'baseline',
            phase,
            subject: state.name,
            model: baselineVariant.model,
            generation_latency_ms: 0,
            generation_tokens: 0,
            output_chars: content.length,
            judge: 'primary',
            score,
            local_anti_patterns: localPatterns,
            output_path: '(loaded from .runs/)',
          });
        } catch (err: any) {
          console.warn(`    ✗ judge failed: ${err.message.slice(0, 80)}`);
        }
      }
    }
    await writeFile(join(outDir, 'pass1-trials.json'), JSON.stringify(allTrials.filter((t) => t.pass === 1), null, 2));
  }

  // ──────────────────────────────────────────────────────────────────
  // PASS 2 — Prompt scaffolding variations on Pass 1 winners
  // ──────────────────────────────────────────────────────────────────

  if (passSelect === 'all' || passSelect === '2') {
    console.log('\n═══ PASS 2 — PROMPT SCAFFOLDING VARIATIONS ═══');
    // Read Pass 1 results to identify winners per phase
    const pass1Path = join(outDir, 'pass1-trials.json');
    let pass1: Trial[] = [];
    if (existsSync(pass1Path)) {
      pass1 = JSON.parse(await readFile(pass1Path, 'utf-8'));
    } else {
      pass1 = allTrials.filter((t) => t.pass === 1);
    }

    // Aggregate by phase + variant_id, take mean across subjects
    const phaseWinners: Record<string, { variant_id: string; model: string; mean_total: number }> = {};
    const grouped: Record<string, Trial[]> = {};
    for (const t of pass1) {
      const k = `${t.phase}::${t.variant_id}`;
      grouped[k] = grouped[k] || [];
      grouped[k].push(t);
    }
    for (const [k, ts] of Object.entries(grouped)) {
      const [phase] = k.split('::');
      const meanTotal = ts.reduce((a, b) => a + b.score.total, 0) / ts.length;
      const variant_id = ts[0].variant_id;
      const model = ts[0].model;
      if (!phaseWinners[phase] || meanTotal > phaseWinners[phase].mean_total) {
        phaseWinners[phase] = { variant_id, model, mean_total: meanTotal };
      }
    }
    console.log('  Pass 1 winners:');
    for (const [phase, w] of Object.entries(phaseWinners)) {
      console.log(`    ${phase}: ${w.variant_id} (model=${w.model.split('/')[1]}, mean=${w.mean_total.toFixed(1)}/40)`);
    }

    // Run Pass 2: prompt variants × {synthesis, aletheios, pichet} winning models × subjects
    const pass2Phases = ['synthesis', 'aletheios', 'pichet'].filter((p) => phaseWinners[p]);
    for (const phase of pass2Phases) {
      const winner = phaseWinners[phase];
      for (const promptVariant of PASS2_PROMPT_VARIANTS) {
        if (promptVariant.variant_name === 'V1-current') continue;  // already covered by Pass 1
        for (const state of subjectStates) {
          console.log(`\n  [${promptVariant.id}] phase=${phase} model=${winner.model.split('/')[1]} subject=${state.name}`);
          const start = Date.now();
          let output = '';
          let tokens = 0;
          try {
            const role = phase as 'aletheios' | 'pichet' | 'synthesis';
            const sys = promptVariant.system_prompt_factory(role);
            const userPrompt = phase === 'synthesis'
              ? synthesisPrompt(state.name, state.aletheios, state.pichet, state.ingestion, state.astroMath)
              : phase === 'aletheios'
                ? aletheiosPillarPrompt(state.name, state.engineResults, state.ingestion)
                : pichetPillarPrompt(state.name, state.engineResults, state.ingestion);
            const res = await client.callWithRetry({
              model: winner.model,
              messages: [
                { role: 'system', content: sys },
                { role: 'user', content: userPrompt },
              ],
              max_tokens: phase === 'synthesis' ? 8192 : 4096,
              temperature: phase === 'pichet' ? 0.6 : phase === 'synthesis' ? 0.5 : 0.4,
              timeout_ms: 240_000,
            }, 1);
            output = res.content;
            tokens = res.completion_tokens;
          } catch (err: any) {
            console.warn(`    ✗ generation failed: ${err.message.slice(0, 80)}`);
            continue;
          }
          const latency = Date.now() - start;
          const localPatterns = detectAntiPatternsLocal(output);
          let score: JudgeScore;
          try {
            score = await judgeOutput(client, output, state.finalReading, 'primary');
          } catch {
            score = { voice_fidelity: 0, insight_depth: 0, conciseness: 0, anti_pattern_absence: 0, total: 0, anti_pattern_incidents: [], notes: 'judge-failed', raw_response: '' };
          }
          console.log(`    ✓ ${latency}ms · V${score.voice_fidelity}/I${score.insight_depth}/C${score.conciseness}/A${score.anti_pattern_absence} = ${score.total}/40 · localAP=${localPatterns.length}`);

          const outFile = join(outDir, `pass2-${promptVariant.id}-${phase}-${state.slug}.txt`);
          await writeFile(outFile, output);
          allTrials.push({
            pass: 2,
            variant_id: promptVariant.id,
            variant_name: promptVariant.variant_name,
            phase,
            subject: state.name,
            model: winner.model,
            prompt_variant: promptVariant.variant_name,
            generation_latency_ms: latency,
            generation_tokens: tokens,
            output_chars: output.length,
            judge: 'primary',
            score,
            local_anti_patterns: localPatterns,
            output_path: outFile,
          });
          await writeFile(join(outDir, 'pass2-trials.json'), JSON.stringify(allTrials.filter((t) => t.pass === 2), null, 2));
        }
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // PASS 3 — Cross-judge audit
  // ──────────────────────────────────────────────────────────────────

  if (passSelect === 'all' || passSelect === '3') {
    console.log('\n═══ PASS 3 — CROSS-JUDGE AUDIT (nemotron-120b) ═══');
    const all = allTrials.filter((t) => t.pass <= 2 && t.score.total >= 25);  // only re-judge meaningful trials
    const sample = all.slice(0, 24);  // cap to avoid blow-up
    for (const t of sample) {
      try {
        const output = t.output_path === '(loaded from .runs/)'
          ? subjectStates.find((s) => s.name === t.subject)?.[t.phase as keyof SubjectState] as string || ''
          : await readFile(t.output_path, 'utf-8');
        if (!output) continue;
        const score = await judgeOutput(client, output, undefined, 'alternate');
        console.log(`  [P3 ${t.variant_id}/${t.subject}] alt-judge: V${score.voice_fidelity}/I${score.insight_depth}/C${score.conciseness}/A${score.anti_pattern_absence} = ${score.total}/40 (vs primary ${t.score.total})`);
        allTrials.push({ ...t, pass: 3, judge: 'alternate', score });
      } catch (err: any) {
        console.warn(`  ✗ alt-judge for ${t.variant_id}/${t.subject}: ${err.message.slice(0, 80)}`);
      }
    }
    await writeFile(join(outDir, 'pass3-cross-judge.json'), JSON.stringify(allTrials.filter((t) => t.pass === 3), null, 2));
  }

  // ──────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────

  console.log('\n═══ SUMMARY ═══');
  const summary = generateSummary(allTrials, subjectStates.map((s) => s.name));
  await writeFile(join(outDir, 'SUMMARY-FINAL.md'), summary);
  console.log(`\n✓ Wrote ${join(outDir, 'SUMMARY-FINAL.md')}`);
}

// ──────────────────────────────────────────────────────────────────────
// Summary generator
// ──────────────────────────────────────────────────────────────────────

function generateSummary(trials: Trial[], subjects: string[]): string {
  const ts = new Date().toISOString();
  let md = `# Autoresearch /integratedreading — SUMMARY-FINAL\n\n**Date:** ${ts}\n**Subjects:** ${subjects.join(' × ')}\n\n`;

  // Aggregate by pass + phase + variant
  type Agg = { mean_total: number; mean_v: number; mean_i: number; mean_c: number; mean_a: number; mean_latency: number; n: number; localAP: number; model: string; variant_name: string };
  const agg: Record<string, Agg> = {};
  for (const t of trials.filter((x) => x.judge === 'primary')) {
    const key = `${t.phase}::${t.variant_id}`;
    const a = agg[key] = agg[key] || { mean_total: 0, mean_v: 0, mean_i: 0, mean_c: 0, mean_a: 0, mean_latency: 0, n: 0, localAP: 0, model: t.model, variant_name: t.variant_name };
    a.mean_total += t.score.total;
    a.mean_v += t.score.voice_fidelity;
    a.mean_i += t.score.insight_depth;
    a.mean_c += t.score.conciseness;
    a.mean_a += t.score.anti_pattern_absence;
    a.mean_latency += t.generation_latency_ms;
    a.localAP += t.local_anti_patterns.length;
    a.n++;
  }
  for (const k of Object.keys(agg)) {
    const a = agg[k];
    a.mean_total /= a.n;
    a.mean_v /= a.n;
    a.mean_i /= a.n;
    a.mean_c /= a.n;
    a.mean_a /= a.n;
    a.mean_latency /= a.n;
  }

  // Group by phase
  const byPhase: Record<string, [string, Agg][]> = {};
  for (const [k, a] of Object.entries(agg)) {
    const [phase] = k.split('::');
    byPhase[phase] = byPhase[phase] || [];
    byPhase[phase].push([k, a]);
  }
  for (const phase of Object.keys(byPhase)) {
    byPhase[phase].sort(([, a], [, b]) => b.mean_total - a.mean_total);
  }

  md += `## Pass 1 + 2 Results (Primary Judge: gpt-oss-120b)\n\n`;
  for (const [phase, list] of Object.entries(byPhase)) {
    md += `### Phase: ${phase}\n\n| Rank | Variant | Model | V | I | C | A | Total /40 | Latency | Local AP |\n`;
    md += `|------|---------|-------|---|---|---|---|-----------|---------|----------|\n`;
    list.forEach(([key, a], i) => {
      md += `| ${i + 1} | ${a.variant_name} | ${a.model.split('/')[1]} | ${a.mean_v.toFixed(1)} | ${a.mean_i.toFixed(1)} | ${a.mean_c.toFixed(1)} | ${a.mean_a.toFixed(1)} | **${a.mean_total.toFixed(1)}** | ${(a.mean_latency / 1000).toFixed(1)}s | ${a.localAP} |\n`;
    });
    md += '\n';
  }

  // Cross-judge agreement
  md += `## Pass 3 Cross-Judge Audit (Alt: nemotron-120b)\n\n`;
  const altScores = trials.filter((t) => t.pass === 3);
  if (altScores.length > 0) {
    md += `| Variant | Subject | Phase | Primary /40 | Alt /40 | Δ |\n|---------|---------|-------|------|------|---|\n`;
    for (const t of altScores) {
      const primary = trials.find((p) => p.judge === 'primary' && p.variant_id === t.variant_id && p.subject === t.subject && p.phase === t.phase);
      const primaryTotal = primary?.score.total ?? 0;
      const delta = (t.score.total - primaryTotal).toFixed(1);
      md += `| ${t.variant_id} | ${t.subject} | ${t.phase} | ${primaryTotal} | ${t.score.total} | ${delta} |\n`;
    }
  } else {
    md += `_(Pass 3 not run or no qualifying winners)_\n`;
  }

  // Recommendations
  md += `\n## Recommendations\n\n`;
  for (const [phase, list] of Object.entries(byPhase)) {
    if (list.length < 2) continue;
    const winner = list[0];
    const baseline = list.find(([, a]) => a.variant_name === 'baseline');
    if (!baseline) continue;
    const wAgg = winner[1];
    const bAgg = baseline[1];
    const totalDelta = wAgg.mean_total - bAgg.mean_total;
    const latencyDelta = wAgg.mean_latency - bAgg.mean_latency;
    if (Math.abs(totalDelta) < 0.5) {
      md += `- **${phase}:** baseline (${bAgg.model.split('/')[1]}) ≈ winner (${wAgg.model.split('/')[1]}) — within noise. Keep baseline.\n`;
    } else if (totalDelta > 0) {
      md += `- **${phase}:** **promote ${wAgg.variant_name}** (model=${wAgg.model.split('/')[1]}) — score +${totalDelta.toFixed(1)} vs baseline, latency Δ ${(latencyDelta / 1000).toFixed(1)}s\n`;
    } else {
      md += `- **${phase}:** keep baseline (${bAgg.model.split('/')[1]}) — variants underperformed by ${(-totalDelta).toFixed(1)}\n`;
    }
  }

  // Anti-pattern incidents
  md += `\n## Anti-Pattern Incident Inventory\n\n`;
  const apTotal: Record<string, number> = {};
  for (const t of trials.filter((x) => x.judge === 'primary')) {
    for (const inc of t.local_anti_patterns) {
      const phrase = inc.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
      apTotal[phrase] = (apTotal[phrase] || 0) + 1;
    }
  }
  if (Object.keys(apTotal).length === 0) {
    md += `**Zero anti-pattern incidents detected across all trials.** Voice scaffolding is holding.\n`;
  } else {
    md += `| Anti-pattern (first 3 words) | Occurrences |\n|---|---|\n`;
    Object.entries(apTotal).sort((a, b) => b[1] - a[1]).forEach(([phrase, n]) => {
      md += `| ${phrase} | ${n} |\n`;
    });
  }

  return md;
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
