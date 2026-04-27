// ─── Witness Agents — Model Routing Table ─────────────────────────────
// Default model preferences per tier × agent role.
// Cost-optimized: cheap for free/subscriber, powerful for enterprise/initiate.
// All models available on OpenRouter.

import type { ModelRoutingTable, ModelPreference } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// DEFAULT MODEL ROUTING
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_MODEL_ROUTING: ModelRoutingTable = {
  free: {
    aletheios: m('meta-llama/llama-4-scout', 256, 0.3),
    pichet:    m('meta-llama/llama-4-scout', 256, 0.5),
    synthesis: m('meta-llama/llama-4-scout', 256, 0.4),
    fast:      m('meta-llama/llama-4-scout', 128, 0.2),
    deep:      m('meta-llama/llama-4-scout', 512, 0.4),
  },
  subscriber: {
    aletheios: m('anthropic/claude-sonnet-4', 512, 0.4),
    pichet:    m('anthropic/claude-sonnet-4.6', 512, 0.6),
    synthesis: m('anthropic/claude-sonnet-4', 512, 0.5),
    fast:      m('google/gemini-2.5-flash-lite', 256, 0.3),
    deep:      m('anthropic/claude-sonnet-4', 768, 0.5),
  },
  enterprise: {
    aletheios: m('anthropic/claude-sonnet-4', 1024, 0.4),
    pichet:    m('anthropic/claude-sonnet-4.6', 1024, 0.6),
    synthesis: m('anthropic/claude-sonnet-4', 1536, 0.5),
    fast:      m('google/gemini-2.5-flash-lite', 512, 0.3),
    deep:      m('anthropic/claude-sonnet-4', 2048, 0.5),
  },
  initiate: {
    aletheios: m('anthropic/claude-sonnet-4', 2048, 0.5),
    pichet:    m('anthropic/claude-sonnet-4.6', 2048, 0.7),
    synthesis: m('anthropic/claude-sonnet-4', 3072, 0.6),
    fast:      m('anthropic/claude-sonnet-4', 512, 0.3),
    deep:      m('anthropic/claude-sonnet-4', 4096, 0.6),
  },
};

// Helper to build model preferences tersely
function m(model_id: string, max_tokens: number, temperature: number): ModelPreference {
  return { model_id, max_tokens, temperature };
}

// ═══════════════════════════════════════════════════════════════════════
// MODEL METADATA (for cost estimation)
// ═══════════════════════════════════════════════════════════════════════

interface ModelCost {
  prompt_per_million: number;
  completion_per_million: number;
}

export const MODEL_COSTS: Record<string, ModelCost> = {
  'meta-llama/llama-4-scout':       { prompt_per_million: 0.08,  completion_per_million: 0.30 },
  'meta-llama/llama-4-maverick':    { prompt_per_million: 0.15,  completion_per_million: 0.60 },
  'google/gemini-2.5-flash':        { prompt_per_million: 0.30,  completion_per_million: 2.50 },
  'google/gemini-2.5-flash-lite':   { prompt_per_million: 0.10,  completion_per_million: 0.40 },
  'google/gemini-2.5-pro':          { prompt_per_million: 1.25,  completion_per_million: 10.0 },
  'google/gemini-2.5-pro-preview':  { prompt_per_million: 1.25,  completion_per_million: 10.0 },
  'anthropic/claude-sonnet-4':      { prompt_per_million: 3.00,  completion_per_million: 15.0 },
  'anthropic/claude-sonnet-4.5':    { prompt_per_million: 3.00,  completion_per_million: 15.0 },
  'anthropic/claude-sonnet-4.6':    { prompt_per_million: 3.00,  completion_per_million: 15.0 },
  'anthropic/claude-3-haiku':       { prompt_per_million: 0.25,  completion_per_million: 1.25 },
};

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model];
  if (!costs) return 0;
  return (promptTokens * costs.prompt_per_million + completionTokens * costs.completion_per_million) / 1_000_000;
}
