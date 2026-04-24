// ─── Witness Agents — Type Barrel Exports ─────────────────────────────
export * from './engine.js';
export * from './agent.js';
// BirthData and Precision live in both engine.ts and interpretation.ts;
// engine.ts is the canonical source (re-exported above), so we cherry-pick here.
export {
  type Kosha,
  type CliffordLevel,
  type Tier,
  KOSHA_CLIFFORD,
  TIER_MAX_KOSHA,
  TIER_MAX_CLIFFORD,
  TIER_RATE_LIMITS,
  CONSCIOUSNESS_TO_KOSHA,
  type HttpMentalState,
  type DominantCenter,
  type UserState,
  type AgentInterpretation,
  type WitnessInterpretation,
  type PipelineQuery,
  type SelemeneClientConfig,
} from './interpretation.js';
export * from './knowledge.js';
