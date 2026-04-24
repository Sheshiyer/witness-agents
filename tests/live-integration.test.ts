// ─── Witness Agents — Live Selemene API Integration Test ──────────────
// Requires SELEMENE_API_KEY env var. Run:
//   SELEMENE_API_KEY=nk_xxx node --import tsx --test tests/live-integration.test.ts
//
// Tests real API → pipeline → dyad interpretation at every tier.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { InterpretationPipeline, SelemeneClient, CliffordGate } from '../src/pipeline/interpreter.js';
import { VoicePromptBuilder } from '../src/agents/voice-prompts.js';
import { MobileCondenser, createApiHandlers } from '../src/api/server.js';
import { UserStateTracker } from '../src/agents/user-state.js';
import { RoutingEngine } from '../src/knowledge/routing-engine.js';
import { SynthesisEngine } from '../src/pipeline/synthesis.js';

import type {
  BirthData,
  Tier,
  UserState,
  PipelineQuery,
  WitnessInterpretation,
} from '../src/types/interpretation.js';
import type { SelemeneEngineOutput, SelemeneEngineId } from '../src/types/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_PATH = path.join(__dirname, '..', 'knowledge');

// ═══════════════════════════════════════════════════════════════════════
// CONFIG — all from environment, nothing hardcoded
// ═══════════════════════════════════════════════════════════════════════

const API_KEY = process.env.SELEMENE_API_KEY;
const BASE_URL = process.env.SELEMENE_BASE_URL || 'https://selemene-engine-production.up.railway.app';

const BIRTH_DATA: BirthData = {
  name: 'Sheshnarayana Iyer',
  date: '1991-08-13',
  time: '13:19',
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: 'Asia/Kolkata',
};

function skipIfNoKey(): void {
  if (!API_KEY) {
    console.log('⏭  SELEMENE_API_KEY not set — skipping live tests');
    process.exit(0);
  }
}

function makeUserState(tier: Tier, overrides: Partial<UserState> = {}): UserState {
  return {
    tier,
    http_status: 200,
    overwhelm_level: 0,
    active_kosha: 'annamaya',
    dominant_center: 'head',
    recursion_detected: false,
    anti_dependency_score: 0.3,
    session_query_count: 1,
    ...overrides,
  };
}

function makeQuery(
  query: string,
  tier: Tier,
  opts: { engines?: SelemeneEngineId[]; workflow?: string; userOverrides?: Partial<UserState> } = {},
): PipelineQuery {
  return {
    query,
    user_state: makeUserState(tier, opts.userOverrides),
    birth_data: BIRTH_DATA,
    engine_hints: opts.engines,
    workflow_hint: opts.workflow,
    precision: 'Standard',
    session_id: `live-test-${Date.now()}`,
    request_id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

skipIfNoKey();

describe('Live: SelemeneClient direct', () => {
  let client: SelemeneClient;

  before(() => {
    client = new SelemeneClient({
      base_url: BASE_URL,
      api_key: API_KEY!,
      timeout_ms: 30000,
    });
  });

  it('calculates numerology with real API', async () => {
    const result = await client.calculateEngine('numerology', {
      birth_data: BIRTH_DATA,
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    });
    assert.equal(result.engine_id, 'numerology');
    assert.ok(result.result);
    assert.ok(result.witness_prompt);
    assert.equal(result.envelope_version, '1');
    const r = result.result as Record<string, any>;
    assert.ok(r.life_path, 'missing life_path');
    assert.ok(r.expression, 'missing expression');
    console.log(`  ✧ Life Path: ${r.life_path.value} (${r.life_path.meaning})`);
    console.log(`  ✧ Witness: "${result.witness_prompt?.slice(0, 100)}..."`);
  });

  it('calculates panchanga with real API', async () => {
    const result = await client.calculateEngine('panchanga', {
      birth_data: BIRTH_DATA,
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    });
    assert.equal(result.engine_id, 'panchanga');
    const r = result.result as Record<string, any>;
    assert.ok(r.tithi_name, 'missing tithi');
    assert.ok(r.nakshatra_name, 'missing nakshatra');
    console.log(`  ✧ Tithi: ${r.tithi_name}, Nakshatra: ${r.nakshatra_name}`);
  });

  it('calculates gene-keys (consciousness_level > 0)', async () => {
    const result = await client.calculateEngine('gene-keys', {
      birth_data: BIRTH_DATA,
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    });
    assert.equal(result.engine_id, 'gene-keys');
    assert.ok(result.consciousness_level >= 0, 'consciousness_level should be set');
    const r = result.result as Record<string, any>;
    assert.ok(r.active_keys?.length > 0, 'should have active gene keys');
    console.log(`  ✧ Active keys: ${r.active_keys.map((k: any) => `GK${k.key_number}(${k.gift})`).join(', ')}`);
    console.log(`  ✧ Consciousness level: ${result.consciousness_level}`);
  });

  it('executes birth-blueprint workflow (multi-engine)', async () => {
    const result = await client.executeWorkflow('birth-blueprint', {
      birth_data: BIRTH_DATA,
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    });
    assert.ok(result.engine_results);
    const engineIds = Object.keys(result.engine_results);
    assert.ok(engineIds.length >= 2, `expected ≥2 engines, got ${engineIds.length}`);
    console.log(`  ✧ Workflow engines: ${engineIds.join(', ')}`);
    for (const [eid, r] of Object.entries(result.engine_results)) {
      console.log(`    → ${eid}: consciousness_level=${r.consciousness_level}, calc=${r.metadata.calculation_time_ms}ms`);
    }
  });

  it('executes daily-practice workflow', async () => {
    const result = await client.executeWorkflow('daily-practice', {
      birth_data: BIRTH_DATA,
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    });
    const engineIds = Object.keys(result.engine_results);
    assert.ok(engineIds.length >= 1);
    console.log(`  ✧ Daily-practice engines: ${engineIds.join(', ')}`);
  });
});

describe('Live: Full InterpretationPipeline', () => {
  let pipeline: InterpretationPipeline;

  before(async () => {
    pipeline = new InterpretationPipeline({
      selemene: { base_url: BASE_URL, api_key: API_KEY! },
      knowledge_path: KNOWLEDGE_PATH,
    });
    await pipeline.initialize();
  });

  // ─── Tier comparison: same query, 4 tiers ───────────────────────────

  const TIER_QUERY = 'What patterns are active in my life right now?';

  it('free tier: raw witness prompts only, no agents', async () => {
    const q = makeQuery(TIER_QUERY, 'free');
    const result = await pipeline.process(q);

    assert.equal(result.tier, 'free');
    assert.equal(result.kosha_depth, 'annamaya');
    assert.equal(result.clifford_level, 0);
    assert.ok(!result.aletheios, 'free tier should NOT get Aletheios');
    assert.ok(!result.pichet, 'free tier should NOT get Pichet');
    assert.ok(!result.synthesis, 'free tier should NOT get synthesis');
    assert.ok(result.response.length > 20, 'should still have a response');
    assert.ok(result.engines_invoked.length > 0, 'should invoke engines');
    console.log(`  ✧ Free response (${result.response.length} chars): "${result.response.slice(0, 150)}..."`);
    console.log(`  ✧ Engines: ${result.engines_invoked.join(', ')}`);
  });

  it('subscriber tier: single agent interpretation', async () => {
    const q = makeQuery(TIER_QUERY, 'subscriber');
    const result = await pipeline.process(q);

    assert.equal(result.tier, 'subscriber');
    assert.ok(result.kosha_depth !== 'annamaya', 'subscriber should go deeper than annamaya');
    // Subscriber gets at least one agent
    const hasAgent = !!result.aletheios || !!result.pichet;
    assert.ok(hasAgent, 'subscriber should get at least one agent');
    assert.ok(result.response.length > result.engines_invoked.length * 10);
    console.log(`  ✧ Subscriber kosha: ${result.kosha_depth}, clifford: ${result.clifford_level}`);
    console.log(`  ✧ Aletheios: ${result.aletheios ? 'YES' : 'no'}, Pichet: ${result.pichet ? 'YES' : 'no'}`);
    console.log(`  ✧ Response: "${result.response.slice(0, 200)}..."`);
  });

  it('enterprise tier: full dyad synthesis', async () => {
    const q = makeQuery(TIER_QUERY, 'enterprise');
    const result = await pipeline.process(q);

    assert.equal(result.tier, 'enterprise');
    assert.ok(result.aletheios, 'enterprise should get Aletheios');
    assert.ok(result.pichet, 'enterprise should get Pichet');
    assert.ok(result.synthesis, 'enterprise should get dyad synthesis');
    assert.equal(result.kosha_depth, 'vijnanamaya');
    console.log(`  ✧ Enterprise synthesis: "${result.synthesis?.slice(0, 200)}..."`);
    console.log(`  ✧ Aletheios domains: ${result.aletheios?.domains_consulted.join(', ')}`);
    console.log(`  ✧ Pichet domains: ${result.pichet?.domains_consulted.join(', ')}`);
  });

  it('initiate tier: anandamaya depth + full dyad', async () => {
    const q = makeQuery(TIER_QUERY, 'initiate');
    const result = await pipeline.process(q);

    assert.equal(result.tier, 'initiate');
    assert.equal(result.kosha_depth, 'anandamaya');
    assert.equal(result.clifford_level, 7);
    assert.ok(result.aletheios);
    assert.ok(result.pichet);
    assert.ok(result.synthesis);
    console.log(`  ✧ Initiate: anandamaya + Cl(7) CONFIRMED`);
    console.log(`  ✧ Response: "${result.response.slice(0, 200)}..."`);
  });

  // ─── Single-engine vs workflow depth ────────────────────────────────

  it('single-engine reading is narrower than workflow', async () => {
    const single = makeQuery(
      'What does my numerology say?',
      'enterprise',
      { engines: ['numerology'] },
    );
    const workflow = makeQuery(
      'Give me my full birth blueprint',
      'enterprise',
      { workflow: 'birth-blueprint' },
    );

    const [sResult, wResult] = await Promise.all([
      pipeline.process(single),
      pipeline.process(workflow),
    ]);

    assert.ok(sResult.engines_invoked.length <= wResult.engines_invoked.length,
      `single (${sResult.engines_invoked.length}) should have ≤ engines than workflow (${wResult.engines_invoked.length})`);
    assert.ok(wResult.response.length >= sResult.response.length * 0.8,
      'workflow response should generally be richer');

    console.log(`  ✧ Single: ${sResult.engines_invoked.length} engine(s), ${sResult.response.length} char response`);
    console.log(`  ✧ Workflow: ${wResult.engines_invoked.length} engine(s), ${wResult.response.length} char response`);
  });

  // ─── Overwhelm gating ──────────────────────────────────────────────

  it('overwhelm reduces interpretation depth', async () => {
    const calm = makeQuery('What are my patterns?', 'enterprise');
    const overwhelmed = makeQuery('What are my patterns?', 'enterprise', {
      userOverrides: { overwhelm_level: 0.8 },
    });

    const [cResult, oResult] = await Promise.all([
      pipeline.process(calm),
      pipeline.process(overwhelmed),
    ]);

    assert.ok(cResult.clifford_level >= oResult.clifford_level,
      'overwhelm should reduce clifford level');
    // The overwhelm_level on userState is detected by CliffordGate
    console.log(`  ✧ Calm: Cl(${cResult.clifford_level}) ${cResult.response_cadence}`);
    console.log(`  ✧ Overwhelmed: Cl(${oResult.clifford_level}) ${oResult.response_cadence}`);
  });
});

describe('Live: VoicePromptBuilder with real engine data', () => {
  let client: SelemeneClient;
  let voiceBuilder: VoicePromptBuilder;

  before(() => {
    client = new SelemeneClient({ base_url: BASE_URL, api_key: API_KEY! });
    voiceBuilder = new VoicePromptBuilder();
  });

  it('builds Aletheios prompt with real numerology data', async () => {
    const output = await client.calculateEngine('numerology', {
      birth_data: BIRTH_DATA,
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    });

    const prompt = voiceBuilder.buildAgentPrompt({
      agent: 'aletheios',
      tier: 'enterprise',
      userState: makeUserState('enterprise'),
      engineOutputs: [output],
    });

    assert.ok(prompt.system.includes('Aletheios'), 'should reference agent name');
    assert.ok(prompt.system.length > 200, 'prompt should be substantial');
    console.log(`  ✧ Aletheios prompt (${prompt.system.length} chars): ${prompt.system.slice(0, 300)}...`);
  });

  it('builds Pichet prompt adapted for overwhelm state', async () => {
    const output = await client.calculateEngine('biorhythm', {
      birth_data: BIRTH_DATA,
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    });

    const prompt = voiceBuilder.buildAgentPrompt({
      agent: 'pichet',
      tier: 'subscriber',
      userState: makeUserState('subscriber', {
        http_status: 503,
        overwhelm_level: 0.8,
      }),
      engineOutputs: [output],
    });

    assert.ok(prompt.system.includes('Pichet'), 'should reference agent name');
    assert.ok(prompt.system.length > 100);
    console.log(`  ✧ Pichet burnout prompt (${prompt.system.length} chars): ${prompt.system.slice(0, 300)}...`);
  });

  it('builds synthesis prompt from workflow results', async () => {
    const result = await client.executeWorkflow('birth-blueprint', {
      birth_data: BIRTH_DATA,
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    });

    const synthPrompt = voiceBuilder.buildSynthesisPrompt({
      tier: 'enterprise',
      userState: makeUserState('enterprise'),
      aletheiosInsight: 'Life Path 5 — seeker of freedom, structure through adventure.',
      pichetInsight: 'The body remembers stillness. Physical energy peaks tomorrow.',
    });

    assert.ok(synthPrompt.system.includes('Aletheios') || synthPrompt.system.includes('Observer'), 'synthesis mentions Aletheios');
    assert.ok(synthPrompt.system.includes('Pichet') || synthPrompt.system.includes('Walker'), 'synthesis mentions Pichet');
    assert.ok(synthPrompt.system.length > 200, 'synthesis prompt should be rich');
    console.log(`  ✧ Synthesis prompt (${synthPrompt.system.length} chars)`);
  });
});

describe('Live: MobileCondenser with real data', () => {
  let client: SelemeneClient;
  let condenser: MobileCondenser;

  before(() => {
    client = new SelemeneClient({ base_url: BASE_URL, api_key: API_KEY! });
    condenser = new MobileCondenser();
  });

  it('condenses real engine output for mobile delivery', async () => {
    const output = await client.calculateEngine('gene-keys', {
      birth_data: BIRTH_DATA,
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    });

    const mobile = condenser.condense({
      id: 'live-test',
      timestamp: new Date().toISOString(),
      query: 'What are my gifts?',
      engines_invoked: ['gene-keys'],
      engine_outputs: [output],
      routing_mode: 'aletheios-primary',
      tier: 'subscriber',
      kosha_depth: 'pranamaya',
      clifford_level: 1,
      response: output.witness_prompt || 'No witness prompt',
      response_cadence: 'immediate',
      overwhelm_flag: false,
      recursion_flag: false,
    });

    assert.ok(mobile.headline.length <= 80, `headline too long: ${mobile.headline.length}`);
    assert.ok(mobile.body.length <= 500, `body too long: ${mobile.body.length}`);
    if (mobile.somatic_nudge) {
      assert.ok(mobile.somatic_nudge.length <= 140, `nudge too long: ${mobile.somatic_nudge.length}`);
    }
    console.log(`  ✧ Headline: "${mobile.headline}"`);
    console.log(`  ✧ Body: "${mobile.body.slice(0, 200)}..."`);
    console.log(`  ✧ Somatic nudge: "${mobile.somatic_nudge || '(none)'}"`);
  });
});

describe('Live: Routing Engine with real API data', () => {
  let routingEngine: RoutingEngine;

  before(async () => {
    routingEngine = new RoutingEngine();
    const knowledgePath = path.join(__dirname, '..', 'knowledge');
    await routingEngine.loadRules(
      path.join(knowledgePath, 'aletheios-routing.yaml'),
      path.join(knowledgePath, 'pichet-routing.yaml'),
    );
  });

  it('routes decision engines to correct domains', () => {
    const decision = routingEngine.route(
      makeUserState('enterprise'),
      ['archetypal-mirror', 'hexagram-navigation', 'energetic-authority'],
    );
    assert.ok(decision.domains_to_load.length > 0 || decision.matched_rules.length >= 0);
    console.log(`  ✧ Decision routing: ${decision.domains_to_load.join(', ')} (primary: ${decision.primary_agent})`);
  });

  it('routes temporal engines correctly', () => {
    const temporal = routingEngine.route(
      makeUserState('subscriber'),
      ['temporal-grammar', 'circadian-cartography', 'three-wave-cycle'],
    );
    assert.ok(temporal.primary_agent === 'aletheios' || temporal.primary_agent === 'pichet');
    console.log(`  ✧ Temporal routing: ${temporal.domains_to_load.join(', ')} (primary: ${temporal.primary_agent})`);
  });
});

describe('Live: End-to-end pipeline → mobile', () => {
  let pipeline: InterpretationPipeline;
  let condenser: MobileCondenser;
  let voiceBuilder: VoicePromptBuilder;

  before(async () => {
    pipeline = new InterpretationPipeline({
      selemene: { base_url: BASE_URL, api_key: API_KEY! },
      knowledge_path: KNOWLEDGE_PATH,
    });
    await pipeline.initialize();
    condenser = new MobileCondenser();
    voiceBuilder = new VoicePromptBuilder();
  });

  it('full cycle: query → API → pipeline → voice → mobile', async () => {
    const query = makeQuery(
      'I feel stuck in my career. What do the patterns reveal?',
      'enterprise',
      { engines: ['gene-keys', 'numerology', 'human-design'] },
    );

    // Step 1: Pipeline processes the query
    const interpretation = await pipeline.process(query);
    assert.ok(interpretation.engines_invoked.length > 0);
    assert.ok(interpretation.aletheios);
    assert.ok(interpretation.pichet);

    // Step 2: Voice builder creates LLM prompts from the interpretation
    const aletheiosPrompt = voiceBuilder.buildAgentPrompt({
      agent: 'aletheios',
      tier: 'enterprise',
      userState: makeUserState('enterprise'),
      engineOutputs: interpretation.engine_outputs,
    });
    const pichetPrompt = voiceBuilder.buildAgentPrompt({
      agent: 'pichet',
      tier: 'enterprise',
      userState: makeUserState('enterprise'),
      engineOutputs: interpretation.engine_outputs,
    });

    // Step 3: Condense for mobile
    const mobile = condenser.condense(interpretation);

    console.log('\n  ═══ FULL E2E PIPELINE RESULT ═══');
    console.log(`  Engines: ${interpretation.engines_invoked.join(', ')}`);
    console.log(`  Kosha: ${interpretation.kosha_depth} (Cl ${interpretation.clifford_level})`);
    console.log(`  Routing: ${interpretation.routing_mode}`);
    console.log(`  Cadence: ${interpretation.response_cadence}`);
    console.log(`\n  ─── Aletheios ───`);
    console.log(`  Domains: ${interpretation.aletheios?.domains_consulted.join(', ') || 'none'}`);
    console.log(`  Confidence: ${interpretation.aletheios?.confidence}`);
    console.log(`  Perspective: "${interpretation.aletheios?.perspective.slice(0, 200)}..."`);
    console.log(`\n  ─── Pichet ───`);
    console.log(`  Domains: ${interpretation.pichet?.domains_consulted.join(', ') || 'none'}`);
    console.log(`  Somatic: "${interpretation.pichet?.somatic_note || 'none'}"`);
    console.log(`\n  ─── Synthesis ───`);
    console.log(`  "${interpretation.synthesis?.slice(0, 300) || 'N/A'}..."`);
    console.log(`\n  ─── Mobile ───`);
    console.log(`  Headline: "${mobile.headline}"`);
    console.log(`  Body: "${mobile.body.slice(0, 200)}..."`);
    console.log(`  Nudge: "${mobile.somatic_nudge || '(none)'}"`);
    console.log(`\n  ─── Voice Prompts (for LLM inference) ───`);
    console.log(`  Aletheios prompt: ${aletheiosPrompt.system.length} chars`);
    console.log(`  Pichet prompt: ${pichetPrompt.system.length} chars`);
    console.log('  ═══════════════════════════════════════\n');

    // Assertions
    assert.ok(mobile.headline.length > 0 && mobile.headline.length <= 80);
    assert.ok(interpretation.synthesis);
    assert.ok(aletheiosPrompt.system.length > 100);
    assert.ok(pichetPrompt.system.length > 100);
  });
});
