// ─── Witness Agents — NVIDIA Model Routing Table ──────────────────────
// Default model preferences per tier × agent role for NVIDIA NIM endpoint.
//
// Active routing is constrained to models verified with the current production
// NVIDIA key and the actual Node fetch/provider path. Models that only worked
// in curl, timed out under the provider, or were not re-validated are kept out
// of active routes until they are explicitly re-probed.
//
// To add/swap a model: probe it via:
//   curl https://integrate.api.nvidia.com/v1/chat/completions \
//     -H "Authorization: Bearer $NVIDIA_API_KEY" \
//     -H "Content-Type: application/json" \
//     -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"max_tokens":256}'
// Browse full catalog: https://build.nvidia.com/explore

import {
  NVIDIA_MODEL_IDS,
  VERIFIED_NVIDIA_MODEL_IDS,
  WITNESS_NVIDIA_ROUTING,
} from '../config/witness-capabilities.js';

// ═══════════════════════════════════════════════════════════════════════
// DEFAULT NVIDIA ROUTING
// ═══════════════════════════════════════════════════════════════════════
//
// Strategy:
//   - billing plan maps to one witness tier in `config/witness-capabilities`
//   - the witness tier exposes one capability profile and verified model pool
//   - active NVIDIA routes are then chosen from that tier's verified pool only
export { VERIFIED_NVIDIA_MODEL_IDS };
export const DEFAULT_NVIDIA_ROUTING = WITNESS_NVIDIA_ROUTING;

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
  [NVIDIA_MODEL_IDS.KIMI_K2]:        { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.KIMI_K2_0905]:   { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.MINIMAX_M27]:    { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.GLM_47]:         { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.GPT_OSS_120B]:   { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.GPT_OSS_20B]:    { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.LLAMA_33_70B]:   { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.LLAMA_31_405B]:  { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.NEMOTRON_49B]:   { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.NEMOTRON_120B]:  { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.SARVAM_M]:       { prompt_per_million: 0, completion_per_million: 0 },
  [NVIDIA_MODEL_IDS.MISTRAL_MED_35]: { prompt_per_million: 0, completion_per_million: 0 },
};

export function estimateNvidiaCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = NVIDIA_MODEL_COSTS[model];
  if (!costs) return 0;
  return (promptTokens * costs.prompt_per_million + completionTokens * costs.completion_per_million) / 1_000_000;
}
