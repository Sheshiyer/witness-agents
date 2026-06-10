/**
 * section-witness-graph.ts
 * 
 * Section-by-section interpretation graph.
 * Each system (Western/Vedic/Somatic) gets its own interpretation task with targeted retrieval.
 * 
 * Flow:
 *   Wave 1 (parallel): Western interpretation, Vedic interpretation, Somatic interpretation
 *   Wave 2: Final synthesis combining all sections
 * 
 * Per ai-agents-meta-core: single-perspective tasks, evidence-gated retrieval.
 * Per backend-architecture-core: ports-and-adapters for grounding injection.
 */

import type { AtomicTask, FactLock, GroundedPassage } from '@witness/orchestration';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type SectionPerspective = 
  | 'western-systems'
  | 'vedic-systems' 
  | 'somatic-systems'
  | 'section-synthesis';

export interface SectionConfig {
  systems: string[];
  name: string;
  focusAreas: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════

const WESTERN_SECTION: SectionConfig = {
  systems: ['human-design', 'gene-keys', 'numerology', 'i-ching', 'enneagram'],
  name: 'Western Consciousness Systems',
  focusAreas: [
    'Type, Authority, and Strategy (Human Design)',
    'Activation Sequence and Shadow/Gift/Siddhi spectrum (Gene Keys)',
    'Life Path and Core Numbers (Numerology)',
    'Current Hexagram and Guidance (I Ching)',
    'Type, Wing, and Growth Path (Enneagram)',
  ],
};

const VEDIC_SECTION: SectionConfig = {
  systems: ['vimshottari', 'panchanga', 'vedic-clock', 'nadabrahman', 'transits'],
  name: 'Vedic Consciousness Systems',
  focusAreas: [
    'Current Mahadasha and Antardasha (Vimshottari)',
    'Tithi, Nakshatra, Yoga, Karana, Vara (Panchanga)',
    'Current Muhurta and Guna (Vedic Clock)',
    'Harmonic Frequencies (Nadabrahman)',
    'Active Planetary Transits',
  ],
};

const SOMATIC_SECTION: SectionConfig = {
  systems: ['biofield', 'face-reading', 'biofield-capture'],
  name: 'Somatic Consciousness Systems',
  focusAreas: [
    'Dominant Element and Coherence (Biofield)',
    'Constitutional Type and Observations (Face Reading)',
    'Real-time Energy Patterns (Biofield Capture)',
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// GRAPH FACTORY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create a section-by-section interpretation graph.
 * 
 * This graph processes each system type separately, allowing for:
 * 1. Targeted retrieval per section (engine-specific wisdom + subject data)
 * 2. Focused interpretation without cross-contamination
 * 3. Final synthesis that integrates all sections
 * 
 * @param lock - The FactLock containing subject data and engine outputs
 * @param options - Optional configuration
 */
export function createSectionWitnessGraph(
  lock: FactLock,
  options?: {
    includeWestern?: boolean;
    includeVedic?: boolean;
    includeSomatic?: boolean;
    targetTokensPerSection?: number;
    synthesisTokens?: number;
  }
): AtomicTask<SectionPerspective>[] {
  const {
    includeWestern = true,
    includeVedic = true,
    includeSomatic = true,
    targetTokensPerSection = 1500,
    synthesisTokens = 2500,
  } = options ?? {};

  const tasks: AtomicTask<SectionPerspective>[] = [];
  const sectionDeps: string[] = [];

  // Wave 1: Section interpretations (parallel)
  if (includeWestern && hasAnySystem(lock, WESTERN_SECTION.systems)) {
    tasks.push(createSectionTask('western-systems', WESTERN_SECTION, targetTokensPerSection));
    sectionDeps.push('western-systems');
  }

  if (includeVedic && hasAnySystem(lock, VEDIC_SECTION.systems)) {
    tasks.push(createSectionTask('vedic-systems', VEDIC_SECTION, targetTokensPerSection));
    sectionDeps.push('vedic-systems');
  }

  if (includeSomatic && hasAnySystem(lock, SOMATIC_SECTION.systems)) {
    tasks.push(createSectionTask('somatic-systems', SOMATIC_SECTION, targetTokensPerSection));
    sectionDeps.push('somatic-systems');
  }

  // Wave 2: Final synthesis
  if (sectionDeps.length > 0) {
    tasks.push({
      id: 'section-synthesis',
      perspective: 'section-synthesis',
      dependsOn: sectionDeps,
      targetTokens: synthesisTokens,
      temperature: 0.18,
      requiresGrounding: true,
      buildPrompts: (factLock, priorOutputs, grounding) => {
        return {
          system: buildSynthesisSystemPrompt(factLock, sectionDeps),
          user: buildSynthesisUserPrompt(priorOutputs, sectionDeps),
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
  targetTokens: number
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

## Your Role
Interpret the engine data for ${subjectName} through the lens of ${config.name}.
Focus ONLY on the systems in this section. Do not reference other systems.

## Systems in This Section
${config.focusAreas.map(f => `- ${f}`).join('\n')}

## Interpretation Guidelines
1. Start with the most significant patterns in THIS section
2. Reference specific data points from the FactLock
3. Use retrieved wisdom passages to ground your interpretation
4. Avoid speculation - only interpret what's present in the data
5. Write in second person ("You have...", "Your design shows...")
6. Be specific about numbers, gates, types, periods - cite them

## Output Format
Write a flowing interpretation (not bullet points) that covers:
1. Core configuration in this system
2. Current timing/transits if applicable
3. Key themes emerging from this section
4. Practical witness questions for self-inquiry

Do NOT include a section header - the synthesis will combine sections.`;
}

function buildSectionUserPrompt(
  config: SectionConfig, 
  lock: FactLock,
  grounding?: GroundedPassage[]
): string {
  const parts: string[] = [];
  
  parts.push(`Interpret the ${config.name} data for this subject.`);
  parts.push('');
  parts.push('## Engine Data Available');
  
  // List which engines have data
  const availableEngines = config.systems.filter(sys => {
    const engineData = (lock.facts as any)?.[sys] || (lock.facts as any)?.engines?.[sys];
    return engineData !== undefined;
  });
  
  parts.push(availableEngines.map(e => `- ${e}`).join('\n') || '(no engine data in this section)');
  
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
  parts.push('Provide your interpretation of this section now.');
  
  return parts.join('\n');
}

function buildSynthesisSystemPrompt(lock: FactLock, sectionDeps: string[]): string {
  const subjectName = lock.facts?.name || 'the subject';
  const sectionNames = sectionDeps.map(d => d.replace('-systems', '').replace('-', ' ')).join(', ');
  
  return `You are the master witness synthesizer integrating multiple consciousness systems.

## Your Role
Synthesize the section interpretations (${sectionNames}) into a unified witness report for ${subjectName}.

## Synthesis Guidelines
1. Do NOT repeat what the sections said - integrate and elevate
2. Find cross-system resonances and tensions
3. Identify the 2-3 most significant themes across ALL systems
4. Surface contradictions or paradoxes as inquiry points
5. End with 3-5 witness questions that span multiple systems
6. Write in second person, flowing prose

## Output Format
1. **Opening**: One paragraph capturing the essence of this moment
2. **Core Themes**: 2-3 integrated themes with cross-system evidence
3. **Tensions & Paradoxes**: Where systems seem to contradict (if any)
4. **Witness Questions**: Questions for self-inquiry`;
}

function buildSynthesisUserPrompt(
  priorOutputs: Record<string, string>,
  sectionDeps: string[]
): string {
  const parts: string[] = [];
  
  parts.push('Synthesize these section interpretations into a unified witness report:');
  parts.push('');
  
  for (const dep of sectionDeps) {
    const output = priorOutputs[dep];
    if (output) {
      const sectionName = dep.replace('-systems', '').toUpperCase();
      parts.push(`## ${sectionName} SECTION`);
      parts.push(output);
      parts.push('');
    }
  }
  
  parts.push('---');
  parts.push('Now synthesize these sections into one unified witness report.');
  
  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if FactLock contains data for any of the specified systems.
 */
function hasAnySystem(lock: FactLock, systems: string[]): boolean {
  const facts = lock.facts as Record<string, unknown>;
  if (!facts) return false;
  
  // Check direct keys
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
  
  return false;
}

/**
 * Get section configuration by perspective ID.
 */
export function getSectionConfig(perspective: SectionPerspective): SectionConfig | undefined {
  switch (perspective) {
    case 'western-systems':
      return WESTERN_SECTION;
    case 'vedic-systems':
      return VEDIC_SECTION;
    case 'somatic-systems':
      return SOMATIC_SECTION;
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
