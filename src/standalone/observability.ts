// ─── Daily Witness — Structured Observability ──────────────────────────
// Lightweight in-memory structured logging and metrics for the standalone product.
// Zero-dependency. Synchronous hot paths. No persistence — reset on restart.
//
// Three pillars:
//   1. Structured Logging  — JSON logs with level filtering and custom sinks
//   2. Engine Metrics      — latency percentiles, cache hit rates, success/failure
//   3. Business Metrics    — LLM cost tracking, funnel conversion rates

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLog {
  timestamp: string;         // ISO 8601
  level: LogLevel;
  event: string;             // e.g. 'engine.call', 'layer2.llm', 'decoder.upgrade'
  duration_ms?: number;
  engine_id?: string;
  tier?: string;
  user_hash?: string;        // No PII — hashed birth data
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface EngineMetrics {
  engine_id: string;
  calls: number;
  successes: number;
  failures: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hits: number;
  cache_misses: number;
}

export interface CostMetrics {
  total_cost_usd: number;
  cost_by_tier: Record<string, number>;
  cost_by_model: Record<string, number>;
  total_tokens: number;
}

export interface FunnelMetrics {
  total_readings: number;
  layer1_only: number;       // Users who only saw Layer 1
  layer2_reached: number;    // Users who unlocked Layer 2
  layer3_reached: number;    // Users who unlocked Layer 3
  finders_gate_shown: number;
  graduation_shown: number;
  conversion_rate_l1_to_l2: number;  // Computed
  conversion_rate_l2_to_l3: number;  // Computed
}

export interface WitnessObserverConfig {
  level?: LogLevel;
  sink?: (log: StructuredLog) => void;
}

// ═══════════════════════════════════════════════════════════════════════
// INTERNAL STATE TYPES
// ═══════════════════════════════════════════════════════════════════════

interface EngineState {
  calls: number;
  successes: number;
  failures: number;
  cache_hits: number;
  cache_misses: number;
  latencies: number[];       // Rolling window (last 100)
}

interface CostState {
  total_cost_usd: number;
  cost_by_tier: Record<string, number>;
  cost_by_model: Record<string, number>;
  total_tokens: number;
}

interface FunnelState {
  total_readings: number;
  layer1_only: number;
  layer2_reached: number;
  layer3_reached: number;
  finders_gate_shown: number;
  graduation_shown: number;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const ROLLING_WINDOW_SIZE = 100;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ═══════════════════════════════════════════════════════════════════════
// WITNESS OBSERVER
// ═══════════════════════════════════════════════════════════════════════

export class WitnessObserver {
  private readonly level: LogLevel;
  private readonly sink: (log: StructuredLog) => void;
  private readonly engines = new Map<string, EngineState>();
  private readonly cost: CostState = {
    total_cost_usd: 0,
    cost_by_tier: {},
    cost_by_model: {},
    total_tokens: 0,
  };
  private readonly funnel: FunnelState = {
    total_readings: 0,
    layer1_only: 0,
    layer2_reached: 0,
    layer3_reached: 0,
    finders_gate_shown: 0,
    graduation_shown: 0,
  };

  constructor(config?: WitnessObserverConfig) {
    this.level = config?.level ?? 'info';
    this.sink = config?.sink ?? ((log: StructuredLog) => console.log(JSON.stringify(log)));
  }

  // ─── Logging Methods ──────────────────────────────────────────────

  log(level: LogLevel, event: string, meta?: Partial<StructuredLog>): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.level]) return;

    const log: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...meta,
    };

    this.sink(log);
  }

  info(event: string, meta?: Partial<StructuredLog>): void {
    this.log('info', event, meta);
  }

  warn(event: string, meta?: Partial<StructuredLog>): void {
    this.log('warn', event, meta);
  }

  error(event: string, meta?: Partial<StructuredLog>): void {
    this.log('error', event, meta);
  }

  debug(event: string, meta?: Partial<StructuredLog>): void {
    this.log('debug', event, meta);
  }

  // ─── Metrics: Engine Calls ────────────────────────────────────────

  recordEngineCall(
    engineId: string,
    latencyMs: number,
    success: boolean,
    cached: boolean,
  ): void {
    let state = this.engines.get(engineId);
    if (!state) {
      state = {
        calls: 0,
        successes: 0,
        failures: 0,
        cache_hits: 0,
        cache_misses: 0,
        latencies: [],
      };
      this.engines.set(engineId, state);
    }

    state.calls++;
    if (success) state.successes++;
    else state.failures++;
    if (cached) state.cache_hits++;
    else state.cache_misses++;

    // Rolling window: keep last ROLLING_WINDOW_SIZE latencies
    state.latencies.push(latencyMs);
    if (state.latencies.length > ROLLING_WINDOW_SIZE) {
      state.latencies.shift();
    }

    // Emit structured log
    this.info('engine.call', {
      engine_id: engineId,
      duration_ms: latencyMs,
      metadata: { success, cached },
    });
  }

  // ─── Metrics: LLM Calls ──────────────────────────────────────────

  recordLLMCall(
    model: string,
    tier: string,
    cost: number,
    tokens: number,
    latencyMs: number,
  ): void {
    this.cost.total_cost_usd += cost;
    this.cost.total_tokens += tokens;
    this.cost.cost_by_tier[tier] = (this.cost.cost_by_tier[tier] ?? 0) + cost;
    this.cost.cost_by_model[model] = (this.cost.cost_by_model[model] ?? 0) + cost;

    // Emit structured log
    this.info('layer2.llm', {
      tier,
      duration_ms: latencyMs,
      metadata: { model, cost, tokens },
    });
  }

  // ─── Metrics: Funnel Events ───────────────────────────────────────

  recordFunnelEvent(
    maxLayerUnlocked: number,
    findersGateShown: boolean,
    graduationShown: boolean,
  ): void {
    this.funnel.total_readings++;

    if (maxLayerUnlocked === 1) this.funnel.layer1_only++;
    else if (maxLayerUnlocked === 2) this.funnel.layer2_reached++;
    else if (maxLayerUnlocked >= 3) this.funnel.layer3_reached++;

    if (findersGateShown) this.funnel.finders_gate_shown++;
    if (graduationShown) this.funnel.graduation_shown++;
  }

  // ─── Metrics Retrieval ────────────────────────────────────────────

  getEngineMetrics(engineId?: string): EngineMetrics | EngineMetrics[] {
    if (engineId) {
      const state = this.engines.get(engineId);
      if (!state) {
        return {
          engine_id: engineId,
          calls: 0,
          successes: 0,
          failures: 0,
          avg_latency_ms: 0,
          p95_latency_ms: 0,
          cache_hits: 0,
          cache_misses: 0,
        };
      }
      return this.buildEngineMetrics(engineId, state);
    }

    // Return all engines
    const results: EngineMetrics[] = [];
    for (const [id, state] of this.engines) {
      results.push(this.buildEngineMetrics(id, state));
    }
    return results;
  }

  getCostMetrics(): CostMetrics {
    return {
      total_cost_usd: this.cost.total_cost_usd,
      cost_by_tier: { ...this.cost.cost_by_tier },
      cost_by_model: { ...this.cost.cost_by_model },
      total_tokens: this.cost.total_tokens,
    };
  }

  getFunnelMetrics(): FunnelMetrics {
    const total = this.funnel.total_readings;
    const l2Plus = this.funnel.layer2_reached + this.funnel.layer3_reached;

    return {
      total_readings: total,
      layer1_only: this.funnel.layer1_only,
      layer2_reached: this.funnel.layer2_reached,
      layer3_reached: this.funnel.layer3_reached,
      finders_gate_shown: this.funnel.finders_gate_shown,
      graduation_shown: this.funnel.graduation_shown,
      conversion_rate_l1_to_l2: total > 0 ? l2Plus / total : 0,
      conversion_rate_l2_to_l3: l2Plus > 0 ? this.funnel.layer3_reached / l2Plus : 0,
    };
  }

  getAllMetrics(): { engines: EngineMetrics[]; cost: CostMetrics; funnel: FunnelMetrics } {
    const engines = this.getEngineMetrics() as EngineMetrics[];
    return {
      engines,
      cost: this.getCostMetrics(),
      funnel: this.getFunnelMetrics(),
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private buildEngineMetrics(engineId: string, state: EngineState): EngineMetrics {
    const latencies = state.latencies;
    const avg = latencies.length > 0
      ? latencies.reduce((sum, v) => sum + v, 0) / latencies.length
      : 0;

    return {
      engine_id: engineId,
      calls: state.calls,
      successes: state.successes,
      failures: state.failures,
      avg_latency_ms: avg,
      p95_latency_ms: this.computeP95(latencies),
      cache_hits: state.cache_hits,
      cache_misses: state.cache_misses,
    };
  }

  private computeP95(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const index = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}
