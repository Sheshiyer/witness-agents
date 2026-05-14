// ─── Family-Penta mode interactions ────────────────────────────────────
// Layers on top of pentagon topology interactions. Affordances:
//   - Click a member vertex → that member's contribution-to-field
//     section auto-scrolls into view + lineage-houses (4/9/12 glyph ring)
//     faintly glow
//   - Hover the root-pair shared inner-arc → root-field summary tooltip
//
// Per design doc § 5 — Family-Penta affordances row.
// P4.3 deliverable. Closes #51.

import type { InteractionModule } from './index.js';

export const familyPentaModule: InteractionModule = {
  scrollTimelineCss: `
/* ════ Family-Penta mode interactions ═════════════════════════════════ */

/* Each vertex arc carries data-vertex + data-role. Clickable + hoverable. */
.canvas.interactive[data-mode="family-penta"] .viz svg circle[data-vertex] {
  cursor: pointer;
  transition: stroke-width 0.3s ease, filter 0.3s ease;
}
.canvas.interactive[data-mode="family-penta"] .viz svg circle[data-vertex]:hover {
  stroke-width: 2.4 !important;
  filter: drop-shadow(0 0 10px currentColor);
}
.canvas.interactive[data-mode="family-penta"] .viz svg circle[data-vertex][data-spotlighted="true"] {
  stroke-width: 3 !important;
  filter: drop-shadow(0 0 14px currentColor);
}

/* When a vertex is spotlighted, dim the others to background */
.canvas.interactive[data-mode="family-penta"][data-spotlight] .viz svg circle[data-vertex]:not([data-spotlighted="true"]),
.canvas.interactive[data-mode="family-penta"][data-spotlight] .viz svg line[data-pair]:not([data-pair*=":spotlight:"]) {
  opacity: 0.25;
  transition: opacity 0.3s ease;
}

/* Lineage-house glyph ring (IV · IX · XII) — gentle pulse on vertex click */
.canvas.interactive[data-mode="family-penta"][data-lineage-glow] .viz svg g[opacity="0.32"] text {
  animation: lineage-glow 2.4s ease-in-out;
}
@keyframes lineage-glow {
  0%, 100% { fill-opacity: 0.32; filter: none; }
  40%      { fill-opacity: 1; filter: drop-shadow(0 0 8px var(--sacred-gold)); }
}

/* Root-pair shared inner-arc — explicit hover affordance */
.canvas.interactive[data-mode="family-penta"] .viz svg path[data-root-pair] {
  cursor: help;
  transition: stroke-width 0.3s ease, opacity 0.3s ease;
}
.canvas.interactive[data-mode="family-penta"] .viz svg path[data-root-pair]:hover {
  stroke-width: 2 !important;
  opacity: 0.9 !important;
}

/* Per-member section anchor (set by orchestrator: data-member="0..4") */
.canvas.interactive[data-mode="family-penta"] section[data-member] {
  transition: background 0.5s ease, border-left-color 0.5s ease;
  border-left: 3px solid transparent;
  padding-left: 16px;
  margin-left: -19px;
}
.canvas.interactive[data-mode="family-penta"] section[data-member][data-spotlighted="true"] {
  background: rgba(197,160,23,0.05);
  border-left-color: var(--sacred-gold);
}
`,

  gsapTimeline: `
// Family-Penta — pentagon vertices fade in sequentially: roots first, then branches
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  document.querySelectorAll('.canvas.interactive[data-mode="family-penta"] .viz svg').forEach(function(svg) {
    var vertices = svg.querySelectorAll('circle[data-vertex]');
    var rootArc = svg.querySelector('path[data-root-pair]');
    if (vertices.length === 0) return;

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: svg,
        start: 'top 75%',
        toggleActions: 'play none none reverse',
      },
    });

    // Roots first (vertices 0+1)
    var roots = svg.querySelectorAll('circle[data-vertex][data-role="root"]');
    if (roots.length > 0) {
      tl.from(roots, {
        scale: 0, opacity: 0,
        duration: 0.7, stagger: 0.12, ease: 'back.out(2)',
        transformOrigin: 'center', transformBox: 'fill-box',
      });
    }

    // Root-pair shared inner-arc draws in next
    if (rootArc) {
      tl.from(rootArc, {
        opacity: 0,
        duration: 0.5, ease: 'power2.out',
      }, '-=0.2');
    }

    // Branches fan out (vertices 2,3,4)
    var branches = svg.querySelectorAll('circle[data-vertex][data-role="branch"]');
    if (branches.length > 0) {
      tl.from(branches, {
        scale: 0, opacity: 0,
        duration: 0.6, stagger: 0.12, ease: 'back.out(1.8)',
        transformOrigin: 'center', transformBox: 'fill-box',
      }, '-=0.3');
    }

    // Pair threads sequence in last
    var threads = svg.querySelectorAll('line[data-pair]');
    if (threads.length > 0) {
      tl.from(threads, {
        opacity: 0,
        duration: 0.4, stagger: 0.04, ease: 'power2.out',
      }, '-=0.4');
    }
  });
}
`,

  eventHandlers: `
// Family-Penta — click-to-spotlight a member + hover root-pair tooltip
(function() {
  var canvas = document.querySelector('.canvas.interactive[data-mode="family-penta"]');
  if (!canvas) return;

  // ── Click a vertex circle to spotlight the matching member section ──
  canvas.querySelectorAll('.viz svg circle[data-vertex]').forEach(function(vertex) {
    vertex.addEventListener('click', function() {
      var idx = vertex.getAttribute('data-vertex');
      var currentlySpotlit = vertex.getAttribute('data-spotlighted') === 'true';

      // Clear all spotlights first
      canvas.querySelectorAll('[data-spotlighted="true"]').forEach(function(el) {
        el.removeAttribute('data-spotlighted');
      });

      if (currentlySpotlit) {
        // Toggle off
        canvas.removeAttribute('data-spotlight');
        canvas.removeAttribute('data-lineage-glow');
        return;
      }

      // Spotlight this vertex + its corresponding section
      vertex.setAttribute('data-spotlighted', 'true');
      canvas.setAttribute('data-spotlight', idx || '');

      // Trigger lineage-house glow animation (one-shot)
      canvas.setAttribute('data-lineage-glow', 'true');
      setTimeout(function() { canvas.removeAttribute('data-lineage-glow'); }, 2500);

      var section = canvas.querySelector('section[data-member="' + idx + '"]');
      if (section) {
        section.setAttribute('data-spotlighted', 'true');
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Hover root-pair shared inner-arc to show root-field tooltip ─────
  var rootArc = canvas.querySelector('.viz svg path[data-root-pair]');
  if (rootArc && typeof window.showBridgeTooltip === 'function') {
    var mandate = document.body.dataset.bridgeMandate ||
      'The root-pair anchors the family field. Branches inherit, contribute, and depart from this anchor.';
    rootArc.addEventListener('mouseenter', function(e) {
      window.showBridgeTooltip(e, 'ROOT FIELD · ' + mandate);
    });
    rootArc.addEventListener('mouseleave', function() {
      if (window.hideBridgeTooltip) window.hideBridgeTooltip();
    });
  }
})();
`,
};
