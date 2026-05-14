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

/* ── Cover — animated mandala fade-in on initial paint ──────────────── */
.cover .cover-svg-wrap svg {
  opacity: 0;
  transform: scale(0.92);
  animation: cover-mandala-reveal 1.6s ease-out 0.3s forwards;
}
@keyframes cover-mandala-reveal {
  to { opacity: 0.85; transform: scale(1); }
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

/* ── Sticky TOC rail — left of body, auto-highlights current Part ───── */
.body-page.interactive {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 48px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 40px 24px;
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

/* ── Scroll-driven reveal — sections fade in as they enter viewport ── */
@supports (animation-timeline: view()) {
  .part-header,
  .part-block,
  .opening,
  section.fig-index,
  .doc-footer {
    animation: fade-up linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 50%;
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
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
})();
`;

/** Convenience — assemble all three layers (CSS / GSAP / handlers) for a topology. */
export function buildInteractionPayload(topology: string): {
  css: string;
  gsap: string;
  handlers: string;
} {
  const mod = INTERACTION_MODULES[topology as TopologyKey];
  if (!mod) {
    return {
      css: `/* unknown topology '${topology}' — no interaction module */`,
      gsap: `// unknown topology '${topology}'`,
      handlers: `// unknown topology '${topology}'`,
    };
  }
  return {
    css: BASE_SCROLL_NARRATIVE_CSS + '\n' + mod.scrollTimelineCss,
    gsap: mod.gsapTimeline,
    handlers: BASE_INTERACTIVE_JS + '\n' + mod.eventHandlers,
  };
}

export const GSAP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
export const GSAP_SCROLLTRIGGER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js';
