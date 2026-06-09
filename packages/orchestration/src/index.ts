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

// P3 skeleton exports (actor prep + extraction direction)
export * from './actor-grounding-stub.js';
export {
  NoopExtractionProvider,
  createNemoExtractionProvider,
  ingestWitnessCorpus,
  type ExtractionProvider,
  NoopPrivateIndexManager,
  type PrivateIndexManager,
  type IndexScope,
} from './grounding.js';
