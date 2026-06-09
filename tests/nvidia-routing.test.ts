import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_NVIDIA_ROUTING, VERIFIED_NVIDIA_MODEL_IDS } from '../src/inference/nvidia-routing.js';
import {
  BILLING_TO_WITNESS_TIER,
  WITNESS_CAPABILITY_PROFILES,
} from '../src/config/witness-capabilities.js';

describe('NVIDIA Routing', () => {
  it('keeps billing-to-witness tier policy centralized', () => {
    assert.equal(BILLING_TO_WITNESS_TIER.free, 'free');
    assert.equal(BILLING_TO_WITNESS_TIER.basic, 'subscriber');
    assert.equal(BILLING_TO_WITNESS_TIER.premium, 'enterprise');
    assert.equal(BILLING_TO_WITNESS_TIER.enterprise, 'initiate');
  });

  it('uses only verified NVIDIA models in active routes', () => {
    const verified = new Set(VERIFIED_NVIDIA_MODEL_IDS);

    for (const [tier, roles] of Object.entries(DEFAULT_NVIDIA_ROUTING)) {
      for (const [role, pref] of Object.entries(roles)) {
        assert.ok(
          verified.has(pref.model_id as typeof VERIFIED_NVIDIA_MODEL_IDS[number]),
          `Unverified model in ${tier}.${role}: ${pref.model_id}`,
        );
      }
    }
  });

  it('routes paid-tier synthesis through gpt-oss-20b', () => {
    assert.equal(DEFAULT_NVIDIA_ROUTING.subscriber.synthesis.model_id, 'openai/gpt-oss-20b');
    assert.equal(DEFAULT_NVIDIA_ROUTING.enterprise.synthesis.model_id, 'openai/gpt-oss-20b');
    assert.equal(DEFAULT_NVIDIA_ROUTING.initiate.synthesis.model_id, 'openai/gpt-oss-20b');
  });

  it('keeps every active route inside the tier capability pool', () => {
    for (const [tier, roles] of Object.entries(DEFAULT_NVIDIA_ROUTING)) {
      const allowed = new Set(WITNESS_CAPABILITY_PROFILES[tier as keyof typeof WITNESS_CAPABILITY_PROFILES].verified_nvidia_model_pool);

      for (const [role, pref] of Object.entries(roles)) {
        assert.ok(
          allowed.has(pref.model_id),
          `Route ${tier}.${role} uses ${pref.model_id}, which is outside the configured capability pool`,
        );
      }
    }
  });

  it('pins the previously failing provider-path routes to validated replacements', () => {
    assert.deepEqual(DEFAULT_NVIDIA_ROUTING.free.aletheios, {
      model_id: 'openai/gpt-oss-20b',
      max_tokens: 768,
      temperature: 0.3,
    });
    assert.deepEqual(DEFAULT_NVIDIA_ROUTING.free.pichet, {
      model_id: 'openai/gpt-oss-20b',
      max_tokens: 768,
      temperature: 0.5,
    });
    assert.deepEqual(DEFAULT_NVIDIA_ROUTING.free.synthesis, {
      model_id: 'openai/gpt-oss-20b',
      max_tokens: 768,
      temperature: 0.4,
    });
    assert.deepEqual(DEFAULT_NVIDIA_ROUTING.free.deep, {
      model_id: 'openai/gpt-oss-20b',
      max_tokens: 1024,
      temperature: 0.4,
    });
    assert.deepEqual(DEFAULT_NVIDIA_ROUTING.enterprise.aletheios, {
      model_id: 'openai/gpt-oss-20b',
      max_tokens: 1024,
      temperature: 0.4,
    });
    assert.deepEqual(DEFAULT_NVIDIA_ROUTING.subscriber.fast, {
      model_id: 'openai/gpt-oss-20b',
      max_tokens: 512,
      temperature: 0.3,
    });
    assert.deepEqual(DEFAULT_NVIDIA_ROUTING.initiate.aletheios, {
      model_id: 'openai/gpt-oss-20b',
      max_tokens: 1024,
      temperature: 0.5,
    });
    assert.deepEqual(DEFAULT_NVIDIA_ROUTING.enterprise.fast, {
      model_id: 'openai/gpt-oss-20b',
      max_tokens: 512,
      temperature: 0.2,
    });
    assert.deepEqual(DEFAULT_NVIDIA_ROUTING.initiate.fast, {
      model_id: 'openai/gpt-oss-20b',
      max_tokens: 512,
      temperature: 0.3,
    });
  });
});
