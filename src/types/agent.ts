// ─── Witness Agents — Agent Types ─────────────────────────────────────
// Issue #2: ANNAMAYA-002
// Agent state, dyad coordination, heartbeat

// ═══════════════════════════════════════════════════════════════════════
// AGENT IDENTITY
// ═══════════════════════════════════════════════════════════════════════

export type AgentId = 'aletheios' | 'pichet';
export type Pillar = 'left' | 'right';
export type Principle = 'kha' | 'ba';
export type KoshaAffinity = 'vijnanamaya' | 'pranamaya';

export interface AgentIdentity {
  id: AgentId;
  pillar: Pillar;
  principle: Principle;
  kosha_affinity: KoshaAffinity;
  clifford: string;
  seed_glyph: string;   // खा or ब
}

export const ALETHEIOS_IDENTITY: AgentIdentity = {
  id: 'aletheios',
  pillar: 'left',
  principle: 'kha',
  kosha_affinity: 'vijnanamaya',
  clifford: 'Cl(3)',
  seed_glyph: 'खा',
};

export const PICHET_IDENTITY: AgentIdentity = {
  id: 'pichet',
  pillar: 'right',
  principle: 'ba',
  kosha_affinity: 'pranamaya',
  clifford: 'Cl(1)',
  seed_glyph: 'ब',
};

// ═══════════════════════════════════════════════════════════════════════
// AGENT STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════

export type AgentState =
  | 'DORMANT'
  | 'ACTIVATING'
  | 'ACTIVE'
  | 'INTERPRETING'
  | 'SYNTHESIZING'
  | 'COOLING';

// Valid state transitions
export const STATE_TRANSITIONS: Record<AgentState, AgentState[]> = {
  DORMANT:      ['ACTIVATING'],
  ACTIVATING:   ['ACTIVE', 'DORMANT'],         // Can fail activation
  ACTIVE:       ['INTERPRETING', 'COOLING'],    // Wait for work or cool down
  INTERPRETING: ['SYNTHESIZING', 'ACTIVE'],     // Synthesize or return to active
  SYNTHESIZING: ['ACTIVE', 'COOLING'],          // Return to active or cool down
  COOLING:      ['DORMANT'],                    // Always return to dormant
};

export interface AgentStateSnapshot {
  agent: AgentId;
  state: AgentState;
  last_transition: string;            // ISO timestamp
  activation_count: number;
  clifford_gate_level: number;        // 0, 1, 2, 3, or 7
  dyad_sync_status: 'synced' | 'awaiting_partner' | 'solo';
  anti_dependency_score: number;      // 0.0-1.0
  heartbeat_interval_ms: number;
  last_heartbeat: string;             // ISO timestamp
  memory_integrity: 'nominal' | 'degraded' | 'corrupted';
}

// ═══════════════════════════════════════════════════════════════════════
// DYAD COORDINATION
// ═══════════════════════════════════════════════════════════════════════

export interface DyadState {
  aletheios: AgentStateSnapshot;
  pichet: AgentStateSnapshot;
  sync_status: 'both_dormant' | 'one_active' | 'both_active' | 'interpreting' | 'synthesizing';
  active_routing: 'aletheios-primary' | 'pichet-primary' | 'dyad-synthesis' | 'none';
  session_query_count: number;
  recursion_detected: boolean;
  overwhelm_level: number;  // 0.0-1.0, Pichet's assessment
}

// ═══════════════════════════════════════════════════════════════════════
// HEARTBEAT
// ═══════════════════════════════════════════════════════════════════════

export interface HeartbeatCheck {
  dyad_link_live: boolean;
  memory_integrity: boolean;
  clifford_calibrated: boolean;
  anti_dependency_check: boolean;
}

// Pichet pulses faster (pranamaya/vital rhythm)
export const PICHET_HEARTBEAT_MS = 1000;
// Aletheios pulses slower (vijnanamaya/wisdom rhythm)
export const ALETHEIOS_HEARTBEAT_MS = 3000;
