// ─── Witness Agents — Agent State Machine ─────────────────────────────
// Issue #2: ANNAMAYA-002
// Runtime state machine for Aletheios & Pichet with dyad coordination

import {
  type AgentId,
  type AgentState,
  type AgentStateSnapshot,
  type DyadState,
  type HeartbeatCheck,
  STATE_TRANSITIONS,
  ALETHEIOS_IDENTITY,
  PICHET_IDENTITY,
  ALETHEIOS_HEARTBEAT_MS,
  PICHET_HEARTBEAT_MS,
} from '../types/agent.js';
import type { RoutingMode } from '../types/engine.js';

// ═══════════════════════════════════════════════════════════════════════
// SINGLE AGENT STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════

export class AgentStateMachine {
  private snapshot: AgentStateSnapshot;

  constructor(agentId: AgentId) {
    const isAletheios = agentId === 'aletheios';
    this.snapshot = {
      agent: agentId,
      state: 'DORMANT',
      last_transition: new Date().toISOString(),
      activation_count: 0,
      clifford_gate_level: 0,
      dyad_sync_status: 'awaiting_partner',
      anti_dependency_score: 0,
      heartbeat_interval_ms: isAletheios ? ALETHEIOS_HEARTBEAT_MS : PICHET_HEARTBEAT_MS,
      last_heartbeat: new Date().toISOString(),
      memory_integrity: 'nominal',
    };
  }

  get state(): AgentState {
    return this.snapshot.state;
  }

  get id(): AgentId {
    return this.snapshot.agent;
  }

  getSnapshot(): Readonly<AgentStateSnapshot> {
    return { ...this.snapshot };
  }

  /**
   * Attempt a state transition. Returns true if valid, false if rejected.
   */
  transition(targetState: AgentState): boolean {
    const allowed = STATE_TRANSITIONS[this.snapshot.state];
    if (!allowed.includes(targetState)) {
      return false;
    }
    this.snapshot.state = targetState;
    this.snapshot.last_transition = new Date().toISOString();
    if (targetState === 'ACTIVATING') {
      this.snapshot.activation_count++;
    }
    return true;
  }

  /**
   * Activate agent — moves from DORMANT → ACTIVATING → ACTIVE
   */
  activate(cliffordLevel: number): boolean {
    if (this.snapshot.state !== 'DORMANT') return false;
    if (!this.transition('ACTIVATING')) return false;
    this.snapshot.clifford_gate_level = cliffordLevel;
    return this.transition('ACTIVE');
  }

  /**
   * Begin interpretation
   */
  beginInterpretation(): boolean {
    return this.transition('INTERPRETING');
  }

  /**
   * Begin synthesis (only after interpretation)
   */
  beginSynthesis(): boolean {
    return this.transition('SYNTHESIZING');
  }

  /**
   * Cool down and return to dormant
   */
  deactivate(): boolean {
    if (this.snapshot.state === 'DORMANT') return true;
    if (this.snapshot.state === 'COOLING') {
      return this.transition('DORMANT');
    }
    // From ACTIVE or SYNTHESIZING, go through COOLING
    if (this.transition('COOLING')) {
      return this.transition('DORMANT');
    }
    return false;
  }

  /**
   * Heartbeat check
   */
  heartbeat(partnerState: AgentState): HeartbeatCheck {
    const check: HeartbeatCheck = {
      dyad_link_live: partnerState !== 'DORMANT' || this.snapshot.state === 'DORMANT',
      memory_integrity: this.snapshot.memory_integrity === 'nominal',
      clifford_calibrated: this.snapshot.clifford_gate_level >= 0,
      anti_dependency_check: this.snapshot.anti_dependency_score < 0.8,
    };
    this.snapshot.last_heartbeat = new Date().toISOString();

    // Update dyad sync
    if (partnerState === 'DORMANT' && this.snapshot.state === 'DORMANT') {
      this.snapshot.dyad_sync_status = 'awaiting_partner';
    } else if (partnerState !== 'DORMANT' && this.snapshot.state !== 'DORMANT') {
      this.snapshot.dyad_sync_status = 'synced';
    } else {
      this.snapshot.dyad_sync_status = 'solo';
    }

    return check;
  }

  /**
   * Update anti-dependency score (called after each interpretation)
   * Score increases when user asks novel questions, decreases on repetition
   */
  updateAntiDependency(delta: number): void {
    this.snapshot.anti_dependency_score = Math.max(0, Math.min(1,
      this.snapshot.anti_dependency_score + delta
    ));
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DYAD COORDINATOR — ensures both agents honor dyad constraints
// ═══════════════════════════════════════════════════════════════════════

export class DyadCoordinator {
  public readonly aletheios: AgentStateMachine;
  public readonly pichet: AgentStateMachine;
  private queryCount = 0;
  private recursionDetected = false;
  private overwhelmLevel = 0;
  private recentQueries: string[] = [];

  constructor() {
    this.aletheios = new AgentStateMachine('aletheios');
    this.pichet = new AgentStateMachine('pichet');
  }

  getState(): DyadState {
    const a = this.aletheios.getSnapshot();
    const p = this.pichet.getSnapshot();

    let sync_status: DyadState['sync_status'];
    if (a.state === 'DORMANT' && p.state === 'DORMANT') sync_status = 'both_dormant';
    else if (a.state === 'SYNTHESIZING' || p.state === 'SYNTHESIZING') sync_status = 'synthesizing';
    else if (a.state === 'INTERPRETING' || p.state === 'INTERPRETING') sync_status = 'interpreting';
    else if (a.state !== 'DORMANT' && p.state !== 'DORMANT') sync_status = 'both_active';
    else sync_status = 'one_active';

    return {
      aletheios: a,
      pichet: p,
      sync_status,
      active_routing: 'none',
      session_query_count: this.queryCount,
      recursion_detected: this.recursionDetected,
      overwhelm_level: this.overwhelmLevel,
    };
  }

  /**
   * Activate for a query based on routing mode.
   * Enforces: no INTERPRETING without partner at least ACTIVE (at enterprise+)
   */
  activateForQuery(
    routing: RoutingMode,
    cliffordLevel: number,
    requireDyad: boolean,
  ): { aletheios_active: boolean; pichet_active: boolean } {
    let aActive = false;
    let pActive = false;

    switch (routing) {
      case 'aletheios-primary':
        aActive = this.aletheios.activate(cliffordLevel);
        if (requireDyad) {
          pActive = this.pichet.activate(cliffordLevel);
        }
        break;
      case 'pichet-primary':
        pActive = this.pichet.activate(cliffordLevel);
        if (requireDyad) {
          aActive = this.aletheios.activate(cliffordLevel);
        }
        break;
      case 'dyad-synthesis':
        aActive = this.aletheios.activate(cliffordLevel);
        pActive = this.pichet.activate(cliffordLevel);
        break;
    }

    return { aletheios_active: aActive, pichet_active: pActive };
  }

  /**
   * Run interpretation phase. Returns which agents interpreted.
   */
  interpret(routing: RoutingMode): { aletheios: boolean; pichet: boolean } {
    let a = false;
    let p = false;

    switch (routing) {
      case 'aletheios-primary':
        a = this.aletheios.beginInterpretation();
        break;
      case 'pichet-primary':
        p = this.pichet.beginInterpretation();
        break;
      case 'dyad-synthesis':
        a = this.aletheios.beginInterpretation();
        p = this.pichet.beginInterpretation();
        break;
    }

    return { aletheios: a, pichet: p };
  }

  /**
   * Run synthesis phase
   */
  synthesize(): boolean {
    const aReady = this.aletheios.state === 'INTERPRETING';
    const pReady = this.pichet.state === 'INTERPRETING';

    if (aReady) this.aletheios.beginSynthesis();
    if (pReady) this.pichet.beginSynthesis();

    return aReady || pReady;
  }

  /**
   * Deactivate both agents after query completion
   */
  deactivate(): void {
    this.aletheios.deactivate();
    this.pichet.deactivate();
  }

  /**
   * Track query for recursion detection
   */
  trackQuery(query: string): void {
    this.queryCount++;
    this.recentQueries.push(query);
    if (this.recentQueries.length > 10) this.recentQueries.shift();

    // Simple recursion detection: >30% similar queries in window
    const normalized = query.toLowerCase().trim();
    const similar = this.recentQueries.filter(q => {
      const n = q.toLowerCase().trim();
      return n === normalized || levenshteinRatio(n, normalized) > 0.7;
    });
    this.recursionDetected = similar.length >= 3;
  }

  /**
   * Overwhelm assessment (Pichet's responsibility)
   * Updates based on query cadence, session length, and topic heaviness
   */
  assessOverwhelm(factors: {
    query_cadence_per_min: number;
    heavy_topics: boolean;
    session_duration_min: number;
  }): number {
    let level = 0;
    if (factors.query_cadence_per_min > 5) level += 0.3;
    else if (factors.query_cadence_per_min > 2) level += 0.1;
    if (factors.heavy_topics) level += 0.3;
    if (factors.session_duration_min > 60) level += 0.2;
    else if (factors.session_duration_min > 30) level += 0.1;
    if (this.recursionDetected) level += 0.2;

    this.overwhelmLevel = Math.min(1, level);
    return this.overwhelmLevel;
  }

  /**
   * Run heartbeats for both agents
   */
  heartbeat(): { aletheios: HeartbeatCheck; pichet: HeartbeatCheck } {
    return {
      aletheios: this.aletheios.heartbeat(this.pichet.state),
      pichet: this.pichet.heartbeat(this.aletheios.state),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════════

function levenshteinRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
