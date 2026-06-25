/**
 * P3 Example: Private Index + Ingestion Pipeline
 *
 * Demonstrates the API shape for:
 * 1. Ingesting content into GroundedPassage[] via ExtractionProvider
 * 2. Adding passages to a per-subject private index via PrivateIndexManager
 * 3. Retrieving from the private index during orchestration
 *
 * The demo uses the built-in in-memory private index. Swap in a durable vector
 * store or NeMo Retriever index without changing consumer code.
 *
 * Run with:
 *   npx tsx examples/private-index-ingestion.ts
 */

import {
  createFactLock,
  ingestWitnessCorpus,
  type ExtractionProvider,
  type PrivateIndexManager,
  type GroundedPassage,
  type IndexScope,
  type RetrievalQuery,
  NoopExtractionProvider,
  NoopPrivateIndexManager,
  createInMemoryPrivateIndexManager,
} from '../src/wiring/index.js';

// --- Mock adapters (replace with real implementations later) ---

/**
 * Mock ExtractionProvider that simulates extracting content from sources.
 * In real usage: calls NeMo extraction NIM (OCR, table extraction, etc.)
 */
const mockExtractionProvider: ExtractionProvider = {
  async extract(params) {
    console.log(`[MockExtraction] Extracting from: ${params.source} (kind=${params.kind || 'auto'})`);

    // Simulate extracted passages
    return [
      {
        id: `extracted-${Date.now()}-1`,
        source: `user-notes:${params.source}`,
        excerpt: `Moon was analyzed as Kanya (Virgo) in prior session for subject ${params.subjectId}.`,
        score: 1.0, // extraction score (before reranking)
        provenance: 'sourced-fact' as const,
        metadata: { extractedAt: new Date().toISOString(), kind: params.kind },
      },
      {
        id: `extracted-${Date.now()}-2`,
        source: `user-notes:${params.source}`,
        excerpt: `Rahu Mahadasha period noted as significant for career transitions.`,
        score: 1.0,
        provenance: 'sourced-fact' as const,
        metadata: { extractedAt: new Date().toISOString(), kind: params.kind },
      },
    ];
  },
};

// --- Example usage ---

async function demonstratePrivateIndexIngestion() {
  console.log('=== P3 Private Index + Ingestion Demo ===\n');

  // 1. Create FactLock for subject
  const lock = createFactLock({
    subjectId: 'subject-demo-001',
    subject: 'Demo Subject',
    facts: {
      moonRashi: 'Kanya',
      lagna: 'Gemini',
      currentMahadasha: 'Rahu',
    },
  });

  console.log('FactLock created:', lock.subjectId);
  console.log('Locked facts:', Object.keys(lock.facts).join(', '));
  console.log();

  // 2. Ingest user content into GroundedPassage[]
  const sources = [
    { source: 'prior-reading-2024-01.md', kind: 'text' as const },
    { source: 'session-notes-2024-06.pdf', kind: 'pdf' as const },
  ];

  console.log('--- Ingestion Phase ---');
  const passages = await ingestWitnessCorpus(
    sources,
    lock.subjectId,
    mockExtractionProvider, // Replace with NoopExtractionProvider for skeleton-only
  );
  console.log(`Ingested ${passages.length} passages from ${sources.length} sources`);
  console.log();

  // 3. Add to private index
  console.log('--- Indexing Phase ---');
  const indexManager = createInMemoryPrivateIndexManager();

  await indexManager.addPassages(lock.subjectId, passages, {
    subjectId: lock.subjectId,
    includeGlobalCorpus: false, // Private to this subject only
  });
  console.log(`[InMemoryIndex] Added ${passages.length} passages for subject ${lock.subjectId}`);
  console.log();

  // 4. Retrieve during orchestration
  console.log('--- Retrieval Phase ---');
  const query: RetrievalQuery & { scope?: IndexScope } = {
    subjectId: lock.subjectId,
    facts: lock.facts,
    perspective: 'daily-witness',
    taskId: 'task-demo-001',
    maxPassages: 3,
    scope: {
      subjectId: lock.subjectId,
      includeGlobalCorpus: false,
    },
  };

  const retrieved = await indexManager.retrieve(query);
  console.log(`Retrieved ${retrieved.length} passages:`);
  for (const p of retrieved) {
    console.log(`  • [${p.source}] (score=${p.score.toFixed(2)}): ${p.excerpt.slice(0, 60)}...`);
  }
  console.log();

  // 5. Show how this integrates with grounding
  console.log('--- Integration Point ---');
  console.log('These passages would be passed to InProcessWitnessOrchestrationService via a');
  console.log('GroundingProvider that wraps the PrivateIndexManager.');
  console.log('The service then injects them into prompts via injectGroundedContext().');
  console.log();

  // Demonstrate noop fallback
  console.log('--- Noop Fallback Demo ---');
  const noopPassages = await ingestWitnessCorpus(sources, lock.subjectId, NoopExtractionProvider);
  console.log(`NoopExtractionProvider returns: ${noopPassages.length} passages (expected: 0)`);

  const noopResults = await NoopPrivateIndexManager.retrieve(query);
  console.log(`NoopPrivateIndexManager returns: ${noopResults.length} passages (expected: 0)`);
  console.log();

  console.log('=== Demo Complete ===');
}

// Run if executed directly
demonstratePrivateIndexIngestion().catch(console.error);
