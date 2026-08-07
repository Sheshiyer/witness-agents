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

/* ── Cover — animated sigil fade-in on initial paint ──────────────── */
.cover .cover-sigil-stage svg {
  opacity: 0;
  transform: scale(0.94);
  animation: cover-sigil-reveal 1.6s ease-out 0.3s forwards;
}
@keyframes cover-sigil-reveal {
  to { opacity: 1; transform: scale(1); }
}
.cover h1.cover-title,
.cover .cover-subject,
.cover .cover-tagline {
  opacity: 0;
  animation: cover-text-reveal 0.9s ease-out forwards;
}
.cover h1.cover-title { animation-delay: 0.5s; }
.cover .cover-subject { animation-delay: 0.8s; }
.cover .cover-tagline { animation-delay: 1.1s; }
@keyframes cover-text-reveal {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Body layout — single centered reading column with fluid sizing ──
 * All sizing is now relative (vw/rem/clamp). The reading column scales
 * from ~320px on mobile to ~1280px on 4K. Inside it, paragraphs cap at
 * ~64ch for readability while headings and figures are allowed to span
 * the wider container so short titles don't break into 5 lines on
 * desktop. Body text also scales fluidly so typography stays balanced
 * at every viewport.
 */
.body-page.interactive {
  display: block;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  position: relative;
}
.body-content {
  width: clamp(18rem, 72vw, 80rem);
  margin: 0 auto;
  padding: clamp(2rem, 4vw, 5rem) clamp(1rem, 2.4vw, 2.5rem) clamp(3rem, 6vw, 6rem);
  box-sizing: border-box;
  /* Body type scales fluidly with viewport so the reading rhythm is
     proportional, not pinned to one viewport size. */
  font-size: clamp(1rem, 0.85rem + 0.45vw, 1.22rem);
  line-height: 1.65;
}
/* Inside the reading column, paragraphs and list items stay inside the
   readable line-length sweet spot. Headings + figures + tables are
   allowed to span the full container width so short headings don't
   wrap into 5 lines on wide viewports. */
.body-content :where(p, li, blockquote p) {
  max-width: 64ch;
}
.body-content :where(h2, h3, h4, figure, table, .viz-plate, .part-viz-column, .context-sidebar) {
  max-width: 100%;
}
.body-content :where(.part-title, .part-subtitle, .cover-title) {
  max-width: 100%;
}
/* Headline + heading sizes also become fluid */
.body-content h2 {
  font-size: clamp(1.3rem, 1rem + 1vw, 2.2rem);
  line-height: 1.18;
}
.body-content h3 {
  font-size: clamp(1.05rem, 0.85rem + 0.6vw, 1.5rem);
  line-height: 1.28;
}
.body-content h4 {
  font-size: clamp(0.85rem, 0.7rem + 0.3vw, 1.05rem);
  letter-spacing: 0.16em;
}
.body-content .part-title {
  font-size: clamp(2rem, 1.4rem + 2.4vw, 4.5rem);
  line-height: 1.02;
}
.body-content .part-subtitle {
  font-size: clamp(0.9rem, 0.75rem + 0.4vw, 1.2rem);
}
.toc-rail {
  /* Fixed-position rail at the left viewport edge. Does NOT consume any
     of the reading column's width. Visible only when there's enough
     viewport room to the left of the centered reading column. */
  position: fixed;
  top: 50%;
  left: 24px;
  transform: translateY(-50%);
  width: 180px;
  max-height: 70vh;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 9.5pt;
  line-height: 1.55;
  z-index: 20;
  padding: 18px 14px;
  background: rgba(7,11,29,0.78);
  border: 1px solid rgba(197,160,23,0.18);
  border-radius: 4px;
  backdrop-filter: blur(8px);
  transition: opacity 0.3s ease;
}
@media (max-width: 1100px) {
  /* Below 1100px there isn't enough margin for a fixed rail without
     overlapping the reading column — hide it entirely. The user
     navigates by scrolling. */
  .toc-rail { display: none; }
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

/* ── Per-Part layout — viz becomes an inline figure between verses ───
 * No more sticky-side-column splitting the reading width. The viz is a
 * full-width figure that sits between the part-header and the prose,
 * rendered as part of the verse rhythm.
 */
.part-block {
  margin-bottom: 96px;
  display: block;
}
.part-block.has-viz .part-viz-column {
  display: block;
  margin: 32px 0 48px;
  padding: 0;
  position: static;
  max-height: none;
}
.part-block.has-viz .part-viz-column figure.viz {
  margin: 0 auto;
  max-width: 100%;
}
.part-block.has-viz .part-viz-column .viz svg {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

/* ── Plate sections — full-viewport-height with scroll-snap ────────── */
.canvas.interactive {
  scroll-snap-type: y proximity;
}
.viz-plate {
  scroll-snap-align: center;
  min-height: 90vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
}

/* ── Verse-by-verse scroll illumination ─────────────────────────────────
 * Every prose block (<p>, <h*>, lists, tables, blockquotes) is wrapped
 * server-side as a .verse. Default state is dim — when a verse enters
 * the viewport-center band it illuminates to full opacity, then gently
 * dims again as it scrolls past. This produces a "moving focus" feel
 * where only 2-3 lines have the reader's full attention at any moment.
 *
 * Implementation uses CSS animation-timeline: view() where supported
 * (Chrome 115+ / Edge 115+ / Safari 18+). Older browsers fall back to
 * an IntersectionObserver in the JS runtime that toggles a "lit" class
 * on the currently-focused verse.
 */
.verse {
  margin: 0 0 22px;
  opacity: 0.22;
  transition: opacity 0.6s ease, filter 0.6s ease, transform 0.6s ease;
  filter: blur(0.4px);
  will-change: opacity, filter;
}
.verse > * { margin-top: 0; margin-bottom: 0; }
.verse + .verse { margin-top: 18px; }
.verse-anchor {
  /* Headings stay slightly more readable when dim so the reader can scan
     section structure without losing context */
  opacity: 0.45;
}
.verse.lit,
.verse:hover {
  opacity: 1;
  filter: blur(0);
}
.verse.lit + .verse,
.verse.lit + .verse + .verse {
  /* Neighbors of the focused verse get a partial highlight — preserves
     the 2-3 line "current attention band" the user asked for */
  opacity: 0.62;
  filter: blur(0);
}
@supports (animation-timeline: view()) {
  .verse {
    animation: verse-illuminate linear both;
    animation-timeline: view();
    animation-range: cover 0% cover 100%;
    transition: none;
  }
  @keyframes verse-illuminate {
    0%   { opacity: 0.18; filter: blur(0.5px); }
    35%  { opacity: 1;    filter: blur(0);    }
    65%  { opacity: 1;    filter: blur(0);    }
    100% { opacity: 0.3;  filter: blur(0.3px); }
  }
  @keyframes verse-anchor-illuminate {
    0%   { opacity: 0.4; }
    50%  { opacity: 1;   }
    100% { opacity: 0.55; }
  }
  .verse-anchor {
    animation: verse-anchor-illuminate linear both;
    animation-timeline: view();
    animation-range: cover 0% cover 100%;
  }
}

/* ── Part-block + opening: subtle entry fade (preserved from earlier) ── */
@supports (animation-timeline: view()) {
  .part-header,
  .opening > h2 {
    animation: part-entry linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 60%;
  }
  @keyframes part-entry {
    from { opacity: 0.35; transform: translateY(18px); }
    to   { opacity: 1;    transform: translateY(0);   }
  }
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

/* ── Editorial data layouts (replace stock <table>) ───────────────────
 * Two formats, auto-selected server-side based on table shape:
 *
 *   .data-cascade   — definition-list cascade. Default for all tables.
 *                     Each row becomes its own verse with the row label
 *                     as an h4 and the remaining cells as a styled dl.
 *
 *   .data-cards     — bento-style card grid. Auto-selected for tables
 *                     whose first column is "Native" / "Subject" / etc.
 *                     Three cards side-by-side on desktop, stacked on
 *                     mobile via auto-fit grid.
 */
.data-cascade {
  margin: clamp(1.2rem, 2vw, 2rem) 0;
  display: block;
}
.data-entry {
  margin: 0 0 clamp(1rem, 1.5vw, 1.5rem);
  padding: clamp(0.9rem, 1.4vw, 1.4rem) clamp(1rem, 1.5vw, 1.4rem);
  border-left: 2px solid var(--sacred-gold);
  background: linear-gradient(90deg, rgba(45,0,80,0.18), transparent 70%);
  border-radius: 0 4px 4px 0;
}
.data-entry-label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(0.95rem, 0.8rem + 0.4vw, 1.2rem);
  letter-spacing: 0.02em;
  color: var(--sacred-gold);
  margin: 0 0 clamp(0.5rem, 0.8vw, 0.8rem);
  text-transform: none;
  border-left: none;
  padding-left: 0;
}
.data-entry-list,
.data-card-list {
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(7rem, max-content) 1fr;
  column-gap: clamp(0.8rem, 1.2vw, 1.2rem);
  row-gap: clamp(0.35rem, 0.6vw, 0.6rem);
}
.data-pair {
  display: contents;
}
.data-entry-list dt,
.data-card-list dt {
  font-family: var(--font-mono);
  font-size: clamp(0.72rem, 0.65rem + 0.15vw, 0.85rem);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--coherence-emerald);
  white-space: nowrap;
  padding-top: 0.1em;
}
.data-entry-list dd,
.data-card-list dd {
  margin: 0;
  font-family: var(--font-body);
  font-size: clamp(0.92rem, 0.85rem + 0.25vw, 1.1rem);
  color: var(--parchment);
  line-height: 1.55;
}
.data-entry-list dd strong,
.data-card-list dd strong {
  color: var(--sacred-gold);
}
.data-entry-list dd em,
.data-card-list dd em {
  color: var(--coherence-emerald);
}

/* Bento card grid — auto-fit columns based on viewport width */
.data-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: clamp(0.8rem, 1.5vw, 1.4rem);
  margin: clamp(1rem, 2vw, 1.8rem) 0;
}
.data-card {
  padding: clamp(1rem, 1.5vw, 1.4rem);
  background: linear-gradient(160deg, rgba(45,0,80,0.32), rgba(7,11,29,0.92));
  border: 1px solid rgba(197,160,23,0.22);
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}
.data-card::before {
  /* Subtle gold accent edge */
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, var(--sacred-gold), transparent 70%);
}
.data-card-label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(0.95rem, 0.8rem + 0.4vw, 1.15rem);
  letter-spacing: 0.02em;
  color: var(--parchment);
  margin: 0 0 clamp(0.7rem, 1vw, 1rem);
  padding-bottom: clamp(0.5rem, 0.8vw, 0.8rem);
  border-bottom: 1px solid rgba(197,160,23,0.18);
}

/* When inside the reading column, both layouts span its full width */
.body-content .data-cascade,
.body-content .data-cards {
  max-width: 100%;
}

/* Mobile-specific tweaks: body-page is already single-column at every
   viewport; nothing further needed for layout. The fixed TOC rail is
   hidden below 1100px (see .toc-rail @media block). */

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

  // ── Verse scroll-illumination fallback ────────────────────────────
  // Browsers without animation-timeline: view() get an IntersectionObserver
  // that toggles .lit on the currently-focused verse. The dim default state
  // is set in CSS so the page is never blank. We test for support via
  // CSS.supports() so we don't double-animate on modern browsers.
  var supportsViewTimeline = (typeof CSS !== 'undefined') && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!supportsViewTimeline && 'IntersectionObserver' in window) {
    var verseObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        // Light up the verse while it sits in the central 30% band of viewport
        entry.target.classList.toggle('lit', entry.isIntersecting);
      });
    }, {
      // Focus zone: top 35%–65% of viewport (the natural reading center)
      rootMargin: '-35% 0% -35% 0%',
      threshold: 0,
    });
    document.querySelectorAll('.verse').forEach(function(v) { verseObserver.observe(v); });
  }
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
