// ─── /integratedreading — Synastry / Composite Mode ─────────────────
// Takes two completed solo readings (their .runs/<ts>/06_synthesis_*.md outputs)
// and produces a dyadic composite reading + HTML/PDF.
//
// Honors Hardened Reference Data principle: chart placements come from each
// subject's config (docx-extracted). Selemene cross-resonance is augmentation,
// not source of truth.
//
// Usage:
//   node --import tsx scripts/integratedreading-composite.ts \
//     --subject-a <subject-a-config.json> \
//     --subject-b <subject-b-config.json> \
//     --output-dir <dir> \
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
  compositePrompt,
} from './integratedreading/system-prompts.js';
import { renderHTMLPage, renderPart, renderViz } from './integratedreading/render/templates.js';
import { renderCompositeResonance } from './integratedreading/render/svg/composite-resonance.js';
import { renderKundaliChart } from './integratedreading/render/svg/kundali-chart.js';

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

async function main() {
  const configA = getArg('subject-a');
  const configB = getArg('subject-b');
  const outputDir = getArg('output-dir') || '/tmp/composite-output';
  const useCache = hasFlag('use-cache');
  if (!configA || !configB) {
    console.error('Usage: integratedreading-composite.ts --subject-a <cfg.json> --subject-b <cfg.json> --output-dir <dir>');
    process.exit(1);
  }

  const cfgA: SubjectConfig = JSON.parse(await readFile(configA, 'utf-8'));
  const cfgB: SubjectConfig = JSON.parse(await readFile(configB, 'utf-8'));
  const slugA = slugify(cfgA.subject);
  const slugB = slugify(cfgB.subject);
  const dyadSlug = `${slugA}-x-${slugB}`;

  await mkdir(outputDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runsRoot = join(outputDir, '.runs');
  await mkdir(runsRoot, { recursive: true });
  // For --use-cache, find the most recent prior run that contains a cached
  // composite synthesis so we can reuse it. Otherwise create a fresh run.
  const compositeCacheName = `08_composite_${dyadSlug}.md`;
  let priorRunDir: string | undefined;
  if (useCache && existsSync(runsRoot)) {
    const candidates = readdirSync(runsRoot)
      .filter((d) => /^\d{4}-\d{2}-\d{2}T/.test(d))
      .sort()
      .reverse();
    priorRunDir = candidates.find((d) => existsSync(join(runsRoot, d, compositeCacheName)));
  }
  const runDir = join(runsRoot, priorRunDir ?? ts);
  await mkdir(runDir, { recursive: true });

  console.log('═══ integratedreading-composite ═══');
  console.log(`  Subject A: ${cfgA.subject}`);
  console.log(`  Subject B: ${cfgB.subject}`);
  console.log(`  Output:    ${outputDir}`);
  console.log(`  Run:       ${runDir}`);

  // Load both subjects' synthesis from their respective .runs/<ts>/ dirs
  const runDirA = findLatestRun(cfgA.output_dir, slugA);
  const runDirB = findLatestRun(cfgB.output_dir, slugB);
  if (!runDirA || !runDirB) {
    console.error(`FATAL: Could not find synthesis for both subjects. Run solo pipelines first.`);
    console.error(`  A run dir: ${runDirA || '(not found)'}`);
    console.error(`  B run dir: ${runDirB || '(not found)'}`);
    process.exit(1);
  }
  const synthA = await readFile(join(runDirA, `06_synthesis_${slugA}.md`), 'utf-8');
  const synthB = await readFile(join(runDirB, `06_synthesis_${slugB}.md`), 'utf-8');
  console.log(`  ✓ Loaded synthesis A (${synthA.split(/\s+/).length.toLocaleString()} words)`);
  console.log(`  ✓ Loaded synthesis B (${synthB.split(/\s+/).length.toLocaleString()} words)`);

  // Cross-resonance derived from BOTH docx mahadasha values (hardened truth, no Selemene drift)
  const crossResonance = {
    a_mahadasha: cfgA.mahadasha,
    b_mahadasha: cfgB.mahadasha,
    mahadasha_overlap_window: cfgA.mahadasha && cfgB.mahadasha ? {
      a_pivot: cfgA.mahadasha.current_ends_iso,
      b_pivot: cfgB.mahadasha.current_ends_iso,
      grace_node_joint_years: Math.min(cfgA.mahadasha.next_duration_years || 0, cfgB.mahadasha.next_duration_years || 0),
    } : null,
    a_atmakaraka: cfgA.atmakaraka,
    b_atmakaraka: cfgB.atmakaraka,
    note: cfgA.atmakaraka && cfgB.atmakaraka && cfgA.atmakaraka.toLowerCase() === cfgB.atmakaraka.toLowerCase()
      ? `Shared Atmakaraka: ${cfgA.atmakaraka} — same soul-signifier graha in both charts (rare Vijnanamaya-layer coupling).`
      : `Different Atmakarakas (${cfgA.atmakaraka} vs ${cfgB.atmakaraka}) — complementary soul-signifier configuration.`,
  };

  // Run composite synthesis via NVIDIA (gpt-oss-120b, single pass — composite is shorter than solo)
  const compositeCachePath = join(runDir, `08_composite_${dyadSlug}.md`);
  let composite: string;
  if (useCache && existsSync(compositeCachePath)) {
    composite = await readFile(compositeCachePath, 'utf-8');
    console.log(`  ✓ Composite cached`);
  } else {
    console.log(`  → Composite synthesis (gpt-oss-120b)...`);
    const nvidia = new NvidiaClient(loadNvidiaKey());
    const res = await nvidia.callWithRetry({
      model: MODELS.GPT_OSS_120B,
      messages: [
        { role: 'system', content: ANATOMIST_PERSONA + '\n\n' + KOSHA_GRAMMAR + '\n\n' + DYADIC_LOOP },
        { role: 'user', content: compositePrompt(cfgA.subject, cfgB.subject, synthA, synthB, crossResonance) },
      ],
      max_tokens: 8192, temperature: 0.5, timeout_ms: 300_000,
    });
    composite = res.content;
    await writeFile(compositeCachePath, composite);
    console.log(`    ✓ ${res.latency_ms}ms · ${res.completion_tokens}tk · ${composite.length} chars`);
  }
  const wordCount = composite.split(/\s+/).filter(Boolean).length;
  console.log(`  ✓ Composite synthesis: ${wordCount.toLocaleString()} words`);

  // Build composite-resonance SVG from docx-hardened mahadasha (NOT Selemene)
  const sharedAk = cfgA.atmakaraka && cfgB.atmakaraka && cfgA.atmakaraka.toLowerCase() === cfgB.atmakaraka.toLowerCase()
    ? cfgA.atmakaraka : undefined;
  const compositeSvg = renderCompositeResonance({
    subject_a: cfgA.subject,
    subject_b: cfgB.subject,
    a_mahadasha: cfgA.mahadasha ? {
      current: cfgA.mahadasha.current_lord,
      next: cfgA.mahadasha.next_lord,
      transition_iso: cfgA.mahadasha.current_ends_iso,
    } : undefined,
    b_mahadasha: cfgB.mahadasha ? {
      current: cfgB.mahadasha.current_lord,
      next: cfgB.mahadasha.next_lord,
      transition_iso: cfgB.mahadasha.current_ends_iso,
    } : undefined,
    electromagnetic_channels: ['24-61 Awareness', '32-54 Transformation', '28-38 Struggle'],
    companionship_gates: ['31', '62', '42', '46', '52'],
    shared_atmakaraka: sharedAk,
  }, { width: 640 });

  const kundaliA = renderKundaliChart({
    lagna: cfgA.lagna,
    placements: cfgA.placements,
    atmakaraka: cfgA.atmakaraka,
    subject_name: cfgA.subject,
  }, { width: 400 });
  const kundaliB = renderKundaliChart({
    lagna: cfgB.lagna,
    placements: cfgB.placements,
    atmakaraka: cfgB.atmakaraka,
    subject_name: cfgB.subject,
  }, { width: 400 });

  // Assemble composite body — opening + sections + composite SVG + dual Kundalis
  let body = '';
  const sections = composite.split(/\n## /);
  body += `<section class="opening">${mdToHtml(sections[0] || '')}</section>`;
  for (let i = 1; i < sections.length; i++) {
    body += `<section>${mdToHtml('## ' + sections[i])}</section>`;
    if (i === 1) {
      body += renderViz('The Composite Field', compositeSvg,
        'Two charts in resonance. The luminous threads between the arcs name the electromagnetic channels you make as a pair that neither chart has alone. The paired pivots mark the simultaneous Mahadasha transitions.');
      body += `<div style="display:flex;gap:20px;margin:32px 0;page-break-inside:avoid;">
        <figure class="viz" style="flex:1;margin:0;"><div class="viz-title">${cfgA.subject} · Rashi</div>${kundaliA}</figure>
        <figure class="viz" style="flex:1;margin:0;"><div class="viz-title">${cfgB.subject} · Rashi</div>${kundaliB}</figure>
      </div>`;
    }
  }

  const html = renderHTMLPage({
    title: `Composite Field — ${cfgA.subject} × ${cfgB.subject}`,
    cover: {
      subject: `${cfgA.subject} × ${cfgB.subject}`,
      birth_date: '',
      cover_mandala_svg: compositeSvg,
    },
    body,
    is_composite: true,
    composite_subject_a: cfgA.subject,
    composite_subject_b: cfgB.subject,
  });

  const htmlPath = join(outputDir, `${dyadSlug}-composite.html`);
  await writeFile(htmlPath, html);
  console.log(`  ✓ HTML → ${basename(htmlPath)} (${(html.length / 1024).toFixed(1)} KB)`);

  const pdfPath = htmlPath.replace(/\.html$/, '.pdf');
  if (exportPDF(htmlPath, pdfPath)) {
    console.log(`  ✓ PDF  → ${basename(pdfPath)}`);
  }

  console.log('\n═══ COMPOSITE COMPLETE ═══');
  console.log(`  Word count: ${wordCount.toLocaleString()}`);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
