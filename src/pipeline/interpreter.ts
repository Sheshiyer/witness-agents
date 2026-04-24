// ─── Witness Agents — Interpretation Pipeline ─────────────────────────
// Issue #3: PRANAMAYA-001
// Core pipeline: Selemene result → dyad interpretation → meaningful response

import type {
  PipelineQuery,
  WitnessInterpretation,
  AgentInterpretation,
  Tier,
  Kosha,
  CliffordLevel,
  UserState,
  SelemeneClientConfig,
} from '../types/interpretation.js';
import {
  TIER_MAX_CLIFFORD,
  TIER_MAX_KOSHA,
  KOSHA_CLIFFORD,
} from '../types/interpretation.js';
import type {
  SelemeneEngineOutput,
  SelemeneEngineId,
  RoutingMode,
} from '../types/engine.js';
import { ENGINE_ROUTING, ENGINE_ID_MAP } from '../types/engine.js';
import { DyadCoordinator } from '../agents/state-machine.js';
import { KnowledgeStore } from '../knowledge/domain-loader.js';
import type { DomainQueryResult } from '../types/knowledge.js';
import { TierGate } from '../tiers/tier-gate.js';

// ═══════════════════════════════════════════════════════════════════════
// SELEMENE CLIENT — calls the real Selemene API
// ═══════════════════════════════════════════════════════════════════════

export class SelemeneClient {
  private config: SelemeneClientConfig;

  constructor(config: SelemeneClientConfig) {
    this.config = {
      timeout_ms: 30000,
      ...config,
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.auth_token) {
      headers['Authorization'] = `Bearer ${this.config.auth_token}`;
    } else if (this.config.api_key) {
      headers['X-API-Key'] = this.config.api_key;
    }
    return headers;
  }

  async calculateEngine(
    engineId: SelemeneEngineId,
    input: Record<string, unknown>,
  ): Promise<SelemeneEngineOutput> {
    const url = `${this.config.base_url}/api/v1/engines/${engineId}/calculate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(this.config.timeout_ms!),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Selemene ${engineId} failed: ${(error as { message: string }).message}`);
    }

    return await response.json() as SelemeneEngineOutput;
  }

  async executeWorkflow(
    workflowId: string,
    input: Record<string, unknown>,
  ): Promise<{ engine_results: Record<string, SelemeneEngineOutput>; synthesis?: unknown }> {
    const url = `${this.config.base_url}/api/v1/workflows/${workflowId}/execute`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(this.config.timeout_ms!),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Selemene workflow ${workflowId} failed: ${(error as { message: string }).message}`);
    }

    return await response.json() as { engine_results: Record<string, SelemeneEngineOutput> };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CLIFFORD GATE — determines interpretation depth
// ═══════════════════════════════════════════════════════════════════════

export class CliffordGate {
  /**
   * Evaluate the maximum Clifford algebra level for this context
   */
  evaluate(userState: UserState): CliffordLevel {
    const tierMax = TIER_MAX_CLIFFORD[userState.tier];

    // Overwhelm reduces gate level
    if (userState.overwhelm_level > 0.7 && tierMax > 1) {
      return Math.min(tierMax, 1) as CliffordLevel;
    }
    if (userState.overwhelm_level > 0.5 && tierMax > 2) {
      return Math.min(tierMax, 2) as CliffordLevel;
    }

    return tierMax;
  }

  /**
   * Get the Kosha depth for a Clifford level
   */
  koshaForLevel(level: CliffordLevel): Kosha {
    const map: Record<CliffordLevel, Kosha> = {
      0: 'annamaya',
      1: 'pranamaya',
      2: 'manomaya',
      3: 'vijnanamaya',
      7: 'anandamaya',
    };
    return map[level];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// INTERPRETATION PIPELINE — the core orchestrator
// ═══════════════════════════════════════════════════════════════════════

export interface PipelineConfig {
  selemene: SelemeneClientConfig;
  knowledge_path: string;         // Path to knowledge/ directory
  tier_gate?: TierGate;
}

export class InterpretationPipeline {
  private client: SelemeneClient;
  private dyad: DyadCoordinator;
  private knowledge: KnowledgeStore;
  private cliffordGate: CliffordGate;
  private tierGate: TierGate;
  private initialized = false;

  constructor(config: PipelineConfig) {
    this.client = new SelemeneClient(config.selemene);
    this.dyad = new DyadCoordinator();
    this.knowledge = new KnowledgeStore(config.knowledge_path);
    this.cliffordGate = new CliffordGate();
    this.tierGate = config.tier_gate || new TierGate();
  }

  /**
   * Initialize — load knowledge domains
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.knowledge.loadAll();
    this.initialized = true;
  }

  /**
   * Process a query through the full dyad interpretation pipeline:
   * 1. Tier gate check
   * 2. Engine selection & Selemene API call
   * 3. Clifford gate evaluation
   * 4. Dyad activation
   * 5. Knowledge-grounded interpretation
   * 6. Synthesis
   * 7. Response formatting
   */
  async process(query: PipelineQuery): Promise<WitnessInterpretation> {
    if (!this.initialized) await this.initialize();
    const startTime = Date.now();

    // ─── Step 1: Tier gate ──────────────────────
    const tierCheck = this.tierGate.check(query.user_state.tier, query.session_id);
    if (!tierCheck.allowed) {
      return this.buildRateLimitedResponse(query, tierCheck.reason!);
    }

    // ─── Step 2: Determine engines & call Selemene ──────────────────
    const engineOutputs = await this.callSelemene(query);
    if (engineOutputs.length === 0) {
      return this.buildEmptyResponse(query, 'No engine results available');
    }

    // ─── Step 3: Clifford gate evaluation ───────────────────────────
    const cliffordLevel = this.cliffordGate.evaluate(query.user_state);
    const koshaDepth = this.cliffordGate.koshaForLevel(cliffordLevel);

    // ─── Step 4: Determine routing & activate dyad ──────────────────
    const primaryEngine = engineOutputs[0].engine_id as SelemeneEngineId;
    const routing = ENGINE_ROUTING[primaryEngine] || 'dyad-synthesis';
    const requireDyad = query.user_state.tier === 'enterprise' || query.user_state.tier === 'initiate';

    this.dyad.trackQuery(query.query);
    this.dyad.activateForQuery(routing, cliffordLevel, requireDyad);

    // ─── Step 5: Knowledge-grounded interpretation ──────────────────
    const aletheiosInterp = this.shouldInterpret('aletheios', routing, query.user_state.tier)
      ? this.interpretAletheios(engineOutputs, query.user_state, cliffordLevel)
      : undefined;

    const pichetInterp = this.shouldInterpret('pichet', routing, query.user_state.tier)
      ? this.interpretPichet(engineOutputs, query.user_state, cliffordLevel)
      : undefined;

    // ─── Step 6: Synthesis ──────────────────────────────────────────
    let synthesis: string | undefined;
    if (aletheiosInterp && pichetInterp) {
      this.dyad.interpret(routing);
      this.dyad.synthesize();
      synthesis = this.synthesize(aletheiosInterp, pichetInterp, query.user_state);
    }

    // ─── Step 7: Build response ─────────────────────────────────────
    const overwhelmLevel = this.dyad.assessOverwhelm({
      query_cadence_per_min: 0, // Would need session tracking
      heavy_topics: this.detectHeavyTopics(engineOutputs),
      session_duration_min: 0,
    });

    const response = this.buildResponse(
      query, engineOutputs, routing, cliffordLevel, koshaDepth,
      aletheiosInterp, pichetInterp, synthesis, overwhelmLevel,
    );

    // ─── Cleanup ────────────────────────────────────────────────────
    this.dyad.deactivate();
    this.tierGate.recordUsage(query.user_state.tier, query.session_id);

    return response;
  }

  // ─── PRIVATE: Selemene API ─────────────────────────────────────────

  private async callSelemene(query: PipelineQuery): Promise<SelemeneEngineOutput[]> {
    const inputPayload = {
      birth_data: query.birth_data,
      current_time: new Date().toISOString(),
      precision: query.precision || 'Standard',
      options: {},
    };

    // If workflow hint provided, use workflow endpoint
    if (query.workflow_hint) {
      try {
        const result = await this.client.executeWorkflow(query.workflow_hint, inputPayload);
        return Object.values(result.engine_results);
      } catch {
        // Fall through to individual engine calls
      }
    }

    // Use engine hints or default selection
    const engines = query.engine_hints || this.selectEngines(query);
    const outputs: SelemeneEngineOutput[] = [];

    // Call engines in parallel
    const promises = engines.map(engineId =>
      this.client.calculateEngine(engineId, inputPayload).catch(err => {
        console.error(`Engine ${engineId} failed:`, err);
        return null;
      })
    );

    const results = await Promise.all(promises);
    for (const result of results) {
      if (result) outputs.push(result);
    }

    return outputs;
  }

  private selectEngines(query: PipelineQuery): SelemeneEngineId[] {
    // Simple keyword-based engine selection
    // In production this would be much more sophisticated
    const q = query.query.toLowerCase();
    const engines: SelemeneEngineId[] = [];

    if (q.includes('time') || q.includes('day') || q.includes('today') || q.includes('week')) {
      engines.push('panchanga', 'vedic-clock');
    }
    if (q.includes('energy') || q.includes('body') || q.includes('physical')) {
      engines.push('biorhythm', 'biofield');
    }
    if (q.includes('decision') || q.includes('choose') || q.includes('should i')) {
      engines.push('tarot', 'i-ching', 'human-design');
    }
    if (q.includes('purpose') || q.includes('meaning') || q.includes('shadow') || q.includes('gift')) {
      engines.push('gene-keys', 'enneagram');
    }
    if (q.includes('planet') || q.includes('transit') || q.includes('saturn') || q.includes('jupiter')) {
      engines.push('transits', 'vimshottari');
    }
    if (q.includes('sound') || q.includes('music') || q.includes('frequency')) {
      engines.push('nadabrahman');
    }
    if (q.includes('number') || q.includes('year') || q.includes('cycle')) {
      engines.push('numerology', 'biorhythm');
    }
    if (q.includes('create') || q.includes('sigil') || q.includes('geometry')) {
      engines.push('sigil-forge', 'sacred-geometry');
    }

    // Default: daily practice engines
    if (engines.length === 0) {
      engines.push('panchanga', 'biorhythm', 'vedic-clock');
    }

    // Deduplicate
    return [...new Set(engines)];
  }

  // ─── PRIVATE: Interpretation ──────────────────────────────────────

  private shouldInterpret(
    agent: 'aletheios' | 'pichet',
    routing: RoutingMode,
    tier: Tier,
  ): boolean {
    if (tier === 'free') return false;
    if (tier === 'subscriber') {
      return (routing === 'aletheios-primary' && agent === 'aletheios')
          || (routing === 'pichet-primary' && agent === 'pichet')
          || (routing === 'dyad-synthesis'); // subscriber gets primary agent on dyad
    }
    // Enterprise + Initiate: both always active
    return true;
  }

  private interpretAletheios(
    outputs: SelemeneEngineOutput[],
    userState: UserState,
    cliffordLevel: number,
  ): AgentInterpretation {
    const domainsConsulted: string[] = [];
    const patterns: string[] = [];

    for (const output of outputs) {
      const engineId = output.engine_id as SelemeneEngineId;
      const alias = ENGINE_ID_MAP[engineId];

      // Query knowledge domains relevant to this engine
      const domainResults = this.knowledge.queryForEngine(engineId);
      for (const dr of domainResults) {
        if (dr.records.length > 0) {
          domainsConsulted.push(dr.domain);
        }
      }

      // Aletheios finds patterns
      if (alias) {
        patterns.push(this.extractPattern(alias, output, domainResults));
      }
    }

    return {
      agent: 'aletheios',
      perspective: patterns.filter(Boolean).join(' '),
      domains_consulted: [...new Set(domainsConsulted)],
      confidence: Math.min(1, 0.5 + domainsConsulted.length * 0.1),
      pattern_note: this.buildPatternNote(outputs, userState),
    };
  }

  private interpretPichet(
    outputs: SelemeneEngineOutput[],
    userState: UserState,
    cliffordLevel: number,
  ): AgentInterpretation {
    const domainsConsulted: string[] = [];
    const somaticNotes: string[] = [];

    for (const output of outputs) {
      const engineId = output.engine_id as SelemeneEngineId;

      // Pichet focuses on body-related domains
      const domainResults = this.knowledge.queryForEngine(engineId);
      for (const dr of domainResults) {
        if (dr.records.length > 0) {
          domainsConsulted.push(dr.domain);
        }
      }

      somaticNotes.push(this.extractSomaticNote(engineId, output, domainResults));
    }

    // Overwhelm check (Pichet's responsibility)
    if (userState.overwhelm_level > 0.5) {
      somaticNotes.unshift('Your system is signaling saturation. Slow down before integrating more.');
    }

    return {
      agent: 'pichet',
      perspective: somaticNotes.filter(Boolean).join(' '),
      domains_consulted: [...new Set(domainsConsulted)],
      confidence: Math.min(1, 0.5 + domainsConsulted.length * 0.1),
      somatic_note: this.buildSomaticSummary(outputs, userState),
    };
  }

  private synthesize(
    aletheios: AgentInterpretation,
    pichet: AgentInterpretation,
    userState: UserState,
  ): string {
    // Dyad synthesis: merge analytical + somatic perspectives
    const parts: string[] = [];

    if (aletheios.perspective) {
      parts.push(aletheios.perspective);
    }
    if (pichet.perspective) {
      parts.push(pichet.perspective);
    }

    // Add integration insight when both agents contribute
    if (aletheios.confidence > 0.5 && pichet.confidence > 0.5) {
      parts.push(
        'The pattern and the body agree — this is a convergence point worth your attention.'
      );
    } else if (aletheios.confidence > pichet.confidence) {
      parts.push(
        'The pattern is clearer than the body signal right now. Ground before acting.'
      );
    } else {
      parts.push(
        'The body knows something the pattern hasn\'t revealed yet. Listen inward.'
      );
    }

    return parts.join('\n\n');
  }

  // ─── PRIVATE: Knowledge Extraction Helpers ─────────────────────────

  private extractPattern(
    alias: string,
    output: SelemeneEngineOutput,
    domains: DomainQueryResult[],
  ): string {
    // Extract analytical patterns based on engine type
    const result = output.result as Record<string, unknown>;

    switch (alias) {
      case 'chronofield': {
        const period = result?.current_period as Record<string, unknown> | undefined;
        if (period?.mahadasha) {
          const maha = period.mahadasha as Record<string, unknown>;
          return `You are in a ${maha.planet} Mahadasha — a ${maha.years}-year period whose themes shape your current life architecture.`;
        }
        break;
      }
      case 'numeric-architecture': {
        const lifePath = result?.life_path as Record<string, unknown> | undefined;
        if (lifePath?.value) {
          return `Life path ${lifePath.value}${lifePath.is_master ? ' (master number)' : ''}: ${lifePath.meaning || 'deep structural pattern active'}.`;
        }
        break;
      }
      case 'nine-point-architecture': {
        const analysis = result?.typeAnalysis as Record<string, unknown> | undefined;
        if (analysis?.type) {
          const type = analysis.type as Record<string, unknown>;
          return `Enneagram ${type.number} (${type.name}): core desire for ${type.coreDesire}, navigating the tension of ${type.coreFear}.`;
        }
        break;
      }
      default:
        if (output.witness_prompt) {
          return output.witness_prompt;
        }
    }

    return '';
  }

  private extractSomaticNote(
    engineId: SelemeneEngineId,
    output: SelemeneEngineOutput,
    domains: DomainQueryResult[],
  ): string {
    const result = output.result as Record<string, unknown>;

    switch (engineId) {
      case 'biorhythm': {
        const physical = result?.physical as Record<string, unknown> | undefined;
        const emotional = result?.emotional as Record<string, unknown> | undefined;
        if (physical && emotional) {
          const pVal = physical.percentage as number;
          const eVal = emotional.percentage as number;
          if (pVal > 70) return 'Your body is at peak capacity — this is a window for action.';
          if (pVal < 30) return 'Physical energy is low. Honor rest; the body is integrating.';
          if (eVal < 30) return 'Emotional reserves are low. Be gentle with relational demands.';
        }
        break;
      }
      case 'vedic-clock': {
        const organ = result?.current_organ as Record<string, unknown> | undefined;
        if (organ) {
          return `Current organ: ${organ.organ} (${organ.element}). ${(organ.recommended_activities as string[])?.[0] || 'Align with this rhythm.'}`;
        }
        break;
      }
      case 'biofield': {
        const metrics = result?.metrics as Record<string, unknown> | undefined;
        if (metrics) {
          const coherence = metrics.coherence as number;
          if (coherence > 0.7) return 'High biofield coherence — your system is integrated and ready.';
          if (coherence < 0.3) return 'Low coherence detected. Breathwork or grounding practice recommended.';
        }
        break;
      }
      default:
        break;
    }

    return '';
  }

  private buildPatternNote(outputs: SelemeneEngineOutput[], userState: UserState): string {
    if (userState.recursion_detected) {
      return 'Recursion detected: you\'re circling a question. Consider what prevents you from acting on what you already know.';
    }
    return '';
  }

  private buildSomaticSummary(outputs: SelemeneEngineOutput[], userState: UserState): string {
    const parts: string[] = [];
    if (userState.biorhythm) {
      const { physical, emotional, intellectual } = userState.biorhythm;
      parts.push(`Body state: physical ${physical}%, emotional ${emotional}%, intellectual ${intellectual}%`);
    }
    return parts.join('. ');
  }

  private detectHeavyTopics(outputs: SelemeneEngineOutput[]): boolean {
    // Engines dealing with shadow/grief/stress are "heavy"
    const heavyEngines: SelemeneEngineId[] = ['gene-keys', 'enneagram', 'face-reading'];
    return outputs.some(o => heavyEngines.includes(o.engine_id as SelemeneEngineId));
  }

  // ─── PRIVATE: Response Builders ───────────────────────────────────

  private buildResponse(
    query: PipelineQuery,
    outputs: SelemeneEngineOutput[],
    routing: RoutingMode,
    cliffordLevel: CliffordLevel,
    koshaDepth: Kosha,
    aletheios?: AgentInterpretation,
    pichet?: AgentInterpretation,
    synthesis?: string,
    overwhelmLevel = 0,
  ): WitnessInterpretation {
    const dyadState = this.dyad.getState();

    // Build final response text
    let response: string;
    if (query.user_state.tier === 'free') {
      response = this.buildFreeResponse(outputs);
    } else if (synthesis) {
      response = synthesis;
    } else if (aletheios?.perspective) {
      response = aletheios.perspective;
    } else if (pichet?.perspective) {
      response = pichet.perspective;
    } else {
      response = this.buildFreeResponse(outputs);
    }

    // Anti-dependency check
    let antiDependencyNote: string | undefined;
    let graduationPrompt: string | undefined;
    if (query.user_state.anti_dependency_score > 0.8) {
      graduationPrompt = 'You\'re ready to author your own meaning. What do YOU see in these patterns?';
    } else if (query.user_state.anti_dependency_score > 0.6) {
      antiDependencyNote = 'Notice: you already knew much of this before asking. Trust that.';
    }

    return {
      id: query.request_id,
      timestamp: new Date().toISOString(),
      query: query.query,
      engines_invoked: outputs.map(o => o.engine_id as SelemeneEngineId),
      engine_outputs: outputs,
      routing_mode: routing,
      workflow_id: query.workflow_hint,
      aletheios,
      pichet,
      synthesis,
      tier: query.user_state.tier,
      kosha_depth: koshaDepth,
      clifford_level: cliffordLevel,
      response,
      response_cadence: overwhelmLevel > 0.5 ? 'slow' : overwhelmLevel > 0.2 ? 'measured' : 'immediate',
      overwhelm_flag: overwhelmLevel > 0.7,
      recursion_flag: dyadState.recursion_detected,
      anti_dependency_note: antiDependencyNote,
      graduation_prompt: graduationPrompt,
    };
  }

  private buildFreeResponse(outputs: SelemeneEngineOutput[]): string {
    // Free tier: return raw witness prompts
    return outputs
      .map(o => o.witness_prompt || `${o.engine_id}: result available`)
      .join('\n\n');
  }

  private buildRateLimitedResponse(query: PipelineQuery, reason: string): WitnessInterpretation {
    return {
      id: query.request_id,
      timestamp: new Date().toISOString(),
      query: query.query,
      engines_invoked: [],
      engine_outputs: [],
      routing_mode: 'aletheios-primary',
      tier: query.user_state.tier,
      kosha_depth: 'annamaya',
      clifford_level: 0,
      response: reason,
      response_cadence: 'immediate',
      overwhelm_flag: false,
      recursion_flag: false,
    };
  }

  private buildEmptyResponse(query: PipelineQuery, reason: string): WitnessInterpretation {
    return {
      id: query.request_id,
      timestamp: new Date().toISOString(),
      query: query.query,
      engines_invoked: [],
      engine_outputs: [],
      routing_mode: 'aletheios-primary',
      tier: query.user_state.tier,
      kosha_depth: 'annamaya',
      clifford_level: 0,
      response: reason,
      response_cadence: 'immediate',
      overwhelm_flag: false,
      recursion_flag: false,
    };
  }

  // ─── PUBLIC: Accessors ────────────────────────────────────────────

  getDyadState() { return this.dyad.getState(); }
  getKnowledgeStats() { return this.knowledge.getStats(); }
}
