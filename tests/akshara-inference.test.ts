// ─── Witness Agents — AKSHARA Inference Enrichment Tests ────────────────
// TDD: Tests written FIRST. AksharaEnrichment wires the mirror into inference.
// Issue #22: AKSHARA Mirror → Dyad Engine integration.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AksharaEnrichment } from '../src/inference/akshara-enrichment.js';
import { AksharaMirror } from '../src/protocols/akshara-mirror.js';
import { DyadInferenceEngine } from '../src/inference/dyad-engine.js';
import { DEFAULT_MODEL_ROUTING } from '../src/inference/model-routing.js';
import type { InferenceMessage, InferenceRequest, InferenceResponse } from '../src/inference/types.js';
import type { Tier, WitnessInterpretation, UserState } from '../src/types/interpretation.js';

// ═══════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════

function makeInterpretation(tier: Tier, query = 'What patterns do you see in my awareness and consciousness?'): WitnessInterpretation {
  return {
    id: 'test-akshara-001',
    timestamp: new Date().toISOString(),
    query,
    engines_invoked: ['numerology', 'gene-keys'],
    engine_outputs: [],
    routing_mode: 'dyad-synthesis',
    tier,
    kosha_depth: tier === 'initiate' ? 'anandamaya' : 'manomaya',
    clifford_level: tier === 'initiate' ? 7 : 2,
    response: '',
    response_cadence: 'measured',
    overwhelm_flag: false,
    recursion_flag: false,
    aletheios: {
      agent: 'aletheios',
      perspective: 'Life Path 5: freedom pattern.',
      domains_consulted: ['lorenz-kundli'],
      confidence: 0.8,
    },
    pichet: {
      agent: 'pichet',
      perspective: 'Physical wave rising.',
      domains_consulted: ['endocrine-muse'],
      confidence: 0.7,
    },
    synthesis: 'Pattern and body aligned.',
  };
}

function makeBaseMessages(): InferenceMessage[] {
  return [
    { role: 'system', content: 'You are Aletheios, the pattern witness.' },
    { role: 'user', content: 'What do you see in the data?' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════
// UNIT: AksharaEnrichment — Tier Gating
// ═══════════════════════════════════════════════════════════════════════

describe('AksharaEnrichment — Tier Gating', () => {
  const mirror = new AksharaMirror();
  const enrichment = new AksharaEnrichment(mirror);

  it('enriches messages at initiate tier', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('initiate');
    const enriched = enrichment.enrichMessages(messages, interp, 'initiate');

    // Should inject a new system message (3 messages total: system, akshara-system, user)
    assert.ok(enriched.length > messages.length,
      `expected more messages after enrichment, got ${enriched.length}`);
  });

  it('returns messages unchanged for subscriber tier', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('subscriber');
    const result = enrichment.enrichMessages(messages, interp, 'subscriber');

    assert.equal(result.length, messages.length, 'subscriber should not get enrichment');
    assert.deepEqual(result, messages);
  });

  it('returns messages unchanged for enterprise tier', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('enterprise');
    const result = enrichment.enrichMessages(messages, interp, 'enterprise');

    assert.equal(result.length, messages.length, 'enterprise should not get enrichment');
    assert.deepEqual(result, messages);
  });

  it('returns messages unchanged for free tier', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('free');
    const result = enrichment.enrichMessages(messages, interp, 'free');

    assert.equal(result.length, messages.length, 'free should not get enrichment');
    assert.deepEqual(result, messages);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// UNIT: AksharaEnrichment — Message Content
// ═══════════════════════════════════════════════════════════════════════

describe('AksharaEnrichment — Message Content', () => {
  const mirror = new AksharaMirror();
  const enrichment = new AksharaEnrichment(mirror);

  it('injected message contains Devanagari script', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('initiate');
    const enriched = enrichment.enrichMessages(messages, interp, 'initiate');

    // Find the injected AKSHARA message
    const aksharaMsg = enriched.find(m =>
      m.role === 'system' && m.content.includes('AKSHARA'));
    assert.ok(aksharaMsg, 'should have an AKSHARA system message');

    // Must contain Devanagari characters (Unicode range U+0900-U+097F)
    const devanagariPattern = /[\u0900-\u097F]/;
    assert.ok(devanagariPattern.test(aksharaMsg!.content),
      'AKSHARA message must contain Devanagari script');
  });

  it('injected message contains transliterations', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('initiate');
    const enriched = enrichment.enrichMessages(messages, interp, 'initiate');

    const aksharaMsg = enriched.find(m =>
      m.role === 'system' && m.content.includes('AKSHARA'));
    assert.ok(aksharaMsg, 'should have an AKSHARA system message');

    // The query mentions "awareness" and "consciousness" which should map to
    // morphemes like "chit", "sakshi", "turiya"
    const content = aksharaMsg!.content;
    const hasTransliteration = content.includes('chit')
      || content.includes('sakshi')
      || content.includes('turiya')
      || content.includes('sat');
    assert.ok(hasTransliteration, 'should contain at least one transliteration');
  });

  it('injected message contains morpheme breakdown', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('initiate', 'I want to find peace and clarity in my body');
    const enriched = enrichment.enrichMessages(messages, interp, 'initiate');

    const aksharaMsg = enriched.find(m =>
      m.role === 'system' && m.content.includes('AKSHARA'));
    assert.ok(aksharaMsg, 'should have an AKSHARA system message');

    // Should contain meaning explanations
    const content = aksharaMsg!.content;
    assert.ok(content.includes('meaning') || content.includes('→'),
      'should contain morpheme meaning breakdown');
  });

  it('injected message contains Kha-Ba-La structure', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('initiate', 'I observe my body through resistance and space');
    const enriched = enrichment.enrichMessages(messages, interp, 'initiate');

    const aksharaMsg = enriched.find(m =>
      m.role === 'system' && m.content.includes('AKSHARA'));
    assert.ok(aksharaMsg, 'should have an AKSHARA system message');

    // Should reference the Kha-Ba-La triad structure
    const content = aksharaMsg!.content;
    assert.ok(
      content.includes('Kha') || content.includes('field')
        || content.includes('Ba') || content.includes('form')
        || content.includes('La') || content.includes('friction'),
      'should reference Kha-Ba-La structure categories',
    );
  });

  it('injected message contains LLM grounding instruction', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('initiate');
    const enriched = enrichment.enrichMessages(messages, interp, 'initiate');

    const aksharaMsg = enriched.find(m =>
      m.role === 'system' && m.content.includes('AKSHARA'));
    assert.ok(aksharaMsg, 'should have an AKSHARA system message');

    // Must instruct the LLM on how to use morphemes
    assert.ok(aksharaMsg!.content.includes('seed-form') || aksharaMsg!.content.includes('morpheme'),
      'should instruct LLM to ground in Sanskrit seed-forms');
    assert.ok(aksharaMsg!.content.includes('transliteration'),
      'should instruct LLM to use transliterations naturally');
  });

  it('preserves original system and user message order', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('initiate');
    const enriched = enrichment.enrichMessages(messages, interp, 'initiate');

    // First message should be the original system
    assert.equal(enriched[0].role, 'system');
    assert.equal(enriched[0].content, messages[0].content);

    // Last message should be the original user message
    assert.equal(enriched[enriched.length - 1].role, 'user');
    assert.equal(enriched[enriched.length - 1].content, messages[1].content);

    // AKSHARA message should be between system and user
    const aksharaIdx = enriched.findIndex(m =>
      m.role === 'system' && m.content.includes('AKSHARA'));
    assert.ok(aksharaIdx > 0, 'AKSHARA should be after first system message');
    assert.ok(aksharaIdx < enriched.length - 1, 'AKSHARA should be before user message');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// UNIT: AksharaEnrichment — Edge Cases
// ═══════════════════════════════════════════════════════════════════════

describe('AksharaEnrichment — Edge Cases', () => {
  const mirror = new AksharaMirror();
  const enrichment = new AksharaEnrichment(mirror);

  it('handles query with no recognized concepts gracefully', () => {
    const messages = makeBaseMessages();
    const interp = makeInterpretation('initiate', 'hello world test query');
    const enriched = enrichment.enrichMessages(messages, interp, 'initiate');

    // Should still inject (using universal morphemes: sat-chit-ananda)
    assert.ok(enriched.length > messages.length,
      'should still enrich even with no concept matches');

    const aksharaMsg = enriched.find(m =>
      m.role === 'system' && m.content.includes('AKSHARA'));
    assert.ok(aksharaMsg, 'should have AKSHARA message with universal morphemes');
  });

  it('works with empty messages array at non-initiate tier', () => {
    const result = enrichment.enrichMessages([], makeInterpretation('subscriber'), 'subscriber');
    assert.deepEqual(result, []);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// INTEGRATION: DyadInferenceEngine + AksharaEnrichment
// ═══════════════════════════════════════════════════════════════════════

describe('DyadInferenceEngine + AksharaEnrichment', () => {
  // Track what messages were sent to the mock provider
  let capturedMessages: InferenceMessage[] = [];

  function makeMockProvider(): any {
    return {
      resolveModel: (tier: Tier, role: string) =>
        DEFAULT_MODEL_ROUTING[tier][role as keyof typeof DEFAULT_MODEL_ROUTING['free']],
      completeWithRetry: async (req: InferenceRequest): Promise<InferenceResponse> => {
        capturedMessages = req.messages;
        return {
          content: `[${req.model_role}] Mock interpretation`,
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

  const mockState: UserState = {
    tier: 'initiate',
    http_status: 200,
    overwhelm_level: 0.1,
    active_kosha: 'anandamaya',
    dominant_center: 'head',
    recursion_detected: false,
    anti_dependency_score: 0.2,
    session_query_count: 1,
  };

  it('constructs engine with aksharaEnrichment in config', () => {
    const mirror = new AksharaMirror();
    const enrichmentInstance = new AksharaEnrichment(mirror);
    const engine = new DyadInferenceEngine(makeMockProvider(), {
      aksharaEnrichment: enrichmentInstance,
    });
    assert.ok(engine, 'engine should construct with aksharaEnrichment config');
  });

  it('constructs engine without aksharaEnrichment (backwards compatible)', () => {
    const engine = new DyadInferenceEngine(makeMockProvider());
    assert.ok(engine, 'engine should construct without aksharaEnrichment');
  });

  it('injects AKSHARA messages into agent calls at initiate tier', async () => {
    capturedMessages = [];
    const mirror = new AksharaMirror();
    const enrichmentInstance = new AksharaEnrichment(mirror);
    const engine = new DyadInferenceEngine(makeMockProvider(), {
      aksharaEnrichment: enrichmentInstance,
    });

    const interp = makeInterpretation('initiate', 'Help me observe consciousness and awareness');
    await engine.inferSingle('aletheios', 'initiate', mockState, interp, []);

    // The captured messages should include an AKSHARA system message
    const hasAkshara = capturedMessages.some(m =>
      m.role === 'system' && m.content.includes('AKSHARA'));
    assert.ok(hasAkshara, 'callAgent should inject AKSHARA message at initiate tier');
  });

  it('does NOT inject AKSHARA for subscriber tier calls', async () => {
    capturedMessages = [];
    const mirror = new AksharaMirror();
    const enrichmentInstance = new AksharaEnrichment(mirror);
    const engine = new DyadInferenceEngine(makeMockProvider(), {
      aksharaEnrichment: enrichmentInstance,
    });

    const subState = { ...mockState, tier: 'subscriber' as Tier };
    const interp = makeInterpretation('subscriber');
    await engine.inferSingle('aletheios', 'subscriber', subState, interp, []);

    const hasAkshara = capturedMessages.some(m =>
      m.role === 'system' && m.content.includes('AKSHARA'));
    assert.ok(!hasAkshara, 'should NOT inject AKSHARA for subscriber tier');
  });
});
