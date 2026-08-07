// packages/orchestration/src/events.ts
// Replayable Noesis agent lifecycle events (Task 3, type foundation for Task 1 provenance).

export type NoesisAgentEventType = 'start' | 'delta' | 'end' | 'interrupt' | 'error';

export interface NoesisAgentEventV1 {
  schemaVersion: 'noesis.event.v1';
  eventId: string;
  runId: string;
  attemptId: string;
  taskId: string;
  parentId?: string;
  type: NoesisAgentEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface NoesisAgentEventV1StartPayload {
  promptHash: string;
  model?: string;
  provider?: string;
}

export interface NoesisAgentEventV1DeltaPayload {
  content: string;
}

export interface NoesisAgentEventV1EndPayload {
  outputHash: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export interface NoesisAgentEventV1InterruptPayload {
  reason: string;
}

export interface NoesisAgentEventV1ErrorPayload {
  error: string;
  code?: string;
}

const EVENT_TYPES: NoesisAgentEventType[] = ['start', 'delta', 'end', 'interrupt', 'error'];

// Sensitive-field policy: reject (fail closed) rather than silently redact, so producers
// are forced to fix the leak at the source instead of relying on downstream scrubbing.
// Matches key names case-insensitively anywhere in the payload, including inside
// namespaced `extensions` — the check is recursive so hiding a key under an extension
// namespace does not bypass it.
const SENSITIVE_KEY_PATTERN =
  /(api[-_]?key|secret|password|passwd|credential|thinking|reasoning|chain[-_]?of[-_]?thought|\bcot\b|private[-_]?key|access[-_]?key|auth[-_]?token|bearer[-_]?token|session[-_]?token|refresh[-_]?token|secret[-_]?token)/i;

function assertNoSensitiveKeys(value: unknown, path: string): void {
  if (value === null || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoSensitiveKeys(item, `${path}[${i}]`));
    return;
  }
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      throw new Error(`sensitive field detected at '${path}.${key}' — remove or rename before sending`);
    }
    assertNoSensitiveKeys(val, `${path}.${key}`);
  }
}

/**
 * Validates an event payload against the sensitive-field denylist policy and returns it
 * unchanged when safe. Namespaced extension fields (e.g. payload.extensions.<ns>.<key>)
 * pass through untouched as long as they don't contain sensitive key names themselves —
 * the recursive check still inspects inside extensions.
 */
export function sanitizeEventPayload<T extends Record<string, unknown>>(payload: T): T {
  assertNoSensitiveKeys(payload, 'payload');
  return payload;
}

export function validateNoesisAgentEvent(event: unknown): NoesisAgentEventV1 {
  if (event === null || typeof event !== 'object') {
    throw new Error('NoesisAgentEventV1 must be an object');
  }
  const e = event as Record<string, unknown>;
  if (e.schemaVersion !== 'noesis.event.v1') {
    throw new Error(`NoesisAgentEventV1.schemaVersion must be 'noesis.event.v1'`);
  }
  requireString(e, 'eventId');
  requireString(e, 'runId');
  requireString(e, 'attemptId');
  requireString(e, 'taskId');
  requireString(e, 'timestamp');
  if (e.parentId !== undefined && typeof e.parentId !== 'string') {
    throw new Error('NoesisAgentEventV1.parentId must be a string when present');
  }
  if (!EVENT_TYPES.includes(e.type as NoesisAgentEventType)) {
    throw new Error(`NoesisAgentEventV1.type must be one of ${EVENT_TYPES.join(', ')}`);
  }
  if (e.payload === null || typeof e.payload !== 'object' || Array.isArray(e.payload)) {
    throw new Error('NoesisAgentEventV1.payload must be an object');
  }
  sanitizeEventPayload(e.payload as Record<string, unknown>);
  const validated: NoesisAgentEventV1 = {
    schemaVersion: 'noesis.event.v1',
    eventId: e.eventId as string,
    runId: e.runId as string,
    attemptId: e.attemptId as string,
    taskId: e.taskId as string,
    type: e.type as NoesisAgentEventType,
    timestamp: e.timestamp as string,
    payload: e.payload as Record<string, unknown>,
  };
  if (e.parentId !== undefined) {
    validated.parentId = e.parentId as string;
  }
  return validated;
}

function requireString(obj: Record<string, unknown>, key: string): void {
  if (typeof obj[key] !== 'string' || (obj[key] as string).length === 0) {
    throw new Error(`NoesisAgentEventV1.${key} must be a non-empty string`);
  }
}

export function isTerminalEventType(type: NoesisAgentEventType): boolean {
  return type === 'end' || type === 'interrupt' || type === 'error';
}
