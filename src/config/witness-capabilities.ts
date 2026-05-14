import type { ModelPreference, ModelRoutingTable } from '../inference/types.js';
import type { SubscriptionTier } from '../types/engine.js';
import type { CliffordLevel, Kosha, Tier } from '../types/interpretation.js';

export interface WitnessCapabilityProfile {
  max_kosha: Kosha;
  max_clifford: CliffordLevel;
  rate_limit_per_day: number;
  agents_mode: 'none' | 'single' | 'dyad' | 'dyad_mirror';
  verified_nvidia_model_pool: readonly string[];
}

export const BILLING_TO_WITNESS_TIER: Record<SubscriptionTier, Tier> = {
  free: 'free',
  basic: 'subscriber',
  premium: 'enterprise',
  enterprise: 'initiate',
};

export const NVIDIA_MODEL_IDS = {
  KIMI_K2: 'moonshotai/kimi-k2-instruct',
  KIMI_K2_0905: 'moonshotai/kimi-k2-instruct-0905',
  MINIMAX_M27: 'minimaxai/minimax-m2.7',
  GLM_47: 'z-ai/glm4.7',
  GPT_OSS_120B: 'openai/gpt-oss-120b',
  GPT_OSS_20B: 'openai/gpt-oss-20b',
  LLAMA_33_70B: 'meta/llama-3.3-70b-instruct',
  LLAMA_31_405B: 'meta/llama-3.1-405b-instruct',
  NEMOTRON_49B: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  NEMOTRON_120B: 'nvidia/nemotron-3-super-120b-a12b',
  SARVAM_M: 'sarvamai/sarvam-m',
  MISTRAL_MED_35: 'mistralai/mistral-medium-3.5-128b',
} as const;

export const VERIFIED_NVIDIA_MODEL_IDS = [
  NVIDIA_MODEL_IDS.GPT_OSS_20B,
] as const;

export const WITNESS_CAPABILITY_PROFILES: Record<Tier, WitnessCapabilityProfile> = {
  free: {
    max_kosha: 'annamaya',
    max_clifford: 0,
    rate_limit_per_day: 10,
    agents_mode: 'none',
    verified_nvidia_model_pool: [
      NVIDIA_MODEL_IDS.GPT_OSS_20B,
    ],
  },
  subscriber: {
    max_kosha: 'manomaya',
    max_clifford: 2,
    rate_limit_per_day: 100,
    agents_mode: 'single',
    verified_nvidia_model_pool: [
      NVIDIA_MODEL_IDS.GPT_OSS_20B,
    ],
  },
  enterprise: {
    max_kosha: 'vijnanamaya',
    max_clifford: 3,
    rate_limit_per_day: Infinity,
    agents_mode: 'dyad',
    verified_nvidia_model_pool: [
      NVIDIA_MODEL_IDS.GPT_OSS_20B,
    ],
  },
  initiate: {
    max_kosha: 'anandamaya',
    max_clifford: 7,
    rate_limit_per_day: Infinity,
    agents_mode: 'dyad_mirror',
    verified_nvidia_model_pool: [
      NVIDIA_MODEL_IDS.GPT_OSS_20B,
    ],
  },
};

export const WITNESS_NVIDIA_ROUTING: ModelRoutingTable = {
  free: {
    aletheios: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 768, 0.3),
    pichet: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 768, 0.5),
    synthesis: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 768, 0.4),
    fast: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 256, 0.2),
    deep: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1024, 0.4),
  },
  subscriber: {
    aletheios: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1024, 0.4),
    pichet: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1024, 0.6),
    synthesis: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 768, 0.5),
    fast: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 512, 0.3),
    deep: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1280, 0.5),
  },
  enterprise: {
    aletheios: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1024, 0.4),
    pichet: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1280, 0.6),
    synthesis: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 768, 0.4),
    fast: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 512, 0.2),
    deep: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1536, 0.5),
  },
  initiate: {
    aletheios: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1024, 0.5),
    pichet: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1536, 0.7),
    synthesis: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 1024, 0.6),
    fast: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 512, 0.3),
    deep: model(NVIDIA_MODEL_IDS.GPT_OSS_20B, 2048, 0.6),
  },
};

function model(model_id: string, max_tokens: number, temperature: number): ModelPreference {
  return { model_id, max_tokens, temperature };
}
