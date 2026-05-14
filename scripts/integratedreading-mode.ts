#!/usr/bin/env node --import tsx
// ─── /integratedreading — Unified Mode Orchestrator ────────────────────
// Single runner for all reading modes: composite-dyad, composite-triad,
// partner-synastry, business-partners, family-penta, team-synergy.
//
// Mode-specific knowledge lives in scripts/integratedreading/modes/<mode>.md
// (per docs/plans/2026-05-14-reading-modes-design.md § Section 1).
//
// CLI:
//   node --import tsx scripts/integratedreading-mode.ts \
//     --mode <name> \
//     --subjects-dir <path>         # contains 01_*.json, 02_*.json, ... (lexical order)
//     --output-dir <path>
//     [--use-cache]                 # reuse most recent prior .runs/ subdir
//     [--skip-solos]                # don't auto-chain solo synthesis
//     [--dry-run]                   # parse + validate + print plan, no API calls
//
// Closes #38 (P1.1).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';

import { parseModeDoc, summarizeLessons, type ParsedModeDoc, type PassSpec } from './integratedreading/modes/parser.js';
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
import { NvidiaClient } from './integratedreading/nvidia-client.js';
import {
  SYNTH_MODELS,
  findOrCreateCachedRunDir,
  countCrossRefs,
} from './autoresearch-integratedreading/defaults.js';

// ────────────────────────────────────────────────────────────────────────
// CLI parsing
// ────────────────────────────────────────────────────────────────────────

interface CliArgs {
  mode: string;
  subjectsDir: string;
  outputDir: string;
  useCache: boolean;
  skipSolos: boolean;
  dryRun: boolean;
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

  if (!mode || !subjectsDir || !outputDir) {
    console.error('Usage: integratedreading-mode.ts --mode <name> --subjects-dir <path> --output-dir <path> [--use-cache] [--skip-solos] [--dry-run]');
    process.exit(1);
  }

  return {
    mode,
    subjectsDir: resolve(subjectsDir),
    outputDir: resolve(outputDir),
    useCache: hasFlag('use-cache'),
    skipSolos: hasFlag('skip-solos'),
    dryRun: hasFlag('dry-run'),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Subject loading
// ────────────────────────────────────────────────────────────────────────

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
): Promise<PassResult> {
  const template = doc.sections[pass.template];
  if (!template) throw new Error(`Pass ${pass.id}: template section '${pass.template}' not found`);

  const userPrompt = interpolate(template, {
    ...ctx,
    pass_title: pass.title,
    target_words: String(pass.target_words),
  });

  // Prepend the solo syntheses as context for the first pass; subsequent passes
  // rely on prior_pass + lessons_summary instead (to avoid blowing the context window).
  const soloContext = ctx.prior_pass === ''
    ? '\n\n## SOURCE SOLO SYNTHESES (input data — do not echo back verbatim, synthesize)\n\n' +
      soloRuns.map((s) => `### ${s.subject.toUpperCase()}\n${s.synthesis.slice(0, 14000)}`).join('\n\n')
    : '';

  const system = `${ANATOMIST_PERSONA}\n\n${KOSHA_GRAMMAR}\n\n${DYADIC_LOOP}\n\n` +
    (ctx.lessons_summary ? `${ctx.lessons_summary}\n\n` : '') +
    `## Mode Overlay Rules\n\n${ctx.overlay_summary}\n\n## Bridge Mandates\n\n${ctx.bridge_mandates}`;

  const model = pass.model ?? SYNTH_MODELS.PRIMARY;
  const result = await client.callWithRetry({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt + soloContext },
    ],
    max_tokens: 8192,
    temperature: 0.5,
    timeout_ms: 360_000,
  }, 1);

  const content = result.content;
  const words = content.split(/\s+/).filter(Boolean).length;
  const xrefs = countCrossRefs(content).total;

  return {
    pass,
    content,
    words,
    xrefs,
    latency_ms: result.latency_ms,
    model,
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
): Promise<PassResult[]> {
  const results: PassResult[] = [];
  let assembled = '';
  for (const pass of doc.frontmatter.pass_plan) {
    const cachePath = join(runDir, `pass_${pass.id}.md`);
    if (existsSync(cachePath)) {
      const cached = readFileSync(cachePath, 'utf-8');
      const words = cached.split(/\s+/).filter(Boolean).length;
      const xrefs = countCrossRefs(cached).total;
      console.log(`    ✓ Pass ${pass.id} cached: ${words}w · ${xrefs} xrefs`);
      results.push({ pass, content: cached, words, xrefs, latency_ms: 0, model: pass.model ?? SYNTH_MODELS.PRIMARY });
      assembled += '\n\n' + cached;
      continue;
    }
    console.log(`    → Pass ${pass.id} (${pass.title})…`);
    const ctx: InterpolationContext = {
      ...baseCtx,
      prior_pass: assembled.slice(-4000),
      pass_title: pass.title,
      target_words: String(pass.target_words),
    };
    const result = await executePass(client, pass, doc, ctx, soloRuns);
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
): Promise<PassResult[]> {
  // Hierarchical: first pass is outline; subsequent passes carry it forward.
  const [outlinePass, ...expansions] = doc.frontmatter.pass_plan;
  const outlineCachePath = join(runDir, `pass_${outlinePass.id}.md`);
  let outlineContent: string;
  let outlineResult: PassResult;
  if (existsSync(outlineCachePath)) {
    outlineContent = readFileSync(outlineCachePath, 'utf-8');
    const words = outlineContent.split(/\s+/).filter(Boolean).length;
    const xrefs = countCrossRefs(outlineContent).total;
    console.log(`    ✓ Outline cached: ${words}w · ${xrefs} xrefs`);
    outlineResult = { pass: outlinePass, content: outlineContent, words, xrefs, latency_ms: 0, model: outlinePass.model ?? SYNTH_MODELS.PRIMARY };
  } else {
    console.log(`    → Outline pass (${outlinePass.title})…`);
    const ctx: InterpolationContext = {
      ...baseCtx,
      prior_pass: '',
      pass_title: outlinePass.title,
      target_words: String(outlinePass.target_words),
    };
    outlineResult = await executePass(client, outlinePass, doc, ctx, soloRuns);
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
      const words = cached.split(/\s+/).filter(Boolean).length;
      const xrefs = countCrossRefs(cached).total;
      console.log(`    ✓ Pass ${pass.id} cached: ${words}w · ${xrefs} xrefs`);
      results.push({ pass, content: cached, words, xrefs, latency_ms: 0, model: pass.model ?? SYNTH_MODELS.PRIMARY });
      assembled += '\n\n' + cached;
      continue;
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
    const result = await executePass(client, pass, doc, ctx, soloRuns);
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

  // ─── Load mode doc ────────────────────────────────────────────────
  const modeDocPath = resolve(
    new URL(import.meta.url).pathname,
    '..',
    'integratedreading/modes',
    `${args.mode}.md`,
  );
  if (!existsSync(modeDocPath)) {
    throw new Error(`Mode doc not found: ${modeDocPath}\nAvailable modes: ${listAvailableModes().join(', ')}`);
  }
  const doc = parseModeDoc(modeDocPath);
  console.log('═══ integratedreading-mode ═══');
  console.log(`  Mode:        ${doc.frontmatter.mode}`);
  console.log(`  Architecture: ${doc.frontmatter.architecture}`);
  console.log(`  Topology:    ${doc.frontmatter.svg_topology}`);
  console.log(`  Passes:      ${doc.frontmatter.pass_plan.length}`);
  console.log(`  Target:      ${doc.frontmatter.target_words.min}–${doc.frontmatter.target_words.max} words`);

  // ─── Load subjects ────────────────────────────────────────────────
  const subjects = loadSubjects(args.subjectsDir);
  const sc = doc.frontmatter.subject_count;
  if (subjects.length < sc.min || subjects.length > sc.max) {
    throw new Error(`Mode '${args.mode}' requires ${sc.min === sc.max ? sc.min : `${sc.min}-${sc.max}`} subjects; found ${subjects.length}`);
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
  const client = new NvidiaClient(loadNvidiaKey());
  const baseCtx: Omit<InterpolationContext, 'prior_pass' | 'pass_title' | 'target_words'> = {
    subject_names: subjects.map((s) => s.subject).join(', '),
    subject_roster: subjects.map((s, i) => `${i + 1}. ${s.subject}${s.lagna ? ` — ${s.lagna} Lagna` : ''}${s.atmakaraka ? `, AK ${s.atmakaraka}` : ''}`).join('\n'),
    lessons_summary: summarizeLessons(doc.lessons),
    overlay_summary: buildOverlaySummary(doc),
    bridge_mandates: buildBridgeMandates(doc),
  };

  const passes = doc.frontmatter.architecture === 'hierarchical'
    ? await runHierarchical(client, doc, baseCtx, soloRuns, runDir)
    : await runLinear(client, doc, baseCtx, soloRuns, runDir);

  // ─── Assemble + render ───────────────────────────────────────────
  const report = assemble(passes);
  const assembledPath = join(runDir, `${runSlug}.md`);
  await writeFile(assembledPath, report.markdown);
  console.log(`\n✓ Assembled: ${assembledPath} (${report.total_words.toLocaleString()} words · ${report.total_xrefs} cross-refs)`);

  // Metric report
  const metricPath = join(runDir, `metrics_${runSlug}.json`);
  await writeFile(metricPath, JSON.stringify(report, null, 2));
  console.log(`✓ Metrics:   ${metricPath}`);

  // ─── SVG topology dispatch ───────────────────────────────────────
  const topology = doc.frontmatter.svg_topology;
  let svgString = '';
  try {
    if (topology === 'dyad-arc' && subjects.length === 2) {
      svgString = renderByTopology(topology, buildDyadSvgData(subjects), { width: 640 });
    } else if (topology === 'triad-triangle' && subjects.length === 3) {
      svgString = renderByTopology(topology, buildTriadSvgData(subjects), { width: 720 });
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
  console.log(`  Total words: ${report.total_words.toLocaleString()} (target ${doc.frontmatter.target_words.min}-${doc.frontmatter.target_words.max})`);
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
  try {
    return execSync('pandoc -f markdown -t html5 --syntax-highlighting=none', {
      input: md,
      encoding: 'utf-8',
    });
  } catch {
    return md
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .split(/\n\n+/).map((p) => p.startsWith('<') ? p : `<p>${p}</p>`).join('\n');
  }
}

function listAvailableModes(): string[] {
  const modesDir = resolve(new URL(import.meta.url).pathname, '..', 'integratedreading/modes');
  if (!existsSync(modesDir)) return [];
  return readdirSync(modesDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => f.replace(/\.md$/, ''));
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

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
