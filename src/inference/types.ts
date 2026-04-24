// ─── Witness Agents — Inference Types ──────────────────────────────────
// Provider-agnostic types for LLM inference. OpenRouter first, extensible to others.

import type { Tier } from '../types/interpretation.js';

// ═══════════════════════════════════════════════════════════════════════
// PROVIDER ABSTRACTION
// ═══════════════════════════════════════════════════════════════════════

export type ProviderId = 'openrouter' | 'anthropic' | 'openai' | 'local';

export interface ProviderConfig {
  id: ProviderId;
  api_key: string;
  base_url: string;
  default_model: string;
  headers?: Record<string, string>;
  timeout_ms?: number;
}

// ═══════════════════════════════════════════════════════════════════════
// MODEL ROUTING
// ═══════════════════════════════════════════════════════════════════════

export type ModelRole = 'aletheios' | 'pichet' | 'synthesis' | 'fast' | 'deep';

/**
 * Model preference: which model to use per agent/tier combination.
 * Allows cost-optimized routing (cheap fast models for free/subscriber,
 * powerful models for enterprise/initiate).
 */
export interface ModelPreference {
  model_id: string;          // e.g. "anthropic/claude-sonnet-4-20250514"
  max_tokens: number;
  temperature: number;
  top_p?: number;
  provider?: ProviderId;     // Override default provider for this model
}

export type ModelRoutingTable = Record<Tier, Record<ModelRole, ModelPreference>>;

// ═══════════════════════════════════════════════════════════════════════
// INFERENCE REQUEST / RESPONSE
// ═══════════════════════════════════════════════════════════════════════

export interface InferenceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface InferenceRequest {
  messages: InferenceMessage[];
  model_role: ModelRole;
  tier: Tier;
  model_override?: string;    // Force a specific model
  temperature_override?: number;
  max_tokens_override?: number;
  metadata?: Record<string, string>;
}

export interface InferenceResponse {
  content: string;
  model_used: string;
  provider: ProviderId;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
  finish_reason: string;
  cost_estimate_usd?: number;
}

export interface InferenceError {
  provider: ProviderId;
  model: string;
  status: number;
  message: string;
  retryable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// DYAD INFERENCE — structured output from agent LLM calls
// ═══════════════════════════════════════════════════════════════════════

export interface DyadInferenceResult {
  aletheios?: InferenceResponse;
  pichet?: InferenceResponse;
  synthesis?: InferenceResponse;
  total_cost_usd: number;
  total_latency_ms: number;
}
