// ─── Witness Agents — Inference Tests ──────────────────────────────────
// Unit tests for model routing, provider config, and dyad engine.
// Live tests (gated by OPENROUTER_API_KEY) call real OpenRouter API.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { OpenRouterProvider } from '../src/inference/openrouter.js';
import { DyadInferenceEngine } from '../src/inference/dyad-engine.js';
import { DEFAULT_MODEL_ROUTING, estimateCost, MODEL_COSTS } from '../src/inference/model-routing.js';
import type {
  ModelRoutingTable,
  InferenceRequest,
  InferenceResponse,
  ModelPreference,
  DyadInferenceResult,
} from '../src/inference/types.js';
import type { Tier, UserState, WitnessInterpretation } from '../src/types/interpretation.js';
import type { SelemeneEngineOutput } from '../src/types/engine.js';

// ═══════════════════════════════════════════════════════════════════════
// UNIT: Model Routing
// ═══════════════════════════════════════════════════════════════════════

describe('Model Routing Table', () => {
  it('has entries for all 4 tiers', () => {
    const tiers: Tier[] = ['free', 'subscriber', 'enterprise', 'initiate'];
    for (const tier of tiers) {
      assert.ok(DEFAULT_MODEL_ROUTING[tier], `missing routing for ${tier}`);
    }
  });

  it('has entries for all 5 roles per tier', () => {
    const roles = ['aletheios', 'pichet', 'synthesis', 'fast', 'deep'] as const;
    for (const [tier, routeMap] of Object.entries(DEFAULT_MODEL_ROUTING)) {
      for (const role of roles) {
        const pref = routeMap[role];
        assert.ok(pref, `missing ${tier}.${role}`);
        assert.ok(pref.model_id, `missing model_id for ${tier}.${role}`);
        assert.ok(pref.max_tokens > 0, `bad max_tokens for ${tier}.${role}`);
        assert.ok(pref.temperature >= 0 && pref.temperature <= 1, `bad temperature for ${tier}.${role}`);
      }
    }
  });

  it('free tier uses cheaper models than enterprise', () => {
    const freeModel = DEFAULT_MODEL_ROUTING.free.aletheios.model_id;
    const enterpriseModel = DEFAULT_MODEL_ROUTING.enterprise.aletheios.model_id;
    assert.notEqual(freeModel, enterpriseModel, 'free and enterprise should use different models');
  });

  it('initiate tier gets higher max_tokens than subscriber', () => {
    assert.ok(
      DEFAULT_MODEL_ROUTING.initiate.synthesis.max_tokens > DEFAULT_MODEL_ROUTING.subscriber.synthesis.max_tokens,
      'initiate should have more tokens',
    );
  });

  it('enterprise deep role has larger context than fast', () => {
    assert.ok(
      DEFAULT_MODEL_ROUTING.enterprise.deep.max_tokens > DEFAULT_MODEL_ROUTING.enterprise.fast.max_tokens,
    );
  });
});

describe('Cost Estimation', () => {
  it('estimates cost for known models', () => {
    const cost = estimateCost('anthropic/claude-sonnet-4', 1000, 500);
    assert.ok(cost > 0, 'cost should be positive');
    // 1000 * 3.00/1M + 500 * 15.0/1M = 0.003 + 0.0075 = 0.0105
    assert.ok(Math.abs(cost - 0.0105) < 0.001, `expected ~0.0105, got ${cost}`);
  });

  it('returns 0 for unknown models', () => {
    assert.equal(estimateCost('unknown/model', 1000, 500), 0);
  });

  it('has cost data for all default routing models', () => {
    const allModels = new Set<string>();
    for (const roles of Object.values(DEFAULT_MODEL_ROUTING)) {
      for (const pref of Object.values(roles)) {
        allModels.add((pref as ModelPreference).model_id);
      }
    }
    for (const model of allModels) {
      assert.ok(MODEL_COSTS[model], `missing cost data for ${model}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// UNIT: OpenRouter Provider
// ═══════════════════════════════════════════════════════════════════════

describe('OpenRouterProvider', () => {
  const provider = new OpenRouterProvider({ api_key: 'test-key' });

  it('resolves model for each tier/role', () => {
    const tiers: Tier[] = ['free', 'subscriber', 'enterprise', 'initiate'];
    const roles = ['aletheios', 'pichet', 'synthesis', 'fast', 'deep'] as const;
    for (const tier of tiers) {
      for (const role of roles) {
        const pref = provider.resolveModel(tier, role);
        assert.ok(pref.model_id, `no model for ${tier}.${role}`);
      }
    }
  });

  it('accepts custom routing overrides', () => {
    const custom = new OpenRouterProvider({
      api_key: 'test',
      routing_table: {
        free: {
          aletheios: { model_id: 'custom/model', max_tokens: 100, temperature: 0.1 },
          pichet: DEFAULT_MODEL_ROUTING.free.pichet,
          synthesis: DEFAULT_MODEL_ROUTING.free.synthesis,
          fast: DEFAULT_MODEL_ROUTING.free.fast,
          deep: DEFAULT_MODEL_ROUTING.free.deep,
        },
      },
    });
    const pref = custom.resolveModel('free', 'aletheios');
    assert.equal(pref.model_id, 'custom/model');
    assert.equal(pref.max_tokens, 100);
  });

  it('allows runtime model preference updates', () => {
    const p = new OpenRouterProvider({ api_key: 'test' });
    p.setModelPreference('subscriber', 'aletheios', {
      model_id: 'runtime/override',
      max_tokens: 999,
      temperature: 0.9,
    });
    const pref = p.resolveModel('subscriber', 'aletheios');
    assert.equal(pref.model_id, 'runtime/override');
  });

  it('returns full routing table for inspection', () => {
    const routing = provider.getRouting();
    assert.ok(routing.free);
    assert.ok(routing.initiate);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// UNIT: DyadInferenceEngine (with mock)
// ═══════════════════════════════════════════════════════════════════════

describe('DyadInferenceEngine (mock)', () => {
  // Mock provider that returns canned responses
  function makeMockProvider(): any {
    return {
      resolveModel: (tier: Tier, role: string) => DEFAULT_MODEL_ROUTING[tier][role as keyof typeof DEFAULT_MODEL_ROUTING['free']],
      completeWithRetry: async (req: InferenceRequest): Promise<InferenceResponse> => {
        const role = req.model_role;
        return {
          content: `[${role}] Mock interpretation for tier ${req.tier}`,
          model_used: 'mock/model',
          provider: 'openrouter' as const,
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          latency_ms: 42,
          finish_reason: 'stop',
          cost_estimate_usd: 0.001,
        };
      },
      id: 'openrouter',
    };
  }

  const mockInterp = (tier: Tier, hasAletheios = true, hasPichet = true): WitnessInterpretation => ({
    id: 'test-001',
    timestamp: new Date().toISOString(),
    query: 'What patterns do you see in my chart?',
    engines_invoked: ['numerology', 'gene-keys'],
    engine_outputs: [],
    routing_mode: 'dyad-synthesis',
    tier,
    kosha_depth: tier === 'initiate' ? 'anandamaya' : 'manomaya',
    clifford_level: tier === 'initiate' ? 7 : 2,
    response: 'test response',
    response_cadence: 'measured',
    overwhelm_flag: false,
    recursion_flag: false,
    aletheios: hasAletheios ? {
      agent: 'aletheios',
      perspective: 'Life Path 5: freedom pattern.',
      domains_consulted: ['lorenz-kundli'],
      confidence: 0.8,
    } : undefined,
    pichet: hasPichet ? {
      agent: 'pichet',
      perspective: 'Physical wave rising.',
      domains_consulted: ['endocrine-muse'],
      confidence: 0.7,
    } : undefined,
    synthesis: 'Pattern and body aligned.',
  });

  const mockState: UserState = {
    tier: 'enterprise',
    http_status: 200,
    overwhelm_level: 0.2,
    active_kosha: 'vijnanamaya',
    dominant_center: 'head',
    recursion_detected: false,
    anti_dependency_score: 0.3,
    session_query_count: 1,
  };

  const mockOutputs: SelemeneEngineOutput[] = [{
    engine_id: 'numerology',
    result: { life_path: { value: 5, meaning: 'freedom' } },
    witness_prompt: 'Your Life Path 5...',
    consciousness_level: 2,
    metadata: { calculation_time_ms: 10, backend: 'ts', precision_achieved: 'Standard', cached: false, timestamp: '', engine_version: '1.0' },
    envelope_version: '1',
  }];

  it('runs full dyad inference for enterprise tier', async () => {
    const engine = new DyadInferenceEngine(makeMockProvider());
    const result = await engine.infer(mockInterp('enterprise'), mockState, mockOutputs);

    assert.ok(result.aletheios, 'should have aletheios response');
    assert.ok(result.pichet, 'should have pichet response');
    assert.ok(result.synthesis, 'should have synthesis response');
    assert.ok(result.aletheios.content.includes('aletheios'));
    assert.ok(result.pichet.content.includes('pichet'));
    assert.ok(result.synthesis.content.includes('synthesis'));
    assert.ok(result.total_cost_usd > 0);
    assert.ok(result.total_latency_ms >= 0);
  });

  it('skips synthesis for subscriber tier', async () => {
    const engine = new DyadInferenceEngine(makeMockProvider());
    const subState = { ...mockState, tier: 'subscriber' as Tier };
    const result = await engine.infer(mockInterp('subscriber'), subState, mockOutputs);

    assert.ok(result.aletheios || result.pichet, 'should have at least one agent');
    assert.equal(result.synthesis, undefined, 'subscriber should not get synthesis');
  });

  it('skips all agents for free tier', async () => {
    const engine = new DyadInferenceEngine(makeMockProvider());
    const freeState = { ...mockState, tier: 'free' as Tier };
    const result = await engine.infer(mockInterp('free', false, false), freeState, mockOutputs);

    assert.equal(result.aletheios, undefined);
    assert.equal(result.pichet, undefined);
    assert.equal(result.synthesis, undefined);
    assert.equal(result.total_cost_usd, 0);
  });

  it('runs single-agent inference', async () => {
    const engine = new DyadInferenceEngine(makeMockProvider());
    const result = await engine.inferSingle(
      'aletheios', 'subscriber', mockState,
      mockInterp('subscriber'), mockOutputs,
    );

    assert.ok(result.content.includes('aletheios'));
    assert.equal(result.provider, 'openrouter');
  });

  it('calculates total cost across all calls', async () => {
    const engine = new DyadInferenceEngine(makeMockProvider());
    const result = await engine.infer(mockInterp('enterprise'), mockState, mockOutputs);

    // 3 calls × 0.001 each
    assert.ok(Math.abs(result.total_cost_usd - 0.003) < 0.0001,
      `expected ~0.003, got ${result.total_cost_usd}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// LIVE: OpenRouter API (gated by OPENROUTER_API_KEY)
// ═══════════════════════════════════════════════════════════════════════

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SELEMENE_KEY = process.env.SELEMENE_API_KEY;

describe('Live: OpenRouter Inference', { skip: !OPENROUTER_KEY }, () => {

  it('completes a simple chat request', async () => {
    const provider = new OpenRouterProvider({ api_key: OPENROUTER_KEY! });
    const result = await provider.complete({
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Reply in one sentence.' },
        { role: 'user', content: 'What is 2+2?' },
      ],
      model_role: 'fast',
      tier: 'free',
    });

    assert.ok(result.content.length > 0, 'should have content');
    assert.ok(result.content.includes('4'), `expected "4" in: ${result.content}`);
    assert.ok(result.usage.total_tokens > 0, 'should track tokens');
    assert.ok(result.latency_ms > 0, 'should track latency');
    console.log(`  ✧ Model: ${result.model_used}, Tokens: ${result.usage.total_tokens}, Latency: ${result.latency_ms}ms, Cost: $${result.cost_estimate_usd?.toFixed(6)}`);
  });

  it('respects tier-based model selection', async () => {
    const provider = new OpenRouterProvider({ api_key: OPENROUTER_KEY! });

    const freeResult = await provider.complete({
      messages: [{ role: 'user', content: 'Say "hello"' }],
      model_role: 'fast',
      tier: 'free',
    });

    const enterpriseResult = await provider.complete({
      messages: [{ role: 'user', content: 'Say "hello"' }],
      model_role: 'deep',
      tier: 'enterprise',
    });

    console.log(`  ✧ Free model: ${freeResult.model_used}`);
    console.log(`  ✧ Enterprise model: ${enterpriseResult.model_used}`);
    // Different tiers should route to different models
    assert.ok(freeResult.content.length > 0);
    assert.ok(enterpriseResult.content.length > 0);
  });

  it('handles Aletheios voice prompt with engine data', async () => {
    const provider = new OpenRouterProvider({ api_key: OPENROUTER_KEY! });
    const engine = new DyadInferenceEngine(provider);

    // Create a minimal interpretation as if from pipeline
    const interp: WitnessInterpretation = {
      id: 'live-test-001',
      timestamp: new Date().toISOString(),
      query: 'What does my numerology reveal about my life path?',
      engines_invoked: ['numerology'],
      engine_outputs: [],
      routing_mode: 'aletheios-primary',
      tier: 'subscriber',
      kosha_depth: 'manomaya',
      clifford_level: 2,
      response: '',
      response_cadence: 'measured',
      overwhelm_flag: false,
      recursion_flag: false,
      aletheios: {
        agent: 'aletheios',
        perspective: 'Life Path 5: Freedom, change, adventure. Expression 8: Material mastery. Soul Urge 1: Independence drive.',
        domains_consulted: ['lorenz-kundli', 'consciousness-states'],
        confidence: 0.8,
      },
    };

    const engineOutputs: SelemeneEngineOutput[] = [{
      engine_id: 'numerology',
      result: {
        life_path: { value: 5, meaning: 'Freedom, change, adventure', is_master: false },
        expression: { value: 8, meaning: 'Material mastery and power', is_master: false },
        soul_urge: { value: 1, meaning: 'Independence and leadership', is_master: false },
      },
      witness_prompt: 'Your Life Path 5 speaks of the seeker of freedom.',
      consciousness_level: 2,
      metadata: { calculation_time_ms: 10, backend: 'ts', precision_achieved: 'Standard', cached: false, timestamp: '', engine_version: '1.0' },
      envelope_version: '1',
    }];

    const result = await engine.inferSingle(
      'aletheios', 'subscriber',
      {
        tier: 'subscriber', http_status: 200, overwhelm_level: 0.1,
        active_kosha: 'manomaya', dominant_center: 'head',
        recursion_detected: false, anti_dependency_score: 0.2, session_query_count: 1,
      },
      interp, engineOutputs,
    );

    console.log(`  ✧ Aletheios speaks (${result.usage.total_tokens} tokens, ${result.latency_ms}ms):`);
    console.log(`    "${result.content.slice(0, 300)}..."`);
    assert.ok(result.content.length > 50, 'should be a substantial interpretation');
    assert.equal(result.finish_reason, 'stop');
  });
});

describe('Live: Full Dyad Pipeline', { skip: !OPENROUTER_KEY || !SELEMENE_KEY }, () => {
  it('Selemene → pipeline → OpenRouter: end-to-end dyad inference', async () => {
    // This test requires BOTH API keys
    const { InterpretationPipeline } = await import('../src/pipeline/interpreter.js');

    const pipeline = new InterpretationPipeline({
      selemene: {
        base_url: 'https://selemene-engine-production.up.railway.app',
        api_key: SELEMENE_KEY!,
        timeout_ms: 15000,
      },
      knowledge_path: './knowledge',
    });

    const provider = new OpenRouterProvider({ api_key: OPENROUTER_KEY! });
    const inferEngine = new DyadInferenceEngine(provider);

    // Step 1: Run pipeline (Selemene + extraction)
    const interpretation = await pipeline.process({
      query: 'What is my energetic state right now?',
      user_state: {
        tier: 'enterprise', http_status: 200, overwhelm_level: 0.1,
        active_kosha: 'vijnanamaya', dominant_center: 'heart',
        recursion_detected: false, anti_dependency_score: 0.2, session_query_count: 1,
      },
      birth_data: {
        name: 'Sheshnarayana Iyer', date: '1991-08-13', time: '13:19',
        latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata',
      },
      precision: 'Standard',
      workflow_hint: 'daily-practice',
      session_id: 'live-e2e-test',
      request_id: 'req-e2e-001',
    });

    console.log(`  ✧ Pipeline: ${interpretation.engines_invoked.length} engines, ${interpretation.response.length} chars`);

    // Step 2: Feed to DyadInferenceEngine
    const result = await inferEngine.infer(
      interpretation,
      interpretation.tier === 'enterprise' ? {
        tier: 'enterprise', http_status: 200, overwhelm_level: 0.1,
        active_kosha: 'vijnanamaya', dominant_center: 'heart',
        recursion_detected: false, anti_dependency_score: 0.2, session_query_count: 1,
      } : interpretation as any,
      interpretation.engine_outputs,
    );

    console.log(`\n  ═══ DYAD INFERENCE RESULT ═══`);
    if (result.aletheios) {
      console.log(`  ✧ Aletheios (${result.aletheios.model_used}, ${result.aletheios.usage.total_tokens} tokens):`);
      console.log(`    "${result.aletheios.content.slice(0, 250)}..."`);
    }
    if (result.pichet) {
      console.log(`  ✧ Pichet (${result.pichet.model_used}, ${result.pichet.usage.total_tokens} tokens):`);
      console.log(`    "${result.pichet.content.slice(0, 250)}..."`);
    }
    if (result.synthesis) {
      console.log(`  ✧ Synthesis (${result.synthesis.model_used}, ${result.synthesis.usage.total_tokens} tokens):`);
      console.log(`    "${result.synthesis.content.slice(0, 250)}..."`);
    }
    console.log(`  ✧ Total cost: $${result.total_cost_usd.toFixed(6)}, Latency: ${result.total_latency_ms}ms`);

    assert.ok(result.aletheios, 'enterprise should get aletheios');
    assert.ok(result.pichet, 'enterprise should get pichet');
    assert.ok(result.synthesis, 'enterprise should get synthesis');
    assert.ok(result.aletheios!.content.length > 100, 'aletheios should produce substantial interpretation');
    assert.ok(result.pichet!.content.length > 100, 'pichet should produce substantial interpretation');
    assert.ok(result.synthesis!.content.length > 100, 'synthesis should be substantial');
  });
});
