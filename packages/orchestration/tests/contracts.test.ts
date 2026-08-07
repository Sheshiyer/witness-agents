// packages/orchestration/tests/contracts.test.ts
// Task 1 contract tests: context, execution, provenance, events (strict TDD).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalize,
  hashCanonical,
  hashString,
  validateContextPacket,
  validateExecutionEnvelope,
  validateProvenanceEnvelope,
  validateNoesisAgentEvent,
  contextPacketToFactLock,
  hashContextPacket,
  hashFactLock,
  hashExecutionEnvelope,
  hashProvenanceEnvelope,
  type ContextPacketV1,
  type ExecutionEnvelopeV1,
  type ProvenanceEnvelopeV1,
  type NoesisAgentEventV1,
  type FactLock,
} from '../src/index.js';

function makeValidPacket(): ContextPacketV1 {
  return {
    schemaVersion: 'noesis.context.v1',
    packetId: 'pkt-1',
    readingId: 'reading-1',
    ownerRef: 'owner-1',
    subjectRefs: ['subject-1'],
    relationshipRef: 'relationship-1',
    interpretationDepth: 3,
    consciousnessLevel: 4,
    question: 'What is the pattern?',
    current: {
      sourceId: 'engine:panchanga:run-42',
      engineId: 'panchanga',
      engineVersion: '1.0.0',
      inputHash: 'input-hash',
      resultHash: 'result-hash',
      calculatedAt: '2026-07-28T00:00:00Z',
      method: 'swiss-ephemeris',
      seed: 'seed-1',
      payload: { tithi: 'Shukla Panchami' },
    },
    selectedHistory: [
      {
        readingId: 'reading-0',
        sourceId: 'engine:panchanga:run-41',
        excerpt: 'Prior excerpt',
        excerptHash: 'excerpt-hash',
      },
    ],
    temporalContext: [
      {
        sourceId: 'transit:now',
        kind: 'transit',
        value: { moon: 'Kanya' },
        valueHash: 'value-hash',
      },
    ],
    groundedPassages: [
      {
        id: 'gp-1',
        source: 'canonical:gene-keys',
        excerpt: 'A passage',
        score: 0.91,
        provenance: 'sourced-fact',
      },
    ],
    policy: {
      allowedSourceIds: ['engine:panchanga:run-42'],
      maxHistory: 5,
      maxBytes: 8192,
      allowRelationship: true,
      allowResearch: true,
    },
    createdAt: '2026-07-28T00:00:00Z',
  };
}

function makeValidFactLock(): FactLock {
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

function makeValidTask(): ExecutionEnvelopeV1['task'] {
  return {
    taskId: 'task-1',
    perspective: 'aletheios',
    dependsOn: [],
    targetTokens: 256,
    temperature: 0.7,
    requiresGrounding: true,
    promptTemplateId: 'template-1',
    promptHash: 'prompt-hash',
    meta: { key: 'value' },
  };
}

function makeValidExecutionEnvelope(): ExecutionEnvelopeV1 {
  return {
    schemaVersion: 'noesis.execution.v1',
    runId: 'run-1',
    attemptId: 'attempt-1',
    idempotencyKey: 'idempotency-1',
    contextPacketHash: 'packet-hash',
    factLock: makeValidFactLock(),
    factLockHash: 'factlock-hash',
    task: makeValidTask(),
    priorOutputRefs: [],
    allowedTools: [],
    deadlineAt: '2026-07-28T00:01:00Z',
  };
}

function makeValidEvent(type: NoesisAgentEventV1['type'] = 'start'): NoesisAgentEventV1 {
  return {
    schemaVersion: 'noesis.event.v1',
    eventId: 'event-1',
    runId: 'run-1',
    attemptId: 'attempt-1',
    taskId: 'task-1',
    type,
    timestamp: '2026-07-28T00:00:00Z',
    payload: {},
  };
}

function makeValidProvenance(): ProvenanceEnvelopeV1 {
  return {
    schemaVersion: 'noesis.provenance.v1',
    runId: 'run-1',
    attemptId: 'attempt-1',
    executor: 'native',
    adapterVersion: '1.0.0',
    contextPacketHash: 'packet-hash',
    factLockHash: 'factlock-hash',
    promptTemplateId: 'template-1',
    promptHash: 'prompt-hash',
    modelCalls: [],
    toolCalls: [],
    claimRefs: [],
    events: [makeValidEvent('start'), makeValidEvent('end')],
    terminal: { reason: 'completed', outputHash: 'output-hash' },
  };
}

// --- Canonical serialization ---

test('canonicalize sorts object keys deterministically', () => {
  const a = { z: 1, a: { d: 2, b: 3 }, m: [9, 8, 7] };
  const b = { a: { b: 3, d: 2 }, m: [9, 8, 7], z: 1 };
  const ca = canonicalize(a);
  const cb = canonicalize(b);
  assert.equal(ca, cb);
  assert.ok(ca.includes('"a"'));
  assert.ok(ca.indexOf('"b"') < ca.indexOf('"d"'));
  assert.ok(ca.indexOf('"a"') < ca.indexOf('"m"'));
  assert.ok(ca.indexOf('"m"') < ca.indexOf('"z"'));
});

test('canonicalize preserves array order and handles primitives', () => {
  const value = { items: [3, 1, 2], flag: true, nil: null, num: 1.5, str: 'hello' };
  const canon = canonicalize(value);
  assert.equal(canon, '{"flag":true,"items":[3,1,2],"nil":null,"num":1.5,"str":"hello"}');
});

test('hashCanonical returns a 64-character hex SHA-256 digest', async () => {
  const hash = await hashCanonical(canonicalize({ a: 1 }));
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test('hashString returns a 64-character hex SHA-256 digest', async () => {
  const hash = await hashString('hello');
  assert.match(hash, /^[0-9a-f]{64}$/);
});

// --- Context packet ---

test('validateContextPacket accepts a valid packet', () => {
  const packet = makeValidPacket();
  const validated = validateContextPacket(packet);
  assert.equal(validated.schemaVersion, 'noesis.context.v1');
  assert.equal(validated.packetId, 'pkt-1');
});

test('validateContextPacket rejects wrong schemaVersion', () => {
  const packet = { ...makeValidPacket(), schemaVersion: 'noesis.context.v2' } as unknown;
  assert.throws(() => validateContextPacket(packet), /schemaVersion/);
});

test('validateContextPacket rejects missing required string fields', () => {
  for (const field of ['packetId', 'readingId', 'ownerRef', 'question', 'createdAt'] as const) {
    const packet = { ...makeValidPacket(), [field]: '' };
    assert.throws(() => validateContextPacket(packet), new RegExp(field));
  }
});

test('validateContextPacket rejects invalid interpretationDepth', () => {
  const packet = { ...makeValidPacket(), interpretationDepth: 6 };
  assert.throws(() => validateContextPacket(packet), /interpretationDepth/);
});

test('validateContextPacket rejects invalid consciousnessLevel', () => {
  const packet = { ...makeValidPacket(), consciousnessLevel: 0 };
  assert.throws(() => validateContextPacket(packet), /consciousnessLevel/);
});

test('validateContextPacket rejects missing current source fields', () => {
  const packet = { ...makeValidPacket() };
  packet.current = { ...packet.current, sourceId: '' };
  assert.throws(() => validateContextPacket(packet), /sourceId/);
});

test('hashContextPacket is byte-stable across repeated calls', async () => {
  const packet = makeValidPacket();
  const h1 = await hashContextPacket(packet);
  const h2 = await hashContextPacket(packet);
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test('contextPacketToFactLock produces a deterministic FactLock and does not mutate input', () => {
  const packet = makeValidPacket();
  const before = JSON.stringify(packet);
  const lock = contextPacketToFactLock(packet);
  assert.equal(lock.subjectId, packet.readingId);
  assert.ok(lock.facts[packet.current.sourceId]);
  assert.equal(lock.facts[packet.current.sourceId].source, packet.current.sourceId);
  assert.equal(lock.frozenAt, packet.createdAt);
  assert.equal(JSON.stringify(packet), before);
});

// --- Execution envelope ---

test('validateExecutionEnvelope accepts a valid envelope', () => {
  const envelope = makeValidExecutionEnvelope();
  const validated = validateExecutionEnvelope(envelope);
  assert.equal(validated.schemaVersion, 'noesis.execution.v1');
  assert.equal(validated.runId, 'run-1');
});

test('validateExecutionEnvelope rejects wrong schemaVersion', () => {
  const envelope = { ...makeValidExecutionEnvelope(), schemaVersion: 'noesis.execution.v0' } as unknown;
  assert.throws(() => validateExecutionEnvelope(envelope), /schemaVersion/);
});

test('validateExecutionEnvelope rejects missing envelope fields', () => {
  for (const field of ['runId', 'attemptId', 'idempotencyKey', 'contextPacketHash', 'factLockHash', 'deadlineAt'] as const) {
    const envelope = { ...makeValidExecutionEnvelope(), [field]: '' };
    assert.throws(() => validateExecutionEnvelope(envelope), new RegExp(field));
  }
});

test('validateExecutionEnvelope rejects invalid task fields', () => {
  const envelope = { ...makeValidExecutionEnvelope() };
  envelope.task = { ...envelope.task, taskId: '' };
  assert.throws(() => validateExecutionEnvelope(envelope), /taskId/);
});

test('hashExecutionEnvelope is byte-stable across repeated calls', async () => {
  const envelope = makeValidExecutionEnvelope();
  const h1 = await hashExecutionEnvelope(envelope);
  const h2 = await hashExecutionEnvelope(envelope);
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

// --- Provenance envelope ---

test('validateProvenanceEnvelope accepts a valid provenance envelope', () => {
  const provenance = makeValidProvenance();
  const validated = validateProvenanceEnvelope(provenance);
  assert.equal(validated.schemaVersion, 'noesis.provenance.v1');
  assert.equal(validated.terminal.reason, 'completed');
});

test('validateProvenanceEnvelope rejects wrong schemaVersion', () => {
  const provenance = { ...makeValidProvenance(), schemaVersion: 'noesis.provenance.v0' } as unknown;
  assert.throws(() => validateProvenanceEnvelope(provenance), /schemaVersion/);
});

test('validateProvenanceEnvelope rejects invalid terminal reason', () => {
  const provenance = { ...makeValidProvenance(), terminal: { reason: 'unknown' } } as unknown;
  assert.throws(() => validateProvenanceEnvelope(provenance), /terminal/);
});

test('validateProvenanceEnvelope rejects missing terminal event', () => {
  const provenance = { ...makeValidProvenance(), events: [makeValidEvent('start')] };
  assert.throws(() => validateProvenanceEnvelope(provenance), /terminal event/);
});

test('validateProvenanceEnvelope rejects multiple terminal events', () => {
  const provenance = { ...makeValidProvenance(), events: [makeValidEvent('end'), makeValidEvent('error')] };
  assert.throws(() => validateProvenanceEnvelope(provenance), /exactly one terminal/);
});

test('hashProvenanceEnvelope is byte-stable across repeated calls', async () => {
  const provenance = makeValidProvenance();
  const h1 = await hashProvenanceEnvelope(provenance);
  const h2 = await hashProvenanceEnvelope(provenance);
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

// --- Events ---

test('validateNoesisAgentEvent accepts a valid event', () => {
  const event = makeValidEvent();
  const validated = validateNoesisAgentEvent(event);
  assert.equal(validated.schemaVersion, 'noesis.event.v1');
  assert.equal(validated.type, 'start');
});

test('validateNoesisAgentEvent rejects wrong schemaVersion', () => {
  const event = { ...makeValidEvent(), schemaVersion: 'noesis.event.v0' } as unknown;
  assert.throws(() => validateNoesisAgentEvent(event), /schemaVersion/);
});

test('validateNoesisAgentEvent rejects invalid event type', () => {
  const event = { ...makeValidEvent(), type: 'boom' } as unknown;
  assert.throws(() => validateNoesisAgentEvent(event), /type/);
});

// --- Cross-cutting ---

test('validators do not mutate input objects', () => {
  const packet = makeValidPacket();
  const envelope = makeValidExecutionEnvelope();
  const provenance = makeValidProvenance();
  const event = makeValidEvent();

  const packetBefore = JSON.stringify(packet);
  const envelopeBefore = JSON.stringify(envelope);
  const provenanceBefore = JSON.stringify(provenance);
  const eventBefore = JSON.stringify(event);

  validateContextPacket(packet);
  validateExecutionEnvelope(envelope);
  validateProvenanceEnvelope(provenance);
  validateNoesisAgentEvent(event);

  assert.equal(JSON.stringify(packet), packetBefore);
  assert.equal(JSON.stringify(envelope), envelopeBefore);
  assert.equal(JSON.stringify(provenance), provenanceBefore);
  assert.equal(JSON.stringify(event), eventBefore);
});

test('hashFactLock is byte-stable across repeated calls', async () => {
  const lock = makeValidFactLock();
  const h1 = await hashFactLock(lock);
  const h2 = await hashFactLock(lock);
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test('canonical object-key ordering produces identical hashes regardless of insertion order', async () => {
  const packetA = makeValidPacket();
  const packetB = makeValidPacket();
  // Reverse order of current keys and policy keys in B
  packetB.current = Object.fromEntries(Object.entries(packetB.current).reverse()) as ContextPacketV1['current'];
  packetB.policy = Object.fromEntries(Object.entries(packetB.policy).reverse()) as ContextPacketV1['policy'];

  const h1 = await hashContextPacket(packetA);
  const h2 = await hashContextPacket(packetB);
  assert.equal(h1, h2);
});
