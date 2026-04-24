// ─── Daily Witness — Standalone Module ─────────────────────────────────
// "Four mirrors. Three layers. Your body's architecture, daily."
//
// The gateway product: a living daily reading from 4 somatic engines.
// Not a personality test. Not a horoscope. A mirror.
//
// Architecture:
//   types.ts           → Domain types (layers, decoder state, standalone tiers)
//   engine-rotation.ts → Numerology-seeded daily engine selection
//   decoder-ring.ts    → Layer progression through return frequency
//   fools-gate.ts      → First-encounter engineering + data extraction
//   daily-mirror.ts    → Core engine: birth data → 3-layer reading
//   standalone-api.ts  → HTTP API server
//   skills-adapter.ts  → skills.sh integration

// ─── Types ──────────────────────────────────────────────────────────
export type {
  StandaloneEngineId,
  EngineRole,
  MirrorLayer,
  Layer1_RawMirror,
  Layer2_WitnessQuestion,
  Layer3_MetaPattern,
  CrossRef,
  DataPoint,
  DailyReading,
  DecoderState,
  StandaloneTier,
  SkillsShRequest,
  SkillsShResponse,
  FoolsGateResponse,
} from './types.js';

export {
  STANDALONE_ENGINES,
  ENGINE_WITNESS_ROLE,
  DECODER_THRESHOLDS,
  STANDALONE_TO_CORE_TIER,
  STANDALONE_TIER_FEATURES,
} from './types.js';

// ─── Engine Rotation ────────────────────────────────────────────────
export {
  getPrimaryEngine,
  getRotationOrder,
  getForecast,
  computeLifePathSeed,
  getDayNumber,
} from './engine-rotation.js';

// ─── Decoder Ring ───────────────────────────────────────────────────
export {
  hashBirthData,
  getDecoderState,
  getDecoderStateAsync,
  recordVisit,
  recordVisitAsync,
  setDecoderStore,
  getDecoderStore,
  computeMaxLayer,
  shouldShowFindersGate,
  shouldShowGraduation,
  getDecoderNarrative,
} from './decoder-ring.js';

// ─── Decoder Store ──────────────────────────────────────────────────
export type { DecoderStateStore } from './decoder-store.js';
export {
  InMemoryDecoderStore,
  SupabaseDecoderStore,
  createDecoderStore,
} from './decoder-store.js';

// ─── Fool's Gate ────────────────────────────────────────────────────
export {
  isFoolsGate,
  buildFoolsGate,
  extractDataPoints,
  generateHeadline,
} from './fools-gate.js';

// ─── Daily Mirror (Core) ────────────────────────────────────────────
export { DailyMirror } from './daily-mirror.js';
export type { DailyMirrorConfig } from './daily-mirror.js';

// ─── Engine Cache ───────────────────────────────────────────────────
export { EngineCache } from './engine-cache.js';

// ─── Circuit Breaker ────────────────────────────────────────────────
export { CircuitBreaker } from './circuit-breaker.js';
export type { CircuitState, EngineHealth, CircuitBreakerConfig } from './circuit-breaker.js';

// ─── Standalone API ─────────────────────────────────────────────────
export {
  createStandaloneHandlers,
  createStandaloneServer,
} from './standalone-api.js';
export type { StandaloneApiConfig, ReadingRequest } from './standalone-api.js';

// ─── Observability ──────────────────────────────────────────────────
export { WitnessObserver } from './observability.js';
export type {
  LogLevel,
  StructuredLog,
  EngineMetrics,
  CostMetrics,
  FunnelMetrics,
  WitnessObserverConfig,
} from './observability.js';

// ─── Rhythm SSE Server ──────────────────────────────────────────────
export {
  RhythmEventEmitter,
  formatSSE,
  detectOrganShift,
  detectBiorhythmThreshold,
  detectTimingNudge,
} from './rhythm-server.js';
export type { RhythmServerConfig, RhythmConnection } from './rhythm-server.js';

// ─── skills.sh Integration ──────────────────────────────────────────
export {
  SKILLS_SH_MANIFEST,
  handleSkillsShRequest,
  createSkillsShHandler,
} from './skills-adapter.js';
