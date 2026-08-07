// src/wiring/agentscope/routing.ts
//
// Task 10: mode selection and circuit-breaker primitives for the AgentScope
// remote-executor adapter. Pure decision logic only — no HTTP, no provider
// choice, no persistence.

import { createHash } from 'node:crypto';

export type AgentscopeMode = 'native' | 'agentscope-shadow' | 'agentscope-canary';

export interface CircuitBreakerOptions {
  /** Consecutive remote failures before the circuit opens. */
  failureThreshold: number;
  /** Cooldown window (ms) before a single half-open probe is allowed. */
  cooldownMs: number;
}

export interface CircuitBreaker {
  isOpen(now: number): boolean;
  recordSuccess(): void;
  recordFailure(now: number): void;
  readonly state: {
    consecutiveFailures: number;
    openUntil: number | null;
  };
}

function parsePositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

/**
 * Circuit-breaker with a bounded half-open state: while cooling down, all calls are
 * rejected. Once cooldown expires, exactly one half-open probe is allowed.
 */
export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const failureThreshold = parsePositiveInteger(options.failureThreshold, 'failureThreshold');
  const cooldownMs = parsePositiveInteger(options.cooldownMs, 'cooldownMs');

  let consecutiveFailures = 0;
  let openUntil: number | null = null;
  let halfOpenInFlight = false;

  return {
    isOpen(now: number): boolean {
      if (openUntil === null) {
        return false;
      }
      if (now < openUntil) {
        return true;
      }

      if (!halfOpenInFlight) {
        halfOpenInFlight = true;
        return false;
      }

      return true;
    },
    recordSuccess(): void {
      consecutiveFailures = 0;
      openUntil = null;
      halfOpenInFlight = false;
    },
    recordFailure(now: number): void {
      consecutiveFailures += 1;
      if (consecutiveFailures >= failureThreshold) {
        openUntil = now + cooldownMs;
        halfOpenInFlight = false;
      }
    },
    get state() {
      return { consecutiveFailures, openUntil };
    },
  };
}

export class CircuitOpenError extends Error {
  constructor(message = 'agentscope circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export function shouldAttemptRemote(mode: AgentscopeMode, circuit: CircuitBreaker, now: number): boolean {
  if (mode === 'native') {
    return false;
  }
  return !circuit.isOpen(now);
}

export function isShadowMode(mode: AgentscopeMode): boolean {
  return mode === 'agentscope-shadow';
}

export function isCanaryMode(mode: AgentscopeMode): boolean {
  return mode === 'agentscope-canary';
}

export type AgentscopeConfiguredMode = AgentscopeMode | 'invalid';

export type AgentscopeConfigError =
  | 'invalid-mode'
  | 'invalid-url'
  | 'missing-token'
  | 'invalid-timeout'
  | 'invalid-canary-percent';

export type AgentscopeRoutingReason =
  | 'native-default'
  | 'configuration-invalid'
  | 'stable-key-missing'
  | 'tenant-not-allowed'
  | 'task-class-not-allowed'
  | 'shadow-eligible'
  | 'canary-selected'
  | 'canary-percentage-excluded';

export interface AgentscopeRuntimeConfig {
  /** Effective mode. Invalid explicit configuration always resolves to native. */
  mode: AgentscopeMode;
  /** Safe representation of the requested mode; never contains raw environment input. */
  configuredMode: AgentscopeConfiguredMode;
  valid: boolean;
  errorCategory?: AgentscopeConfigError;
  executorUrl?: string;
  internalToken?: string;
  timeoutMs?: number;
  canaryPercent: number;
  tenantAllowlist: readonly string[];
  taskClassAllowlist: readonly string[];
}

export interface AgentscopeRoutingInput {
  /** Stable, host-owned assignment key. It is hashed and never copied into the decision. */
  stableKey: string;
  tenant?: string;
  taskClass?: string;
}

/** Safe to serialize, log, and attach to internal provenance. */
export interface AgentscopeRoutingDecision {
  selectedMode: AgentscopeMode;
  configuredMode: AgentscopeConfiguredMode;
  reason: AgentscopeRoutingReason;
  eligible: boolean;
  canaryPercent: number;
  bucket: number | null;
}

export interface AgentscopeEnvironment {
  WITNESS_EXECUTOR_MODE?: string;
  AGENTSCOPE_EXECUTOR_URL?: string;
  AGENTSCOPE_INTERNAL_TOKEN?: string;
  AGENTSCOPE_CANARY_PERCENT?: string;
  AGENTSCOPE_TIMEOUT_MS?: string;
  AGENTSCOPE_ALLOWED_TENANTS?: string;
  AGENTSCOPE_ALLOWED_TASK_CLASSES?: string;
}

function parseCsvAllowlist(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))].sort();
}

function parseIntegerString(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isSafeExecutorUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && parsed.username === ''
      && parsed.password === ''
      && parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function invalidRuntimeConfig(
  configuredMode: AgentscopeConfiguredMode,
  errorCategory: AgentscopeConfigError,
  env: AgentscopeEnvironment,
): AgentscopeRuntimeConfig {
  return {
    mode: 'native',
    configuredMode,
    valid: false,
    errorCategory,
    canaryPercent: 0,
    tenantAllowlist: parseCsvAllowlist(env.AGENTSCOPE_ALLOWED_TENANTS),
    taskClassAllowlist: parseCsvAllowlist(env.AGENTSCOPE_ALLOWED_TASK_CLASSES),
  };
}

/**
 * Parse the executor environment without throwing or reflecting raw values.
 * Nonnative execution is available only when every required field validates.
 */
export function parseAgentscopeRuntimeConfig(
  env: AgentscopeEnvironment,
): AgentscopeRuntimeConfig {
  const rawMode = env.WITNESS_EXECUTOR_MODE?.trim();
  if (!rawMode || rawMode === 'native') {
    return {
      mode: 'native',
      configuredMode: 'native',
      valid: true,
      canaryPercent: 0,
      tenantAllowlist: parseCsvAllowlist(env.AGENTSCOPE_ALLOWED_TENANTS),
      taskClassAllowlist: parseCsvAllowlist(env.AGENTSCOPE_ALLOWED_TASK_CLASSES),
    };
  }

  if (rawMode !== 'agentscope-shadow' && rawMode !== 'agentscope-canary') {
    return invalidRuntimeConfig('invalid', 'invalid-mode', env);
  }

  if (!isSafeExecutorUrl(env.AGENTSCOPE_EXECUTOR_URL?.trim())) {
    return invalidRuntimeConfig(rawMode, 'invalid-url', env);
  }

  const internalToken = env.AGENTSCOPE_INTERNAL_TOKEN?.trim();
  if (!internalToken) {
    return invalidRuntimeConfig(rawMode, 'missing-token', env);
  }

  const timeoutMs = parseIntegerString(env.AGENTSCOPE_TIMEOUT_MS);
  if (timeoutMs === null || timeoutMs <= 0) {
    return invalidRuntimeConfig(rawMode, 'invalid-timeout', env);
  }

  const rawCanaryPercent = env.AGENTSCOPE_CANARY_PERCENT?.trim();
  const canaryPercent = rawCanaryPercent ? parseIntegerString(rawCanaryPercent) : 0;
  if (canaryPercent === null || canaryPercent < 0 || canaryPercent > 100) {
    return invalidRuntimeConfig(rawMode, 'invalid-canary-percent', env);
  }

  return {
    mode: rawMode,
    configuredMode: rawMode,
    valid: true,
    executorUrl: env.AGENTSCOPE_EXECUTOR_URL!.trim(),
    internalToken,
    timeoutMs,
    canaryPercent,
    tenantAllowlist: parseCsvAllowlist(env.AGENTSCOPE_ALLOWED_TENANTS),
    taskClassAllowlist: parseCsvAllowlist(env.AGENTSCOPE_ALLOWED_TASK_CLASSES),
  };
}

export function deterministicCanaryBucket(stableKey: string): number {
  const prefix = createHash('sha256').update(stableKey).digest('hex').slice(0, 8);
  return Number.parseInt(prefix, 16) % 100;
}

function nativeDecision(
  config: AgentscopeRuntimeConfig,
  reason: AgentscopeRoutingReason,
  eligible: boolean,
  bucket: number | null,
): AgentscopeRoutingDecision {
  return {
    selectedMode: 'native',
    configuredMode: config.configuredMode,
    reason,
    eligible,
    canaryPercent: config.canaryPercent,
    bucket,
  };
}

/**
 * Select an executor without copying stable keys, tenant ids, task classes, or
 * runtime secrets into the routing provenance.
 */
export function selectAgentscopeRoute(
  config: AgentscopeRuntimeConfig,
  input: AgentscopeRoutingInput,
): AgentscopeRoutingDecision {
  if (!config.valid) {
    return nativeDecision(config, 'configuration-invalid', false, null);
  }
  if (config.mode === 'native') {
    return nativeDecision(config, 'native-default', false, null);
  }
  if (!input.stableKey) {
    return nativeDecision(config, 'stable-key-missing', false, null);
  }
  if (
    config.tenantAllowlist.length > 0
    && (!input.tenant || !config.tenantAllowlist.includes(input.tenant))
  ) {
    return nativeDecision(config, 'tenant-not-allowed', false, null);
  }
  if (
    config.taskClassAllowlist.length > 0
    && (!input.taskClass || !config.taskClassAllowlist.includes(input.taskClass))
  ) {
    return nativeDecision(config, 'task-class-not-allowed', false, null);
  }

  if (config.mode === 'agentscope-shadow') {
    return {
      selectedMode: 'agentscope-shadow',
      configuredMode: config.configuredMode,
      reason: 'shadow-eligible',
      eligible: true,
      canaryPercent: config.canaryPercent,
      bucket: null,
    };
  }

  const bucket = deterministicCanaryBucket(input.stableKey);
  if (bucket >= config.canaryPercent) {
    return nativeDecision(config, 'canary-percentage-excluded', true, bucket);
  }
  return {
    selectedMode: 'agentscope-canary',
    configuredMode: config.configuredMode,
    reason: 'canary-selected',
    eligible: true,
    canaryPercent: config.canaryPercent,
    bucket,
  };
}
