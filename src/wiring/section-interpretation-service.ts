// src/wiring/section-interpretation-service.ts
// Production factory for section-by-section interpretation with RAG grounding.
//
// Architecture:
//   - NVIDIA baai/bge-m3 for embeddings (vectorize grounding)
//   - OpenAI GPT-4o for LLM inference (clean output, no reasoning chain)
//   - Cloudflare Vectorize for wisdom + engine data retrieval
//   - Section-witness graph for parallel Temporal/Structural/Somatic/Oracle → Layer Synthesis
//
// Usage:
//   const service = createSectionInterpretationService({
//     openaiApiKey: process.env.OPENAI_API_KEY,
//     nvidiaApiKey: process.env.NVIDIA_API_KEY,
//   });
//
//   const result = await service.interpretSubject(selemeneOutput, { mode: 'section' });

import type {
  AtomicTask,
  FactLock,
  TaskResult,
  GroundingProvider,
  GroundedPassage,
} from '@witness/orchestration';
import {
  InProcessWitnessOrchestrationService,
  createFactLock,
  VectorizeGroundingProvider,
} from '@witness/orchestration';
import { createSectionWitnessGraph } from './graphs/section-witness.js';
import { NvidiaEmbeddingProvider } from '../inference/nvidia-embedding.js';
import { createWitnessInferenceExecutor } from './inference-adapter.js';
import type { Tier } from '../types/interpretation.js';

export interface SectionInterpretationConfig {
  /** OpenAI API key (for LLM inference) */
  openaiApiKey?: string;
  /** NVIDIA API key (for embeddings) */
  nvidiaApiKey: string;
  /** Vectorize index name (default: witness-wisdom-corpus) */
  vectorizeIndex?: string;
  /** Minimum relevance score for grounding (default: 0.65) */
  minRelevance?: number;
  /** Max parallel tasks (default: 3) */
  maxParallel?: number;
  /** Target tier for model routing (default: subscriber) */
  tier?: Tier;
  /** Timeout for LLM calls in ms (default: 60000) */
  timeoutMs?: number;
  /** Whether to use section-by-section or one-shot mode */
  mode?: 'section' | 'oneshot';
}

export interface SubjectData {
  /** Subject identifier */
  subjectId: string;
  /** Subject display name */
  subjectName: string;
  /** Engine outputs from Selemene */
  engineData: Record<string, any>;
  /** Optional additional facts */
  extraFacts?: Record<string, any>;
}

export interface InterpretationResult {
  /** The final interpreted text */
  output: string;
  /** Individual task results */
  taskResults: TaskResult[];
  /** Number of repair iterations performed */
  repairIterations: number;
  /** Any contradictions found */
  contradictions: Array<{ description: string }>;
  /** Total tokens consumed */
  tokensUsed?: number;
  /** Grounding passages retrieved per task */
  groundingStats: Record<string, { count: number; avgScore: number }>;
}

// ═══════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create a production-ready section interpretation service.
 *
 * Combines:
 * - NVIDIA baai/bge-m3 embeddings → Vectorize grounding
 * - OpenAI GPT-4o (or configured provider) → LLM inference
 * - Section-witness graph → parallel interpretation
 */
export function createSectionInterpretationService(
  config: SectionInterpretationConfig
): SectionInterpretationService {
  const {
    openaiApiKey,
    nvidiaApiKey,
    vectorizeIndex = 'witness-wisdom-corpus',
    minRelevance = 0.65,
    maxParallel = 3,
    tier = 'subscriber',
    timeoutMs = 60_000,
    mode = 'section',
  } = config;

  // 1. Embedding provider (NVIDIA)
  const embeddingProvider = new NvidiaEmbeddingProvider({
    api_key: nvidiaApiKey,
  });

  // 2. Grounding provider (Vectorize)
  const groundingProvider = new VectorizeGroundingProvider({
    indexName: vectorizeIndex,
    embeddingProvider,
    topK: 6,
    minScore: minRelevance,
  });

  // 3. LLM executor (OpenAI preferred, fallback to NVIDIA NIM)
  const provider = openaiApiKey ? 'openai' : 'nvidia';
  const executor = createWitnessInferenceExecutor({
    tier,
    provider,
    openai_api_key: openaiApiKey,
    nvidia_api_key: nvidiaApiKey,
    timeout_ms: timeoutMs,
  });

  // 4. Orchestration service
  const service = new InProcessWitnessOrchestrationService(executor, {
    defaultMaxParallel: maxParallel,
    defaultMaxRepairIterations: 1,
    groundingProvider,
    defaultMinRelevance: minRelevance,
  });

  return new SectionInterpretationService(service, groundingProvider, mode);
}

// ═══════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════

export class SectionInterpretationService {
  private groundingStats: Record<string, { count: number; avgScore: number }> = {};

  constructor(
    private orchestrationService: InProcessWitnessOrchestrationService,
    private groundingProvider: GroundingProvider,
    private defaultMode: 'section' | 'oneshot' = 'section'
  ) {}

  /**
   * Interpret a subject's engine data.
   *
   * @param data - Subject data with engine outputs
   * @param options - Optional overrides
   */
  async interpretSubject(
    data: SubjectData,
    options?: {
      mode?: 'section' | 'oneshot';
      maxParallel?: number;
      extraTasks?: AtomicTask[];
    }
  ): Promise<InterpretationResult> {
    const mode = options?.mode || this.defaultMode;

    // 1. Build FactLock from engine data
    const factLock = this.buildFactLock(data);

    // 2. Build task graph
    const tasks = mode === 'section'
      ? createSectionWitnessGraph(factLock)
      : this.createOneShotGraph(factLock);

    // Add any extra tasks
    if (options?.extraTasks) {
      tasks.push(...options.extraTasks);
    }

    // 3. Execute
    const response = await this.orchestrationService.orchestrate({
      factLock,
      tasks,
      options: {
        maxParallel: options?.maxParallel || 3,
        groundingProvider: this.groundingProvider,
      },
    });

    // 4. Collect stats
    const totalTokens = response.taskResults.reduce(
      (sum, r) => sum + (r.tokensUsed || 0),
      0
    );

    return {
      output: response.output,
      taskResults: response.taskResults,
      repairIterations: response.repairIterations,
      contradictions: response.contradictions,
      tokensUsed: totalTokens,
      groundingStats: { ...this.groundingStats },
    };
  }

  /**
   * Interpret a subject from raw Selemene JSON output.
   * Convenience method that handles JSON parsing and FactLock building.
   */
  async interpretFromJSON(
    jsonData: Record<string, any>,
    subjectId: string,
    options?: {
      mode?: 'section' | 'oneshot';
      maxParallel?: number;
    }
  ): Promise<InterpretationResult> {
    // Convert array format to object format if needed
    let engineData: Record<string, any>;
    if (Array.isArray(jsonData)) {
      engineData = {};
      for (const entry of jsonData) {
        if (entry.engine_id || entry.engine) {
          engineData[entry.engine_id || entry.engine] = entry;
        }
      }
    } else {
      engineData = jsonData;
    }

    return this.interpretSubject({
      subjectId: subjectId.replace(/\s+/g, '-').toLowerCase(),
      subjectName: subjectId,
      engineData,
    }, options);
  }

  // ─── Private helpers ─────────────────────────────────────────────────

  private buildFactLock(data: SubjectData): FactLock {
    const facts: Record<string, any> = {
      name: data.subjectName,
      ...data.extraFacts,
    };

    const sources: Record<string, string> = {
      name: 'user-input',
    };

    // Extract key facts from engine data
    for (const [engineId, output] of Object.entries(data.engineData)) {
      const result = output.result || output;

      if (engineId === 'human-design' && result) {
        facts.hd_type = result.type;
        facts.hd_authority = result.authority;
        facts.hd_profile = result.profile;
        facts.hd_definition = result.definition;
        sources.hd_type = 'selemene/human-design';
        sources.hd_authority = 'selemene/human-design';
        sources.hd_profile = 'selemene/human-design';
        sources.hd_definition = 'selemene/human-design';
      }

      if (engineId === 'gene-keys' && result) {
        const activation = result.activation_sequence;
        if (activation) {
          facts.gk_life_work = activation.life_work?.gate;
          facts.gk_evolution = activation.evolution?.gate;
          facts.gk_radiance = activation.radiance?.gate;
          facts.gk_purpose = activation.purpose?.gate;
          sources.gk_life_work = 'selemene/gene-keys';
          sources.gk_evolution = 'selemene/gene-keys';
          sources.gk_radiance = 'selemene/gene-keys';
          sources.gk_purpose = 'selemene/gene-keys';
        }
      }

      if (engineId === 'vimshottari' && result) {
        const currentPeriod = result.current_period;
        if (currentPeriod) {
          const maha = currentPeriod.mahadasha;
          const antar = currentPeriod.antardasha;
          if (maha) {
            facts.vimshottari_mahadasha = maha.planet;
            sources.vimshottari_mahadasha = 'selemene/vimshottari';
          }
          if (antar) {
            facts.vimshottari_antardasha = antar.planet;
            sources.vimshottari_antardasha = 'selemene/vimshottari';
          }
        }
      }

      if (engineId === 'panchanga' && result) {
        facts.panchanga_tithi = result.tithi_name;
        facts.panchanga_nakshatra = result.nakshatra_name;
        facts.panchanga_vara = result.vara_name;
        facts.panchanga_yoga = result.yoga_name;
        facts.panchanga_karana = result.karana_name;
        sources.panchanga_tithi = 'selemene/panchanga';
        sources.panchanga_nakshatra = 'selemene/panchanga';
        sources.panchanga_vara = 'selemene/panchanga';
      }
    }

    const lock = createFactLock({
      subjectId: data.subjectId,
      subject: data.subjectName,
      facts,
      sources,
    });

    // Add engine data for prompt building
    const formattedEngineData: Record<string, string> = {};
    for (const [engineId, output] of Object.entries(data.engineData)) {
      formattedEngineData[engineId] = JSON.stringify(
        output.result || output,
        null,
        2
      );
    }

    return {
      ...lock,
      engineData: formattedEngineData,
    } as FactLock;
  }

  private createOneShotGraph(lock: FactLock): AtomicTask[] {
    // Simple one-shot interpretation graph
    return [{
      id: 'oneshot-interpretation',
      perspective: 'unified',
      dependsOn: [],
      targetTokens: 4000,
      temperature: 0.2,
      requiresGrounding: true,
      buildPrompts: (factLock) => {
        const subjectName = factLock.facts?.name || 'the subject';

        let engineContext = '\n## Engine Outputs\n';
        for (const [engineId, data] of Object.entries(factLock.engineData || {})) {
          const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
          const truncated = serialized.length > 2000 ? serialized.slice(0, 2000) + '...' : serialized;
          engineContext += `\n### ${engineId}\n\`\`\`json\n${truncated}\n\`\`\`\n`;
        }

        return {
          system: `You are a consciousness witness interpreter providing a unified reading for ${subjectName}.\n\nSynthesize insights from all available engine data into a cohesive interpretation. Be specific, cite data points, and write in second person.`,
          user: `Please provide a unified consciousness interpretation.${engineContext}\n\nBegin with the most significant patterns and weave together insights from all available systems.`,
        };
      },
    }];
  }
}
