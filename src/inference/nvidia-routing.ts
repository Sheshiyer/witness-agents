// ─── Witness Agents — NVIDIA Model Routing Table ──────────────────────
// Default model preferences per tier × agent role for NVIDIA NIM endpoint.
//
// Catalog verified live against integrate.api.nvidia.com on 2026-05-05.
// Each model below was probed and returned a valid response under 25s.
// Models marked (R) are REASONING models — they emit `message.reasoning_content`
// and may exhaust their token budget on chain-of-thought before producing
// `message.content`. We allocate higher max_tokens to compensate, and the
// NvidiaProvider falls back to `reasoning_content` if `content` is empty.
//
// To add/swap a model: probe it via:
//   curl https://integrate.api.nvidia.com/v1/chat/completions \
//     -H "Authorization: Bearer $NVIDIA_API_KEY" \
//     -H "Content-Type: application/json" \
//     -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"max_tokens":256}'
// Browse full catalog: https://build.nvidia.com/explore

import type { ModelRoutingTable, ModelPreference } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// MODEL ID CONSTANTS (single source of truth — change here, propagates)
// ═══════════════════════════════════════════════════════════════════════

const KIMI_K2          = 'moonshotai/kimi-k2-instruct';           // 1s, no-reasoning, clean
const KIMI_K2_0905     = 'moonshotai/kimi-k2-instruct-0905';      // 1s, no-reasoning, newer
const MINIMAX_M27      = 'minimaxai/minimax-m2.7';                // (R) creative, expressive
const GLM_47           = 'z-ai/glm4.7';                           // (R) 4s, balanced
const GPT_OSS_120B     = 'openai/gpt-oss-120b';                   // (R) 1s, premium reasoning
const GPT_OSS_20B      = 'openai/gpt-oss-20b';                    // (R) 1s, fast reasoning
const LLAMA_33_70B     = 'meta/llama-3.3-70b-instruct';           // 1s, reliable workhorse
const LLAMA_31_405B    = 'meta/llama-3.1-405b-instruct';          // largest, deep work
const NEMOTRON_49B     = 'nvidia/llama-3.3-nemotron-super-49b-v1.5'; // (R) 10s, premium analysis
const NEMOTRON_120B    = 'nvidia/nemotron-3-super-120b-a12b';     // (R) 16s, deep reasoning
const SARVAM_M         = 'sarvamai/sarvam-m';                     // 4s, multilingual
const MISTRAL_MED_35   = 'mistralai/mistral-medium-3.5-128b';     // 1s, no-reasoning — autoresearch winner aletheios.subscriber 26/30

// ═══════════════════════════════════════════════════════════════════════
// DEFAULT NVIDIA ROUTING
// ═══════════════════════════════════════════════════════════════════════
//
// Strategy:
//   - free        → Kimi-K2 (fast, free, clean content) for most roles
//   - subscriber  → Kimi-K2-0905 + MiniMax-M2.7 + GLM4.7 mix
//   - enterprise  → Nemotron-49B + GPT-OSS-120B + Llama-3.3-70B
//   - initiate    → GPT-OSS-120B + Nemotron-120B + Llama-3.1-405B
//
// Reasoning models (R) get 2-4x token budget vs non-reasoning peers
// because chain-of-thought consumes most of the budget before the answer.

export const DEFAULT_NVIDIA_ROUTING: ModelRoutingTable = {
  free: {
    aletheios: m(KIMI_K2,         512,  0.3),
    pichet:    m(MINIMAX_M27,    1024,  0.5),  // (R)
    synthesis: m(KIMI_K2,         512,  0.4),
    fast:      m(KIMI_K2,         256,  0.2),
    deep:      m(KIMI_K2_0905,    768,  0.4),
  },
  subscriber: {
    // ⊕ Autoresearch FINAL winners (2026-05-05, 3 passes — see ~/.claude/MEMORY/WORK/autoresearch-witness-models-2026-05-05/)
    // Pass 1 (single prompt) → mistral aletheios / nemotron-49b pichet
    // Pass 2 (3 prompts)     → gpt-oss-120b BOTH (Pass 1 winners overfit to single query)
    // Pass 3 (cross-judge)   → gpt-oss-120b confirmed pichet UNANIMOUS, aletheios within 0.4 of mistral
    aletheios: m(GPT_OSS_120B,   1536,  0.4),  // (R) Pass 2 #1 (24.3), Pass 3 #2 (24.8); ~3s, both judges +V
    pichet:    m(GPT_OSS_120B,   1536,  0.6),  // (R) Pass 2 #1 (24.7), Pass 3 #1 UNANIMOUS (24.5); ~3s
    synthesis: m(GLM_47,         1536,  0.5),  // (R) — not autoresearched, kept from prior run
    fast:      m(KIMI_K2,         512,  0.3),
    deep:      m(LLAMA_33_70B,   1024,  0.5),
  },
  enterprise: {
    aletheios: m(NEMOTRON_49B,   2048,  0.4),  // (R)
    pichet:    m(MINIMAX_M27,    2048,  0.6),  // (R)
    synthesis: m(GPT_OSS_120B,   2048,  0.5),  // (R)
    fast:      m(GPT_OSS_20B,     768,  0.3),  // (R) but fast
    deep:      m(LLAMA_31_405B,  2048,  0.5),
  },
  initiate: {
    aletheios: m(GPT_OSS_120B,   3072,  0.5),  // (R)
    pichet:    m(MINIMAX_M27,    3072,  0.7),  // (R)
    synthesis: m(NEMOTRON_120B,  4096,  0.6),  // (R)
    fast:      m(KIMI_K2_0905,    768,  0.3),
    deep:      m(LLAMA_31_405B,  4096,  0.6),
  },
};

function m(model_id: string, max_tokens: number, temperature: number): ModelPreference {
  return { model_id, max_tokens, temperature };
}

// ═══════════════════════════════════════════════════════════════════════
// COST METADATA
// ═══════════════════════════════════════════════════════════════════════
//
// NVIDIA's hosted build platform is currently free for individual developers
// (subject to per-account credit quota). All entries are $0/M tokens.
// If NVIDIA introduces paid tiers, populate per-model rates below.

interface ModelCost {
  prompt_per_million: number;
  completion_per_million: number;
}

export const NVIDIA_MODEL_COSTS: Record<string, ModelCost> = {
  [KIMI_K2]:        { prompt_per_million: 0, completion_per_million: 0 },
  [KIMI_K2_0905]:   { prompt_per_million: 0, completion_per_million: 0 },
  [MINIMAX_M27]:    { prompt_per_million: 0, completion_per_million: 0 },
  [GLM_47]:         { prompt_per_million: 0, completion_per_million: 0 },
  [GPT_OSS_120B]:   { prompt_per_million: 0, completion_per_million: 0 },
  [GPT_OSS_20B]:    { prompt_per_million: 0, completion_per_million: 0 },
  [LLAMA_33_70B]:   { prompt_per_million: 0, completion_per_million: 0 },
  [LLAMA_31_405B]:  { prompt_per_million: 0, completion_per_million: 0 },
  [NEMOTRON_49B]:   { prompt_per_million: 0, completion_per_million: 0 },
  [NEMOTRON_120B]:  { prompt_per_million: 0, completion_per_million: 0 },
  [SARVAM_M]:       { prompt_per_million: 0, completion_per_million: 0 },
  [MISTRAL_MED_35]: { prompt_per_million: 0, completion_per_million: 0 },
};

export function estimateNvidiaCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = NVIDIA_MODEL_COSTS[model];
  if (!costs) return 0;
  return (promptTokens * costs.prompt_per_million + completionTokens * costs.completion_per_million) / 1_000_000;
}
