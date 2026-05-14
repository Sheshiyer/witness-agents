// ─── P4 — Family-Penta tests ───────────────────────────────────────────
// Covers #49 (family-penta.md), #50 (composite-penta.ts), #51 (interaction).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

import { parseModeDoc } from '../scripts/integratedreading/modes/parser.js';
import {
  TOPOLOGY_RENDERERS,
  renderByTopology,
  renderCompositePenta,
} from '../scripts/integratedreading/render/svg/index.js';
import {
  MODE_INTERACTION_MODULES,
  buildInteractionPayload,
} from '../scripts/integratedreading/render/interactions/index.js';
import { renderInteractiveHTMLPage, type PartBlock } from '../scripts/integratedreading/render/templates.js';

// ────────────────────────────────────────────────────────────────────────
// Mode doc parses (P4.1 #49)
// ────────────────────────────────────────────────────────────────────────

describe('family-penta mode doc (P4.1)', () => {
  const path = resolve('scripts/integratedreading/modes/family-penta.md');

  it('parses without errors', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.mode, 'family-penta');
  });

  it('accepts 3-5 subjects (partial-family widening)', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.subject_count.min, 3);
    assert.equal(doc.frontmatter.subject_count.max, 5);
  });

  it('declares 5 passes (α β γ δ ε)', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.pass_plan.length, 5);
    assert.deepEqual(doc.frontmatter.pass_plan.map((p) => p.id), ['alpha', 'beta', 'gamma', 'delta', 'epsilon']);
  });

  it('targets 13-15k words total', () => {
    const doc = parseModeDoc(path);
    const sum = doc.frontmatter.pass_plan.reduce((s, p) => s + p.target_words, 0);
    assert.ok(sum >= 13000, `total = ${sum}, expected >= 13000`);
    assert.ok(sum <= 15000, `total = ${sum}, expected <= 15000`);
  });

  it('foregrounds vimshottari at weight 2.0', () => {
    const doc = parseModeDoc(path);
    assert.ok(doc.frontmatter.engine_overlay_weights.vimshottari >= 2.0);
  });

  it('declares house_overlay includes 4, 9, 12 (lineage axis)', () => {
    const doc = parseModeDoc(path);
    assert.ok(doc.frontmatter.house_overlay.includes(4));
    assert.ok(doc.frontmatter.house_overlay.includes(9));
    assert.ok(doc.frontmatter.house_overlay.includes(12));
  });

  it('declares svg_topology: pentagon', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.svg_topology, 'pentagon');
  });

  it('roles list has 5 entries with root + branch convention', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.roles.length, 5);
    assert.ok(doc.frontmatter.roles[0].includes('root'));
    assert.ok(doc.frontmatter.roles[1].includes('root'));
    assert.ok(doc.frontmatter.roles[4].includes('branch'));
  });

  it('every pass template resolves to a body section', () => {
    const doc = parseModeDoc(path);
    for (const pass of doc.frontmatter.pass_plan) {
      assert.ok(doc.sections[pass.template], `missing section: ${pass.template}`);
    }
  });

  it('bridge mandate names Pitru-karaka + lineage-house + generational-nakshatra + Gene-Key', () => {
    const doc = parseModeDoc(path);
    const m = doc.frontmatter.bridge_mandates[0];
    assert.match(m, /Lineage-house|4\/9\/12/);
    assert.match(m, /Pitru/);
    assert.match(m, /[Nn]akshatra/);
    assert.match(m, /Gene[ -]Key/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Pentagon SVG renderer (P4.2 #50)
// ────────────────────────────────────────────────────────────────────────

const FIVE_SUBJECTS_DATA = {
  subjects: [
    { name: 'Root-1', arc_color: '#F0EDE3', role: 'root' as const, current_mahadasha_lord: 'Jupiter', next_mahadasha_lord: 'Saturn', next_mahadasha_iso: '2027-03-15' },
    { name: 'Root-2', arc_color: '#C5A017', role: 'root' as const, current_mahadasha_lord: 'Venus', next_mahadasha_lord: 'Sun', next_mahadasha_iso: '2026-11-20' },
    { name: 'Branch-1', arc_color: '#10B5A7', role: 'branch' as const, current_mahadasha_lord: 'Rahu', next_mahadasha_lord: 'Jupiter', next_mahadasha_iso: '2028-09-14' },
    { name: 'Branch-2', arc_color: '#0B50FB', role: 'branch' as const, current_mahadasha_lord: 'Mars', next_mahadasha_lord: 'Rahu', next_mahadasha_iso: '2029-05-10' },
    { name: 'Branch-3', arc_color: '#2D0050', role: 'branch' as const, current_mahadasha_lord: 'Ketu', next_mahadasha_lord: 'Venus', next_mahadasha_iso: '2030-01-08' },
  ] as [any, any, any, any, any],
  dominant_pairs: [[0, 1]] as Array<[number, number]>,
  shared_keys: ['The Hermit · The Empress · Pushya Lineage'],
};

describe('pentagon SVG renderer (P4.2)', () => {
  it('is registered in TOPOLOGY_RENDERERS as `pentagon`', () => {
    assert.ok(TOPOLOGY_RENDERERS.pentagon);
    assert.equal(typeof TOPOLOGY_RENDERERS.pentagon, 'function');
  });

  it('emits valid SVG string', () => {
    const svg = renderCompositePenta(FIVE_SUBJECTS_DATA, { width: 720 });
    assert.match(svg, /<svg xmlns/);
    assert.match(svg, /<\/svg>/);
  });

  it('includes all 5 subject names', () => {
    const svg = renderCompositePenta(FIVE_SUBJECTS_DATA, { width: 720 });
    assert.match(svg, /ROOT-1/);
    assert.match(svg, /ROOT-2/);
    assert.match(svg, /BRANCH-1/);
    assert.match(svg, /BRANCH-2/);
    assert.match(svg, /BRANCH-3/);
  });

  it('marks each vertex circle with data-vertex + data-role attributes', () => {
    const svg = renderCompositePenta(FIVE_SUBJECTS_DATA, { width: 720 });
    for (let i = 0; i < 5; i++) {
      assert.match(svg, new RegExp(`data-vertex="${i}"`));
    }
    assert.match(svg, /data-role="root"/);
    assert.match(svg, /data-role="branch"/);
  });

  it('renders all C(5,2)=10 pair-threads with data-pair attribute', () => {
    const svg = renderCompositePenta(FIVE_SUBJECTS_DATA, { width: 720 });
    const matches = svg.match(/data-pair="\d-\d"/g) ?? [];
    assert.equal(matches.length, 10);
  });

  it('marks root-pair (0-1) as dominant when default dominant_pairs', () => {
    const svg = renderCompositePenta(FIVE_SUBJECTS_DATA, { width: 720 });
    // The dominant pair line uses url(#penta-thread-...) gradient stroke
    assert.match(svg, /data-pair="0-1" data-dominant="true"/);
    // Non-dominant pairs are marked false
    assert.match(svg, /data-pair="0-2" data-dominant="false"/);
  });

  it('renders the root-pair shared inner-arc with data-root-pair attribute', () => {
    const svg = renderCompositePenta(FIVE_SUBJECTS_DATA, { width: 720 });
    assert.match(svg, /data-root-pair="true"/);
    assert.match(svg, /ROOT FIELD/);
  });

  it('renders LINEAGE FIELD center seed + lineage-house glyph ring', () => {
    const svg = renderCompositePenta(FIVE_SUBJECTS_DATA, { width: 720 });
    assert.match(svg, /LINEAGE/);
    assert.match(svg, /FIELD/);
    assert.match(svg, /IV · IX · XII/);
  });

  it('renders shared_keys legend when provided', () => {
    const svg = renderCompositePenta(FIVE_SUBJECTS_DATA, { width: 720 });
    assert.match(svg, /SHARED LINEAGE CURRENTS/);
    assert.match(svg, /Pushya Lineage/);
  });

  it('omits shared_keys legend when not provided', () => {
    const dataNoKeys = { ...FIVE_SUBJECTS_DATA, shared_keys: [] };
    const svg = renderCompositePenta(dataNoKeys, { width: 720 });
    assert.ok(!svg.includes('SHARED LINEAGE CURRENTS'));
  });

  it('renderByTopology dispatches pentagon correctly', () => {
    const svg = renderByTopology('pentagon', FIVE_SUBJECTS_DATA, { width: 720 });
    assert.match(svg, /<svg xmlns/);
    assert.match(svg, /LINEAGE/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Family-Penta interaction module (P4.3 #51)
// ────────────────────────────────────────────────────────────────────────

describe('family-penta interaction module (P4.3)', () => {
  it('is registered in MODE_INTERACTION_MODULES', () => {
    assert.ok(MODE_INTERACTION_MODULES['family-penta']);
  });

  it('CSS targets clickable vertex circles + data-spotlighted state', () => {
    const m = MODE_INTERACTION_MODULES['family-penta'];
    assert.match(m.scrollTimelineCss, /data-vertex/);
    assert.match(m.scrollTimelineCss, /data-spotlighted/);
  });

  it('CSS targets root-pair shared inner-arc with hover affordance', () => {
    const m = MODE_INTERACTION_MODULES['family-penta'];
    assert.match(m.scrollTimelineCss, /data-root-pair/);
    assert.match(m.scrollTimelineCss, /cursor:\s*help/);
  });

  it('CSS includes lineage-house glow keyframes', () => {
    const m = MODE_INTERACTION_MODULES['family-penta'];
    assert.match(m.scrollTimelineCss, /lineage-glow|@keyframes lineage-glow/);
  });

  it('GSAP timeline reveals roots before branches', () => {
    const m = MODE_INTERACTION_MODULES['family-penta'];
    assert.match(m.gsapTimeline, /data-role="root"/);
    assert.match(m.gsapTimeline, /data-role="branch"/);
  });

  it('event handlers implement click-to-spotlight + root-pair tooltip', () => {
    const m = MODE_INTERACTION_MODULES['family-penta'];
    assert.match(m.eventHandlers, /data-spotlighted/);
    assert.match(m.eventHandlers, /section\[data-member="/);
    assert.match(m.eventHandlers, /data-lineage-glow/);
    assert.match(m.eventHandlers, /data-root-pair/);
  });

  it('event handlers reference scrollIntoView for click-to-section', () => {
    const m = MODE_INTERACTION_MODULES['family-penta'];
    assert.match(m.eventHandlers, /scrollIntoView/);
  });

  it('buildInteractionPayload composes family-penta on top of pentagon topology', () => {
    const payload = buildInteractionPayload('pentagon', 'family-penta');
    assert.match(payload.css, /Family-Penta mode interactions/);
    assert.match(payload.handlers, /click-to-spotlight|data-spotlighted/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// renderInteractiveHTMLPage with family-penta mode + pentagon topology
// ────────────────────────────────────────────────────────────────────────

describe('renderInteractiveHTMLPage — family-penta wiring', () => {
  const samplePart: PartBlock = {
    partNum: 1, romanNumeral: 'I', title: 'Lineage Field', contentHtml: '<p>x</p>',
  };

  it('emits data-mode="family-penta" on .canvas.interactive', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'F1 × F2 × F3 × F4 × F5', birth_date: '2026-01-01' },
      topology: 'pentagon',
      mode: 'family-penta',
      parts: [samplePart],
    });
    assert.match(html, /class="canvas interactive" data-mode="family-penta"/);
  });

  it('inlines family-penta interaction CSS + handlers', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'F1 × F2 × F3 × F4 × F5', birth_date: '2026-01-01' },
      topology: 'pentagon',
      mode: 'family-penta',
      parts: [samplePart],
    });
    assert.match(html, /Family-Penta mode interactions/);
    assert.match(html, /click-to-spotlight|data-spotlighted/);
  });
});
