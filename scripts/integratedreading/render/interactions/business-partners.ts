// ─── Business-Partners mode interactions ──────────────────────────────
// Layers on top of dyad-arc topology interactions. Adds the role-stack
// filter (Vision / Operations / Execution) and Vimshottari overlap-cell
// click-to-expand.
//
// Per design doc § 5 — Business-Partners affordances row.
//
// P3.4 deliverable. Closes #48.

import type { InteractionModule } from './index.js';

export const businessPartnersModule: InteractionModule = {
  scrollTimelineCss: `
/* ════ Business-Partners mode interactions ════════════════════════════ */

/* Role-stack filter buttons — sit alongside the field SVG */
.canvas.interactive [data-mode="business-partners"] .role-stack-filter {
  display: flex;
  gap: 12px;
  margin: 24px auto;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 9pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.canvas.interactive [data-mode="business-partners"] .role-stack-filter button {
  background: transparent;
  border: 1px solid rgba(197,160,23,0.4);
  color: var(--muted-silver);
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  font: inherit;
  letter-spacing: inherit;
}
.canvas.interactive [data-mode="business-partners"] .role-stack-filter button[data-active="true"] {
  background: rgba(197,160,23,0.1);
  border-color: var(--sacred-gold);
  color: var(--sacred-gold);
}
.canvas.interactive [data-mode="business-partners"] .role-stack-filter button:hover:not([data-active="true"]) {
  border-color: var(--coherence-emerald);
  color: var(--coherence-emerald);
}

/* When a role-stack filter is active, dim non-matching content */
.canvas.interactive [data-role-filter="vision"] [data-role]:not([data-role="vision"]),
.canvas.interactive [data-role-filter="operations"] [data-role]:not([data-role="operations"]),
.canvas.interactive [data-role-filter="execution"] [data-role]:not([data-role="execution"]) {
  opacity: 0.25;
  filter: grayscale(0.6);
  transition: opacity 0.3s ease, filter 0.3s ease;
}
.canvas.interactive [data-role-filter] [data-role][data-role-active] {
  opacity: 1;
  filter: none;
}

/* Vimshottari overlap-cell — visual click affordance */
.canvas.interactive [data-mode="business-partners"] .vimshottari-cell {
  cursor: pointer;
  transition: background 0.3s ease, transform 0.3s ease;
}
.canvas.interactive [data-mode="business-partners"] .vimshottari-cell:hover {
  background: rgba(197,160,23,0.08);
  transform: scale(1.02);
}
.canvas.interactive [data-mode="business-partners"] .vimshottari-cell[data-expanded="true"] {
  background: rgba(16,181,167,0.1);
  border-left: 3px solid var(--coherence-emerald);
  padding-left: 12px;
  margin-left: -15px;
}

/* The year-by-year expansion panel */
.canvas.interactive [data-mode="business-partners"] .vimshottari-expansion {
  display: none;
  margin-top: 12px;
  padding: 16px;
  background: rgba(11,80,251,0.06);
  border-left: 2px solid var(--flow-indigo);
  font-family: var(--font-display);
  font-size: 10.5pt;
  line-height: 1.5;
}
.canvas.interactive [data-mode="business-partners"] .vimshottari-cell[data-expanded="true"] + .vimshottari-expansion {
  display: block;
}
`,

  gsapTimeline: `
// Business-Partners — no GSAP timelines beyond the dyad-arc base.
// All interactive affordances are handler-driven (filters + click-expand).
`,

  eventHandlers: `
// Business-Partners — role-stack filter + Vimshottari cell click-expand
(function() {
  var canvas = document.querySelector('.canvas.interactive[data-mode="business-partners"]');
  if (!canvas) return;

  // ── Role-stack filter ───────────────────────────────────────────
  var buttons = canvas.querySelectorAll('.role-stack-filter button');
  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var role = btn.getAttribute('data-role');
      var currentlyActive = btn.getAttribute('data-active') === 'true';
      buttons.forEach(function(b) { b.setAttribute('data-active', 'false'); });
      if (currentlyActive) {
        canvas.removeAttribute('data-role-filter');
      } else {
        btn.setAttribute('data-active', 'true');
        canvas.setAttribute('data-role-filter', role || '');
      }
      // Mark matching elements as active for re-emphasis
      canvas.querySelectorAll('[data-role]').forEach(function(el) {
        if (el.getAttribute('data-role') === role && !currentlyActive) {
          el.setAttribute('data-role-active', 'true');
        } else {
          el.removeAttribute('data-role-active');
        }
      });
    });
  });

  // ── Vimshottari overlap-cell click-to-expand ────────────────────
  canvas.querySelectorAll('.vimshottari-cell').forEach(function(cell) {
    cell.addEventListener('click', function() {
      var expanded = cell.getAttribute('data-expanded') === 'true';
      cell.setAttribute('data-expanded', expanded ? 'false' : 'true');
    });
  });
})();
`,
};
