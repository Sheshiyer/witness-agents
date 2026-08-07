// packages/orchestration/tests/event-replay.test.ts
// Task 3 contract tests: event replay lifecycle (strict TDD).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNoesisAgentEvent,
  sanitizeEventPayload,
  projectEventStream,
  type NoesisAgentEventV1,
} from '../src/index.js';

function makeEvent(overrides: Partial<NoesisAgentEventV1> = {}): NoesisAgentEventV1 {
  return {
    schemaVersion: 'noesis.event.v1',
    eventId: overrides.eventId ?? 'evt-1',
    runId: overrides.runId ?? 'run-1',
    attemptId: overrides.attemptId ?? 'attempt-1',
    taskId: overrides.taskId ?? 'task-1',
    type: overrides.type ?? 'start',
    timestamp: overrides.timestamp ?? '2026-07-28T00:00:00Z',
    payload: overrides.payload ?? { promptHash: 'ph-1' },
  };
}

function stream(events: Array<Partial<NoesisAgentEventV1>>): NoesisAgentEventV1[] {
  return events.map((e) => makeEvent(e));
}

// --- Deterministic projection ---

test('projectEventStream projects a valid ordered stream to a complete TaskResult', () => {
  const events = stream([
    { eventId: 'e1', type: 'start', payload: { promptHash: 'ph' } },
    { eventId: 'e2', type: 'delta', payload: { content: 'Hello ' } },
    { eventId: 'e3', type: 'delta', payload: { content: 'World' } },
    { eventId: 'e4', type: 'end', payload: { outputHash: 'oh', tokensUsed: 5, latencyMs: 10 } },
  ]);
  const projection = projectEventStream(events);
  assert.equal(projection.status, 'complete');
  assert.equal(projection.taskId, 'task-1');
  assert.equal(projection.runId, 'run-1');
  assert.equal(projection.attemptId, 'attempt-1');
  assert.equal(projection.result?.content, 'Hello World');
  assert.equal(projection.result?.tokensUsed, 5);
  assert.equal(projection.result?.latencyMs, 10);
});

test('projectEventStream is deterministic for the same input', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    { eventId: 'e2', type: 'delta', payload: { content: 'abc' } },
    { eventId: 'e3', type: 'end', payload: { outputHash: 'oh' } },
  ]);
  const p1 = projectEventStream(events);
  const p2 = projectEventStream([...events]);
  assert.deepEqual(p1, p2);
});

// --- Distinct attempt identities ---

test('distinct attempts of the same task project independently and do not collide', () => {
  const attempt1 = stream([
    { eventId: 'a1-1', attemptId: 'attempt-1', type: 'start' },
    { eventId: 'a1-2', attemptId: 'attempt-1', type: 'end', payload: { outputHash: 'oh1' } },
  ]);
  const attempt2 = stream([
    { eventId: 'a2-1', attemptId: 'attempt-2', type: 'start' },
    { eventId: 'a2-2', attemptId: 'attempt-2', type: 'end', payload: { outputHash: 'oh2' } },
  ]);
  const p1 = projectEventStream(attempt1);
  const p2 = projectEventStream(attempt2);
  assert.equal(p1.attemptId, 'attempt-1');
  assert.equal(p2.attemptId, 'attempt-2');
  assert.notEqual(p1.result?.tokensUsed, p2.result?.tokensUsed === undefined ? -1 : p2.result?.tokensUsed);
  assert.notEqual(p1.attemptId, p2.attemptId);
});

// --- Fail closed cases ---

test('projectEventStream throws on duplicate event IDs within a stream', () => {
  const events = stream([
    { eventId: 'dup', type: 'start' },
    { eventId: 'dup', type: 'end', payload: { outputHash: 'oh' } },
  ]);
  assert.throws(() => projectEventStream(events), /duplicate/i);
});

test('projectEventStream throws on mismatched run/task/attempt identity across events', () => {
  const events = stream([
    { eventId: 'e1', type: 'start', runId: 'run-1' },
    { eventId: 'e2', type: 'end', runId: 'run-2', payload: { outputHash: 'oh' } },
  ]);
  assert.throws(() => projectEventStream(events), /identity|mismatch/i);
});

test('projectEventStream throws on mismatched attemptId across events', () => {
  const events = stream([
    { eventId: 'e1', type: 'start', attemptId: 'attempt-1' },
    { eventId: 'e2', type: 'end', attemptId: 'attempt-2', payload: { outputHash: 'oh' } },
  ]);
  assert.throws(() => projectEventStream(events), /identity|mismatch/i);
});

test('projectEventStream throws on mismatched taskId across events', () => {
  const events = stream([
    { eventId: 'e1', type: 'start', taskId: 'task-1' },
    { eventId: 'e2', type: 'end', taskId: 'task-2', payload: { outputHash: 'oh' } },
  ]);
  assert.throws(() => projectEventStream(events), /identity|mismatch/i);
});

test('projectEventStream throws on orphan delta event with no matching start', () => {
  const events = stream([
    { eventId: 'e1', type: 'delta', payload: { content: 'x' } },
  ]);
  assert.throws(() => projectEventStream(events), /orphan|start/i);
});

test('projectEventStream throws on orphan end event with no matching start', () => {
  const events = stream([
    { eventId: 'e1', type: 'end', payload: { outputHash: 'oh' } },
  ]);
  assert.throws(() => projectEventStream(events), /orphan|start/i);
});

test('projectEventStream throws on orphan interrupt event with no matching start', () => {
  const events = stream([
    { eventId: 'e1', type: 'interrupt', payload: { reason: 'stopped' } },
  ]);
  assert.throws(() => projectEventStream(events), /orphan|start/i);
});

test('projectEventStream throws on orphan error event with no matching start', () => {
  const events = stream([
    { eventId: 'e1', type: 'error', payload: { error: 'boom' } },
  ]);
  assert.throws(() => projectEventStream(events), /orphan|start/i);
});

test('projectEventStream throws when a delta arrives after a terminal end event', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    { eventId: 'e2', type: 'end', payload: { outputHash: 'oh' } },
    { eventId: 'e3', type: 'delta', payload: { content: 'late' } },
  ]);
  assert.throws(() => projectEventStream(events), /terminal|after/i);
});

test('projectEventStream throws when a delta arrives after a terminal interrupt event', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    { eventId: 'e2', type: 'interrupt', payload: { reason: 'stop' } },
    { eventId: 'e3', type: 'delta', payload: { content: 'late' } },
  ]);
  assert.throws(() => projectEventStream(events), /terminal|after/i);
});

test('projectEventStream throws when a delta arrives after a terminal error event', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    { eventId: 'e2', type: 'error', payload: { error: 'boom' } },
    { eventId: 'e3', type: 'delta', payload: { content: 'late' } },
  ]);
  assert.throws(() => projectEventStream(events), /terminal|after/i);
});

test('projectEventStream throws on a second start event for the same stream', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    { eventId: 'e2', type: 'start' },
  ]);
  assert.throws(() => projectEventStream(events), /duplicate start|already started/i);
});

test('projectEventStream throws on an empty event array', () => {
  assert.throws(() => projectEventStream([]), /empty|no events/i);
});

// --- Non-complete terminal states must not be reported as complete ---

test('projectEventStream reflects interrupted state, not complete', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    { eventId: 'e2', type: 'interrupt', payload: { reason: 'user-cancelled' } },
  ]);
  const projection = projectEventStream(events);
  assert.equal(projection.status, 'interrupted');
  assert.notEqual(projection.status, 'complete');
  assert.equal(projection.result, undefined);
});

test('projectEventStream reflects errored state, not complete', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    { eventId: 'e2', type: 'error', payload: { error: 'provider failure', code: 'E_TIMEOUT' } },
  ]);
  const projection = projectEventStream(events);
  assert.equal(projection.status, 'errored');
  assert.notEqual(projection.status, 'complete');
  assert.equal(projection.result, undefined);
});

test('projectEventStream reflects incomplete state when stream has no terminal event', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    { eventId: 'e2', type: 'delta', payload: { content: 'partial' } },
  ]);
  const projection = projectEventStream(events);
  assert.equal(projection.status, 'incomplete');
  assert.notEqual(projection.status, 'complete');
  assert.equal(projection.result, undefined);
});

// --- Sensitive field handling ---

test('sanitizeEventPayload rejects a payload containing an apiKey field', () => {
  assert.throws(() => sanitizeEventPayload({ apiKey: 'sk-secret-123' }), /sensitive|apiKey|secret/i);
});

test('sanitizeEventPayload rejects a payload containing a chain-of-thought field', () => {
  assert.throws(() => sanitizeEventPayload({ reasoning: 'first I thought...' }), /sensitive|reasoning|thinking/i);
  assert.throws(() => sanitizeEventPayload({ chainOfThought: 'step 1...' }), /sensitive/i);
  assert.throws(() => sanitizeEventPayload({ thinking: 'internal monologue' }), /sensitive/i);
});

test('sanitizeEventPayload rejects a payload containing a password/credential/secret field', () => {
  assert.throws(() => sanitizeEventPayload({ password: 'hunter2' }), /sensitive/i);
  assert.throws(() => sanitizeEventPayload({ credentials: { user: 'x' } }), /sensitive/i);
  assert.throws(() => sanitizeEventPayload({ secretToken: 'abc' }), /sensitive/i);
});

test('sanitizeEventPayload catches sensitive keys nested inside a namespaced extension', () => {
  assert.throws(
    () => sanitizeEventPayload({ content: 'ok', extensions: { myFeature: { apiKey: 'sneaky' } } }),
    /sensitive/i,
  );
});

test('sanitizeEventPayload catches sensitive keys nested deeply anywhere in the payload', () => {
  assert.throws(
    () => sanitizeEventPayload({ a: { b: { c: { thinking: 'hidden deep' } } } }),
    /sensitive/i,
  );
});

test('sanitizeEventPayload allows safe namespaced extension fields to pass through untouched', () => {
  const payload = {
    content: 'hello',
    extensions: { billing: { costUsd: 0.02, provider: 'nvidia' } },
  };
  const sanitized = sanitizeEventPayload(payload);
  assert.deepEqual(sanitized, payload);
});

test('sanitizeEventPayload allows plain safe payloads through untouched', () => {
  const payload = { content: 'hello world', tokensUsed: 12 };
  const sanitized = sanitizeEventPayload(payload);
  assert.deepEqual(sanitized, payload);
});

test('projectEventStream rejects streams whose events carry sensitive payload fields', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    { eventId: 'e2', type: 'delta', payload: { content: 'x', apiKey: 'leak' } },
  ]);
  assert.throws(() => projectEventStream(events), /sensitive/i);
});

test('projectEventStream preserves namespaced extension fields through projection', () => {
  const events = stream([
    { eventId: 'e1', type: 'start' },
    {
      eventId: 'e2',
      type: 'end',
      payload: { outputHash: 'oh', extensions: { billing: { costUsd: 0.1 } } },
    },
  ]);
  const projection = projectEventStream(events);
  assert.equal(projection.status, 'complete');
  assert.deepEqual((projection.result as any)?.extensions, { billing: { costUsd: 0.1 } });
});

// --- validateNoesisAgentEvent applies sanitization ---

test('validateNoesisAgentEvent rejects an event whose payload contains sensitive fields', () => {
  const event = makeEvent({ type: 'delta', payload: { content: 'x', secret: 'leak' } });
  assert.throws(() => validateNoesisAgentEvent(event), /sensitive/i);
});
