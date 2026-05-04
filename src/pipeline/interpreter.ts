// ─── Witness Agents — Interpretation Pipeline ─────────────────────────
// Issue #3: PRANAMAYA-001 (Refined: Waves 1-3 integration)
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
  WitnessEngineAlias,
} from '../types/engine.js';
import { ENGINE_ROUTING, ENGINE_ID_MAP } from '../types/engine.js';
import { DyadCoordinator } from '../agents/state-machine.js';
import { KnowledgeStore } from '../knowledge/domain-loader.js';
import type { DomainQueryResult } from '../types/knowledge.js';
import { TierGate } from '../tiers/tier-gate.js';
import { SynthesisEngine } from './synthesis.js';
import type { SynthesisResult } from './synthesis.js';
import { VoicePromptBuilder } from '../agents/voice-prompts.js';
import { AntiDependencyTracker } from '../agents/anti-dependency.js';

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
  knowledge_path: string;
  tier_gate?: TierGate;
}

export interface ResolvedOutputOptions {
  record_usage?: boolean;
}

export class InterpretationPipeline {
  private client: SelemeneClient;
  private dyad: DyadCoordinator;
  private knowledge: KnowledgeStore;
  private cliffordGate: CliffordGate;
  private tierGate: TierGate;
  private synthesisEngine: SynthesisEngine;
  private voiceBuilder: VoicePromptBuilder;
  private antiDep: AntiDependencyTracker;
  private initialized = false;

  constructor(config: PipelineConfig) {
    this.client = new SelemeneClient(config.selemene);
    this.dyad = new DyadCoordinator();
    this.knowledge = new KnowledgeStore(config.knowledge_path);
    this.cliffordGate = new CliffordGate();
    this.tierGate = config.tier_gate || new TierGate();
    this.synthesisEngine = new SynthesisEngine();
    this.voiceBuilder = new VoicePromptBuilder();
    this.antiDep = new AntiDependencyTracker();
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

    // ─── Step 1: Tier gate ──────────────────────
    const tierCheck = this.tierGate.check(query.user_state.tier, query.session_id);
    if (!tierCheck.allowed) {
      return this.buildRateLimitedResponse(query, tierCheck.reason!);
    }

    // ─── Step 2: Determine engines & call Selemene ──────────────────
    const engineOutputs = await this.callSelemene(query);
    return this.processResolvedOutputs(query, engineOutputs);
  }

  /**
   * Process a query using already-fetched engine outputs.
   * This is the seam used by standalone proxy paths so they can reuse the
   * deterministic dyad pipeline without re-calling Selemene.
   */
  async processResolvedOutputs(
    query: PipelineQuery,
    engineOutputs: SelemeneEngineOutput[],
    options: ResolvedOutputOptions = {},
  ): Promise<WitnessInterpretation> {
    if (!this.initialized) await this.initialize();
    if (engineOutputs.length === 0) {
      return this.buildEmptyResponse(query, 'No engine results available');
    }

    const recordUsage = options.record_usage ?? true;

    // ─── Step 3: Clifford gate evaluation ───────────────────────────
    const cliffordLevel = this.cliffordGate.evaluate(query.user_state);
    const koshaDepth = this.cliffordGate.koshaForLevel(cliffordLevel);

    // ─── Step 4: Determine routing & activate dyad ──────────────────
    const primaryEngine = engineOutputs[0].engine_id as SelemeneEngineId;
    const routing = ENGINE_ROUTING[primaryEngine] || 'dyad-synthesis';
    const requireDyad = query.user_state.tier === 'enterprise' || query.user_state.tier === 'initiate';

    this.dyad.trackQuery(query.query);
    this.dyad.activateForQuery(routing, cliffordLevel, requireDyad);

    try {
      // ─── Step 5: Anti-dependency tracking ──────────────────────────
      this.antiDep.startSession(query.session_id);
      this.antiDep.recordQuery(
        query.query,
        query.user_state,
        engineOutputs.map(o => o.engine_id),
      );

      // ─── Step 6: Knowledge-grounded interpretation ────────────────
      const aletheiosInterp = this.shouldInterpret('aletheios', routing, query.user_state.tier)
        ? this.interpretAletheios(engineOutputs, query.user_state, cliffordLevel)
        : undefined;

      const pichetInterp = this.shouldInterpret('pichet', routing, query.user_state.tier)
        ? this.interpretPichet(engineOutputs, query.user_state, cliffordLevel)
        : undefined;

      // ─── Step 7: Synthesis (use SynthesisEngine for enterprise+) ──
      let synthesis: string | undefined;
      if (aletheiosInterp && pichetInterp) {
        this.dyad.interpret(routing);
        this.dyad.synthesize();

        if (requireDyad && engineOutputs.length >= 2) {
          const synthResult = this.synthesisEngine.synthesize(
            engineOutputs,
            query.user_state,
            this.knowledge,
            undefined,
            cliffordLevel,
          );
          synthesis = synthResult.unified_narrative;
        } else {
          synthesis = this.synthesize(aletheiosInterp, pichetInterp, query.user_state, engineOutputs);
        }

        synthesis = this.applyWitnessPromptGuard(engineOutputs, synthesis);
      }

      // ─── Step 8: Build response ───────────────────────────────────
      const overwhelmLevel = this.dyad.assessOverwhelm({
        query_cadence_per_min: 0,
        heavy_topics: this.detectHeavyTopics(engineOutputs),
        session_duration_min: 0,
      });

      const response = this.buildResponse(
        query,
        engineOutputs,
        routing,
        cliffordLevel,
        koshaDepth,
        aletheiosInterp,
        pichetInterp,
        synthesis,
        overwhelmLevel,
      );

      // ─── Step 9: Generate voice prompts (attach for downstream LLM) ─
      if (requireDyad) {
        (response as any).voice_prompts = {
          aletheios: this.voiceBuilder.buildAgentPrompt({
            agent: 'aletheios',
            tier: query.user_state.tier,
            userState: query.user_state,
            engineOutputs,
          }),
          pichet: this.voiceBuilder.buildAgentPrompt({
            agent: 'pichet',
            tier: query.user_state.tier,
            userState: query.user_state,
            engineOutputs,
          }),
        };
      }

      if (recordUsage) {
        this.tierGate.recordUsage(query.user_state.tier, query.session_id);
      }

      return response;
    } finally {
      this.dyad.deactivate();
    }
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

      // Aletheios finds patterns (use alias if available, else pass engineId as-is)
      const resolvedAlias = alias || engineId;
      patterns.push(this.extractPattern(resolvedAlias, output, domainResults));
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
    outputs: SelemeneEngineOutput[],
  ): string {
    // Dyad synthesis: merge analytical + somatic perspectives
    const parts: string[] = [];

    if (aletheios.perspective) {
      parts.push(aletheios.perspective);
    }
    if (pichet.perspective) {
      parts.push(pichet.perspective);
    }

    const integrationInsight = this.buildIntegrationInsight(outputs, userState);
    if (integrationInsight) {
      parts.push(integrationInsight);
    }

    return parts.join('\n\n');
  }

  // ─── PRIVATE: Knowledge Extraction Helpers ─────────────────────────

  private extractPattern(
    alias: string,
    output: SelemeneEngineOutput,
    domains: DomainQueryResult[],
  ): string {
    const result = output.result as Record<string, any>;
    if (!result) return output.witness_prompt || '';

    switch (alias) {
      // ─── Vimshottari / Chronofield ────────────────────
      case 'chronofield': {
        const period = result?.current_period;
        if (period?.mahadasha) {
          const m = period.mahadasha;
          return `You are in a ${m.planet} Mahadasha — a ${m.years}-year period whose themes shape your current life architecture.`;
        }
        break;
      }

      // ─── Numerology / Numeric Architecture ────────────
      case 'numeric-architecture': {
        const lp = result?.life_path;
        const expr = result?.expression;
        const soul = result?.soul_urge;
        const parts: string[] = [];
        if (lp?.value) parts.push(`Life Path ${lp.value}${lp.is_master ? ' (master)' : ''}: ${lp.meaning || 'deep structural pattern'}`);
        if (expr?.value) parts.push(`Expression ${expr.value}: ${expr.meaning || 'outer world signature'}`);
        if (soul?.value) parts.push(`Soul Urge ${soul.value}: ${soul.meaning || 'hidden inner drive'}`);
        if (parts.length) return parts.join('. ') + '.';
        break;
      }

      // ─── Enneagram / Nine-Point Architecture ──────────
      case 'nine-point-architecture': {
        const analysis = result?.typeAnalysis;
        if (analysis?.type) {
          const t = analysis.type;
          return `Enneagram ${t.number} (${t.name}): core desire for ${t.coreDesire}, navigating the tension of ${t.coreFear}.`;
        }
        break;
      }

      // ─── Gene Keys / Gift-Shadow Spectrum ─────────────
      case 'gift-shadow-spectrum': {
        const keys = result?.active_keys as any[];
        const seq = result?.activation_sequence;
        const parts: string[] = [];
        if (keys?.length) {
          const primary = keys[0];
          parts.push(`Gene Key ${primary.key_number} (${primary.name}): Shadow of ${primary.shadow} → Gift of ${primary.gift} → Siddhi of ${primary.siddhi}`);
        }
        if (seq?.lifes_work) {
          parts.push(`Life's Work activation: Key ${seq.lifes_work}`);
        }
        if (parts.length) return parts.join('. ') + '.';
        break;
      }

      // ─── Human Design / Energetic Authority ───────────
      case 'energetic-authority': {
        const parts: string[] = [];
        if (result?.hd_type) parts.push(`Type: ${result.hd_type}`);
        if (result?.authority) parts.push(`Authority: ${result.authority}`);
        if (result?.profile) parts.push(`Profile: ${result.profile}`);
        if (result?.definition) parts.push(`Definition: ${result.definition}`);
        const centers = result?.defined_centers as string[];
        if (centers?.length) parts.push(`Defined centers: ${centers.join(', ')}`);
        if (parts.length) return parts.join('. ') + '.';
        break;
      }

      // ─── Panchanga / Temporal Grammar ─────────────────
      case 'temporal-grammar': {
        const anchors: string[] = [];
        if (result?.tithi_name) anchors.push(result.tithi_name as string);
        if (result?.nakshatra_name) anchors.push(result.nakshatra_name as string);
        if (result?.yoga_name) anchors.push(`${result.yoga_name} yoga`);
        if (anchors.length) {
          return `The day's symbolic frame is ${anchors.join(', ')}. Let alignment lead before force.`;
        }
        break;
      }

      // ─── Biorhythm / Three-Wave Cycle ─────────────────
      case 'three-wave-cycle': {
        const p = result?.physical;
        const e = result?.emotional;
        const i = result?.intellectual;
        const intu = result?.intuitive;
        const parts: string[] = [];
        if (p) parts.push(`Physical ${this.formatPercent(p.percentage)} (${p.phase})`);
        if (e) parts.push(`Emotional ${this.formatPercent(e.percentage)} (${e.phase})`);
        if (i) parts.push(`Intellectual ${this.formatPercent(i.percentage)} (${i.phase})`);
        if (intu) parts.push(`Intuitive ${this.formatPercent(intu.percentage)} (${intu.phase})`);
        if (result?.overall_energy != null) parts.push(`Overall ${this.formatPercent(result.overall_energy)}`);
        if (parts.length) return `Biorhythm: ${parts.join(', ')}.`;
        break;
      }

      // ─── Vedic Clock / Circadian Cartography ──────────
      case 'circadian-cartography': {
        const organ = result?.current_organ;
        const dosha = result?.current_dosha;
        const parts: string[] = [];
        if (organ) parts.push(`${organ.organ} (${organ.element}) active: ${organ.time_window || ''}`);
        if (dosha) parts.push(`Dosha: ${dosha.dosha} (${dosha.qualities?.join(', ') || ''})`);
        if (result?.synthesis) parts.push(result.synthesis);
        if (parts.length) return parts.join('. ') + '.';
        break;
      }

      // ─── Transits / Planetary Weather ─────────────────
      case 'active-planetary-weather': {
        const transits = result?.active_transits as any[];
        if (transits?.length) {
          const top = transits.slice(0, 3).map((t: any) =>
            `${t.planet} in ${t.sign}${t.retrograde ? ' (R)' : ''}`
          );
          return `Active transits: ${top.join(', ')}.`;
        }
        break;
      }

      // ─── Tarot / Archetypal Mirror ────────────────────
      case 'archetypal-mirror': {
        const cards = result?.cards as any[];
        if (cards?.length) {
          const desc = cards.map((c: any) =>
            `${c.name}${c.reversed ? ' (reversed)' : ''}: ${c.meaning || c.keywords?.join(', ') || ''}`
          );
          return desc.join('. ') + '.';
        }
        break;
      }

      // ─── I-Ching / Hexagram Navigation ────────────────
      case 'hexagram-navigation': {
        if (result?.hexagram) {
          const h = result.hexagram;
          return `Hexagram ${h.number}: ${h.name}${h.changing_lines?.length ? ` (changing lines: ${h.changing_lines.join(',')})` : ''}.`;
        }
        break;
      }

      // ─── Sacred Geometry / Geometric Resonance ────────
      case 'geometric-resonance': {
        if (result?.primary_form) {
          return `Primary form: ${result.primary_form}. ${result.resonance_note || ''}`.trim();
        }
        break;
      }

      // ─── Biofield / Bioelectric Field ─────────────────
      case 'bioelectric-field': {
        const metrics = result?.metrics;
        if (metrics) {
          return `Biofield coherence: ${metrics.coherence ?? 'unknown'}. Vitality: ${metrics.vitality ?? 'unknown'}.`;
        }
        break;
      }

      // ─── Face Reading / Physiognomic Mapping ──────────
      case 'physiognomic-mapping': {
        if (result?.dominant_element) {
          return `Dominant element: ${result.dominant_element}. ${result.constitutional_note || ''}`.trim();
        }
        break;
      }

      // ─── Nadabrahman / Resonance Architecture ─────────
      case 'resonance-architecture': {
        if (result?.fundamental_tone) {
          return `Fundamental tone: ${result.fundamental_tone}. Harmonic: ${result.harmonic || 'calculating'}.`;
        }
        break;
      }

      // ─── Sigil Forge ──────────────────────────────────
      case 'sigil-forge': {
        if (result?.sigil) {
          return `Sigil generated: ${result.sigil.intent || 'encoded'}. Glyph: ${result.sigil.glyph || '◉'}.`;
        }
        break;
      }

      default:
        break;
    }

    // Fallback: use witness_prompt from Selemene
    return output.witness_prompt || '';
  }

  private extractSomaticNote(
    engineId: SelemeneEngineId,
    output: SelemeneEngineOutput,
    domains: DomainQueryResult[],
  ): string {
    const result = output.result as Record<string, any>;
    if (!result) return '';

    switch (engineId) {
      case 'biorhythm': {
        const p = result?.physical;
        const e = result?.emotional;
        const i = result?.intellectual;
        const notes: string[] = [];
        if (p) {
          if (p.is_critical) notes.push('Physical critical day — avoid overexertion.');
          else if (p.percentage > 70) notes.push('Physical energy peaks — body ready for action.');
          else if (p.percentage < 30) notes.push('Physical energy low — honor rest, body is integrating.');
        }
        if (e) {
          if (e.is_critical) notes.push('Emotional critical day — be gentle with relational demands.');
          else if (e.percentage < 30) notes.push('Emotional reserves low — protect your inner space.');
        }
        if (i?.is_critical) notes.push('Intellectual critical day — postpone complex decisions.');
        const criticalWindow = this.formatCriticalDays(result?.critical_days);
        if (criticalWindow) {
          notes.push(criticalWindow);
        }
        return notes.join(' ');
      }

      case 'vedic-clock': {
        const organ = result?.current_organ;
        const dosha = result?.current_dosha;
        const rec = result?.recommendation;
        const notes: string[] = [];
        if (organ) {
          notes.push(`${organ.organ} meridian active (${organ.element}).`);
          if (organ.associated_emotion) notes.push(`Emotion: ${organ.associated_emotion}.`);
          const activities = this.normalizeActivities(organ.recommended_activities || rec?.activities);
          if (activities.length > 0) notes.push(`Try: ${activities.slice(0, 2).join(', ')}.`);
        }
        if (dosha) notes.push(`${dosha.dosha} dominant — ${dosha.qualities?.join(', ') || ''}.`);
        return notes.join(' ');
      }

      case 'gene-keys': {
        const keys = result?.active_keys as any[];
        const assessments = result?.frequency_assessments as any[];
        const notes: string[] = [];
        if (keys?.[0]) {
          const k = keys[0];
          notes.push(`Shadow pattern: ${k.shadow}. Gift invitation: ${k.gift}.`);
        }
        if (assessments?.[0]?.recognition_prompts?.shadow?.length) {
          notes.push(`Body flag: ${assessments[0].recognition_prompts.shadow[0]}`);
        }
        return notes.join(' ');
      }

      case 'human-design': {
        const notes: string[] = [];
        const centers = result?.defined_centers as string[];
        const sacral = centers?.includes('Sacral');
        const solar = centers?.includes('Solar Plexus');
        if (result?.hd_type === 'Generator' || result?.hd_type === 'Manifesting Generator') {
          notes.push('Sacral type — wait for gut response before committing.');
        }
        if (result?.hd_type === 'Projector') {
          notes.push('Projector — wait for recognition/invitation. Rest is productive.');
        }
        if (solar) notes.push('Emotional authority active — ride the wave before deciding.');
        if (!sacral && result?.hd_type !== 'Projector') {
          notes.push('No sacral definition — manage energy carefully.');
        }
        return notes.join(' ');
      }

      case 'panchanga': {
        const notes: string[] = [];
        if (result?.nakshatra_name) notes.push(`Nakshatra ${result.nakshatra_name} active.`);
        if (result?.yoga_name) notes.push(`Yoga: ${result.yoga_name}.`);
        return notes.join(' ');
      }

      case 'biofield': {
        const metrics = result?.metrics;
        if (metrics) {
          const c = metrics.coherence as number;
          if (c > 0.7) return 'High biofield coherence — system integrated and receptive.';
          if (c < 0.3) return 'Low coherence — breathwork or grounding recommended.';
          return `Biofield coherence at ${Math.round(c * 100)}%.`;
        }
        break;
      }

      case 'enneagram': {
        const analysis = result?.typeAnalysis;
        if (analysis?.type) {
          const t = analysis.type;
          return `Type ${t.number} body: ${t.bodyCenter || 'check in with somatic holding patterns'}.`;
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
      parts.push(
        `Body state: physical ${this.formatPercent(physical)}, emotional ${this.formatPercent(emotional)}, intellectual ${this.formatPercent(intellectual)}`
      );
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

    response = this.applyWitnessPromptGuard(outputs, response) ?? response;
    response = this.blendPracticalDetail(outputs, response, pichet);

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

  private formatPercent(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'unknown';
    return `${Math.round(value)}%`;
  }

  private formatCriticalDays(criticalDays: unknown): string | null {
    if (!Array.isArray(criticalDays) || criticalDays.length === 0) return null;

    const stringDates = criticalDays
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    if (stringDates.length > 0) {
      const uniqueDates = [...new Set(stringDates)];
      if (uniqueDates.length === 1) {
        return `Next critical day: ${uniqueDates[0]}.`;
      }
      return `Next critical window: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}.`;
    }

    const objectDates = criticalDays
      .filter((entry): entry is { type?: unknown; date?: unknown } =>
        typeof entry === 'object' && entry !== null
      )
      .map((entry) => ({
        type: typeof entry.type === 'string' ? entry.type : null,
        date: typeof entry.date === 'string' ? entry.date : null,
      }))
      .filter((entry) => entry.date);
    if (objectDates.length === 0) return null;

    const next = objectDates[0];
    return next.type
      ? `Next critical ${next.type}: ${next.date}.`
      : `Next critical day: ${next.date}.`;
  }

  private buildIntegrationInsight(
    outputs: SelemeneEngineOutput[],
    userState: UserState,
  ): string | null {
    const primary = outputs[0];
    if (!primary) return null;

    switch (primary.engine_id) {
      case 'biorhythm': {
        const result = primary.result as Record<string, any>;
        const physical = Number(result?.physical?.percentage ?? userState.biorhythm?.physical);
        const emotional = Number(result?.emotional?.percentage ?? userState.biorhythm?.emotional);
        const intellectual = Number(result?.intellectual?.percentage ?? userState.biorhythm?.intellectual);

        if (Number.isFinite(physical) && Number.isFinite(emotional) && physical >= 75 && emotional <= 35) {
          return 'Capacity is high, but the emotional field is thinner than the action available. Move forward without outrunning what you actually feel.';
        }
        if (Number.isFinite(physical) && Number.isFinite(emotional) && physical <= 35 && emotional <= 35) {
          return 'Both energy and feeling are running low. Treat this as a restoration window, not a proving ground.';
        }
        if (Number.isFinite(intellectual) && Number.isFinite(emotional) && intellectual >= 75 && emotional <= 35) {
          return 'The mind can push harder than the heart can carry today. Keep decisions simple and paced.';
        }
        return null;
      }

      case 'vedic-clock': {
        const result = primary.result as Record<string, any>;
        const organ = result?.current_organ as Record<string, any> | undefined;
        const dosha = result?.current_dosha as Record<string, any> | undefined;
        const activities = this.normalizeActivities(
          organ?.recommended_activities ?? result?.recommendation?.activities
        );
        const hasBreathCue = activities.some((activity) => /breath|pranayama/i.test(activity));
        if (organ?.organ === 'Lung' || hasBreathCue) {
          return 'Breath is the cleanest bridge between pattern and regulation right now.';
        }
        if (dosha?.dosha === 'Vata') {
          return 'Movement is available, but steadiness determines whether it becomes clarity or scatter.';
        }
        return null;
      }

      default:
        return null;
    }
  }

  private normalizeActivities(activities: unknown): string[] {
    if (!Array.isArray(activities)) return [];
    return activities
      .map((activity) => {
        if (typeof activity === 'string') return activity;
        if (typeof activity === 'object' && activity !== null && typeof (activity as { activity?: unknown }).activity === 'string') {
          return (activity as { activity: string }).activity;
        }
        return null;
      })
      .filter((activity): activity is string => Boolean(activity));
  }

  private applyWitnessPromptGuard(
    outputs: SelemeneEngineOutput[],
    candidate?: string,
  ): string | undefined {
    if (!candidate || outputs.length !== 1) return candidate;

    const prompt = outputs[0].witness_prompt?.trim();
    if (!prompt) return candidate;

    return this.shouldPreferWitnessPrompt(candidate, prompt, outputs[0])
      ? prompt
      : candidate;
  }

  private blendPracticalDetail(
    outputs: SelemeneEngineOutput[],
    response: string,
    pichet?: AgentInterpretation,
  ): string {
    if (outputs.length !== 1) return response;

    const output = outputs[0];
    if (output.engine_id !== 'biorhythm') return response;

    const prompt = output.witness_prompt?.trim();
    if (!prompt || response.trim() !== prompt) return response;

    const detail = this.selectPracticalDetail(output, pichet?.perspective);
    if (!detail || response.includes(detail)) return response;

    return `${response}\n\n${detail}`;
  }

  private selectPracticalDetail(
    output: SelemeneEngineOutput,
    pichetPerspective?: string,
  ): string | null {
    const result = output.result as Record<string, any>;
    const criticalWindow = this.formatCriticalDays(result?.critical_days);
    if (criticalWindow) return criticalWindow;

    const physical = Number(result?.physical?.percentage);
    const emotional = Number(result?.emotional?.percentage);
    if (Number.isFinite(physical) && Number.isFinite(emotional) && physical >= 75 && emotional <= 35) {
      return 'Move forward, but keep emotional commitments lighter than your physical drive.';
    }

    if (pichetPerspective) {
      const firstSentence = pichetPerspective
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .find(Boolean);
      if (firstSentence && !/^Physical energy peaks/i.test(firstSentence)) {
        return firstSentence;
      }
    }

    return null;
  }

  private shouldPreferWitnessPrompt(
    candidate: string,
    prompt: string,
    output: SelemeneEngineOutput,
  ): boolean {
    return this.scoreUserFacingText(prompt, output) >= this.scoreUserFacingText(candidate, output) + 2;
  }

  private scoreUserFacingText(text: string, output: SelemeneEngineOutput): number {
    let score = 0;
    const normalized = text.replace(/\s+/g, ' ').trim();
    const words = normalized.split(' ').filter(Boolean);
    const decimals = normalized.match(/\b\d+\.\d+\b/g) ?? [];
    const numerics = normalized.match(/\b\d+(?:\.\d+)?%?\b/g) ?? [];

    score += Math.min(6, Math.floor(words.length / 6));
    if (/\b(you|your)\b/i.test(normalized)) score += 2;
    if (/[?]/.test(normalized)) score += 1;
    if (/\b(notice|feel|what|how|where)\b/i.test(normalized)) score += 1;
    if (/\b(undefined|null|nan)\b/i.test(normalized)) score -= 8;
    if (/Full symbolic portrait across|cross-patterns identified|Five limbs of time:/i.test(normalized)) score -= 4;
    if (output.engine_id === 'panchanga' && /alignment.*force/i.test(normalized)) score -= 1;
    score -= Math.min(3, decimals.length);
    if (numerics.length > 5) score -= 2;

    return score;
  }
}
