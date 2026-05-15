// ─── /api/auth — Caller Identity + consciousness_level Gate ────────────
//
// SECURITY BOUNDARY
// ─────────────────
// This module is the perimeter that decides whether a request body's
// `consciousness_level` field is honored. The level-resolver enforces
// the SAME rule defensively, but the API gate runs FIRST so callers get
// a clean 403 rather than a leaked stack trace.
//
// Threat model: an end-user on the `free` tier crafts an HTTP request
// with `consciousness_level: 5` in the JSON body. Without this gate,
// they would receive a reading at the framework-native register (4-5)
// rather than the open-language register (1-3) their tier authorizes.
//
// Per design doc 2026-05-15-consciousness-level-register-design.md
// § "Security boundary" and the level-resolver's matching block in
// scripts/integratedreading/level-resolver.ts.
//
// Closes #78 (P2.5).
//
// ─── Identity derivation strategy ──────────────────────────────────────
// Production deployments will replace this with JWT/OIDC/session
// middleware. The current shape is a transitional dev-friendly mapping:
//
//   1. Headers (case-insensitive lookup):
//        X-Caller-Id        → caller_id (string)
//        X-Caller-Tier      → caller_tier (Tier enum, validated)
//        X-Caller-Admin     → caller_is_admin ('1' | 'true' → true)
//
//   2. Environment escape hatch (LOCAL DEV ONLY):
//        WITNESS_DEV_ADMIN=1 → caller_is_admin = true
//        This MUST NOT be set in production. Document this in deploy
//        runbooks — it is a deliberate dev affordance, not a backdoor.
//
//   3. Defaults:
//        caller_id   → 'anonymous'
//        caller_tier → 'free'
//        caller_is_admin → false

import { isCallerAdmin } from '../../scripts/integratedreading/level-resolver.js';
import type { CallerIdentity, ReadingErrorResponse } from '../types/reading-request.js';
import type { Tier } from '../types/interpretation.js';

// ────────────────────────────────────────────────────────────────────────
// Tier validation — keeps unknown values from leaking through
// ────────────────────────────────────────────────────────────────────────

const VALID_TIERS: ReadonlySet<Tier> = new Set<Tier>([
  'free',
  'subscriber',
  'enterprise',
  'initiate',
]);

function parseTier(value: unknown): Tier {
  if (typeof value === 'string' && VALID_TIERS.has(value as Tier)) {
    return value as Tier;
  }
  return 'free';
}

function parseBool(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

// ────────────────────────────────────────────────────────────────────────
// deriveCallerIdentity
// ────────────────────────────────────────────────────────────────────────

export interface DeriveCallerIdentityInput {
  /**
   * HTTP request headers — keys MUST be lower-cased by the caller
   * (matches `node:http` IncomingHttpHeaders convention).
   */
  headers: Record<string, string | string[] | undefined>;
  /**
   * Process environment subset. Pass `process.env` in production;
   * pass `{}` or a stub in tests.
   */
  env: Record<string, string | undefined>;
}

/**
 * Convert an incoming request's headers + env into a CallerIdentity.
 *
 * This is a PURE function — no I/O, no session lookups. Replace with a
 * JWT-verifying middleware when real auth lands.
 */
export function deriveCallerIdentity(input: DeriveCallerIdentityInput): CallerIdentity {
  const h = input.headers;
  const rawId = h['x-caller-id'];
  const rawTier = h['x-caller-tier'];
  const rawAdmin = h['x-caller-admin'];

  const caller_id =
    (typeof rawId === 'string' && rawId.trim()) ||
    (Array.isArray(rawId) && rawId[0]) ||
    'anonymous';

  const caller_tier = parseTier(Array.isArray(rawTier) ? rawTier[0] : rawTier);

  let caller_is_admin = parseBool(Array.isArray(rawAdmin) ? rawAdmin[0] : rawAdmin);

  // Dev escape hatch — see header comment block.
  if (parseBool(input.env.WITNESS_DEV_ADMIN)) {
    caller_is_admin = true;
  }

  return { caller_id, caller_tier, caller_is_admin };
}

// ────────────────────────────────────────────────────────────────────────
// gateConsciousnessLevelOverride
// ────────────────────────────────────────────────────────────────────────

export interface GateResult {
  status: 403;
  body: ReadingErrorResponse;
}

/**
 * Returns a 403 response object if the body contains `consciousness_level`
 * but the caller is not authorized to override. Returns `null` when the
 * gate passes (either the field is absent, or the caller is admin).
 *
 * Call BEFORE invoking the orchestrator. The level-resolver also enforces
 * this rule, but a clean 403 from the API layer beats a thrown error.
 */
export function gateConsciousnessLevelOverride(
  body: { consciousness_level?: unknown },
  caller: Pick<CallerIdentity, 'caller_id' | 'caller_tier' | 'caller_is_admin'>,
): GateResult | null {
  const override = body?.consciousness_level;
  if (override === undefined || override === null) return null;

  if (isCallerAdmin(caller)) return null;

  return {
    status: 403,
    body: {
      error:
        `consciousness_level override requires admin role or initiate tier. ` +
        `caller_id='${caller.caller_id}', caller_tier='${caller.caller_tier}', ` +
        `caller_is_admin=${caller.caller_is_admin}`,
      code: 'FORBIDDEN_LEVEL_OVERRIDE',
      details: {
        caller_tier: caller.caller_tier,
        attempted_override: override,
      },
    },
  };
}
