// tests/agentscope-remote-executor.test.ts
//
// Strict, no-any coverage for the AgentScope remote executor adapter (Task 10).
// Native remains the authoritative default executor. AgentScope is an optional
// remote execution backend that the host validates before ever trusting its
// output; the host retains FactLock, context, provenance, validation, and
// persistence authority in all modes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  hashFactLock,
  validateExecutorResult,
  createNativeExecutorV2,
  type AtomicTask,
  type ExecutionEnvelopeV1,
  type FactLock,
  type TaskExecutor,
  type TaskResult,
  type ExecutorV2,
  type ExecutorCandidateV1,
} from '@witness/orchestration';
import {
  createAgentscopeRemoteExecutor,
  createCircuitBreaker,
  createBoundedShadowStore,
  type AgentscopeRemoteEvent,
  type AgentscopePromptBinding,
} from '../src/wiring/agentscope/remote-task-executor.js';
import { toNoesisAgentEvents, projectAgentscopeStream } from '../src/wiring/agentscope/event-projector.js';

interface FetchInit {
  method: 'POST';
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
}

interface FetchResponse {
  ok: boolean;
  status: number;
  body: AsyncIterable<Uint8Array> | null;
  text(): Promise<string>;
}

function makeTask(): AtomicTask {
  return {
    id: 'task-1',
    perspective: 'aletheios',
    dependsOn: [],
    targetTokens: 48,
    promptHash: 'prompt-hash-1',
    promptTemplateId: 'template-1',
    buildPrompts: () => ({
      system: 'You are a bounded responder.',
      user: 'Return only one short sentence.',
    }),
  };
}

function makeFactLock(): FactLock {
  return {
    subjectId: 'subject-1',
    subject: 'Subject One',
    facts: {
      'engine:panchanga:run-42': {
        value: { tithi: 'Shukla Panchami' },
        source: 'engine:panchanga:run-42',
      },
    },
    frozenAt: '2026-07-28T00:00:00Z',
    version: 'fl-1',
  };
}

async function makeEnvelope(factLock: FactLock, attemptId = 'attempt-1'): Promise<ExecutionEnvelopeV1> {
  const factLockHash = await hashFactLock(factLock);
  return {
    schemaVersion: 'noesis.execution.v1',
    runId: 'run-1',
    attemptId,
    idempotencyKey: `idem-${attemptId}`,
    contextPacketHash: 'context-hash-1',
    factLock,
    factLockHash,
    task: {
      taskId: 'task-1',
      perspective: 'aletheios',
      dependsOn: [],
      targetTokens: 48,
      promptTemplateId: 'template-1',
      promptHash: 'prompt-hash-1',
    },
    priorOutputRefs: [],
    allowedTools: [],
    deadlineAt: '2026-07-28T00:05:00Z',
  };
}

function makeNativeExecutor(content: string): { executor: ExecutorV2; calls(): number } {
  let calls = 0;
  const legacy: TaskExecutor = async (task): Promise<TaskResult> => {
    calls += 1;
    return { taskId: task.id, perspective: task.perspective, content, latencyMs: 0 };
  };
  return { executor: createNativeExecutorV2(legacy), calls: () => calls };
}

function ndjson(events: AgentscopeRemoteEvent[]): string {
  return events.map((event) => JSON.stringify(event)).join('\n') + '\n';
}

interface FakeFetchOptions {
  ok?: boolean;
  status?: number;
  record?: (url: string, body: Record<string, unknown>, headers: Record<string, string>) => void;
  signalWait?: boolean;
}

function fakeFetch(body: string, opts?: FakeFetchOptions) {
  let calls = 0;
  const impl = async (url: string, init: FetchInit): Promise<FetchResponse> => {
    calls += 1;
    const parsed = JSON.parse(init.body) as Record<string, unknown>;
    if (opts?.record) {
      opts.record(url, parsed, init.headers);
    }
    if (opts?.signalWait) {
      return await new Promise<FetchResponse>((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
      });
    }
    return {
      ok: opts?.ok ?? true,
      status: opts?.status ?? 200,
      body: null,
      text: async () => body,
    };
  };
  return { impl, calls: () => calls };
}

function validRemoteEvents(envelope: ExecutionEnvelopeV1, content: string): AgentscopeRemoteEvent[] {
  return [
    {
      type: 'start',
      envelope_id: envelope.attemptId,
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
    { type: 'delta', envelope_id: envelope.attemptId, content, index: 0 },
    {
      type: 'end',
      envelope_id: envelope.attemptId,
      full_content: content,
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
  ];
}

function messagesBinder(task: AtomicTask, envelope: ExecutionEnvelopeV1): AgentscopePromptBinding {
  const prompts = task.buildPrompts(makeFactLock(), {});
  return {
    messages: [
      { role: 'system', content: prompts.system },
      { role: 'user', content: prompts.user },
    ],
    promptHash: envelope.task.promptHash,
  };
}

// ---------------------------------------------------------------------------
// Native mode: authoritative default, never calls remote.
// ---------------------------------------------------------------------------

test('native mode never calls remote and returns native candidate', async () => {
  const { executor: nativeExecutor, calls } = makeNativeExecutor('native output');
  const fetch = fakeFetch('');
  const envelope = await makeEnvelope(makeFactLock());

  const executor = createAgentscopeRemoteExecutor({
    mode: 'native',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: fetch.impl,
  });

  const candidate = await executor(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
  assert.equal(candidate.provenance.executor, 'native');
  assert.equal(fetch.calls(), 0);
  assert.equal(calls(), 1);
});

// ---------------------------------------------------------------------------
// Canary mode: valid completion, output hash, prompt binding.
// ---------------------------------------------------------------------------

test('canary mode: valid completion returns validated remote candidate', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const remoteEvents = validRemoteEvents(envelope, 'remote content');
  let postedBody: Record<string, unknown> | undefined;

  const { impl } = fakeFetch(ndjson(remoteEvents), {
    record: (_url, body) => {
      postedBody = body;
    },
  });

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  });

  const candidate = await executor(envelope, makeTask());

  assert.equal(candidate.output, 'remote content');
  assert.equal(candidate.outputHash, createHash('sha256').update('remote content').digest('hex'));
  assert.equal(candidate.provenance.executor, 'agentscope-2.0.5');
  assert.ok(postedBody);
  assert.equal('prompt' in postedBody!, false);
  assert.equal(Array.isArray(postedBody!.messages), true);
  assert.equal((postedBody!.messages as Array<{ role: string; content: string }>).length, 2);
  assert.equal(postedBody!.fact_lock_ref, envelope.factLockHash);
  assert.equal(postedBody!.context_hash, envelope.contextPacketHash);
  assert.equal(postedBody!.provenance_ref, envelope.runId);

  const revalidation = validateExecutorResult(candidate, {
    expectedContextPacketHash: envelope.contextPacketHash,
    expectedFactLockHash: envelope.factLockHash,
    expectedTaskIds: new Set([envelope.task.taskId]),
    knownAttemptIds: new Set([candidate.attemptId]),
  });
  assert.equal(revalidation.valid, true);
});

// ---------------------------------------------------------------------------
// Prompt hash gate before HTTP.
// ---------------------------------------------------------------------------

test('canary mode: prompt hash mismatch falls back to native before any HTTP call', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const { impl, calls } = fakeFetch(ndjson(validRemoteEvents(envelope, 'ok')));

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: () => ({
      prompt: 'bad',
      promptHash: 'wrong-hash',
    }),
  });

  const candidate = await executor(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
  assert.equal(calls(), 0);
});

// ---------------------------------------------------------------------------
// Timeout: real abortable timeout.
// ---------------------------------------------------------------------------

test('canary mode: timeout aborts the request and falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const { impl, calls } = fakeFetch('', { signalWait: true });

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    timeoutMs: 20,
    promptBinder: messagesBinder,
  });

  const candidate = await executor(envelope, makeTask());
  assert.equal(candidate.output, 'native output');
  assert.equal(candidate.provenance.executor, 'native');
  assert.equal(calls(), 1);
});

// ---------------------------------------------------------------------------
// External cancellation.
// ---------------------------------------------------------------------------

test('canary mode: external abortSignalFor cancels the call and falls back', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const controller = new AbortController();
  const fetch = fakeFetch('', { signalWait: true });

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: fetch.impl,
    abortSignalFor: () => controller.signal,
    promptBinder: messagesBinder,
  });

  const run = executor(envelope, makeTask());
  controller.abort(new Error('test abort'));
  const candidate = await run;

  assert.equal(candidate.output, 'native output');
});

// ---------------------------------------------------------------------------
// Invalid FactLock: envelope factLockHash mismatch must never be trusted.
// ---------------------------------------------------------------------------

test('canary mode: start event fact_lock_ref not matching envelope rejects the stream', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const tampered = validRemoteEvents(envelope, 'ok').map((event) =>
    event.type === 'start' ? { ...event, fact_lock_ref: 'tampered-fact-lock' } : event,
  );
  const { impl } = fakeFetch(ndjson(tampered));

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
  assert.equal(candidate.provenance.executor, 'native');
});

// ---------------------------------------------------------------------------
// Missing terminal.
// ---------------------------------------------------------------------------

test('canary mode: missing terminal event falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const missingTerminal: AgentscopeRemoteEvent[] = [
    {
      type: 'start',
      envelope_id: envelope.attemptId,
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
    { type: 'delta', envelope_id: envelope.attemptId, content: 'partial', index: 0 },
  ];
  const { impl } = fakeFetch(ndjson(missingTerminal));

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

// ---------------------------------------------------------------------------
// Orphan delta before start.
// ---------------------------------------------------------------------------

test('canary mode: orphan delta before start falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const orphan: AgentscopeRemoteEvent[] = [
    { type: 'delta', envelope_id: envelope.attemptId, content: 'x', index: 0 },
    {
      type: 'end',
      envelope_id: envelope.attemptId,
      full_content: 'x',
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
  ];
  const { impl } = fakeFetch(ndjson(orphan));

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

// ---------------------------------------------------------------------------
// Duplicate terminal.
// ---------------------------------------------------------------------------

test('canary mode: duplicate terminal event falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const dup: AgentscopeRemoteEvent[] = [
    {
      type: 'start',
      envelope_id: envelope.attemptId,
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
    {
      type: 'end',
      envelope_id: envelope.attemptId,
      full_content: 'a',
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
    {
      type: 'end',
      envelope_id: envelope.attemptId,
      full_content: 'b',
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
  ];

  const { impl } = fakeFetch(ndjson(dup));
  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

// ---------------------------------------------------------------------------
// Post-terminal event.
// ---------------------------------------------------------------------------

test('canary mode: event after terminal is rejected and falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const bad: AgentscopeRemoteEvent[] = [
    {
      type: 'start',
      envelope_id: envelope.attemptId,
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
    {
      type: 'end',
      envelope_id: envelope.attemptId,
      full_content: 'good',
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
    { type: 'delta', envelope_id: envelope.attemptId, content: 'x', index: 1 },
  ];

  const { impl } = fakeFetch(ndjson(bad));
  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

// ---------------------------------------------------------------------------
// Unknown event type.
// ---------------------------------------------------------------------------

test('canary mode: unknown event type is rejected and falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const raw = [
    {
      type: 'start',
      envelope_id: envelope.attemptId,
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
    { type: 'weird-unknown-type', envelope_id: envelope.attemptId },
  ];
  const text = raw.map((event) => JSON.stringify(event)).join('\n') + '\n';
  const { impl } = fakeFetch(text);

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

// ---------------------------------------------------------------------------
// Unsafe unknown field rejected, safe unknown field preserved.
// ---------------------------------------------------------------------------

test('canary mode: sensitive unknown field on start event is rejected', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const events = validRemoteEvents(envelope, 'ok').map((event) =>
    event.type === 'start'
      ? { ...event, fact_lock_override: 'attacker-supplied-fact-lock' }
      : event,
  );
  const { impl } = fakeFetch(ndjson(events));

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  // Host never trusts remote-declared FactLock overrides regardless of field name;
  // safest posture is candidate falls back to native rather than being trusted.
  assert.equal(candidate.provenance.executor, 'native');
  assert.equal(candidate.output, 'native output');
});

test('canary mode: safe unknown field on delta event is preserved through projection', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const events = validRemoteEvents(envelope, 'remote output').map((event) =>
    event.type === 'delta' ? { ...event, safe_debug_note: 'informational-only' } : event,
  );
  const { impl } = fakeFetch(ndjson(events));

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'remote output');
  assert.equal(candidate.provenance.executor, 'agentscope-2.0.5');
  const deltaEvent = candidate.provenance.events.find((e) => e.type === 'delta');
  assert.ok(deltaEvent);
  const extensions = (deltaEvent!.payload as Record<string, unknown>).extensions as
    | { agentscope?: Record<string, unknown> }
    | undefined;
  assert.equal(extensions?.agentscope?.safe_debug_note, 'informational-only');
});

// ---------------------------------------------------------------------------
// Start/end echo mismatch and omission.
// ---------------------------------------------------------------------------

test('canary mode: start context_hash mismatch falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const startMismatch = validRemoteEvents(envelope, 'ok').map((event) =>
    event.type === 'start' ? { ...event, context_hash: 'bad-context' } : event,
  );
  const { impl } = fakeFetch(ndjson(startMismatch));

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

test('canary mode: end fact_lock_ref mismatch falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock(), 'attempt-2');
  const endMismatch = validRemoteEvents(envelope, 'ok').map((event) =>
    event.type === 'end' ? { ...event, fact_lock_ref: 'bad-fact' } : event,
  );
  const { impl } = fakeFetch(ndjson(endMismatch));

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

test('canary mode: end event omitting provenance_ref falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const events = validRemoteEvents(envelope, 'ok').map((event) => {
    if (event.type !== 'end') return event;
    const { provenance_ref: _drop, ...rest } = event;
    return rest as AgentscopeRemoteEvent;
  });
  const { impl } = fakeFetch(ndjson(events));

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

test('canary mode: mismatched envelope_id on any event falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const wrongEnvelopeEvents = validRemoteEvents(envelope, 'ok').map((event) => ({
    ...event,
    envelope_id: 'wrong-id',
  }));

  const { impl } = fakeFetch(ndjson(wrongEnvelopeEvents));
  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

// ---------------------------------------------------------------------------
// Bad delta indexes: noncontiguous, non-integer, duplicate.
// ---------------------------------------------------------------------------

test('canary mode: noncontiguous, non-integer, and duplicate delta indexes all fall back', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());

  const startEvent = (): AgentscopeRemoteEvent => ({
    type: 'start',
    envelope_id: envelope.attemptId,
    fact_lock_ref: envelope.factLockHash,
    context_hash: envelope.contextPacketHash,
    provenance_ref: envelope.runId,
  });
  const endEvent = (content: string): AgentscopeRemoteEvent => ({
    type: 'end',
    envelope_id: envelope.attemptId,
    full_content: content,
    fact_lock_ref: envelope.factLockHash,
    context_hash: envelope.contextPacketHash,
    provenance_ref: envelope.runId,
  });

  const malformedStreams: AgentscopeRemoteEvent[][] = [
    // non-contiguous: jumps to index 1 first
    [startEvent(), { type: 'delta', envelope_id: envelope.attemptId, content: 'x', index: 1 }, endEvent('x')],
    // non-integer index
    [
      startEvent(),
      { type: 'delta', envelope_id: envelope.attemptId, content: 'x', index: 0.5 },
      endEvent('x'),
    ],
    // duplicate index
    [
      startEvent(),
      { type: 'delta', envelope_id: envelope.attemptId, content: 'x', index: 0 },
      { type: 'delta', envelope_id: envelope.attemptId, content: 'x', index: 0 },
      endEvent('xx'),
    ],
  ];

  for (const events of malformedStreams) {
    const { impl } = fakeFetch(ndjson(events));
    const candidate = await createAgentscopeRemoteExecutor({
      mode: 'agentscope-canary',
      nativeExecutor,
      modelGatewayRef: 'gw-1',
      baseUrl: 'http://localhost:9',
      fetchImpl: impl,
      promptBinder: messagesBinder,
    })(envelope, makeTask());
    assert.equal(candidate.output, 'native output');
  }
});

// ---------------------------------------------------------------------------
// Output mismatch: joined deltas do not equal end.full_content.
// ---------------------------------------------------------------------------

test('canary mode: joined delta content mismatching full_content falls back to native', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const bad: AgentscopeRemoteEvent[] = [
    {
      type: 'start',
      envelope_id: envelope.attemptId,
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
    { type: 'delta', envelope_id: envelope.attemptId, content: 'a', index: 0 },
    {
      type: 'end',
      envelope_id: envelope.attemptId,
      full_content: 'ab',
      fact_lock_ref: envelope.factLockHash,
      context_hash: envelope.contextPacketHash,
      provenance_ref: envelope.runId,
    },
  ];

  const { impl } = fakeFetch(ndjson(bad));
  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
});

// ---------------------------------------------------------------------------
// Duplicate/late attemptId across calls via shared consumedAttemptIds.
// ---------------------------------------------------------------------------

test('canary mode: duplicate/late attemptId is rejected on the second call via consumedAttemptIds', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock(), 'late-attempt');
  const remote = ndjson(validRemoteEvents(envelope, 'remote output'));
  const { impl } = fakeFetch(remote);
  const consumedAttemptIds = new Set<string>();

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    consumedAttemptIds,
    promptBinder: messagesBinder,
  });

  const first = await executor(envelope, makeTask());
  const second = await executor(envelope, makeTask());

  assert.equal(first.output, 'remote output');
  assert.equal(second.output, 'native output');
  assert.equal(consumedAttemptIds.has('late-attempt'), true);
});

// ---------------------------------------------------------------------------
// Circuit breaker: opens on failures, permits exactly one half-open probe.
// ---------------------------------------------------------------------------

test('circuit breaker opens after threshold and permits exactly one half-open probe', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const firstEnvelope = await makeEnvelope(makeFactLock(), 'attempt-a');
  const secondEnvelope = await makeEnvelope(makeFactLock(), 'attempt-b');
  const probeEnvelope = await makeEnvelope(makeFactLock(), 'attempt-probe');

  let now = 0;
  const circuit = createCircuitBreaker({ failureThreshold: 1, cooldownMs: 100 });
  const failingFetch = fakeFetch('', { ok: false, status: 500 });

  const failingExecutor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: failingFetch.impl,
    circuit,
    now: () => now,
    promptBinder: messagesBinder,
  });

  const openingCall = await failingExecutor(firstEnvelope, makeTask());
  assert.equal(openingCall.output, 'native output');
  assert.equal(failingFetch.calls(), 1);

  // Circuit is still open (within cooldown); no remote call should be attempted.
  const duringCooldown = await failingExecutor(secondEnvelope, makeTask());
  assert.equal(duringCooldown.output, 'native output');
  assert.equal(failingFetch.calls(), 1);

  now = 200;
  let succeedingCalls = 0;
  const succeedingExecutor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: async (): Promise<FetchResponse> => {
      succeedingCalls += 1;
      return {
        ok: true,
        status: 200,
        body: null,
        text: async () => ndjson(validRemoteEvents(probeEnvelope, 'remote')),
      };
    },
    circuit,
    now: () => now,
    promptBinder: messagesBinder,
  });

  const probe = await succeedingExecutor(probeEnvelope, makeTask());
  assert.equal(probe.output, 'remote');
  assert.equal(succeedingCalls, 1);
});

test('circuit breaker option validation rejects non-positive-integer settings', () => {
  assert.throws(() => createCircuitBreaker({ failureThreshold: 0, cooldownMs: 10 }), /failureThreshold must be a positive integer/);
  assert.throws(() => createCircuitBreaker({ failureThreshold: 1, cooldownMs: -1 }), /cooldownMs must be a positive integer/);
});

// ---------------------------------------------------------------------------
// Native fallback after remote failure (non-timeout HTTP error).
// ---------------------------------------------------------------------------

test('canary mode: remote HTTP failure falls back to native and records circuit failure', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const { impl } = fakeFetch('', { ok: false, status: 503 });
  const circuit = createCircuitBreaker({ failureThreshold: 5, cooldownMs: 1000 });

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    circuit,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
  assert.equal(circuit.state.consecutiveFailures, 1);
});

// ---------------------------------------------------------------------------
// Shadow mode: exactly one native execution, non-authoritative storage.
// ---------------------------------------------------------------------------

test('shadow mode: calls native exactly once, returns native, stores validated remote separately', async () => {
  const { executor: nativeExecutor, calls } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const remote = validRemoteEvents(envelope, 'remote output');
  const { impl } = fakeFetch(ndjson(remote));
  const shadowStore = createBoundedShadowStore({ maxRuns: 1, maxRecordsPerRun: 2 });

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-shadow',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    shadowStore,
    promptBinder: messagesBinder,
  });

  const candidate = await executor(envelope, makeTask());

  assert.equal(calls(), 1);
  assert.equal(candidate.provenance.executor, 'native');
  const record = shadowStore.get(envelope.runId)?.at(0);
  assert.ok(record);
  assert.equal(record?.native.output, 'native output');
  assert.equal(record?.agentscope?.output, 'remote output');
});

test('shadow mode: remote error is stored bounded/sanitized and never thrown', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const { impl } = fakeFetch('', { ok: false, status: 500 });
  const shadowStore = createBoundedShadowStore({ maxRuns: 1, maxRecordsPerRun: 1 });

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-shadow',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    shadowStore,
    promptBinder: messagesBinder,
  });

  const candidate = await executor(envelope, makeTask());

  assert.equal(candidate.output, 'native output');
  const record = shadowStore.get(envelope.runId)?.at(0);
  assert.equal(record?.agentscope, null);
  assert.match(record?.agentscopeError ?? '', /HTTP 500/);
  assert.ok((record?.agentscopeError ?? '').length < 500);
});

test('shadow mode: shadow store instances are isolated (no shared/global mutable state)', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const { impl } = fakeFetch(ndjson(validRemoteEvents(envelope, 'remote output')));
  const shadowStore = createBoundedShadowStore({ maxRuns: 1, maxRecordsPerRun: 1 });

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-shadow',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    shadowStore,
    promptBinder: messagesBinder,
  });

  const candidate = await executor(envelope, makeTask());
  assert.equal(candidate.provenance.executor, 'native');

  const independent = createBoundedShadowStore({ maxRuns: 1, maxRecordsPerRun: 1 });
  assert.equal(independent.size(), 0);
  assert.equal(shadowStore.size(), 1);
});

test('bounded shadow store rejects non-positive-integer options and evicts oldest run', () => {
  assert.throws(() => createBoundedShadowStore({ maxRuns: 0, maxRecordsPerRun: 1 }), /maxRuns must be a positive integer/);
  assert.throws(() => createBoundedShadowStore({ maxRuns: 1, maxRecordsPerRun: 0 }), /maxRecordsPerRun must be a positive integer/);

  const store = createBoundedShadowStore({ maxRuns: 1, maxRecordsPerRun: 1, now: () => 1 });
  const candidate: ExecutorCandidateV1 = {
    runId: 'run-a',
    attemptId: 'a1',
    contextPacketHash: 'ctx',
    factLockHash: 'fact',
    task: { taskId: 'task-1', perspective: 'aletheios' },
    output: 'n',
    outputHash: createHash('sha256').update('n').digest('hex'),
    provenance: {
      schemaVersion: 'noesis.provenance.v1',
      runId: 'run-a',
      attemptId: 'a1',
      executor: 'native',
      adapterVersion: '1.0.0',
      contextPacketHash: 'ctx',
      factLockHash: 'fact',
      promptTemplateId: 'template-1',
      promptHash: 'prompt-hash-1',
      modelCalls: [],
      toolCalls: [],
      claimRefs: [],
      events: [],
      terminal: { reason: 'completed', outputHash: createHash('sha256').update('n').digest('hex') },
    },
  };

  store.record('run-1', { attemptId: 'a1', native: candidate, agentscope: null });
  store.record('run-2', { attemptId: 'a2', native: candidate, agentscope: null });

  assert.equal(store.size(), 1);
  assert.equal(store.get('run-1'), undefined);
  assert.ok(store.get('run-2'));
});

// ---------------------------------------------------------------------------
// Canary serving validated-remote-only.
// ---------------------------------------------------------------------------

test('canary mode: candidate served is the one that passed host validateExecutorResult', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const { impl } = fakeFetch(ndjson(validRemoteEvents(envelope, 'remote output')));

  const candidate = await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  const revalidation = validateExecutorResult(candidate, {
    expectedContextPacketHash: envelope.contextPacketHash,
    expectedFactLockHash: envelope.factLockHash,
    expectedTaskIds: new Set([envelope.task.taskId]),
    knownAttemptIds: new Set([candidate.attemptId]),
  });

  assert.equal(revalidation.valid, true);
  assert.equal(candidate.provenance.executor, 'agentscope-2.0.5');
});

// ---------------------------------------------------------------------------
// Header-only internal token.
// ---------------------------------------------------------------------------

test('internal token is sent only as an Authorization header, never in body', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  let headersOut: Record<string, string> = {};
  let bodyOut: Record<string, unknown> = {};

  const { impl, calls } = fakeFetch(ndjson(validRemoteEvents(envelope, 'remote output')), {
    record: (_url, body, headers) => {
      headersOut = headers;
      bodyOut = body;
    },
  });

  await createAgentscopeRemoteExecutor({
    mode: 'agentscope-canary',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    internalToken: 'secret-token',
    promptBinder: messagesBinder,
  })(envelope, makeTask());

  assert.equal(calls(), 1);
  assert.equal(headersOut.authorization, 'Bearer secret-token');
  assert.equal(JSON.stringify(bodyOut).includes('secret-token'), false);
});

// ---------------------------------------------------------------------------
// Corrective coverage: projected start promptHash must be the host-expected
// envelope.task.promptHash, never the remote attemptId/envelope_id.
// ---------------------------------------------------------------------------

test('projectAgentscopeStream: start promptHash equals envelope.task.promptHash, never attemptId', async () => {
  const envelope = await makeEnvelope(makeFactLock());
  const remote = validRemoteEvents(envelope, 'remote content');

  const events = await toNoesisAgentEvents(remote, {
    runId: envelope.runId,
    attemptId: envelope.attemptId,
    taskId: envelope.task.taskId,
    promptHash: envelope.task.promptHash,
  });

  const start = events.find((e) => e.type === 'start');
  assert.ok(start);
  assert.equal(start!.payload.promptHash, envelope.task.promptHash);
  assert.notEqual(start!.payload.promptHash, envelope.attemptId);
});

test('projectAgentscopeStream: end event echoes provenance/context/factLock and outputHash is sha256', async () => {
  const envelope = await makeEnvelope(makeFactLock());
  const remote = validRemoteEvents(envelope, 'remote content');

  const events = await toNoesisAgentEvents(remote, {
    runId: envelope.runId,
    attemptId: envelope.attemptId,
    taskId: envelope.task.taskId,
    promptHash: envelope.task.promptHash,
  });

  const end = events.find((e) => e.type === 'end');
  assert.ok(end);
  assert.equal(end!.payload.factLockHash, envelope.factLockHash);
  assert.equal(end!.payload.contextHash, envelope.contextPacketHash);
  assert.equal(end!.payload.provenanceRef, envelope.runId);
  assert.equal(end!.payload.outputHash, createHash('sha256').update('remote content').digest('hex'));

  const start = events.find((e) => e.type === 'start');
  assert.ok(start);
  assert.equal(start!.payload.factLockHash, envelope.factLockHash);
  assert.equal(start!.payload.contextHash, envelope.contextPacketHash);
  assert.equal(start!.payload.provenanceRef, envelope.runId);
});

// ---------------------------------------------------------------------------
// Corrective coverage: shadow validation must not mutate an externally
// supplied consumedAttemptIds set (canary/served authority is separate).
// ---------------------------------------------------------------------------

test('shadow mode: validation does not add to an externally supplied consumedAttemptIds set', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock(), 'shadow-attempt');
  const remote = ndjson(validRemoteEvents(envelope, 'remote output'));
  const { impl } = fakeFetch(remote);
  const consumedAttemptIds = new Set<string>();
  const shadowStore = createBoundedShadowStore({ maxRuns: 1, maxRecordsPerRun: 1 });

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-shadow',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    consumedAttemptIds,
    shadowStore,
    promptBinder: messagesBinder,
  });

  await executor(envelope, makeTask());

  assert.equal(consumedAttemptIds.has('shadow-attempt'), false);
  assert.equal(consumedAttemptIds.size, 0);
  const record = shadowStore.get(envelope.runId)?.at(0);
  assert.equal(record?.agentscope?.output, 'remote output');
});

// ---------------------------------------------------------------------------
// Corrective coverage: shadow failure/success must correctly update the
// shared circuit breaker (open on threshold failures, reset on success).
// ---------------------------------------------------------------------------

test('shadow mode: remote failures open the circuit at threshold and a subsequent success resets it', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const circuit = createCircuitBreaker({ failureThreshold: 2, cooldownMs: 30_000 });
  const shadowStore = createBoundedShadowStore({ maxRuns: 5, maxRecordsPerRun: 5 });

  const failingFetch = fakeFetch('', { ok: false, status: 500 });

  const failingExecutor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-shadow',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: failingFetch.impl,
    circuit,
    shadowStore,
    promptBinder: messagesBinder,
  });

  const envelopeA = await makeEnvelope(makeFactLock(), 'shadow-fail-1');
  const envelopeB = await makeEnvelope(makeFactLock(), 'shadow-fail-2');
  await failingExecutor(envelopeA, makeTask());
  await failingExecutor(envelopeB, makeTask());

  assert.equal(circuit.state.consecutiveFailures, 2);
  assert.ok(circuit.state.openUntil !== null);

  // Circuit is now open: shadow mode records 'circuit open' without attempting remote.
  const envelopeC = await makeEnvelope(makeFactLock(), 'shadow-fail-3');
  const candidateWhileOpen = await failingExecutor(envelopeC, makeTask());
  assert.equal(candidateWhileOpen.output, 'native output');
  assert.equal(shadowStore.get(envelopeC.runId)?.at(-1)?.agentscopeError, 'circuit open');

  // A separate breaker verifies shadow success resets consecutiveFailures.
  const successCircuit = createCircuitBreaker({ failureThreshold: 2, cooldownMs: 30_000 });
  successCircuit.recordFailure(Date.now());
  assert.equal(successCircuit.state.consecutiveFailures, 1);

  const successFetch = fakeFetch(ndjson(validRemoteEvents(await makeEnvelope(makeFactLock(), 'shadow-ok'), 'remote output')));
  const successExecutor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-shadow',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: successFetch.impl,
    circuit: successCircuit,
    shadowStore: createBoundedShadowStore({ maxRuns: 5, maxRecordsPerRun: 5 }),
    promptBinder: messagesBinder,
  });

  const envelopeOk = await makeEnvelope(makeFactLock(), 'shadow-ok');
  await successExecutor(envelopeOk, makeTask());
  assert.equal(successCircuit.state.consecutiveFailures, 0);
  assert.equal(successCircuit.state.openUntil, null);
});

// ---------------------------------------------------------------------------
// Corrective coverage: shadow errors must be bounded/sanitized and never
// leak raw NDJSON, tokens, authorization, credentials, or remote bodies.
// A malicious invalid NDJSON line containing a secret must never reach
// shadowStore, and the stored error must be a bounded, safe category.
// ---------------------------------------------------------------------------

test('shadow mode: malicious NDJSON line with embedded secret never reaches shadowStore and stored error is bounded/safe', async () => {
  const { executor: nativeExecutor } = makeNativeExecutor('native output');
  const envelope = await makeEnvelope(makeFactLock());
  const maliciousLine = `not-json Authorization: Bearer sk-super-secret-credential-${'x'.repeat(2000)}`;
  const { impl } = fakeFetch(`${maliciousLine}\n`);
  const shadowStore = createBoundedShadowStore({ maxRuns: 1, maxRecordsPerRun: 1 });

  const executor = createAgentscopeRemoteExecutor({
    mode: 'agentscope-shadow',
    nativeExecutor,
    modelGatewayRef: 'gw-1',
    baseUrl: 'http://localhost:9',
    fetchImpl: impl,
    shadowStore,
    promptBinder: messagesBinder,
  });

  const candidate = await executor(envelope, makeTask());
  assert.equal(candidate.output, 'native output');

  const record = shadowStore.get(envelope.runId)?.at(0);
  assert.ok(record);
  assert.equal(record?.agentscope, null);

  const storedError = record?.agentscopeError ?? '';
  assert.ok(storedError.length <= 500);
  assert.equal(storedError.includes('sk-super-secret-credential'), false);
  assert.equal(storedError.includes('Bearer'), false);
  assert.equal(storedError.includes(maliciousLine), false);
});
