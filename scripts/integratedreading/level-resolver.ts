// ─── /integratedreading — Consciousness-Level Resolver ────────────────
// Single source of truth for resolving a request's effective
// consciousness_level (1-5).
//
// Resolution precedence:
//   1. admin_payload_override  — only honored when caller is admin/initiate
//   2. user_db_stored_level    — looked up via the caller-supplied lookup fn
//   3. default_level           — falls back to 1 (uninitiated)
//
// SECURITY BOUNDARY
// ─────────────────
// The admin_override path requires explicit authentication of the caller.
// A non-admin user passing `admin_override: 5` in their request MUST be
// rejected — otherwise any end-user could escalate to the framework-native
// reading register simply by editing their HTTP request body.
//
// Per design doc 2026-05-15-consciousness-level-register-design.md.
// Closes #70 (P1.1).

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type ConsciousnessLevel = 1 | 2 | 3 | 4 | 5;

export type RegisterBand = 'l1_l3' | 'l4_l5';

export type LevelSource = 'admin_override' | 'user_db' | 'default';

export type Tier = 'free' | 'subscriber' | 'enterprise' | 'initiate';

export interface ResolveLevelInput {
  /** The end-user this reading is for. Used to look up their stored level. */
  user_id: string;
  /**
   * Admin-supplied level override (1-5). Only honored when the caller
   * (NOT the user) is authenticated as admin or initiate tier.
   */
  admin_override?: number;
  /** The CALLER's tier (the entity making the API request, not necessarily the user). */
  caller_tier?: Tier;
  /** Explicit admin role flag — alternative to initiate tier. */
  caller_is_admin?: boolean;
  /** Default when user is not found / first-time. Conventionally 1. */
  default_level?: number;
  /**
   * Looks up the target user's stored consciousness_level from the DB.
   * Caller injects this so the resolver stays pure + testable.
   * Returns undefined when user not found.
   */
  user_db_lookup?: (user_id: string) => number | undefined;
}

export interface ResolveLevelResult {
  effective_level: ConsciousnessLevel;
  source: LevelSource;
  /** Derived from effective_level: 1-3 = l1_l3, 4-5 = l4_l5. */
  register_band: RegisterBand;
}

// ────────────────────────────────────────────────────────────────────────
// Error types
// ────────────────────────────────────────────────────────────────────────

export class ForbiddenLevelOverrideError extends Error {
  /** Maps to HTTP 403 in API layer. */
  public readonly status: number = 403;
  public readonly code: string = 'FORBIDDEN_LEVEL_OVERRIDE';
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenLevelOverrideError';
  }
}

export class InvalidConsciousnessLevelError extends Error {
  public readonly status: number = 400;
  public readonly code: string = 'INVALID_CONSCIOUSNESS_LEVEL';
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConsciousnessLevelError';
  }
}

// ────────────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────────────

function isValidLevel(n: unknown): n is ConsciousnessLevel {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
}

/**
 * Whether the caller is authorized to override the user's stored level
 * via the admin_override path. Either `initiate` tier OR explicit admin flag.
 */
export function isCallerAdmin(input: Pick<ResolveLevelInput, 'caller_tier' | 'caller_is_admin'>): boolean {
  if (input.caller_is_admin === true) return true;
  if (input.caller_tier === 'initiate') return true;
  return false;
}

/** Map a 1-5 level to its register band. */
export function levelToRegisterBand(level: ConsciousnessLevel): RegisterBand {
  return level >= 4 ? 'l4_l5' : 'l1_l3';
}

// ────────────────────────────────────────────────────────────────────────
// Resolver
// ────────────────────────────────────────────────────────────────────────

/**
 * Resolves the effective consciousness_level for a reading request.
 *
 * @throws {ForbiddenLevelOverrideError} when admin_override is set but
 *         caller is not admin/initiate
 * @throws {InvalidConsciousnessLevelError} when any level value is not
 *         an integer in [1, 5]
 */
export function resolveLevel(input: ResolveLevelInput): ResolveLevelResult {
  const defaultLevel = input.default_level ?? 1;
  if (!isValidLevel(defaultLevel)) {
    throw new InvalidConsciousnessLevelError(
      `default_level must be an integer 1-5, got ${defaultLevel}`,
    );
  }

  // 1. Admin override path
  if (input.admin_override !== undefined && input.admin_override !== null) {
    if (!isValidLevel(input.admin_override)) {
      throw new InvalidConsciousnessLevelError(
        `admin_override must be an integer 1-5, got ${input.admin_override}`,
      );
    }
    if (!isCallerAdmin(input)) {
      throw new ForbiddenLevelOverrideError(
        `consciousness_level override (${input.admin_override}) requires admin role or initiate tier; caller_tier='${input.caller_tier ?? 'unknown'}', caller_is_admin=${input.caller_is_admin ?? false}`,
      );
    }
    return {
      effective_level: input.admin_override,
      source: 'admin_override',
      register_band: levelToRegisterBand(input.admin_override),
    };
  }

  // 2. User DB lookup
  if (input.user_db_lookup) {
    const stored = input.user_db_lookup(input.user_id);
    if (stored !== undefined && stored !== null) {
      if (!isValidLevel(stored)) {
        throw new InvalidConsciousnessLevelError(
          `user_db_lookup returned invalid level ${stored} for user ${input.user_id}`,
        );
      }
      return {
        effective_level: stored,
        source: 'user_db',
        register_band: levelToRegisterBand(stored),
      };
    }
  }

  // 3. Default
  return {
    effective_level: defaultLevel as ConsciousnessLevel,
    source: 'default',
    register_band: levelToRegisterBand(defaultLevel as ConsciousnessLevel),
  };
}
