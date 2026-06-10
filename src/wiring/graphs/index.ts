// src/wiring/graphs/index.ts
export { createDyadWitnessGraph } from './dyad-witness.js';
export { createDailyWitnessGraph } from './daily-witness.js';
export { createResearchSynthesisGraph } from './research-synthesis.js';
export { createMultiEngineWitnessGraph } from './multi-engine.js';
export { 
  createSectionWitnessGraph,
  getSectionConfig,
  getSectionSystems,
  type SectionPerspective,
  type SectionConfig,
} from './section-witness.js';
