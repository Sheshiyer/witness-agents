// ─── Team-Synergy mode interactions ────────────────────────────────────
// Layers on top of web-graph topology. Affordances:
//   - Cluster filter (toggle buttons per role-cluster) — dims non-matching
//     nodes/edges/section-content
//   - Critical-path edge hover → partnership card with data-label content
//   - Dasha-cadence overlay toggle — animates operational rhythm bar
//
// Per design doc § 5 — Team-Synergy affordances row.
// P5.3 deliverable. Closes #54.

import type { InteractionModule } from './index.js';

export const teamSynergyModule: InteractionModule = {
  scrollTimelineCss: `
/* ════ Team-Synergy mode interactions ═════════════════════════════════ */

/* Cluster filter buttons — placed near the web-graph SVG */
.canvas.interactive[data-mode="team-synergy"] .cluster-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 24px auto;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 9pt;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.canvas.interactive[data-mode="team-synergy"] .cluster-filter button {
  background: transparent;
  border: 1px solid currentColor;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  font: inherit;
  letter-spacing: inherit;
  opacity: 0.7;
}
.canvas.interactive[data-mode="team-synergy"] .cluster-filter button:hover {
  opacity: 1;
  background: currentColor;
  color: var(--void-black);
}
.canvas.interactive[data-mode="team-synergy"] .cluster-filter button[data-active="true"] {
  opacity: 1;
  background: currentColor;
  color: var(--void-black);
}
.canvas.interactive[data-mode="team-synergy"] .cluster-filter button[data-cluster="visionaries"] { color: #E8B923; }
.canvas.interactive[data-mode="team-synergy"] .cluster-filter button[data-cluster="operators"] { color: #5A7090; }
.canvas.interactive[data-mode="team-synergy"] .cluster-filter button[data-cluster="integrators"] { color: var(--coherence-emerald); }
.canvas.interactive[data-mode="team-synergy"] .cluster-filter button[data-cluster="connectors"] { color: #D4A8FF; }

/* When a cluster filter is active, dim non-matching SVG elements + section content */
.canvas.interactive[data-mode="team-synergy"][data-cluster-filter]
  .viz svg [data-cluster-node]:not([data-cluster-node*=":matchsvg:"]),
.canvas.interactive[data-mode="team-synergy"][data-cluster-filter]
  .viz svg [data-cluster]:not([data-cluster*=":matchsvg:"]) {
  opacity: 0.18;
  transition: opacity 0.3s ease;
}
.canvas.interactive[data-mode="team-synergy"][data-cluster-filter]
  .viz svg [data-cluster-node][data-cluster-active] {
  opacity: 1;
}
.canvas.interactive[data-mode="team-synergy"][data-cluster-filter]
  section[data-cluster-section]:not([data-cluster-active]) {
  opacity: 0.35;
  transition: opacity 0.3s ease;
}

/* Critical-path edges — hoverable */
.canvas.interactive[data-mode="team-synergy"] .viz svg line[data-critical="true"] {
  cursor: pointer;
  transition: stroke-width 0.3s ease, filter 0.3s ease;
}
.canvas.interactive[data-mode="team-synergy"] .viz svg line[data-critical="true"]:hover {
  stroke-width: 3 !important;
  filter: drop-shadow(0 0 8px var(--sacred-gold));
}

/* Background (non-critical) edges — also stay non-interactive */
.canvas.interactive[data-mode="team-synergy"] .viz svg line[data-critical="false"] {
  pointer-events: none;
}

/* Dasha-cadence overlay bar — toggleable */
.canvas.interactive[data-mode="team-synergy"] .dasha-cadence-overlay {
  --cadence-progress: 0;
  position: relative;
  height: 28px;
  margin: 24px 0;
  border: 1px solid rgba(197,160,23,0.2);
  display: none;
}
.canvas.interactive[data-mode="team-synergy"][data-cadence-on] .dasha-cadence-overlay {
  display: block;
}
.canvas.interactive[data-mode="team-synergy"] .dasha-cadence-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,
    var(--coherence-emerald) 0%,
    var(--sacred-gold) calc(var(--cadence-progress) * 1%),
    rgba(197,160,23,0.08) calc(var(--cadence-progress) * 1%),
    rgba(197,160,23,0.08) 100%);
  transition: background 0.4s ease;
}

@supports (animation-timeline: scroll()) {
  .canvas.interactive[data-mode="team-synergy"][data-cadence-on] .dasha-cadence-overlay {
    animation: dasha-cadence-fill linear both;
    animation-timeline: scroll(root);
    animation-range: 20% 80%;
  }
  @keyframes dasha-cadence-fill {
    from { --cadence-progress: 0; }
    to   { --cadence-progress: 100; }
  }
}
`,

  gsapTimeline: `
// Team-Synergy — cluster bounding hulls fade in first, then nodes, then critical edges
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  document.querySelectorAll('.canvas.interactive[data-mode="team-synergy"] .viz svg').forEach(function(svg) {
    var hulls = svg.querySelectorAll('[data-cluster]:not([data-cluster-label])');
    var nodes = svg.querySelectorAll('circle[data-node]');
    var critical = svg.querySelectorAll('line[data-critical="true"]');
    if (nodes.length === 0) return;

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: svg,
        start: 'top 75%',
        toggleActions: 'play none none reverse',
      },
    });

    if (hulls.length > 0) {
      tl.from(hulls, { opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' });
    }
    tl.from(nodes, {
      scale: 0, opacity: 0,
      duration: 0.5, stagger: 0.05, ease: 'back.out(1.6)',
      transformOrigin: 'center', transformBox: 'fill-box',
    }, '-=0.3');
    if (critical.length > 0) {
      tl.from(critical, { opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out' }, '-=0.4');
    }
  });
}
`,

  eventHandlers: `
// Team-Synergy — cluster filter + critical-edge hover-card + cadence toggle
(function() {
  var canvas = document.querySelector('.canvas.interactive[data-mode="team-synergy"]');
  if (!canvas) return;

  // ── Cluster filter (multi-toggle: clicking a 2nd cluster clears the 1st) ──
  var clusterButtons = canvas.querySelectorAll('.cluster-filter button[data-cluster]');
  clusterButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var cluster = btn.getAttribute('data-cluster');
      var currentlyActive = btn.getAttribute('data-active') === 'true';
      // Single-select filter — clear all first
      clusterButtons.forEach(function(b) { b.setAttribute('data-active', 'false'); });

      if (currentlyActive) {
        canvas.removeAttribute('data-cluster-filter');
        clearClusterMarks();
      } else {
        btn.setAttribute('data-active', 'true');
        canvas.setAttribute('data-cluster-filter', cluster || '');
        applyClusterMarks(cluster);
      }
    });
  });

  function clearClusterMarks() {
    canvas.querySelectorAll('[data-cluster-active]').forEach(function(el) {
      el.removeAttribute('data-cluster-active');
    });
  }
  function applyClusterMarks(cluster) {
    clearClusterMarks();
    if (!cluster) return;
    canvas.querySelectorAll('[data-cluster-node="' + cluster + '"]').forEach(function(el) {
      el.setAttribute('data-cluster-active', 'true');
    });
    canvas.querySelectorAll('[data-cluster="' + cluster + '"]').forEach(function(el) {
      el.setAttribute('data-cluster-active', 'true');
    });
    canvas.querySelectorAll('section[data-cluster-section="' + cluster + '"]').forEach(function(el) {
      el.setAttribute('data-cluster-active', 'true');
    });
  }

  // ── Critical-path edge hover → tooltip with partnership card content ──
  canvas.querySelectorAll('.viz svg line[data-critical="true"]').forEach(function(line) {
    var label = line.getAttribute('data-label') || 'Critical-path partnership';
    line.addEventListener('mouseenter', function(e) {
      if (typeof window.showBridgeTooltip === 'function') {
        window.showBridgeTooltip(e, 'CRITICAL PATH · ' + label);
      }
    });
    line.addEventListener('mouseleave', function() {
      if (window.hideBridgeTooltip) window.hideBridgeTooltip();
    });
  });

  // ── Dasha-cadence overlay toggle ────────────────────────────────────
  var cadenceToggle = canvas.querySelector('.cadence-toggle');
  if (cadenceToggle) {
    cadenceToggle.addEventListener('click', function() {
      var on = canvas.getAttribute('data-cadence-on') !== null;
      if (on) {
        canvas.removeAttribute('data-cadence-on');
        cadenceToggle.setAttribute('data-active', 'false');
      } else {
        canvas.setAttribute('data-cadence-on', '');
        cadenceToggle.setAttribute('data-active', 'true');
      }
    });
  }
})();
`,
};
