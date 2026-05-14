// ─── /integratedreading — Triad Synastry (3-subject composite) ──────
// Takes three completed solo readings and produces a 5500-7000 word
// triadic composite reading + HTML/PDF with the triad-resonance SVG.
//
// Usage:
//   node --import tsx scripts/integratedreading-triad.ts \
//     --subject-a <a-cfg.json> \
//     --subject-b <b-cfg.json> \
//     --subject-c <c-cfg.json> \
//     --output-dir <dir>
//     [--use-cache]

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
  triadCompositePrompt,
} from './integratedreading/system-prompts.js';
import {
  renderHTMLPage, renderViz, renderVizPlate, renderVizTrio,
  renderFigIndex, createFigureRegistry,
} from './integratedreading/render/templates.js';
import { renderCompositeTriad } from './integratedreading/render/svg/composite-triad.js';
import { renderKundaliChart } from './integratedreading/render/svg/kundali-chart.js';
import { BRAND } from './integratedreading/render/styles.js';

// ──────────────────────────────────────────────────────────────────────

interface SubjectConfig {
  source_path?: string;
  subject: string;
  birth_date: string;
  birth_time?: string;
  birth_place?: string;
  lagna: string;
  atmakaraka?: string;
  placements: any[];
  mahadasha?: {
    current_lord: string;
    current_ends_iso?: string;
    next_lord: string;
    next_starts_iso?: string;
    next_duration_years?: number;
  };
  output_dir: string;
}

function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx > 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}
function hasFlag(name: string): boolean { return process.argv.includes(`--${name}`); }

function loadNvidiaKey(): string {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
  const envPath = join(homedir(), '.claude', '.env');
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf-8').match(/^NVIDIA_API_KEY=(\S+)/m);
    if (m) { process.env.NVIDIA_API_KEY = m[1]; return m[1]; }
  }
  throw new Error('NVIDIA_API_KEY not found in env');
}

function mdToHtml(md: string): string {
  if (!md.trim()) return '';
  try {
    return execSync('pandoc -f markdown -t html5 --syntax-highlighting=none', { input: md, encoding: 'utf-8' });
  } catch { return md.split(/\n\n+/).map((p) => `<p>${p}</p>`).join('\n'); }
}

function findLatestRun(outputDir: string, slug: string): string | undefined {
  const runsRoot = join(outputDir, '.runs');
  if (!existsSync(runsRoot)) return undefined;
  const dirs = readdirSync(runsRoot).filter((d) => /^\d{4}-/.test(d)).sort().reverse();
  for (const d of dirs) {
    const synthPath = join(runsRoot, d, `06_synthesis_${slug}.md`);
    if (existsSync(synthPath)) return join(runsRoot, d);
  }
  return undefined;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
}

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

async function main() {
  const configA = getArg('subject-a');
  const configB = getArg('subject-b');
  const configC = getArg('subject-c');
  const outputDir = getArg('output-dir') || '/tmp/triad-output';
  const useCache = hasFlag('use-cache');
  if (!configA || !configB || !configC) {
    console.error('Usage: integratedreading-triad.ts --subject-a <cfg> --subject-b <cfg> --subject-c <cfg> --output-dir <dir>');
    process.exit(1);
  }

  const cfgA: SubjectConfig = JSON.parse(await readFile(configA, 'utf-8'));
  const cfgB: SubjectConfig = JSON.parse(await readFile(configB, 'utf-8'));
  const cfgC: SubjectConfig = JSON.parse(await readFile(configC, 'utf-8'));
  const slugA = slugify(cfgA.subject);
  const slugB = slugify(cfgB.subject);
  const slugC = slugify(cfgC.subject);
  const triadSlug = `${slugA}-x-${slugB}-x-${slugC}`;

  await mkdir(outputDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runsRoot = join(outputDir, '.runs');
  await mkdir(runsRoot, { recursive: true });
  // For --use-cache, find the most recent prior run that contains a cached
  // triad synthesis so we can reuse it. Otherwise create a fresh run.
  const triadCacheName = `08_triad_${triadSlug}.md`;
  let priorRunDir: string | undefined;
  if (useCache && existsSync(runsRoot)) {
    const candidates = readdirSync(runsRoot)
      .filter((d) => /^\d{4}-\d{2}-\d{2}T/.test(d))
      .sort()
      .reverse();
    priorRunDir = candidates.find((d) => existsSync(join(runsRoot, d, triadCacheName)));
  }
  const runDir = join(runsRoot, priorRunDir ?? ts);
  await mkdir(runDir, { recursive: true });

  console.log('═══ integratedreading-triad ═══');
  console.log(`  A: ${cfgA.subject}`);
  console.log(`  B: ${cfgB.subject}`);
  console.log(`  C: ${cfgC.subject}`);
  console.log(`  Output: ${outputDir}`);

  // Load all three solo syntheses
  const runDirA = findLatestRun(cfgA.output_dir, slugA);
  const runDirB = findLatestRun(cfgB.output_dir, slugB);
  const runDirC = findLatestRun(cfgC.output_dir, slugC);
  if (!runDirA || !runDirB || !runDirC) {
    console.error(`FATAL: Need all 3 solo readings completed first.`);
    console.error(`  A: ${runDirA || '(missing)'}`);
    console.error(`  B: ${runDirB || '(missing)'}`);
    console.error(`  C: ${runDirC || '(missing)'}`);
    process.exit(1);
  }
  const synthA = await readFile(join(runDirA, `06_synthesis_${slugA}.md`), 'utf-8');
  const synthB = await readFile(join(runDirB, `06_synthesis_${slugB}.md`), 'utf-8');
  const synthC = await readFile(join(runDirC, `06_synthesis_${slugC}.md`), 'utf-8');
  console.log(`  ✓ A synthesis (${synthA.split(/\s+/).length.toLocaleString()} words)`);
  console.log(`  ✓ B synthesis (${synthB.split(/\s+/).length.toLocaleString()} words)`);
  console.log(`  ✓ C synthesis (${synthC.split(/\s+/).length.toLocaleString()} words)`);

  // Cross-resonance — derived from docx-hardened values
  const akA = cfgA.atmakaraka?.toLowerCase();
  const akB = cfgB.atmakaraka?.toLowerCase();
  const akC = cfgC.atmakaraka?.toLowerCase();
  const sharedAks: string[] = [];
  if (akA === akB && akA) sharedAks.push(`${cfgA.subject} × ${cfgB.subject}: shared Atmakaraka ${akA}`);
  if (akA === akC && akA) sharedAks.push(`${cfgA.subject} × ${cfgC.subject}: shared Atmakaraka ${akA}`);
  if (akB === akC && akB) sharedAks.push(`${cfgB.subject} × ${cfgC.subject}: shared Atmakaraka ${akB}`);

  const crossResonance = {
    subjects: [cfgA.subject, cfgB.subject, cfgC.subject],
    atmakarakas: { [cfgA.subject]: cfgA.atmakaraka, [cfgB.subject]: cfgB.atmakaraka, [cfgC.subject]: cfgC.atmakaraka },
    shared_atmakaraka_pairs: sharedAks,
    mahadasha_pivots: [
      cfgA.mahadasha ? { subject: cfgA.subject, current: cfgA.mahadasha.current_lord, next: cfgA.mahadasha.next_lord, pivot_iso: cfgA.mahadasha.current_ends_iso } : null,
      cfgB.mahadasha ? { subject: cfgB.subject, current: cfgB.mahadasha.current_lord, next: cfgB.mahadasha.next_lord, pivot_iso: cfgB.mahadasha.current_ends_iso } : null,
      cfgC.mahadasha ? { subject: cfgC.subject, current: cfgC.mahadasha.current_lord, next: cfgC.mahadasha.next_lord, pivot_iso: cfgC.mahadasha.current_ends_iso } : null,
    ].filter(Boolean),
    lagnas: { [cfgA.subject]: cfgA.lagna, [cfgB.subject]: cfgB.lagna, [cfgC.subject]: cfgC.lagna },
  };

  // Run triad composite synthesis
  const triadCachePath = join(runDir, `08_triad_${triadSlug}.md`);
  let triadSynthesis: string;
  if (useCache && existsSync(triadCachePath)) {
    triadSynthesis = await readFile(triadCachePath, 'utf-8');
    console.log(`  ✓ Triad cached`);
  } else {
    console.log(`  → Triad composite synthesis (gpt-oss-120b, single deep pass)...`);
    const nvidia = new NvidiaClient(loadNvidiaKey());
    const res = await nvidia.callWithRetry({
      model: MODELS.GPT_OSS_120B,
      messages: [
        { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
        { role: 'user', content: triadCompositePrompt(cfgA.subject, cfgB.subject, cfgC.subject, synthA, synthB, synthC, crossResonance) },
      ],
      max_tokens: 8192, temperature: 0.5, timeout_ms: 360_000,
    });
    triadSynthesis = res.content;
    await writeFile(triadCachePath, triadSynthesis);
    console.log(`    ✓ ${res.latency_ms}ms · ${res.completion_tokens}tk · ${triadSynthesis.length} chars`);
  }
  const wordCount = triadSynthesis.split(/\s+/).filter(Boolean).length;
  console.log(`  ✓ Triad synthesis: ${wordCount.toLocaleString()} words`);

  // Build triad-resonance SVG
  const subjects: any[] = [
    {
      name: cfgA.subject,
      arc_color: BRAND.coherenceEmerald,
      current_mahadasha_lord: cfgA.mahadasha?.current_lord,
      next_mahadasha_lord: cfgA.mahadasha?.next_lord,
      next_mahadasha_iso: cfgA.mahadasha?.current_ends_iso,
    },
    {
      name: cfgB.subject,
      arc_color: BRAND.flowIndigo,
      current_mahadasha_lord: cfgB.mahadasha?.current_lord,
      next_mahadasha_lord: cfgB.mahadasha?.next_lord,
      next_mahadasha_iso: cfgB.mahadasha?.current_ends_iso,
    },
    {
      name: cfgC.subject,
      arc_color: BRAND.sacredGold,
      current_mahadasha_lord: cfgC.mahadasha?.current_lord,
      next_mahadasha_lord: cfgC.mahadasha?.next_lord,
      next_mahadasha_iso: cfgC.mahadasha?.current_ends_iso,
    },
  ];
  const sharedKeys = sharedAks.length > 0
    ? sharedAks.map((s) => s.split(': shared ')[1])
    : ['Wheel of Fortune × Emperor × Hermit'];   // placeholder if no AK matches
  const triadSvg = renderCompositeTriad({
    subjects: subjects as any,
    shared_keys: sharedKeys,
  }, { width: 720 });

  // Three Kundali charts side-by-side
  const kA = renderKundaliChart({ lagna: cfgA.lagna, placements: cfgA.placements, atmakaraka: cfgA.atmakaraka, subject_name: cfgA.subject }, { width: 340 });
  const kB = renderKundaliChart({ lagna: cfgB.lagna, placements: cfgB.placements, atmakaraka: cfgB.atmakaraka, subject_name: cfgB.subject }, { width: 340 });
  const kC = renderKundaliChart({ lagna: cfgC.lagna, placements: cfgC.placements, atmakaraka: cfgC.atmakaraka, subject_name: cfgC.subject }, { width: 340 });

  // Assemble HTML body
  const figs = createFigureRegistry();
  let body = '';
  const sections = triadSynthesis.split(/\n## /);
  body += `<section class="opening">${mdToHtml(sections[0] || '')}</section>`;
  for (let i = 1; i < sections.length; i++) {
    body += `<section>${mdToHtml('## ' + sections[i])}</section>`;
    if (i === 1) {
      const tField = 'The Triadic Resonance Field';
      body += renderVizPlate({
        figNo: figs.next(tField),
        title: tField,
        svg: triadSvg,
        caption: 'Three bodies in a single archetypal triangle. Each subject occupies one vertex of the field; the gold threads name the pair-resonances. The center seed is the joint operative — what the three are structurally configured to author together.',
        attribution: 'Source: Selemene triad layer · DOCX-hardened pivots',
      });
      body += renderVizTrio(
        { figNo: figs.next(`${cfgA.subject} · Rashi`), title: `${cfgA.subject} · Rashi`, svg: kA,
          caption: `Lagna: ${cfgA.lagna}${cfgA.atmakaraka ? ' · AK: ' + cfgA.atmakaraka : ''}` },
        { figNo: figs.next(`${cfgB.subject} · Rashi`), title: `${cfgB.subject} · Rashi`, svg: kB,
          caption: `Lagna: ${cfgB.lagna}${cfgB.atmakaraka ? ' · AK: ' + cfgB.atmakaraka : ''}` },
        { figNo: figs.next(`${cfgC.subject} · Rashi`), title: `${cfgC.subject} · Rashi`, svg: kC,
          caption: `Lagna: ${cfgC.lagna}${cfgC.atmakaraka ? ' · AK: ' + cfgC.atmakaraka : ''}` },
      );
    }
  }

  const html = renderHTMLPage({
    title: `Composite Triad — ${cfgA.subject} × ${cfgB.subject} × ${cfgC.subject}`,
    cover: {
      subject: `${cfgA.subject} × ${cfgB.subject} × ${cfgC.subject}`,
      birth_date: '',
      cover_mandala_svg: triadSvg,
    },
    body,
    fig_index_html: renderFigIndex(figs.list()),
    is_composite: true,
    composite_subject_a: cfgA.subject,
    composite_subject_b: `${cfgB.subject} × ${cfgC.subject}`,
  });

  const htmlPath = join(outputDir, `${triadSlug}-triad.html`);
  await writeFile(htmlPath, html);
  console.log(`  ✓ HTML → ${basename(htmlPath)} (${(html.length / 1024).toFixed(1)} KB)`);

  const pdfPath = htmlPath.replace(/\.html$/, '.pdf');
  if (exportPDF(htmlPath, pdfPath)) {
    console.log(`  ✓ PDF  → ${basename(pdfPath)}`);
  }

  console.log('\n═══ TRIAD COMPLETE ═══');
  console.log(`  Word count: ${wordCount.toLocaleString()} (target 5500-7000)`);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
