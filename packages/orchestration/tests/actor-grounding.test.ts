// packages/orchestration/tests/actor-grounding.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RetrievalWorkerActor,
  RetrievalActorPool,
  ActorGroundingProvider,
  ActorGroundingProviderStub,
  type PrivateIndexManager,
  type GroundedPassage,
  type RetrievalQuery,
} from '../src/index.js';

// Mock index manager for testing
const createMockIndexManager = (passages: GroundedPassage[]): PrivateIndexManager => ({
  async addPassages() {},
  async retrieve(_query) {
    return passages;
  },
});

const mockPassages: GroundedPassage[] = [
  {
    id: 'p1',
    source: 'user-history:test',
    excerpt: 'Moon is in Kanya (Virgo), analytical and detail-oriented.',
    score: 0.92,
    provenance: 'sourced-fact',
  },
  {
    id: 'p2',
    source: 'canonical:vedic',
    excerpt: 'Rahu Mahadasha brings transformation and unconventional paths.',
    score: 0.78,
    provenance: 'sourced-fact',
  },
  {
    id: 'p3',
    source: 'user-history:old',
    excerpt: 'Some less relevant context.',
    score: 0.55,
    provenance: 'sourced-fact',
  },
];

const mockQuery: RetrievalQuery = {
  subjectId: 'test-subject',
  facts: { moonRashi: 'Kanya' },
  perspective: 'aletheios',
  taskId: 'test-task',
  maxPassages: 5,
};

// --- RetrievalWorkerActor tests ---

test('RetrievalWorkerActor handles retrieve message', async () => {
  const indexManager = createMockIndexManager(mockPassages);
  const worker = new RetrievalWorkerActor('worker-test', indexManager);

  assert.equal(worker.status, 'idle');

  const reply = await worker.receive({
    tag: 'retrieve',
    query: mockQuery,
    replyTo: { id: 'caller' },
  });

  assert.equal(reply.tag, 'passages');
  if (reply.tag === 'passages') {
    assert.equal(reply.passages.length, 3);
  }

  assert.equal(worker.status, 'idle');
});

test('RetrievalWorkerActor handles shutdown', async () => {
  const worker = new RetrievalWorkerActor('worker-shutdown');

  const reply = await worker.receive({ tag: 'shutdown' });

  assert.equal(reply.tag, 'cancelled');
  assert.equal(worker.status, 'stopped');
});

test('RetrievalWorkerActor streams passages via receiveStream', async () => {
  const indexManager = createMockIndexManager(mockPassages);
  const worker = new RetrievalWorkerActor('worker-stream', indexManager);

  const received: GroundedPassage[] = [];
  for await (const passage of worker.receiveStream(mockQuery)) {
    received.push(passage);
  }

  assert.equal(received.length, 3);
  assert.equal(received[0].id, 'p1');
  assert.equal(worker.status, 'idle');
});

test('RetrievalWorkerActor handles supervision signals', () => {
  const worker = new RetrievalWorkerActor('worker-supervision');

  // Simulate crash
  worker.handleSupervision({ tag: 'escalate', error: new Error('Test crash') });
  assert.equal(worker.status, 'crashed');
  assert.equal(worker.getState().lastError, 'Test crash');

  // Resume
  worker.handleSupervision({ tag: 'resume' });
  assert.equal(worker.status, 'idle');

  // Restart
  worker.handleSupervision({ tag: 'restart', reason: 'manual restart' });
  assert.equal(worker.getState().restartCount, 1);
});

// --- RetrievalActorPool tests ---

test('RetrievalActorPool creates workers on demand', () => {
  const pool = new RetrievalActorPool();

  const worker1 = pool.getWorker('aletheios');
  const worker2 = pool.getWorker('pichet');
  const worker1Again = pool.getWorker('aletheios');

  assert.equal(worker1.id, 'worker-aletheios');
  assert.equal(worker2.id, 'worker-pichet');
  assert.strictEqual(worker1, worker1Again); // Same instance

  const status = pool.getPoolStatus();
  assert.equal(status.workers.length, 2);
});

test('RetrievalActorPool recreates crashed workers', () => {
  const pool = new RetrievalActorPool();

  const worker1 = pool.getWorker('aletheios');
  worker1.handleSupervision({ tag: 'escalate', error: new Error('crash') });
  assert.equal(worker1.status, 'crashed');

  const worker2 = pool.getWorker('aletheios');
  assert.notStrictEqual(worker1, worker2); // New instance
  assert.equal(worker2.status, 'idle');
});

test('RetrievalActorPool shuts down all workers', async () => {
  const pool = new RetrievalActorPool();

  pool.getWorker('aletheios');
  pool.getWorker('pichet');

  await pool.shutdown();

  const status = pool.getPoolStatus();
  assert.equal(status.workers.length, 0);
});

// --- ActorGroundingProvider tests ---

test('ActorGroundingProvider retrieves and filters by minRelevance', async () => {
  const indexManager = createMockIndexManager(mockPassages);
  const provider = new ActorGroundingProvider(indexManager, { minRelevance: 0.7 });

  const passages = await provider.retrieve(mockQuery);

  // Should filter out passage with score 0.55
  assert.equal(passages.length, 2);
  assert.ok(passages.every(p => p.score >= 0.7));
});

test('ActorGroundingProvider streams with minRelevance filter', async () => {
  const indexManager = createMockIndexManager(mockPassages);
  const provider = new ActorGroundingProvider(indexManager, { minRelevance: 0.7 });

  const received: GroundedPassage[] = [];
  for await (const passage of provider.retrieveStream(mockQuery)) {
    received.push(passage);
  }

  assert.equal(received.length, 2);
  assert.ok(received.every(p => p.score >= 0.7));
});

test('ActorGroundingProvider estimates cost', async () => {
  const provider = new ActorGroundingProvider();

  const estimate = await provider.estimateCost({ ...mockQuery, maxPassages: 10 });

  assert.ok(estimate.latencyMs > 0);
  assert.ok(estimate.tokens! > 0);
  assert.ok(estimate.costUsd! > 0);
});

test('ActorGroundingProvider exposes pool status', () => {
  const provider = new ActorGroundingProvider();

  // Trigger worker creation
  provider.retrieve(mockQuery);

  const status = provider.getPoolStatus();
  assert.ok(Array.isArray(status.workers));
});

test('ActorGroundingProvider shuts down cleanly', async () => {
  const provider = new ActorGroundingProvider();
  await provider.retrieve(mockQuery);

  await provider.shutdown();

  const status = provider.getPoolStatus();
  assert.equal(status.workers.length, 0);
});

// --- ActorGroundingProviderStub (legacy) tests ---

test('ActorGroundingProviderStub returns empty (noop)', async () => {
  const stub = new ActorGroundingProviderStub();

  const passages = await stub.retrieve(mockQuery);
  assert.equal(passages.length, 0);

  const streamed: GroundedPassage[] = [];
  for await (const p of stub.retrieveStream(mockQuery)) {
    streamed.push(p);
  }
  assert.equal(streamed.length, 0);

  const cost = await stub.estimateCost(mockQuery);
  assert.equal(cost.latencyMs, 0);
});
