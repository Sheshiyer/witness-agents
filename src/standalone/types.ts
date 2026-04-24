// ─── Daily Witness — Standalone Product Types ──────────────────────────
// The gateway product: 4 somatic engines × 3 decoder ring layers.
// Honors the Easter Egg Economy: signals placed for finders, not fed downstream.

import type { SelemeneEngineId, SelemeneEngineOutput, BirthData } from '../types/engine.js';
import type { Tier } from '../types/interpretation.js';

// ═══════════════════════════════════════════════════════════════════════
// STANDALONE ENGINE SUBSET
// ═══════════════════════════════════════════════════════════════════════

/** The 4 somatic engines exposed in the standalone product */
export const STANDALONE_ENGINES = [
  'biorhythm',    // Body hook — changes daily, reason to return each morning
  'vedic-clock',  // Time hook — changes hourly, reason to check throughout day
  'panchanga',    // Cultural differentiator — nothing else like it in market
  'numerology',   // Birth anchor — one-time deep read, universal appeal
] as const;

export type StandaloneEngineId = typeof STANDALONE_ENGINES[number];

/** Maps standalone engines to their witnessing role */
export const ENGINE_WITNESS_ROLE: Record<StandaloneEngineId, EngineRole> = {
  'biorhythm':   'somatic-pulse',      // Felt before understood
  'vedic-clock': 'temporal-rhythm',    // The body's clock, not the mind's
  'panchanga':   'cosmic-weather',     // Tithi/nakshatra as living context
  'numerology':  'structural-anchor',  // The unchanging birth architecture
};

export type EngineRole = 'somatic-pulse' | 'temporal-rhythm' | 'cosmic-weather' | 'structural-anchor';

// ═══════════════════════════════════════════════════════════════════════
// DECODER RING — 3 LAYERS
// ═══════════════════════════════════════════════════════════════════════

/** The three progressively deeper layers of the Daily Mirror */
export type MirrorLayer = 1 | 2 | 3;

/** Layer 1: Raw data. No interpretation. Precision IS the signal. */
export interface Layer1_RawMirror {
  layer: 1;
  engine_id: StandaloneEngineId;
  engine_role: EngineRole;
  raw_data: Record<string, unknown>;    // Engine-specific data, lightly formatted
  headline: string;                      // ≤80 chars, factual, no interpretation
  data_points: DataPoint[];              // Structured key-value pairs for display
  timestamp: string;
}

/** A single displayable data point from an engine */
export interface DataPoint {
  label: string;       // e.g. "Physical Energy"
  value: string;       // e.g. "67%"
  category: 'body' | 'time' | 'cosmic' | 'structure';
  emphasis?: boolean;  // Highlight if critical/peak
}

/** Layer 2: The Witness Question. Not explanation — inquiry. */
export interface Layer2_WitnessQuestion {
  layer: 2;
  question: string;           // A question calibrated to the reading
  prompt_source: 'pichet';    // Always Pichet in standalone (somatic territory)
  context_hint: string;       // Why this question, without explaining the answer
  somatic_nudge?: string;     // Body-awareness micro-prompt (≤140 chars)
}

/** Layer 3: The Meta-Pattern. Cross-engine resonance. The decoder ring opens. */
export interface Layer3_MetaPattern {
  layer: 3;
  pattern_name: string;            // Named pattern across engines
  resonance_description: string;   // How the engines speak to each other today
  cross_references: CrossRef[];    // Engine × engine connections
  finders_whisper?: string;        // If 14+ days: "There are 12 more mirrors..."
  graduation_note?: string;        // If 30+ days: "You see it now."
}

export interface CrossRef {
  engine_a: StandaloneEngineId;
  engine_b: StandaloneEngineId;
  connection: string;             // How these two readings relate
}

// ═══════════════════════════════════════════════════════════════════════
// DAILY READING — the complete output
// ═══════════════════════════════════════════════════════════════════════

export interface DailyReading {
  // ─── Identity ──────────────────────────────────
  id: string;                       // Unique reading ID
  date: string;                     // ISO date
  birth_date: string;               // User's birth date (for cache key)
  
  // ─── Primary Engine (today's focus) ────────────
  primary_engine: StandaloneEngineId;
  primary_reading: Layer1_RawMirror;
  
  // ─── All 4 Engines (always computed) ───────────
  all_readings: Record<StandaloneEngineId, Layer1_RawMirror>;
  
  // ─── Depth Layers (unlocked progressively) ─────
  witness_question?: Layer2_WitnessQuestion;   // Layer 2 (unlocked)
  meta_pattern?: Layer3_MetaPattern;            // Layer 3 (unlocked)
  
  // ─── Decoder State ─────────────────────────────
  max_layer_unlocked: MirrorLayer;
  decoder_state: DecoderState;
  
  // ─── Metadata ──────────────────────────────────
  engines_called: StandaloneEngineId[];
  total_latency_ms: number;
  standalone_version: string;
}

// ═══════════════════════════════════════════════════════════════════════
// DECODER STATE — tracks user's progression through the ring
// ═══════════════════════════════════════════════════════════════════════

export interface DecoderState {
  user_hash: string;             // SHA-256(birth_data) — no PII stored
  total_visits: number;
  consecutive_days: number;
  last_visit: string;            // ISO date
  first_visit: string;           // ISO date
  max_layer_reached: MirrorLayer;
  finder_gate_shown: boolean;    // Has the 14-day whisper been shown?
  graduation_shown: boolean;     // Has the 30-day graduation been shown?
  engines_most_viewed: Record<StandaloneEngineId, number>;  // View counts per engine
}

/** Thresholds for layer progression */
export const DECODER_THRESHOLDS = {
  layer_2_visits: 3,        // 3+ visits OR paid tier
  layer_2_consecutive: 2,   // OR 2+ consecutive days
  layer_3_consecutive: 7,   // 7+ consecutive days OR enterprise tier
  finders_gate_days: 14,    // The whisper about the other 12 engines
  graduation_days: 30,      // "You see the patterns without us now"
} as const;

// ═══════════════════════════════════════════════════════════════════════
// STANDALONE TIER — maps to core system tiers
// ═══════════════════════════════════════════════════════════════════════

/** Standalone pricing tiers (subset of full system) */
export type StandaloneTier = 'witness-free' | 'witness-subscriber';

export const STANDALONE_TO_CORE_TIER: Record<StandaloneTier, Tier> = {
  'witness-free': 'free',
  'witness-subscriber': 'subscriber',
};

/** What each standalone tier unlocks */
export const STANDALONE_TIER_FEATURES: Record<StandaloneTier, {
  layer_2_immediate: boolean;     // Skip visit-count gate for Layer 2
  layer_3_immediate: boolean;     // Skip consecutive-days gate for Layer 3
  llm_interpretation: boolean;    // LLM-powered witness question
  hourly_vedic: boolean;          // vedic-clock hourly push
  all_engines_parallel: boolean;  // Show all 4 engines simultaneously
}> = {
  'witness-free': {
    layer_2_immediate: false,
    layer_3_immediate: false,
    llm_interpretation: false,
    hourly_vedic: false,
    all_engines_parallel: false,
  },
  'witness-subscriber': {
    layer_2_immediate: true,
    layer_3_immediate: false,     // Still requires 7 days — earned, not bought
    llm_interpretation: true,
    hourly_vedic: true,
    all_engines_parallel: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// SKILLS.SH INTERFACE
// ═══════════════════════════════════════════════════════════════════════

/** skills.sh request format */
export interface SkillsShRequest {
  birth_date: string;       // YYYY-MM-DD (required)
  birth_time?: string;      // HH:MM (optional but recommended)
  latitude?: number;        // default: 0
  longitude?: number;       // default: 0
  timezone?: string;        // default: UTC
  engine?: StandaloneEngineId;  // specific engine, or omit for daily primary
}

/** skills.sh response format */
export interface SkillsShResponse {
  reading: DailyReading;
  next_reading_available: string;  // ISO timestamp
  engines_available: StandaloneEngineId[];
  full_platform_url: string;       // tryambakam.space
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════
// FOOLS GATE — first-encounter engineering
// ═══════════════════════════════════════════════════════════════════════

export interface FoolsGateResponse {
  is_first_encounter: boolean;
  calibration_engine: 'biorhythm';  // Always biorhythm first — most verifiable
  recognition_hook: string;          // The one data point that makes them go "wait..."
  silence_after: boolean;            // Don't explain. Let it land.
}
