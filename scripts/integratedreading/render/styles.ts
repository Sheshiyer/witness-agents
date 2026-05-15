// ─── /integratedreading — Brand CSS (Goethe palette × Tryambakam Noesis) ───
// Three Laws enforced through CSS:
//   1. Bioluminescent, not fluorescent — light glows from within
//   2. Architectural, not decorative — sacred geometry as load-bearing
//   3. Data as sacred form — mandalas generated from the chart, not stamped

export const BRAND = {
  // Consciousness Color Spectrum (Goethe's Zur Farbenlehre)
  witnessViolet:    '#2D0050',  // Kha — observer, Steigerung minus
  flowIndigo:       '#0B50FB',  // Kha→Ba transition, deep minus
  sacredGold:       '#C5A017',  // Ba — activation, plus apex
  coherenceEmerald: '#10B5A7',  // Ba↔La equilibrium, Goethe's green
  voidBlack:        '#070B1D',  // La — pre-chromatic Ur-ground
  // Functional
  parchment:        '#F0EDE3',  // primary text
  mutedSilver:      '#8A9BA8',  // secondary text, metadata
  deepSurface:      '#0E1428',  // cards / elevated surfaces
  terracotta:       '#C65D3B',  // alerts (rare)
  // Gradients
  khaArc:  'linear-gradient(135deg, #070B1D 0%, #2D0050 50%, #0B50FB 100%)',
  baArc:   'linear-gradient(90deg, #10B5A7 0%, #C5A017 100%)',
  laArc:   'linear-gradient(180deg, #0E1428 0%, #070B1D 100%)',
} as const;

export const STYLES = `
/* ─── Fontshare: Panchang (headers) + Satoshi (body) — brand-native, free ─── */
@import url('https://api.fontshare.com/v2/css?f[]=panchang@500,600,700,800&f[]=satoshi@300,400,500,700&display=swap');

:root {
  --witness-violet: ${BRAND.witnessViolet};
  --flow-indigo: ${BRAND.flowIndigo};
  --sacred-gold: ${BRAND.sacredGold};
  --coherence-emerald: ${BRAND.coherenceEmerald};
  --void-black: ${BRAND.voidBlack};
  --parchment: ${BRAND.parchment};
  --muted-silver: ${BRAND.mutedSilver};
  --deep-surface: ${BRAND.deepSurface};
  --terracotta: ${BRAND.terracotta};
  --kha-arc: ${BRAND.khaArc};
  --ba-arc: ${BRAND.baArc};
  --la-arc: ${BRAND.laArc};

  --font-display: 'Panchang', 'Cormorant Garamond', Georgia, serif;
  --font-body: 'Satoshi', 'Inter', -apple-system, system-ui, sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--void-black);
  color: var(--parchment);
  font-family: var(--font-body);
  font-size: 10.5pt;
  line-height: 1.7;
  font-weight: 400;
  letter-spacing: 0.005em;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
  font-feature-settings: 'kern', 'liga', 'calt', 'onum';
}
/* Editorial-grade hyphenation + widow/orphan control */
p, li, dd, td {
  hyphens: auto;
  -webkit-hyphens: auto;
  hyphenate-limit-chars: 8 3 3;
  orphans: 2;
  widows: 2;
}
::selection { background: var(--sacred-gold); color: var(--void-black); }

/* ─── PAGE-LEVEL CANVAS (Kha Arc as ambient background) ─── */
.canvas {
  min-height: 100vh;
  background: var(--kha-arc);
  background-attachment: fixed;
  padding: 0;
}

/* ─── COVER PAGE ─── */
.cover {
  min-height: 100vh;
  padding: 96px 64px;
  display: flex; flex-direction: column; justify-content: space-between;
  position: relative;
  page-break-after: always;
  overflow: hidden;
}
@media (max-width: 720px) {
  .cover {
    padding: 56px 28px;
  }
}
.cover::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 75% 25%, rgba(197,160,23,0.08) 0%, transparent 35%),
    radial-gradient(circle at 25% 75%, rgba(16,181,167,0.06) 0%, transparent 40%);
  pointer-events: none;
}
.cover-mark {
  font-family: var(--font-mono);
  font-size: 8.5pt;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--muted-silver);
  position: relative;
  padding-left: 22px;
}
.cover-mark::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  width: 14px; height: 1px;
  background: var(--sacred-gold);
  transform: translateY(-50%);
}
.cover-title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 72pt;
  line-height: 0.92;
  letter-spacing: -0.035em;
  color: var(--parchment);
  margin: 36px 0 28px;
  /* Subtle vertical rhythm against cover gradient */
}
.cover-subject {
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 28pt;
  line-height: 1.15;
  color: var(--sacred-gold);
  margin: 20px 0 12px;
  letter-spacing: -0.005em;
}
.cover-birth {
  font-family: var(--font-mono);
  font-size: 10pt;
  letter-spacing: 0.18em;
  color: var(--coherence-emerald);
  font-variant-numeric: tabular-nums;
}
.cover-tagline {
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 14pt;
  line-height: 1.55;
  color: var(--muted-silver);
  max-width: 68%;
  margin-top: 44px;
  border-top: 1px solid rgba(197,160,23,0.18);
  padding-top: 28px;
}
/* Triadic sigil — flow element inside the cover, not a background decoration.
   At narrow widths the sigil is part of the reading rhythm (full-bleed,
   compressed). On large desktop it steps out of the way (hidden) so the
   typographic hierarchy carries the cover on its own. */
.cover-sigil-stage {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 36px auto 28px;
  width: 100%;
  max-width: 480px;
  position: relative;
  z-index: 1;
  opacity: 0.92;
}
.cover-sigil-stage svg {
  width: 100%;
  height: auto;
  display: block;
  max-height: 56vh;
}
/* On large desktop the sigil cedes the cover to the typography */
@media (min-width: 1400px) {
  .cover-sigil-stage {
    display: none;
  }
}
/* On phone-class widths the sigil "squishes" to fit but stays prominent */
@media (max-width: 720px) {
  .cover-sigil-stage {
    max-width: 100%;
    margin: 24px auto 16px;
  }
  .cover-sigil-stage svg {
    max-height: 44vh;
  }
}
@media print {
  .cover-sigil-stage { display: none; }
}
.cover-footer {
  display: flex; justify-content: space-between; align-items: flex-end;
  border-top: 1px solid rgba(240,237,227,0.15);
  padding-top: 24px;
  font-family: var(--font-mono);
  font-size: 9pt;
  color: var(--muted-silver);
  letter-spacing: 0.08em;
}
.cover-lineage { max-width: 60%; line-height: 1.6; }
.cover-stamp {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 11pt;
  color: var(--sacred-gold);
  letter-spacing: 0.15em;
}

/* ─── BODY PAGE (Parts I–XI) ─── */
.body-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 80px 56px 64px;
  background: rgba(7,11,29,0.92);
  backdrop-filter: blur(4px);
  position: relative;
}
/* For print: full-bleed body page (no centered narrow column) */
@media print {
  .body-page {
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 18mm 16mm 22mm !important;
    background: var(--void-black) !important;
    backdrop-filter: none;
  }
}
.part-header {
  margin: 112px 0 40px;
  padding-top: 40px;
  position: relative;
  page-break-before: always;
}
.part-header:first-child { page-break-before: avoid; margin-top: 0; }
.part-header::before {
  /* Subtle hairline rule with sacred-gold seed instead of full top border */
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 64px;
  height: 1px;
  background: linear-gradient(90deg, var(--sacred-gold), transparent);
}
.part-eyebrow {
  font-family: var(--font-mono);
  font-size: 8pt;
  letter-spacing: 0.45em;
  text-transform: uppercase;
  color: var(--sacred-gold);
  margin-bottom: 14px;
  font-variant-numeric: tabular-nums;
}
.part-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 36pt;
  line-height: 1.02;
  letter-spacing: -0.022em;
  color: var(--parchment);
  margin-bottom: 16px;
}
.part-subtitle {
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 13.5pt;
  color: var(--coherence-emerald);
  line-height: 1.45;
  max-width: 90%;
  letter-spacing: 0.005em;
}

h2 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 21pt;
  line-height: 1.18;
  color: var(--parchment);
  margin: 64px 0 22px;
  letter-spacing: -0.012em;
}
/* Sub-section headers (### 2.1, ### 2.2 etc.) — number gets a subtle accent bar */
h3 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15pt;
  line-height: 1.28;
  color: var(--sacred-gold);
  margin: 36px 0 14px;
  letter-spacing: -0.002em;
  padding-left: 14px;
  border-left: 2px solid rgba(197,160,23,0.5);
  font-variant-numeric: tabular-nums;
}
h4 {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 10.5pt;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--coherence-emerald);
  margin: 28px 0 10px;
}

p {
  margin: 0 0 14px;
  color: var(--parchment);
  hyphens: auto;
  -webkit-hyphens: auto;
}
/* Editorial drop-cap on first paragraph of Opening section */
.opening > p:first-of-type::first-letter {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 56pt;
  line-height: 0.85;
  float: left;
  margin: 6px 12px 0 0;
  color: var(--sacred-gold);
  letter-spacing: -0.04em;
}
em { color: var(--coherence-emerald); font-style: italic; }
strong { color: var(--sacred-gold); font-weight: 700; }
a { color: var(--coherence-emerald); text-decoration: none; border-bottom: 1px dotted currentColor; }
/* Inline code / data: monospace + tabular */
code, .data {
  font-family: var(--font-mono);
  font-size: 0.92em;
  font-variant-numeric: tabular-nums;
  color: var(--coherence-emerald);
  background: rgba(16,181,167,0.06);
  padding: 1px 5px;
  border-radius: 2px;
}

/* ─── BLOCKQUOTES → magazine pull-quote treatment ─── */
blockquote {
  margin: 36px 24px;
  padding: 28px 32px 28px 56px;
  border-left: 2px solid var(--sacred-gold);
  background: linear-gradient(90deg, rgba(197,160,23,0.05), transparent 65%);
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 500;
  font-size: 14.5pt;
  line-height: 1.55;
  color: var(--parchment);
  position: relative;
  page-break-inside: avoid;
}
blockquote::before {
  content: '"';
  position: absolute;
  top: 8px; left: 16px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 56pt;
  line-height: 1;
  color: var(--sacred-gold);
  opacity: 0.55;
  font-style: normal;
}
blockquote p { margin-bottom: 8px; }
blockquote p:last-child { margin-bottom: 0; }

/* ─── LISTS → editorial bullets, not SaaS checkboxes ─── */
ul, ol {
  margin: 16px 0 18px 20px;
  padding-left: 8px;
}
ul { list-style: none; padding-left: 0; }
ul li {
  position: relative;
  padding-left: 28px;
  margin-bottom: 12px;
  color: var(--parchment);
  line-height: 1.6;
}
ul li::before {
  content: '';
  position: absolute;
  left: 8px; top: 0.65em;
  width: 8px; height: 1px;
  background: var(--sacred-gold);
}
ol {
  list-style: none;
  counter-reset: editorial-counter;
  padding-left: 0;
}
ol li {
  position: relative;
  padding-left: 36px;
  margin-bottom: 14px;
  counter-increment: editorial-counter;
  color: var(--parchment);
  line-height: 1.6;
}
ol li::before {
  content: counter(editorial-counter, decimal-leading-zero);
  position: absolute;
  left: 0; top: 0.05em;
  font-family: var(--font-mono);
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--coherence-emerald);
}
/* Definition lists — used in case structured tables get rendered as dl */
dl { margin: 16px 0; }
dt {
  font-family: var(--font-mono);
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted-silver);
  margin-top: 14px;
}
dd { font-size: 10.5pt; color: var(--parchment); margin: 2px 0 0; }

/* ─── TABLES → editorial almanac-style ─── */
/* Identity Stack, Yogas, Best-Fit Career, Wealth, Master Timeline, etc.
   Goal: looks like a reference table in a high-end book, not a SaaS dashboard. */
table {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  margin: 28px 0;
  font-size: 9.5pt;
  line-height: 1.5;
  background: transparent;
  table-layout: fixed;            /* prevents runaway column widths */
  word-wrap: break-word;
  overflow-wrap: anywhere;        /* allow break inside long tokens (e.g. Sanskrit) */
  font-variant-numeric: tabular-nums;
}
/* When a table has very few columns or short cells, auto-layout looks better.
   Author can opt back in with .table-flex. */
table.table-flex { table-layout: auto; }
/* Outer top-and-bottom rules in Sacred Gold — classic almanac frame */
table { border-top: 1.5px solid var(--sacred-gold); border-bottom: 1.5px solid var(--sacred-gold); }
thead { background: transparent; }
thead tr { border-bottom: 1px solid rgba(197,160,23,0.45); }
th {
  font-family: var(--font-mono);
  font-weight: 700;
  text-align: left;
  padding: 12px 14px 12px 0;
  font-size: 8.5pt;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sacred-gold);
  word-wrap: break-word;
  overflow-wrap: break-word;
  vertical-align: bottom;
}
th:last-child { padding-right: 0; }
td {
  padding: 10px 14px 10px 0;
  border-top: 1px solid rgba(240,237,227,0.08);
  vertical-align: top;
  color: var(--parchment);
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}
td:last-child { padding-right: 0; }
tbody tr:first-child td { border-top: none; }
/* First-column subtle accent — helps the eye scan rows */
tbody td:first-child {
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--coherence-emerald);
  font-size: 10pt;
  padding-left: 0;
}
/* Quiet hover for the rare on-screen reader */
tbody tr:hover td { background: rgba(197,160,23,0.025); }
/* Numbers / data right-aligned + tabular */
td.num, th.num, td[data-num], th[data-num] {
  text-align: right;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
/* ── Captioned tables (figure.table-figure) — almanac plate treatment ── */
figure.table-figure {
  margin: 36px 0;
  padding: 0;
  page-break-inside: avoid;
}
figure.table-figure > figcaption {
  font-family: var(--font-mono);
  font-size: 8pt;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: var(--sacred-gold);
  margin-bottom: 14px;
  position: relative;
  display: inline-block;
  padding-right: 18px;
}
figure.table-figure > figcaption::after {
  /* Hairline trailing rule extending into the page */
  content: '';
  position: absolute;
  left: 100%; top: 50%;
  width: 120px; height: 1px;
  background: linear-gradient(90deg, rgba(197,160,23,0.45), transparent);
  transform: translateY(-50%);
}
figure.table-figure .table-note {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 9.5pt;
  color: var(--muted-silver);
  margin-top: 10px;
  line-height: 1.55;
  max-width: 90%;
}
/* ── Almanac variant — used for the marquee Identity Stack ── */
table.table-almanac {
  border-top: 2px solid var(--sacred-gold);
  border-bottom: 2px solid var(--sacred-gold);
}
table.table-almanac thead tr { border-bottom: 1.5px solid var(--sacred-gold); }
table.table-almanac th {
  font-size: 8.5pt;
  letter-spacing: 0.22em;
  padding-top: 16px;
  padding-bottom: 16px;
}
table.table-almanac tbody td { padding-top: 12px; padding-bottom: 12px; }
table.table-almanac tbody tr:nth-child(even) td {
  background: rgba(197,160,23,0.02);  /* whisper-zebra */
}
/* ── Wide-fold tables — for wide reference matrices ── */
table.table-wide {
  font-size: 8.5pt;
  line-height: 1.4;
}
table.table-wide th, table.table-wide td {
  padding-left: 6px;
  padding-right: 6px;
}
table.table-wide td:first-child, table.table-wide th:first-child { padding-left: 0; }
@media print {
  /* In print, very wide tables get a rotated landscape page */
  figure.table-figure.table-foldout {
    page-break-before: always;
    page-break-after: always;
    margin: 0 !important;
    transform: rotate(0deg);  /* placeholder — Chrome handles via @page if needed */
  }
}
/* Print: even tighter, full-bleed within text column */
@media print {
  table {
    font-size: 8.5pt;
    margin: 22px 0;
    page-break-inside: avoid;
  }
  th { padding: 8px 10px 8px 0; font-size: 7.5pt; letter-spacing: 0.18em; }
  td { padding: 7px 10px 7px 0; }
  tbody td:first-child { font-size: 9pt; }
}

/* ─── SVG VISUALIZATIONS → plate-style figures ─── */
.viz {
  margin: 56px auto 48px;
  padding: 0;
  background: transparent;
  border: 0;
  text-align: center;
  page-break-inside: avoid;
  position: relative;
}
/* Plate-number eyebrow — sits above viz-title, gives editorial weight */
.viz-figno {
  font-family: var(--font-mono);
  font-size: 7pt;
  letter-spacing: 0.5em;
  text-transform: uppercase;
  color: var(--coherence-emerald);
  margin-bottom: 6px;
  font-variant-numeric: tabular-nums;
}
/* Plate label — short rule + caps eyebrow, like a fine-art plate */
.viz-title {
  font-family: var(--font-mono);
  font-size: 8pt;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--sacred-gold);
  margin: 0 auto 24px;
  position: relative;
  display: inline-block;
  padding: 0 20px;
}
.viz-title::before,
.viz-title::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 24px;
  height: 1px;
  background: rgba(197,160,23,0.45);
}
.viz-title::before { right: 100%; }
.viz-title::after { left: 100%; }
/* Caption: italic serif, narrow, beneath the figure like an art-history footnote */
.viz-caption {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 400;
  font-size: 10pt;
  color: var(--muted-silver);
  margin: 22px auto 0;
  max-width: 78%;
  line-height: 1.55;
  text-align: center;
  letter-spacing: 0.005em;
}
/* Caption attribution / data-source line, below the caption */
.viz-attr {
  font-family: var(--font-mono);
  font-size: 7pt;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--muted-silver);
  opacity: 0.7;
  margin-top: 10px;
  text-align: center;
}
.viz svg {
  max-width: 100%;
  height: auto;
  filter: drop-shadow(0 0 16px rgba(197,160,23,0.05));
}

/* ── Layout grids for figures ── */
/* viz-row — generic flex row, auto-balance children */
.viz-row {
  display: flex;
  gap: 28px;
  margin: 48px 0;
  page-break-inside: avoid;
  align-items: flex-start;
}
.viz-row > .viz, .viz-row > figure { flex: 1; margin: 0; min-width: 0; }
/* viz-pair — 2-column symmetrical pair (e.g. dual Kundalis) */
.viz-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin: 48px 0;
  page-break-inside: avoid;
  align-items: start;
}
.viz-pair > .viz, .viz-pair > figure { margin: 0; }
/* viz-trio — 3-column equal grid for triad readings */
.viz-trio {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 22px;
  margin: 48px 0;
  page-break-inside: avoid;
  align-items: start;
}
.viz-trio > .viz, .viz-trio > figure { margin: 0; }
.viz-trio .viz-title { font-size: 7.5pt; letter-spacing: 0.35em; padding: 0 14px; margin-bottom: 16px; }
.viz-trio .viz-title::before, .viz-trio .viz-title::after { width: 14px; }
/* viz-plate — full-page treatment in print (own page) */
.viz-plate {
  margin: 64px 0;
  padding: 32px 0;
  page-break-before: auto;
  page-break-after: auto;
  page-break-inside: avoid;
  text-align: center;
  position: relative;
}
.viz-plate::before, .viz-plate::after {
  /* Top + bottom hairline gold rules — frames a "plate" */
  content: '';
  display: block;
  height: 1px;
  width: 50%;
  margin: 0 auto;
  background: linear-gradient(90deg, transparent, var(--sacred-gold), transparent);
  opacity: 0.45;
}
.viz-plate::after { margin-top: 28px; }
.viz-plate::before { margin-bottom: 28px; }
.viz-plate > .viz, .viz-plate > figure { margin: 0; }

@media print {
  .viz { margin: 36px auto 32px; }
  .viz-title { font-size: 7pt; letter-spacing: 0.45em; margin-bottom: 16px; }
  .viz-caption { font-size: 9pt; max-width: 88%; margin-top: 14px; }
  .viz-row { gap: 18px; margin: 28px 0; }
  .viz-pair { gap: 22px; margin: 32px 0; }
  .viz-trio { gap: 14px; margin: 28px 0; }
  .viz-trio .viz-title { font-size: 6.5pt; letter-spacing: 0.4em; }
  .viz-plate { margin: 0 !important; padding: 18mm 0 !important; page-break-before: always; page-break-after: always; min-height: 240mm; display: flex; flex-direction: column; justify-content: center; }
}

/* ── Table of Contents (after cover, before Opening) ── */
.toc {
  page-break-after: always;
  padding: 96px 0 64px;
  max-width: 640px;
  margin: 0 auto;
}
.toc-eyebrow {
  font-family: var(--font-mono);
  font-size: 8pt;
  letter-spacing: 0.45em;
  text-transform: uppercase;
  color: var(--sacred-gold);
  margin-bottom: 14px;
  position: relative;
  padding-left: 22px;
}
.toc-eyebrow::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  width: 14px; height: 1px;
  background: var(--sacred-gold);
  transform: translateY(-50%);
}
.toc-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 42pt;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--parchment);
  margin-bottom: 48px;
}
.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px solid rgba(197,160,23,0.25);
}
.toc-list li {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 16px;
  align-items: baseline;
  padding: 14px 0 14px 0;
  border-bottom: 1px solid rgba(240,237,227,0.06);
  page-break-inside: avoid;
}
.toc-list li::before { content: none; }
.toc-num {
  font-family: var(--font-mono);
  font-size: 9pt;
  letter-spacing: 0.18em;
  color: var(--coherence-emerald);
  font-variant-numeric: tabular-nums;
}
.toc-entry {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 13pt;
  color: var(--parchment);
  letter-spacing: -0.005em;
}
.toc-entry small {
  display: block;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 400;
  font-size: 9.5pt;
  color: var(--muted-silver);
  margin-top: 4px;
  letter-spacing: 0.005em;
}
.toc-mark {
  font-family: var(--font-mono);
  font-size: 8pt;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: var(--sacred-gold);
  white-space: nowrap;
}
@media print {
  .toc { padding: 22mm 0 18mm; max-width: none; }
  .toc-title { font-size: 36pt; margin-bottom: 32px; }
}

/* ── Figure Index (at end of document, before final footer) ── */
.fig-index {
  margin-top: 96px;
  padding-top: 48px;
  border-top: 1px solid rgba(197,160,23,0.25);
  page-break-before: always;
}
.fig-index-title {
  font-family: var(--font-mono);
  font-size: 8.5pt;
  letter-spacing: 0.45em;
  text-transform: uppercase;
  color: var(--sacred-gold);
  margin-bottom: 24px;
}
.fig-index ul { list-style: none; padding: 0; margin: 0; }
.fig-index ul li {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 14px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(240,237,227,0.05);
  align-items: baseline;
}
.fig-index ul li::before { content: none; }
.fig-index .fig-no {
  font-family: var(--font-mono);
  font-size: 8pt;
  letter-spacing: 0.22em;
  color: var(--coherence-emerald);
}
.fig-index .fig-label {
  font-family: var(--font-display);
  font-size: 10pt;
  color: var(--parchment);
}

/* ─── SIDE-RAIL (running header for Part navigation in print) ─── */
.side-rail {
  position: absolute;
  left: -40px;
  top: 80px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: var(--font-mono);
  font-size: 8pt;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--muted-silver);
}

/* ─── OPENING SECTION (just after cover, before Part I) ─── */
.opening {
  margin-bottom: 80px;
  padding-bottom: 56px;
  position: relative;
}
.opening::after {
  /* Decorative section break — three diamonds */
  content: '◆   ◆   ◆';
  display: block;
  text-align: center;
  font-size: 8pt;
  letter-spacing: 1.2em;
  color: var(--sacred-gold);
  opacity: 0.45;
  margin-top: 40px;
}
.opening h2 {
  /* The "## Opening — A Note Before Reading" header */
  font-size: 18pt;
  font-style: italic;
  font-weight: 500;
  color: var(--coherence-emerald);
  margin-top: 0;
  margin-bottom: 32px;
  letter-spacing: 0;
}
.opening p {
  font-size: 11.5pt;
  line-height: 1.75;
  margin-bottom: 18px;
  max-width: 100%;
}

/* ─── CONTEXT SIDEBAR (company / venture / role) ─── */
.context-sidebar {
  margin: 40px 0;
  padding: 28px 32px;
  background: linear-gradient(135deg, rgba(45,0,80,0.45), rgba(7,11,29,0.85));
  border: 1px solid rgba(197,160,23,0.35);
  border-left: 3px solid var(--sacred-gold);
  border-radius: 2px;
  position: relative;
  page-break-inside: avoid;
}
.context-sidebar::before {
  content: 'CONTEXT';
  position: absolute;
  top: -10px;
  left: 24px;
  background: var(--void-black);
  padding: 0 12px;
  font-family: var(--font-mono);
  font-size: 8pt;
  letter-spacing: 0.4em;
  color: var(--sacred-gold);
}
.context-sidebar-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18pt;
  color: var(--parchment);
  line-height: 1.2;
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}
.context-sidebar-subtitle {
  font-family: var(--font-mono);
  font-size: 9pt;
  letter-spacing: 0.2em;
  color: var(--coherence-emerald);
  margin-bottom: 16px;
}
.context-sidebar-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 32px;
  margin-top: 16px;
}
.context-sidebar dl {
  margin: 0;
  font-size: 9pt;
  line-height: 1.5;
}
.context-sidebar dt {
  font-family: var(--font-mono);
  font-size: 8pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted-silver);
  margin-top: 10px;
}
.context-sidebar dd {
  font-family: var(--font-body);
  font-size: 10pt;
  color: var(--parchment);
  margin: 2px 0 0;
}
.context-sidebar dd a { color: var(--coherence-emerald); }
.context-sidebar .relevance {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgba(197,160,23,0.2);
  font-family: var(--font-body);
  font-size: 10pt;
  font-style: italic;
  color: var(--parchment);
  line-height: 1.55;
}
.context-sidebar .relevance strong {
  font-family: var(--font-display);
  font-style: normal;
  color: var(--sacred-gold);
}

/* ─── FOOTER → quiet, embossed ─── */
.doc-footer {
  margin-top: 120px;
  padding: 56px 0 40px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 8.5pt;
  letter-spacing: 0.22em;
  color: var(--muted-silver);
  position: relative;
}
/* Hairline rule with a single gold seed at center, like a watermark */
.doc-footer::before {
  content: '';
  position: absolute;
  top: 0; left: 50%;
  width: 200px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--sacred-gold), transparent);
  transform: translateX(-50%);
}
.doc-footer .tagline {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 500;
  font-size: 13pt;
  color: var(--coherence-emerald);
  letter-spacing: 0.01em;
  margin-bottom: 18px;
}
.doc-footer .quine {
  margin-top: 18px;
  font-family: var(--font-display);
  font-size: 10.5pt;
  font-style: italic;
  font-weight: 400;
  color: var(--muted-silver);
  max-width: 560px;
  margin-left: auto; margin-right: auto;
  line-height: 1.65;
  letter-spacing: 0.005em;
}
.doc-footer .quine::before { content: '∴ '; color: var(--sacred-gold); }

/* ─── PRINT STYLESHEET (Chrome headless / @media print) ─── */
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  html, body {
    background: var(--void-black) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .canvas {
    background: var(--void-black) !important;
    background-attachment: initial;
  }
  /* Cover: full-bleed, no padding wasted */
  .cover {
    width: 210mm;
    min-height: 297mm;
    height: 297mm;
    padding: 22mm 18mm !important;
    page-break-after: always;
    background: var(--kha-arc) !important;
  }
  /* Sigil is hidden in print — typography carries the cover */
  .cover-sigil-stage { display: none !important; }
  /* Part starts on new page */
  .part-header { page-break-before: always; }
  .opening { page-break-after: always; }
  /* Vizs and tables shouldn't split mid-element */
  .viz, table, blockquote { page-break-inside: avoid; }
  h2, h3, h4 { page-break-after: avoid; }
  /* SVG visualizations: scale within content area */
  .viz svg { max-width: 100% !important; height: auto !important; }
  figure.viz { max-width: 100%; overflow: hidden; }
  /* Hide footer separator (it's between Parts in print) */
  .doc-footer { page-break-before: always; }
}

/* ════ Interactive layer print flattening (P2.3 #44) ═══════════════════
 * When this artifact is printed to PDF (or media print preview), strip
 * all interactivity: animations off, sticky-positioned vizes collapse to
 * flow position, hover-only tooltips hidden, scroll-snap disabled. The
 * PDF is the static archive; the on-screen experience is the primary.
 */
@media print {
  /* Strip all animations + transitions */
  .canvas.interactive *,
  .canvas.interactive *::before,
  .canvas.interactive *::after {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
  /* Cover elements appear immediately (no animated reveal) */
  .cover .cover-sigil-stage svg,
  .cover h1.cover-title,
  .cover .cover-subject,
  .cover .cover-tagline {
    opacity: 1 !important;
  }
  /* Disable scroll-snap so plates flow naturally */
  .canvas.interactive {
    scroll-snap-type: none !important;
    scroll-behavior: auto !important;
  }
  /* Body-page grid collapses to single column */
  .body-page.interactive {
    display: block !important;
    grid-template-columns: none !important;
    max-width: 100% !important;
    padding: 0 !important;
  }
  /* Hide sticky TOC rail (table of contents page already serves this in print) */
  .toc-rail { display: none !important; }
  /* Per-Part sticky-viz column collapses to flow */
  .part-block.has-viz {
    display: block !important;
    grid-template-columns: none !important;
  }
  .part-block.has-viz .part-viz-column {
    position: static !important;
    top: 0 !important;
    max-height: none !important;
    margin-top: 24px;
  }
  /* Plate sections lose viewport-min-height — let them size to content */
  .viz-plate {
    min-height: 0 !important;
    scroll-snap-align: none !important;
  }
  /* Hover-only tooltips never appear in print */
  #bridge-tooltip { display: none !important; }
  /* Show all collapsed/filtered content (no mode-state in print) */
  [data-filter-hidden],
  [hidden][data-interactive] { display: revert !important; }
}
`;
