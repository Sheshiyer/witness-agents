// ─── /integratedreading — Render from Pre-existing DOCX ─────────────
// Bypasses the NVIDIA pipeline. Takes an integrated-reading DOCX (or MD)
// that's already authored, chunks it into the 11-Part structure, and
// renders through our HTML template with all generative SVGs.
//
// Usage:
//   node --import tsx scripts/render-from-docx.ts <config.json>
//
// Config shape:
//   {
//     "source_path": "/path/to/Reading.docx",
//     "subject": "Mohan Kumar V",
//     "birth_date": "1995-11-17",
//     "birth_time": "11:10",
//     "birth_place": "Tiruchirappalli, Tamil Nadu",
//     "lagna": "capricorn",
//     "atmakaraka": "mercury",
//     "placements": [{planet, sign, house, retrograde?, degree?}, ...],
//     "mahadasha": { current_lord, current_ends_iso, next_lord, next_starts_iso, next_duration_years, antardashas: [...] },
//     "pancha_bhuta": { fire, earth, water, air, ether },
//     "context_sidebar_html": "<aside>...</aside>",   // optional injection in Part IV
//     "output_dir": "/path/to/output",
//     "pdf": true
//   }

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, basename, dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

import { renderHTMLPage, renderPart, renderViz, type CoverData } from './integratedreading/render/templates.js';
import { renderMahadashaTimeline } from './integratedreading/render/svg/mahadasha-timeline.js';
import { renderKoshaStack } from './integratedreading/render/svg/kosha-stack.js';
import { renderKundaliChart } from './integratedreading/render/svg/kundali-chart.js';
import { renderSelemeneWheel } from './integratedreading/render/svg/selemene-wheel.js';
import { renderPanchaBhuta } from './integratedreading/render/svg/pancha-bhuta.js';
import { fetchAllEngines, loadSelemeneKey, type SelemeneEngineOutput, type BirthData } from './integratedreading/selemene/fetcher.js';
import { toWheelInputs, toKoshaLayerSignals, toMahadashaInput, computePanchaBhuta } from './integratedreading/selemene/mapper.js';

// ──────────────────────────────────────────────────────────────────────
// Markdown → HTML via pandoc
// ──────────────────────────────────────────────────────────────────────

function mdToHtml(md: string): string {
  if (!md.trim()) return '';
  try {
    return execSync('pandoc -f markdown -t html5 --syntax-highlighting=none', {
      input: md, encoding: 'utf-8',
    });
  } catch {
    return md.split(/\n\n+/).map((p) => `<p>${p}</p>`).join('\n');
  }
}

// ──────────────────────────────────────────────────────────────────────
// DOCX → Markdown extraction
// ──────────────────────────────────────────────────────────────────────

function extractToMarkdown(sourcePath: string): string {
  const ext = sourcePath.toLowerCase().split('.').pop();
  if (ext === 'md' || ext === 'txt') {
    return require('node:fs').readFileSync(sourcePath, 'utf-8');
  }
  if (ext === 'docx') {
    return execSync(`pandoc -f docx -t markdown "${sourcePath}"`, { encoding: 'utf-8' });
  }
  throw new Error(`Unsupported source extension: ${ext}`);
}

// ──────────────────────────────────────────────────────────────────────
// Chunk markdown into 11 Parts
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
  // Source DOCX uses **Part X --- Title** bold-text headers (pandoc converts them as such).
  // Normalize first: any line starting with **Part X --- becomes ## Part X — for downstream consistency.
  const normalized = md
    .replace(/^\*\*Part ([IVX]+) ---?\s*([^*]+)\*\*/gm, '## Part $1 — $2')
    .replace(/^\*\*Opening ---?\s*([^*]+)\*\*/gm, '## Opening — $1')
    .replace(/^\*\*([0-9]+\.[0-9]+)\s+([^*]+?)\*\*/gm, '### $1 $2');

  // Split on '## ' headers (preserve leading \n for first-line case)
  const sections = ('\n' + normalized).split(/\n## /);
  // sections[0] is everything before first ## (preface/title block)
  for (let i = 1; i < sections.length; i++) {
    const block = sections[i];
    const head = block.split('\n')[0];
    const body = '## ' + block;
    if (/^opening/i.test(head)) chunks.opening = body;
    else {
      const match = head.match(/^Part\s+([IVX]+)/i);
      if (match) {
        const n = ROMAN_TO_NUM[match[1].toUpperCase()];
        if (n) chunks[`part${n}` as keyof ReadingChunks] = body;
      }
    }
  }
  // If no opening matched, take the prelude (everything before Part I) as opening
  if (!chunks.opening) {
    const beforePart1 = normalized.split(/\n## Part I/)[0];
    chunks.opening = '## Opening — A Note Before Reading\n\n' + beforePart1.split(/\n\n/).slice(-3).join('\n\n');
  }
  return chunks;
}

// ──────────────────────────────────────────────────────────────────────
// HTML assembly with SVG insertions
// ──────────────────────────────────────────────────────────────────────

interface RenderConfig {
  source_path: string;
  subject: string;
  birth_date: string;
  birth_time?: string;
  birth_place?: string;
  lagna: string;
  atmakaraka?: string;
  placements: Array<{ planet: string; sign: string; house?: number; retrograde?: boolean; degree?: string; condition?: string }>;
  mahadasha: { current_lord: string; current_ends_iso?: string; next_lord: string; next_starts_iso?: string; next_duration_years: number; antardashas?: any[] };
  pancha_bhuta: { fire: number; earth: number; water: number; air: number; ether: number };
  context_sidebar_html?: string;     // injection in Part IV (Career)
  output_dir: string;
  pdf?: boolean;
}

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

function assembleBody(chunks: ReadingChunks, cfg: RenderConfig, selemene?: SelemeneEngineOutput[]): string {
  let body = '';

  // Opening
  if (chunks.opening) {
    body += `<section class="opening">${mdToHtml(chunks.opening)}</section>`;
  }

  // Data-driven visualizations only.
  // When Selemene data is available, Selemene wheel + Kosha mandala are populated from real engine signals.
  // When absent, those vizs are omitted entirely (no decorative empty graphs).

  const hasPlacements = Array.isArray(cfg.placements) && cfg.placements.length > 0;
  const hasSelemene = Array.isArray(selemene) && selemene.length > 0 && selemene.some((o) => !o._error);

  // Mahadasha: prefer real Vimshottari data (Swiss Ephemeris) over config-supplied fallback
  const vimEngine = selemene?.find((o) => o.engine_id === 'vimshottari');
  const selemeneMahadasha = vimEngine ? toMahadashaInput(vimEngine) : undefined;
  const mdData = selemeneMahadasha ?? (cfg.mahadasha?.current_lord ? cfg.mahadasha : undefined);

  // Pancha Bhuta: prefer placement-derived computation (deterministic) over config-supplied
  const placementPB = hasPlacements ? computePanchaBhuta(cfg.placements) : undefined;
  const pbData = placementPB && Object.values(placementPB).some((v) => v > 0)
    ? placementPB
    : (cfg.pancha_bhuta && Object.values(cfg.pancha_bhuta).some((v) => Number(v) > 0) ? cfg.pancha_bhuta : undefined);

  const kundali = hasPlacements ? renderKundaliChart({
    lagna: cfg.lagna,
    placements: cfg.placements as any,
    atmakaraka: cfg.atmakaraka,
    subject_name: cfg.subject,
  }, { width: 480 }) : '';
  const dashaTimeline = mdData ? renderMahadashaTimeline(mdData, { width: 720 }) : '';
  const panchaBhuta = pbData ? renderPanchaBhuta(pbData, { width: 420 }) : '';
  const selemeneWheel = hasSelemene ? renderSelemeneWheel(toWheelInputs(selemene!), { width: 540 }) : '';
  const koshaMandala = hasSelemene ? renderKoshaStack({
    width: 420,
    subject: cfg.subject,
    intensities: toKoshaLayerSignals(selemene!),
  }) : '';

  // Part I — Convergence Map + Selemene 16-engine wheel (if real data)
  body += renderPart(1, 'I', PART_META[0].title, PART_META[0].subtitle, mdToHtml(chunks.part1 || ''));
  if (selemeneWheel) {
    const okCount = selemene!.filter((o) => !o._error).length;
    body += renderViz(
      'The Sixteen-Engine Convergence',
      selemeneWheel,
      `Live Selemene engine output, ${okCount} of 16 engines returned signal. Each spoke is one engine — spoke length encodes signal strength from that engine\'s actual calculation for this birth-data. Spoke color names the Kosha layer the engine serves.`
    );
  }

  // Part II — Vedic Foundation + Kundali + Pancha Bhuta (both data-driven)
  body += renderPart(2, 'II', PART_META[1].title, PART_META[1].subtitle, mdToHtml(chunks.part2 || ''));
  if (kundali) {
    body += renderViz(
      'Vedic D-1 · Rashi Chart',
      kundali,
      'South Indian-style natal chart. The Lagna (rising sign) is tinted gold. Each planet glyph sits in its actual natal sign-cell. The Atmakaraka — soul-significator — carries a gold dot.'
    );
  }
  if (panchaBhuta) {
    body += renderViz(
      'Pancha Bhuta · Five-Element Distribution',
      panchaBhuta,
      'The chart\'s elemental signature, counted from actual planetary placements. The vertex carrying the most weight names the body\'s native element — the soma that organizes everything else.'
    );
  }

  // Part III — Karmic Architecture
  body += renderPart(3, 'III', PART_META[2].title, PART_META[2].subtitle, mdToHtml(chunks.part3 || ''));

  // Part IV — Career & Dharma (optional sidebar)
  let part4Content = mdToHtml(chunks.part4 || '');
  if (cfg.context_sidebar_html) {
    part4Content += cfg.context_sidebar_html;
  }
  body += renderPart(4, 'IV', PART_META[3].title, PART_META[3].subtitle, part4Content);

  // Part V — Wealth
  body += renderPart(5, 'V', PART_META[4].title, PART_META[4].subtitle, mdToHtml(chunks.part5 || ''));

  // Part VI — Marriage
  body += renderPart(6, 'VI', PART_META[5].title, PART_META[5].subtitle, mdToHtml(chunks.part6 || ''));

  // Part VII — Health + Kosha mandala (intensities driven by real per-layer engine signal)
  body += renderPart(7, 'VII', PART_META[6].title, PART_META[6].subtitle, mdToHtml(chunks.part7 || ''));
  if (koshaMandala) {
    body += renderViz(
      'Five-Layer Stack · Kosha Mandala',
      koshaMandala,
      'The five algebraic layers of consciousness rendered concentrically. Each ring\'s opacity + stroke weight comes from the average signal of engines actually routing to that layer (engine-count + intensity-% badge per ring). Inner ring = the still-point; outer ring = the body.'
    );
  }

  // Part VIII — Family/Roots
  body += renderPart(8, 'VIII', PART_META[7].title, PART_META[7].subtitle, mdToHtml(chunks.part8 || ''));

  // Part IX — Master Timeline + Mahadasha timeline (data-driven)
  body += renderPart(9, 'IX', PART_META[8].title, PART_META[8].subtitle, mdToHtml(chunks.part9 || ''));
  if (dashaTimeline) {
    body += renderViz(
      'Mahadasha Timeline',
      dashaTimeline,
      'The closing dasha hands over to the opening dasha. Antardasha sub-bars show the next sub-periods. The pulsing dot marks the present moment; the gold arrow marks the precise pivot timestamp.'
    );
  }

  // Part X — Practices & Anti-Dependency
  body += renderPart(10, 'X', PART_META[9].title, PART_META[9].subtitle, mdToHtml(chunks.part10 || ''));

  // Part XI — Final Synthesis
  body += renderPart(11, 'XI', PART_META[10].title, PART_META[10].subtitle, mdToHtml(chunks.part11 || ''));

  return body;
}

// ──────────────────────────────────────────────────────────────────────
// PDF export via Chrome headless
// ──────────────────────────────────────────────────────────────────────

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function exportPDF(htmlPath: string, pdfPath: string): boolean {
  if (!existsSync(CHROME_BIN)) {
    console.warn(`  ⚠ Chrome not found — skipping PDF`);
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
        --virtual-time-budget=10000 \
        --hide-scrollbars \
        "${fileUrl}"`,
      { stdio: 'pipe', timeout: 90_000 }
    );
    return existsSync(pdfPath);
  } catch (err: any) {
    console.warn(`  ⚠ PDF failed: ${err.message.slice(0, 100)}`);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────

async function main() {
  const configPath = process.argv[2];
  if (!configPath) { console.error('Usage: render-from-docx.ts <config.json>'); process.exit(1); }
  const cfg: RenderConfig = JSON.parse(await readFile(configPath, 'utf-8'));
  const noSelemene = process.argv.includes('--no-selemene');

  console.log(`═══ render-from-docx ═══`);
  console.log(`  Subject: ${cfg.subject}`);
  console.log(`  Source:  ${cfg.source_path}`);
  console.log(`  Output:  ${cfg.output_dir}`);

  // 1. Extract source
  const md = extractToMarkdown(cfg.source_path);
  console.log(`  ✓ Extracted ${md.length.toLocaleString()} chars from source`);

  // 2. Chunk
  const chunks = chunkMarkdown(md);
  const partsFound = Object.keys(chunks).filter((k) => chunks[k as keyof ReadingChunks]).length;
  console.log(`  ✓ Chunked into ${partsFound} sections: ${Object.keys(chunks).filter((k) => chunks[k as keyof ReadingChunks]).join(', ')}`);

  // 3. Fetch Selemene engine data (if key present and not --no-selemene)
  let selemeneOutputs: SelemeneEngineOutput[] | undefined;
  if (!noSelemene) {
    const key = await loadSelemeneKey();
    if (key) {
      const birthData: BirthData = {
        date: cfg.birth_date,
        time: cfg.birth_time,
        timezone: 'Asia/Kolkata',
        // latitude/longitude are derived from birth_place — for now, we accept whatever's in cfg
      };
      // Allow config-supplied lat/lon to override
      if ((cfg as any).latitude) birthData.latitude = (cfg as any).latitude;
      if ((cfg as any).longitude) birthData.longitude = (cfg as any).longitude;
      const t0 = Date.now();
      console.log(`  → Fetching 16 Selemene engines (parallel)...`);
      selemeneOutputs = await fetchAllEngines(birthData, { api_key: key });
      const ok = selemeneOutputs.filter((o) => !o._error).length;
      console.log(`  ✓ Selemene ${ok}/16 engines · ${Date.now() - t0}ms wall-clock`);
    } else {
      console.log(`  ⚠ No SELEMENE_API_KEY in env — skipping Selemene fetch (data-driven viz limited)`);
    }
  } else {
    console.log(`  ⊘ --no-selemene flag — skipping Selemene fetch`);
  }

  // 4. Render HTML — cover uses the actual Vedic D-1 chart (real data),
  // not a decorative mandala. The chart IS the subject's identifying mark.
  const hasPlacements = Array.isArray(cfg.placements) && cfg.placements.length > 0;
  const coverSVG = hasPlacements
    ? renderKundaliChart({
        lagna: cfg.lagna,
        placements: cfg.placements as any,
        atmakaraka: cfg.atmakaraka,
        subject_name: cfg.subject,
      }, { width: 440 })
    : undefined;
  const body = assembleBody(chunks, cfg, selemeneOutputs);
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

  await mkdir(cfg.output_dir, { recursive: true });
  const slug = cfg.subject.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const htmlPath = join(cfg.output_dir, `${slug}-reading.html`);
  await writeFile(htmlPath, html);
  console.log(`  ✓ HTML → ${basename(htmlPath)} (${(html.length / 1024).toFixed(1)} KB)`);

  if (cfg.pdf !== false) {
    const pdfPath = htmlPath.replace(/\.html$/, '.pdf');
    if (exportPDF(htmlPath, pdfPath)) {
      console.log(`  ✓ PDF  → ${basename(pdfPath)}`);
    }
  }

  console.log('\n═══ COMPLETE ═══');
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
