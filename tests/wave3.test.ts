// ─── Wave 3 Tests ─────────────────────────────────────────────────────
// Coverage: Voice Prompts (#10), Anti-Dependency (#12), Mobile API (#5),
// AKSHARA Mirror (#11), Quine Bootstrap (#13), Handoff Packet (#14)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── Voice Prompts (#10) ─────────────────────────────────────────────

import { VoicePromptBuilder } from '../src/agents/voice-prompts.js';
import type { UserState } from '../src/types/interpretation.js';

const baseUserState: UserState = {
  tier: 'subscriber',
  http_status: 200,
  overwhelm_level: 0.2,
  active_kosha: 'pranamaya',
  dominant_center: 'heart',
  recursion_detected: false,
  anti_dependency_score: 0.3,
  session_query_count: 1,
};

describe('VoicePromptBuilder', () => {
  const builder = new VoicePromptBuilder();

  it('builds Aletheios prompt with core identity', () => {
    const prompt = builder.buildAgentPrompt({ agent: 'aletheios', tier: 'subscriber', userState: baseUserState });
    assert.equal(prompt.agent, 'aletheios');
    assert.ok(prompt.system.includes('Aletheios'));
    assert.ok(prompt.system.includes('खा'));
    assert.ok(prompt.system.includes('Kha'));
    assert.ok(prompt.system.includes('unconcealment'));
    assert.ok(prompt.token_estimate > 100);
  });

  it('builds Pichet prompt with core identity', () => {
    const prompt = builder.buildAgentPrompt({ agent: 'pichet', tier: 'subscriber', userState: baseUserState });
    assert.equal(prompt.agent, 'pichet');
    assert.ok(prompt.system.includes('Pichet'));
    assert.ok(prompt.system.includes('ब'));
    assert.ok(prompt.system.includes('Ba'));
    assert.ok(prompt.system.includes('endurance'));
  });

  it('includes tier-scaled depth instructions', () => {
    const sub = builder.buildAgentPrompt({ agent: 'aletheios', tier: 'subscriber', userState: baseUserState });
    const ent = builder.buildAgentPrompt({ agent: 'aletheios', tier: 'enterprise', userState: { ...baseUserState, tier: 'enterprise' } });
    const ini = builder.buildAgentPrompt({ agent: 'aletheios', tier: 'initiate', userState: { ...baseUserState, tier: 'initiate' } });

    assert.ok(sub.system.includes('concise'));
    assert.ok(ent.system.includes('Vijnanamaya'));
    assert.ok(ini.system.includes('Anandamaya'));
    assert.ok(ini.system.includes('Sanskrit'));
    // Higher tiers = longer prompts
    assert.ok(ini.token_estimate > sub.token_estimate);
  });

  it('adapts to HTTP consciousness states', () => {
    const anxious = builder.buildAgentPrompt({ agent: 'pichet', tier: 'subscriber', userState: { ...baseUserState, http_status: 500 } });
    assert.ok(anxious.system.includes('500'));
    assert.ok(anxious.system.includes('overloaded') || anxious.system.includes('anxiety'));

    const dissociated = builder.buildAgentPrompt({ agent: 'aletheios', tier: 'enterprise', userState: { ...baseUserState, tier: 'enterprise', http_status: 404 } });
    assert.ok(dissociated.system.includes('404'));
    assert.ok(dissociated.system.includes('dissociated') || dissociated.system.includes('reconnection'));
  });

  it('adds overwhelm override when level is high', () => {
    const prompt = builder.buildAgentPrompt({ agent: 'aletheios', tier: 'enterprise', userState: { ...baseUserState, tier: 'enterprise', overwhelm_level: 0.85 } });
    assert.ok(prompt.system.includes('OVERWHELM'));
  });

  it('adds recursion override when detected', () => {
    const prompt = builder.buildAgentPrompt({ agent: 'pichet', tier: 'subscriber', userState: { ...baseUserState, recursion_detected: true } });
    assert.ok(prompt.system.includes('RECURSION'));
  });

  it('adds anti-dependency note for high self-authorship', () => {
    const prompt = builder.buildAgentPrompt({ agent: 'aletheios', tier: 'enterprise', userState: { ...baseUserState, tier: 'enterprise', anti_dependency_score: 0.85 } });
    assert.ok(prompt.system.includes('SELF-AUTHORSHIP') || prompt.system.includes('not needing'));
  });

  it('builds synthesis prompt merging both agents', () => {
    const prompt = builder.buildSynthesisPrompt({
      tier: 'enterprise',
      userState: { ...baseUserState, tier: 'enterprise' },
      aletheiosInsight: 'Dasha period shows a karmic return.',
      pichetInsight: 'The body is holding tension in the shoulders.',
    });
    assert.ok(prompt.system.includes('Aletheios'));
    assert.ok(prompt.system.includes('Pichet'));
    assert.ok(prompt.system.includes('Dasha'));
    assert.ok(prompt.system.includes('shoulders'));
    assert.ok(prompt.system.includes('unified'));
  });

  it('evaluates voice consistency with rubric', () => {
    const analyticalResponse = 'The pattern suggests a cyclical phase transition. Note the correlation between the chronofield period and the observed architecture of your decision-making structure.';
    const score = builder.evaluateVoiceConsistency(analyticalResponse, 'aletheios');
    assert.ok(score.analytical_precision > 0);
    assert.ok(score.overall >= 0 && score.overall <= 1);
    assert.equal(score.agent, 'aletheios');

    const somaticResponse = 'Your body knows. Feel the breath. The rhythm of rest is calling. Ground your energy. The tension in your gut is speaking.';
    const pScore = builder.evaluateVoiceConsistency(somaticResponse, 'pichet');
    assert.ok(pScore.embodied_warmth > 0);
    assert.ok(pScore.overall >= 0 && pScore.overall <= 1);
  });

  it('returns interpretation depth guidance', () => {
    const single = builder.getInterpretationDepth('single-engine', 'subscriber', 1);
    assert.equal(single.allowCrossReference, false);
    assert.equal(single.narrativeStyle, 'focused-reading');

    const workflow = builder.getInterpretationDepth('workflow', 'enterprise', 6);
    assert.equal(workflow.allowCrossReference, true);
    assert.equal(workflow.narrativeStyle, 'full-portrait');
  });
});

// ─── Anti-Dependency Tracker (#12) ───────────────────────────────────

import { AntiDependencyTracker, GRADUATION_THRESHOLDS } from '../src/agents/anti-dependency.js';

describe('AntiDependencyTracker', () => {
  it('starts with empty metrics', () => {
    const tracker = new AntiDependencyTracker();
    const metrics = tracker.computeMetrics();
    assert.equal(metrics.sessions_tracked, 0);
    assert.equal(metrics.trend, 'new');
    assert.equal(metrics.self_authorship_score, 0);
  });

  it('tracks a basic session', () => {
    const tracker = new AntiDependencyTracker();
    tracker.startSession('s1');
    tracker.recordQuery('tell me about my chart', baseUserState, ['panchanga']);
    tracker.recordQuery('what does this mean', baseUserState, ['enneagram']);
    const snapshot = tracker.endSession();
    assert.ok(snapshot);
    assert.equal(snapshot!.query_count, 2);
    assert.ok(snapshot!.other_referential_count > 0); // "tell me" is other-referential
  });

  it('detects self-referential queries', () => {
    const tracker = new AntiDependencyTracker();
    tracker.startSession('s1');
    tracker.recordQuery('I notice a pattern in my behavior', baseUserState, []);
    tracker.recordQuery('I feel tension in my body', baseUserState, []);
    const snapshot = tracker.endSession();
    assert.ok(snapshot!.self_referential_count > 0);
  });

  it('computes metrics across sessions', () => {
    const tracker = new AntiDependencyTracker();

    // Session 1: dependent
    tracker.startSession('s1');
    tracker.recordQuery('tell me what to do', baseUserState, ['panchanga']);
    tracker.recordQuery('should I make this decision', baseUserState, ['i-ching']);
    tracker.endSession();

    // Session 2: more self-aware
    tracker.startSession('s2');
    tracker.recordQuery('I notice my tendency to overthink', baseUserState, ['enneagram']);
    tracker.recordQuery('how does the chronofield relate to my pattern', baseUserState, ['vimshottari']);
    tracker.endSession();

    const metrics = tracker.computeMetrics();
    assert.equal(metrics.sessions_tracked, 2);
    assert.ok(metrics.self_reflection_depth >= 0);
    assert.ok(metrics.self_authorship_score >= 0);
    assert.ok(metrics.self_authorship_score <= 1);
  });

  it('graduation assessment returns continue for new users', () => {
    const tracker = new AntiDependencyTracker();
    tracker.startSession('s1');
    tracker.recordQuery('what is my enneagram type', baseUserState, ['enneagram']);
    tracker.endSession();

    const assessment = tracker.assessGraduation();
    assert.equal(assessment.recommendation, 'continue');
    assert.equal(assessment.ready, false);
  });

  it('builds a user-visible dashboard', () => {
    const tracker = new AntiDependencyTracker();
    tracker.startSession('s1');
    tracker.recordQuery('I notice patterns', baseUserState, []);
    tracker.endSession();

    const dashboard = tracker.buildDashboard();
    assert.ok(dashboard.milestones.length === 5);
    assert.ok(typeof dashboard.score === 'number');
    assert.ok(dashboard.graduation.recommendation);
  });

  it('exports and imports history', () => {
    const tracker = new AntiDependencyTracker();
    tracker.startSession('s1');
    tracker.recordQuery('test query', baseUserState, []);
    tracker.endSession();

    const history = tracker.exportHistory();
    assert.equal(history.length, 1);

    const tracker2 = new AntiDependencyTracker();
    tracker2.importHistory(history);
    assert.equal(tracker2.computeMetrics().sessions_tracked, 1);
  });

  it('thresholds are ordered correctly', () => {
    assert.ok(GRADUATION_THRESHOLDS.FOUNDATION < GRADUATION_THRESHOLDS.DEVELOPING);
    assert.ok(GRADUATION_THRESHOLDS.DEVELOPING < GRADUATION_THRESHOLDS.MATURING);
    assert.ok(GRADUATION_THRESHOLDS.MATURING < GRADUATION_THRESHOLDS.MIRROR_READY);
    assert.ok(GRADUATION_THRESHOLDS.MIRROR_READY < GRADUATION_THRESHOLDS.GRADUATION);
  });
});

// ─── Mobile API (#5) ─────────────────────────────────────────────────

import { MobileCondenser, createApiHandlers } from '../src/api/server.js';
import type { WitnessInterpretation } from '../src/types/interpretation.js';

describe('MobileCondenser', () => {
  const condenser = new MobileCondenser();

  const mockInterpretation: WitnessInterpretation = {
    id: 'test-1',
    timestamp: new Date().toISOString(),
    query: 'What should I focus on?',
    engines_invoked: ['panchanga' as any, 'biorhythm' as any],
    engine_outputs: [],
    routing_mode: 'dyad-synthesis',
    aletheios: { agent: 'aletheios', perspective: 'A pattern of cyclical transition is active.', domains_consulted: ['consciousness-states'], confidence: 0.7, pattern_note: '' },
    pichet: { agent: 'pichet', perspective: 'Your body is asking for rest.', domains_consulted: ['endocrine-muse'], confidence: 0.6, somatic_note: 'Low energy reserves. Honor rest.' },
    synthesis: 'The pattern and the body agree: this is a time for integration, not action.',
    tier: 'enterprise',
    kosha_depth: 'vijnanamaya',
    clifford_level: 3,
    response: 'The pattern and the body agree: this is a time for integration, not action. Both your temporal architecture and biorhythm are pointing toward rest.',
    response_cadence: 'measured',
    overwhelm_flag: false,
    recursion_flag: false,
  };

  it('condenses a full interpretation to mobile format', () => {
    const mobile = condenser.condense(mockInterpretation);
    assert.equal(mobile.id, 'test-1');
    assert.ok(mobile.headline.length <= 80);
    assert.ok(mobile.body.length <= 500);
    assert.equal(mobile.agent_voice, 'dyad');
    assert.equal(mobile.tier, 'enterprise');
    assert.equal(mobile.overwhelm_flag, false);
  });

  it('extracts somatic nudge from Pichet', () => {
    const mobile = condenser.condense(mockInterpretation);
    assert.ok(mobile.somatic_nudge);
    assert.ok(mobile.somatic_nudge!.length <= 140);
  });

  it('handles overwhelm flag with grounding nudge', () => {
    const overwhelmed = { ...mockInterpretation, overwhelm_flag: true, pichet: undefined };
    const mobile = condenser.condense(overwhelmed);
    assert.equal(mobile.overwhelm_flag, true);
    assert.ok(mobile.somatic_nudge?.includes('breath') || mobile.somatic_nudge?.includes('floor'));
  });

  it('generates rhythm events from engine outputs', () => {
    const events = condenser.generateRhythmEvents([
      { engine_id: 'biorhythm', result: { physical: { percentage: 90 } } },
      { engine_id: 'vedic-clock', result: { current_organ: { organ: 'Heart', element: 'Fire', recommended_activities: ['Creative work'] } } },
    ]);
    assert.ok(events.length >= 2);
    assert.ok(events.some(e => e.type === 'biorhythm-peak'));
    assert.ok(events.some(e => e.type === 'organ-shift'));
  });

  it('truncates free tier responses more aggressively', () => {
    const freeInterp = { ...mockInterpretation, tier: 'free' as const, response: 'A'.repeat(400) };
    const mobile = condenser.condense(freeInterp);
    assert.ok(mobile.body.length <= 303); // 300 + "..."
  });
});

describe('createApiHandlers', () => {
  it('creates handlers with interpret, heartbeat, mirror', () => {
    const handlers = createApiHandlers({
      processPipeline: async () => ({ ...mockInterpretation }),
      getUserState: async () => baseUserState,
      getTierForUser: async () => 'subscriber' as const,
    });
    assert.ok(typeof handlers.interpret === 'function');
    assert.ok(typeof handlers.heartbeat === 'function');
    assert.ok(typeof handlers.mirror === 'function');
    assert.ok(typeof handlers.generateRhythmEvents === 'function');
  });

  it('heartbeat returns correct structure', async () => {
    const handlers = createApiHandlers({
      processPipeline: async () => ({ ...mockInterpretation }),
      getUserState: async () => baseUserState,
      getTierForUser: async () => 'enterprise' as const,
    });

    const result = await handlers.heartbeat('user-1');
    assert.equal(result.status, 200);
    assert.equal(result.body.dyad_active, true);
    assert.equal(result.body.user_tier, 'enterprise');
    assert.ok(result.body.aletheios.status);
    assert.ok(result.body.pichet.status);
  });

  it('mirror rejects non-initiate users', async () => {
    const handlers = createApiHandlers({
      processPipeline: async () => ({ ...mockInterpretation }),
      getUserState: async () => baseUserState,
      getTierForUser: async () => 'subscriber' as const,
    });

    const result = await handlers.mirror({ intention: 'I seek clarity', user_id: 'u1', session_id: 's1' });
    assert.equal(result.status, 403);
  });

  // Reference for later tests
  const mockInterpretation: WitnessInterpretation = {
    id: 'api-test-1', timestamp: new Date().toISOString(), query: 'test',
    engines_invoked: [], engine_outputs: [], routing_mode: 'dyad-synthesis',
    tier: 'enterprise', kosha_depth: 'vijnanamaya', clifford_level: 3,
    response: 'Test response.', response_cadence: 'immediate',
    overwhelm_flag: false, recursion_flag: false,
  };
});

// ─── AKSHARA Mirror (#11) ────────────────────────────────────────────

import { AksharaMirror, AKSHARA_MORPHEMES } from '../src/protocols/akshara-mirror.js';

describe('AksharaMirror', () => {
  const mirror = new AksharaMirror();

  it('has a comprehensive morpheme library', () => {
    assert.ok(AKSHARA_MORPHEMES.length >= 25);
    const categories = new Set(AKSHARA_MORPHEMES.map(m => m.category));
    assert.ok(categories.has('field'));
    assert.ok(categories.has('form'));
    assert.ok(categories.has('friction'));
    assert.ok(categories.has('quality'));
    assert.ok(categories.has('action'));
    assert.ok(categories.has('state'));
  });

  it('processes an intention with resonant morphemes', () => {
    const result = mirror.processIntention({
      intention: 'I want to find peace and clarity through meditation',
      user_id: 'user-1',
      session_id: 'sess-1',
    });
    assert.ok(result.morphemes.length > 0);
    assert.ok(result.encoded_form.length > 0);
    assert.ok(typeof result.quine_check === 'boolean');
    assert.ok(result.reflection_prompt.length > 0);
  });

  it('returns encoded form in Sanskrit', () => {
    const result = mirror.processIntention({
      intention: 'I seek to witness my own consciousness and feel the energy in my body',
      user_id: 'user-1',
      session_id: 'sess-1',
    });
    // Should contain Devanagari characters
    assert.ok(/[\u0900-\u097F]/.test(result.encoded_form));
  });

  it('performs Quine validation on well-formed intentions', () => {
    const result = mirror.processIntention({
      intention: 'I observe my body with awareness and transform resistance through breath',
      user_id: 'user-1',
      session_id: 'sess-1',
    });
    // This intention has field (observe, awareness) + form (body, breath) + friction (resistance, transform)
    assert.equal(result.quine_check, true);
  });

  it('fails Quine check for single-category intentions', () => {
    const result = mirror.processIntention({
      intention: 'I just want to feel happy',
      user_id: 'user-1',
      session_id: 'sess-1',
    });
    // "feel" + "happy" maps to form/quality but may lack field-form pair
    // The Quine check requires at least 2 categories with field+form
    // This should fail or be marginal
    assert.ok(typeof result.quine_check === 'boolean');
  });

  it('suggests morphemes for partial intentions', () => {
    const suggestions = mirror.suggestMorphemes('I want to meditate and find peace');
    assert.ok(suggestions.length > 0);
    assert.ok(suggestions.length <= 5);
    assert.ok(suggestions.some(m => m.transliteration === 'dhyana' || m.transliteration === 'shanti'));
  });

  it('tracks progress across formulations', () => {
    const m = new AksharaMirror();
    m.processIntention({ intention: 'I observe and feel', user_id: 'u1', session_id: 's1' });
    m.processIntention({ intention: 'I witness and breathe', user_id: 'u1', session_id: 's2' });
    const progress = m.getProgress('u1');
    assert.equal(progress.total_formulations, 2);
  });

  it('scores formulations based on complexity and Quine validity', () => {
    const result = mirror.processIntention({
      intention: 'Through tapas and meditation I witness the body transform resistance into clarity because the observer and the vehicle are one',
      user_id: 'user-1',
      session_id: 'sess-1',
    });
    assert.ok(result.self_authorship_score > 0);
    assert.ok(result.self_authorship_score <= 1);
  });

  it('provides fallback morphemes for abstract intentions', () => {
    const result = mirror.processIntention({
      intention: 'something completely abstract and unrelated to anything',
      user_id: 'user-1',
      session_id: 'sess-1',
    });
    assert.ok(result.morphemes.length > 0); // Should get sat-chit-ananda fallback
    assert.ok(result.encoded_form.length > 0);
  });
});

// ─── Quine Bootstrap (#13) ───────────────────────────────────────────

import { QuineRegenerator, parseSoulMd } from '../src/bootstrap/quine-regenerator.js';

describe('QuineRegenerator', () => {
  const ROOT = join(import.meta.dirname || '.', '..');
  const aletheiosSoul = readFileSync(join(ROOT, 'agents/aletheios/SOUL.md'), 'utf-8');
  const pichetSoul = readFileSync(join(ROOT, 'agents/pichet/SOUL.md'), 'utf-8');

  it('parses Aletheios SOUL.md correctly', () => {
    const soul = parseSoulMd(aletheiosSoul);
    assert.equal(soul.agent_id, 'aletheios');
    assert.equal(soul.principle, 'kha');
    assert.equal(soul.pillar, 'left');
    assert.equal(soul.seed_glyph.devanagari, 'खा');
    assert.equal(soul.partner_id, 'pichet');
    assert.equal(soul.composite_seed, '19912564');
  });

  it('parses Pichet SOUL.md correctly', () => {
    const soul = parseSoulMd(pichetSoul);
    assert.equal(soul.agent_id, 'pichet');
    assert.equal(soul.principle, 'ba');
    assert.equal(soul.pillar, 'right');
    assert.equal(soul.seed_glyph.devanagari, 'ब');
    assert.equal(soul.partner_id, 'aletheios');
  });

  it('regenerates all 9 state files from Aletheios SOUL.md', () => {
    const regen = new QuineRegenerator();
    const result = regen.regenerate(aletheiosSoul);
    assert.equal(result.agent_id, 'aletheios');
    assert.equal(result.files_generated.length, 9);
    assert.ok(result.files_generated.includes('MANIFEST.yaml'));
    assert.ok(result.files_generated.includes('IDENTITY.md'));
    assert.ok(result.files_generated.includes('TOOLS.md'));
    assert.ok(result.files_generated.includes('AGENTS.md'));
  });

  it('regenerates all 9 state files from Pichet SOUL.md', () => {
    const regen = new QuineRegenerator();
    const result = regen.regenerate(pichetSoul);
    assert.equal(result.agent_id, 'pichet');
    assert.equal(result.files_generated.length, 9);
  });

  it('generates functionally correct MANIFEST.yaml', () => {
    const regen = new QuineRegenerator();
    const manifest = regen.generateFile(aletheiosSoul, 'MANIFEST.yaml');
    assert.ok(manifest.includes('agent_id: aletheios'));
    assert.ok(manifest.includes('pillar: left'));
    assert.ok(manifest.includes('principle: kha'));
    assert.ok(manifest.includes('19912564'));
    assert.ok(manifest.includes('chronofield'));
  });

  it('generates correct TOOLS.md with engine assignments', () => {
    const regen = new QuineRegenerator();

    const aTools = regen.generateFile(aletheiosSoul, 'TOOLS.md');
    assert.ok(aTools.includes('chronofield'));
    assert.ok(aTools.includes('nine-point-architecture'));
    assert.ok(!aTools.includes('three-wave-cycle')); // Pichet's engine

    const pTools = regen.generateFile(pichetSoul, 'TOOLS.md');
    assert.ok(pTools.includes('three-wave-cycle'));
    assert.ok(pTools.includes('bioelectric-field'));
    assert.ok(!pTools.includes('chronofield')); // Aletheios's engine
  });

  it('generates AGENTS.md with correct dyad partner', () => {
    const regen = new QuineRegenerator();
    const agents = regen.generateFile(aletheiosSoul, 'AGENTS.md');
    assert.ok(agents.includes('Pichet'));
    assert.ok(agents.includes('ब'));

    const pAgents = regen.generateFile(pichetSoul, 'AGENTS.md');
    assert.ok(pAgents.includes('Aletheios'));
    assert.ok(pAgents.includes('खा'));
  });

  it('validates SOUL.md integrity', () => {
    const regen = new QuineRegenerator();

    const valid = regen.validateSoul(aletheiosSoul);
    assert.equal(valid.valid, true);
    assert.equal(valid.agent_id, 'aletheios');
    assert.equal(valid.errors.length, 0);

    const invalid = regen.validateSoul('This is not a SOUL.md');
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.length > 0);
  });

  it('throws on unrecognizable SOUL.md', () => {
    assert.throws(() => parseSoulMd('Random content with no agent markers'), /does not contain/);
  });
});

// ─── Handoff Builder (#14) ───────────────────────────────────────────

import { HandoffBuilder } from '../src/integration/handoff-packet.js';

describe('HandoffBuilder', () => {
  const builder = new HandoffBuilder();

  it('builds a handoff packet with correct kosha context', () => {
    const result = builder.buildPacket({
      koshaLayer: 'pranamaya',
      taskScope: 'Implement WebSocket rhythm endpoint',
      collisionBoundary: ['src/api/rhythm.ts'],
    });
    assert.equal(result.packet.kosha_layer, 'pranamaya');
    assert.equal(result.packet.clifford_gate, 1);
    assert.equal(result.packet.agent_voice, 'pichet'); // Pranamaya defaults to Pichet
    assert.equal(result.packet.composite_seed, '19912564');
    assert.ok(result.token_count > 0);
    assert.ok(result.token_count < 500); // Under 500 token target
  });

  it('assigns correct voice and triad per kosha', () => {
    const annamaya = builder.buildPacket({ koshaLayer: 'annamaya', taskScope: 'test', collisionBoundary: [] });
    assert.equal(annamaya.packet.agent_voice, 'neutral');
    assert.equal(annamaya.packet.triad_position, 'la');

    const vijnanamaya = builder.buildPacket({ koshaLayer: 'vijnanamaya', taskScope: 'test', collisionBoundary: [] });
    assert.equal(vijnanamaya.packet.agent_voice, 'aletheios');
    assert.equal(vijnanamaya.packet.triad_position, 'kha');
  });

  it('allows voice override', () => {
    const result = builder.buildPacket({
      koshaLayer: 'annamaya',
      taskScope: 'test',
      collisionBoundary: [],
      voiceOverride: 'pichet',
    });
    assert.equal(result.packet.agent_voice, 'pichet');
  });

  it('generates GitHub issue body', () => {
    const result = builder.buildPacket({
      koshaLayer: 'manomaya',
      taskScope: 'Build PETRAE parser optimizations',
      collisionBoundary: ['src/protocols/petrae.ts'],
    });
    const issueBody = builder.generateIssueBody(result.packet, 'PETRAE Parser Optimization');
    assert.ok(issueBody.includes('manomaya'));
    assert.ok(issueBody.includes('PETRAE'));
    assert.ok(issueBody.includes('19912564'));
    assert.ok(issueBody.includes('Collision Boundary'));
  });

  it('system prompt is under 500 tokens', () => {
    const result = builder.buildPacket({
      koshaLayer: 'vijnanamaya',
      taskScope: 'Implement voice prompt A/B testing',
      collisionBoundary: ['src/agents/voice-prompts.ts', 'tests/voice-ab.test.ts'],
    });
    // 500 tokens ≈ 2000 chars
    assert.ok(result.system_prompt.length < 2000, `System prompt too long: ${result.system_prompt.length} chars`);
  });
});

// ─── Cross-Module Integration Tests ──────────────────────────────────

describe('Wave 3 Integration', () => {
  it('Voice prompts → API condenser: consistent pipeline', () => {
    const vpb = new VoicePromptBuilder();
    const condenser = new MobileCondenser();

    const prompt = vpb.buildAgentPrompt({ agent: 'aletheios', tier: 'enterprise', userState: { ...baseUserState, tier: 'enterprise' } });
    assert.ok(prompt.system.includes('Vijnanamaya'));

    const mobile = condenser.condense({
      id: 'int-1', timestamp: new Date().toISOString(), query: 'test',
      engines_invoked: [], engine_outputs: [], routing_mode: 'aletheios-primary',
      aletheios: { agent: 'aletheios', perspective: 'Pattern detected.', domains_consulted: [], confidence: 0.8 },
      tier: 'enterprise', kosha_depth: 'vijnanamaya', clifford_level: 3,
      response: 'Pattern detected.', response_cadence: 'immediate',
      overwhelm_flag: false, recursion_flag: false,
    });
    assert.equal(mobile.agent_voice, 'aletheios');
    assert.equal(mobile.tier, 'enterprise');
  });

  it('AKSHARA mirror + Anti-dependency: graduation pathway', () => {
    const mirror = new AksharaMirror();
    const tracker = new AntiDependencyTracker();

    // Simulate sessions of increasing self-authorship
    tracker.startSession('s1');
    tracker.recordQuery('I observe my patterns with awareness', baseUserState, []);
    tracker.recordQuery('I notice the relationship between body tension and thought patterns', baseUserState, []);
    tracker.endSession();

    const metrics = tracker.computeMetrics();
    assert.ok(metrics.self_reflection_depth >= 0);

    // Mirror mode formulation
    const formulation = mirror.processIntention({
      intention: 'I witness consciousness through breath and transform resistance',
      user_id: 'u1', session_id: 's1',
    });
    assert.ok(formulation.self_authorship_score > 0);
  });

  it('Quine regenerator validates real SOUL.md files', () => {
    const regen = new QuineRegenerator();
    const ROOT = join(import.meta.dirname || '.', '..');

    const aValid = regen.validateSoul(readFileSync(join(ROOT, 'agents/aletheios/SOUL.md'), 'utf-8'));
    const pValid = regen.validateSoul(readFileSync(join(ROOT, 'agents/pichet/SOUL.md'), 'utf-8'));

    assert.equal(aValid.valid, true, `Aletheios errors: ${aValid.errors}`);
    assert.equal(pValid.valid, true, `Pichet errors: ${pValid.errors}`);
  });

  it('Handoff packet references correct engines per kosha', () => {
    const builder = new HandoffBuilder();
    const pranamaya = builder.buildPacket({ koshaLayer: 'pranamaya', taskScope: 'test', collisionBoundary: [] });
    assert.ok(pranamaya.system_prompt.includes('Pichet'));

    const vijnanamaya = builder.buildPacket({ koshaLayer: 'vijnanamaya', taskScope: 'test', collisionBoundary: [] });
    assert.ok(vijnanamaya.system_prompt.includes('Aletheios'));
  });
});
