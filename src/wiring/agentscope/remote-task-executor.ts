// src/wiring/agentscope/remote-task-executor.ts
//
// Host-owned adapter over the pinned services/agentscope-executor contract.

import { createHash, randomUUID } from 'node:crypto';
import {
  hashString,
  validateExecutorResult,
  type NoesisAgentEventV1,
  type ProvenanceEnvelopeV1,
  type ValidationParams,
} from '@witness/orchestration';
import type { AtomicTask, TaskExecutor, TaskResult } from '@witness/orchestration';
import type { ExecutionEnvelopeV1 } from '@witness/orchestration';
import type { ExecutorV2 } from '@witness/orchestration';
import type { ExecutorCandidateV1 } from '@witness/orchestration';
import type { GroundedPassage } from '@witness/orchestration';
import {
  toNoesisAgentEvents,
  projectAgentscopeStream,
  type AgentscopeRemoteEvent,
} from './event-projector.js';
import {
  createCircuitBreaker,
  isShadowMode,
  shouldAttemptRemote,
  type AgentscopeMode,
  type CircuitBreaker,
} from './routing.js';
import { createBoundedShadowStore, type ShadowStore } from './shadow-executor.js';

export type { AgentscopeMode } from './routing.js';
export { createCircuitBreaker } from './routing.js';
export { createBoundedShadowStore, type ShadowStore, type ShadowRecord } from './shadow-executor.js';

export interface AgentscopeRemoteMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentscopePromptBinding {
  prompt?: string;
  messages?: AgentscopeRemoteMessage[];
  promptHash: string;
}

export type PromptBinder = (
  task: AtomicTask,
  envelope: ExecutionEnvelopeV1,
  context: { priorOutputs: Record<string, string>; grounding?: GroundedPassage[] },
) => Promise<AgentscopePromptBinding> | AgentscopePromptBinding;

interface RemoteTaskContext {
  priorOutputs: Record<string, string>;
  grounding?: GroundedPassage[];
}

export interface RemoteFetch {
  (
    url: string,
    init: { method: 'POST'; headers: Record<string, string>; body: string; signal: AbortSignal },
  ): Promise<{
    ok: boolean;
    status: number;
    body: AsyncIterable<Uint8Array> | null;
    text(): Promise<string>;
  }>;
}

export interface AgentscopeRemoteExecutorConfig {
  mode: AgentscopeMode;
  nativeExecutor: ExecutorV2;
  modelGatewayRef: string;
  baseUrl: string;
  fetchImpl?: RemoteFetch;
  timeoutMs?: number;
  circuit?: CircuitBreaker;
  shadowStore?: ShadowStore;
  now?: () => number;
  /** Host-owned binding seam for prompt material and promptHash. */
  promptBinder?: PromptBinder;
  /** Optional per-envelope cancellation seam. */
  abortSignalFor?: (envelope: ExecutionEnvelopeV1) => AbortSignal | undefined;
  /** Optional internal token sent as a header only. */
  internalToken?: string;
  /** Shared consumed attempt IDs (for canary duplicate/late protection). */
  consumedAttemptIds?: Set<string>;
}

class RemoteTimeoutError extends Error {
  constructor() {
    super('agentscope remote executor timed out');
    this.name = 'RemoteTimeoutError';
  }
}

class RemoteCancelledError extends Error {
  constructor() {
    super('agentscope remote executor call was cancelled');
    this.name = 'RemoteCancelledError';
  }
}

interface NormalizedRemoteRequest {
  envelope_id: string;
  model_gateway_ref: string;
  fact_lock_ref: string;
  context_hash: string;
  provenance_ref: string;
  max_tokens: number;
  timeout_seconds: number;
  prompt?: string;
  messages?: AgentscopeRemoteMessage[];
}

interface RemoteCallResult {
  events: AgentscopeRemoteEvent[];
}

function parsePositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function parseNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeTimeoutMs(timeoutMs: number | undefined): number {
  return timeoutMs === undefined ? 30_000 : parsePositiveInteger(timeoutMs, 'timeoutMs');
}

function parsePromptBindingPayload(payload: AgentscopePromptBinding): { prompt?: string; messages?: AgentscopeRemoteMessage[] } {
  if (payload.prompt === undefined && payload.messages === undefined) {
    throw new Error('promptBinder result must return prompt or messages');
  }

  if (payload.prompt !== undefined) {
    if (typeof payload.prompt !== 'string' || payload.prompt.length === 0) {
      throw new Error('promptBinder result.prompt must be a non-empty string');
    }
    return { prompt: payload.prompt };
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    throw new Error('promptBinder result.messages must be a non-empty array');
  }

  for (const message of payload.messages) {
    if (message === null || typeof message !== 'object') {
      throw new Error('promptBinder result.messages must contain objects');
    }
    if (message.role !== 'system' && message.role !== 'user' && message.role !== 'assistant') {
      throw new Error(`promptBinder message role invalid: ${String(message.role)}`);
    }
    if (typeof message.content !== 'string' || message.content.length === 0) {
      throw new Error('promptBinder result.messages.content must be a non-empty string');
    }
  }

  return { messages: payload.messages };
}

function buildProvenanceEnvelope(
  envelope: ExecutionEnvelopeV1,
  outputHash: string,
  events: NoesisAgentEventV1[],
  executor: 'native' | 'agentscope-2.0.5',
): ProvenanceEnvelopeV1 {
  return {
    schemaVersion: 'noesis.provenance.v1',
    runId: envelope.runId,
    attemptId: envelope.attemptId,
    executor,
    adapterVersion: '1.0.0',
    contextPacketHash: envelope.contextPacketHash,
    factLockHash: envelope.factLockHash,
    promptTemplateId: envelope.task.promptTemplateId,
    promptHash: envelope.task.promptHash,
    modelCalls: [],
    toolCalls: [],
    claimRefs: [],
    events,
    terminal: { reason: 'completed', outputHash },
  };
}

// Unknown fields that could be used to smuggle authority the host must never
// delegate to the remote executor (FactLock, context, auth, provenance
// overrides). Any such field on a remote event rejects the whole stream.
const SENSITIVE_UNKNOWN_FIELD_PATTERN = /fact.?lock|context.?hash|provenance|authorization|token|secret|credential|api.?key/i;

function extendWithUnknown(base: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    if (key in base) {
      continue;
    }
    if (SENSITIVE_UNKNOWN_FIELD_PATTERN.test(key)) {
      throw new Error(`remote event contains disallowed sensitive unknown field '${key}'`);
    }
    base[key] = value;
  }
  return base;
}

function parseRemoteStreamText(text: string, envelope: ExecutionEnvelopeV1): AgentscopeRemoteEvent[] {
  const lines = text.split('\n');
  const events: AgentscopeRemoteEvent[] = [];
  const deltas: string[] = [];

  let hasStart = false;
  let hasTerminal = false;
  let terminalType: AgentscopeRemoteEvent['type'] | null = null;
  let nextDeltaIndex = 0;
  const seenDeltaIndices = new Set<number>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(line);
    } catch {
      throw new Error(`invalid remote NDJSON line: ${line}`);
    }

    if (decoded === null || typeof decoded !== 'object' || Array.isArray(decoded)) {
      throw new Error(`remote event must be an object: ${line}`);
    }

    const candidate = decoded as Record<string, unknown>;
    const type = candidate.type;
    if (type !== 'start' && type !== 'delta' && type !== 'end' && type !== 'interrupt' && type !== 'error') {
      throw new Error(`invalid remote event type '${String(type)}'`);
    }

    const envelopeId = parseNonEmptyString(candidate.envelope_id, 'remote event envelope_id');
    if (envelopeId !== envelope.attemptId) {
      throw new Error(`remote envelope_id mismatch: got '${envelopeId}', expected '${envelope.attemptId}'`);
    }

    if (hasTerminal) {
      throw new Error(`remote event '${String(type)}' seen after terminal '${String(terminalType)}'`);
    }

    if (type === 'start') {
      if (hasStart) {
        throw new Error('remote stream has duplicate start event');
      }

      const factLockRef = parseNonEmptyString(candidate.fact_lock_ref, 'remote start fact_lock_ref');
      const contextHash = parseNonEmptyString(candidate.context_hash, 'remote start context_hash');
      const provenanceRef = parseNonEmptyString(candidate.provenance_ref, 'remote start provenance_ref');
      if (factLockRef !== envelope.factLockHash) {
        throw new Error('remote start fact_lock_ref mismatch');
      }
      if (contextHash !== envelope.contextPacketHash) {
        throw new Error('remote start context_hash mismatch');
      }
      if (provenanceRef !== envelope.runId) {
        throw new Error('remote start provenance_ref mismatch');
      }

      const payload: Record<string, unknown> = {
        type: 'start',
        envelope_id: envelopeId,
        fact_lock_ref: factLockRef,
        context_hash: contextHash,
        provenance_ref: provenanceRef,
      };
      const event = extendWithUnknown(payload, candidate) as AgentscopeRemoteEvent;
      hasStart = true;
      events.push(event);
      continue;
    }

    if (!hasStart) {
      throw new Error(`remote ${type} event seen before start`);
    }

    if (type === 'delta') {
      const content = parseNonEmptyString(candidate.content, 'remote delta content');
      const index = candidate.index;
      if (typeof index !== 'number' || !Number.isFinite(index) || !Number.isInteger(index) || index < 0) {
        throw new Error('remote delta index must be a non-negative integer');
      }
      if (index !== nextDeltaIndex) {
        throw new Error(`remote delta index ${index} is non-contiguous`);
      }
      if (seenDeltaIndices.has(index)) {
        throw new Error(`remote delta index ${index} is duplicated`);
      }
      seenDeltaIndices.add(index);
      nextDeltaIndex = index + 1;
      deltas.push(content);

      const payload: Record<string, unknown> = {
        type: 'delta',
        envelope_id: envelopeId,
        content,
        index,
      };
      const event = extendWithUnknown(payload, candidate) as AgentscopeRemoteEvent;
      events.push(event);
      continue;
    }

    if (type === 'end') {
      const fullContent = parseNonEmptyString(candidate.full_content, 'remote end full_content');
      const factLockRef = parseNonEmptyString(candidate.fact_lock_ref, 'remote end fact_lock_ref');
      const contextHash = parseNonEmptyString(candidate.context_hash, 'remote end context_hash');
      const provenanceRef = parseNonEmptyString(candidate.provenance_ref, 'remote end provenance_ref');
      if (factLockRef !== envelope.factLockHash) {
        throw new Error('remote end fact_lock_ref mismatch');
      }
      if (contextHash !== envelope.contextPacketHash) {
        throw new Error('remote end context_hash mismatch');
      }
      if (provenanceRef !== envelope.runId) {
        throw new Error('remote end provenance_ref mismatch');
      }

      const replay = deltas.join('');
      if (fullContent !== replay) {
        throw new Error('remote end full_content does not match joined delta stream');
      }

      const payload: Record<string, unknown> = {
        type: 'end',
        envelope_id: envelopeId,
        full_content: fullContent,
        fact_lock_ref: factLockRef,
        context_hash: contextHash,
        provenance_ref: provenanceRef,
      };
      const event = extendWithUnknown(payload, candidate) as AgentscopeRemoteEvent;
      hasTerminal = true;
      terminalType = 'end';
      events.push(event);
      continue;
    }

    if (type === 'interrupt') {
      const reason = parseNonEmptyString(candidate.reason, 'remote interrupt reason');
      const payload: Record<string, unknown> = {
        type: 'interrupt',
        envelope_id: envelopeId,
        reason,
      };
      const event = extendWithUnknown(payload, candidate) as AgentscopeRemoteEvent;
      hasTerminal = true;
      terminalType = 'interrupt';
      events.push(event);
      continue;
    }

    const message = parseNonEmptyString(candidate.message, 'remote error message');
    const payload: Record<string, unknown> = {
      type: 'error',
      envelope_id: envelopeId,
      message,
    };
    const event = extendWithUnknown(payload, candidate) as AgentscopeRemoteEvent;
    hasTerminal = true;
    terminalType = 'error';
    events.push(event);
  }

  if (!hasStart) {
    throw new Error('remote stream missing start event');
  }
  if (!hasTerminal) {
    throw new Error('remote stream missing terminal event');
  }
  if (terminalType === 'end') {
    const endEvent = events.find((event) => event.type === 'end');
    if (!endEvent || typeof endEvent.full_content !== 'string') {
      throw new Error('remote stream missing end full_content');
    }
  }

  return events;
}

async function readAllText(body: AsyncIterable<Uint8Array> | null): Promise<string> {
  if (body === null) {
    return '';
  }
  const decoder = new TextDecoder();
  let text = '';
  for await (const chunk of body) {
    text += decoder.decode(chunk, { stream: true });
  }
  text += decoder.decode();
  return text;
}

async function defaultFetchImpl(
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string; signal: AbortSignal },
): Promise<{ ok: boolean; status: number; body: AsyncIterable<Uint8Array> | null; text(): Promise<string> }> {
  const response = await fetch(url, init);
  return {
    ok: response.ok,
    status: response.status,
    body: response.body as AsyncIterable<Uint8Array> | null,
    text: () => response.text(),
  };
}

function createAbortComposite(
  external: AbortSignal | undefined,
): { signal: AbortSignal; abort: (reason: Error) => void; release: () => void } {
  const controller = new AbortController();
  const releases: Array<() => void> = [];

  if (external) {
    if (external.aborted) {
      controller.abort(external.reason instanceof Error ? external.reason : new RemoteCancelledError());
    } else {
      const abort = () => {
        if (!controller.signal.aborted) {
          controller.abort(external.reason instanceof Error ? external.reason : new RemoteCancelledError());
        }
      };
      external.addEventListener('abort', abort);
      releases.push(() => external.removeEventListener('abort', abort));
    }
  }

  return {
    signal: controller.signal,
    abort: (reason: Error) => {
      if (!controller.signal.aborted) {
        controller.abort(reason);
      }
    },
    release: () => {
      for (const release of releases) {
        release();
      }
    },
  };
}

function defaultPromptBinder(
  task: AtomicTask,
  envelope: ExecutionEnvelopeV1,
  context: { priorOutputs: Record<string, string>; grounding?: GroundedPassage[] },
): AgentscopePromptBinding {
  const prompts = task.buildPrompts(envelope.factLock, context.priorOutputs, context.grounding);
  const prompt = `${prompts.system}\n\n${prompts.user}`;
  const promptHash = createHash('sha256').update(prompt).digest('hex');
  return { prompt, promptHash };
}

function expectPromptHash(binding: AgentscopePromptBinding, envelope: ExecutionEnvelopeV1): void {
  const hash = parseNonEmptyString(binding.promptHash, 'promptBinder promptHash');
  if (hash !== envelope.task.promptHash) {
    throw new Error('prompt hash mismatch');
  }
}

async function callRemote(
  config: AgentscopeRemoteExecutorConfig,
  envelope: ExecutionEnvelopeV1,
  task: AtomicTask,
  context: RemoteTaskContext,
  timeoutMs: number,
): Promise<RemoteCallResult> {
  const fetchImpl = config.fetchImpl ?? defaultFetchImpl;
  const binder = config.promptBinder ?? defaultPromptBinder;
  const binding = await Promise.resolve(binder(task, envelope, context));
  expectPromptHash(binding, envelope);
  const promptPayload = parsePromptBindingPayload(binding);

  const request: NormalizedRemoteRequest = {
    envelope_id: envelope.attemptId,
    model_gateway_ref: config.modelGatewayRef,
    fact_lock_ref: envelope.factLockHash,
    context_hash: envelope.contextPacketHash,
    provenance_ref: envelope.runId,
    max_tokens: Math.min(parsePositiveInteger(envelope.task.targetTokens, 'task.targetTokens'), 8000),
    timeout_seconds: timeoutMs / 1000,
    ...promptPayload,
  };

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (typeof config.internalToken === 'string' && config.internalToken.length > 0) {
    headers.authorization = `Bearer ${config.internalToken}`;
  }

  const injectedSignal = config.abortSignalFor?.(envelope);
  const composite = createAbortComposite(injectedSignal);
  const timeoutHandle = setTimeout(() => {
    composite.abort(new RemoteTimeoutError());
  }, timeoutMs);

  try {
    if (composite.signal.aborted) {
      const reason = composite.signal.reason;
      if (reason instanceof Error) {
        throw reason;
      }
      throw new RemoteCancelledError();
    }

    const response = await fetchImpl(`${config.baseUrl}/v1/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: composite.signal,
    });

    if (!response.ok) {
      throw new Error(`agentscope remote executor returned HTTP ${response.status}`);
    }

    const text = response.body ? await readAllText(response.body) : await response.text();
    const events = parseRemoteStreamText(text, envelope);
    return { events };
  } catch (error) {
    if (composite.signal.aborted) {
      const reason = composite.signal.reason;
      if (reason instanceof RemoteTimeoutError) {
        throw reason;
      }
      if (reason instanceof RemoteCancelledError) {
        throw reason;
      }
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
    composite.release();
  }
}

function buildValidationParams(
  envelope: ExecutionEnvelopeV1,
  consumedAttemptIds: Set<string>,
): ValidationParams {
  const knownAttemptIds = new Set(consumedAttemptIds);
  knownAttemptIds.add(envelope.attemptId);

  return {
    expectedContextPacketHash: envelope.contextPacketHash,
    expectedFactLockHash: envelope.factLockHash,
    expectedTaskIds: new Set([envelope.task.taskId]),
    knownAttemptIds,
    consumedAttemptIds,
  };
}

async function buildRemoteCandidate(
  envelope: ExecutionEnvelopeV1,
  events: AgentscopeRemoteEvent[],
  consumedAttemptIds: Set<string>,
): Promise<ExecutorCandidateV1> {
  const projectionParams = {
    runId: envelope.runId,
    attemptId: envelope.attemptId,
    taskId: envelope.task.taskId,
    promptHash: envelope.task.promptHash,
  };

  const projection = await projectAgentscopeStream(events, projectionParams);
  if (projection.status !== 'complete') {
    throw new Error(`agentscope remote candidate was ${projection.status}`);
  }

  const endEvent = events.find((event) => event.type === 'end');
  if (!endEvent || typeof endEvent.full_content !== 'string') {
    throw new Error('remote end event missing full_content');
  }

  const output = endEvent.full_content;
  const outputHash = await hashString(output);
  const noesisEvents = await toNoesisAgentEvents(events, projectionParams);

  const candidate: ExecutorCandidateV1 = {
    runId: envelope.runId,
    attemptId: envelope.attemptId,
    contextPacketHash: envelope.contextPacketHash,
    factLockHash: envelope.factLockHash,
    task: { taskId: envelope.task.taskId, perspective: envelope.task.perspective },
    output,
    outputHash,
    provenance: buildProvenanceEnvelope(envelope, outputHash, noesisEvents, 'agentscope-2.0.5'),
  };

  const validation = validateExecutorResult(candidate, buildValidationParams(envelope, consumedAttemptIds));
  if (!validation.valid) {
    throw new Error(`remote candidate failed host validation: ${validation.reason}`);
  }

  return candidate;
}

async function buildNativeFallback(
  nativeExecutor: ExecutorV2,
  envelope: ExecutionEnvelopeV1,
  task: AtomicTask,
  context: { priorOutputs: Record<string, string>; grounding?: GroundedPassage[] },
): Promise<ExecutorCandidateV1> {
  return nativeExecutor(envelope, task, context);
}

// Bounded, sanitized error summary for shadow-mode storage. Never stores raw NDJSON,
// token values, authorization contents, credentials, remote response bodies, or
// unbounded messages. Falls back to a stable safe category when the message itself
// looks like it could carry sensitive or unbounded content.
const SHADOW_ERROR_MAX_LENGTH = 500;
const SHADOW_ERROR_SENSITIVE_PATTERN =
  /authorization|bearer|token|secret|credential|api.?key|password|passwd/i;

function safeShadowErrorMessage(error: unknown): string {
  let message: string;
  if (error instanceof RemoteTimeoutError) {
    return 'remote timeout';
  }
  if (error instanceof RemoteCancelledError) {
    return 'remote cancelled';
  }
  if (error instanceof Error) {
    message = error.message;
  } else {
    message = 'unknown remote error';
  }

  if (SHADOW_ERROR_SENSITIVE_PATTERN.test(message)) {
    return 'remote error (sanitized: sensitive content redacted)';
  }
  if (message.length > SHADOW_ERROR_MAX_LENGTH) {
    return `${message.slice(0, SHADOW_ERROR_MAX_LENGTH - 3)}...`;
  }
  return message;
}

/**
 * Creates an adapters that routes between native and AgentScope remote execution.
 */
export function createAgentscopeRemoteExecutor(config: AgentscopeRemoteExecutorConfig): ExecutorV2 {
  const timeoutMs = normalizeTimeoutMs(config.timeoutMs);
  const circuit = config.circuit ?? createCircuitBreaker({ failureThreshold: 3, cooldownMs: 30_000 });
  const shadowStore = config.shadowStore ?? createBoundedShadowStore({ maxRuns: 200, maxRecordsPerRun: 5 });
  const now = config.now ?? (() => Date.now());
  const consumedAttemptIds = config.consumedAttemptIds ?? new Set<string>();
  // Shadow validation must never mutate the canary/served consumedAttemptIds set:
  // it uses its own independent tracking set for non-authoritative comparisons.
  const shadowConsumedAttemptIds = new Set<string>();

  return async (envelope, task, context) => {
    const requestContext: RemoteTaskContext = {
      priorOutputs: context?.priorOutputs ?? {},
      grounding: context?.grounding,
    };

    if (config.mode === 'native') {
      return buildNativeFallback(config.nativeExecutor, envelope, task, requestContext);
    }

    const shouldAttempt = shouldAttemptRemote(config.mode, circuit, now());
    if (!shouldAttempt) {
      const nativeCandidate = await buildNativeFallback(config.nativeExecutor, envelope, task, requestContext);
      if (isShadowMode(config.mode)) {
        shadowStore.record(envelope.runId, {
          attemptId: envelope.attemptId,
          native: nativeCandidate,
          agentscope: null,
          agentscopeError: 'circuit open',
        });
      }
      return nativeCandidate;
    }

    const attemptRemote = async (attemptConsumedAttemptIds: Set<string>): Promise<ExecutorCandidateV1> => {
      const { events } = await callRemote(config, envelope, task, requestContext, timeoutMs);
      return buildRemoteCandidate(envelope, events, attemptConsumedAttemptIds);
    };

    if (isShadowMode(config.mode)) {
      const nativeCandidate = await buildNativeFallback(config.nativeExecutor, envelope, task, requestContext);
      try {
        const remoteCandidate = await attemptRemote(shadowConsumedAttemptIds);
        circuit.recordSuccess();
        shadowStore.record(envelope.runId, {
          attemptId: envelope.attemptId,
          native: nativeCandidate,
          agentscope: remoteCandidate,
        });
      } catch (error) {
        circuit.recordFailure(now());
        shadowStore.record(envelope.runId, {
          attemptId: envelope.attemptId,
          native: nativeCandidate,
          agentscope: null,
          agentscopeError: safeShadowErrorMessage(error),
        });
      }
      return nativeCandidate;
    }

    try {
      const remoteCandidate = await attemptRemote(consumedAttemptIds);
      circuit.recordSuccess();
      return remoteCandidate;
    } catch (error) {
      circuit.recordFailure(now());
      if (error instanceof RemoteTimeoutError || error instanceof RemoteCancelledError) {
        return buildNativeFallback(config.nativeExecutor, envelope, task, requestContext);
      }
      return buildNativeFallback(config.nativeExecutor, envelope, task, requestContext);
    }
  };
}

export function createAgentscopeRemoteTaskExecutor(
  legacyNativeExecutor: TaskExecutor,
  config: Omit<AgentscopeRemoteExecutorConfig, 'nativeExecutor'>,
): ExecutorV2 {
  return createAgentscopeRemoteExecutor({
    ...config,
    nativeExecutor: legacyExecutorToV2(legacyNativeExecutor),
  });
}

function legacyExecutorToV2(legacy: TaskExecutor): ExecutorV2 {
  return async (envelope, task, context) => {
    const priorOutputs = context?.priorOutputs ?? {};
    const grounding = context?.grounding;
    const result: TaskResult = await legacy(task, envelope.factLock, priorOutputs, grounding);
    const outputHash = await hashString(result.content);
    return {
      runId: envelope.runId,
      attemptId: envelope.attemptId,
      contextPacketHash: envelope.contextPacketHash,
      factLockHash: envelope.factLockHash,
      task: { taskId: envelope.task.taskId, perspective: envelope.task.perspective },
      output: result.content,
      outputHash,
      provenance: buildProvenanceEnvelope(
        envelope,
        outputHash,
        [
          {
            schemaVersion: 'noesis.event.v1',
            eventId: `${envelope.attemptId}-start`,
            runId: envelope.runId,
            attemptId: envelope.attemptId,
            taskId: envelope.task.taskId,
            type: 'start',
            timestamp: envelope.deadlineAt,
            payload: { promptHash: envelope.task.promptHash },
          },
          {
            schemaVersion: 'noesis.event.v1',
            eventId: `${envelope.attemptId}-end`,
            runId: envelope.runId,
            attemptId: envelope.attemptId,
            taskId: envelope.task.taskId,
            type: 'end',
            timestamp: envelope.deadlineAt,
            payload: { outputHash },
          },
        ],
        'native',
      ),
    };
  };
}

export function generateAttemptId(): string {
  return randomUUID();
}
