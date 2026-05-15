// ─── /integratedreading — Interactions Framework ───────────────────────
// Per-mode interaction modules emit three strings that the interactive
// HTML page scaffold inlines into a single self-contained artifact:
//   - scrollTimelineCss: CSS scroll-driven animations + sticky layouts
//   - gsapTimeline: GSAP timeline JS (loaded via CDN ScrollTrigger)
//   - eventHandlers: inline JS for hover / click / filter affordances
//
// Each module is tied to a topology key (dyad-arc / triad-triangle /
// pentagon / web-graph). Mode docs declare svg_topology; the orchestrator
// dispatches via INTERACTION_MODULES.
//
// Pentagon + web-graph throw NotImplementedError until P4.3 / P5.3.
//
// Per design doc § 5 (interactive HTML primary output), P2.2 deliverable.
// Closes #43.

import type { TopologyKey } from '../svg/index.js';

// ────────────────────────────────────────────────────────────────────────
// Module shape
// ────────────────────────────────────────────────────────────────────────

export interface InteractionModule {
  /** Inline CSS — scroll-timeline animations, sticky positioning, transition rules. */
  scrollTimelineCss: string;
  /** Inline JS — GSAP timeline + ScrollTrigger registrations (CDN-loaded GSAP). */
  gsapTimeline: string;
  /** Inline JS — event handlers (hover / click / filter / scroll-snap watchers). */
  eventHandlers: string;
}

// ────────────────────────────────────────────────────────────────────────
// dyad-arc — basic interactions for the 2-subject composite
// ────────────────────────────────────────────────────────────────────────

const dyadArcModule: InteractionModule = {
  scrollTimelineCss: `
/* Dyad-arc — subject arcs pulse softly on hover */
.viz svg path[stroke="${'#10B5A7'}"],
.viz svg path[stroke="${'#0B50FB'}"] {
  transition: stroke-width 0.4s ease, filter 0.4s ease;
}
.viz svg path[stroke="${'#10B5A7'}"]:hover,
.viz svg path[stroke="${'#0B50FB'}"]:hover {
  stroke-width: 3;
  filter: drop-shadow(0 0 6px currentColor);
}

/* Electromagnetic channel threads — luminous pulse on hover */
.viz svg path[stroke^="url(#dyad-thread"] {
  transition: opacity 0.3s ease;
  cursor: pointer;
}
.viz svg path[stroke^="url(#dyad-thread"]:hover {
  opacity: 1 !important;
}

/* Subject labels — gentle scale-up on hover */
.viz svg text[font-family*="Panchang"][font-weight="700"] {
  transition: transform 0.3s ease;
  transform-origin: center;
}
.viz svg text[font-family*="Panchang"][font-weight="700"]:hover {
  transform: scale(1.04);
}
`,

  gsapTimeline: `
// Dyad-arc — scroll-scrub the dasha-stagger timeline if present
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
  // Reveal threads as the dyad-arc SVG enters viewport
  document.querySelectorAll('.viz svg').forEach(function(svg) {
    var threads = svg.querySelectorAll('path[stroke^="url(#dyad-thread"]');
    if (threads.length === 0) return;
    gsap.from(threads, {
      strokeDashoffset: 200,
      strokeDasharray: 200,
      duration: 1.4,
      stagger: 0.18,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: svg,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
    });
  });
}
`,

  eventHandlers: `
// Dyad-arc — tooltip on channel-thread hover surfaces the bridge name
document.querySelectorAll('.viz svg path[stroke^="url(#dyad-thread"]').forEach(function(path) {
  var label = path.nextElementSibling;
  while (label && label.tagName !== 'text') label = label.nextElementSibling;
  if (!label) return;
  path.setAttribute('data-bridge', label.textContent || '');
  path.addEventListener('mouseenter', function(e) { showBridgeTooltip(e, path.getAttribute('data-bridge')); });
  path.addEventListener('mouseleave', hideBridgeTooltip);
});
`,
};

// ────────────────────────────────────────────────────────────────────────
// triad-triangle — basic interactions for 3-subject synastry
// ────────────────────────────────────────────────────────────────────────

const triadTriangleModule: InteractionModule = {
  scrollTimelineCss: `
/* Triad-triangle — vertex arcs grow soft halo on hover */
.viz svg circle[fill="none"][stroke-width="1.6"] {
  transition: stroke-width 0.4s ease, filter 0.4s ease;
}
.viz svg circle[fill="none"][stroke-width="1.6"]:hover {
  stroke-width: 2.4;
  filter: drop-shadow(0 0 8px currentColor);
}

/* Pair-thread gradient lines — pulse on hover */
.viz svg line[stroke^="url(#triad-thread"] {
  transition: stroke-opacity 0.3s ease, stroke-width 0.3s ease;
  cursor: pointer;
}
.viz svg line[stroke^="url(#triad-thread"]:hover {
  stroke-width: 2 !important;
}

/* TRIAD center seed — gentle scale on hover */
.viz svg circle[r="44"] {
  transition: transform 0.4s ease;
  transform-origin: center;
  transform-box: fill-box;
}
.viz svg circle[r="44"]:hover {
  transform: scale(1.06);
}
`,

  gsapTimeline: `
// Triad-triangle — sequential reveal: vertices first, then threads, then center
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('.viz svg').forEach(function(svg) {
    var vertices = svg.querySelectorAll('circle[fill="none"][stroke-width="1.6"]');
    var threads = svg.querySelectorAll('line[stroke^="url(#triad-thread"]');
    var center = svg.querySelector('circle[r="44"]');
    if (vertices.length === 0 && threads.length === 0) return;
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: svg,
        start: 'top 75%',
        toggleActions: 'play none none reverse',
      },
    });
    if (vertices.length > 0) tl.from(vertices, { scale: 0, opacity: 0, duration: 0.7, stagger: 0.15, ease: 'back.out(1.7)', transformOrigin: 'center', transformBox: 'fill-box' });
    if (threads.length > 0) tl.from(threads, { drawSVG: 0, duration: 0.9, stagger: 0.12, ease: 'power2.out' }, '-=0.4');
    if (center) tl.from(center, { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(2)', transformOrigin: 'center', transformBox: 'fill-box' }, '-=0.3');
  });
}
`,

  eventHandlers: `
// Triad-triangle — click a vertex to scroll to the section about that subject
document.querySelectorAll('.viz svg circle[fill="none"][stroke-width="1.6"]').forEach(function(vertex) {
  vertex.style.cursor = 'pointer';
  vertex.addEventListener('click', function() {
    // Find adjacent subject-name text label
    var sibling = vertex.parentElement.querySelectorAll('text[font-weight="700"]');
    for (var i = 0; i < sibling.length; i++) {
      var name = (sibling[i].textContent || '').trim();
      if (!name) continue;
      var target = document.querySelector('h2[id*="' + name.toLowerCase().replace(/[^a-z]+/g, '-') + '"], section[id*="' + name.toLowerCase().replace(/[^a-z]+/g, '-') + '"]');
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
  });
});
`,
};

// ────────────────────────────────────────────────────────────────────────
// Stub modules — pentagon (P4.3) + web-graph (P5.3)
// ────────────────────────────────────────────────────────────────────────

const pentagonStubModule: InteractionModule = {
  scrollTimelineCss: '/* pentagon interactions land in #51 (P4.3) */',
  gsapTimeline: '// pentagon interactions land in #51 (P4.3)',
  eventHandlers: '// pentagon interactions land in #51 (P4.3)',
};

const webGraphStubModule: InteractionModule = {
  scrollTimelineCss: '/* web-graph interactions land in #54 (P5.3) */',
  gsapTimeline: '// web-graph interactions land in #54 (P5.3)',
  eventHandlers: '// web-graph interactions land in #54 (P5.3)',
};

// ────────────────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────────────────

export const INTERACTION_MODULES: Record<TopologyKey, InteractionModule> = {
  'dyad-arc': dyadArcModule,
  'triad-triangle': triadTriangleModule,
  'pentagon': pentagonStubModule,
  'web-graph': webGraphStubModule,
};

// ────────────────────────────────────────────────────────────────────────
// Mode-keyed interactions (layered ON TOP of topology-keyed)
//
// Different modes can share an SVG topology but want different
// affordances. E.g., both `partner-synastry` and `composite-dyad` use
// `dyad-arc`, but synastry needs the four-way-bridge tooltip while the
// generic composite uses the basic thread pulse. Mode-keyed modules
// declare additional CSS/JS that gets COMPOSED with the topology base.
//
// Authoring contract:
//   - mode-keyed modules layer ON TOP of topology-keyed modules
//   - they do NOT replace topology modules
//   - per-mode css/gsap/handlers are appended after topology equivalents
//   - look up by mode name first, fall back to topology if no mode entry
// ────────────────────────────────────────────────────────────────────────

import { partnerSynastryModule } from './partner-synastry.js';
import { businessPartnersModule } from './business-partners.js';
import { familyPentaModule } from './family-penta.js';
import { teamSynergyModule } from './team-synergy.js';

export const MODE_INTERACTION_MODULES: Record<string, InteractionModule> = {
  'partner-synastry': partnerSynastryModule,
  'business-partners': businessPartnersModule,
  'family-penta': familyPentaModule,
  'team-synergy': teamSynergyModule,
};

// ────────────────────────────────────────────────────────────────────────
// Shared base — scroll-narrative scaffold CSS + JS that EVERY interactive
// page gets, regardless of topology. This drives the cover fade-in,
// sticky TOC rail, plate scroll-snap, and per-Part sticky-viz columns.
// ────────────────────────────────────────────────────────────────────────

export const BASE_SCROLL_NARRATIVE_CSS = `
/* ════ Scroll-Narrative Scaffold (P2.1) ════════════════════════════════ */

/* Body becomes the scroll container */
.canvas.interactive {
  scroll-behavior: smooth;
}

/* ── Cover — mandala fades in on initial paint; text is INSTANT VISIBLE.
 * Earlier versions used cover-text-reveal CSS keyframes with delays, but
 * that broke headless print rendering + caused flash-of-invisible-text
 * on slow connections. GSAP handles the parallax-on-scroll dim/rotation
 * for the mandala (see BASE_INTERACTIVE_JS). Cover text is solid from
 * paint-1 with no reveal animation — it's the artifact's first impression. */
.cover .cover-svg-wrap svg {
  animation: cover-mandala-reveal 1.6s ease-out 0.3s both;
}
@keyframes cover-mandala-reveal {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── Body layout — full-viewport responsive 3-column grid ─────────────
 * Wide  (>1400px): [TOC rail] [prose 720px] [right meta column 1fr]
 * Mid   (900-1400): [TOC rail] [prose flex] [aside collapses if tight]
 * Small (<900):    [stack] — TOC at top, prose flowing, no aside
 *
 * The container uses CLAMP padding so side gutters scale with viewport —
 * a 2000px-wide screen gets 96px gutters; a 1100px screen gets 32px.
 */
.body-page.interactive {
  display: grid;
  grid-template-columns:
    minmax(180px, 240px)
    minmax(0, 740px)
    minmax(0, 1fr);
  column-gap: clamp(32px, 4vw, 80px);
  row-gap: 0;
  max-width: min(1640px, 96vw);
  margin: 0 auto;
  padding: clamp(48px, 6vw, 96px) clamp(24px, 4vw, 64px) 96px;
  position: relative;
  z-index: 5;
}
/* The prose column takes the middle grid track. No internal max-width
   needed — the grid track itself caps it at 740px. */
.body-content {
  width: 100%;
  min-width: 0;
  grid-column: 2;
}
/* Long headings hyphenate cleanly within prose but DO NOT break inside
   tables (tables get their own break rule below). */
.body-content > .opening h1,
.body-content > .opening h2,
.body-content > .opening h3,
.part-block .part-prose > h1,
.part-block .part-prose > h2,
.part-block .part-prose > h3,
.part-block .part-prose > h4 {
  overflow-wrap: anywhere;
  hyphens: auto;
  word-break: normal;
}

/* Tables in long-form prose can BREAK OUT of the 740px prose column when
   they need more width. They never letter-fragment — overflow-x: auto
   lets them scroll horizontally if the viewport is genuinely narrow. */
.body-content table,
.part-prose table {
  display: block;
  width: 100%;
  max-width: none;
  overflow-x: auto;
  margin: 32px -clamp(8px, 2vw, 32px);  /* slight break-out */
  padding-right: clamp(8px, 2vw, 32px);
  border-collapse: collapse;
  font-size: 9.5pt;
  line-height: 1.55;
}
.body-content table thead,
.part-prose table thead {
  background: rgba(197, 160, 23, 0.05);
}
.body-content table th,
.body-content table td,
.part-prose table th,
.part-prose table td {
  /* Critical: do NOT word-break inside tables. Cells size naturally. */
  overflow-wrap: normal;
  word-break: normal;
  hyphens: manual;
  white-space: normal;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(240, 237, 227, 0.08);
  vertical-align: top;
  min-width: 110px;
  text-align: left;
}
.body-content table th,
.part-prose table th {
  font-family: var(--font-mono);
  font-size: 8.5pt;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sacred-gold);
  font-weight: 700;
  border-bottom: 1.5px solid var(--sacred-gold);
}

/* Right meta column — placeholder until per-Part viz cards land.
   Even empty, it should not collapse so the grid keeps its proportions
   on wide screens. */
.body-page.interactive::after {
  content: '';
  grid-column: 3;
  /* This is a non-displayed grid filler. Real content comes from a sidebar
     element when per-Part viz is wired. */
  display: none;
}

/* ── Responsive breakpoints ───────────────────────────────────────── */
@media (max-width: 1180px) {
  /* Collapse to 2-column: TOC + prose, no right column */
  .body-page.interactive {
    grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
    column-gap: 48px;
  }
}
@media (max-width: 900px) {
  /* Stack everything */
  .body-page.interactive {
    grid-template-columns: 1fr;
    column-gap: 0;
    padding: 32px 16px 64px;
  }
  .toc-rail {
    position: static !important;
    top: 0 !important;
    max-height: none !important;
    margin-bottom: 32px;
    padding: 16px;
    border: 1px solid rgba(197, 160, 23, 0.2);
    border-radius: 4px;
  }
  .body-content {
    grid-column: 1;
  }
}
.toc-rail {
  position: sticky;
  top: 32px;
  align-self: start;
  font-family: var(--font-mono);
  font-size: 10pt;
  line-height: 1.6;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
}
.toc-rail-title {
  font-size: 8pt;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--sacred-gold);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(197,160,23,0.25);
}
.toc-rail ol {
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: rail;
}
.toc-rail li {
  counter-increment: rail;
  margin-bottom: 12px;
  padding: 6px 10px 6px 28px;
  position: relative;
  cursor: pointer;
  transition: color 0.3s ease, border-left-color 0.3s ease;
  color: var(--muted-silver);
  border-left: 2px solid transparent;
  border-radius: 2px;
}
.toc-rail li::before {
  content: counter(rail, upper-roman) '.';
  position: absolute;
  left: 6px;
  font-variant-numeric: tabular-nums;
  font-size: 8pt;
  color: var(--coherence-emerald);
  opacity: 0.7;
}
.toc-rail li:hover {
  color: var(--parchment);
}
.toc-rail li.active {
  color: var(--sacred-gold);
  border-left-color: var(--sacred-gold);
  background: rgba(197,160,23,0.05);
}
.toc-rail a {
  color: inherit;
  text-decoration: none;
  display: block;
}

/* ── Per-Part sticky-viz column layout ─────────────────────────────── */
.part-block {
  margin-bottom: 96px;
}
.part-block.has-viz {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 48px;
  align-items: start;
}
.part-block.has-viz .part-prose { min-width: 0; }
.part-block.has-viz .part-viz-column {
  position: sticky;
  top: 32px;
  align-self: start;
  max-height: calc(100vh - 64px);
}
.part-block.has-viz .part-viz-column figure.viz { margin: 0; }
.part-block.has-viz .part-viz-column .viz svg { max-width: 100%; }

/* ── Plate sections — natural sizing, scroll-snap REMOVED (was causing
 *    a jarring empty band between cover and first plate). Plate visual
 *    treatment via the existing top/bottom hairline rules from .viz-plate
 *    in the base STYLES still applies. */
.viz-plate {
  /* No min-height, no scroll-snap. The plate sizes to its content + the
   *    existing top/bottom gold-rule frame from STYLES. */
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
}

/* ── Scroll-driven reveal — DISABLED by default ──────────────────────
 * The earlier @supports(animation-timeline: view()) block kept .part-block,
 * .opening, etc. at opacity:0 by default and only revealed them as the
 * element entered the viewport. This broke headless rendering + caused
 * flash-of-invisible-text on first paint when virtual-time-budget didn't
 * fully drive the scroll-timeline. The artifact must LOOK GREAT by
 * default; reveal animations are progressive sugar — see the GSAP
 * timeline in BASE_INTERACTIVE_JS for the visible scroll-narrative.
 *
 * If you want the CSS scroll-driven animation back, opt-in per-element
 * via a data-animate-on-scroll attribute; never on every .part-block.
 */

/* ──────────────────────────────────────────────────────────────────────
 * Editorial layer — what makes the artifact feel like a designed object,
 * not just structured prose.
 * ──────────────────────────────────────────────────────────────────────
 */

/* Part header — bigger Roman numeral + leading gold rule + scale-on-scroll.
 * The user sees a clear chapter mark as each Part enters view. */
.part-header {
  margin: 96px 0 32px;
  padding-top: 32px;
  position: relative;
}
.part-header::before {
  /* The leading gold rule that announces a new Part */
  content: '';
  display: block;
  width: 64px;
  height: 2px;
  background: var(--sacred-gold);
  margin-bottom: 24px;
}
.part-eyebrow {
  font-family: var(--font-mono);
  font-size: 9pt;
  letter-spacing: 0.55em;
  text-transform: uppercase;
  color: var(--coherence-emerald);
  margin-bottom: 12px;
  font-variant-numeric: tabular-nums;
}
.part-title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 38pt;
  line-height: 1.02;
  letter-spacing: -0.025em;
  color: var(--parchment);
  margin: 0 0 12px;
}
.part-subtitle {
  font-family: var(--font-mono);
  font-size: 8.5pt;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--muted-silver);
  margin-bottom: 32px;
  opacity: 0.7;
}

/* Drop-cap on the first paragraph of each Part — editorial signature */
.part-prose > p:first-of-type::first-letter {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 5.2em;
  line-height: 0.92;
  float: left;
  color: var(--sacred-gold);
  margin: 8px 14px -4px 0;
  padding-top: 4px;
  text-shadow: 0 0 24px rgba(197,160,23,0.18);
}

/* Cross-reference highlights — bold + colored text gets a subtle gold
 * accent + underline-on-hover. Makes the multi-system braid VISIBLE. */
.part-prose strong {
  color: var(--sacred-gold);
  font-weight: 700;
  letter-spacing: -0.005em;
}
.part-prose em {
  color: var(--coherence-emerald);
  font-style: italic;
}
/* Inline code spans (Sanskrit anchors, technical names) */
.part-prose code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  color: var(--coherence-emerald);
  background: rgba(16,181,167,0.05);
  padding: 1px 6px;
  border-radius: 2px;
  letter-spacing: 0.02em;
}

/* Pull-quote — h3 sub-headings can be styled like editorial pull-quotes
 * when they carry weight. Add gold left rule. */
.part-prose h3 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16pt;
  line-height: 1.25;
  color: var(--sacred-gold);
  margin: 48px 0 16px;
  padding-left: 18px;
  border-left: 3px solid var(--sacred-gold);
  letter-spacing: -0.01em;
}
.part-prose h4 {
  font-family: var(--font-mono);
  font-size: 9.5pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--coherence-emerald);
  margin: 32px 0 12px;
}

/* Paragraph rhythm tuned for long-form reading */
.part-prose p {
  font-family: var(--font-display);
  font-size: 11.5pt;
  line-height: 1.72;
  color: var(--parchment);
  margin: 0 0 22px;
  letter-spacing: 0.002em;
}

/* Between-Part divider — three centered dots (∴ + hairline rules either side) */
.part-block + .part-block::before {
  content: '∴';
  display: block;
  text-align: center;
  font-family: var(--font-display);
  font-size: 18pt;
  color: var(--sacred-gold);
  opacity: 0.45;
  margin: 64px auto 32px;
  letter-spacing: 0.5em;
}

/* Opening section — first paragraph is the reading's address */
.opening {
  margin-bottom: 96px;
  padding: 48px 0;
  border-bottom: 1px solid rgba(197,160,23,0.18);
}
.opening p:first-of-type {
  font-family: var(--font-display);
  font-weight: 500;
  font-style: italic;
  font-size: 14pt;
  line-height: 1.55;
  color: var(--sacred-gold);
  margin-bottom: 22px;
}
.opening p {
  font-family: var(--font-display);
  font-size: 12pt;
  line-height: 1.7;
  color: var(--parchment);
  margin-bottom: 18px;
}

/* ── Tooltips for hover-bridge revelations ─────────────────────────── */
#bridge-tooltip {
  position: fixed;
  pointer-events: none;
  background: var(--void-black);
  color: var(--parchment);
  border: 1px solid var(--sacred-gold);
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: 9pt;
  letter-spacing: 0.05em;
  max-width: 280px;
  z-index: 9999;
  opacity: 0;
  transform: translate(-50%, -110%);
  transition: opacity 0.2s ease;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
#bridge-tooltip.visible { opacity: 1; }
#bridge-tooltip::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: var(--void-black);
  border-right: 1px solid var(--sacred-gold);
  border-bottom: 1px solid var(--sacred-gold);
}

/* ── Mobile / narrow viewport — collapse grid to single column ─────── */
@media (max-width: 900px) {
  .body-page.interactive { grid-template-columns: 1fr; padding: 24px 16px; }
  .toc-rail {
    position: relative;
    top: 0;
    max-height: none;
    margin-bottom: 32px;
    padding: 16px;
    border: 1px solid rgba(197,160,23,0.2);
    border-radius: 4px;
  }
  .part-block.has-viz {
    grid-template-columns: 1fr;
  }
  .part-block.has-viz .part-viz-column {
    position: relative;
    top: 0;
    max-height: none;
  }
}

/* ── Reduced motion — strip animations for accessibility ───────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
`;

export const BASE_INTERACTIVE_JS = `
// ════ Scroll-Narrative Runtime (P2.1) ═══════════════════════════════
(function() {
  // ── Bridge tooltip ────────────────────────────────────────────────
  var tooltipEl = null;
  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'bridge-tooltip';
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }
  window.showBridgeTooltip = function(evt, text) {
    if (!text) return;
    var el = ensureTooltip();
    el.textContent = text;
    el.style.left = (evt.clientX) + 'px';
    el.style.top = (evt.clientY) + 'px';
    el.classList.add('visible');
  };
  window.hideBridgeTooltip = function() {
    if (tooltipEl) tooltipEl.classList.remove('visible');
  };

  // ── TOC rail — Intersection Observer auto-highlights current Part ─
  var tocItems = document.querySelectorAll('.toc-rail li[data-part]');
  if (tocItems.length > 0 && 'IntersectionObserver' in window) {
    var partSections = {};
    tocItems.forEach(function(li) {
      var partNum = li.getAttribute('data-part');
      var section = document.getElementById('part-' + partNum);
      if (section) partSections[partNum] = { section: section, li: li };
    });
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var partNum = entry.target.id.replace('part-', '');
          Object.keys(partSections).forEach(function(k) {
            partSections[k].li.classList.toggle('active', k === partNum);
          });
        }
      });
    }, { rootMargin: '-30% 0% -60% 0%', threshold: 0 });
    Object.values(partSections).forEach(function(p) { observer.observe(p.section); });
  }

  // ── Smooth-scroll on TOC click ────────────────────────────────────
  document.querySelectorAll('.toc-rail a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ── GSAP scroll-reveals (progressive sugar — never hide content) ───
  // CRITICAL: every animation here uses fromTo() with immediateRender:false
  // OR to() so elements DEFAULT to visible. If GSAP/ScrollTrigger do not
  // fire (slow browser, headless render, print, prefers-reduced-motion),
  // the artifact still reads correctly.
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Part header reveal — animates IN from a slightly-lower position
    // ONLY when the header enters view; never hides the content.
    document.querySelectorAll('.part-header').forEach(function(header) {
      var eyebrow = header.querySelector('.part-eyebrow');
      var title   = header.querySelector('.part-title');
      var subtitle= header.querySelector('.part-subtitle');

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: header,
          start: 'top 80%',
          toggleActions: 'play none none none',  // play once, never reverse
        },
      });
      if (eyebrow) tl.fromTo(eyebrow,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', immediateRender: false });
      if (title) tl.fromTo(title,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', immediateRender: false }, '-=0.2');
      if (subtitle) tl.fromTo(subtitle,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', immediateRender: false }, '-=0.3');
    });

    // Cover-to-body parallax — cover SVG mandala scrubs as user scrolls.
    // gsap.to() animates FROM the natural state, so the SVG defaults to
    // visible. No from() hiding here.
    var coverSvg = document.querySelector('.cover-svg-wrap svg');
    if (coverSvg) {
      gsap.to(coverSvg, {
        rotation: 25,
        opacity: 0.2,
        scale: 1.1,
        scrollTrigger: {
          trigger: '.cover',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
        },
        transformOrigin: 'center center',
      });
    }
  }

  // ── Scroll-progress indicator on TOC rail (subtle gold tick mark) ──
  var progressTick = document.createElement('div');
  progressTick.id = 'scroll-progress-tick';
  progressTick.style.cssText = 'position:fixed;top:0;left:0;height:2px;background:linear-gradient(90deg,var(--coherence-emerald),var(--sacred-gold));width:0%;z-index:10000;transition:width 0.15s linear;pointer-events:none;';
  document.body.appendChild(progressTick);
  window.addEventListener('scroll', function() {
    var h = document.documentElement;
    var pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    progressTick.style.width = pct + '%';
  });
})();
`;

/**
 * Convenience — assemble all three layers (CSS / GSAP / handlers).
 *
 * Composition order (bottom → top):
 *   1. BASE_SCROLL_NARRATIVE_CSS + BASE_INTERACTIVE_JS (always)
 *   2. Topology-keyed module (e.g., dyad-arc thread pulse)
 *   3. Mode-keyed module if `mode` provided (e.g., synastry bridge tooltip)
 *
 * Pass only `topology` for the legacy single-arg call. Pass both for
 * mode-aware composition.
 */
export function buildInteractionPayload(topology: string, mode?: string): {
  css: string;
  gsap: string;
  handlers: string;
} {
  const topoMod = INTERACTION_MODULES[topology as TopologyKey];
  if (!topoMod) {
    return {
      css: `/* unknown topology '${topology}' — no interaction module */`,
      gsap: `// unknown topology '${topology}'`,
      handlers: `// unknown topology '${topology}'`,
    };
  }
  const modeMod = mode ? MODE_INTERACTION_MODULES[mode] : undefined;
  const css = [BASE_SCROLL_NARRATIVE_CSS, topoMod.scrollTimelineCss, modeMod?.scrollTimelineCss].filter(Boolean).join('\n');
  const gsap = [topoMod.gsapTimeline, modeMod?.gsapTimeline].filter(Boolean).join('\n');
  const handlers = [BASE_INTERACTIVE_JS, topoMod.eventHandlers, modeMod?.eventHandlers].filter(Boolean).join('\n');
  return { css, gsap, handlers };
}

export const GSAP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
export const GSAP_SCROLLTRIGGER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js';
