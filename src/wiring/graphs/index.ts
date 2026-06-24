// src/wiring/graphs/index.ts
export { createDyadWitnessGraph } from './dyad-witness.js';
export { createDailyWitnessGraph } from './daily-witness.js';
export { createResearchSynthesisGraph } from './research-synthesis.js';
export { createMultiEngineWitnessGraph } from './multi-engine.js';
export {
  createSectionWitnessGraph,
  getSectionConfig,
  getSectionSystems,
  getConsciousnessStack,
  ENGINE_LAYER_WEIGHTS,
  ARCHITECTURAL_FLOW,
  type SectionPerspective,
  type SectionConfig,
  type SectionGraphOptions,
} from './section-witness.js';
