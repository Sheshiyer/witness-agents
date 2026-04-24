// ─── Daily Witness — Daily Mirror ──────────────────────────────────────
// The core engine: birth data → 4 somatic engines → 3-layer reading.
// One primary engine per day (rotated by numerological seed).
// Layers unlock through practice, not payment (except Layer 2 shortcut).
//
// "Not through an ad. Through a question." — Brand Principle

import type {
  DailyReading,
  Layer1_RawMirror,
  Layer2_WitnessQuestion,
  Layer3_MetaPattern,
  CrossRef,
  StandaloneEngineId,
  StandaloneTier,
  DecoderState,
} from './types.js';
import { ENGINE_WITNESS_ROLE, STANDALONE_ENGINES, STANDALONE_TO_CORE_TIER } from './types.js';
import type { BirthData, SelemeneEngineOutput } from '../types/engine.js';
import type { InferenceMessage, InferenceRequest } from '../inference/types.js';
import type { Tier } from '../types/interpretation.js';
import { OpenRouterProvider } from '../inference/openrouter.js';
import { getPrimaryEngine, getRotationOrder } from './engine-rotation.js';
import { EngineCache } from './engine-cache.js';
import { CircuitBreaker } from './circuit-breaker.js';
import type { EngineHealth } from './circuit-breaker.js';
import type { WitnessObserver } from './observability.js';
import {
  hashBirthData,
  getDecoderState,
  recordVisit,
  computeMaxLayer,
  shouldShowFindersGate,
  shouldShowGraduation,
  markFindersGateShown,
  markGraduationShown,
  getDecoderNarrative,
} from './decoder-ring.js';
import {
  isFoolsGate,
  buildFoolsGate,
  extractDataPoints,
  generateHeadline,
} from './fools-gate.js';

// ═══════════════════════════════════════════════════════════════════════
// DAILY MIRROR ENGINE
// ═══════════════════════════════════════════════════════════════════════

export interface DailyMirrorConfig {
  selemene_url: string;
  selemene_api_key: string;
  openrouter_api_key?: string;  // Enables LLM-powered Layer 2 witness questions
  tier?: StandaloneTier;
  cache_enabled?: boolean;       // Default: true
  cache_max_entries?: number;    // Default: 1000
  circuit_breaker?: Partial<import('./circuit-breaker.js').CircuitBreakerConfig>;
  observer?: WitnessObserver;    // Structured observability (optional)
}

export class DailyMirror {
  private config: DailyMirrorConfig;
  private llmProvider: OpenRouterProvider | null;
  private cache: EngineCache | null;
  private breaker: CircuitBreaker;
  private observer: WitnessObserver | null;
  
  constructor(config: DailyMirrorConfig) {
    this.config = config;
    
    // Initialize LLM provider if API key provided
    this.llmProvider = config.openrouter_api_key
      ? new OpenRouterProvider({
          api_key: config.openrouter_api_key,
          site_url: 'https://tryambakam.space/daily-witness',
          site_name: 'The Daily Witness',
          timeout_ms: 15_000,
        })
      : null;
    
    // Initialize cache (on by default)
    this.cache = (config.cache_enabled !== false)
      ? new EngineCache(config.cache_max_entries)
      : null;
    
    // Initialize circuit breaker
    this.breaker = new CircuitBreaker(config.circuit_breaker);
    
    // Initialize observer (optional — no-op if not provided)
    this.observer = config.observer ?? null;
  }
  
  /** Get cache statistics (for observability). */
  getCacheStats() { return this.cache?.getStats() ?? null; }
  
  /** Get circuit breaker health (for observability). */
  getEngineHealth() { return this.breaker.getHealth(); }
  
  /**
   * Generate today's daily reading for a user.
   * This is the main entry point for the standalone product.
   */
  async generateReading(birthData: BirthData): Promise<DailyReading> {
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const userHash = hashBirthData(birthData.date, birthData.time, birthData.latitude, birthData.longitude);
    
    // ─── Step 1: Determine primary engine ───────────────────────
    const primaryEngine = getPrimaryEngine(birthData.date, today);
    const rotationOrder = getRotationOrder(birthData.date, today);
    
    // ─── Step 2: Check decoder state (before recording this visit) ──
    const preVisitState = getDecoderState(userHash);
    const isFirstEncounter = isFoolsGate(preVisitState);
    
    // ─── Step 3: Call Selemene API for all 4 engines ────────────
    const engineOutputs = await this.callEngines(birthData, rotationOrder);
    
    // ─── Step 4: Record visit (updates decoder state) ───────────
    const decoderState = recordVisit(userHash, primaryEngine, today);
    const maxLayer = computeMaxLayer(decoderState, this.config.tier);
    
    // ─── Step 5: Build Layer 1 readings (always) ────────────────
    const allReadings = {} as Record<StandaloneEngineId, Layer1_RawMirror>;
    for (const engineId of STANDALONE_ENGINES) {
      const output = engineOutputs.get(engineId);
      allReadings[engineId] = this.buildLayer1(engineId, output, today);
    }
    
    // ─── Step 6: Build Layer 2 (if unlocked) ────────────────────
    let witnessQuestion: Layer2_WitnessQuestion | undefined;
    if (maxLayer >= 2 && !isFirstEncounter) {
      witnessQuestion = await this.buildLayer2(
        primaryEngine,
        engineOutputs.get(primaryEngine),
        decoderState,
      );
    }
    
    // ─── Step 7: Build Layer 3 (if unlocked) ────────────────────
    let metaPattern: Layer3_MetaPattern | undefined;
    if (maxLayer >= 3) {
      metaPattern = this.buildLayer3(engineOutputs, decoderState, userHash);
    }
    
    // ─── Step 8: Check for Fool's Gate ──────────────────────────
    // On first visit, the biorhythm recognition hook overrides normal response
    let foolsGateHook: string | undefined;
    if (isFirstEncounter) {
      const bioOutput = engineOutputs.get('biorhythm');
      if (bioOutput) {
        const fg = buildFoolsGate(bioOutput.result as Record<string, unknown>);
        foolsGateHook = fg.recognition_hook;
      }
    }
    
    // ─── Step 9: Assemble reading ───────────────────────────────
    // Build engine health map from circuit breaker
    const healthArr = this.breaker.getHealth() as EngineHealth[];
    const engineHealthMap: Record<string, EngineHealth> = {};
    for (const h of healthArr) {
      engineHealthMap[h.engine_id] = h;
    }
    
    const reading: DailyReading = {
      id: `dw-${userHash.slice(0, 8)}-${today}`,
      date: today,
      birth_date: birthData.date,
      primary_engine: primaryEngine,
      primary_reading: allReadings[primaryEngine],
      all_readings: allReadings,
      witness_question: witnessQuestion,
      meta_pattern: metaPattern,
      max_layer_unlocked: maxLayer,
      decoder_state: { ...decoderState },
      engines_called: [...STANDALONE_ENGINES],
      total_latency_ms: Date.now() - startTime,
      cache_stats: this.cache?.getStats(),
      engine_health: engineHealthMap,
      standalone_version: '0.1.0',
    };
    
    // Override headline for Fool's Gate
    if (foolsGateHook) {
      reading.primary_reading.headline = foolsGateHook;
    }
    
    // Add decoder narrative if applicable
    const narrative = getDecoderNarrative(decoderState);
    if (narrative && reading.meta_pattern) {
      reading.meta_pattern.resonance_description =
        narrative + '\n\n' + reading.meta_pattern.resonance_description;
    }
    
    return reading;
  }
  
  /**
   * Generate a reading for a specific engine (not the daily rotation).
   * Used by skills.sh when a specific engine is requested.
   */
  async generateEngineReading(
    birthData: BirthData,
    engineId: StandaloneEngineId,
  ): Promise<DailyReading> {
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const userHash = hashBirthData(birthData.date, birthData.time, birthData.latitude, birthData.longitude);
    
    // Call single engine
    const output = await this.callSingleEngine(birthData, engineId);
    const decoderState = recordVisit(userHash, engineId, today);
    const maxLayer = computeMaxLayer(decoderState, this.config.tier);
    
    const layer1 = this.buildLayer1(engineId, output, today);
    
    // Build all_readings with just this engine
    const allReadings = {} as Record<StandaloneEngineId, Layer1_RawMirror>;
    for (const eid of STANDALONE_ENGINES) {
      if (eid === engineId) {
        allReadings[eid] = layer1;
      } else {
        allReadings[eid] = this.buildLayer1(eid, undefined, today);
      }
    }
    
    let witnessQuestion: Layer2_WitnessQuestion | undefined;
    if (maxLayer >= 2) {
      witnessQuestion = await this.buildLayer2(engineId, output, decoderState);
    }
    
    return {
      id: `dw-${userHash.slice(0, 8)}-${today}-${engineId}`,
      date: today,
      birth_date: birthData.date,
      primary_engine: engineId,
      primary_reading: layer1,
      all_readings: allReadings,
      witness_question: witnessQuestion,
      max_layer_unlocked: maxLayer,
      decoder_state: { ...decoderState },
      engines_called: [engineId],
      total_latency_ms: Date.now() - startTime,
      cache_stats: this.cache?.getStats(),
      standalone_version: '0.1.0',
    };
  }
  
  // ═════════════════════════════════════════════════════════════════════
  // PRIVATE: Selemene API Calls
  // ═════════════════════════════════════════════════════════════════════
  
  private async callEngines(
    birthData: BirthData,
    engines: StandaloneEngineId[],
  ): Promise<Map<StandaloneEngineId, SelemeneEngineOutput>> {
    const results = new Map<StandaloneEngineId, SelemeneEngineOutput>();
    
    // Parallel calls — skip open-circuit engines, try substitutes
    const promises = engines.map(async (engineId) => {
      try {
        let targetId = engineId;
        
        // Check circuit breaker before calling
        if (!this.breaker.canCall(engineId)) {
          const substitute = this.breaker.getSubstitute(engineId);
          if (substitute && !results.has(substitute)) {
            console.warn(`[DailyWitness] Circuit open for ${engineId}, substituting ${substitute}`);
            targetId = substitute;
          } else {
            console.warn(`[DailyWitness] Circuit open for ${engineId}, no substitute available`);
            return;
          }
        }
        
        const output = await this.callSingleEngine(birthData, targetId);
        if (output) results.set(targetId, output);
      } catch (err) {
        // Graceful degradation: if one engine fails, continue with others
        console.warn(`[DailyWitness] Engine ${engineId} failed:`, (err as Error).message);
      }
    });
    
    await Promise.all(promises);
    return results;
  }
  
  private async callSingleEngine(
    birthData: BirthData,
    engineId: StandaloneEngineId,
  ): Promise<SelemeneEngineOutput | undefined> {
    const callStart = Date.now();
    // ─── Check cache first ──────────────────────────────────────────
    const birthHash = EngineCache.hashBirth(
      birthData.date, birthData.time, birthData.latitude, birthData.longitude,
    );
    if (this.cache) {
      const cached = this.cache.get(engineId, birthHash);
      if (cached) {
        this.observer?.recordEngineCall(engineId, Date.now() - callStart, true, true);
        return cached;
      }
    }
    
    // ─── Check circuit breaker ──────────────────────────────────────
    if (!this.breaker.canCall(engineId)) {
      const substitute = this.breaker.getSubstitute(engineId);
      if (substitute) {
        console.warn(`[DailyWitness] Circuit open for ${engineId}, trying substitute ${substitute}`);
        return this.callSingleEngine(birthData, substitute);
      }
      console.warn(`[DailyWitness] Circuit open for ${engineId}, skipping`);
      return undefined;
    }
    
    // ─── Cache miss — call Selemene API ─────────────────────────────
    const url = `${this.config.selemene_url}/api/v1/engines/${engineId}/calculate`;
    
    const body = {
      birth_data: {
        name: birthData.name,
        date: birthData.date,
        time: birthData.time,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
      },
      current_time: new Date().toISOString(),
      precision: 'Standard',
      options: {},
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.selemene_api_key,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      
      if (!response.ok) {
        const error = `Selemene ${engineId}: ${response.status} ${response.statusText}`;
        this.breaker.recordFailure(engineId, error);
        throw new Error(error);
      }
      
      const output = await response.json() as SelemeneEngineOutput;
      
      // ─── Record success + store in cache ──────────────────────────
      this.breaker.recordSuccess(engineId);
      if (this.cache) {
        this.cache.set(engineId, birthHash, output);
      }
      
      return output;
    } catch (err) {
      // Record failure for non-HTTP errors (timeouts, network)
      const error = (err as Error).message;
      if (!error.startsWith('Selemene ')) {
        this.breaker.recordFailure(engineId, error);
      }
      this.observer?.recordEngineCall(engineId, Date.now() - callStart, false, false);
      throw err;
    }
  }
  
  // ═════════════════════════════════════════════════════════════════════
  // PRIVATE: Layer Builders
  // ═════════════════════════════════════════════════════════════════════
  
  private buildLayer1(
    engineId: StandaloneEngineId,
    output: SelemeneEngineOutput | undefined,
    today: string,
  ): Layer1_RawMirror {
    const result = (output?.result || {}) as Record<string, unknown>;
    
    return {
      layer: 1,
      engine_id: engineId,
      engine_role: ENGINE_WITNESS_ROLE[engineId],
      raw_data: result,
      headline: generateHeadline(engineId, result),
      data_points: extractDataPoints(engineId, result),
      timestamp: new Date().toISOString(),
    };
  }
  
  private async buildLayer2(
    engineId: StandaloneEngineId,
    output: SelemeneEngineOutput | undefined,
    state: DecoderState,
  ): Layer2_WitnessQuestion | Promise<Layer2_WitnessQuestion> {
    const witnessPrompt = output?.witness_prompt || '';
    const result = (output?.result || {}) as Record<string, unknown>;
    
    // ─── Try LLM-powered question (Pichet voice) ────────────────
    if (this.llmProvider && output) {
      try {
        return await this.buildLayer2WithLLM(engineId, result, witnessPrompt, state);
      } catch (err) {
        console.warn(`[DailyWitness] LLM Layer 2 failed, falling back to template:`, (err as Error).message);
      }
    }
    
    // ─── Fallback: template-based question ───────────────────────
    const question = this.generateWitnessQuestion(engineId, result, witnessPrompt, state);
    
    return {
      layer: 2,
      question,
      prompt_source: 'pichet',
      context_hint: this.generateContextHint(engineId, result),
      somatic_nudge: this.generateSomaticNudge(engineId, result),
      llm_powered: false,
    };
  }
  
  /**
   * LLM-powered Layer 2: Pichet generates a somatic witness question
   * grounded in the actual engine data. Falls back to template on failure.
   */
  private async buildLayer2WithLLM(
    engineId: StandaloneEngineId,
    result: Record<string, unknown>,
    witnessPrompt: string,
    state: DecoderState,
  ): Promise<Layer2_WitnessQuestion> {
    const startTime = Date.now();
    
    // Map standalone tier → core tier for model routing
    const tier = this.config.tier || 'witness-free';
    const coreTier = STANDALONE_TO_CORE_TIER[tier] || 'free';
    
    const systemPrompt = [
      'You are Pichet, the somatic witness. You speak through the body, not about it.',
      'You ask ONE question that turns the person\'s attention inward.',
      '',
      'Rules:',
      '- Reference the SPECIFIC data provided (numbers, organ names, cycle phases)',
      '- Point INWARD, not outward. The question creates space, not explanation.',
      '- 1-2 sentences maximum. No preamble.',
      '- Never use: journey, path, healing, manifesting, abundance, vibration, authentic self',
      '- Voice: felt, somatic, body-aware. Like a skilled bodyworker asking one precise question.',
      '',
      `Engine: ${engineId} (${ENGINE_WITNESS_ROLE[engineId]})`,
      `Days of practice: ${state.total_visits}`,
      `Consecutive days: ${state.consecutive_days}`,
      witnessPrompt ? `Engine hint: ${witnessPrompt}` : '',
    ].filter(Boolean).join('\n');
    
    const dataSnippet = JSON.stringify(result, null, 0).slice(0, 1200);
    
    const messages: InferenceMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Here is today's ${engineId} reading data:\n\n${dataSnippet}\n\nGenerate one witness question.`,
      },
    ];
    
    const request: InferenceRequest = {
      messages,
      model_role: 'pichet',
      tier: coreTier as Tier,
      max_tokens_override: 200,
      temperature_override: 0.8,
      metadata: { engine: engineId, source: 'daily-witness-layer2' },
    };
    
    const response = await this.llmProvider!.complete(request);
    
    const question = response.content.trim().replace(/^["']|["']$/g, '');
    const latency = Date.now() - startTime;
    
    return {
      layer: 2,
      question,
      prompt_source: 'pichet',
      context_hint: this.generateContextHint(engineId, result),
      somatic_nudge: this.generateSomaticNudge(engineId, result),
      llm_powered: true,
      model_used: response.model_used,
      inference_latency_ms: latency,
    };
  }
  
  private buildLayer3(
    outputs: Map<StandaloneEngineId, SelemeneEngineOutput>,
    state: DecoderState,
    userHash: string,
  ): Layer3_MetaPattern {
    const crossRefs = this.findCrossReferences(outputs);
    const patternName = this.nameTodaysPattern(outputs);
    
    let findersWhisper: string | undefined;
    if (shouldShowFindersGate(state)) {
      findersWhisper = 'There are twelve more mirrors beyond these four. You\'ve practiced enough to find them. → tryambakam.space';
      markFindersGateShown(userHash);
    }
    
    let graduationNote: string | undefined;
    if (shouldShowGraduation(state)) {
      graduationNote = 'Thirty days of witnessing. You see the patterns without us now. The mirror was always yours.';
      markGraduationShown(userHash);
    }
    
    return {
      layer: 3,
      pattern_name: patternName,
      resonance_description: this.describeResonance(outputs),
      cross_references: crossRefs,
      finders_whisper: findersWhisper,
      graduation_note: graduationNote,
    };
  }
  
  // ═════════════════════════════════════════════════════════════════════
  // PRIVATE: Witness Question Generation
  // ═════════════════════════════════════════════════════════════════════
  
  /**
   * Generate a witness question — not an explanation, but an inquiry.
   * Pichet's voice: somatic, felt, body-aware.
   * 
   * The question must:
   * 1. Reference the actual data (not generic)
   * 2. Point inward (not outward)
   * 3. Create space, not fill it
   */
  private generateWitnessQuestion(
    engineId: StandaloneEngineId,
    result: Record<string, unknown>,
    witnessPrompt: string,
    state: DecoderState,
  ): string {
    switch (engineId) {
      case 'biorhythm': {
        const phys = (result.physical as Record<string, unknown>)?.percentage as number ?? 50;
        const emo = (result.emotional as Record<string, unknown>)?.percentage as number ?? 50;
        if (phys < 30) return 'What is your body protecting by slowing down today?';
        if (phys > 80 && emo < 40) return 'Your body is ready but your heart isn\'t. What are you avoiding feeling?';
        if (emo > 80 && phys < 40) return 'So much feeling, so little physical ground. Where in your body do you feel most absent?';
        if (Math.abs(phys - emo) > 40) return 'Notice the gap between what you can do and what you feel. Where does it live in your body?';
        return 'If your body could finish one sentence today, what would it say?';
      }
      case 'vedic-clock': {
        const organ = result.current_organ as Record<string, unknown> | undefined;
        const organName = (organ?.organ as string) || 'this organ';
        const emotion = (organ?.associated_emotion as string) || '';
        if (emotion) {
          return `${organName} holds ${emotion.toLowerCase()} in your tradition. What would it say to you right now?`;
        }
        return `What does your ${organName.toLowerCase()} need from you in this hour?`;
      }
      case 'panchanga': {
        const tithi = result.tithi_name as string;
        const nak = result.nakshatra_name as string;
        if (tithi && nak) {
          return `${tithi} under ${nak} — what part of you is waxing, and what is releasing?`;
        }
        return 'The cosmic weather changes today. What in you is ready to change with it?';
      }
      case 'numerology': {
        const lp = result.life_path as Record<string, unknown>;
        const val = lp?.value as number;
        if (val) {
          return `Life Path ${val} — you keep encountering this number's lesson. What is it asking of you this week?`;
        }
        return 'Your birth architecture has a shape. When do you feel most aligned with it?';
      }
      default:
        return 'What does your body know that your mind hasn\'t caught up to?';
    }
  }
  
  private generateContextHint(
    engineId: StandaloneEngineId,
    result: Record<string, unknown>,
  ): string {
    switch (engineId) {
      case 'biorhythm':
        return 'This reading tracks 23/28/33-day sine cycles from your birth. The body doesn\'t lie.';
      case 'vedic-clock':
        return 'Chinese organ clock meets Ayurvedic dosha timing. Your body\'s internal schedule.';
      case 'panchanga':
        return 'Five limbs of Vedic time: tithi, nakshatra, yoga, karana, vara. Not prediction — weather.';
      case 'numerology':
        return 'Pythagorean and Chaldean number architecture. Your birth date as structural blueprint.';
      default:
        return '';
    }
  }
  
  private generateSomaticNudge(
    engineId: StandaloneEngineId,
    result: Record<string, unknown>,
  ): string | undefined {
    switch (engineId) {
      case 'biorhythm': {
        const phys = (result.physical as Record<string, unknown>)?.percentage as number;
        if (phys !== undefined && phys < 25) return 'Slow exhale. Feet on the floor. You are here.';
        if (phys !== undefined && phys > 85) return 'Energy is high. Move your body in the next 10 minutes.';
        return 'Three breaths. Notice what your hands are doing.';
      }
      case 'vedic-clock': {
        const organ = result.current_organ as Record<string, unknown> | undefined;
        const activities = organ?.recommended_activities as string[];
        if (activities?.[0]) return activities[0];
        return 'Place your hand where your attention naturally goes.';
      }
      case 'panchanga':
        return 'Step outside. Look up. The sky confirms what the numbers describe.';
      case 'numerology':
        return undefined; // Numerology is structural, not somatic
      default:
        return undefined;
    }
  }
  
  // ═════════════════════════════════════════════════════════════════════
  // PRIVATE: Cross-Engine Pattern Detection (Layer 3)
  // ═════════════════════════════════════════════════════════════════════
  
  private findCrossReferences(
    outputs: Map<StandaloneEngineId, SelemeneEngineOutput>,
  ): CrossRef[] {
    const refs: CrossRef[] = [];
    
    const bio = outputs.get('biorhythm');
    const vedic = outputs.get('vedic-clock');
    const panch = outputs.get('panchanga');
    const num = outputs.get('numerology');
    
    // Biorhythm × Vedic Clock: physical energy + active organ
    if (bio && vedic) {
      const physPct = ((bio.result as Record<string, unknown>).physical as Record<string, unknown>)?.percentage as number;
      const organ = (vedic.result as Record<string, unknown>).current_organ as Record<string, unknown>;
      const organName = organ?.organ as string;
      if (physPct !== undefined && organName) {
        refs.push({
          engine_a: 'biorhythm',
          engine_b: 'vedic-clock',
          connection: `Physical energy at ${Math.round(physPct)}% while ${organName} is active — ${physPct < 40 ? 'the body is conserving for this organ\'s work' : 'energy aligns with the organ cycle'}.`,
        });
      }
    }
    
    // Panchanga × Biorhythm: cosmic weather + physical state
    if (panch && bio) {
      const tithi = (panch.result as Record<string, unknown>).tithi_name as string;
      const emoPct = ((bio.result as Record<string, unknown>).emotional as Record<string, unknown>)?.percentage as number;
      if (tithi && emoPct !== undefined) {
        const tithiWaxing = tithi.toLowerCase().includes('shukla') || tithi.toLowerCase().includes('pratipada');
        refs.push({
          engine_a: 'panchanga',
          engine_b: 'biorhythm',
          connection: `${tithi} (${tithiWaxing ? 'waxing' : 'waning'} phase) meets emotional cycle at ${Math.round(emoPct)}% — ${tithiWaxing === (emoPct > 50) ? 'aligned' : 'in creative tension'}.`,
        });
      }
    }
    
    // Numerology × Vedic Clock: birth architecture + current time
    if (num && vedic) {
      const lp = (num.result as Record<string, unknown>).life_path as Record<string, unknown>;
      const dosha = (vedic.result as Record<string, unknown>).current_dosha as Record<string, unknown>;
      if (lp?.value && dosha?.dosha) {
        refs.push({
          engine_a: 'numerology',
          engine_b: 'vedic-clock',
          connection: `Life Path ${lp.value} operating in ${dosha.dosha} time — your structural blueprint meets your body's current rhythm.`,
        });
      }
    }
    
    return refs;
  }
  
  private nameTodaysPattern(
    outputs: Map<StandaloneEngineId, SelemeneEngineOutput>,
  ): string {
    const bio = outputs.get('biorhythm');
    const physPct = bio
      ? ((bio.result as Record<string, unknown>).physical as Record<string, unknown>)?.percentage as number
      : undefined;
    
    const vedic = outputs.get('vedic-clock');
    const element = vedic
      ? ((vedic.result as Record<string, unknown>).current_organ as Record<string, unknown>)?.element as string
      : undefined;
    
    if (physPct !== undefined && physPct < 25 && element) {
      return `${element} Rest`;
    }
    if (physPct !== undefined && physPct > 80 && element) {
      return `${element} Fire`;
    }
    if (element) {
      return `${element} Flow`;
    }
    
    return 'Daily Weave';
  }
  
  private describeResonance(
    outputs: Map<StandaloneEngineId, SelemeneEngineOutput>,
  ): string {
    const parts: string[] = [];
    const count = outputs.size;
    
    if (count < 2) {
      return 'A single mirror reflects light. Multiple mirrors create a geometry.';
    }
    
    parts.push(`${count} engines speaking simultaneously.`);
    parts.push('Look for the thread that runs through all four readings.');
    parts.push('It won\'t be in the numbers — it\'ll be in how the numbers make you feel.');
    
    return parts.join(' ');
  }
}
