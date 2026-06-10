// ─── Reading Request / Response Contract ──────────────────────────────
// API contract for the integratedreading pipeline. Defines the request
// payload shape (including the new consciousness_level admin override)
// and the response shape (including the resolved level + source for
// auditability).
//
// Per design doc 2026-05-15-consciousness-level-register-design.md § 1.4.
// Closes #73 (P1.4).

import type { Tier } from './interpretation.js';
import type {
  ConsciousnessLevel,
  LevelSource,
  RegisterBand,
} from '../../scripts/integratedreading/level-resolver.js';
import type { RelationshipMode } from '../../scripts/asset-mode-policy.js';

// ────────────────────────────────────────────────────────────────────────
// Re-exports — single import surface for consumers
// ────────────────────────────────────────────────────────────────────────

export type {
  ConsciousnessLevel,
  LevelSource,
  RegisterBand,
  Tier,
};

// ────────────────────────────────────────────────────────────────────────
// Subject reference shape used in request payloads
// ────────────────────────────────────────────────────────────────────────

/**
 * Lightweight subject reference. Either a stored profile_id (the server
 * looks up the full birth-data record) OR an inline birth-data payload
 * for one-shot anonymous readings.
 */
export type SubjectRef =
  | { profile_id: string }
  | {
      subject: string;
      birth_date: string;        // YYYY-MM-DD
      birth_time?: string;       // HH:MM[:SS]
      birth_place?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    };

// ────────────────────────────────────────────────────────────────────────
// Request shape — what callers POST to the reading endpoints
// ────────────────────────────────────────────────────────────────────────

export interface ReadingRequest {
  /** The end-user the reading is FOR (used for stored-level lookup). */
  user_id: string;
  /** Mode key: 'composite-dyad' | 'partner-synastry' | etc. */
  mode: string;
  /** Normalized relationship/use-case mode used for no-assumption intake gating. */
  relationship_mode?: RelationshipMode;
  /** User/operator answers to the mode intake questions. Required by mode policy before generation. */
  mode_context?: Record<string, unknown>;
  /** Subjects in ordinal order — matches mode's role slots. */
  subjects: SubjectRef[];
  /**
   * Optional admin override. Only honored when the calling identity
   * (server-side, NOT this payload) has `tier === 'initiate'` OR an
   * explicit admin role flag. Non-admin requests passing this field
   * receive a 403 ForbiddenLevelOverride.
   *
   * Use case: admin generating QA / preview readings at a higher
   * register without changing the user's stored level permanently.
   */
  consciousness_level?: ConsciousnessLevel;
  /** Optional flag to chain solo synthesis for missing subjects. */
  chain_solos?: boolean;
  /** Optional flag to reuse the most-recent cached run if present. */
  use_cache?: boolean;
}

// ────────────────────────────────────────────────────────────────────────
// Response shape — what the reading endpoints return
// ────────────────────────────────────────────────────────────────────────

export interface ReadingResponse {
  reading_id: string;
  /** The level the orchestrator actually used (1-5). Always present. */
  effective_consciousness_level: ConsciousnessLevel;
  /** How the level was resolved — useful for client-side auditability + debug. */
  level_source: LevelSource;
  /** Which register band the reading was generated in. */
  register_band: RegisterBand;
  /** Mode key the reading was generated for. */
  mode: string;
  /** Relationship/use-case mode policy applied during generation. */
  relationship_mode?: RelationshipMode;
  /** Mode context answers used to prevent assumptions. */
  mode_context?: Record<string, unknown>;
  /** Total assembled word count. */
  total_words: number;
  /** Per-pass metric summary. */
  pass_metrics: Array<{
    id: string;
    title: string;
    words: number;
    xrefs: number;
    target_words: number;
    latency_ms: number;
    model: string;
  }>;
  /** Path to assembled markdown file (when applicable for server-rendered outputs). */
  markdown_path?: string;
  /** Path to interactive HTML artifact. */
  html_path?: string;
  /** Path to standalone SVG. */
  svg_path?: string;
  /** Run timestamp (ISO 8601). */
  generated_at: string;
}

// ────────────────────────────────────────────────────────────────────────
// Error response shape
// ────────────────────────────────────────────────────────────────────────

export interface ReadingErrorResponse {
  error: string;
  code:
    | 'FORBIDDEN_LEVEL_OVERRIDE'
    | 'INVALID_CONSCIOUSNESS_LEVEL'
    | 'UNKNOWN_MODE'
    | 'SUBJECT_COUNT_MISMATCH'
    | 'MISSING_SOLO_SYNTHESIS'
    | 'INTERNAL_ERROR';
  /** Caller-visible details — never leaks internal stack traces. */
  details?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────────
// Caller-identity shape — server passes this to the level-resolver
// ────────────────────────────────────────────────────────────────────────

/**
 * The authenticated caller's identity. Populated by the server's auth
 * middleware after verifying JWT / API key / etc. The orchestrator
 * receives this as INPUT — it never derives it from the request payload
 * (which would be trivially spoofable).
 */
export interface CallerIdentity {
  caller_id: string;
  caller_tier: Tier;
  caller_is_admin: boolean;
}
