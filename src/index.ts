// ─── Witness Agents — Public API ──────────────────────────────────────
// Main entry point: creates and configures the interpretation pipeline

export * from './types/index.js';
export { AgentStateMachine, DyadCoordinator } from './agents/state-machine.js';
export { KnowledgeStore } from './knowledge/domain-loader.js';
export { InterpretationPipeline, SelemeneClient, CliffordGate } from './pipeline/interpreter.js';
export type { PipelineConfig } from './pipeline/interpreter.js';
export { TierGate, RateLimiter } from './tiers/tier-gate.js';
export type { TierCheckResult } from './tiers/tier-gate.js';

import { InterpretationPipeline } from './pipeline/interpreter.js';
import type { PipelineConfig } from './pipeline/interpreter.js';

/**
 * Create a fully configured witness-agents interpretation pipeline.
 *
 * @example
 * ```ts
 * const pipeline = createPipeline({
 *   selemene: { base_url: 'https://selemene.railway.app', api_key: 'sk-...' },
 *   knowledge_path: './knowledge',
 * });
 *
 * const result = await pipeline.process({
 *   query: 'What should I focus on this week?',
 *   user_state: {
 *     tier: 'subscriber',
 *     http_status: 200,
 *     overwhelm_level: 0.2,
 *     active_kosha: 'pranamaya',
 *     dominant_center: 'heart',
 *     recursion_detected: false,
 *     anti_dependency_score: 0.3,
 *     session_query_count: 1,
 *   },
 *   session_id: 'sess-123',
 *   request_id: 'req-456',
 * });
 * ```
 */
export function createPipeline(config: PipelineConfig): InterpretationPipeline {
  return new InterpretationPipeline(config);
}
