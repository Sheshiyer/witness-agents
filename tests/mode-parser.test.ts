// ─── Mode-doc parser + SVG dispatcher tests ───────────────────────────
// Covers P0.1 (parser) and P0.2 (dispatcher) from the reading-modes plan.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseModeDoc, summarizeLessons } from '../scripts/integratedreading/modes/parser.js';
import {
  TOPOLOGY_RENDERERS,
  getRenderer,
  renderByTopology,
} from '../scripts/integratedreading/render/svg/index.js';

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function makeTempDoc(content: string): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'mode-doc-test-'));
  const path = join(dir, 'sample.md');
  writeFileSync(path, content, 'utf-8');
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const VALID_DOC = `---
mode: partner-synastry
subject_count:
  min: 2
  max: 2
roles:
  - partner-A
  - partner-B
target_words:
  min: 12000
  max: 15000
architecture: linear
pass_plan:
  - id: alpha
    title: "Cross-Chart Structural Field"
    target_words: 3000
    template: pass-alpha-template
  - id: beta
    title: "Pair-Resonance Threads"
    target_words: 3500
    template: pass-beta-template
engine_overlay_weights:
  tarot: 2.0
  human-design: 2.0
house_overlay: [7, 11, 12]
bridge_mandates:
  - "Every claim braids four cross-system references."
svg_topology: dyad-arc
---

## pass-alpha-template

Write Pass α — the structural cross-chart field.

{{prior_pass}}

## pass-beta-template

Write Pass β — pair-resonance threads.

{{prior_pass}}

## overlay-rules

Tarot and HD are foregrounded for romantic synastry.

## glossary

phase-lock geometry, AKSHARA-coupling.

## interactions

Hover threads → tooltip names the four-way bridge.

## lessons

### 2026-05-20 — Pass γ phase-lock specificity
**Question:** Does mandating concrete dasha-stagger-day-counts in Pass γ raise phase-lock-geometry clarity?
**Variants:** baseline / explicit-day-count / explicit-day-count + transit-overlay
**Winner:** explicit-day-count + transit-overlay (judge: 28.5/40 vs baseline 24/40)
**Adopted:** Pass γ template requires "the X-day stagger" structural anchor.
**Reference:** ~/.claude/MEMORY/WORK/autoresearch-partner-synastry-2026-05-20/
`;

// ────────────────────────────────────────────────────────────────────────
// Parser — happy path
// ────────────────────────────────────────────────────────────────────────

describe('parseModeDoc — happy path', () => {
  it('parses a full valid mode doc', () => {
    const { path, cleanup } = makeTempDoc(VALID_DOC);
    try {
      const result = parseModeDoc(path);
      assert.equal(result.frontmatter.mode, 'partner-synastry');
      assert.equal(result.frontmatter.subject_count.min, 2);
      assert.equal(result.frontmatter.subject_count.max, 2);
      assert.deepEqual(result.frontmatter.roles, ['partner-A', 'partner-B']);
      assert.equal(result.frontmatter.architecture, 'linear');
      assert.equal(result.frontmatter.pass_plan.length, 2);
      assert.equal(result.frontmatter.svg_topology, 'dyad-arc');
      assert.equal(result.frontmatter.engine_overlay_weights.tarot, 2.0);
      assert.deepEqual(result.frontmatter.house_overlay, [7, 11, 12]);
    } finally {
      cleanup();
    }
  });

  it('splits body into named sections (lowercase-hyphenated keys)', () => {
    const { path, cleanup } = makeTempDoc(VALID_DOC);
    try {
      const result = parseModeDoc(path);
      assert.ok(result.sections['pass-alpha-template']);
      assert.ok(result.sections['pass-beta-template']);
      assert.ok(result.sections['overlay-rules']);
      assert.ok(result.sections['glossary']);
      assert.ok(result.sections['interactions']);
      assert.ok(result.sections['lessons']);
      assert.match(result.sections['pass-alpha-template'], /structural cross-chart field/);
    } finally {
      cleanup();
    }
  });

  it('parses lessons section into structured entries', () => {
    const { path, cleanup } = makeTempDoc(VALID_DOC);
    try {
      const result = parseModeDoc(path);
      assert.equal(result.lessons.length, 1);
      const entry = result.lessons[0];
      assert.equal(entry.date, '2026-05-20');
      assert.equal(entry.title, 'Pass γ phase-lock specificity');
      assert.match(entry.question || '', /dasha-stagger-day-counts/);
      assert.equal(entry.variants?.length, 3);
      assert.match(entry.winner || '', /explicit-day-count \+ transit-overlay/);
      assert.match(entry.adopted || '', /X-day stagger/);
      assert.match(entry.reference || '', /autoresearch-partner-synastry/);
    } finally {
      cleanup();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Parser — error paths
// ────────────────────────────────────────────────────────────────────────

describe('parseModeDoc — error paths', () => {
  it('throws on missing frontmatter delimiter', () => {
    const { path, cleanup } = makeTempDoc('no frontmatter here\n## section\nbody\n');
    try {
      assert.throws(() => parseModeDoc(path), /missing leading.*frontmatter/);
    } finally {
      cleanup();
    }
  });

  it('throws on missing closing frontmatter delimiter', () => {
    const { path, cleanup } = makeTempDoc('---\nmode: x\n\n## section\nbody\n');
    try {
      assert.throws(() => parseModeDoc(path), /missing closing.*frontmatter/);
    } finally {
      cleanup();
    }
  });

  it('throws on missing required frontmatter key', () => {
    const incomplete = `---
mode: x
subject_count:
  min: 2
  max: 2
---

## anything
body
`;
    const { path, cleanup } = makeTempDoc(incomplete);
    try {
      assert.throws(() => parseModeDoc(path), /missing required frontmatter key/);
    } finally {
      cleanup();
    }
  });

  it('throws on invalid svg_topology', () => {
    const bad = VALID_DOC.replace('svg_topology: dyad-arc', 'svg_topology: octagon');
    const { path, cleanup } = makeTempDoc(bad);
    try {
      assert.throws(() => parseModeDoc(path), /invalid svg_topology/);
    } finally {
      cleanup();
    }
  });

  it('throws when pass_plan.template references a missing section', () => {
    const bad = VALID_DOC.replace(
      'template: pass-alpha-template',
      'template: nonexistent-template',
    );
    const { path, cleanup } = makeTempDoc(bad);
    try {
      assert.throws(() => parseModeDoc(path), /has no matching.*section/);
    } finally {
      cleanup();
    }
  });

  it('throws when subject_count.min > max', () => {
    const bad = VALID_DOC.replace('min: 2\n  max: 2', 'min: 5\n  max: 2');
    const { path, cleanup } = makeTempDoc(bad);
    try {
      assert.throws(() => parseModeDoc(path), /min > subject_count\.max/);
    } finally {
      cleanup();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Parser — empty/missing lessons
// ────────────────────────────────────────────────────────────────────────

describe('parseModeDoc — lessons edge cases', () => {
  it('handles empty lessons section', () => {
    const withEmptyLessons = VALID_DOC.replace(/## lessons[\s\S]*$/, '## lessons\n');
    const { path, cleanup } = makeTempDoc(withEmptyLessons);
    try {
      const result = parseModeDoc(path);
      assert.deepEqual(result.lessons, []);
    } finally {
      cleanup();
    }
  });

  it('handles entirely missing lessons section', () => {
    const noLessons = VALID_DOC.replace(/## lessons[\s\S]*$/, '');
    const { path, cleanup } = makeTempDoc(noLessons);
    try {
      const result = parseModeDoc(path);
      assert.deepEqual(result.lessons, []);
    } finally {
      cleanup();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// summarizeLessons
// ────────────────────────────────────────────────────────────────────────

describe('summarizeLessons', () => {
  it('returns empty string when no lessons', () => {
    assert.equal(summarizeLessons([]), '');
  });

  it('summarizes recent entries with adopted line', () => {
    const out = summarizeLessons([
      { date: '2026-05-01', title: 'first', adopted: 'use X' },
      { date: '2026-05-10', title: 'second' },
    ]);
    assert.match(out, /Prior Autoresearch Findings/);
    assert.match(out, /2026-05-01 first.*Adopted: use X/);
    assert.match(out, /2026-05-10 second/);
  });

  it('clips to maxEntries (default 5)', () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({
      date: `2026-05-0${i + 1}`,
      title: `entry-${i}`,
    }));
    const out = summarizeLessons(entries);
    // Last 5: entry-3 through entry-7
    assert.ok(!out.includes('entry-0'));
    assert.ok(!out.includes('entry-1'));
    assert.ok(!out.includes('entry-2'));
    assert.ok(out.includes('entry-3'));
    assert.ok(out.includes('entry-7'));
  });
});

// ────────────────────────────────────────────────────────────────────────
// SVG renderer-dispatcher (P0.2)
// ────────────────────────────────────────────────────────────────────────

describe('SVG renderer-dispatcher', () => {
  it('registers all four topology keys', () => {
    const keys = Object.keys(TOPOLOGY_RENDERERS).sort();
    assert.deepEqual(keys, ['dyad-arc', 'pentagon', 'triad-triangle', 'web-graph']);
  });

  it('getRenderer returns a callable for valid topology', () => {
    const r = getRenderer('dyad-arc');
    assert.equal(typeof r, 'function');
  });

  it('getRenderer throws clear error on unknown topology', () => {
    assert.throws(
      () => getRenderer('octagon'),
      /Unknown svg_topology.*octagon.*Valid topologies/,
    );
  });

  it('renderByTopology dyad-arc emits valid SVG string', () => {
    const data = {
      subject_a: 'Alice',
      subject_b: 'Bob',
      a_mahadasha: { current: 'Rahu', next: 'Jupiter', transition_iso: '2026-09-14' },
      b_mahadasha: { current: 'Ketu', next: 'Venus', transition_iso: '2026-11-18' },
      electromagnetic_channels: ['24-61 Awareness'],
      companionship_gates: ['31', '62'],
    };
    const svg = renderByTopology('dyad-arc', data, { width: 640 });
    assert.match(svg, /<svg xmlns/);
    assert.match(svg, /<\/svg>/);
    assert.match(svg, /ALICE/);
    assert.match(svg, /BOB/);
  });

  it('renderByTopology triad-triangle emits valid SVG string', () => {
    const data = {
      subjects: [
        { name: 'Alice', arc_color: '#10B5A7', current_mahadasha_lord: 'Rahu', next_mahadasha_lord: 'Jupiter', next_mahadasha_iso: '2026-09-14' },
        { name: 'Bob', arc_color: '#0B50FB', current_mahadasha_lord: 'Ketu', next_mahadasha_lord: 'Venus', next_mahadasha_iso: '2026-11-18' },
        { name: 'Carol', arc_color: '#C5A017', current_mahadasha_lord: 'Mars', next_mahadasha_lord: 'Rahu', next_mahadasha_iso: '2027-11-10' },
      ],
      shared_keys: ['Wheel of Fortune'],
    };
    const svg = renderByTopology('triad-triangle', data, { width: 720 });
    assert.match(svg, /<svg xmlns/);
    assert.match(svg, /TRIAD/);
    assert.match(svg, /ALICE/);
  });

  it('pentagon topology throws NotImplementedError pointing to issue #50', () => {
    assert.throws(
      () => renderByTopology('pentagon', {}),
      /not yet implemented.*#50/,
    );
  });

  it('web-graph topology throws NotImplementedError pointing to issue #53', () => {
    assert.throws(
      () => renderByTopology('web-graph', {}),
      /not yet implemented.*#53/,
    );
  });
});
