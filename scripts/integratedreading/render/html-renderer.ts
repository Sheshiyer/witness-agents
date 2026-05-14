// ─── /integratedreading — HTML Renderer ─────────────────────────────
// Orchestrator: reads cached JSON + chunks → produces complete HTML doc
// with brand styling + SVG visualizations inserted at strategic Parts.

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import {
  renderHTMLPage, renderPart, renderViz, renderVizPlate, renderVizPair,
  renderTOC, renderFigIndex, createFigureRegistry, type CoverData, type TocEntry,
} from './templates.js';
import { renderMahadashaTimeline } from './svg/mahadasha-timeline.js';
import { renderKoshaStack } from './svg/kosha-stack.js';
import { renderKundaliChart } from './svg/kundali-chart.js';
import { renderSelemeneWheel } from './svg/selemene-wheel.js';
import { renderPanchaBhuta } from './svg/pancha-bhuta.js';
import { renderCompositeResonance } from './svg/composite-resonance.js';

// ──────────────────────────────────────────────────────────────────────
// Markdown → HTML (pandoc subprocess)
// ──────────────────────────────────────────────────────────────────────

function mdToHtml(md: string): string {
  if (!md.trim()) return '';
  try {
    const result = execSync('pandoc -f markdown -t html5 --syntax-highlighting=none', {
      input: md,
      encoding: 'utf-8',
    });
    return result;
  } catch (err: any) {
    // Fallback: minimal regex conversion for emergencies
    return md
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .split(/\n\n+/).map((p) => p.startsWith('<') ? p : `<p>${p}</p>`).join('\n');
  }
}

// ──────────────────────────────────────────────────────────────────────
// SVG insertion helpers
// ──────────────────────────────────────────────────────────────────────

function buildKundaliFromIngestion(ingestion: any, subject: string): string {
  const v = ingestion?.vedic || {};
  const placements = (v.planetary_placements || []).map((p: any) => ({
    planet: p.planet,
    sign: p.sign,
    retrograde: p.retrograde === true || p.retrograde === 'R' || p.retrograde === 'Yes',
    degree: p.deg,
    condition: p.condition,
  }));
  return renderKundaliChart({
    lagna: v.lagna || 'unknown',
    placements,
    atmakaraka: v.atmakaraka,
    subject_name: subject,
  }, { width: 480 });
}

function buildMahadashaSvg(ingestion: any, astroMath: any): string {
  const md = ingestion?.mahadasha || {};
  const antardashas = astroMath?.antardasha_first_24mo || md.antardashas || [];
  return renderMahadashaTimeline({
    current_lord: md.current_lord || 'rahu',
    current_ends_iso: md.current_ends_iso,
    next_lord: md.next_lord || 'jupiter',
    next_starts_iso: md.next_starts_iso,
    next_duration_years: md.next_duration_years || 16,
    antardashas,
  }, { width: 720 });
}

function buildPanchaBhuta(astroMath: any): string {
  const pb = astroMath?.pancha_bhuta_distribution || { fire: 0, earth: 0, water: 0, air: 0, ether: 0 };
  return renderPanchaBhuta(pb, { width: 420 });
}

function buildSelemeneWheel(engineResults: any[]): string {
  return renderSelemeneWheel(engineResults || [], { width: 540 });
}

// ──────────────────────────────────────────────────────────────────────
// 11-Part body assembly (solo)
// ──────────────────────────────────────────────────────────────────────

const PART_META: Array<{ num: number; roman: string; title: string; subtitle: string }> = [
  { num: 1,  roman: 'I',    title: 'The Convergence Map',           subtitle: 'Where five systems agree — the bedrock of the chart.' },
  { num: 2,  roman: 'II',   title: 'The Vedic Foundation',          subtitle: 'Sign by sign, house by house, the substrate everything stands on.' },
  { num: 3,  roman: 'III',  title: 'The Karmic Architecture',       subtitle: 'Where the soul came from, where it is going, what repeats until transmuted.' },
  { num: 4,  roman: 'IV',   title: 'Career & Dharma',               subtitle: 'The work the body is built to author at world-scale.' },
  { num: 5,  roman: 'V',    title: 'Wealth & Money',                subtitle: 'How resources flow when dharma flows.' },
  { num: 6,  roman: 'VI',   title: 'Love, Marriage, Spouse',        subtitle: 'The partnership the chart is structurally configured for.' },
  { num: 7,  roman: 'VII',  title: 'Health & Energy Body',          subtitle: 'Constitution, sensitivities, practices the body is wired for.' },
  { num: 8,  roman: 'VIII', title: 'Family, Roots, Soul Lineage',   subtitle: 'Mother, father, lineage karma, the modes of growth the chart supports.' },
  { num: 9,  roman: 'IX',   title: 'The Master Timeline',           subtitle: 'When the dasha cycles open, when the karmic load shifts.' },
  { num: 10, roman: 'X',    title: 'Anti-Dependency Architecture',  subtitle: 'Self-decoding capacity milestones — what the system makes you no longer need.' },
  { num: 11, roman: 'XI',   title: 'Final Synthesis',               subtitle: 'The whole chart compressed. The lesson. The practice that ties it together.' },
];

export interface RenderInputs {
  subject_name: string;
  birth_data: { date: string; time?: string; timezone?: string; place?: string };
  chunks: Record<string, string>;          // V2 chunks: opening, part1..part11
  ingestion: any;                          // 01_ingestion_<slug>.json
  engineResults: any[];                    // 03_engines_<slug>.json
  astroMath: any;                          // 02_astro_<slug>.json
}

export function renderSoloReadingHTML(inputs: RenderInputs): string {
  const { subject_name, birth_data, chunks, ingestion, engineResults, astroMath } = inputs;

  const koshaCover = renderKoshaStack({ width: 580, subject: subject_name });
  const koshaSmall = renderKoshaStack({ width: 380, subject: subject_name });
  const kundali = buildKundaliFromIngestion(ingestion, subject_name);
  const dashaTimeline = buildMahadashaSvg(ingestion, astroMath);
  const panchaBhuta = buildPanchaBhuta(astroMath);
  const selemeneWheel = buildSelemeneWheel(engineResults);

  // Figure registry — single source of truth for plate numbering + index
  const figs = createFigureRegistry();

  // Body assembly — opening then 11 Parts, with SVGs at strategic positions
  let body = '';

  // Opening
  if (chunks.opening) {
    body += `<section class="opening">${mdToHtml(chunks.opening)}</section>`;
  }

  // Part I — Convergence Map + Selemene wheel (full-page plate)
  body += renderPart(1, 'I', PART_META[0].title, PART_META[0].subtitle, mdToHtml(chunks.part1 || ''));
  if (engineResults && engineResults.length > 0) {
    const t1 = 'Sixteen-Engine Convergence';
    body += renderVizPlate({
      figNo: figs.next(t1),
      title: t1,
      svg: selemeneWheel,
      caption: "Each spoke is a Selemene engine. Spoke length = signal strength from the engine’s micro-reading. Color = the Kosha layer the engine routes at. Dashed outer ring marks engines under-routed in the source 41-page reading.",
      attribution: 'Source: Selemene v3.1.0 · Swiss Ephemeris (sidereal)',
    });
  }

  // Part II — Vedic Foundation: Rashi + Pancha Bhuta as a paired figure
  body += renderPart(2, 'II', PART_META[1].title, PART_META[1].subtitle, mdToHtml(chunks.part2 || ''));
  const t2a = 'Vedic D-1 · Rashi Chart';
  const t2b = 'Pancha Bhuta · Five-Element Distribution';
  body += renderVizPair(
    { figNo: figs.next(t2a), title: t2a, svg: kundali,
      caption: 'South Indian style. Lagna marked ASC. Planet glyphs in their natal sign cells. Atmakaraka indicated by gold dot.' },
    { figNo: figs.next(t2b), title: t2b, svg: panchaBhuta,
      caption: 'Elemental signature counted from planetary placements. Heavy water + earth = somatic ground; heavy fire + air = mobilizing current.' },
  );

  // Part III — Karmic Architecture
  body += renderPart(3, 'III', PART_META[2].title, PART_META[2].subtitle, mdToHtml(chunks.part3 || ''));

  // Part IV — Career & Dharma
  body += renderPart(4, 'IV', PART_META[3].title, PART_META[3].subtitle, mdToHtml(chunks.part4 || ''));

  // Part V — Wealth & Money
  body += renderPart(5, 'V', PART_META[4].title, PART_META[4].subtitle, mdToHtml(chunks.part5 || ''));

  // Part VI — Love, Marriage, Spouse
  body += renderPart(6, 'VI', PART_META[5].title, PART_META[5].subtitle, mdToHtml(chunks.part6 || ''));

  // Part VII — Health & Energy Body + Kosha stack
  body += renderPart(7, 'VII', PART_META[6].title, PART_META[6].subtitle, mdToHtml(chunks.part7 || ''));
  const t7 = 'Five-Layer Stack · Kosha Mandala';
  body += renderViz({
    figNo: figs.next(t7),
    title: t7,
    svg: koshaSmall,
    caption: 'The five algebraic layers of consciousness, rendered concentrically. Inner ring = the still-point (imperishable seed). Outer ring = the body. Each layer has its own grammar and instruments.',
  });

  // Part VIII — Family / Roots / Lineage
  body += renderPart(8, 'VIII', PART_META[7].title, PART_META[7].subtitle, mdToHtml(chunks.part8 || ''));

  // Part IX — Master Timeline + Mahadasha timeline (full-page plate)
  body += renderPart(9, 'IX', PART_META[8].title, PART_META[8].subtitle, mdToHtml(chunks.part9 || ''));
  const t9 = 'Mahadasha Timeline';
  body += renderVizPlate({
    figNo: figs.next(t9),
    title: t9,
    svg: dashaTimeline,
    caption: 'The closing dasha (left) handing over to the opening dasha (right). Antardasha sub-bars show the next 24 months in detail. The gold arrow marks the precise pivot timestamp.',
    attribution: 'Source: Vimshottari (Selemene) · DOCX-hardened pivot date',
  });

  // Part X — Anti-Dependency Architecture
  body += renderPart(10, 'X', PART_META[9].title, PART_META[9].subtitle, mdToHtml(chunks.part10 || ''));

  // Part XI — Final Synthesis (closing kosha as silent signature)
  body += renderPart(11, 'XI', PART_META[10].title, PART_META[10].subtitle, mdToHtml(chunks.part11 || ''));

  // Build TOC entries from PART_META + figure index from registry
  const tocEntries: TocEntry[] = PART_META.map((p) => ({
    num: p.roman,
    title: p.title,
    subtitle: p.subtitle,
    mark: `Part ${p.roman}`,
  }));

  return renderHTMLPage({
    title: `Integrated Reading — ${subject_name}`,
    cover: {
      subject: subject_name,
      birth_date: birth_data.date,
      birth_time: birth_data.time,
      birth_place: birth_data.place,
      cover_mandala_svg: koshaCover,
    },
    toc_html: renderTOC('The Reading', tocEntries),
    body,
    fig_index_html: renderFigIndex(figs.list()),
  });
}

// ──────────────────────────────────────────────────────────────────────
// Composite reading (dyad)
// ──────────────────────────────────────────────────────────────────────

export interface CompositeRenderInputs {
  subject_a: string;
  subject_b: string;
  ingestion_a: any;
  ingestion_b: any;
  composite_body_md: string;        // the raw composite synthesis markdown
  cross_resonance?: any;
}

export function renderCompositeHTML(inputs: CompositeRenderInputs): string {
  const { subject_a, subject_b, ingestion_a, ingestion_b, composite_body_md, cross_resonance } = inputs;

  const aMd = ingestion_a?.mahadasha || {};
  const bMd = ingestion_b?.mahadasha || {};
  const sharedAtmakaraka = (
    ingestion_a?.vedic?.atmakaraka && ingestion_b?.vedic?.atmakaraka &&
    ingestion_a.vedic.atmakaraka.toLowerCase().includes(ingestion_b.vedic.atmakaraka.toLowerCase().split(' ')[0])
  ) ? ingestion_a.vedic.atmakaraka.split(' ')[0] : undefined;

  const compositeMandala = renderCompositeResonance({
    subject_a,
    subject_b,
    a_mahadasha: { current: aMd.current_lord || '', next: aMd.next_lord || '', transition_iso: aMd.next_starts_iso },
    b_mahadasha: { current: bMd.current_lord || '', next: bMd.next_lord || '', transition_iso: bMd.next_starts_iso },
    electromagnetic_channels: cross_resonance?.electromagnetic_channels || ['24-61 Awareness', '32-54 Transformation', '28-38 Struggle'],
    companionship_gates: cross_resonance?.companionship_gates || ['31', '62', '42', '46', '52'],
    shared_atmakaraka: sharedAtmakaraka,
  }, { width: 640 });

  const kundaliA = buildKundaliFromIngestion(ingestion_a, subject_a);
  const kundaliB = buildKundaliFromIngestion(ingestion_b, subject_b);

  const figs = createFigureRegistry();
  let body = `<section class="opening">${mdToHtml(composite_body_md.split(/\n## /)[0] || '')}</section>`;

  // Split composite into sections and insert SVGs at appropriate breaks
  const sections = composite_body_md.split(/\n## /);
  for (let i = 1; i < sections.length; i++) {
    body += `<section>${mdToHtml('## ' + sections[i])}</section>`;
    if (i === 1) {
      const tField = 'The Composite Field';
      body += renderVizPlate({
        figNo: figs.next(tField),
        title: tField,
        svg: compositeMandala,
        caption: 'Two charts in resonance. The luminous threads between the arcs are the electromagnetic channels you make as a pair that neither chart has alone. The paired pivots mark the simultaneous Mahadasha transitions.',
        attribution: 'Source: Selemene composite layer · DOCX-hardened pivots',
      });
      body += renderVizPair(
        { figNo: figs.next(`${subject_a} · Rashi`), title: `${subject_a} · Rashi`, svg: kundaliA,
          caption: 'Subject A natal chart — South Indian style. Lagna marked ASC.' },
        { figNo: figs.next(`${subject_b} · Rashi`), title: `${subject_b} · Rashi`, svg: kundaliB,
          caption: 'Subject B natal chart — South Indian style. Lagna marked ASC.' },
      );
    }
  }

  return renderHTMLPage({
    title: `Composite Field — ${subject_a} × ${subject_b}`,
    cover: {
      subject: `${subject_a} × ${subject_b}`,
      birth_date: '',
      cover_mandala_svg: compositeMandala,
    },
    body,
    fig_index_html: renderFigIndex(figs.list()),
    is_composite: true,
    composite_subject_a: subject_a,
    composite_subject_b: subject_b,
  });
}

// ──────────────────────────────────────────────────────────────────────
// File-loading entry points
// ──────────────────────────────────────────────────────────────────────

export function loadAndRenderSolo(opts: {
  subject: string;
  slug: string;
  run_dir: string;
  birth_data: { date: string; time?: string; timezone?: string; place?: string };
}): string {
  const readJSON = (p: string) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : {};
  return renderSoloReadingHTML({
    subject_name: opts.subject,
    birth_data: opts.birth_data,
    chunks: readJSON(`${opts.run_dir}/07_chunks_${opts.slug}.json`),
    ingestion: readJSON(`${opts.run_dir}/01_ingestion_${opts.slug}.json`),
    engineResults: readJSON(`${opts.run_dir}/03_engines_${opts.slug}.json`),
    astroMath: readJSON(`${opts.run_dir}/02_astro_${opts.slug}.json`),
  });
}

export function loadAndRenderComposite(opts: {
  subject_a: string;
  slug_a: string;
  subject_b: string;
  slug_b: string;
  run_dir: string;
}): string {
  const readJSON = (p: string) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : {};
  const readText = (p: string) => existsSync(p) ? readFileSync(p, 'utf-8') : '';
  return renderCompositeHTML({
    subject_a: opts.subject_a,
    subject_b: opts.subject_b,
    ingestion_a: readJSON(`${opts.run_dir}/01_ingestion_${opts.slug_a}.json`),
    ingestion_b: readJSON(`${opts.run_dir}/01_ingestion_${opts.slug_b}.json`),
    composite_body_md: readText(`${opts.run_dir}/08_composite.md`),
    cross_resonance: readJSON(`${opts.run_dir}/02_astro_${opts.slug_b}.json`)?.cross_resonance
                   || readJSON(`${opts.run_dir}/02_astro_${opts.slug_a}.json`)?.cross_resonance,
  });
}
