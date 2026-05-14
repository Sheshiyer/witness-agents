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
    ? `<div class="cover-svg-wrap">${opts.cover.cover_mandala_svg}</div>`
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

export function renderInteractiveHTMLPage(opts: {
  title: string;
  cover: CoverData;
  topology: string;
  parts: PartBlock[];
  opening_html?: string;
  fig_index_html?: string;
  is_composite?: boolean;
  composite_subject_a?: string;
  composite_subject_b?: string;
}): string {
  const subtitle = opts.is_composite
    ? `${opts.composite_subject_a} × ${opts.composite_subject_b}`
    : opts.cover.subject;

  const coverMandala = opts.cover.cover_mandala_svg
    ? `<div class="cover-svg-wrap">${opts.cover.cover_mandala_svg}</div>`
    : '';

  // Topology-specific interaction layer (inlined)
  const interaction = buildInteractionPayload(opts.topology);

  // TOC rail entries — generated from parts list
  const tocRailHtml = `
    <nav class="toc-rail">
      <div class="toc-rail-title">Contents</div>
      <ol>
        ${opts.parts.map((p) => `<li data-part="${p.partNum}"><a href="#part-${p.partNum}">${p.title}</a></li>`).join('\n        ')}
      </ol>
    </nav>`;

  // Body parts assembly — each Part becomes a .part-block (with optional sticky viz column)
  const partsHtml = opts.parts.map((p) => {
    const hasViz = !!p.vizHtml;
    const partInner = `
      <section class="part-header" id="part-${p.partNum}">
        <div class="part-eyebrow">Part ${p.romanNumeral}</div>
        <h2 class="part-title">${p.title}</h2>
        ${p.subtitle ? `<div class="part-subtitle">${p.subtitle}</div>` : ''}
      </section>
      <div class="part-prose">${p.contentHtml}</div>`;
    if (hasViz) {
      return `
      <div class="part-block has-viz">
        ${partInner}
        <aside class="part-viz-column">${p.vizHtml}</aside>
      </div>`;
    }
    return `<div class="part-block">${partInner}</div>`;
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
<body>
<div class="canvas interactive">
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

  <!-- ───────────── BODY w/ sticky TOC rail ───────────── -->
  <article class="body-page interactive">
    ${tocRailHtml}
    <div class="body-content">
      ${opts.opening_html ? `<section class="opening">${opts.opening_html}</section>` : ''}
      ${partsHtml}
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
