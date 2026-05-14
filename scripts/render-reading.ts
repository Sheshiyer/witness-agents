// ─── /integratedreading — Render CLI (HTML + PDF) ───────────────────
// Reads cached pipeline outputs from .runs/<ts>/, produces branded HTML
// for each subject + composite, then exports to PDF via Chrome headless.
//
// Usage:
//   node --import tsx scripts/render-reading.ts <config.json> [--run <ts>] [--no-pdf]

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadAndRenderSolo, loadAndRenderComposite } from './integratedreading/render/html-renderer.js';

interface SubjectConfig {
  name: string;
  birth_date: string;
  birth_time?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}
interface RunConfig {
  subjects: SubjectConfig[];
  output_dir: string;
}

function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx > 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function exportPDF(htmlPath: string, pdfPath: string): Promise<boolean> {
  if (!existsSync(CHROME_BIN)) {
    console.warn(`  ⚠ Chrome not found at ${CHROME_BIN} — skipping PDF`);
    return false;
  }
  try {
    const fileUrl = 'file://' + htmlPath;
    execSync(
      `"${CHROME_BIN}" \
        --headless \
        --disable-gpu \
        --no-pdf-header-footer \
        --print-to-pdf-no-header \
        --print-to-pdf="${pdfPath}" \
        --virtual-time-budget=8000 \
        "${fileUrl}"`,
      { stdio: 'pipe', timeout: 60_000 }
    );
    return existsSync(pdfPath);
  } catch (err: any) {
    console.warn(`  ⚠ Chrome PDF export failed: ${err.message.slice(0, 100)}`);
    return false;
  }
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath || configPath.startsWith('--')) {
    console.error('Usage: render-reading.ts <config.json> [--run <ts>] [--no-pdf]');
    process.exit(1);
  }
  const cfg: RunConfig = JSON.parse(await readFile(configPath, 'utf-8'));
  const outputDir = resolve(cfg.output_dir);
  const noPDF = hasFlag('no-pdf');

  // Find latest .runs subdir
  const runOverride = getArg('run');
  const runsRoot = join(outputDir, '.runs');
  let runTs: string;
  if (runOverride) {
    runTs = runOverride;
  } else {
    const runDirs = existsSync(runsRoot)
      ? readdirSync(runsRoot).filter((d) => /^\d{4}-/.test(d)).sort().reverse()
      : [];
    if (runDirs.length === 0) { console.error('FATAL: no .runs/ — pipeline must run first'); process.exit(1); }
    runTs = runDirs[0];
  }
  const runDir = join(runsRoot, runTs);
  console.log('═══ render-reading ═══');
  console.log(`  Run dir:  ${runDir}`);
  console.log(`  Subjects: ${cfg.subjects.map((s) => s.name).join(' × ')}`);
  console.log(`  PDF:      ${noPDF ? 'disabled' : 'via Chrome headless'}`);

  // Render each subject solo
  for (const subject of cfg.subjects) {
    const slug = subject.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    console.log(`\n  ▸ ${subject.name}`);
    const html = loadAndRenderSolo({
      subject: subject.name,
      slug,
      run_dir: runDir,
      birth_data: {
        date: subject.birth_date,
        time: subject.birth_time,
        timezone: subject.timezone,
      },
    });
    const htmlPath = join(outputDir, `02_NVIDIA_Reading_${subject.name}.html`);
    await writeFile(htmlPath, html);
    console.log(`     ✓ HTML → ${basename(htmlPath)} (${(html.length/1024).toFixed(1)} KB)`);

    if (!noPDF) {
      const pdfPath = join(outputDir, `02_NVIDIA_Reading_${subject.name}.pdf`);
      const ok = await exportPDF(htmlPath, pdfPath);
      if (ok) console.log(`     ✓ PDF  → ${basename(pdfPath)}`);
    }
  }

  // Render composite (if dyad)
  if (cfg.subjects.length === 2) {
    const a = cfg.subjects[0], b = cfg.subjects[1];
    const slugA = a.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const slugB = b.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    console.log(`\n  ▸ Composite (${a.name} × ${b.name})`);
    const html = loadAndRenderComposite({
      subject_a: a.name, slug_a: slugA,
      subject_b: b.name, slug_b: slugB,
      run_dir: runDir,
    });
    const htmlPath = join(outputDir, `03_NVIDIA_Composite.html`);
    await writeFile(htmlPath, html);
    console.log(`     ✓ HTML → ${basename(htmlPath)} (${(html.length/1024).toFixed(1)} KB)`);

    if (!noPDF) {
      const pdfPath = join(outputDir, `03_NVIDIA_Composite.pdf`);
      const ok = await exportPDF(htmlPath, pdfPath);
      if (ok) console.log(`     ✓ PDF  → ${basename(pdfPath)}`);
    }
  }

  console.log('\n═══ COMPLETE ═══');
  console.log('  Open the HTML files in any modern browser — or print the PDFs directly.');
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
