// ─── Internal Model Gateway — Host-Owned Atomic Model Call Boundary ───
//
// Wave B1 Task 9.
//
// This module is the ONLY place an internal caller (e.g. the AgentScope
// lab executor in services/agentscope-executor/) may reach the real LLM
// providers. It is intentionally narrow:
//
//   - authenticates a dedicated internal caller token (constant-time
//     comparison where practical)
//   - accepts a strict, bounded request shape (unknown fields rejected,
//     every size/count dimension capped)
//   - resolves role/tier/provider/model through the EXISTING Witness
//     provider selection/factory (`resolveProviderChoice`, provider
//     routing table) — no new provider-selection logic is invented here
//   - calls the EXISTING LLM adapter/factory path (`createLLMProvider` /
//     `LLMProvider.completeWithRetry`) — existing provider fallback
//     policy is reused as-is
//   - returns/streams a stable, redacted transport envelope: provider
//     request id + safe metadata + text deltas/final/terminal, never
//     raw provider bodies, headers, keys, or stack traces
//
// AgentScope (or any other internal caller) NEVER chooses provider/model/
// tier, NEVER receives provider credentials, and NEVER owns retry policy.
// Existing host provider fallback (see completeWithRetry in
// src/inference/*.ts) may run *inside* this gateway; the caller only sees
// one logical request in, one logical response/stream out.

import { randomUUID } from 'node:crypto';
import { timingSafeEqual } from 'node:crypto';

import { createLLMProvider, resolveProviderChoice } from '../inference/provider-factory.js';
import type { InferenceMessage, LLMProvider, ModelRole } from '../inference/types.js';
import { WITNESS_NVIDIA_ROUTING } from '../config/witness-capabilities.js';
import type { Tier } from '../types/interpretation.js';

// ════════════════════════════════════════════════════════════════════════
// BOUNDED REQUEST CONTRACT
// ════════════════════════════════════════════════════════════════════════

/** Roles an internal caller is allowed to name. Maps 1:1 onto ModelRole. */
export type InternalTaskClass = 'aletheios' | 'pichet' | 'synthesis' | 'fast' | 'deep';

const VALID_TASK_CLASSES: ReadonlySet<InternalTaskClass> = new Set([
  'aletheios',
  'pichet',
  'synthesis',
  'fast',
  'deep',
]);

const VALID_TIERS: ReadonlySet<Tier> = new Set(['free', 'subscriber', 'enterprise', 'initiate']);

/** Internal roles allowed to call this gateway at all (allowlist). */
export type InternalCallerRole = 'agentscope-executor';

const VALID_CALLER_ROLES: ReadonlySet<InternalCallerRole> = new Set(['agentscope-executor']);

export const GATEWAY_LIMITS = {
  MAX_MESSAGES: 50,
  MAX_MESSAGE_CHARS: 8_000,
  MAX_TOTAL_PROMPT_CHARS: 32_000,
  MAX_OUTPUT_TOKENS: 4_096,
  MIN_OUTPUT_TOKENS: 1,
  MAX_TIMEOUT_MS: 120_000,
  MIN_TIMEOUT_MS: 1_000,
  DEFAULT_TIMEOUT_MS: 30_000,
} as const;

export interface InternalGatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Strict, bounded internal request shape. This is intentionally NOT the
 * same shape as `InferenceRequest` — it is the narrow contract exposed to
 * internal callers (Python/AgentScope included), independent of internal
 * provider plumbing.
 */
export interface InternalGatewayRequest {
  internal_caller_role: InternalCallerRole;
  task_class: InternalTaskClass;
  tier: Tier;
  messages: InternalGatewayMessage[];
  max_output_tokens?: number;
  timeout_ms?: number;
}

const ALLOWED_REQUEST_KEYS = new Set<keyof InternalGatewayRequest>([
  'internal_caller_role',
  'task_class',
  'tier',
  'messages',
  'max_output_tokens',
  'timeout_ms',
]);

const ALLOWED_MESSAGE_KEYS = new Set(['role', 'content']);

// ════════════════════════════════════════════════════════════════════════
// SAFE ERROR CODES — no raw provider detail ever leaves this module
// ════════════════════════════════════════════════════════════════════════

export type GatewayErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN_ROLE'
  | 'FORBIDDEN_TASK_CLASS'
  | 'FORBIDDEN_TIER'
  | 'MALFORMED_REQUEST'
  | 'UNKNOWN_FIELD'
  | 'REQUEST_TOO_LARGE'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UPSTREAM_UNAVAILABLE';

export class GatewayError extends Error {
  readonly code: GatewayErrorCode;

  constructor(code: GatewayErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'GatewayError';
  }
}

// ════════════════════════════════════════════════════════════════════════
// TRANSPORT ENVELOPE — redacted, stable
// ════════════════════════════════════════════════════════════════════════

export interface GatewayStartEvent {
  type: 'start';
  provider_request_id: string;
}

export interface GatewayDeltaEvent {
  type: 'delta';
  provider_request_id: string;
  content: string;
  index: number;
}

export interface GatewayEndEvent {
  type: 'end';
  provider_request_id: string;
  full_content: string;
  /** Redacted metadata only: provider id + model id, never keys/headers. */
  provider: string;
  model: string;
  finish_reason: string;
}

export interface GatewayErrorEvent {
  type: 'error';
  provider_request_id: string;
  code: GatewayErrorCode;
  message: string;
}

export interface GatewayInterruptEvent {
  type: 'interrupt';
  provider_request_id: string;
  reason: string;
}

export type GatewayEvent =
  | GatewayStartEvent
  | GatewayDeltaEvent
  | GatewayEndEvent
  | GatewayErrorEvent
  | GatewayInterruptEvent;

// ════════════════════════════════════════════════════════════════════════
// AUTH — constant-time token comparison where practical
// ════════════════════════════════════════════════════════════════════════

/**
 * Constant-time-ish comparison of two secrets. Uses `crypto.timingSafeEqual`
 * when lengths match (its actual guarantee); falls back to a fixed-cost
 * failure path on length mismatch so early-return timing leaks are bounded
 * to "length differs", not "how many leading bytes matched".
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Still perform a same-size comparison to avoid a trivially fast
    // short-circuit; the result is discarded.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export interface InternalAuthConfig {
  /** Dedicated internal caller token. Absence means the gateway is unavailable. */
  token?: string;
}

/**
 * Validates the presented token against configured internal token.
 * Fail-closed: no configured token → always unauthorized, regardless of
 * what is presented (there is no way to "guess" your way into an
 * unconfigured gateway).
 */
export function authenticateInternalCaller(
  presentedToken: string | undefined,
  config: InternalAuthConfig,
): boolean {
  if (!config.token || config.token.length === 0) return false;
  if (!presentedToken) return false;
  return constantTimeEqual(presentedToken, config.token);
}

// ════════════════════════════════════════════════════════════════════════
// VALIDATION
// ════════════════════════════════════════════════════════════════════════

function assertNoUnknownKeys(obj: Record<string, unknown>, allowed: ReadonlySet<string>, what: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new GatewayError('UNKNOWN_FIELD', `${what} contains unknown field '${key}'`);
    }
  }
}

/**
 * Validates and narrows an arbitrary parsed-JSON body into a strict
 * `InternalGatewayRequest`. Throws `GatewayError` with a safe code/message
 * on any violation. Never echoes the malformed body back.
 */
export function validateGatewayRequest(body: unknown): InternalGatewayRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new GatewayError('MALFORMED_REQUEST', 'Request body must be a JSON object');
  }

  const obj = body as Record<string, unknown>;
  assertNoUnknownKeys(obj, ALLOWED_REQUEST_KEYS, 'request');

  const { internal_caller_role, task_class, tier, messages, max_output_tokens, timeout_ms } = obj;

  if (typeof internal_caller_role !== 'string' || !VALID_CALLER_ROLES.has(internal_caller_role as InternalCallerRole)) {
    throw new GatewayError('FORBIDDEN_ROLE', 'internal_caller_role missing or not allowlisted');
  }

  if (typeof task_class !== 'string' || !VALID_TASK_CLASSES.has(task_class as InternalTaskClass)) {
    throw new GatewayError('FORBIDDEN_TASK_CLASS', 'task_class missing or not allowlisted');
  }

  if (typeof tier !== 'string' || !VALID_TIERS.has(tier as Tier)) {
    throw new GatewayError('MALFORMED_REQUEST', 'tier missing or invalid');
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new GatewayError('MALFORMED_REQUEST', 'messages must be a non-empty array');
  }
  if (messages.length > GATEWAY_LIMITS.MAX_MESSAGES) {
    throw new GatewayError(
      'REQUEST_TOO_LARGE',
      `messages exceeds max count of ${GATEWAY_LIMITS.MAX_MESSAGES}`,
    );
  }

  let totalChars = 0;
  const parsedMessages: InternalGatewayMessage[] = [];
  for (const raw of messages) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new GatewayError('MALFORMED_REQUEST', 'each message must be an object');
    }
    const msgObj = raw as Record<string, unknown>;
    assertNoUnknownKeys(msgObj, ALLOWED_MESSAGE_KEYS, 'message');

    const { role, content } = msgObj;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') {
      throw new GatewayError('MALFORMED_REQUEST', 'message.role must be system|user|assistant');
    }
    if (typeof content !== 'string' || content.length === 0) {
      throw new GatewayError('MALFORMED_REQUEST', 'message.content must be a non-empty string');
    }
    if (content.length > GATEWAY_LIMITS.MAX_MESSAGE_CHARS) {
      throw new GatewayError(
        'REQUEST_TOO_LARGE',
        `message.content exceeds max length of ${GATEWAY_LIMITS.MAX_MESSAGE_CHARS}`,
      );
    }
    totalChars += content.length;
    parsedMessages.push({ role, content });
  }

  if (totalChars > GATEWAY_LIMITS.MAX_TOTAL_PROMPT_CHARS) {
    throw new GatewayError(
      'REQUEST_TOO_LARGE',
      `total prompt chars exceeds max of ${GATEWAY_LIMITS.MAX_TOTAL_PROMPT_CHARS}`,
    );
  }

  let maxOutputTokens: number = GATEWAY_LIMITS.MIN_OUTPUT_TOKENS;
  if (max_output_tokens !== undefined) {
    if (
      typeof max_output_tokens !== 'number' ||
      !Number.isFinite(max_output_tokens) ||
      max_output_tokens < GATEWAY_LIMITS.MIN_OUTPUT_TOKENS
    ) {
      throw new GatewayError('MALFORMED_REQUEST', 'max_output_tokens must be a positive number');
    }
    if (max_output_tokens > GATEWAY_LIMITS.MAX_OUTPUT_TOKENS) {
      throw new GatewayError(
        'REQUEST_TOO_LARGE',
        `max_output_tokens exceeds max of ${GATEWAY_LIMITS.MAX_OUTPUT_TOKENS}`,
      );
    }
    maxOutputTokens = max_output_tokens;
  } else {
    maxOutputTokens = 512;
  }

  let timeoutMs: number = GATEWAY_LIMITS.DEFAULT_TIMEOUT_MS;
  if (timeout_ms !== undefined) {
    if (typeof timeout_ms !== 'number' || !Number.isFinite(timeout_ms) || timeout_ms < GATEWAY_LIMITS.MIN_TIMEOUT_MS) {
      throw new GatewayError('MALFORMED_REQUEST', 'timeout_ms must be a positive number');
    }
    if (timeout_ms > GATEWAY_LIMITS.MAX_TIMEOUT_MS) {
      throw new GatewayError('REQUEST_TOO_LARGE', `timeout_ms exceeds max of ${GATEWAY_LIMITS.MAX_TIMEOUT_MS}`);
    }
    timeoutMs = timeout_ms;
  }

  return {
    internal_caller_role: internal_caller_role as InternalCallerRole,
    task_class: task_class as InternalTaskClass,
    tier: tier as Tier,
    messages: parsedMessages,
    max_output_tokens: maxOutputTokens,
    timeout_ms: timeoutMs,
  };
}

// ════════════════════════════════════════════════════════════════════════
// PROVIDER ENV — narrow surface handed to createLLMProvider/resolveProviderChoice
// ════════════════════════════════════════════════════════════════════════

export interface InternalGatewayProviderEnv {
  provider?: 'openrouter' | 'nvidia' | 'openai';
  openrouter_api_key?: string;
  nvidia_api_key?: string;
  openai_api_key?: string;
  timeout_ms?: number;
}

export interface InternalGatewayPolicy {
  /** Host-owned allowed tiers for this gateway instance. */
  allowed_tiers: ReadonlyArray<Tier>;
  /** Host-owned allowed task classes for this gateway instance. */
  allowed_task_classes: ReadonlyArray<InternalTaskClass>;
}

export const DEFAULT_INTERNAL_GATEWAY_POLICY: InternalGatewayPolicy = {
  allowed_tiers: ['free', 'subscriber', 'enterprise', 'initiate'],
  allowed_task_classes: ['aletheios', 'pichet', 'synthesis', 'fast', 'deep'],
};

export interface InternalModelGatewayDeps {
  auth: InternalAuthConfig;
  providerEnv: InternalGatewayProviderEnv;
  /** Injectable for tests; defaults to the real provider factory. */
  buildProvider?: (env: InternalGatewayProviderEnv) => LLMProvider;
  /** Host-owned allowlists. */
  policy?: InternalGatewayPolicy;
}

/**
 * The internal model gateway. Owns auth + validation + role/tier
 * resolution + the single call into the existing provider stack. Does
 * NOT own retry policy invention — `completeWithRetry` (existing host
 * fallback policy) is what actually runs.
 */
export class InternalModelGateway {
  private readonly deps: InternalModelGatewayDeps;
  private readonly allowedTiers: Set<Tier>;
  private readonly allowedTaskClasses: Set<InternalTaskClass>;

  constructor(deps: InternalModelGatewayDeps) {
    this.deps = deps;
    const policy = deps.policy ?? DEFAULT_INTERNAL_GATEWAY_POLICY;
    this.allowedTiers = new Set(policy.allowed_tiers);
    this.allowedTaskClasses = new Set(policy.allowed_task_classes);
  }

  /** True when the gateway has a configured token, i.e. is reachable at all. */
  isAvailable(): boolean {
    return Boolean(this.deps.auth.token && this.deps.auth.token.length > 0);
  }

  private resolveProvider(): LLMProvider {
    if (this.deps.buildProvider) return this.deps.buildProvider(this.deps.providerEnv);

    const choice = resolveProviderChoice(this.deps.providerEnv);
    if (!choice) {
      throw new GatewayError('UPSTREAM_UNAVAILABLE', 'no provider configured');
    }
    return createLLMProvider({
      provider: choice,
      openrouter_api_key: this.deps.providerEnv.openrouter_api_key,
      nvidia_api_key: this.deps.providerEnv.nvidia_api_key,
      openai_api_key: this.deps.providerEnv.openai_api_key,
      timeout_ms: this.deps.providerEnv.timeout_ms,
    });
  }

  /**
   * Runs a single logical internal call. `presentedToken` must have already
   * been checked by the caller via `authenticateInternalCaller` — this
   * method re-checks defensively (fail-closed) but does not re-derive it.
   *
   * Returns a bounded async iterable of transport events:
   * start -> delta* -> (end | interrupt | error).
   */
  async *execute(
    presentedToken: string | undefined,
    rawBody: unknown,
    opts: { abortSignal?: AbortSignal } = {},
  ): AsyncGenerator<GatewayEvent, void, void> {
    const providerRequestId = randomUUID();

    if (!authenticateInternalCaller(presentedToken, this.deps.auth)) {
      yield { type: 'error', provider_request_id: providerRequestId, code: 'UNAUTHORIZED', message: 'Unauthorized' };
      return;
    }

    let request: InternalGatewayRequest;
    try {
      request = validateGatewayRequest(rawBody);
    } catch (err) {
      const gErr = err instanceof GatewayError ? err : new GatewayError('MALFORMED_REQUEST', 'Malformed request');
      yield { type: 'error', provider_request_id: providerRequestId, code: gErr.code, message: gErr.message };
      return;
    }

    if (!this.allowedTiers.has(request.tier)) {
      yield {
        type: 'error',
        provider_request_id: providerRequestId,
        code: 'FORBIDDEN_TIER',
        message: 'tier not allowed for this gateway instance',
      };
      return;
    }

    if (!this.allowedTaskClasses.has(request.task_class)) {
      yield {
        type: 'error',
        provider_request_id: providerRequestId,
        code: 'FORBIDDEN_TASK_CLASS',
        message: 'task_class not allowed for this gateway instance',
      };
      return;
    }

    yield { type: 'start', provider_request_id: providerRequestId };

    const role: ModelRole = request.task_class;
    const routing = WITNESS_NVIDIA_ROUTING[request.tier];
    const pref = routing[role] ?? routing.synthesis;

    const messages: InferenceMessage[] = request.messages.map((m) => ({ role: m.role, content: m.content }));

    let provider: LLMProvider;
    try {
      provider = this.resolveProvider();
    } catch {
      yield {
        type: 'error',
        provider_request_id: providerRequestId,
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'No inference provider available',
      };
      return;
    }

    const timeoutMs = request.timeout_ms ?? GATEWAY_LIMITS.DEFAULT_TIMEOUT_MS;
    const maxTokens = Math.min(request.max_output_tokens ?? pref.max_tokens, pref.max_tokens, GATEWAY_LIMITS.MAX_OUTPUT_TOKENS);

    const controller = new AbortController();
    const callerSignal = opts.abortSignal;
    const onCallerAbort = () => {
      if (!controller.signal.aborted) {
        controller.abort(new GatewayError('CANCELLED', 'Execution cancelled by caller'));
      }
    };
    const timer = setTimeout(() => controller.abort(new GatewayError('TIMEOUT', `Execution timed out after ${timeoutMs}ms`)), timeoutMs);

    if (callerSignal) {
      if (callerSignal.aborted) {
        onCallerAbort();
      } else {
        callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }
    }

    try {
      // Existing host provider fallback policy (completeWithRetry) is
      // reused as-is; no provider-selection/retry logic is reimplemented
      // here or in any downstream Python caller.
      const responsePromise = provider.completeWithRetry({
        messages,
        model_role: role,
        tier: request.tier,
        model_override: pref.model_id,
        temperature_override: pref.temperature,
        max_tokens_override: maxTokens,
      });

      const response = await raceWithAbort(responsePromise, controller.signal);

      const fullContent = response.content ?? '';
      if (fullContent.length > 0) {
        yield {
          type: 'delta',
          provider_request_id: providerRequestId,
          content: fullContent,
          index: 0,
        };
      }

      yield {
        type: 'end',
        provider_request_id: providerRequestId,
        full_content: fullContent,
        provider: response.provider,
        model: response.model_used,
        finish_reason: response.finish_reason,
      };
    } catch (err) {
      if (err instanceof GatewayError && err.code === 'CANCELLED') {
        yield {
          type: 'interrupt',
          provider_request_id: providerRequestId,
          reason: 'caller cancelled',
        };
      } else if (controller.signal.aborted) {
        yield {
          type: 'error',
          provider_request_id: providerRequestId,
          code: 'TIMEOUT',
          message: `Execution timed out after ${timeoutMs}ms`,
        };
      } else {
        // Never surface err.message from the raw provider error — it may
        // contain response bodies/headers. Map to a safe, generic code.
        yield {
          type: 'error',
          provider_request_id: providerRequestId,
          code: 'UPSTREAM_UNAVAILABLE',
          message: 'Upstream inference call failed',
        };
      }
    } finally {
      clearTimeout(timer);
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    }
  }
}

function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  const rejected = (signal.reason instanceof Error ? signal.reason : null) as GatewayError | Error | null;
  if (signal.aborted) {
    return Promise.reject(
      rejected && rejected instanceof GatewayError
        ? rejected
        : new GatewayError('UPSTREAM_UNAVAILABLE', 'Execution was cancelled before start'),
    );
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(
        signal.reason instanceof GatewayError
          ? signal.reason
          : new GatewayError('UPSTREAM_UNAVAILABLE', 'Execution cancelled'),
      );
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise
      .then((v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      })
      .catch((e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      });
  });
}
