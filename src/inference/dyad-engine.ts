// ─── Witness Agents — Dyad Inference Engine ───────────────────────────
// Orchestrates LLM calls for Aletheios + Pichet + Synthesis.
// Takes pipeline output + voice prompts → calls LLM → returns interpreted text.

import type {
  InferenceRequest,
  InferenceResponse,
  DyadInferenceResult,
  InferenceMessage,
  ModelRole,
} from './types.js';
import type { OpenRouterProvider } from './openrouter.js';
import type {
  WitnessInterpretation,
  Tier,
  UserState,
} from '../types/interpretation.js';
import type { SelemeneEngineOutput } from '../types/engine.js';
import type { VoicePrompt } from '../agents/voice-prompts.js';
import { VoicePromptBuilder } from '../agents/voice-prompts.js';
import type { AksharaEnrichment } from './akshara-enrichment.js';

// ═══════════════════════════════════════════════════════════════════════
// DYAD INFERENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════

export interface DyadInferenceConfig {
  parallel_agents?: boolean;   // Call Aletheios + Pichet in parallel (default: true)
  include_synthesis?: boolean; // Run synthesis pass (default: true for enterprise+)
  stream?: boolean;            // Future: streaming support
  aksharaEnrichment?: AksharaEnrichment; // Optional: AKSHARA mirror enrichment for initiate tier
}

export class DyadInferenceEngine {
  private provider: OpenRouterProvider;
  private voiceBuilder: VoicePromptBuilder;
  private aksharaEnrichment?: AksharaEnrichment;
  private defaults: Omit<Required<DyadInferenceConfig>, 'aksharaEnrichment'>;

  constructor(provider: OpenRouterProvider, config?: DyadInferenceConfig) {
    this.provider = provider;
    this.voiceBuilder = new VoicePromptBuilder();
    this.aksharaEnrichment = config?.aksharaEnrichment;
    this.defaults = {
      parallel_agents: config?.parallel_agents ?? true,
      include_synthesis: config?.include_synthesis ?? true,
      stream: config?.stream ?? false,
    };
  }

  /**
   * Run full dyad inference: voice prompts → LLM → structured result.
   * 
   * For subscriber: single agent (aletheios OR pichet based on routing).
   * For enterprise+: both agents in parallel, then synthesis.
   */
  async infer(
    interpretation: WitnessInterpretation,
    userState: UserState,
    engineOutputs: SelemeneEngineOutput[],
    options?: Partial<DyadInferenceConfig>,
  ): Promise<DyadInferenceResult> {
    const tier = interpretation.tier;
    const config = { ...this.defaults, ...options };
    const startTime = Date.now();

    // Build user message from engine data
    const userMessage = this.buildUserMessage(interpretation, engineOutputs);

    // Determine which agents to invoke
    const runAletheios = tier !== 'free' && !!interpretation.aletheios;
    const runPichet = tier !== 'free' && !!interpretation.pichet;
    const runSynthesis = config.include_synthesis
      && (tier === 'enterprise' || tier === 'initiate')
      && runAletheios && runPichet;

    let aletheiosRes: InferenceResponse | undefined;
    let pichetRes: InferenceResponse | undefined;
    let synthesisRes: InferenceResponse | undefined;

    // ─── Agent Calls ────────────────────────────────────────────────
    if (runAletheios && runPichet && config.parallel_agents) {
      // Parallel: both agents at once
      const [aRes, pRes] = await Promise.all([
        this.callAgent('aletheios', tier, userState, userMessage, engineOutputs, interpretation),
        this.callAgent('pichet', tier, userState, userMessage, engineOutputs, interpretation),
      ]);
      aletheiosRes = aRes;
      pichetRes = pRes;
    } else {
      // Sequential or single-agent
      if (runAletheios) {
        aletheiosRes = await this.callAgent('aletheios', tier, userState, userMessage, engineOutputs, interpretation);
      }
      if (runPichet) {
        pichetRes = await this.callAgent('pichet', tier, userState, userMessage, engineOutputs, interpretation);
      }
    }

    // ─── Synthesis Call ─────────────────────────────────────────────
    if (runSynthesis && aletheiosRes && pichetRes) {
      synthesisRes = await this.callSynthesis(
        tier, userState,
        aletheiosRes.content,
        pichetRes.content,
      );
    }

    const totalLatency = Date.now() - startTime;
    const totalCost = (aletheiosRes?.cost_estimate_usd || 0)
      + (pichetRes?.cost_estimate_usd || 0)
      + (synthesisRes?.cost_estimate_usd || 0);

    return {
      aletheios: aletheiosRes,
      pichet: pichetRes,
      synthesis: synthesisRes,
      total_cost_usd: totalCost,
      total_latency_ms: totalLatency,
    };
  }

  /**
   * Quick single-agent call (for subscriber tier or targeted questions).
   */
  async inferSingle(
    agent: 'aletheios' | 'pichet',
    tier: Tier,
    userState: UserState,
    interpretation: WitnessInterpretation,
    engineOutputs: SelemeneEngineOutput[],
  ): Promise<InferenceResponse> {
    const userMessage = this.buildUserMessage(interpretation, engineOutputs);
    return this.callAgent(agent, tier, userState, userMessage, engineOutputs, interpretation);
  }

  // ─── Private: Agent LLM Call ──────────────────────────────────────

  private async callAgent(
    agent: 'aletheios' | 'pichet',
    tier: Tier,
    userState: UserState,
    userMessage: string,
    engineOutputs: SelemeneEngineOutput[],
    interpretation?: WitnessInterpretation,
  ): Promise<InferenceResponse> {
    // Build voice prompt (system message)
    const voicePrompt = this.voiceBuilder.buildAgentPrompt({
      agent,
      tier,
      userState,
      engineOutputs,
    });

    const role: ModelRole = agent;
    let messages: InferenceMessage[] = [
      { role: 'system', content: voicePrompt.system },
      { role: 'user', content: userMessage },
    ];

    // ─── AKSHARA enrichment (initiate tier only) ─────────────────
    if (this.aksharaEnrichment && interpretation) {
      messages = this.aksharaEnrichment.enrichMessages(messages, interpretation, tier);
    }

    return this.provider.completeWithRetry({
      messages,
      model_role: role,
      tier,
      metadata: { agent, session: 'witness-dyad' },
    });
  }

  // ─── Private: Synthesis LLM Call ──────────────────────────────────

  private async callSynthesis(
    tier: Tier,
    userState: UserState,
    aletheiosInsight: string,
    pichetInsight: string,
  ): Promise<InferenceResponse> {
    const synthPrompt = this.voiceBuilder.buildSynthesisPrompt({
      tier,
      userState,
      aletheiosInsight,
      pichetInsight,
    });

    const messages: InferenceMessage[] = [
      { role: 'system', content: synthPrompt.system },
      { role: 'user', content: `Aletheios speaks:\n${aletheiosInsight}\n\nPichet speaks:\n${pichetInsight}\n\nNow synthesize these perspectives into a unified witness for the user.` },
    ];

    return this.provider.completeWithRetry({
      messages,
      model_role: 'synthesis',
      tier,
      metadata: { agent: 'dyad', session: 'witness-synthesis' },
    });
  }

  // ─── Private: Build User Message from Engine Data ─────────────────

  private buildUserMessage(
    interpretation: WitnessInterpretation,
    engineOutputs: SelemeneEngineOutput[],
  ): string {
    const parts: string[] = [];

    parts.push(`Query: "${interpretation.query}"`);
    parts.push(`Engines: ${interpretation.engines_invoked.join(', ')}`);
    parts.push(`Kosha depth: ${interpretation.kosha_depth} (Clifford level: ${interpretation.clifford_level})`);

    // Include extracted patterns from the pipeline
    if (interpretation.aletheios?.perspective) {
      parts.push(`\nPattern analysis:\n${interpretation.aletheios.perspective}`);
    }
    if (interpretation.pichet?.perspective) {
      parts.push(`\nSomatic reading:\n${interpretation.pichet.perspective}`);
    }
    if (interpretation.synthesis) {
      parts.push(`\nPreliminary synthesis:\n${interpretation.synthesis}`);
    }

    // Include raw witness_prompts from Selemene for deeper context
    for (const output of engineOutputs) {
      if (output.witness_prompt) {
        parts.push(`\n[${output.engine_id}] witness prompt:\n${output.witness_prompt}`);
      }
    }

    return parts.join('\n');
  }
}
