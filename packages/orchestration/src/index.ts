// packages/orchestration/src/index.ts
export * from './types.js';
export * from './fact-lock.js';
export * from './task-graph.js';
export * from './orchestrator.js';
export * from './assembler.js';
export * from './fact-checker.js';
export * from './service.js';
export * from './observability.js';
export * from './in-process-service.js';
export * from './metrics.js';
export * from './grounding.js';
// Re-export key grounding helper for domain graphs
export { injectGroundedContext } from './grounding.js';

// P3 actor model exports
export * from './actor-grounding-stub.js';
export {
  ActorGroundingProvider,
  ActorGroundingProviderStub,
  RetrievalWorkerActor,
  RetrievalActorPool,
  type ActorRef,
  type ActorState,
  type ActorConfig,
  type RetrievalMessage,
  type RetrievalReply,
  type SupervisionSignal,
} from './actor-grounding-stub.js';

// P3 extraction + private index exports
export {
  NoopExtractionProvider,
  createNemoExtractionProvider,
  ingestWitnessCorpus,
  type ExtractionProvider,
  NoopPrivateIndexManager,
  type PrivateIndexManager,
  type IndexScope,
} from './grounding.js';

// Vectorize grounding provider (Cloudflare Vectorize adapter)
export {
  VectorizeGroundingProvider,
  createVectorizeGroundingProvider,
  createWitnessWisdomGroundingProvider,
  type VectorizeGroundingConfig,
  type EmbeddingProvider,
  type EmbeddingResult,
} from './vectorize-grounding.js';
