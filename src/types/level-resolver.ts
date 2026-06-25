// Source-local consciousness-level resolver used by API/runtime code.
// Keep scripts/integratedreading/level-resolver.ts behavior mirrored here so
// src builds do not import files outside tsconfig rootDir.

import type { Tier } from './interpretation.js';

export type ConsciousnessLevel = 1 | 2 | 3 | 4 | 5;

export type RegisterBand = 'l1_l3' | 'l4_l5';

export type LevelSource = 'admin_override' | 'user_db' | 'default';

export interface ResolveLevelInput {
  user_id: string;
  admin_override?: number;
  caller_tier?: Tier;
  caller_is_admin?: boolean;
  default_level?: number;
  user_db_lookup?: (user_id: string) => number | undefined;
}

export interface ResolveLevelResult {
  effective_level: ConsciousnessLevel;
  source: LevelSource;
  register_band: RegisterBand;
}

export class ForbiddenLevelOverrideError extends Error {
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

function isValidLevel(n: unknown): n is ConsciousnessLevel {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
}

export function isCallerAdmin(input: Pick<ResolveLevelInput, 'caller_tier' | 'caller_is_admin'>): boolean {
  return input.caller_is_admin === true || input.caller_tier === 'initiate';
}

export function levelToRegisterBand(level: ConsciousnessLevel): RegisterBand {
  return level >= 4 ? 'l4_l5' : 'l1_l3';
}

export function resolveLevel(input: ResolveLevelInput): ResolveLevelResult {
  const defaultLevel = input.default_level ?? 1;
  if (!isValidLevel(defaultLevel)) {
    throw new InvalidConsciousnessLevelError(
      `default_level must be an integer 1-5, got ${defaultLevel}`,
    );
  }

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

  return {
    effective_level: defaultLevel,
    source: 'default',
    register_band: levelToRegisterBand(defaultLevel),
  };
}
