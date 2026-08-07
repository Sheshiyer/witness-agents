// packages/orchestration/tests/executor-conformance.test.ts
// Task 2 conformance tests: host-side remote-result validation and backward compatibility (strict TDD).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateExecutorResult,
  adaptLegacyTaskExecutor,
  createNativeExecutorV2,
  hashString,
  hashFactLock,
  type ExecutorCandidateV1,
  type ValidationParams,
  type ExecutionEnvelopeV1,
  type ProvenanceEnvelopeV1,
  type FactLock,
  type AtomicTask,
  type TaskExecutor,
  type TaskResult,
} from '../src/index.js';

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

function makeEnvelope(factLock: FactLock, factLockHash: string): ExecutionEnvelopeV1 {
  return {
    schemaVersion: 'noesis.execution.v1',
    runId: 'run-1',
    attemptId: 'attempt-1',
    idempotencyKey: 'idem-1',
    contextPacketHash: 'context-hash-1',
    factLock,
    factLockHash,
    task: {
      taskId: 'task-1',
      perspective: 'aletheios',
      dependsOn: [],
      targetTokens: 256,
      promptTemplateId: 'template-1',
      promptHash: 'prompt-hash-1',
    },
    priorOutputRefs: [],
    allowedTools: [],
    deadlineAt: '2026-07-28T00:05:00Z',
  };
}

async function makeValidCandidate(): Promise<{
  candidate: ExecutorCandidateV1;
  params: ValidationParams;
}> {
  const factLock = makeFactLock();
  const factLockHash = await hashFactLock(factLock);
  const output = 'Aletheios perspective content.';
  const outputHash = await hashString(output);
  const provenance: ProvenanceEnvelopeV1 = {
    schemaVersion: 'noesis.provenance.v1',
    runId: 'run-1',
    attemptId: 'attempt-1',
    executor: 'native',
    adapterVersion: '1.0.0',
    contextPacketHash: 'context-hash-1',
    factLockHash,
    promptTemplateId: 'template-1',
    promptHash: 'prompt-hash-1',
    modelCalls: [],
    toolCalls: [],
    claimRefs: [{ claimId: 'claim-1', sourceIds: ['engine:panchanga:run-42'] }],
    events: [
      {
        schemaVersion: 'noesis.event.v1',
        eventId: 'event-start',
        runId: 'run-1',
        attemptId: 'attempt-1',
        taskId: 'task-1',
        type: 'start',
        timestamp: '2026-07-28T00:00:00Z',
        payload: {},
      },
      {
        schemaVersion: 'noesis.event.v1',
        eventId: 'event-end',
        runId: 'run-1',
        attemptId: 'attempt-1',
        taskId: 'task-1',
        type: 'end',
        timestamp: '2026-07-28T00:00:01Z',
        payload: { outputHash },
      },
    ],
    terminal: { reason: 'completed', outputHash },
  };
  const candidate: ExecutorCandidateV1 = {
    runId: 'run-1',
    attemptId: 'attempt-1',
    contextPacketHash: 'context-hash-1',
    factLockHash,
    task: { taskId: 'task-1', perspective: 'aletheios' },
    output,
    outputHash,
    provenance,
  };
  const params: ValidationParams = {
    expectedContextPacketHash: 'context-hash-1',
    expectedFactLockHash: factLockHash,
    expectedTaskIds: new Set(['task-1']),
    knownAttemptIds: new Set(['attempt-1']),
    allowedSourceIds: new Set(['engine:panchanga:run-42']),
  };
  return { candidate, params };
}

// --- validateExecutorResult: happy path ---

test('validateExecutorResult accepts a fully valid candidate', async () => {
  const { candidate, params } = await makeValidCandidate();
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.result.taskId, 'task-1');
    assert.equal(result.result.perspective, 'aletheios');
    assert.equal(result.result.content, candidate.output);
  }
});

// --- Rejections ---

test('validateExecutorResult rejects context hash mismatch', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.contextPacketHash = 'wrong-context-hash';
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /context/i);
    assert.equal(result.securityEvent, true);
  }
});

test('validateExecutorResult rejects changed FactLock hash', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.factLockHash = 'wrong-factlock-hash';
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /fact ?lock/i);
    assert.equal(result.securityEvent, true);
  }
});

test('validateExecutorResult rejects task mismatch', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.task = { taskId: 'unexpected-task', perspective: 'aletheios' };
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /task/i);
  }
});

test('validateExecutorResult rejects unknown attempt id', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.attemptId = 'attempt-unknown';
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /attempt/i);
  }
});

test('validateExecutorResult rejects duplicate/late attempt on second delivery', async () => {
  const { candidate, params } = await makeValidCandidate();
  params.consumedAttemptIds = new Set<string>();
  const first = validateExecutorResult(candidate, params);
  assert.equal(first.valid, true);
  const second = validateExecutorResult(candidate, params);
  assert.equal(second.valid, false);
  if (!second.valid) {
    assert.match(second.reason, /duplicate|late/i);
  }
});

test('validateExecutorResult rejects output hash mismatch', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.output = 'tampered content';
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /output hash/i);
  }
});

test('validateExecutorResult rejects missing terminal event in provenance', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.provenance = {
    ...candidate.provenance,
    events: [candidate.provenance.events[0]],
  };
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /terminal|provenance/i);
  }
});

test('validateExecutorResult rejects non-completed terminal provenance', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.provenance = {
    ...candidate.provenance,
    events: [
      candidate.provenance.events[0],
      { ...candidate.provenance.events[1], type: 'error', payload: { error: 'boom' } },
    ],
    terminal: { reason: 'error' },
  };
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /terminal|completed/i);
  }
});

test('validateExecutorResult rejects terminal output hash mismatch', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.provenance = {
    ...candidate.provenance,
    terminal: { reason: 'completed', outputHash: 'different-output-hash' },
  };
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /terminal output hash/i);
  }
});

test('validateExecutorResult rejects run/attempt/provenance identity mismatch', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.provenance = { ...candidate.provenance, attemptId: 'other-attempt' };
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /identity|mismatch/i);
  }
});

test('validateExecutorResult rejects claim source ids outside allowedSourceIds', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.provenance = {
    ...candidate.provenance,
    claimRefs: [{ claimId: 'claim-1', sourceIds: ['engine:panchanga:run-42', 'unauthorized:source'] }],
  };
  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.reason, /source/i);
    assert.equal(result.securityEvent, true);
  }
});

test('validateExecutorResult does not mutate the candidate or params', async () => {
  const { candidate, params } = await makeValidCandidate();
  const candidateBefore = JSON.stringify(candidate);
  validateExecutorResult(candidate, params);
  assert.equal(JSON.stringify(candidate), candidateBefore);
});

// --- Validation-gated seam: invalid candidates never reach assemble/repair ---

test('a validation-gated seam rejects an invalid candidate before calling assemble', async () => {
  const { candidate, params } = await makeValidCandidate();
  candidate.factLockHash = 'tampered-hash';

  let assembleCalls = 0;
  const assembleSpy = async () => {
    assembleCalls += 1;
    return { output: '', taskResults: [], contradictions: [], repairIterations: 0 };
  };

  const validation = validateExecutorResult(candidate, params);
  if (validation.valid) {
    await assembleSpy();
  }

  assert.equal(validation.valid, false);
  assert.equal(assembleCalls, 0);
});

test('a validation-gated seam calls assemble only after a valid candidate', async () => {
  const { candidate, params } = await makeValidCandidate();

  let assembleCalls = 0;
  const assembleSpy = async (results: TaskResult[]) => {
    assembleCalls += 1;
    return { output: results[0]?.content ?? '', taskResults: results, contradictions: [], repairIterations: 0 };
  };

  const validation = validateExecutorResult(candidate, params);
  if (validation.valid) {
    await assembleSpy([validation.result]);
  }

  assert.equal(validation.valid, true);
  assert.equal(assembleCalls, 1);
});

// --- adaptLegacyTaskExecutor: preserves legacy behavior ---

function makeTask(id: string, dependsOn: string[] = []): AtomicTask {
  return {
    id,
    perspective: 'aletheios',
    dependsOn,
    targetTokens: 128,
    buildPrompts: (lock, prior, grounding) => ({
      system: `system for ${lock.subject}`,
      user: `user; prior=${Object.keys(prior).join(',')}; grounding=${grounding?.length ?? 0}`,
    }),
  };
}

test('adaptLegacyTaskExecutor preserves legacy TaskExecutor output content', async () => {
  const legacy: TaskExecutor = async (task, lock, prior) => ({
    taskId: task.id,
    perspective: task.perspective,
    content: `legacy-output:${task.id}:${lock.subject}`,
    latencyMs: 5,
  });

  const executorV2 = adaptLegacyTaskExecutor(legacy);
  const factLock = makeFactLock();
  const factLockHash = await hashFactLock(factLock);
  const envelope = makeEnvelope(factLock, factLockHash);
  const task = makeTask('task-1');

  const candidate = await executorV2(envelope, task);

  assert.equal(candidate.output, `legacy-output:task-1:${factLock.subject}`);
  assert.equal(candidate.task.taskId, 'task-1');
  assert.equal(candidate.runId, envelope.runId);
  assert.equal(candidate.attemptId, envelope.attemptId);
  assert.equal(candidate.contextPacketHash, envelope.contextPacketHash);
  assert.equal(candidate.factLockHash, envelope.factLockHash);
  assert.equal(candidate.outputHash, await hashString(candidate.output));
  assert.equal(candidate.provenance.terminal.reason, 'completed');
  assert.equal(candidate.provenance.terminal.outputHash, candidate.outputHash);
});

test('adaptLegacyTaskExecutor passes prior outputs and grounding through additively without loss', async () => {
  let capturedPrior: Record<string, string> | undefined;
  let capturedGrounding: unknown;
  const legacy: TaskExecutor = async (task, lock, prior, grounding) => {
    capturedPrior = prior;
    capturedGrounding = grounding;
    return {
      taskId: task.id,
      perspective: task.perspective,
      content: 'ok',
      latencyMs: 1,
    };
  };

  const executorV2 = adaptLegacyTaskExecutor(legacy);
  const factLock = makeFactLock();
  const factLockHash = await hashFactLock(factLock);
  const envelope = makeEnvelope(factLock, factLockHash);
  const task = makeTask('task-2', ['task-1']);

  const grounding = [{ id: 'gp-1', source: 'canonical:x', excerpt: 'e', score: 0.9 }];
  await executorV2(envelope, task, {
    priorOutputs: { 'task-1': 'prior content from task 1' },
    grounding: grounding as any,
  });

  assert.deepEqual(capturedPrior, { 'task-1': 'prior content from task 1' });
  assert.deepEqual(capturedGrounding, grounding);
});

test('adaptLegacyTaskExecutor defaults to empty prior outputs when no context is supplied', async () => {
  let capturedPrior: Record<string, string> | undefined;
  const legacy: TaskExecutor = async (task, lock, prior) => {
    capturedPrior = prior;
    return { taskId: task.id, perspective: task.perspective, content: 'ok', latencyMs: 1 };
  };
  const executorV2 = adaptLegacyTaskExecutor(legacy);
  const factLock = makeFactLock();
  const factLockHash = await hashFactLock(factLock);
  const envelope = makeEnvelope(factLock, factLockHash);
  const task = makeTask('task-1');

  await executorV2(envelope, task);

  assert.deepEqual(capturedPrior, {});
});

// --- createNativeExecutorV2: does not create a second orchestrator ---

test('createNativeExecutorV2 wraps a legacy executor without introducing its own orchestrator', async () => {
  const calls: string[] = [];
  const legacy: TaskExecutor = async (task, lock) => {
    calls.push(task.id);
    return { taskId: task.id, perspective: task.perspective, content: `native:${task.id}`, latencyMs: 2 };
  };

  const executorV2 = createNativeExecutorV2(legacy);
  const factLock = makeFactLock();
  const factLockHash = await hashFactLock(factLock);
  const envelope = makeEnvelope(factLock, factLockHash);
  const task = makeTask('task-1');

  const candidate = await executorV2(envelope, task);

  assert.equal(candidate.output, 'native:task-1');
  assert.deepEqual(calls, ['task-1']);
  assert.equal(candidate.provenance.executor, 'native');
});

test('createNativeExecutorV2 output passes validateExecutorResult end-to-end', async () => {
  const legacy: TaskExecutor = async (task, lock) => ({
    taskId: task.id,
    perspective: task.perspective,
    content: 'end-to-end content',
    latencyMs: 3,
  });

  const executorV2 = createNativeExecutorV2(legacy);
  const factLock = makeFactLock();
  const factLockHash = await hashFactLock(factLock);
  const envelope = makeEnvelope(factLock, factLockHash);
  const task = makeTask('task-1');

  const candidate = await executorV2(envelope, task);

  const params: ValidationParams = {
    expectedContextPacketHash: envelope.contextPacketHash,
    expectedFactLockHash: envelope.factLockHash,
    expectedTaskIds: new Set([task.id]),
    knownAttemptIds: new Set([envelope.attemptId]),
  };

  const result = validateExecutorResult(candidate, params);
  assert.equal(result.valid, true);
});
