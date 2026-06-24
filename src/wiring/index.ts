/**
 * @witness-agents/wiring
 *
 * Domain-specific adapters and graphs for wiring Witness perspectives (Aletheios, Pichet, etc.)
 * using the generic atomic fact-locked orchestration from @witness/orchestration.
 *
 * This folder is intentionally kept small — only perspective routing, daily/dyad graphs,
 * and integration adapters live here. Core coordination lives in the extracted package.
 */

// Re-export the full generic orchestration core (Phase 2 extraction)
export * from '@witness/orchestration';

// Domain adapters
export * from './inference-adapter.js';
export * from './adapters/observability.js';

// Domain graphs (ready-to-use task graphs for common witness flows)
export * from './graphs/index.js';

// Section-by-section interpretation service (production)
export {
  createSectionInterpretationService,
  SectionInterpretationService,
} from './section-interpretation-service.js';
export type {
  SectionInterpretationConfig,
  SubjectData,
  InterpretationResult,
} from './section-interpretation-service.js';

// Convenience: the most common production graphs
export {
  createDyadWitnessGraph,
  createDailyWitnessGraph,
  createResearchSynthesisGraph,
  createMultiEngineWitnessGraph,
} from './graphs/index.js';
