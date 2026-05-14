// ─── P3 — Partner-Synastry + Business-Partners mode tests ──────────────
// Covers #45 (partner-synastry mode doc), #46 (synastry interaction),
// #47 (business-partners mode doc), #48 (business interaction).
// Also the cross-cutting mode-keyed lookup in buildInteractionPayload.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

import { parseModeDoc } from '../scripts/integratedreading/modes/parser.js';
import {
  MODE_INTERACTION_MODULES,
  buildInteractionPayload,
  BASE_SCROLL_NARRATIVE_CSS,
} from '../scripts/integratedreading/render/interactions/index.js';
import { renderInteractiveHTMLPage, type PartBlock } from '../scripts/integratedreading/render/templates.js';

// ────────────────────────────────────────────────────────────────────────
// Mode docs parse cleanly
// ────────────────────────────────────────────────────────────────────────

describe('Partner-Synastry mode doc (P3.1)', () => {
  const path = resolve('scripts/integratedreading/modes/partner-synastry.md');

  it('parses without errors', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.mode, 'partner-synastry');
  });

  it('declares 4 passes with correct ids', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.pass_plan.length, 4);
    assert.deepEqual(doc.frontmatter.pass_plan.map((p) => p.id), ['alpha', 'beta', 'gamma', 'delta']);
  });

  it('targets 12-15k words across 4 passes', () => {
    const doc = parseModeDoc(path);
    const sum = doc.frontmatter.pass_plan.reduce((s, p) => s + p.target_words, 0);
    assert.ok(sum >= 12000, `pass_plan total = ${sum}, expected >= 12000`);
    assert.ok(sum <= 15000, `pass_plan total = ${sum}, expected <= 15000`);
  });

  it('foregrounds tarot + human-design at weight >= 2.0', () => {
    const doc = parseModeDoc(path);
    assert.ok(doc.frontmatter.engine_overlay_weights.tarot >= 2.0);
    assert.ok(doc.frontmatter.engine_overlay_weights['human-design'] >= 2.0);
  });

  it('declares house_overlay includes 7 (partnership)', () => {
    const doc = parseModeDoc(path);
    assert.ok(doc.frontmatter.house_overlay.includes(7));
  });

  it('declares svg_topology: dyad-arc', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.svg_topology, 'dyad-arc');
  });

  it('has 4-way bridge mandate naming all four cross-systems', () => {
    const doc = parseModeDoc(path);
    const m = doc.frontmatter.bridge_mandates[0];
    assert.match(m, /Vedic/);
    assert.match(m, /Tarot/);
    assert.match(m, /HD|Human Design/);
    assert.match(m, /dasha/);
  });

  it('every pass template resolves to a body section', () => {
    const doc = parseModeDoc(path);
    for (const pass of doc.frontmatter.pass_plan) {
      assert.ok(doc.sections[pass.template], `missing section: ${pass.template}`);
    }
  });
});

describe('Business-Partners mode doc (P3.3)', () => {
  const path = resolve('scripts/integratedreading/modes/business-partners.md');

  it('parses without errors', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.mode, 'business-partners');
  });

  it('declares 4 passes', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.pass_plan.length, 4);
  });

  it('targets 12-15k words', () => {
    const doc = parseModeDoc(path);
    const sum = doc.frontmatter.pass_plan.reduce((s, p) => s + p.target_words, 0);
    assert.ok(sum >= 12000 && sum <= 15000);
  });

  it('foregrounds atmakaraka + vimshottari at weight >= 2.0', () => {
    const doc = parseModeDoc(path);
    assert.ok(doc.frontmatter.engine_overlay_weights.atmakaraka >= 2.0);
    assert.ok(doc.frontmatter.engine_overlay_weights.vimshottari >= 2.0);
  });

  it('declares house_overlay includes 10 (career/dharma)', () => {
    const doc = parseModeDoc(path);
    assert.ok(doc.frontmatter.house_overlay.includes(10));
  });

  it('has bridge mandate naming Atmakaraka + Vimshottari + HD + Gene-Key-gift', () => {
    const doc = parseModeDoc(path);
    const m = doc.frontmatter.bridge_mandates[0];
    assert.match(m, /Atmakaraka/);
    assert.match(m, /Vimshottari/);
    assert.match(m, /HD|authority/);
    assert.match(m, /Gene[ -]Key/);
  });

  it('emphasizes operational specificity in its mandate', () => {
    const doc = parseModeDoc(path);
    const allMandates = doc.frontmatter.bridge_mandates.join(' ');
    assert.match(allMandates, /operational|specific|SHIPS/i);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Mode-keyed interaction modules (P3.2 + P3.4)
// ────────────────────────────────────────────────────────────────────────

describe('MODE_INTERACTION_MODULES registry', () => {
  it('registers partner-synastry and business-partners', () => {
    assert.ok(MODE_INTERACTION_MODULES['partner-synastry']);
    assert.ok(MODE_INTERACTION_MODULES['business-partners']);
  });

  it('each mode module has the 3 required layers', () => {
    for (const k of Object.keys(MODE_INTERACTION_MODULES)) {
      const m = MODE_INTERACTION_MODULES[k];
      assert.equal(typeof m.scrollTimelineCss, 'string', `${k}.scrollTimelineCss`);
      assert.equal(typeof m.gsapTimeline, 'string', `${k}.gsapTimeline`);
      assert.equal(typeof m.eventHandlers, 'string', `${k}.eventHandlers`);
    }
  });

  it('partner-synastry adds bridge-tooltip behavior beyond dyad-arc base', () => {
    const m = MODE_INTERACTION_MODULES['partner-synastry'];
    assert.match(m.eventHandlers, /Bridge mandate|showBridgeTooltip/);
    assert.match(m.scrollTimelineCss, /partner-synastry|Phase-Lock|phase-lock|cursor:\s*help/);
  });

  it('business-partners adds role-stack filter + vimshottari-cell expansion', () => {
    const m = MODE_INTERACTION_MODULES['business-partners'];
    assert.match(m.eventHandlers, /role-stack|data-role/);
    assert.match(m.eventHandlers, /vimshottari-cell|data-expanded/);
  });
});

describe('buildInteractionPayload — mode-keyed composition', () => {
  it('composes BASE + topology when no mode given', () => {
    const payload = buildInteractionPayload('dyad-arc');
    assert.ok(payload.css.includes('Scroll-Narrative Scaffold'));
    assert.ok(!payload.css.includes('Partner-Synastry mode interactions'));
  });

  it('composes BASE + topology + MODE when mode given', () => {
    const payload = buildInteractionPayload('dyad-arc', 'partner-synastry');
    assert.ok(payload.css.includes('Scroll-Narrative Scaffold'));
    assert.ok(payload.css.includes('Partner-Synastry mode interactions'));
    assert.match(payload.handlers, /showBridgeTooltip/);
  });

  it('mode-keyed CSS comes AFTER topology-keyed CSS', () => {
    const payload = buildInteractionPayload('dyad-arc', 'partner-synastry');
    const baseIdx = payload.css.indexOf('Scroll-Narrative Scaffold');
    const modeIdx = payload.css.indexOf('Partner-Synastry mode interactions');
    assert.ok(baseIdx >= 0 && modeIdx > baseIdx, 'mode CSS must be appended after topology CSS');
  });

  it('falls back gracefully when mode unknown', () => {
    const payload = buildInteractionPayload('dyad-arc', 'unknown-mode');
    assert.ok(payload.css.includes('Scroll-Narrative Scaffold'));
    // No mode CSS appended
    assert.ok(!payload.css.includes('Partner-Synastry'));
  });
});

// ────────────────────────────────────────────────────────────────────────
// renderInteractiveHTMLPage — mode + bridge_mandate plumbing
// ────────────────────────────────────────────────────────────────────────

describe('renderInteractiveHTMLPage — mode wiring', () => {
  const samplePart: PartBlock = {
    partNum: 1, romanNumeral: 'I', title: 'X', contentHtml: '<p>y</p>',
  };

  it('emits data-mode attribute on .canvas.interactive when mode given', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A × B', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      mode: 'partner-synastry',
      parts: [samplePart],
    });
    assert.match(html, /class="canvas interactive" data-mode="partner-synastry"/);
  });

  it('emits data-bridge-mandate attribute on <body> when provided', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A × B', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      mode: 'partner-synastry',
      bridge_mandate: 'Vedic-7th × Tarot × HD × dasha',
      parts: [samplePart],
    });
    assert.match(html, /data-bridge-mandate="Vedic-7th × Tarot × HD × dasha"/);
  });

  it('inlines the mode-specific interaction module', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A × B', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      mode: 'business-partners',
      parts: [samplePart],
    });
    assert.match(html, /Business-Partners mode interactions/);
    assert.match(html, /role-stack-filter/);
  });

  it('does NOT inline mode CSS when mode is omitted (back-compat with composite-dyad/-triad)', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A × B', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      // no `mode`
      parts: [samplePart],
    });
    assert.ok(!html.includes('Partner-Synastry mode interactions'));
    assert.ok(!html.includes('Business-Partners mode interactions'));
  });

  it('escapes quotes in bridge_mandate', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A × B', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      mode: 'partner-synastry',
      bridge_mandate: 'A "quoted" mandate',
      parts: [samplePart],
    });
    assert.match(html, /data-bridge-mandate="A &quot;quoted&quot; mandate"/);
  });
});
