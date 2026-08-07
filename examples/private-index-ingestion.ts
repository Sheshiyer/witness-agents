/**
 * P3 Example: Private Index + Ingestion Pipeline
 *
 * Demonstrates the API shape for:
 * 1. Ingesting content into GroundedPassage[] via ExtractionProvider
 * 2. Adding passages to a per-subject private index via PrivateIndexManager
 * 3. Retrieving from the private index during orchestration
 *
 * All components are currently skeleton/noop implementations.
 * When real adapters are wired (vector store, NeMo extraction NIM), the same
 * consumer code works without modification (ports-and-adapters).
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

/**
 * Mock PrivateIndexManager that simulates a per-subject vector store.
 * In real usage: local vector DB (e.g. Chroma, Qdrant) or NeMo Retriever index.
 */
class MockPrivateIndexManager implements PrivateIndexManager {
  private store: Map<string, GroundedPassage[]> = new Map();
  private globalCorpus: GroundedPassage[] = [];

  async addPassages(subjectId: string, passages: GroundedPassage[], scope?: IndexScope): Promise<void> {
    console.log(`[MockIndex] Adding ${passages.length} passages for subject ${subjectId}`);

    // Add to subject's private index
    const existing = this.store.get(subjectId) || [];
    this.store.set(subjectId, [...existing, ...passages]);

    // Optionally add to global corpus
    if (scope?.includeGlobalCorpus) {
      console.log(`[MockIndex] Also adding to global corpus`);
      this.globalCorpus.push(...passages);
    }
  }

  async retrieve(query: RetrievalQuery & { scope?: IndexScope }): Promise<GroundedPassage[]> {
    console.log(`[MockIndex] Retrieving for subject ${query.subjectId}, perspective=${query.perspective}`);

    const results: GroundedPassage[] = [];

    // Retrieve from subject's private index
    const subjectPassages = this.store.get(query.subjectId) || [];
    results.push(...subjectPassages);

    // Optionally include global corpus
    if (query.scope?.includeGlobalCorpus) {
      console.log(`[MockIndex] Including global corpus`);
      results.push(...this.globalCorpus);
    }

    // Simulate reranking (in real usage: call reranker model)
    const reranked = results.map((p, i) => ({
      ...p,
      score: 0.95 - i * 0.05, // Decreasing scores for demo
    }));

    // Limit to maxPassages
    const limit = query.maxPassages ?? 5;
    return reranked.slice(0, limit);
  }
}

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
  const indexManager = new MockPrivateIndexManager();

  await indexManager.addPassages(lock.subjectId, passages, {
    subjectId: lock.subjectId,
    includeGlobalCorpus: false, // Private to this subject only
  });
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
