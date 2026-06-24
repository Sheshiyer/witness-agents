/**
 * section-witness-graph.ts
 *
 * Layer-by-layer interpretation graph.
 *
 * The 16 Selemene consciousness engines are organized into 4 functional layers
 * that map to the Pancha Kosha stack (Pranamaya → Manomaya → Annamaya →
 * Vijnanamaya), gated by Clifford algebra depth.  The synthesis step rises to
 * Anandamaya.
 *
 * Flow:
 *   Wave 1 (parallel): Temporal Foundation, Structural Identity,
 *                      Somatic Resonance, Creative Oracle
 *   Wave 2: Layer Synthesis integrating all layers
 *
 * Each layer receives a weighted token budget proportional to its engine
 * count, data density, and role in the consciousness stack.
 */

import type { AtomicTask, FactLock, GroundedPassage } from '@witness/orchestration';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type SectionPerspective =
  | 'temporal-foundation'
  | 'structural-identity'
  | 'somatic-resonance'
  | 'creative-oracle'
  | 'layer-synthesis';

export interface SectionConfig {
  systems: string[];
  name: string;
  focusAreas: string[];
  /** Token-budget weight (0–1).  Sum of all active layer weights = 1. */
  weight: number;
  /** Consciousness-layer description for prompt context */
  layerDescription: string;
  /** Kosha alignment for architectural transparency */
  kosha: 'Pranamaya' | 'Manomaya' | 'Annamaya' | 'Vijnanamaya';
}

// ═══════════════════════════════════════════════════════════════════════
// WEIGHTED LAYER CONFIGURATIONS  (all 16 engines assigned)
// ═══════════════════════════════════════════════════════════════════════

const TEMPORAL_FOUNDATION: SectionConfig = {
  systems: ['panchanga', 'vimshottari', 'transits', 'vedic-clock', 'biorhythm'],
  name: 'Temporal Foundation',
  weight: 0.28,
  kosha: 'Pranamaya',
  layerDescription:
    'The breath-layer of time.  Establishes WHEN the subject is: ' +
    'life-period (dasha), day-quality (panchanga), planetary weather ' +
    '(transits), organ-clock (vedic-clock), and body-rhythm cycles (biorhythm).',
  focusAreas: [
    'Tithi, Nakshatra, Yoga, Karana, Vara — the five limbs of the day (Panchanga)',
    'Current Mahadasha / Antardasha / Pratyantardasha life chapter (Vimshottari)',
    'Active planetary transits and Sade-Sati status (Transits)',
    'Current organ, dosha, and recommended activities by the hour (Vedic Clock)',
    'Physical, emotional, intellectual, and intuitive cycle state (Biorhythm)',
  ],
};

const STRUCTURAL_IDENTITY: SectionConfig = {
  systems: ['human-design', 'gene-keys', 'numerology', 'enneagram'],
  name: 'Structural Identity',
  weight: 0.28,
  kosha: 'Manomaya',
  layerDescription:
    'The mind-pattern layer.  Reveals WHAT the subject is: ' +
    'decision authority (human design), gift/shadow spectrum (gene keys), ' +
    'numerological architecture, and enneagram topology.',
  focusAreas: [
    'Type, Authority, Strategy, Profile, and Definition (Human Design)',
    'Activation Sequence — Life\'s Work, Evolution, Radiance, Purpose gates (Gene Keys)',
    'Life Path, Expression, Soul Urge, Personality, Birthday numbers (Numerology)',
    'Core type, wing, integration/disintegration, center, harmonic group (Enneagram)',
  ],
};

const SOMATIC_RESONANCE: SectionConfig = {
  systems: ['biofield', 'face-reading', 'nadabrahman'],
  name: 'Somatic Resonance',
  weight: 0.22,
  kosha: 'Annamaya',
  layerDescription:
    'The body-layer.  Mirrors HOW the subject feels right now: ' +
    'energy-field coherence (biofield), constitutional type (face reading), ' +
    'and resonant sound frequency (nadabrahman).',
  focusAreas: [
    'Chakra activity, coherence, entropy, and vitality index (Biofield)',
    'Primary/secondary dosha, TCM element, body type, facial indicators (Face Reading)',
    'Recommended raga, prahar, solfeggio frequency, and chakra tone (NadaBrahman)',
  ],
};

const CREATIVE_ORACLE: SectionConfig = {
  systems: ['i-ching', 'tarot', 'sacred-geometry', 'sigil-forge'],
  name: 'Creative Oracle',
  weight: 0.22,
  kosha: 'Vijnanamaya',
  layerDescription:
    'The creative-wisdom layer.  Opens WHAT EMERGES from the unconscious: ' +
    'change oracle (i-ching), archetypal mirror (tarot), form meditation ' +
    '(sacred geometry), and symbol creation (sigil forge).',
  focusAreas: [
    'Primary hexagram, changing lines, relating hexagram, casting method (I Ching)',
    'Spread type, positions, card archetypes, and elemental mappings (Tarot)',
    'Sacred form, symbolism, numerology, and meditation prompt (Sacred Geometry)',
    'Intention, method, processing steps, and charging suggestions (Sigil Forge)',
  ],
};

/**
 * Roadmap gate: Somatic Resonance layer approval.
 *
 * Somatic engines (biofield, face-reading, nadabrahman) require physical
 * inputs that are not yet production-ready:
 *   - Biofield: live webcam feed (biofield-capture)
 *   - Face Reading: face image upload
 *   - NadaBrahman: music engine integration
 *
 * When this flag is false (default):
 *   - The somatic-resonance layer is excluded from interpretation graphs
 *   - The premium dossier does not render a Somatic Resonance Thread
 *   - Cross-layer synergy pairs involving somatic engines are skipped
 *
 * DO NOT set to true until all three physical-input integrations are
 * complete and explicitly approved in the roadmap.
 */
export const SOMATIC_LAYER_APPROVED = false;

/**
 * Roadmap gate: Creative Oracle layer approval.
 *
 * Oracle engines (i-ching, tarot, sacred-geometry, sigil-forge) require
 * a live query or intention. They do NOT produce deterministic birth-chart
 * output from birth data alone. Including them in a birth-blueprint or
 * integrated reading produces non-deterministic, query-dependent output
 * that does not belong in a standard chart report.
 *
 * When this flag is false (default):
 *   - The creative-oracle layer is excluded from interpretation graphs
 *   - The premium dossier does not render a Creative Oracle Thread
 *   - Cross-layer synergy pairs involving oracle engines are skipped
 *
 * DO NOT set to true until a clear query/intention flow is wired and
 * explicitly approved in the roadmap.
 */
export const CREATIVE_ORACLE_LAYER_APPROVED = false;

/** Ordered consciousness stack — lower index = more foundational */
export const CONSCIOUSNESS_STACK: SectionConfig[] = [
  TEMPORAL_FOUNDATION,
  STRUCTURAL_IDENTITY,
  SOMATIC_RESONANCE,
  CREATIVE_ORACLE,
];

/** Per-layer token weight.  Sums to 1.0 across the 4 layers. */
export const ENGINE_LAYER_WEIGHTS: Record<SectionPerspective, number> = {
  'temporal-foundation': 0.28,
  'structural-identity': 0.28,
  'somatic-resonance': 0.22,
  'creative-oracle': 0.22,
  'layer-synthesis': 0, // synthesis has its own fixed budget
};

/** Human-readable architectural flow description */
export const ARCHITECTURAL_FLOW = `
Witness Agents — 16-Engine Consciousness Stack

The report moves through four functional layers, each mapping to a Pancha Kosha sheath.
By default, ONLY layers that produce deterministic output from birth data are active.

1. TEMPORAL FOUNDATION  (Pranamaya — the breath of time)
   Engines: Panchanga, Vimshottari, Transits, Vedic Clock, Biorhythm
   Question answered: "When am I?"
   Weight: 28% of interpretive tokens
   Status: ACTIVE by default

2. STRUCTURAL IDENTITY  (Manomaya — the mind's pattern)
   Engines: Human Design, Gene Keys, Numerology, Enneagram
   Question answered: "What am I?"
   Weight: 28% of interpretive tokens
   Status: ACTIVE by default

3. SOMATIC RESONANCE  (Annamaya — the food body)
   Engines: Biofield, Face Reading, NadaBrahman
   Question answered: "How do I feel?"
   Weight: 22% of interpretive tokens
   Status: DISABLED by default — REQUIRES PHYSICAL INPUTS
     - Biofield: live webcam feed (biofield-capture)
     - Face Reading: face image upload
     - NadaBrahman: music engine integration
   Enable only via explicit roadmap approval (SOMATIC_LAYER_APPROVED).
   Including mock data in an integrated reading produces false somatic claims.

4. CREATIVE ORACLE  (Vijnanamaya — creative wisdom)
   Engines: I Ching, Tarot, Sacred Geometry, Sigil Forge
   Question answered: "What wants to emerge?"
   Weight: 22% of interpretive tokens
   Status: DISABLED by default — REQUIRES LIVE QUERY/INTENTION
     - I Ching: casting question
     - Tarot: spread intention
     - Sacred Geometry: meditation focus
     - Sigil Forge: symbol intention
   Enable only via explicit roadmap approval (CREATIVE_ORACLE_LAYER_APPROVED).
   These engines do not produce deterministic birth-chart output.

5. LAYER SYNTHESIS  (Anandamaya — bliss/self-reference)
   Active engines cross-resonate.
   Question answered: "What is the integrated whole?"
   Fixed budget: 2500 tokens

Cross-layer signals are flagged as convergence nodes.
The synthesis does not repeat layers — it elevates.
`;

// ═══════════════════════════════════════════════════════════════════════
// GRAPH FACTORY
// ═══════════════════════════════════════════════════════════════════════

export interface SectionGraphOptions {
  includeTemporal?: boolean;
  includeStructural?: boolean;
  /** Somatic requires physical inputs (webcam, face image, music engine).
   *  Default: FALSE — somatic data is mock/false without these inputs.
   *  Enable only when explicit roadmap approval is given. */
  includeSomatic?: boolean;
  includeOracle?: boolean;
  /** Base token budget to split across layers (default: 6000) */
  baseSectionTokens?: number;
  /** Fixed synthesis budget (default: 2500) */
  synthesisTokens?: number;
}

/**
 * Create a layer-by-layer interpretation graph.
 *
 * Token budget is allocated proportionally to layer weight:
 *   layerTokens = baseSectionTokens × (layer.weight / sumOfActiveWeights)
 *
 * This guarantees that dense layers (Temporal, Structural) receive more
 * interpretive depth than sparse/conditional layers (Somatic, Oracle),
 * while every engine in the 16-engine stack has a dedicated home.
 */
export function createSectionWitnessGraph(
  lock: FactLock,
  options?: SectionGraphOptions,
): AtomicTask<SectionPerspective>[] {
  const {
    includeTemporal = true,
    includeStructural = true,
    includeSomatic = false,
    includeOracle = false,
    baseSectionTokens = 6000,
    synthesisTokens = 2500,
  } = options ?? {};

  const tasks: AtomicTask<SectionPerspective>[] = [];
  const sectionDeps: string[] = [];

  // Determine which layers are active and their total weight
  const activeLayers: { id: SectionPerspective; config: SectionConfig }[] = [];
  if (includeTemporal && hasAnySystem(lock, TEMPORAL_FOUNDATION.systems)) {
    activeLayers.push({ id: 'temporal-foundation', config: TEMPORAL_FOUNDATION });
  }
  if (includeStructural && hasAnySystem(lock, STRUCTURAL_IDENTITY.systems)) {
    activeLayers.push({ id: 'structural-identity', config: STRUCTURAL_IDENTITY });
  }
  if (includeSomatic && hasAnySystem(lock, SOMATIC_RESONANCE.systems)) {
    activeLayers.push({ id: 'somatic-resonance', config: SOMATIC_RESONANCE });
  }
  if (includeOracle && hasAnySystem(lock, CREATIVE_ORACLE.systems)) {
    activeLayers.push({ id: 'creative-oracle', config: CREATIVE_ORACLE });
  }

  const totalWeight = activeLayers.reduce((sum, l) => sum + l.config.weight, 0);

  // Wave 1: Layer interpretations (parallel)
  for (const { id, config } of activeLayers) {
    const targetTokens = Math.round(baseSectionTokens * (config.weight / totalWeight));
    tasks.push(createSectionTask(id, config, targetTokens));
    sectionDeps.push(id);
  }

  // Wave 2: Layer synthesis
  if (sectionDeps.length > 0) {
    tasks.push({
      id: 'layer-synthesis',
      perspective: 'layer-synthesis',
      dependsOn: sectionDeps,
      targetTokens: synthesisTokens,
      temperature: 0.18,
      requiresGrounding: true,
      buildPrompts: (_factLock, priorOutputs, grounding) => {
        return {
          system: buildSynthesisSystemPrompt(sectionDeps),
          user: buildSynthesisUserPrompt(priorOutputs, sectionDeps, grounding),
        };
      },
    });
  }

  return tasks;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION TASK FACTORY
// ═══════════════════════════════════════════════════════════════════════

function createSectionTask(
  id: SectionPerspective,
  config: SectionConfig,
  targetTokens: number,
): AtomicTask<SectionPerspective> {
  return {
    id,
    perspective: id,
    dependsOn: [],
    targetTokens,
    temperature: 0.22,
    requiresGrounding: true,
    buildPrompts: (factLock, _priorOutputs, grounding) => {
      return {
        system: buildSectionSystemPrompt(config, factLock),
        user: buildSectionUserPrompt(config, factLock, grounding),
      };
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ═══════════════════════════════════════════════════════════════════════

function buildSectionSystemPrompt(config: SectionConfig, lock: FactLock): string {
  const subjectName = lock.facts?.name || 'the subject';

  return `You are a witness interpreter specializing in ${config.name}.

## Consciousness Layer
${config.layerDescription}
Kosha alignment: ${config.kosha}

## Your Role
Interpret the engine data for ${subjectName} through the lens of ${config.name}.
Focus ONLY on the systems in this layer.  Do not reference other layers.

## Systems in This Layer
${config.focusAreas.map((f) => `- ${f}`).join('\n')}

## Interpretation Guidelines
1. Start with the most significant patterns in THIS layer
2. Reference specific data points from the FactLock
3. Use retrieved wisdom passages to ground your interpretation
4. Avoid speculation — only interpret what's present in the data
5. Write in second person ("You have...", "Your design shows...")
6. Be specific about numbers, gates, types, periods — cite them
7. Respect the layer's weight: this section receives ${config.weight * 100}% of the interpretive budget

## Output Format
Write a flowing interpretation (not bullet points) that covers:
1. Core configuration in this layer
2. Current timing / state if applicable
3. Key themes emerging from this layer
4. Practical witness questions for self-inquiry

Do NOT include a section header — the synthesis will combine layers.`;
}

function buildSectionUserPrompt(
  config: SectionConfig,
  lock: FactLock,
  grounding?: GroundedPassage[],
): string {
  const parts: string[] = [];

  parts.push(`Interpret the ${config.name} data for this subject.`);
  parts.push('');
  parts.push('## Engine Data Available');

  // List which engines have data
  const availableEngines = config.systems.filter((sys) => {
    const engineData = (lock.facts as any)?.[sys] || (lock.facts as any)?.engines?.[sys];
    return engineData !== undefined;
  });

  parts.push(availableEngines.map((e) => `- ${e}`).join('\n') || '(no engine data in this layer)');

  // Add grounding context if available
  if (grounding && grounding.length > 0) {
    parts.push('');
    parts.push('## Retrieved Wisdom Context');
    parts.push('Use these passages to ground your interpretation:');
    for (const passage of grounding.slice(0, 5)) {
      parts.push(`[${passage.source}] ${passage.excerpt}`);
    }
  }

  parts.push('');
  parts.push('Provide your interpretation of this layer now.');

  return parts.join('\n');
}

function buildSynthesisSystemPrompt(sectionDeps: string[]): string {
  const layerNames = sectionDeps
    .map((d) => d.replace(/-/g, ' '))
    .join(', ');

  return `You are the master witness synthesizer integrating four consciousness layers.

## Your Role
Synthesize the layer interpretations (${layerNames}) into a unified witness report.

## Synthesis Guidelines
1. Do NOT repeat what the layers said — integrate and elevate
2. Find cross-layer resonances and tensions
3. Identify the 2-3 most significant themes across ALL layers
4. Surface contradictions or paradoxes as inquiry points
5. End with 3-5 witness questions that span multiple layers
6. Write in second person, flowing prose
7. Respect the stack order: Temporal → Structural → Somatic → Oracle

## Output Format
1. **Opening**: One paragraph capturing the essence of this moment
2. **Core Themes**: 2-3 integrated themes with cross-layer evidence
3. **Tensions & Paradoxes**: Where layers seem to contradict (if any)
4. **Witness Questions**: Questions for self-inquiry`;
}

function buildSynthesisUserPrompt(
  priorOutputs: Record<string, string>,
  sectionDeps: string[],
  grounding?: GroundedPassage[],
): string {
  const parts: string[] = [];

  parts.push('Synthesize these layer interpretations into a unified witness report:');
  parts.push('');

  for (const dep of sectionDeps) {
    const output = priorOutputs[dep];
    if (output) {
      const layerName = dep.replace(/-/g, ' ').toUpperCase();
      parts.push(`## ${layerName} LAYER`);
      parts.push(output);
      parts.push('');
    }
  }

  if (grounding && grounding.length > 0) {
    parts.push('## Cross-Layer Wisdom Context');
    for (const passage of grounding.slice(0, 3)) {
      parts.push(`[${passage.source}] ${passage.excerpt}`);
    }
    parts.push('');
  }

  parts.push('---');
  parts.push('Now synthesize these layers into one unified witness report.');

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if FactLock contains data for any of the specified systems.
 */
function hasAnySystem(lock: FactLock, systems: string[]): boolean {
  // Check engineData (primary location for engine outputs)
  const engineData = lock.engineData as Record<string, unknown>;
  if (engineData) {
    for (const sys of systems) {
      if (engineData[sys] !== undefined) return true;
    }
  }

  // Check facts for direct keys
  const facts = lock.facts as Record<string, unknown>;
  if (facts) {
    for (const sys of systems) {
      if (facts[sys] !== undefined) return true;
    }

    // Check nested engines object
    const engines = facts.engines as Record<string, unknown>;
    if (engines) {
      for (const sys of systems) {
        if (engines[sys] !== undefined) return true;
      }
    }
  }

  return false;
}

/**
 * Get section configuration by perspective ID.
 */
export function getSectionConfig(perspective: SectionPerspective): SectionConfig | undefined {
  switch (perspective) {
    case 'temporal-foundation':
      return TEMPORAL_FOUNDATION;
    case 'structural-identity':
      return STRUCTURAL_IDENTITY;
    case 'somatic-resonance':
      return SOMATIC_RESONANCE;
    case 'creative-oracle':
      return CREATIVE_ORACLE;
    default:
      return undefined;
  }
}

/**
 * Get all systems included in a section.
 */
export function getSectionSystems(perspective: SectionPerspective): string[] {
  const config = getSectionConfig(perspective);
  return config?.systems ?? [];
}

/**
 * Get the ordered consciousness stack (foundational → emergent).
 */
export function getConsciousnessStack(): SectionConfig[] {
  return [...CONSCIOUSNESS_STACK];
}
