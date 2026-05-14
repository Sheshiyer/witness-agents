// ─── Interactive HTML renderer + interactions framework tests ─────────
// Covers P2.1 (renderInteractiveHTMLPage), P2.2 (interactions module
// registry), and P2.3 (@media print flattening) for the reading-modes plan.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERACTION_MODULES,
  buildInteractionPayload,
  BASE_SCROLL_NARRATIVE_CSS,
  BASE_INTERACTIVE_JS,
  GSAP_CDN,
} from '../scripts/integratedreading/render/interactions/index.js';
import {
  renderInteractiveHTMLPage,
  type PartBlock,
} from '../scripts/integratedreading/render/templates.js';
import { STYLES } from '../scripts/integratedreading/render/styles.js';

// ────────────────────────────────────────────────────────────────────────
// Interactions module registry
// ────────────────────────────────────────────────────────────────────────

describe('INTERACTION_MODULES registry', () => {
  it('registers all four topology keys', () => {
    const keys = Object.keys(INTERACTION_MODULES).sort();
    assert.deepEqual(keys, ['dyad-arc', 'pentagon', 'triad-triangle', 'web-graph']);
  });

  it('each module has the three required string layers', () => {
    for (const [k, mod] of Object.entries(INTERACTION_MODULES)) {
      assert.equal(typeof mod.scrollTimelineCss, 'string', `${k} missing scrollTimelineCss`);
      assert.equal(typeof mod.gsapTimeline, 'string', `${k} missing gsapTimeline`);
      assert.equal(typeof mod.eventHandlers, 'string', `${k} missing eventHandlers`);
    }
  });

  it('dyad-arc + triad-triangle have substantive interactions (not stubs)', () => {
    assert.ok(INTERACTION_MODULES['dyad-arc'].gsapTimeline.length > 200);
    assert.ok(INTERACTION_MODULES['triad-triangle'].gsapTimeline.length > 200);
  });

  it('pentagon + web-graph are stubs pointing to their landing issues', () => {
    assert.match(INTERACTION_MODULES['pentagon'].eventHandlers, /#51|P4\.3/);
    assert.match(INTERACTION_MODULES['web-graph'].eventHandlers, /#54|P5\.3/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// buildInteractionPayload — composes BASE + topology-specific
// ────────────────────────────────────────────────────────────────────────

describe('buildInteractionPayload', () => {
  it('combines BASE_SCROLL_NARRATIVE_CSS with topology-specific CSS', () => {
    const payload = buildInteractionPayload('dyad-arc');
    assert.ok(payload.css.includes('Scroll-Narrative Scaffold'));
    assert.ok(payload.css.includes(INTERACTION_MODULES['dyad-arc'].scrollTimelineCss.trim().slice(0, 30)));
  });

  it('combines BASE_INTERACTIVE_JS with topology-specific handlers', () => {
    const payload = buildInteractionPayload('triad-triangle');
    assert.ok(payload.handlers.includes('Scroll-Narrative Runtime'));
    assert.ok(payload.handlers.includes(INTERACTION_MODULES['triad-triangle'].eventHandlers.trim().slice(0, 30)));
  });

  it('returns sensible fallback for unknown topology', () => {
    const payload = buildInteractionPayload('octagon');
    assert.match(payload.css, /unknown topology/);
    assert.match(payload.handlers, /unknown topology/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// renderInteractiveHTMLPage — full page assembly
// ────────────────────────────────────────────────────────────────────────

const SAMPLE_PARTS: PartBlock[] = [
  { partNum: 1, romanNumeral: 'I', title: 'Composite Field', subtitle: '3,200 words', contentHtml: '<p>Pass alpha prose.</p>' },
  { partNum: 2, romanNumeral: 'II', title: 'Phase-Lock Geometry', subtitle: '3,600 words', contentHtml: '<p>Pass beta prose.</p>' },
  { partNum: 3, romanNumeral: 'III', title: 'Marriage Already-Already', subtitle: '3,400 words', contentHtml: '<p>Pass gamma prose.</p>' },
];

describe('renderInteractiveHTMLPage', () => {
  it('renders a complete HTML document', () => {
    const html = renderInteractiveHTMLPage({
      title: 'Test',
      cover: { subject: 'Alice × Bob', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      parts: SAMPLE_PARTS,
      is_composite: true,
      composite_subject_a: 'Alice',
      composite_subject_b: 'Bob',
    });
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<\/html>\s*$/);
    assert.match(html, /<title>Test<\/title>/);
  });

  it('inlines the full STYLES brand CSS', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      parts: SAMPLE_PARTS,
    });
    // Sanity: a recognizable brand-CSS fragment must be present
    assert.ok(html.includes(STYLES.slice(0, 100)));
  });

  it('inlines BASE_SCROLL_NARRATIVE_CSS', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      parts: SAMPLE_PARTS,
    });
    assert.ok(html.includes('Scroll-Narrative Scaffold'));
    assert.ok(html.includes(BASE_SCROLL_NARRATIVE_CSS.slice(0, 60)));
  });

  it('inlines BASE_INTERACTIVE_JS runtime', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      parts: SAMPLE_PARTS,
    });
    assert.ok(html.includes(BASE_INTERACTIVE_JS.slice(0, 60)));
  });

  it('loads GSAP via CDN script tag', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      parts: SAMPLE_PARTS,
    });
    assert.ok(html.includes(GSAP_CDN));
    assert.match(html, /ScrollTrigger/);
  });

  it('emits one .part-block per part', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      parts: SAMPLE_PARTS,
    });
    const partBlockCount = (html.match(/part-block/g) ?? []).length;
    // Each part-block class appears at least once per part (open tag).
    assert.ok(partBlockCount >= SAMPLE_PARTS.length);
  });

  it('emits TOC rail with one li per part', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      parts: SAMPLE_PARTS,
    });
    assert.match(html, /<nav class="toc-rail">/);
    for (const p of SAMPLE_PARTS) {
      assert.ok(html.includes(`data-part="${p.partNum}"`), `missing TOC item for part ${p.partNum}`);
      assert.ok(html.includes(`href="#part-${p.partNum}"`), `missing TOC link for part ${p.partNum}`);
    }
  });

  it('emits .part-block.has-viz when a part declares vizHtml', () => {
    const partsWithViz = [
      { ...SAMPLE_PARTS[0], vizHtml: '<figure class="viz">SVG-here</figure>' },
      SAMPLE_PARTS[1],
    ];
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A', birth_date: '2026-01-01' },
      topology: 'dyad-arc',
      parts: partsWithViz,
    });
    assert.match(html, /class="part-block has-viz"/);
    assert.match(html, /<aside class="part-viz-column">/);
  });

  it('inlines the topology-specific interaction module', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'A', birth_date: '2026-01-01' },
      topology: 'triad-triangle',
      parts: SAMPLE_PARTS,
    });
    // triad-triangle's CSS targets stroke-width="1.6" circles
    assert.match(html, /circle\[fill="none"\]\[stroke-width="1\.6"\]/);
    // GSAP timeline-triad references
    assert.ok(html.includes('Triad-triangle'));
  });
});

// ────────────────────────────────────────────────────────────────────────
// @media print flattening (P2.3)
// ────────────────────────────────────────────────────────────────────────

describe('@media print flattening rules', () => {
  it('STYLES contains the interactive-layer print flattening block', () => {
    assert.match(STYLES, /Interactive layer print flattening/);
  });

  it('flattening block disables animations and transforms', () => {
    const block = STYLES.split('Interactive layer print flattening')[1] || '';
    assert.match(block, /animation:\s*none\s*!important/);
    assert.match(block, /transition:\s*none\s*!important/);
    assert.match(block, /transform:\s*none\s*!important/);
  });

  it('flattening block hides sticky TOC rail and bridge tooltip', () => {
    const block = STYLES.split('Interactive layer print flattening')[1] || '';
    assert.match(block, /\.toc-rail\s*\{\s*display:\s*none/);
    assert.match(block, /#bridge-tooltip\s*\{\s*display:\s*none/);
  });

  it('flattening block collapses sticky-viz column to flow', () => {
    const block = STYLES.split('Interactive layer print flattening')[1] || '';
    assert.match(block, /part-viz-column\s*\{[\s\S]*?position:\s*static/);
  });

  it('flattening block disables scroll-snap and grid', () => {
    const block = STYLES.split('Interactive layer print flattening')[1] || '';
    assert.match(block, /scroll-snap-type:\s*none/);
    assert.match(block, /body-page\.interactive\s*\{[\s\S]*?display:\s*block/);
  });
});
