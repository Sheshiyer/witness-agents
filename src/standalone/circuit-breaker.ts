// ─── Daily Witness — Circuit Breaker ────────────────────────────────────
// In-memory circuit breaker for Selemene engine failures.
// Prevents wasted API calls to engines that are consistently failing.
//
// Pattern: closed → open (after N failures) → half-open (after cooldown) → closed/open
// Independent of cache — they're separate concerns.
// No persistence needed — resets on restart, which is fine for API protection.

import type { StandaloneEngineId } from './types.js';
import { STANDALONE_ENGINES } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface EngineHealth {
  engine_id: StandaloneEngineId;
  state: CircuitState;
  consecutive_failures: number;
  last_failure_time?: number;    // Unix ms
  last_success_time?: number;    // Unix ms
  total_failures: number;
  total_successes: number;
  last_error?: string;
}

export interface CircuitBreakerConfig {
  failure_threshold: number;      // Consecutive failures before opening (default: 3)
  cooldown_ms: number;            // Time before half-open retry (default: 60_000 = 1 min)
  half_open_max_attempts: number; // Max retries in half-open (default: 1)
}

// ═══════════════════════════════════════════════════════════════════════
// SUBSTITUTE MAP — engines that can cover for each other
// ═══════════════════════════════════════════════════════════════════════

const SUBSTITUTE_MAP: Record<StandaloneEngineId, StandaloneEngineId> = {
  'biorhythm':   'vedic-clock',   // daily body → hourly body
  'vedic-clock': 'biorhythm',     // hourly body → daily body
  'panchanga':   'numerology',    // cosmic → structural
  'numerology':  'panchanga',     // structural → cosmic
};

// ═══════════════════════════════════════════════════════════════════════
// INTERNAL STATE
// ═══════════════════════════════════════════════════════════════════════

interface InternalState {
  state: CircuitState;
  consecutive_failures: number;
  last_failure_time?: number;
  last_success_time?: number;
  total_failures: number;
  total_successes: number;
  last_error?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failure_threshold: 3,
  cooldown_ms: 60_000,
  half_open_max_attempts: 1,
};

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private engines: Map<StandaloneEngineId, InternalState>;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.engines = new Map();

    // Initialize all engines with closed state
    for (const engineId of STANDALONE_ENGINES) {
      this.engines.set(engineId, {
        state: 'closed',
        consecutive_failures: 0,
        total_failures: 0,
        total_successes: 0,
      });
    }
  }

  /**
   * Check if an engine can be called.
   * Returns false if circuit is open and cooldown hasn't elapsed.
   * Transitions open → half-open if cooldown has elapsed.
   */
  canCall(engineId: StandaloneEngineId): boolean {
    const state = this.getState(engineId);

    if (state.state === 'closed') {
      return true;
    }

    if (state.state === 'half-open') {
      return true;
    }

    // state === 'open' — check if cooldown has elapsed
    if (state.last_failure_time !== undefined) {
      const elapsed = Date.now() - state.last_failure_time;
      if (elapsed >= this.config.cooldown_ms) {
        // Transition to half-open
        state.state = 'half-open';
        return true;
      }
    }

    return false;
  }

  /**
   * Record a successful engine call.
   * Resets consecutive failures and closes the circuit.
   */
  recordSuccess(engineId: StandaloneEngineId): void {
    const state = this.getState(engineId);
    state.consecutive_failures = 0;
    state.total_successes++;
    state.last_success_time = Date.now();
    state.state = 'closed';
  }

  /**
   * Record a failed engine call.
   * Increments failure count, opens circuit at threshold.
   */
  recordFailure(engineId: StandaloneEngineId, error: string): void {
    const state = this.getState(engineId);
    state.consecutive_failures++;
    state.total_failures++;
    state.last_failure_time = Date.now();
    state.last_error = error;

    // Open circuit if threshold reached (or re-open from half-open)
    if (state.consecutive_failures >= this.config.failure_threshold || state.state === 'half-open') {
      state.state = 'open';
    }
  }

  /**
   * Get health for one engine or all engines.
   */
  getHealth(): EngineHealth[];
  getHealth(engineId: StandaloneEngineId): EngineHealth;
  getHealth(engineId?: StandaloneEngineId): EngineHealth | EngineHealth[] {
    if (engineId !== undefined) {
      return this.toHealth(engineId, this.getState(engineId));
    }
    return STANDALONE_ENGINES.map(id => this.toHealth(id, this.getState(id)));
  }

  /**
   * Get a substitute engine if the requested one has an open circuit.
   * Returns null if the substitute is also open.
   */
  getSubstitute(engineId: StandaloneEngineId): StandaloneEngineId | null {
    const substitute = SUBSTITUTE_MAP[engineId];
    if (!substitute) return null;

    // Only suggest substitute if it's callable
    const subState = this.getState(substitute);
    if (subState.state === 'open') {
      // Check if cooldown elapsed — if so it would be half-open, which is callable
      if (subState.last_failure_time !== undefined) {
        const elapsed = Date.now() - subState.last_failure_time;
        if (elapsed >= this.config.cooldown_ms) {
          return substitute;
        }
      }
      return null;
    }

    return substitute;
  }

  // ─── Private ──────────────────────────────────────────────────────

  private getState(engineId: StandaloneEngineId): InternalState {
    let state = this.engines.get(engineId);
    if (!state) {
      state = {
        state: 'closed',
        consecutive_failures: 0,
        total_failures: 0,
        total_successes: 0,
      };
      this.engines.set(engineId, state);
    }
    return state;
  }

  private toHealth(engineId: StandaloneEngineId, state: InternalState): EngineHealth {
    return {
      engine_id: engineId,
      state: state.state,
      consecutive_failures: state.consecutive_failures,
      last_failure_time: state.last_failure_time,
      last_success_time: state.last_success_time,
      total_failures: state.total_failures,
      total_successes: state.total_successes,
      last_error: state.last_error,
    };
  }
}
