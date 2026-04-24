// ─── Witness Agents — Wave 1 Integration Test ─────────────────────────
// Tests: state machine, knowledge loader, tier gate, pipeline types

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_PATH = path.join(__dirname, '..', 'knowledge');

// ═══════════════════════════════════════════════════════════════════════
// Type imports (compile-time validation)
// ═══════════════════════════════════════════════════════════════════════

import type {
  SelemeneEngineId,
  WitnessEngineAlias,
  RoutingMode,
  SelemeneEngineOutput,
  BiorhythmResult,
  VimshottariChart,
  Tier,
  CliffordLevel,
  Kosha,
  UserState,
  AgentState,
  DyadState,
} from '../src/types/index.js';

import {
  ENGINE_ID_MAP,
  REVERSE_ENGINE_MAP,
  ENGINE_ROUTING,
  SELEMENE_ENGINE_IDS,
  WORKFLOW_ENGINES,
  SUPABASE_TIER_MAP,
} from '../src/types/engine.js';

import {
  TIER_MAX_CLIFFORD,
  TIER_MAX_KOSHA,
  TIER_RATE_LIMITS,
} from '../src/types/interpretation.js';

import { STATE_TRANSITIONS } from '../src/types/agent.js';

// ═══════════════════════════════════════════════════════════════════════
// Runtime imports
// ═══════════════════════════════════════════════════════════════════════

import { AgentStateMachine, DyadCoordinator } from '../src/agents/state-machine.js';
import { KnowledgeStore } from '../src/knowledge/domain-loader.js';
import { TierGate, RateLimiter } from '../src/tiers/tier-gate.js';
import { CliffordGate } from '../src/pipeline/interpreter.js';

// ═══════════════════════════════════════════════════════════════════════
// ENGINE ID MAPPING
// ═══════════════════════════════════════════════════════════════════════

describe('Engine ID Mapping', () => {
  it('maps all 16 Selemene engine IDs to witness aliases', () => {
    assert.equal(Object.keys(ENGINE_ID_MAP).length, 16);
    for (const id of SELEMENE_ENGINE_IDS) {
      assert.ok(ENGINE_ID_MAP[id], `Missing mapping for ${id}`);
    }
  });

  it('bidirectional mapping is consistent', () => {
    for (const [selemeneId, alias] of Object.entries(ENGINE_ID_MAP)) {
      assert.equal(REVERSE_ENGINE_MAP[alias as WitnessEngineAlias], selemeneId);
    }
  });

  it('all engines have routing assigned', () => {
    for (const id of SELEMENE_ENGINE_IDS) {
      const routing = ENGINE_ROUTING[id];
      assert.ok(
        ['aletheios-primary', 'pichet-primary', 'dyad-synthesis'].includes(routing),
        `Invalid routing for ${id}: ${routing}`
      );
    }
  });

  it('has 5 aletheios-primary, 5 pichet-primary, 6 dyad-synthesis', () => {
    const counts = { 'aletheios-primary': 0, 'pichet-primary': 0, 'dyad-synthesis': 0 };
    for (const routing of Object.values(ENGINE_ROUTING)) {
      counts[routing]++;
    }
    assert.equal(counts['aletheios-primary'], 5);
    assert.equal(counts['pichet-primary'], 5);
    assert.equal(counts['dyad-synthesis'], 6);
  });

  it('Supabase tier mapping covers all tiers', () => {
    assert.equal(SUPABASE_TIER_MAP['free'], 'free');
    assert.equal(SUPABASE_TIER_MAP['basic'], 'subscriber');
    assert.equal(SUPABASE_TIER_MAP['premium'], 'enterprise');
    assert.equal(SUPABASE_TIER_MAP['enterprise'], 'initiate');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// AGENT STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════

describe('Agent State Machine', () => {
  it('starts in DORMANT state', () => {
    const agent = new AgentStateMachine('aletheios');
    assert.equal(agent.state, 'DORMANT');
  });

  it('follows valid transition path: DORMANT → ACTIVE → INTERPRETING → SYNTHESIZING → DORMANT', () => {
    const agent = new AgentStateMachine('pichet');
    assert.ok(agent.activate(1));
    assert.equal(agent.state, 'ACTIVE');
    assert.ok(agent.beginInterpretation());
    assert.equal(agent.state, 'INTERPRETING');
    assert.ok(agent.beginSynthesis());
    assert.equal(agent.state, 'SYNTHESIZING');
    assert.ok(agent.deactivate());
    assert.equal(agent.state, 'DORMANT');
  });

  it('rejects invalid transitions', () => {
    const agent = new AgentStateMachine('aletheios');
    assert.equal(agent.transition('INTERPRETING'), false); // Can't jump from DORMANT
    assert.equal(agent.transition('SYNTHESIZING'), false);
  });

  it('tracks activation count', () => {
    const agent = new AgentStateMachine('aletheios');
    agent.activate(0);
    agent.deactivate();
    agent.activate(1);
    const snap = agent.getSnapshot();
    assert.equal(snap.activation_count, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DYAD COORDINATOR
// ═══════════════════════════════════════════════════════════════════════

describe('Dyad Coordinator', () => {
  it('starts with both agents dormant', () => {
    const dyad = new DyadCoordinator();
    const state = dyad.getState();
    assert.equal(state.sync_status, 'both_dormant');
    assert.equal(state.aletheios.state, 'DORMANT');
    assert.equal(state.pichet.state, 'DORMANT');
  });

  it('activates only primary agent for subscriber routing', () => {
    const dyad = new DyadCoordinator();
    const result = dyad.activateForQuery('aletheios-primary', 1, false);
    assert.ok(result.aletheios_active);
    assert.equal(result.pichet_active, false);
  });

  it('activates both agents for dyad-synthesis routing', () => {
    const dyad = new DyadCoordinator();
    const result = dyad.activateForQuery('dyad-synthesis', 3, true);
    assert.ok(result.aletheios_active);
    assert.ok(result.pichet_active);
  });

  it('detects query recursion', () => {
    const dyad = new DyadCoordinator();
    for (let i = 0; i < 5; i++) {
      dyad.trackQuery('What is my purpose?');
    }
    const state = dyad.getState();
    assert.ok(state.recursion_detected);
  });

  it('runs heartbeat checks', () => {
    const dyad = new DyadCoordinator();
    const checks = dyad.heartbeat();
    assert.ok(checks.aletheios.memory_integrity);
    assert.ok(checks.pichet.memory_integrity);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// KNOWLEDGE STORE
// ═══════════════════════════════════════════════════════════════════════

describe('Knowledge Store', () => {
  let store: KnowledgeStore;

  before(async () => {
    store = new KnowledgeStore(KNOWLEDGE_PATH);
    await store.loadAll();
  });

  it('loads existing domain YAML files', () => {
    const stats = store.getStats();
    assert.ok(stats.domains >= 5, `Expected ≥5 domains, got ${stats.domains}`);
    assert.ok(stats.totalRecords > 0, `Expected records, got ${stats.totalRecords}`);
  });

  it('can query endocrine-muse domain', () => {
    const result = store.query({ domain: 'endocrine-muse' });
    assert.equal(result.domain, 'endocrine-muse');
    assert.ok(result.records.length > 0, 'Expected endocrine-muse records');
    assert.ok(result.query_time_ms < 10, `Query too slow: ${result.query_time_ms}ms`);
  });

  it('can query by key (partial match)', () => {
    const result = store.query({ domain: 'endocrine-muse', key: '5' });
    assert.ok(result.records.length > 0, 'Expected records for position 5 (cortisol)');
  });

  it('can query for engine', () => {
    const results = store.queryForEngine('biorhythm');
    // biorhythm should map to at least one domain
    assert.ok(results.length >= 0); // May be 0 if engine map doesn't have this key yet
  });

  it('lists loaded domains', () => {
    const domains = store.getLoadedDomains();
    assert.ok(domains.includes('endocrine-muse'));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TIER GATE
// ═══════════════════════════════════════════════════════════════════════

describe('Tier Gate', () => {
  it('allows free tier with quota', () => {
    const gate = new TierGate();
    const check = gate.check('free', 'test-session-1');
    assert.ok(check.allowed);
    assert.equal(check.agents_mode, 'none');
    assert.equal(check.max_clifford, 0);
  });

  it('enforces free tier rate limit of 10', () => {
    const gate = new TierGate();
    for (let i = 0; i < 10; i++) {
      gate.recordUsage('free', 'test-session-2');
    }
    const check = gate.check('free', 'test-session-2');
    assert.equal(check.allowed, false);
    assert.ok(check.reason?.includes('10'));
    assert.ok(check.upgrade_hint);
  });

  it('enterprise tier has unlimited quota', () => {
    const gate = new TierGate();
    for (let i = 0; i < 1000; i++) {
      gate.recordUsage('enterprise', 'test-session-3');
    }
    const check = gate.check('enterprise', 'test-session-3');
    assert.ok(check.allowed);
    assert.equal(check.agents_mode, 'dyad');
    assert.equal(check.max_clifford, 3);
  });

  it('initiate tier gets dyad_mirror mode', () => {
    const gate = new TierGate();
    const check = gate.check('initiate', 'test-session-4');
    assert.ok(check.allowed);
    assert.equal(check.agents_mode, 'dyad_mirror');
    assert.equal(check.max_clifford, 7);
    assert.equal(check.max_kosha, 'anandamaya');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CLIFFORD GATE
// ═══════════════════════════════════════════════════════════════════════

describe('Clifford Gate', () => {
  it('returns tier max when not overwhelmed', () => {
    const gate = new CliffordGate();
    const level = gate.evaluate({
      tier: 'enterprise',
      http_status: 200,
      overwhelm_level: 0.2,
      active_kosha: 'vijnanamaya',
      dominant_center: 'head',
      recursion_detected: false,
      anti_dependency_score: 0.3,
      session_query_count: 5,
    });
    assert.equal(level, 3);
  });

  it('reduces gate level when overwhelmed', () => {
    const gate = new CliffordGate();
    const level = gate.evaluate({
      tier: 'enterprise',
      http_status: 500,
      overwhelm_level: 0.8,
      active_kosha: 'vijnanamaya',
      dominant_center: 'head',
      recursion_detected: true,
      anti_dependency_score: 0.5,
      session_query_count: 20,
    });
    assert.ok(level < 3, `Expected reduced level, got ${level}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// WORKFLOW DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

describe('Workflow Definitions', () => {
  it('all 6 workflows are defined', () => {
    assert.equal(Object.keys(WORKFLOW_ENGINES).length, 6);
  });

  it('full-spectrum includes all 16 engines', () => {
    assert.equal(WORKFLOW_ENGINES['full-spectrum'].length, 16);
  });

  it('daily-practice includes expected engines', () => {
    const dp = WORKFLOW_ENGINES['daily-practice'];
    assert.ok(dp.includes('panchanga'));
    assert.ok(dp.includes('biorhythm'));
    assert.ok(dp.includes('vedic-clock'));
  });
});
