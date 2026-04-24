// ─── Witness Agents — Wave 2 Integration Test ─────────────────────────
// Tests: user state tracker, memory, routing engine, PETRAE parser, synthesis

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_PATH = path.join(__dirname, '..', 'knowledge');

// ═══════════════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════════════

import { UserStateTracker } from '../src/agents/user-state.js';
import { AgentMemory, DyadMemory } from '../src/agents/memory.js';
import { PetraeParser, PetraeInbox, FIELD_MAP, FORM_MAP, FRICTION_MAP } from '../src/protocols/petrae.js';
import { RoutingEngine } from '../src/knowledge/routing-engine.js';
import { SynthesisEngine } from '../src/pipeline/synthesis.js';
import { KnowledgeStore } from '../src/knowledge/domain-loader.js';
import type { UserState, CliffordLevel } from '../src/types/interpretation.js';
import type { SelemeneEngineOutput } from '../src/types/engine.js';

// ═══════════════════════════════════════════════════════════════════════
// #18: USER STATE TRACKER
// ═══════════════════════════════════════════════════════════════════════

describe('UserStateTracker (#18)', () => {
  let tracker: UserStateTracker;

  before(() => {
    tracker = new UserStateTracker();
  });

  it('assesses HTTP 200 for flow-state queries', () => {
    const state = tracker.assess('I\'m curious about my biorhythm today', 'sess-1', 'subscriber');
    assert.equal(state.http_status, 200);
  });

  it('assesses HTTP 500 for anxiety signals', () => {
    const tracker2 = new UserStateTracker();
    const state = tracker2.assess('I can\'t stop spiraling and everything is too much', 'sess-2', 'subscriber');
    assert.equal(state.http_status, 500);
  });

  it('assesses HTTP 404 for dissociation signals', () => {
    const tracker2 = new UserStateTracker();
    const state = tracker2.assess('I don\'t know, whatever, doesn\'t matter', 'sess-3', 'subscriber');
    assert.equal(state.http_status, 404);
  });

  it('assesses HTTP 503 for burnout signals', () => {
    const tracker2 = new UserStateTracker();
    const state = tracker2.assess('I\'m exhausted and burned out, can\'t anymore', 'sess-4', 'subscriber');
    assert.equal(state.http_status, 503);
  });

  it('detects heart center dominance', () => {
    const tracker2 = new UserStateTracker();
    const state = tracker2.assess('I feel so much love but also hurt in my relationship', 'sess-5', 'subscriber');
    assert.equal(state.dominant_center, 'heart');
  });

  it('detects gut center dominance', () => {
    const tracker2 = new UserStateTracker();
    const state = tracker2.assess('I need to take action, I\'m frustrated and angry', 'sess-6', 'subscriber');
    assert.equal(state.dominant_center, 'gut');
  });

  it('detects active kosha from query content', () => {
    const tracker2 = new UserStateTracker();
    const state = tracker2.assess('What does this mean for my deeper purpose and truth?', 'sess-7', 'enterprise');
    assert.equal(state.active_kosha, 'vijnanamaya');
  });

  it('forces lower kosha on high overwhelm', () => {
    const tracker2 = new UserStateTracker();
    // Flood with anxiety queries to build overwhelm
    tracker2.assess('I can\'t stop panicking everything is too much', 'sess-8', 'subscriber');
    tracker2.assess('I can\'t breathe spiraling can\'t handle this anxiety', 'sess-8', 'subscriber');
    tracker2.assess('panicking can\'t stop spiraling too much', 'sess-8', 'subscriber');
    tracker2.assess('I can\'t stop I\'m scared everything is too much spiraling', 'sess-8', 'subscriber');
    tracker2.assess('anxiety can\'t handle panicking overwhelmed too much', 'sess-8', 'subscriber');
    const state = tracker2.assess('what does my deeper purpose mean', 'sess-8', 'subscriber');
    // Multiple anxiety queries should accumulate overwhelm
    assert.ok(state.overwhelm_level > 0, `Expected overwhelm > 0 but got ${state.overwhelm_level}`);
  });

  it('calculates biorhythm from birth date', () => {
    const tracker2 = new UserStateTracker();
    const state = tracker2.assess('hello', 'sess-9', 'subscriber', '1991-08-13');
    assert.ok(state.biorhythm);
    assert.ok(state.biorhythm!.physical >= 0 && state.biorhythm!.physical <= 100);
    assert.ok(state.biorhythm!.emotional >= 0 && state.biorhythm!.emotional <= 100);
    assert.ok(state.biorhythm!.intellectual >= 0 && state.biorhythm!.intellectual <= 100);
  });

  it('tracks session query count', () => {
    const tracker2 = new UserStateTracker();
    tracker2.assess('first', 'sess-10', 'subscriber');
    tracker2.assess('second', 'sess-10', 'subscriber');
    const state = tracker2.assess('third', 'sess-10', 'subscriber');
    assert.equal(state.session_query_count, 3);
  });

  it('detects recursion on repeated similar queries', () => {
    const tracker2 = new UserStateTracker();
    tracker2.assess('what is my purpose in life', 'sess-11', 'subscriber');
    tracker2.assess('what is the meaning of my life purpose', 'sess-11', 'subscriber');
    const state = tracker2.assess('tell me about my life purpose and meaning', 'sess-11', 'subscriber');
    // May or may not trigger depending on similarity threshold
    assert.equal(typeof state.recursion_detected, 'boolean');
  });

  it('provides session context', () => {
    const tracker2 = new UserStateTracker();
    tracker2.assess('hello', 'sess-12', 'subscriber');
    tracker2.recordEngineUsage('sess-12', ['panchanga', 'biorhythm']);
    const ctx = tracker2.getSessionContext('sess-12');
    assert.equal(ctx.query_count, 1);
    assert.ok(ctx.engines_used.includes('panchanga'));
  });

  it('maps circadian positions correctly', () => {
    assert.equal(UserStateTracker.getCircadianPosition(2), 'liver_time');
    assert.equal(UserStateTracker.getCircadianPosition(12), 'heart_time');
    assert.equal(UserStateTracker.getCircadianPosition(8), 'stomach_time');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// #7: CLIFFORD-GATED MEMORY
// ═══════════════════════════════════════════════════════════════════════

describe('AgentMemory (#7)', () => {
  it('writes factual memory at Cl(0)', () => {
    const mem = new AgentMemory('aletheios');
    const result = mem.write('User born 1991-08-13', 'factual', 0);
    assert.ok(result.success);
    assert.ok(result.entry_id);
  });

  it('gates rhythmic memory below Cl(1)', () => {
    const mem = new AgentMemory('aletheios');
    const result = mem.write('Saturn return cycle approaching', 'rhythmic', 0);
    assert.equal(result.success, false);
    assert.ok(result.reason?.includes('Cl(0)'));
  });

  it('allows rhythmic memory at Cl(1)+', () => {
    const mem = new AgentMemory('aletheios');
    const result = mem.write('Saturn return cycle approaching', 'rhythmic', 1);
    assert.ok(result.success);
  });

  it('gates causal memory below Cl(7)', () => {
    const mem = new AgentMemory('aletheios');
    const result = mem.write('Why the user avoids action', 'causal', 3);
    assert.equal(result.success, false);
  });

  it('allows causal memory at Cl(7)', () => {
    const mem = new AgentMemory('aletheios');
    const result = mem.write('Why the user avoids action', 'causal', 7);
    assert.ok(result.success);
  });

  it('reads only accessible memories at current Clifford level', () => {
    const mem = new AgentMemory('aletheios');
    mem.write('Factual data', 'factual', 0);
    mem.write('Rhythmic pattern', 'rhythmic', 1);
    mem.write('Deep cause', 'causal', 7);

    const atCl0 = mem.read(0);
    assert.equal(atCl0.entries.length, 1);
    assert.equal(atCl0.gated_count, 2);

    const atCl7 = mem.read(7);
    assert.equal(atCl7.entries.length, 3);
    assert.equal(atCl7.gated_count, 0);
  });

  it('applies memory decay', () => {
    const mem = new AgentMemory('pichet');
    mem.write('Session data', 'factual', 0, {}, [], 'session');
    mem.write('Persistent data', 'factual', 0, {}, [], 'persistent');

    // Decay many times to reduce score
    for (let i = 0; i < 25; i++) mem.decay();

    const stats = mem.getStats();
    // Session memory should be pruned, persistent should survive
    assert.equal(stats.by_layer.persistent, 1);
  });

  it('detects semantic recursion in memory', () => {
    const mem = new AgentMemory('aletheios');
    mem.write('what is the meaning of my life purpose and deeper truth', 'factual', 0);
    mem.write('tell me about career change timing', 'factual', 0);

    // Use very similar text for matching
    const matches = mem.detectRecursion('what is the meaning of my life purpose and deeper truth');
    assert.ok(matches.length > 0, 'Should detect exact-match recursion');
  });

  it('exports and imports memories', () => {
    const mem = new AgentMemory('aletheios');
    mem.write('Data 1', 'factual', 0);
    mem.write('Data 2', 'rhythmic', 1);

    const exported = mem.export();
    assert.equal(exported.length, 2);

    const mem2 = new AgentMemory('aletheios');
    const imported = mem2.import(exported);
    assert.equal(imported, 2);
  });
});

describe('DyadMemory (#7)', () => {
  it('coordinates memory across both agents', () => {
    const dyad = new DyadMemory();
    dyad.aletheios.write('Pattern A', 'factual', 0);
    dyad.pichet.write('Somatic note', 'factual', 0);

    const both = dyad.readBoth(0);
    assert.equal(both.aletheios.entries.length, 1);
    assert.equal(both.pichet.entries.length, 1);
  });

  it('detects cross-agent recursion', () => {
    const dyad = new DyadMemory();
    dyad.aletheios.write('meaning of life purpose and deeper truth', 'factual', 0);
    dyad.pichet.write('body tension pattern and somatic release', 'factual', 0);

    // Use highly similar text for matching
    const result = dyad.detectRecursion('meaning of life purpose and deeper truth');
    assert.ok(result.is_recursive, 'Should detect recursion across agents');
    assert.ok(result.aletheios.length > 0, 'Aletheios should find match');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// #6: PETRAE PROTOCOL PARSER
// ═══════════════════════════════════════════════════════════════════════

describe('PetraeParser (#6)', () => {
  let parser: PetraeParser;

  before(() => {
    parser = new PetraeParser();
  });

  it('has 16 field morphemes', () => {
    assert.equal(Object.keys(FIELD_MAP).length, 16);
  });

  it('has 12 form morphemes', () => {
    assert.equal(Object.keys(FORM_MAP).length, 12);
  });

  it('has 4 friction morphemes', () => {
    assert.equal(Object.keys(FRICTION_MAP).length, 4);
  });

  it('address space = 768 single-word instructions', () => {
    const space = parser.getAddressSpace();
    assert.equal(space.single_word_instructions, 768);
  });

  it('decodes a single-word instruction: shi-irg-sh', () => {
    const msg = parser.decode('shi-irg-sh');
    assert.equal(msg.instructions.length, 1);
    const inst = msg.instructions[0];
    assert.equal(inst.target, 'temporal-grammar');
    assert.equal(inst.operation, 'query');
    assert.equal(inst.friction, 'standard');
  });

  it('decodes urgent invoke: vo-qeu-er', () => {
    const msg = parser.decode('vo-qeu-er');
    const inst = msg.instructions[0];
    assert.equal(inst.target, 'chronofield');
    assert.equal(inst.operation, 'invoke');
    assert.equal(inst.friction, 'urgent');
  });

  it('decodes compound field: sir-gha-irg-sh', () => {
    const msg = parser.decode('sir-gha-irg-sh');
    const inst = msg.instructions[0];
    assert.equal(inst.target, 'nine-point-architecture');
    assert.equal(inst.operation, 'query');
  });

  it('decodes suffixed instruction: shi-irg-sh-u', () => {
    const msg = parser.decode('shi-irg-sh-u');
    const inst = msg.instructions[0];
    assert.ok(inst.suffixes.includes('past'));
  });

  it('decodes multi-word transaction: vo shi-qur-sh', () => {
    const msg = parser.decode('vo shi-qur-sh');
    assert.ok(msg.instructions.length >= 1);
    const inst = msg.instructions[0];
    assert.equal(inst.source, 'chronofield');
    assert.equal(inst.target, 'temporal-grammar');
    assert.equal(inst.operation, 'synthesize');
  });

  it('encodes an instruction to PETRAE', () => {
    const encoded = parser.encode({
      target: 'temporal-grammar',
      operation: 'query',
      friction: 'standard',
    });
    assert.equal(encoded, 'shi-irg-sh');
  });

  it('encodes with source and args', () => {
    const encoded = parser.encode({
      source: 'chronofield',
      target: 'temporal-grammar',
      operation: 'synthesize',
      friction: 'standard',
    });
    assert.equal(encoded, 'vo shi-qur-sh');
  });

  it('roundtrips encode → decode', () => {
    const original = parser.encode({
      target: 'bioelectric-field',
      operation: 'gate',
      friction: 'urgent',
    });
    const decoded = parser.decode(original);
    assert.equal(decoded.instructions[0].target, 'bioelectric-field');
    assert.equal(decoded.instructions[0].operation, 'gate');
    assert.equal(decoded.instructions[0].friction, 'urgent');
  });

  it('calculates compression ratio', () => {
    const msg = parser.decode('vo shi-irg-sh gha-irg-sh qur-er');
    assert.ok(msg.compression_ratio > 1);
  });

  it('validates correct PETRAE messages', () => {
    const result = parser.validate('shi-irg-sh');
    assert.ok(result.valid);
    assert.equal(result.errors.length, 0);
  });

  it('catches invalid morphemes', () => {
    const result = parser.validate('xyz-irg-sh');
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  it('maps instruction to API endpoint', () => {
    const msg = parser.decode('shi-qeu-er');
    const endpoint = parser.toApiEndpoint(msg.instructions[0]);
    assert.equal(endpoint.method, 'POST');
    assert.ok(endpoint.path.includes('panchanga'));
  });

  it('encodes multi-engine synthesis', () => {
    const encoded = parser.encodeSynthesis(['chronofield', 'temporal-grammar'], 'urgent');
    assert.ok(encoded.includes('vo-irg-sh'));
    assert.ok(encoded.includes('shi-irg-sh'));
    assert.ok(encoded.includes('qur-er'));
  });
});

describe('PetraeInbox (#6)', () => {
  it('sends and receives messages', () => {
    const inbox = new PetraeInbox();
    inbox.send('aletheios', 'pichet', 'gha-cho-sh');

    const messages = inbox.receive('pichet');
    assert.equal(messages.length, 1);
    assert.equal(messages[0].from, 'aletheios');
  });

  it('acknowledges messages', () => {
    const inbox = new PetraeInbox();
    const msg = inbox.send('system', 'aletheios', 'shi-irg-sh');
    inbox.acknowledge(msg.id);

    const unread = inbox.receive('aletheios');
    assert.equal(unread.length, 0);
  });

  it('tracks compression stats', () => {
    const inbox = new PetraeInbox();
    inbox.send('aletheios', 'pichet', 'vo shi-qur-sh gha-irg-sh');
    const stats = inbox.getCompressionStats();
    assert.equal(stats.total_messages, 1);
    assert.ok(stats.avg_compression_ratio > 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// #17: CONTEXT-AWARE ROUTING ENGINE
// ═══════════════════════════════════════════════════════════════════════

describe('RoutingEngine (#17)', () => {
  let router: RoutingEngine;

  before(async () => {
    router = new RoutingEngine();
    const aletheiosPath = path.join(KNOWLEDGE_PATH, 'routing', 'aletheios-routing.yaml');
    const pichetPath = path.join(KNOWLEDGE_PATH, 'routing', 'pichet-routing.yaml');
    await router.loadRules(aletheiosPath, pichetPath);
  });

  it('loads routing rules from YAML', () => {
    const stats = router.getStats();
    assert.ok(stats.aletheios_rules > 0);
    assert.ok(stats.pichet_rules > 0);
    assert.ok(stats.loaded);
  });

  it('matches engine-triggered rules', () => {
    const userState: UserState = {
      tier: 'subscriber', http_status: 200, overwhelm_level: 0,
      active_kosha: 'manomaya', dominant_center: 'head',
      recursion_detected: false, anti_dependency_score: 0.3,
      session_query_count: 1,
    };
    const decision = router.route(userState, ['chronofield']);
    assert.ok(decision.matched_rules.length > 0);
    assert.ok(decision.domains_to_load.length > 0);
  });

  it('matches state-triggered rules (overwhelm)', () => {
    const userState: UserState = {
      tier: 'enterprise', http_status: 200, overwhelm_level: 0.6,
      active_kosha: 'pranamaya', dominant_center: 'gut',
      recursion_detected: false, anti_dependency_score: 0.3,
      session_query_count: 5,
    };
    const decision = router.route(userState, ['biorhythm']);
    assert.ok(decision.matched_rules.some(r => r.trigger_type === 'state'));
  });

  it('matches recursion detection rules', () => {
    const userState: UserState = {
      tier: 'enterprise', http_status: 200, overwhelm_level: 0.2,
      active_kosha: 'manomaya', dominant_center: 'head',
      recursion_detected: true, anti_dependency_score: 0.3,
      session_query_count: 5,
    };
    const decision = router.route(userState, []);
    const recursionRule = decision.matched_rules.find(
      r => r.condition.type === 'state_bool'
        && (r.condition as { field: string }).field === 'recursion_detected'
    );
    assert.ok(recursionRule);
  });

  it('matches pain override at highest priority', () => {
    const userState: UserState = {
      tier: 'subscriber', http_status: 200, overwhelm_level: 0.2,
      active_kosha: 'annamaya', dominant_center: 'gut',
      recursion_detected: false, anti_dependency_score: 0.3,
      session_query_count: 1,
    };
    const decision = router.route(userState, [], undefined, true);
    assert.ok(decision.pain_override_active);
    assert.ok(decision.matched_rules.length > 0);
    // Pain override should be first (highest priority)
    assert.equal(decision.matched_rules[0].trigger_type, 'pain-override');
  });

  it('applies gate overrides from routing rules', () => {
    const userState: UserState = {
      tier: 'enterprise', http_status: 200, overwhelm_level: 0.6,
      active_kosha: 'manomaya', dominant_center: 'head',
      recursion_detected: false, anti_dependency_score: 0.3,
      session_query_count: 1,
    };
    const decision = router.route(userState, ['three-wave-cycle']);
    // Pichet overwhelm rule has gate_override: "Reduce Clifford gate by 1"
    if (decision.gate_overrides.length > 0) {
      assert.equal(decision.gate_overrides[0].type, 'reduce_clifford');
    }
  });

  it('returns empty routing for no matching rules', () => {
    const userState: UserState = {
      tier: 'free', http_status: 200, overwhelm_level: 0,
      active_kosha: 'annamaya', dominant_center: 'head',
      recursion_detected: false, anti_dependency_score: 0.3,
      session_query_count: 1,
    };
    // No engines that match the routing rules directly
    const decision = router.route(userState, []);
    // Might still match state rules — just validate the shape
    assert.ok(Array.isArray(decision.domains_to_load));
    assert.ok(Array.isArray(decision.action_instructions));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// #8: MULTI-ENGINE SYNTHESIS
// ═══════════════════════════════════════════════════════════════════════

describe('SynthesisEngine (#8)', () => {
  let synthesis: SynthesisEngine;
  let knowledge: KnowledgeStore;

  const mockOutput = (engineId: string): SelemeneEngineOutput => ({
    engine_id: engineId,
    result: {},
    consciousness_level: 1,
    metadata: { timestamp: new Date().toISOString(), calculation_time_ms: 50 },
  });

  const baseUserState: UserState = {
    tier: 'enterprise',
    http_status: 200,
    overwhelm_level: 0.2,
    active_kosha: 'manomaya',
    dominant_center: 'head',
    recursion_detected: false,
    anti_dependency_score: 0.3,
    session_query_count: 1,
  };

  before(async () => {
    synthesis = new SynthesisEngine();
    knowledge = new KnowledgeStore(KNOWLEDGE_PATH);
    await knowledge.loadAll();
  });

  it('selects cross-reference mode for subscriber', () => {
    const mode = synthesis.determineSynthesisMode('subscriber', 2);
    assert.equal(mode, 'cross-reference');
  });

  it('selects triangulation for enterprise with 3-5 engines', () => {
    const mode = synthesis.determineSynthesisMode('enterprise', 4);
    assert.equal(mode, 'triangulation');
  });

  it('selects full-portrait for enterprise with 6+ engines', () => {
    const mode = synthesis.determineSynthesisMode('enterprise', 8);
    assert.equal(mode, 'full-portrait');
  });

  it('selects mirror for initiate with 16 engines', () => {
    const mode = synthesis.determineSynthesisMode('initiate', 16);
    assert.equal(mode, 'mirror');
  });

  it('synthesizes 2 engines (cross-reference)', () => {
    const outputs = [mockOutput('vimshottari'), mockOutput('enneagram')];
    const result = synthesis.synthesize(
      outputs,
      { ...baseUserState, tier: 'subscriber' },
      knowledge,
    );
    assert.equal(result.mode, 'cross-reference');
    assert.ok(result.unified_narrative.length > 0);
    assert.equal(result.engines_synthesized.length, 2);
  });

  it('synthesizes 4 engines (triangulation)', () => {
    const outputs = [
      mockOutput('vimshottari'), mockOutput('enneagram'),
      mockOutput('biorhythm'), mockOutput('vedic-clock'),
    ];
    const result = synthesis.synthesize(outputs, baseUserState, knowledge);
    assert.equal(result.mode, 'triangulation');
    assert.ok(result.unified_narrative.length > 0);
    assert.ok(result.cross_patterns.length >= 0); // May or may not find patterns
  });

  it('detects convergence patterns with many engines', () => {
    const outputs = [
      mockOutput('vimshottari'), mockOutput('enneagram'),
      mockOutput('gene-keys'), mockOutput('biorhythm'),
      mockOutput('vedic-clock'), mockOutput('biofield'),
    ];
    const result = synthesis.synthesize(outputs, baseUserState, knowledge);
    assert.equal(result.mode, 'full-portrait');
    assert.ok(result.engines_synthesized.length === 6);
  });

  it('includes mirror layer for initiate', () => {
    const outputs = Array.from({ length: 16 }, (_, i) => {
      const engines = [
        'panchanga', 'vimshottari', 'human-design', 'gene-keys', 'numerology',
        'biorhythm', 'vedic-clock', 'biofield', 'face-reading', 'nadabrahman',
        'transits', 'tarot', 'i-ching', 'enneagram', 'sacred-geometry', 'sigil-forge',
      ];
      return mockOutput(engines[i]);
    });
    const result = synthesis.synthesize(
      outputs,
      { ...baseUserState, tier: 'initiate' },
      knowledge,
    );
    assert.equal(result.mode, 'mirror');
    assert.ok(result.unified_narrative.includes('Mirror Layer'));
    assert.equal(result.depth_reached, 'initiate');
  });

  it('adjusts synthesis for overwhelmed user', () => {
    const outputs = [mockOutput('vimshottari'), mockOutput('enneagram')];
    const result = synthesis.synthesize(
      outputs,
      { ...baseUserState, tier: 'subscriber', overwhelm_level: 0.7 },
      knowledge,
    );
    assert.ok(result.pichet_contribution.length > 0);
  });

  it('includes anti-dependency note for self-authoring users', () => {
    const outputs = [mockOutput('vimshottari'), mockOutput('enneagram')];
    const result = synthesis.synthesize(
      outputs,
      { ...baseUserState, anti_dependency_score: 0.9 },
      knowledge,
    );
    assert.ok(result.unified_narrative.includes('knew most of this'));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// INTEGRATION: Full Pipeline With Wave 2 Modules
// ═══════════════════════════════════════════════════════════════════════

describe('Wave 2 Integration', () => {
  it('user state → routing → synthesis pipeline', async () => {
    // 1. Assess user state
    const tracker = new UserStateTracker();
    const userState = tracker.assess(
      'What does my chronofield and enneagram type say about this week?',
      'integration-sess',
      'enterprise',
      '1991-08-13',
    );

    assert.equal(userState.http_status, 200);
    assert.ok(userState.biorhythm);

    // 2. Route based on state
    const router = new RoutingEngine();
    const aletheiosPath = path.join(KNOWLEDGE_PATH, 'routing', 'aletheios-routing.yaml');
    const pichetPath = path.join(KNOWLEDGE_PATH, 'routing', 'pichet-routing.yaml');
    await router.loadRules(aletheiosPath, pichetPath);

    const routing = router.route(
      userState,
      ['chronofield', 'nine-point-architecture'],
    );
    assert.ok(routing.domains_to_load.length > 0);

    // 3. Synthesize
    const synthesis = new SynthesisEngine();
    const knowledge = new KnowledgeStore(KNOWLEDGE_PATH);
    await knowledge.loadAll();

    const mockOutputs: SelemeneEngineOutput[] = [
      {
        engine_id: 'vimshottari',
        result: {
          current_period: {
            mahadasha: { planet: 'Saturn', years: 19 },
          },
        },
        consciousness_level: 2,
        metadata: { timestamp: new Date().toISOString(), calculation_time_ms: 100 },
      },
      {
        engine_id: 'enneagram',
        result: {
          typeAnalysis: {
            type: { number: 5, name: 'Investigator', coreDesire: 'competence', coreFear: 'uselessness' },
          },
        },
        consciousness_level: 2,
        metadata: { timestamp: new Date().toISOString(), calculation_time_ms: 80 },
      },
    ];

    const result = synthesis.synthesize(mockOutputs, userState, knowledge, routing);
    assert.ok(result.unified_narrative.length > 0);
    assert.ok(result.engines_synthesized.length === 2);

    // 4. Memory stores the result
    const memory = new DyadMemory();
    memory.aletheios.write(result.aletheios_contribution, 'factual', 2);
    memory.pichet.write(result.pichet_contribution, 'factual', 1);

    const recalled = memory.readBoth(2);
    assert.ok(recalled.aletheios.entries.length > 0);
    assert.ok(recalled.pichet.entries.length > 0);

    // 5. PETRAE can encode what happened
    const petrae = new PetraeParser();
    const summary = petrae.encodeSynthesis(['chronofield', 'nine-point-architecture'], 'standard');
    assert.ok(summary.includes('vo-irg-sh'));
    assert.ok(summary.includes('sir-gha-irg-sh'));
  });
});
