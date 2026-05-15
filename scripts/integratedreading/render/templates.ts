// ─── /integratedreading — HTML Templates ────────────────────────────
// Page scaffolding: cover, TOC, body, figure index, footer. Pluggable.
// All figures pass through renderViz / renderVizPlate / renderVizPair /
// renderVizTrio so the figure-counter and figure-index stay coherent.

import { STYLES, BRAND } from './styles.js';
import {
  buildInteractionPayload,
  GSAP_CDN,
  GSAP_SCROLLTRIGGER_CDN,
} from './interactions/index.js';

export interface CoverData {
  subject: string;
  birth_date: string;      // YYYY-MM-DD
  birth_time?: string;
  birth_place?: string;
  cover_mandala_svg?: string;
}

export function renderHTMLPage(opts: {
  title: string;
  cover: CoverData;
  body: string;
  toc_html?: string;             // optional TOC inserted between cover and body
  fig_index_html?: string;       // optional figure index inserted at end of body
  is_composite?: boolean;
  composite_subject_a?: string;
  composite_subject_b?: string;
}): string {
  const subtitle = opts.is_composite
    ? `${opts.composite_subject_a} × ${opts.composite_subject_b}`
    : opts.cover.subject;

  const coverMandala = opts.cover.cover_mandala_svg
    ? `<div class="cover-sigil-stage">${opts.cover.cover_mandala_svg}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${opts.title}</title>
<style>
${STYLES}
</style>
</head>
<body>
<div class="canvas">
  <!-- ───────────── COVER PAGE ───────────── -->
  <section class="cover">
    <header>
      <div class="cover-mark">Tryambakam Noesis · Integrated Reading</div>
      <h1 class="cover-title">${opts.is_composite ? 'Composite Field' : 'Integrated Reading'}</h1>
      <div class="cover-subject">${subtitle}</div>
      <div class="cover-birth">
        ${opts.cover.birth_date}${opts.cover.birth_time ? ' · ' + opts.cover.birth_time : ''}${opts.cover.birth_place ? ' · ' + opts.cover.birth_place : ''}
      </div>
      <p class="cover-tagline">
        Self-Consciousness as Technology.<br/>
        Body as Medium. Breath as Interface.
      </p>
    </header>
    ${coverMandala}
    <footer class="cover-footer">
      <div class="cover-lineage">
        Three-resolution decoding · own-world × cultural-archetypal × celestial-environmental.<br/>
        Tsarion-anchored Tarot lineage. Anti-dependency telos.
      </div>
      <div class="cover-stamp">∴ NOESIS</div>
    </footer>
  </section>

  ${opts.toc_html ?? ''}

  <!-- ───────────── BODY (Parts I–XI) ───────────── -->
  <article class="body-page">
${opts.body}
    ${opts.fig_index_html ?? ''}
    <footer class="doc-footer">
      <div class="tagline">The Anatomist Who Sees Fractals</div>
      <div>TRYAMBAKAM NOESIS · 1331.TRYAMBAKAM.SPACE</div>
      <div class="quine">
        This document is documentation of an instrument. The instrument is what you already are.
        The Quine principle: the system succeeds when you no longer need it.
      </div>
    </footer>
  </article>
</div>
</body>
</html>`;
}

/** Wrap a Part's content with an eyebrow + Roman numeral header. */
export function renderPart(partNum: number, romanNumeral: string, title: string, subtitle: string, contentHtml: string): string {
  return `
    <section class="part-header" id="part-${partNum}">
      <div class="part-eyebrow">Part ${romanNumeral}</div>
      <h2 class="part-title">${title}</h2>
      ${subtitle ? `<div class="part-subtitle">${subtitle}</div>` : ''}
    </section>
    ${contentHtml}`;
}

// ─── FIGURE-NUMBER REGISTRY ──────────────────────────────────────────
// Single counter feeds renderViz / renderVizPlate / renderVizPair /
// renderVizTrio + the figure index at the end of the doc.
export interface FigureEntry {
  no: string;         // "I", "II", "III" — Roman, classical-art style
  title: string;
  caption?: string;
}

export function createFigureRegistry() {
  const entries: FigureEntry[] = [];
  let counter = 0;
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
  return {
    next(title: string, caption?: string) {
      counter += 1;
      const no = toRoman(counter);
      entries.push({ no, title, caption });
      return no;
    },
    list() { return entries; },
    count() { return counter; },
  };
}

/** Wrap a generated SVG in a visualization card with figure number + title + caption. */
export function renderViz(opts: { figNo?: string; title: string; svg: string; caption?: string; attribution?: string }): string;
export function renderViz(title: string, svg: string, caption?: string): string;
export function renderViz(a: any, b?: any, c?: any): string {
  let figNo: string | undefined, title: string, svg: string, caption: string | undefined, attr: string | undefined;
  if (typeof a === 'string') {
    title = a; svg = b; caption = c;
  } else {
    figNo = a.figNo; title = a.title; svg = a.svg; caption = a.caption; attr = a.attribution;
  }
  return `
    <figure class="viz">
      ${figNo ? `<div class="viz-figno">Plate ${figNo}</div>` : ''}
      <div class="viz-title">${title}</div>
      ${svg}
      ${caption ? `<figcaption class="viz-caption">${caption}</figcaption>` : ''}
      ${attr ? `<div class="viz-attr">${attr}</div>` : ''}
    </figure>`;
}

/** Full-page plate (own print page) — use for marquee visualizations
 *  like the Selemene wheel, Mahadasha timeline, Triad field. */
export function renderVizPlate(opts: { figNo?: string; title: string; svg: string; caption?: string; attribution?: string }): string {
  return `
    <section class="viz-plate">
      <figure class="viz">
        ${opts.figNo ? `<div class="viz-figno">Plate ${opts.figNo}</div>` : ''}
        <div class="viz-title">${opts.title}</div>
        ${opts.svg}
        ${opts.caption ? `<figcaption class="viz-caption">${opts.caption}</figcaption>` : ''}
        ${opts.attribution ? `<div class="viz-attr">${opts.attribution}</div>` : ''}
      </figure>
    </section>`;
}

/** Two figures side-by-side (e.g. dual Kundali charts in composite reading). */
export function renderVizPair(a: { figNo?: string; title: string; svg: string; caption?: string }, b: { figNo?: string; title: string; svg: string; caption?: string }): string {
  const f = (x: typeof a) => `
    <figure class="viz">
      ${x.figNo ? `<div class="viz-figno">Plate ${x.figNo}</div>` : ''}
      <div class="viz-title">${x.title}</div>
      ${x.svg}
      ${x.caption ? `<figcaption class="viz-caption">${x.caption}</figcaption>` : ''}
    </figure>`;
  return `<div class="viz-pair">${f(a)}${f(b)}</div>`;
}

/** Three figures side-by-side (e.g. triad Kundalis). */
export function renderVizTrio(a: { figNo?: string; title: string; svg: string; caption?: string }, b: { figNo?: string; title: string; svg: string; caption?: string }, c: { figNo?: string; title: string; svg: string; caption?: string }): string {
  const f = (x: typeof a) => `
    <figure class="viz">
      ${x.figNo ? `<div class="viz-figno">Plate ${x.figNo}</div>` : ''}
      <div class="viz-title">${x.title}</div>
      ${x.svg}
      ${x.caption ? `<figcaption class="viz-caption">${x.caption}</figcaption>` : ''}
    </figure>`;
  return `<div class="viz-trio">${f(a)}${f(b)}${f(c)}</div>`;
}

/** Wrap a table in a captioned figure — almanac-style. */
export function renderTableFigure(opts: { figNo?: string; label: string; tableHtml: string; note?: string; wide?: boolean }): string {
  // If wide and tableHtml has a <table> root, inject the table-wide class
  let html = opts.tableHtml.trim();
  if (opts.wide && /^<table/.test(html)) {
    html = html.replace(/^<table([^>]*)>/, (_, attrs) => {
      if (/class="/.test(attrs)) return `<table${attrs.replace(/class="([^"]*)"/, 'class="$1 table-almanac table-wide"')}>`;
      return `<table${attrs} class="table-almanac table-wide">`;
    });
  } else if (/^<table/.test(html) && !/class="[^"]*table-/.test(html)) {
    html = html.replace(/^<table([^>]*)>/, (_, attrs) => {
      if (/class="/.test(attrs)) return `<table${attrs.replace(/class="([^"]*)"/, 'class="$1 table-almanac"')}>`;
      return `<table${attrs} class="table-almanac">`;
    });
  }
  return `
    <figure class="table-figure">
      <figcaption>${opts.figNo ? `Table ${opts.figNo} · ` : ''}${opts.label}</figcaption>
      ${html}
      ${opts.note ? `<div class="table-note">${opts.note}</div>` : ''}
    </figure>`;
}

// ─── TABLE OF CONTENTS ───────────────────────────────────────────────
export interface TocEntry {
  num: string;       // "I", "II"
  title: string;
  subtitle?: string;
  mark?: string;     // e.g., "pp. 12–18" or "Part I"
}
export function renderTOC(title: string, entries: TocEntry[]): string {
  const items = entries.map((e) => `
    <li>
      <span class="toc-num">${e.num}</span>
      <div class="toc-entry">${e.title}${e.subtitle ? `<small>${e.subtitle}</small>` : ''}</div>
      <span class="toc-mark">${e.mark ?? ''}</span>
    </li>`).join('');
  return `
    <section class="toc">
      <div class="toc-eyebrow">Contents</div>
      <h2 class="toc-title">${title}</h2>
      <ul class="toc-list">${items}</ul>
    </section>`;
}

// ─── FIGURE INDEX (renders at end of body, before final footer) ──────
export function renderFigIndex(entries: FigureEntry[]): string {
  if (!entries || entries.length === 0) return '';
  const items = entries.map((e) => `
    <li>
      <span class="fig-no">Plate ${e.no}</span>
      <span class="fig-label">${e.title}</span>
    </li>`).join('');
  return `
    <section class="fig-index">
      <div class="fig-index-title">Index of Plates</div>
      <ul>${items}</ul>
    </section>`;
}

// ─── INTERACTIVE HTML PAGE (P2.1 — scroll-narrative + animations) ────
//
// Alongside the existing renderHTMLPage() static renderer. Output is a
// single self-contained HTML file: GSAP loaded via CDN script tag, all
// other CSS/JS inlined. Mode-doc's svg_topology drives which interaction
// module (dyad-arc / triad-triangle / pentagon / web-graph) gets inlined.
//
// Per design doc § 5 — interactive HTML primary, PDF derivative archive
// via @media print flattening (added to styles.ts in P2.3).

export interface PartBlock {
  partNum: number;
  romanNumeral: string;
  title: string;
  subtitle?: string;
  contentHtml: string;
  /** Optional SVG-bearing figure(s) for sticky-viz column (single-Part docs only). */
  vizHtml?: string;
}

/**
 * Build the FULL-WOW orbital cover SVG (P1 of v2 design).
 *
 * Centers the topology sigil inside concentric atmospheric rings.
 * Curves the title along a top arc (Panchang 800), the subtitle along
 * a bottom arc (Panchang 500 italic), the wordmark along an outer
 * top arc (SF Mono spaced). Subject names land at compass positions
 * as constellation-point labels. Kha Arc gradient atmosphere fills
 * the canvas. Bioluminescent glow filter softens the sigil edges.
 */
function renderOrbitalCover(opts: {
  title: string;
  birthMeta: string;
  topologySvg: string;
  subjectNames: string[];
  taglineLine1: string;
  taglineLine2: string;
}): string {
  const N = opts.subjectNames.length;
  // Place subjects at compass positions appropriate to count.
  // Convention: first subject at top (90° / -π/2 in math coords),
  // remaining subjects distributed evenly clockwise.
  const subjectLabels = opts.subjectNames.map((name, i) => {
    const angle = (-Math.PI / 2) + (i * (2 * Math.PI / Math.max(N, 1)));
    const labelRadius = 560;
    const x = 500 + labelRadius * Math.cos(angle);
    const y = 500 + labelRadius * Math.sin(angle);
    // Anchor text away from center
    const anchor = Math.abs(Math.cos(angle)) < 0.3
      ? 'middle'
      : (Math.cos(angle) > 0 ? 'start' : 'end');
    // Tiny constellation dot at slightly inner radius
    const dotRadius = 525;
    const dx = 500 + dotRadius * Math.cos(angle);
    const dy = 500 + dotRadius * Math.sin(angle);
    return `
      <g class="cover-constellation-pt" style="--pt-delay: ${0.6 + i * 0.25}s">
        <circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="3.5" fill="#C5A017" opacity="0.85" filter="url(#cover-glow-soft)" />
        <text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle"
              fill="#F0EDE3" font-family="Panchang, serif" font-weight="500" font-size="20" letter-spacing="2.4">
          ${escapeXml(name.toUpperCase())}
        </text>
      </g>`;
  }).join('\n');

  return `
    <svg class="cover-orbital" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="Composite cover sigil">
      <defs>
        <!-- Title curves along this top arc — large radius for legibility -->
        <path id="cover-arc-title" d="M 120 540 A 420 420 0 0 1 880 540" fill="none" />
        <!-- Subtitle curves along the inverse bottom arc -->
        <path id="cover-arc-subtitle" d="M 130 480 A 410 410 0 0 0 870 480" fill="none" />
        <!-- Wordmark curves along the outermost arc, very small text -->
        <path id="cover-arc-wordmark" d="M 60 520 A 480 480 0 0 1 940 520" fill="none" />
        <!-- Bottom lineage line on a lower arc -->
        <path id="cover-arc-lineage" d="M 140 460 A 400 400 0 0 0 860 460" fill="none" />

        <!-- Bioluminescent glow filter — soft outward radiance -->
        <filter id="cover-glow-strong" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cover-glow-soft" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" />
        </filter>

        <!-- Radial Kha Arc atmosphere -->
        <radialGradient id="cover-kha-atmosphere" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stop-color="#0B50FB" stop-opacity="0.18" />
          <stop offset="45%" stop-color="#2D0050" stop-opacity="0.14" />
          <stop offset="100%" stop-color="#070B1D" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Atmospheric backdrop -->
      <rect width="1000" height="1000" fill="url(#cover-kha-atmosphere)" />

      <!-- Concentric atmospheric rings (constellation grid local to cover) -->
      <circle cx="500" cy="500" r="320" fill="none" stroke="#C5A017" stroke-width="0.5" opacity="0.14" class="cover-ring cover-ring-1" />
      <circle cx="500" cy="500" r="380" fill="none" stroke="#C5A017" stroke-width="0.5" opacity="0.18" class="cover-ring cover-ring-2" />
      <circle cx="500" cy="500" r="430" fill="none" stroke="#10B5A7" stroke-width="0.5" opacity="0.22" class="cover-ring cover-ring-3" />
      <circle cx="500" cy="500" r="480" fill="none" stroke="#C5A017" stroke-width="0.3" opacity="0.10" class="cover-ring cover-ring-4" />

      <!-- Centered sigil — the topology SVG, scaled to fit -->
      <g class="cover-sigil-core" transform="translate(290, 290) scale(0.42)" filter="url(#cover-glow-strong)">
        ${opts.topologySvg}
      </g>

      <!-- Subject constellation points -->
      ${subjectLabels}

      <!-- Wordmark (outermost top arc) — small, tight tracking -->
      <text class="cover-wordmark" fill="#C5A017" font-family="SF Mono, monospace" font-size="11" letter-spacing="9" opacity="0.85">
        <textPath href="#cover-arc-wordmark" startOffset="50%" text-anchor="middle">TRYAMBAKAM · NOESIS · INTEGRATED · READING</textPath>
      </text>

      <!-- Title (top arc) — Panchang 800, large -->
      <text class="cover-title-arc" fill="#F0EDE3" font-family="Panchang, serif" font-weight="800" font-size="72" letter-spacing="3" filter="url(#cover-glow-soft)">
        <textPath href="#cover-arc-title" startOffset="50%" text-anchor="middle">${escapeXml(opts.title)}</textPath>
      </text>

      <!-- Subtitle (lower arc) — birth meta in mono -->
      <text class="cover-meta-arc" fill="#10B5A7" font-family="SF Mono, monospace" font-size="14" letter-spacing="4">
        <textPath href="#cover-arc-subtitle" startOffset="50%" text-anchor="middle">${escapeXml(opts.birthMeta)}</textPath>
      </text>

      <!-- Tagline beneath subtitle, two arcs -->
      <text class="cover-tag-arc" fill="#8A9BA8" font-family="Panchang, serif" font-weight="500" font-style="italic" font-size="20" letter-spacing="1.6">
        <textPath href="#cover-arc-lineage" startOffset="50%" text-anchor="middle">${escapeXml(opts.taglineLine1)}</textPath>
      </text>

      <!-- Bottom corner brand stamp -->
      <text x="500" y="970" text-anchor="middle" fill="#C5A017" font-family="Panchang, serif" font-weight="700" font-size="14" letter-spacing="6" opacity="0.9">∴  NOESIS  ∴</text>
    </svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * Constellation-grid field-cartography background (P1 of v2 design).
 *
 * Fixed-position SVG over the whole viewport. Hairline Sacred Gold
 * dots arranged in a sparse mesh, drifting slowly via CSS animation.
 * Disappears at viewport widths <720px (handled in CSS).
 */
function renderConstellationGrid(): string {
  // Build a sparse grid of dots — 7×7 hex-like lattice across viewBox 1000×1000.
  // Each dot gets a slight random offset feel (deterministic via index) for an
  // organic mesh appearance rather than a strict grid.
  const dots: string[] = [];
  const rows = 9;
  const cols = 11;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offsetX = (r % 2 === 0) ? 0 : 50;
      const baseX = (c * 100) + offsetX + 30;
      const baseY = (r * 110) + 40;
      // Slight deterministic jitter
      const jx = ((r * 7 + c * 13) % 17) - 8;
      const jy = ((r * 11 + c * 3) % 13) - 6;
      const x = baseX + jx;
      const y = baseY + jy;
      const op = 0.18 + (((r + c) % 3) * 0.06); // 0.18 / 0.24 / 0.30
      dots.push(`<circle cx="${x}" cy="${y}" r="1.1" fill="#C5A017" opacity="${op.toFixed(2)}" />`);
    }
  }
  // A few hairline connecting lines for the "constellation" feel
  const lines = [
    'M 130 60 L 380 280 L 520 180 L 720 350',
    'M 80 600 L 280 540 L 410 720 L 660 660 L 880 800',
    'M 220 920 L 470 880 L 690 970',
  ].map((d) => `<path d="${d}" stroke="#C5A017" stroke-width="0.4" fill="none" opacity="0.15" />`);
  return `
    <svg class="constellation-grid" viewBox="0 0 1100 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      ${lines.join('\n      ')}
      ${dots.join('\n      ')}
    </svg>`;
}

/**
 * La-Arc-fade closer (P1 of v2 design).
 *
 * Vertical gradient strip that closes each Part. Sacred Gold (Ba) →
 * Witness Violet (Steigerung) → Void Black (La Ur-ground). Animates
 * via animation-timeline: view() so the fade resolves as the reader
 * scrolls past it.
 */
function renderLaArcFade(): string {
  return `<div class="la-arc-fade" aria-hidden="true"></div>`;
}

export function renderInteractiveHTMLPage(opts: {
  title: string;
  cover: CoverData;
  topology: string;
  parts: PartBlock[];
  /** Mode name (e.g. "partner-synastry") — layers mode-keyed interactions
   *  on top of topology-keyed interactions when provided. */
  mode?: string;
  /** Mode-specific bridge mandate, embedded as data-attr for interaction
   *  modules (e.g. synastry tooltip composition). */
  bridge_mandate?: string;
  opening_html?: string;
  fig_index_html?: string;
  is_composite?: boolean;
  composite_subject_a?: string;
  composite_subject_b?: string;
  /** P1 v2: individual subject names for orbital cover constellation labels */
  subject_names?: string[];
}): string {
  // Derive subject roster for the orbital cover (P1 v2)
  const subjectNames = opts.subject_names && opts.subject_names.length > 0
    ? opts.subject_names
    : (opts.is_composite && opts.composite_subject_a
        ? [opts.composite_subject_a, ...(opts.composite_subject_b ? opts.composite_subject_b.split(' × ') : [])]
        : [opts.cover.subject]);

  const coverTitle = opts.is_composite ? 'COMPOSITE FIELD' : 'INTEGRATED READING';
  const birthMeta = [
    opts.cover.birth_date,
    opts.cover.birth_time,
    opts.cover.birth_place,
  ].filter(Boolean).join(' · ');

  const orbitalCover = opts.cover.cover_mandala_svg
    ? renderOrbitalCover({
        title: coverTitle,
        birthMeta,
        topologySvg: opts.cover.cover_mandala_svg,
        subjectNames,
        taglineLine1: 'Self-Consciousness as Technology · Body as Medium · Breath as Interface',
        taglineLine2: '',
      })
    : '';

  // Topology + mode-keyed interaction layer (inlined)
  const interaction = buildInteractionPayload(opts.topology, opts.mode);

  // Body parts assembly — each Part is a single-column block followed by
  // a la-arc-fade closer (gradient breath-out before next Part begins).
  // No more sticky TOC rail consuming reading width — the cover's
  // constellation labels + Part headers do the job.
  const partsHtml = opts.parts.map((p, i) => {
    const hasViz = !!p.vizHtml;
    const vizBlock = hasViz
      ? `<aside class="part-viz-column">${p.vizHtml}</aside>`
      : '';
    const wrapperClass = hasViz ? 'part-block has-viz' : 'part-block';
    const isLast = i === opts.parts.length - 1;
    return `
      <div class="${wrapperClass}">
        <section class="part-header" id="part-${p.partNum}">
          <div class="part-eyebrow">Part ${p.romanNumeral}</div>
          <h2 class="part-title">${p.title}</h2>
          ${p.subtitle ? `<div class="part-subtitle">${p.subtitle}</div>` : ''}
        </section>
        ${vizBlock}
        <div class="part-prose">${p.contentHtml}</div>
      </div>
      ${isLast ? '' : renderLaArcFade()}`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${opts.title}</title>
<style>
${STYLES}

${interaction.css}
</style>
</head>
<body${opts.bridge_mandate ? ` data-bridge-mandate="${opts.bridge_mandate.replace(/"/g, '&quot;')}"` : ''}>
<!-- Fixed constellation-grid backdrop, full viewport -->
${renderConstellationGrid()}

<div class="canvas interactive"${opts.mode ? ` data-mode="${opts.mode}"` : ''}>
  <!-- ───── FULL-WOW ORBITAL COVER (v2 P1) ───── -->
  <section class="cover cover-orbital-stage">
    ${orbitalCover}
  </section>

  <!-- ───────────── BODY (single centered column, no TOC rail) ───────────── -->
  <article class="body-page interactive">
    <div class="body-content">
      ${opts.opening_html ? `<section class="opening">${opts.opening_html}</section>` : ''}
      ${partsHtml}
      ${renderLaArcFade()}
      ${opts.fig_index_html ?? ''}
      <footer class="doc-footer">
        <div class="tagline">The Anatomist Who Sees Fractals</div>
        <div>TRYAMBAKAM NOESIS · 1331.TRYAMBAKAM.SPACE</div>
        <div class="quine">
          This document is documentation of an instrument. The instrument is what you already are.
          The Quine principle: the system succeeds when you no longer need it.
        </div>
      </footer>
    </div>
  </article>
</div>

<!-- GSAP + ScrollTrigger via CDN — only loaded for interactive mode -->
<script src="${GSAP_CDN}"></script>
<script src="${GSAP_SCROLLTRIGGER_CDN}"></script>

<!-- Inline runtime: base scroll-narrative scaffold + topology-specific GSAP timelines + event handlers -->
<script>
${interaction.handlers}

${interaction.gsap}
</script>
</body>
</html>`;
}
