// ─── Witness Agents — Inference Module ─────────────────────────────────
export { OpenRouterProvider } from './openrouter.js';
export type { OpenRouterConfig } from './openrouter.js';
export { NvidiaProvider } from './nvidia.js';
export type { NvidiaConfig } from './nvidia.js';
export { OpenAIProvider } from './openai-provider.js';
export type { OpenAIConfig } from './openai-provider.js';
export { NvidiaEmbeddingProvider } from './nvidia-embedding.js';
export type {
  EmbeddingConfig,
  EmbeddingResult,
  EmbeddingError,
  BatchEmbeddingItem,
  BatchEmbeddingResult,
} from './nvidia-embedding.js';
export { DyadInferenceEngine } from './dyad-engine.js';
export type { DyadInferenceConfig } from './dyad-engine.js';
export { AksharaEnrichment } from './akshara-enrichment.js';
export { DEFAULT_MODEL_ROUTING, MODEL_COSTS, estimateCost } from './model-routing.js';
export type {
  ProviderId,
  ProviderConfig,
  ModelRole,
  ModelPreference,
  ModelRoutingTable,
  InferenceMessage,
  InferenceRequest,
  InferenceResponse,
  InferenceError,
  DyadInferenceResult,
} from './types.js';
