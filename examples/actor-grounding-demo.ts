/**
 * P3-W3 Example: Actor-backed Streaming Grounding Provider
 *
 * Demonstrates the full actor model for supervised concurrent retrieval:
 * 1. RetrievalWorkerActor: per-perspective workers with message passing
 * 2. RetrievalActorPool: supervisor managing worker lifecycle
 * 3. ActorGroundingProvider: streaming retrieval with minRelevance filter
 *
 * The actor model provides:
 * - Concurrent retrieval across perspectives
 * - Supervision (restart on crash, escalate errors)
 * - Back-pressure (max concurrent queries)
 * - Streaming (yield passages as they arrive)
 * - Observability (pool status monitoring)
 *
 * Run with:
 *   npx tsx examples/actor-grounding-demo.ts
 */

import {
  createFactLock,
  ActorGroundingProvider,
  RetrievalWorkerActor,
  RetrievalActorPool,
  type PrivateIndexManager,
  type GroundedPassage,
  type RetrievalQuery,
} from '../src/wiring/index.js';

// --- Mock PrivateIndexManager (simulates per-subject vector store) ---

class MockPrivateIndexManager implements PrivateIndexManager {
  private passages: GroundedPassage[] = [
    {
      id: 'p1',
      source: 'user-history:daily-2024-05',
      excerpt: 'Moon in Kanya (Virgo) at 159.831° in Uttara Phalguni nakshatra.',
      score: 0.95,
      provenance: 'sourced-fact',
    },
    {
      id: 'p2',
      source: 'canonical:vedic-jyotish',
      excerpt: 'Kanya (Virgo) is ruled by Mercury, associated with analysis and discernment.',
      score: 0.88,
      provenance: 'sourced-fact',
    },
    {
      id: 'p3',
      source: 'user-history:session-2024-06',
      excerpt: 'Rahu Mahadasha period noted for unconventional career paths.',
      score: 0.82,
      provenance: 'sourced-fact',
    },
    {
      id: 'p4',
      source: 'global:gene-keys',
      excerpt: 'Gate 62 Shadow: Intellect. Gift: Precision. Siddhi: Impeccability.',
      score: 0.71,
      provenance: 'sourced-fact',
    },
    {
      id: 'p5',
      source: 'user-notes:old',
      excerpt: 'Some less relevant historical context from early sessions.',
      score: 0.55,
      provenance: 'sourced-fact',
    },
  ];

  async addPassages() {}

  async retrieve(query: RetrievalQuery) {
    // Simulate retrieval latency
    await new Promise(resolve => setTimeout(resolve, 50));

    // Return passages up to maxPassages
    const limit = query.maxPassages ?? 5;
    return this.passages.slice(0, limit);
  }
}

// --- Demo Functions ---

async function demonstrateWorkerActor() {
  console.log('=== RetrievalWorkerActor Demo ===\n');

  const indexManager = new MockPrivateIndexManager();
  const worker = new RetrievalWorkerActor('worker-aletheios', indexManager, {
    timeoutMs: 5000,
    maxConcurrentQueries: 3,
  });

  console.log(`Worker ID: ${worker.id}`);
  console.log(`Initial status: ${worker.status}`);

  // Send retrieve message
  const query: RetrievalQuery = {
    subjectId: 'demo-subject',
    facts: { moonRashi: 'Kanya' },
    perspective: 'aletheios',
    taskId: 'demo-task',
    maxPassages: 3,
  };

  console.log('\nSending retrieve message...');
  const reply = await worker.receive({
    tag: 'retrieve',
    query,
    replyTo: { id: 'demo-caller' },
  });

  if (reply.tag === 'passages') {
    console.log(`Received ${reply.passages.length} passages`);
    for (const p of reply.passages) {
      console.log(`  • [${p.source}] score=${p.score.toFixed(2)}`);
    }
  }

  console.log(`\nFinal status: ${worker.status}`);
  console.log(`State: ${JSON.stringify(worker.getState(), null, 2)}`);
}

async function demonstrateActorPool() {
  console.log('\n=== RetrievalActorPool Demo ===\n');

  const indexManager = new MockPrivateIndexManager();
  const pool = new RetrievalActorPool(indexManager);

  // Get workers for different perspectives
  const aletheios = pool.getWorker('aletheios');
  const pichet = pool.getWorker('pichet');
  const synthesis = pool.getWorker('synthesis');

  console.log('Created workers:');
  console.log(`  - ${aletheios.id} (status: ${aletheios.status})`);
  console.log(`  - ${pichet.id} (status: ${pichet.status})`);
  console.log(`  - ${synthesis.id} (status: ${synthesis.status})`);

  // Show pool status
  console.log('\nPool status:', JSON.stringify(pool.getPoolStatus(), null, 2));

  // Simulate crash and recovery
  console.log('\nSimulating crash of aletheios worker...');
  aletheios.handleSupervision({ tag: 'escalate', error: new Error('Simulated crash') });
  console.log(`  aletheios status after crash: ${aletheios.status}`);

  // Get worker again (should create new instance)
  const aletheiosNew = pool.getWorker('aletheios');
  console.log(`  New aletheios worker created: ${aletheiosNew.id} (status: ${aletheiosNew.status})`);

  // Shutdown
  console.log('\nShutting down pool...');
  await pool.shutdown();
  console.log('Pool status after shutdown:', JSON.stringify(pool.getPoolStatus(), null, 2));
}

async function demonstrateStreamingProvider() {
  console.log('\n=== ActorGroundingProvider Streaming Demo ===\n');

  const indexManager = new MockPrivateIndexManager();
  const provider = new ActorGroundingProvider(indexManager, {
    minRelevance: 0.7,
    actorConfig: { timeoutMs: 5000 },
  });

  const query: RetrievalQuery = {
    subjectId: 'demo-subject',
    facts: { moonRashi: 'Kanya', currentMahadasha: 'Rahu' },
    perspective: 'aletheios',
    taskId: 'streaming-demo',
    maxPassages: 5,
  };

  // Standard retrieve
  console.log('Standard retrieve (sync):');
  const passages = await provider.retrieve(query);
  console.log(`  Received ${passages.length} passages (filtered by minRelevance >= 0.7)`);

  // Streaming retrieve
  console.log('\nStreaming retrieve (async iterable):');
  let count = 0;
  for await (const passage of provider.retrieveStream(query)) {
    count++;
    console.log(`  [stream ${count}] ${passage.source} (score=${passage.score.toFixed(2)})`);
  }
  console.log(`  Total streamed: ${count} passages`);

  // Cost estimate
  console.log('\nCost estimate for query:');
  const cost = await provider.estimateCost(query);
  console.log(`  Estimated latency: ${cost.latencyMs}ms`);
  console.log(`  Estimated tokens: ${cost.tokens}`);
  console.log(`  Estimated cost: $${cost.costUsd?.toFixed(4)}`);

  // Pool status
  console.log('\nProvider pool status:', JSON.stringify(provider.getPoolStatus(), null, 2));

  // Cleanup
  await provider.shutdown();
}

async function demonstrateIntegrationWithFactLock() {
  console.log('\n=== Integration with FactLock Demo ===\n');

  // Create FactLock
  const lock = createFactLock({
    subjectId: 'demo-subject-001',
    subject: 'Demo Subject',
    facts: {
      moonRashi: 'Kanya',
      lagna: 'Gemini',
      currentMahadasha: 'Rahu',
    },
  });

  console.log('FactLock created:');
  console.log(`  Subject: ${lock.subject}`);
  console.log(`  Locked facts: ${Object.keys(lock.facts).join(', ')}`);

  // Create provider
  const indexManager = new MockPrivateIndexManager();
  const provider = new ActorGroundingProvider(indexManager, { minRelevance: 0.65 });

  // Retrieve grounding for this subject
  const query: RetrievalQuery = {
    subjectId: lock.subjectId,
    facts: lock.facts,
    perspective: 'daily-witness',
    taskId: 'integration-demo',
    maxPassages: 4,
  };

  console.log('\nRetrieving grounding passages...');
  const passages = await provider.retrieve(query);

  console.log(`\nRetrieved ${passages.length} passages for grounding:`);
  for (const p of passages) {
    console.log(`  • [${p.source}]`);
    console.log(`    ${p.excerpt.slice(0, 60)}...`);
    console.log(`    (score=${p.score.toFixed(2)}, provenance=${p.provenance})`);
  }

  console.log('\nThese passages would be injected into the prompt via injectGroundedContext()');
  console.log('AFTER the FactLock block, as supporting mirrors (not overriding locked facts).');

  await provider.shutdown();
}

// --- Main ---

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  P3-W3: Actor-backed Streaming Grounding Provider Demo     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await demonstrateWorkerActor();
  await demonstrateActorPool();
  await demonstrateStreamingProvider();
  await demonstrateIntegrationWithFactLock();

  console.log('\n=== Demo Complete ===');
}

main().catch(console.error);
