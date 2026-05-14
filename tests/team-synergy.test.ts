// ─── P5 — Team-Synergy tests ───────────────────────────────────────────
// Covers #52 (team-synergy.md), #53 (team-web.ts), #54 (interaction).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

import { parseModeDoc } from '../scripts/integratedreading/modes/parser.js';
import {
  TOPOLOGY_RENDERERS,
  renderByTopology,
  renderTeamWeb,
} from '../scripts/integratedreading/render/svg/index.js';
import {
  MODE_INTERACTION_MODULES,
  buildInteractionPayload,
} from '../scripts/integratedreading/render/interactions/index.js';
import { renderInteractiveHTMLPage, type PartBlock } from '../scripts/integratedreading/render/templates.js';

// ────────────────────────────────────────────────────────────────────────
// Mode doc parses (P5.1 #52)
// ────────────────────────────────────────────────────────────────────────

describe('team-synergy mode doc (P5.1)', () => {
  const path = resolve('scripts/integratedreading/modes/team-synergy.md');

  it('parses without errors', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.mode, 'team-synergy');
  });

  it('accepts 4-12 subjects', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.subject_count.min, 4);
    assert.equal(doc.frontmatter.subject_count.max, 12);
  });

  it('uses hierarchical architecture (outline + expansion)', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.architecture, 'hierarchical');
  });

  it('declares 4 passes (outline + 3 expansion)', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.pass_plan.length, 4);
    assert.deepEqual(
      doc.frontmatter.pass_plan.map((p) => p.id),
      ['outline', 'exp1', 'exp2', 'exp3'],
    );
  });

  it('outline pass is shorter than expansion passes', () => {
    const doc = parseModeDoc(path);
    const outline = doc.frontmatter.pass_plan[0];
    const expansions = doc.frontmatter.pass_plan.slice(1);
    for (const exp of expansions) {
      assert.ok(outline.target_words < exp.target_words, `outline (${outline.target_words}) should be < ${exp.id} (${exp.target_words})`);
    }
  });

  it('targets 12.5-15k words total', () => {
    const doc = parseModeDoc(path);
    const sum = doc.frontmatter.pass_plan.reduce((s, p) => s + p.target_words, 0);
    assert.ok(sum >= 12500, `total = ${sum}, expected >= 12500`);
    assert.ok(sum <= 15000, `total = ${sum}, expected <= 15000`);
  });

  it('foregrounds human-design at weight 2.0', () => {
    const doc = parseModeDoc(path);
    assert.ok(doc.frontmatter.engine_overlay_weights['human-design'] >= 2.0);
  });

  it('declares house_overlay includes 10 (joint dharma) and 11 (joint operative)', () => {
    const doc = parseModeDoc(path);
    assert.ok(doc.frontmatter.house_overlay.includes(10));
    assert.ok(doc.frontmatter.house_overlay.includes(11));
  });

  it('declares svg_topology: web-graph', () => {
    const doc = parseModeDoc(path);
    assert.equal(doc.frontmatter.svg_topology, 'web-graph');
  });

  it('every pass template resolves to a body section', () => {
    const doc = parseModeDoc(path);
    for (const pass of doc.frontmatter.pass_plan) {
      assert.ok(doc.sections[pass.template], `missing section: ${pass.template}`);
    }
  });

  it('bridge mandate names role-cluster + HD-authority + Vimshottari + Gene-Key-codon', () => {
    const doc = parseModeDoc(path);
    const m = doc.frontmatter.bridge_mandates[0];
    assert.match(m, /[Rr]ole-cluster/);
    assert.match(m, /HD|authority/);
    assert.match(m, /Vimshottari|dasha/i);
    assert.match(m, /Gene[ -]Key|codon/i);
  });

  it('declares the outline pass as STRUCTURAL DATA, not prose', () => {
    const doc = parseModeDoc(path);
    const outlineTemplate = doc.sections['pass-outline-template'];
    assert.match(outlineTemplate, /STRUCTURAL|weave map|outline IS/i);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Web-graph SVG renderer (P5.2 #53)
// ────────────────────────────────────────────────────────────────────────

const SIX_MEMBERS_DATA = {
  members: [
    { name: 'A', role_cluster: 'visionaries' as const, current_mahadasha_lord: 'Jupiter', next_mahadasha_lord: 'Saturn', next_mahadasha_iso: '2027-03-15' },
    { name: 'B', role_cluster: 'visionaries' as const },
    { name: 'C', role_cluster: 'operators' as const },
    { name: 'D', role_cluster: 'operators' as const },
    { name: 'E', role_cluster: 'integrators' as const },
    { name: 'F', role_cluster: 'connectors' as const },
  ],
  critical_path_edges: [
    { a: 0, b: 2, weight: 0.9, label: 'Vision × Ops handoff' },
    { a: 1, b: 4, weight: 0.7, label: 'Vision × Integration' },
    { a: 4, b: 5, weight: 0.6, label: 'Integration × Connection' },
  ],
  joint_operative_archetype: 'The Cauldron',
  shared_keys: ['Jupiter MD coverage · Wheel of Fortune'],
};

describe('team-web SVG renderer (P5.2)', () => {
  it('is registered in TOPOLOGY_RENDERERS as `web-graph`', () => {
    assert.ok(TOPOLOGY_RENDERERS['web-graph']);
    assert.equal(typeof TOPOLOGY_RENDERERS['web-graph'], 'function');
  });

  it('emits valid SVG string', () => {
    const svg = renderTeamWeb(SIX_MEMBERS_DATA, { width: 880 });
    assert.match(svg, /<svg xmlns/);
    assert.match(svg, /<\/svg>/);
  });

  it('renders all members by name', () => {
    const svg = renderTeamWeb(SIX_MEMBERS_DATA, { width: 880 });
    for (const m of SIX_MEMBERS_DATA.members) {
      assert.ok(svg.includes(m.name), `missing member: ${m.name}`);
    }
  });

  it('emits cluster bounding hulls with data-cluster', () => {
    const svg = renderTeamWeb(SIX_MEMBERS_DATA, { width: 880 });
    assert.match(svg, /data-cluster="visionaries"/);
    assert.match(svg, /data-cluster="operators"/);
    assert.match(svg, /data-cluster="integrators"/);
    assert.match(svg, /data-cluster="connectors"/);
  });

  it('emits cluster labels (DISPLAY casing)', () => {
    const svg = renderTeamWeb(SIX_MEMBERS_DATA, { width: 880 });
    assert.match(svg, /VISIONARIES/);
    assert.match(svg, /OPERATORS/);
    assert.match(svg, /INTEGRATORS/);
    assert.match(svg, /CONNECTORS/);
  });

  it('emits critical-path edges with data-critical="true" + data-label', () => {
    const svg = renderTeamWeb(SIX_MEMBERS_DATA, { width: 880 });
    assert.match(svg, /data-critical="true"/);
    assert.match(svg, /data-label="Vision × Ops handoff"/);
  });

  it('emits non-critical (background) edges with data-critical="false"', () => {
    const svg = renderTeamWeb(SIX_MEMBERS_DATA, { width: 880 });
    assert.match(svg, /data-critical="false"/);
  });

  it('emits joint-operative archetype label in center seed', () => {
    const svg = renderTeamWeb(SIX_MEMBERS_DATA, { width: 880 });
    assert.match(svg, /JOINT/);
    assert.match(svg, /OPERATIVE/);
    assert.match(svg, /THE CAULDRON/);
  });

  it('emits shared_keys legend at bottom when provided', () => {
    const svg = renderTeamWeb(SIX_MEMBERS_DATA, { width: 880 });
    assert.match(svg, /SHARED OPERATIONAL CURRENTS/);
    assert.match(svg, /Jupiter MD coverage/);
  });

  it('renderByTopology dispatches web-graph correctly', () => {
    const svg = renderByTopology('web-graph', SIX_MEMBERS_DATA, { width: 880 });
    assert.match(svg, /<svg xmlns/);
    assert.match(svg, /JOINT/);
  });

  it('throws on subject count below 2', () => {
    const tooFew = { members: [{ name: 'X', role_cluster: 'visionaries' as const }], shared_keys: [] };
    assert.throws(() => renderTeamWeb(tooFew, { width: 880 }), /requires 2-12 members/);
  });

  it('throws on subject count above 12', () => {
    const tooMany = {
      members: Array.from({ length: 13 }, (_, i) => ({ name: `M${i}`, role_cluster: 'visionaries' as const })),
      shared_keys: [],
    };
    assert.throws(() => renderTeamWeb(tooMany, { width: 880 }), /requires 2-12 members/);
  });

  it('handles 12 members with all four clusters', () => {
    const twelveMembers = {
      members: Array.from({ length: 12 }, (_, i) => ({
        name: `M${i}`,
        role_cluster: (['visionaries', 'operators', 'integrators', 'connectors'] as const)[i % 4],
      })),
      shared_keys: [],
    };
    const svg = renderTeamWeb(twelveMembers, { width: 880 });
    assert.match(svg, /<svg xmlns/);
    // All 12 members should appear
    for (let i = 0; i < 12; i++) {
      assert.ok(svg.includes(`M${i}`));
    }
  });

  it('handles a cluster with only 1 member (renders circle hull)', () => {
    const singleClusterMember = {
      members: [
        { name: 'A', role_cluster: 'visionaries' as const },
        { name: 'B', role_cluster: 'operators' as const },
        { name: 'C', role_cluster: 'operators' as const },
        { name: 'D', role_cluster: 'operators' as const },
      ],
      shared_keys: [],
    };
    const svg = renderTeamWeb(singleClusterMember, { width: 880 });
    assert.match(svg, /<svg xmlns/);
    // Visionaries cluster has 1 member; rendered as circle bounding hull
    assert.match(svg, /data-cluster="visionaries"/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Team-synergy interaction module (P5.3 #54)
// ────────────────────────────────────────────────────────────────────────

describe('team-synergy interaction module (P5.3)', () => {
  it('is registered in MODE_INTERACTION_MODULES', () => {
    assert.ok(MODE_INTERACTION_MODULES['team-synergy']);
  });

  it('CSS targets cluster filter buttons + dim states', () => {
    const m = MODE_INTERACTION_MODULES['team-synergy'];
    assert.match(m.scrollTimelineCss, /cluster-filter/);
    assert.match(m.scrollTimelineCss, /data-cluster-filter/);
  });

  it('CSS targets critical-path edges with hover affordance', () => {
    const m = MODE_INTERACTION_MODULES['team-synergy'];
    assert.match(m.scrollTimelineCss, /data-critical="true"/);
    assert.match(m.scrollTimelineCss, /cursor:\s*pointer/);
  });

  it('CSS includes dasha-cadence overlay with scroll-driven animation', () => {
    const m = MODE_INTERACTION_MODULES['team-synergy'];
    assert.match(m.scrollTimelineCss, /dasha-cadence-overlay/);
    assert.match(m.scrollTimelineCss, /@supports.*animation-timeline/);
  });

  it('GSAP timeline reveals hulls before nodes before critical edges', () => {
    const m = MODE_INTERACTION_MODULES['team-synergy'];
    assert.match(m.gsapTimeline, /data-cluster/);
    assert.match(m.gsapTimeline, /data-node/);
    assert.match(m.gsapTimeline, /data-critical/);
  });

  it('event handlers implement cluster filter + edge tooltip + cadence toggle', () => {
    const m = MODE_INTERACTION_MODULES['team-synergy'];
    assert.match(m.eventHandlers, /cluster-filter button/);
    assert.match(m.eventHandlers, /data-critical="true"/);
    assert.match(m.eventHandlers, /cadence-on|data-cadence-on/);
  });

  it('buildInteractionPayload composes team-synergy on top of web-graph topology', () => {
    const payload = buildInteractionPayload('web-graph', 'team-synergy');
    assert.match(payload.css, /Team-Synergy mode interactions/);
    assert.match(payload.handlers, /cluster-filter button/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// renderInteractiveHTMLPage with team-synergy mode + web-graph topology
// ────────────────────────────────────────────────────────────────────────

describe('renderInteractiveHTMLPage — team-synergy wiring', () => {
  const samplePart: PartBlock = {
    partNum: 1, romanNumeral: 'I', title: 'Weave Map', contentHtml: '<p>x</p>',
  };

  it('emits data-mode="team-synergy" on .canvas.interactive', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'Team of 6', birth_date: '2026-01-01' },
      topology: 'web-graph',
      mode: 'team-synergy',
      parts: [samplePart],
    });
    assert.match(html, /class="canvas interactive" data-mode="team-synergy"/);
  });

  it('inlines team-synergy interaction CSS + handlers', () => {
    const html = renderInteractiveHTMLPage({
      title: 'T',
      cover: { subject: 'Team of 6', birth_date: '2026-01-01' },
      topology: 'web-graph',
      mode: 'team-synergy',
      parts: [samplePart],
    });
    assert.match(html, /Team-Synergy mode interactions/);
    assert.match(html, /cluster-filter/);
  });
});
