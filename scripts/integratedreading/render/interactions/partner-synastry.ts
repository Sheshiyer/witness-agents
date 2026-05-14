// ─── Partner-Synastry mode interactions ──────────────────────────────
// Layers on top of dyad-arc topology interactions. Adds the four-way-
// bridge tooltip (Vedic-7th × Tarot × HD-channel × dasha-anchor) and
// scroll-scrub on the dasha-stagger timeline.
//
// Per design doc § 5 — Partner-Synastry affordances row of the
// "Per-mode interactive affordances" table.
//
// P3.2 deliverable. Closes #46.

import type { InteractionModule } from './index.js';

export const partnerSynastryModule: InteractionModule = {
  scrollTimelineCss: `
/* ════ Partner-Synastry mode interactions ═════════════════════════════ */

/* Resonance threads carry the four-way bridge — show pointer cursor + soft
 * pulse on hover. The tooltip itself is rendered by the JS handler. */
.canvas.interactive .viz svg path[stroke^="url(#dyad-thread"] {
  cursor: help;
}
.canvas.interactive .viz svg path[stroke^="url(#dyad-thread"]:hover {
  stroke-opacity: 1 !important;
  filter: drop-shadow(0 0 8px var(--sacred-gold));
}

/* Dasha-pivot markers (small circles) — interactive emphasis on hover */
.canvas.interactive .viz svg circle[r="4"] {
  transition: r 0.3s ease, filter 0.3s ease;
  cursor: pointer;
}
.canvas.interactive .viz svg circle[r="4"]:hover {
  r: 6;
  filter: drop-shadow(0 0 8px currentColor);
}

/* Phase-lock stagger timeline — a horizontal line segment we want to
 * scrub on scroll. Targeted via data-attribute the orchestrator sets. */
.canvas.interactive [data-mode="partner-synastry"] .phase-lock-scrub {
  --scrub-progress: 0;
  background: linear-gradient(90deg,
    var(--coherence-emerald) 0%,
    var(--sacred-gold) calc(var(--scrub-progress) * 1%),
    rgba(197,160,23,0.12) calc(var(--scrub-progress) * 1%),
    rgba(197,160,23,0.12) 100%);
  height: 3px;
  margin: 24px 0;
  position: relative;
}

@supports (animation-timeline: scroll()) {
  .canvas.interactive [data-mode="partner-synastry"] .phase-lock-scrub {
    animation: phase-lock-fill linear both;
    animation-timeline: scroll(root);
    animation-range: 30% 70%;
  }
  @keyframes phase-lock-fill {
    from { --scrub-progress: 0; }
    to   { --scrub-progress: 100; }
  }
}
`,

  gsapTimeline: `
// Partner-Synastry — additional scroll-triggered: pivot-circle pulse on enter
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  document.querySelectorAll('.canvas.interactive .viz svg circle[r="4"]').forEach(function(c) {
    gsap.fromTo(c, { scale: 0.5, opacity: 0 }, {
      scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)',
      transformOrigin: 'center', transformBox: 'fill-box',
      scrollTrigger: { trigger: c, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  });
}
`,

  eventHandlers: `
// Partner-Synastry — hover-thread tooltip names the four-way bridge.
// The thread's text-label SVG sibling carries the channel name; we
// build a richer tooltip combining that with the mode's bridge mandate.
(function() {
  // Bridge mandate text — pulled from data-bridge-mandate on body root if set.
  var mandate = document.body.dataset.bridgeMandate ||
    'Vedic-7th × Tarot-relational × HD-electromagnetic-channel × dasha-anchor';

  document.querySelectorAll('.canvas.interactive .viz svg path[stroke^="url(#dyad-thread"]').forEach(function(thread) {
    // Find the adjacent text element that names the channel
    var label = thread.parentElement.querySelector('text[font-family*="SF Mono"][font-weight="600"]');
    var channelName = label ? (label.textContent || '').trim() : 'electromagnetic channel';
    var tooltipText = channelName + ' · ' + mandate;
    thread.setAttribute('data-bridge', tooltipText);
    thread.addEventListener('mouseenter', function(e) {
      if (typeof window.showBridgeTooltip === 'function') {
        window.showBridgeTooltip(e, tooltipText);
      }
    });
    thread.addEventListener('mouseleave', function() {
      if (typeof window.hideBridgeTooltip === 'function') window.hideBridgeTooltip();
    });
  });

  // Pivot markers: click cycles through Mahadasha-pivot context tooltip
  document.querySelectorAll('.canvas.interactive .viz svg circle[r="4"]').forEach(function(c) {
    c.addEventListener('click', function(e) {
      var label = c.parentElement.querySelector('text[font-style="italic"]');
      if (label && typeof window.showBridgeTooltip === 'function') {
        window.showBridgeTooltip(e, label.textContent || 'Mahadasha pivot');
        setTimeout(function() { if (window.hideBridgeTooltip) window.hideBridgeTooltip(); }, 3000);
      }
    });
  });
})();
`,
};
