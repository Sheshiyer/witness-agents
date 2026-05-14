// ─── Witness Agents — Interpretation Types ────────────────────────────
// The output types: what the dyad produces after interpreting engine results

import type { SelemeneEngineId, RoutingMode, SelemeneEngineOutput } from './engine.js';
import type { AgentId } from './agent.js';
import { WITNESS_CAPABILITY_PROFILES } from '../config/witness-capabilities.js';

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
  free: WITNESS_CAPABILITY_PROFILES.free.max_kosha,
  subscriber: WITNESS_CAPABILITY_PROFILES.subscriber.max_kosha,
  enterprise: WITNESS_CAPABILITY_PROFILES.enterprise.max_kosha,
  initiate: WITNESS_CAPABILITY_PROFILES.initiate.max_kosha,
};

export const TIER_MAX_CLIFFORD: Record<Tier, CliffordLevel> = {
  free: WITNESS_CAPABILITY_PROFILES.free.max_clifford,
  subscriber: WITNESS_CAPABILITY_PROFILES.subscriber.max_clifford,
  enterprise: WITNESS_CAPABILITY_PROFILES.enterprise.max_clifford,
  initiate: WITNESS_CAPABILITY_PROFILES.initiate.max_clifford,
};

export const TIER_RATE_LIMITS: Record<Tier, number> = {
  free: WITNESS_CAPABILITY_PROFILES.free.rate_limit_per_day,
  subscriber: WITNESS_CAPABILITY_PROFILES.subscriber.rate_limit_per_day,
  enterprise: WITNESS_CAPABILITY_PROFILES.enterprise.rate_limit_per_day,
  initiate: WITNESS_CAPABILITY_PROFILES.initiate.rate_limit_per_day,
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
  provider?: 'openrouter' | 'nvidia' | 'anthropic' | 'openai' | 'local';
  model_used?: string;
}

export interface WitnessInferenceRoleTrace {
  provider: 'openrouter' | 'nvidia' | 'anthropic' | 'openai' | 'local';
  model_used: string;
  latency_ms: number;
  cost_estimate_usd?: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface WitnessInferenceTrace {
  provider: 'openrouter' | 'nvidia' | 'anthropic' | 'openai' | 'local';
  roles: Partial<Record<'aletheios' | 'pichet' | 'synthesis', WitnessInferenceRoleTrace>>;
}

export interface WitnessReadingSubject {
  name?: string;
  birth_date: string;
  birth_time?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  location_label?: string | null;
}

export interface WitnessEvidenceContribution {
  engine_id: string;
  signal: string;
  impact: string;
}

export interface WitnessEvidence {
  engines_used: SelemeneEngineId[];
  contributions: WitnessEvidenceContribution[];
}

export interface WitnessRagaReference {
  raga_number?: number;
  raga_name: string;
  reason?: string | null;
  score?: number | null;
}

export interface WitnessChakraAttunement {
  chakra_name: string;
  solfeggio_hz: number;
  binaural_target_hz: number;
}

export interface WitnessResonance {
  listening_window: string | null;
  primary_raga: WitnessRagaReference | null;
  supporting_ragas: WitnessRagaReference[];
  dosha_dominance: string | null;
  energy_quality: string | null;
  dosha_guidance: string | null;
  rasa: string | null;
  chakra_attunement: WitnessChakraAttunement | null;
}

export interface WitnessCreativeNumerology {
  value: number;
  phase: string | null;
  percentage: number | null;
  cycle_day: number | null;
  is_critical: boolean;
}

export interface WitnessCreativeSigilCharge {
  name: string;
  description: string;
}

export interface WitnessCreativeSigil {
  intention: string | null;
  method_name: string | null;
  method_description: string | null;
  method_steps: string[];
  charging_suggestions: WitnessCreativeSigilCharge[];
  note: string | null;
  next_steps: string[];
  svg_status: string | null;
}

export interface WitnessCreativeGeometry {
  form_name: string | null;
  description: string | null;
  symbolism: string | null;
  elements: string[];
  numerology: number | null;
  meditation_prompt: string | null;
  duration_suggestion: string | null;
  intention: string | null;
  svg_status: string | null;
}

export interface WitnessCreativeSurface {
  intention: string | null;
  numerology: WitnessCreativeNumerology | null;
  resonance: WitnessResonance | null;
  sigil: WitnessCreativeSigil | null;
  geometry: WitnessCreativeGeometry | null;
  ritual: string[];
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
  inference?: WitnessInferenceTrace;
  title?: string;
  summary?: string;
  convergences?: string[];
  frictions?: string[];
  practice?: string[];
  question?: string;
  evidence?: WitnessEvidence;
  resonance?: WitnessResonance;
  creative_surface?: WitnessCreativeSurface;

  // ─── Safety & Growth ──────────────────────────
  overwhelm_flag: boolean;
  recursion_flag: boolean;
  anti_dependency_note?: string;   // If user is becoming dependent
  graduation_prompt?: string;      // If user is ready to self-author
}

// ═══════════════════════════════════════════════════════════════════════
// BIRTH DATA — required for Selemene engine calculations
// ═══════════════════════════════════════════════════════════════════════

export interface BirthData {
  name?: string;
  date: string;              // YYYY-MM-DD
  time?: string;             // HH:MM
  latitude: number;
  longitude: number;
  timezone: string;          // e.g. "Asia/Kolkata"
}

export type Precision = 'Standard' | 'High' | 'Extreme';

// ═══════════════════════════════════════════════════════════════════════
// PIPELINE QUERY — what comes in
// ═══════════════════════════════════════════════════════════════════════

export interface PipelineQuery {
  query: string;
  user_state: UserState;
  birth_data: BirthData;                  // Required for Selemene API calls
  engine_hints?: SelemeneEngineId[];      // User or system can suggest engines
  workflow_hint?: string;                 // Suggest a workflow e.g. 'daily-practice'
  precision?: Precision;                  // Default: 'Standard'
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
