// ─── Witness Agents — Interpretation Types ────────────────────────────
// The output types: what the dyad produces after interpreting engine results

import type { SelemeneEngineId, RoutingMode, SelemeneEngineOutput, SubscriptionTier } from './engine.js';
import type { AgentId } from './agent.js';

// ═══════════════════════════════════════════════════════════════════════
// KOSHA / CLIFFORD / TIER
// ═══════════════════════════════════════════════════════════════════════

export type Kosha = 'annamaya' | 'pranamaya' | 'manomaya' | 'vijnanamaya' | 'anandamaya';
export type CliffordLevel = 0 | 1 | 2 | 3 | 7;

/** WitnessOS tier names (mapped from Supabase plan_catalog via SUPABASE_TIER_MAP) */
export type Tier = 'free' | 'subscriber' | 'enterprise' | 'initiate';

export const KOSHA_CLIFFORD: Record<Kosha, CliffordLevel> = {
  annamaya: 0,
  pranamaya: 1,
  manomaya: 2,
  vijnanamaya: 3,
  anandamaya: 7,
};

export const TIER_MAX_KOSHA: Record<Tier, Kosha> = {
  free: 'annamaya',
  subscriber: 'manomaya',
  enterprise: 'vijnanamaya',
  initiate: 'anandamaya',
};

export const TIER_MAX_CLIFFORD: Record<Tier, CliffordLevel> = {
  free: 0,
  subscriber: 2,
  enterprise: 3,
  initiate: 7,
};

export const TIER_RATE_LIMITS: Record<Tier, number> = {
  free: 10,
  subscriber: 100,
  enterprise: Infinity,
  initiate: Infinity,
};

/** Maps Selemene consciousness_level (0-5) to max Kosha depth */
export const CONSCIOUSNESS_TO_KOSHA: Record<number, Kosha> = {
  0: 'annamaya',
  1: 'pranamaya',
  2: 'manomaya',
  3: 'vijnanamaya',
  4: 'anandamaya',
  5: 'anandamaya',
};

// ═══════════════════════════════════════════════════════════════════════
// USER CONTEXT — drives routing decisions
// ═══════════════════════════════════════════════════════════════════════

export type HttpMentalState = 200 | 301 | 404 | 500 | 503;
export type DominantCenter = 'heart' | 'head' | 'gut';

export interface UserState {
  tier: Tier;
  http_status: HttpMentalState;
  overwhelm_level: number;          // 0.0-1.0
  active_kosha: Kosha;
  dominant_center: DominantCenter;
  recursion_detected: boolean;
  anti_dependency_score: number;    // 0.0-1.0
  biorhythm?: {
    physical: number;
    emotional: number;
    intellectual: number;
  };
  session_query_count: number;
}

// ═══════════════════════════════════════════════════════════════════════
// WITNESS INTERPRETATION — the core output
// ═══════════════════════════════════════════════════════════════════════

export interface AgentInterpretation {
  agent: AgentId;
  perspective: string;          // The agent's interpretive contribution
  domains_consulted: string[];  // Which knowledge domains were queried
  confidence: number;           // 0.0-1.0
  somatic_note?: string;        // Pichet adds body-awareness notes
  pattern_note?: string;        // Aletheios adds pattern-recognition notes
}

export interface WitnessInterpretation {
  // ─── Metadata ──────────────────────────────────
  id: string;
  timestamp: string;
  query: string;

  // ─── Engine Results (raw from Selemene) ─────────
  engines_invoked: SelemeneEngineId[];
  engine_outputs: SelemeneEngineOutput[];
  routing_mode: RoutingMode;
  workflow_id?: string;

  // ─── Dyad Interpretation ───────────────────────
  aletheios?: AgentInterpretation;
  pichet?: AgentInterpretation;
  synthesis?: string;              // Merged dyad interpretation

  // ─── Gating Metadata ──────────────────────────
  tier: Tier;
  kosha_depth: Kosha;
  clifford_level: CliffordLevel;

  // ─── User-Facing Response ─────────────────────
  response: string;               // The final response delivered to user
  response_cadence: 'immediate' | 'measured' | 'slow';  // Timing for delivery

  // ─── Safety & Growth ──────────────────────────
  overwhelm_flag: boolean;
  recursion_flag: boolean;
  anti_dependency_note?: string;   // If user is becoming dependent
  graduation_prompt?: string;      // If user is ready to self-author
}

// ═══════════════════════════════════════════════════════════════════════
// PIPELINE QUERY — what comes in
// ═══════════════════════════════════════════════════════════════════════

export interface PipelineQuery {
  query: string;
  user_state: UserState;
  engine_hints?: SelemeneEngineId[];      // User or system can suggest engines
  workflow_hint?: string;                 // Suggest a workflow e.g. 'daily-practice'
  session_id: string;
  request_id: string;
}

// ═══════════════════════════════════════════════════════════════════════
// SELEMENE API CLIENT CONFIG
// ═══════════════════════════════════════════════════════════════════════

export interface SelemeneClientConfig {
  base_url: string;              // e.g. "https://selemene.railway.app" or "http://localhost:8080"
  auth_token?: string;           // JWT Bearer token
  api_key?: string;              // API key (alternative auth)
  timeout_ms?: number;           // default 30000
}
