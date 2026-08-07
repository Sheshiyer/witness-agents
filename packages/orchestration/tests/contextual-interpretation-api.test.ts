// packages/orchestration/tests/contextual-interpretation-api.test.ts
// Witness Task 6: TDD coverage for the contextual interpretation endpoint.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  handleContextualInterpretation,
  validateContextualInterpretationRequest,
  READING_NOT_FOUND_MESSAGE,
  RequestValidationError,
  type ContextualInterpretationDeps,
  type TrustedReadingRecord,
  type CallContext,
} from '../src/api/contextual-interpretation.js';
import { createContextualInterpretationEndpoint } from '../src/wiring/index.js';
import type { ExecutorV2 } from '../src/executor-v2.js';
import type { AtomicTaskDescriptorV1 } from '../src/execution-envelope.js';
import type { ProvenanceEnvelopeV1 } from '../src/provenance.js';

function makeRecord(overrides: Partial<TrustedReadingRecord> = {}): TrustedReadingRecord {
  return {
    readingId: 'reading-1',
    ownerId: 'owner-1',
    subjectRefs: ['subject-1'],
    consciousnessLevel: 3,
    defaultQuestion: 'What does this mean?',
    current: {
      sourceId: 'engine:panchanga:run-1',
      engineId: 'panchanga',
      engineVersion: '1.0.0',
      inputHash: 'input-hash-1',
      resultHash: 'result-hash-1',
      calculatedAt: '2026-07-28T00:00:00Z',
      payload: { tithi: 'Shukla Panchami' },
    },
    selectedHistory: [],
    temporalContext: [],
    groundedPassages: [
      {
        id: 'gp-1',
        source: 'engine:panchanga:run-1',
        excerpt: 'The tithi is Shukla Panchami.',
        score: 0.9,
        provenance: 'sourced-fact',
      },
    ],
    policy: {
      allowedSourceIds: ['engine:panchanga:run-1'],
      maxHistory: 5,
      maxBytes: 100000,
      allowRelationship: false,
      allowResearch: false,
    },
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ContextualInterpretationDeps> = {}): {
  deps: ContextualInterpretationDeps;
  executorCalls: number;
} {
  let executorCalls = 0;
  const records = new Map<string, TrustedReadingRecord>();
  records.set('reading-1', makeRecord());

  const readingRepo = overrides.readingRepo ?? {
    async getReading(readingId: string) {
      return records.get(readingId) ?? null;
    },
  };

  const grantChecker = overrides.grantChecker ?? {
    async hasActiveGrant() {
      return false;
    },
  };

  const taskDescriptorFactory = overrides.taskDescriptorFactory ?? {
    buildTaskDescriptor(): AtomicTaskDescriptorV1 {
      return {
        taskId: 'task-1',
        perspective: 'aletheios',
        dependsOn: [],
        targetTokens: 128,
        promptTemplateId: 'template-1',
        promptHash: 'prompt-hash-1',
      };
    },
  };

  const defaultExecutor: ExecutorV2 = async (envelope) => {
    executorCalls += 1;
    const output = 'model-produced content';
    const outputHash = await import('node:crypto').then((c) =>
      c.createHash('sha256').update(output).digest('hex'),
    );
    const provenance: ProvenanceEnvelopeV1 = {
      schemaVersion: 'noesis.provenance.v1',
      runId: envelope.runId,
      attemptId: envelope.attemptId,
      executor: 'native',
      adapterVersion: '1.0.0',
      contextPacketHash: envelope.contextPacketHash,
      factLockHash: envelope.factLockHash,
      promptTemplateId: envelope.task.promptTemplateId,
      promptHash: envelope.task.promptHash,
      modelCalls: [],
      toolCalls: [],
      claimRefs: [{ claimId: 'claim-1', sourceIds: ['engine:panchanga:run-1'] }],
      events: [
        {
          schemaVersion: 'noesis.event.v1',
          eventId: `${envelope.attemptId}-start`,
          runId: envelope.runId,
          attemptId: envelope.attemptId,
          taskId: envelope.task.taskId,
          type: 'start',
          timestamp: envelope.deadlineAt,
          payload: {},
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
      terminal: { reason: 'completed', outputHash },
    };
    return {
      runId: envelope.runId,
      attemptId: envelope.attemptId,
      contextPacketHash: envelope.contextPacketHash,
      factLockHash: envelope.factLockHash,
      task: { taskId: envelope.task.taskId, perspective: envelope.task.perspective },
      output,
      outputHash,
      provenance,
    };
  };

  const deps: ContextualInterpretationDeps = {
    readingRepo,
    grantChecker,
    executor: overrides.executor ?? defaultExecutor,
    taskDescriptorFactory,
    now: overrides.now ?? (() => '2026-07-28T00:00:00Z'),
    runIdFactory: overrides.runIdFactory ?? (() => 'run-1'),
    attemptIdFactory: overrides.attemptIdFactory ?? (() => 'attempt-1'),
  };

  return { deps, executorCalls: 0 };
}

const OWNER_CTX: CallContext = { ownerId: 'owner-1' };

// --- 1. Request validation ---

test('validateContextualInterpretationRequest accepts a well-formed request', () => {
  const req = validateContextualInterpretationRequest({
    readingId: 'reading-1',
    params: { depth: 'L0' },
  });
  assert.equal(req.readingId, 'reading-1');
  assert.equal(req.params.depth, 'L0');
});

test('validateContextualInterpretationRequest rejects unknown top-level fields', () => {
  assert.throws(
    () =>
      validateContextualInterpretationRequest({
        readingId: 'reading-1',
        params: { depth: 'L0' },
        extra: 'nope',
      }),
    RequestValidationError,
  );
});

test('validateContextualInterpretationRequest rejects unknown params fields', () => {
  assert.throws(
    () =>
      validateContextualInterpretationRequest({
        readingId: 'reading-1',
        params: { depth: 'L0', mystery: true },
      }),
    RequestValidationError,
  );
});

test('validateContextualInterpretationRequest rejects oversized readingId', () => {
  assert.throws(
    () =>
      validateContextualInterpretationRequest({
        readingId: 'x'.repeat(200),
        params: { depth: 'L0' },
      }),
    RequestValidationError,
  );
});

test('validateContextualInterpretationRequest rejects path-traversal-like readingId', () => {
  assert.throws(
    () =>
      validateContextualInterpretationRequest({
        readingId: '../../etc/passwd',
        params: { depth: 'L0' },
      }),
    RequestValidationError,
  );
});

test('validateContextualInterpretationRequest rejects wrong-typed depth', () => {
  assert.throws(
    () =>
      validateContextualInterpretationRequest({
        readingId: 'reading-1',
        params: { depth: 'nonsense' },
      }),
    RequestValidationError,
  );
});

test('validateContextualInterpretationRequest rejects oversized question', () => {
  assert.throws(
    () =>
      validateContextualInterpretationRequest({
        readingId: 'reading-1',
        params: { depth: 'L0', question: 'x'.repeat(3000) },
      }),
    RequestValidationError,
  );
});

// --- 2 & 3. Trusted lookup + fabricated facts rejected ---

test('reading facts come only from the injected repository, never the request body', async () => {
  const { deps } = makeDeps();
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L0' } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'complete');
  if (outcome.status === 'complete') {
    assert.ok(outcome.claims.some((c) => c.content.includes('Shukla Panchami')));
  }
});

test('a request body with calculation-looking fields is rejected outright', async () => {
  const { deps } = makeDeps();
  const outcome = await handleContextualInterpretation(
    {
      readingId: 'reading-1',
      params: { depth: 'L0' },
      current: { sourceId: 'fake', payload: { tithi: 'FABRICATED' } },
    },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'rejected');
  if (outcome.status === 'rejected') {
    assert.equal(outcome.code, 'invalid_request');
  }
});

test('a request body with a factLock-looking field is rejected outright', async () => {
  const { deps } = makeDeps();
  const outcome = await handleContextualInterpretation(
    {
      readingId: 'reading-1',
      params: { depth: 'L0' },
      factLock: { subjectId: 'x', subject: 'x', facts: {}, frozenAt: 'now', version: 'v1' },
    },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'rejected');
});

// --- 4. Owner isolation ---

test('cross-owner access and nonexistent reading produce identical error shape', async () => {
  const { deps } = makeDeps();
  const crossOwnerCtx: CallContext = { ownerId: 'owner-2' };

  const crossOwnerOutcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L0' } },
    crossOwnerCtx,
    deps,
  );
  const nonexistentOutcome = await handleContextualInterpretation(
    { readingId: 'no-such-reading', params: { depth: 'L0' } },
    OWNER_CTX,
    deps,
  );

  assert.deepEqual(crossOwnerOutcome, nonexistentOutcome);
  assert.equal(crossOwnerOutcome.status, 'rejected');
  if (crossOwnerOutcome.status === 'rejected') {
    assert.equal(crossOwnerOutcome.code, 'not_found');
    assert.equal(crossOwnerOutcome.message, READING_NOT_FOUND_MESSAGE);
  }
});

// --- 5. Claims reference allowed source ids ---

test('every returned claim references an allowed source id in the packet (L0)', async () => {
  const { deps } = makeDeps();
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L0' } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'complete');
  if (outcome.status === 'complete') {
    const allowed = new Set(outcome.allowedSourceIds);
    for (const claim of outcome.claims) {
      for (const sourceId of claim.sourceIds) {
        assert.ok(allowed.has(sourceId), `sourceId ${sourceId} should be allowed`);
      }
    }
  }
});

test('every returned claim references an allowed source id in the packet (L1)', async () => {
  const { deps } = makeDeps();
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L1' } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'complete');
  if (outcome.status === 'complete') {
    const allowed = new Set(outcome.allowedSourceIds);
    for (const claim of outcome.claims) {
      for (const sourceId of claim.sourceIds) {
        assert.ok(allowed.has(sourceId));
      }
    }
  }
});

test('L1 rejects when executor produces a claim referencing an unauthorized source', async () => {
  const badExecutor: ExecutorV2 = async (envelope) => {
    const output = 'bad content';
    const outputHash = (await import('node:crypto')).createHash('sha256').update(output).digest('hex');
    const provenance: ProvenanceEnvelopeV1 = {
      schemaVersion: 'noesis.provenance.v1',
      runId: envelope.runId,
      attemptId: envelope.attemptId,
      executor: 'native',
      adapterVersion: '1.0.0',
      contextPacketHash: envelope.contextPacketHash,
      factLockHash: envelope.factLockHash,
      promptTemplateId: envelope.task.promptTemplateId,
      promptHash: envelope.task.promptHash,
      modelCalls: [],
      toolCalls: [],
      claimRefs: [{ claimId: 'claim-bad', sourceIds: ['unauthorized:source'] }],
      events: [
        {
          schemaVersion: 'noesis.event.v1',
          eventId: `${envelope.attemptId}-start`,
          runId: envelope.runId,
          attemptId: envelope.attemptId,
          taskId: envelope.task.taskId,
          type: 'start',
          timestamp: envelope.deadlineAt,
          payload: {},
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
      terminal: { reason: 'completed', outputHash },
    };
    return {
      runId: envelope.runId,
      attemptId: envelope.attemptId,
      contextPacketHash: envelope.contextPacketHash,
      factLockHash: envelope.factLockHash,
      task: { taskId: envelope.task.taskId, perspective: envelope.task.perspective },
      output,
      outputHash,
      provenance,
    };
  };
  const { deps } = makeDeps({ executor: badExecutor });
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L1' } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'error');
});

// --- 6. L0 bypasses the executor entirely ---

test('L0 makes zero executor calls', async () => {
  let calls = 0;
  const spyExecutor: ExecutorV2 = async () => {
    calls += 1;
    throw new Error('executor should not be called for L0');
  };
  const { deps } = makeDeps({ executor: spyExecutor });
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L0' } },
    OWNER_CTX,
    deps,
  );
  assert.equal(calls, 0);
  assert.equal(outcome.status, 'complete');
});

test('L1 does call the injected executor', async () => {
  let calls = 0;
  const record = makeRecord();
  const deps = makeDeps().deps;
  const wrapped: ContextualInterpretationDeps = {
    ...deps,
    executor: async (envelope, task, context) => {
      calls += 1;
      return (deps.executor as ExecutorV2)(envelope, task, context);
    },
  };
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L1' } },
    OWNER_CTX,
    wrapped,
  );
  assert.equal(calls, 1);
  assert.equal(outcome.status, 'complete');
  void record;
});

// --- 7. Relationship/dyad fail-closed behavior ---

test('relationship context with active grant succeeds', async () => {
  const relationshipRecord = makeRecord({ relationshipRef: 'rel-1' });
  const { deps } = makeDeps({
    readingRepo: {
      async getReading(id: string) {
        return id === 'reading-1' ? relationshipRecord : null;
      },
    },
    grantChecker: {
      async hasActiveGrant(params) {
        return params.relationshipRef === 'rel-1' && params.ownerId === 'owner-1';
      },
    },
  });
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L0', includeRelationship: true } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'complete');
});

test('relationship context with no active grant fails closed', async () => {
  const relationshipRecord = makeRecord({ relationshipRef: 'rel-1' });
  const { deps } = makeDeps({
    readingRepo: {
      async getReading(id: string) {
        return id === 'reading-1' ? relationshipRecord : null;
      },
    },
    grantChecker: {
      async hasActiveGrant() {
        return false;
      },
    },
  });
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L0', includeRelationship: true } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'rejected');
  if (outcome.status === 'rejected') {
    assert.equal(outcome.code, 'relationship_grant_required');
  }
});

test('relationship context requested but reading has no relationshipRef fails closed', async () => {
  const { deps } = makeDeps(); // default record has no relationshipRef
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L0', includeRelationship: true } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'rejected');
  if (outcome.status === 'rejected') {
    assert.equal(outcome.code, 'relationship_grant_required');
  }
});

// --- 8. Terminal outcomes are explicit and distinct ---

test('executor throwing a timeout-flavored error yields a distinct timeout outcome', async () => {
  const timeoutExecutor: ExecutorV2 = async () => {
    throw new Error('operation timed out after 30s');
  };
  const { deps } = makeDeps({ executor: timeoutExecutor });
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L1' } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'timeout');
  assert.notEqual(outcome.status, 'complete');
});

test('executor throwing a cancellation-flavored error yields a distinct cancelled outcome', async () => {
  const cancelExecutor: ExecutorV2 = async () => {
    throw new Error('run was cancelled by caller');
  };
  const { deps } = makeDeps({ executor: cancelExecutor });
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L1' } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'cancelled');
  assert.notEqual(outcome.status, 'complete');
});

test('executor throwing a generic error yields a distinct error outcome, never complete', async () => {
  const errExecutor: ExecutorV2 = async () => {
    throw new Error('boom');
  };
  const { deps } = makeDeps({ executor: errExecutor });
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L1' } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'error');
  assert.notEqual(outcome.status, 'complete');
});

test('executor reporting an interrupted terminal provenance yields cancelled, not complete', async () => {
  const interruptedExecutor: ExecutorV2 = async (envelope) => {
    const output = 'partial content';
    const outputHash = (await import('node:crypto')).createHash('sha256').update(output).digest('hex');
    const provenance: ProvenanceEnvelopeV1 = {
      schemaVersion: 'noesis.provenance.v1',
      runId: envelope.runId,
      attemptId: envelope.attemptId,
      executor: 'native',
      adapterVersion: '1.0.0',
      contextPacketHash: envelope.contextPacketHash,
      factLockHash: envelope.factLockHash,
      promptTemplateId: envelope.task.promptTemplateId,
      promptHash: envelope.task.promptHash,
      modelCalls: [],
      toolCalls: [],
      claimRefs: [],
      events: [
        {
          schemaVersion: 'noesis.event.v1',
          eventId: `${envelope.attemptId}-start`,
          runId: envelope.runId,
          attemptId: envelope.attemptId,
          taskId: envelope.task.taskId,
          type: 'start',
          timestamp: envelope.deadlineAt,
          payload: {},
        },
        {
          schemaVersion: 'noesis.event.v1',
          eventId: `${envelope.attemptId}-interrupt`,
          runId: envelope.runId,
          attemptId: envelope.attemptId,
          taskId: envelope.task.taskId,
          type: 'interrupt',
          timestamp: envelope.deadlineAt,
          payload: { reason: 'user cancelled' },
        },
      ],
      terminal: { reason: 'interrupted' },
    };
    return {
      runId: envelope.runId,
      attemptId: envelope.attemptId,
      contextPacketHash: envelope.contextPacketHash,
      factLockHash: envelope.factLockHash,
      task: { taskId: envelope.task.taskId, perspective: envelope.task.perspective },
      output,
      outputHash,
      provenance,
    };
  };
  const { deps } = makeDeps({ executor: interruptedExecutor });
  const outcome = await handleContextualInterpretation(
    { readingId: 'reading-1', params: { depth: 'L1' } },
    OWNER_CTX,
    deps,
  );
  assert.equal(outcome.status, 'cancelled');
});

// --- Wiring composition ---

test('createContextualInterpretationEndpoint composes deps into a callable handler', async () => {
  const { deps } = makeDeps();
  const endpoint = createContextualInterpretationEndpoint(deps);
  const outcome = await endpoint({ readingId: 'reading-1', params: { depth: 'L0' } }, OWNER_CTX);
  assert.equal(outcome.status, 'complete');
});
