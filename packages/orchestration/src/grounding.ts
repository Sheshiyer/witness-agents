/**
 * GroundingProvider port (ports-and-adapters, per backend-architecture-core).
 * Optional retrieval augmentation for Atomic Fact-Locked orchestration.
 * Default-deny / optional (per ai-agents-meta-core).
 * Retrieved material always labeled with provenance (per research-knowledge-core).
 * Keeps Euclidean runtime facts (FactLock) distinct from deeper witness (noesis).
 */

export interface GroundedPassage {
  id: string;
  source: string;           // e.g. "user-history:...", "selemene:panchanga", "canonical:gene-keys"
  excerpt: string;
  score: number;            // 0-1 relevance (from reranker or embedding)
  provenance: 'sourced-fact';
  metadata?: Record<string, unknown>;
}

export interface RetrievalQuery {
  subjectId: string;
  facts: Record<string, any>;
  perspective: string;
  taskId: string;
  maxPassages?: number;
}

export interface GroundingProvider {
  retrieve(query: RetrievalQuery): Promise<GroundedPassage[]>;
  estimateCost?(query: RetrievalQuery): Promise<{ latencyMs: number; tokens?: number; costUsd?: number }>;
}

export const NoopGroundingProvider: GroundingProvider = {
  async retrieve(_query: RetrievalQuery): Promise<GroundedPassage[]> {
    return [];
  },
};

/**
 * P3 skeleton: ExtractionProvider for ingesting structured content
 * (tables, charts, images, PDFs) via NeMo extraction NIMs (OCR, table extraction, object detection).
 * Passages produced here should carry rich metadata (e.g. { kind: 'table', page: 3 }).
 * This will be composed with / extend GroundingProvider in later waves.
 */
export interface ExtractionProvider {
  extract(params: {
    source: string; // url, file path, or buffer id
    kind?: 'pdf' | 'image' | 'text' | 'auto';
    subjectId?: string;
  }): Promise<GroundedPassage[]>;
}

export const NoopExtractionProvider: ExtractionProvider = {
  async extract(_params) {
    return [];
  },
};

/**
 * P3-W1 skeleton: Factory for a future NeMo Retriever extraction-backed provider.
 * When real endpoints + auth are available, this would:
 *   - Call the NeMo extraction NIM (OCR / table / layout) for the given source.
 *   - Convert results into GroundedPassage[] with rich metadata and 'sourced-fact' provenance.
 *   - Respect subjectId for scoping.
 *
 * For now: returns empty (same as Noop). Replace the body when the NIM client is ready.
 */
export function createNemoExtractionProvider(config: {
  endpoint?: string;
  apiKey?: string;
  // future: model id, timeout, etc.
} = {}): ExtractionProvider {
  // TODO (P3): implement actual call to NeMo extraction NIM
  // Example shape once real:
  // const response = await fetch(`${config.endpoint}/v1/extract`, { ... });
  // return response.passages.map(p => ({ id: ..., source: ..., excerpt: ..., score: 1.0, provenance: 'sourced-fact', metadata: p.metadata }));
  return NoopExtractionProvider;
}

/**
 * P3 skeleton: Private / per-subject index scoping hints.
 * RetrievalQuery can be extended with these in the future for privacy-first indexes.
 */
export interface IndexScope {
  subjectId?: string;
  includeGlobalCorpus?: boolean;
  // Future: namespace, collection, vectorStoreId, etc.
}

/**
 * P3-W2 skeleton: Minimal private per-subject index manager.
 * Goal (per plan): Support subject-specific or user-specific indexes (privacy-first, self-hosted NIM friendly).
 * Retrieval can be scoped to subject + optional global corpus.
 *
 * Current state: interface + noop implementation only. No real vector store yet.
 * This will be swapped for a real adapter (local vector DB, NeMo index, etc.) later.
 */
export interface PrivateIndexManager {
  /**
   * Add passages to the subject's private index (and optionally global).
   */
  addPassages(subjectId: string, passages: GroundedPassage[], scope?: IndexScope): Promise<void>;

  /**
   * Retrieve from the subject's index (plus global if requested).
   */
  retrieve(query: RetrievalQuery & { scope?: IndexScope }): Promise<GroundedPassage[]>;
}

export const NoopPrivateIndexManager: PrivateIndexManager = {
  async addPassages(_subjectId, _passages, _scope) {
    // no-op for skeleton
  },
  async retrieve(_query) {
    return [];
  },
};

/**
 * P3 skeleton: Optional streaming / async extension points for actor-model grounding.
 * Current implementation is request/response. Future actor/OTP or Durable Object backends
 * can implement the streaming variant for concurrent perspectives with supervision.
 *
 * ADR-003 (to be written) will document the migration path from InProcess to actor.
 */
export interface StreamingGroundingProvider extends GroundingProvider {
  retrieveStream?(query: RetrievalQuery): AsyncIterable<GroundedPassage>;
  // Future: cancel, subscribe to updates, supervision signals, etc.
}

/**
 * P3-W1 skeleton: Minimal corpus ingestion helper.
 * In real usage this would:
 *   1. Use ExtractionProvider on user notes / prior outputs / Selemene results.
 *   2. Turn extracted passages into GroundedPassage[] with provenance.
 *   3. Feed into a vector index (per-subject + global).
 *
 * For now: pure skeleton returning the combined passages (no real indexing yet).
 */
export async function ingestWitnessCorpus(
  sources: Array<{ source: string; kind?: 'pdf' | 'image' | 'text' | 'auto' }>,
  subjectId: string,
  extractionProvider: ExtractionProvider = NoopExtractionProvider,
): Promise<GroundedPassage[]> {
  const all: GroundedPassage[] = [];
  for (const s of sources) {
    const passages = await extractionProvider.extract({
      source: s.source,
      kind: s.kind,
      subjectId,
    });
    all.push(...passages);
  }
  return all;
}

/**
 * Standardized helper to render optional retrieved passages for injection into prompts.
 * Always placed AFTER the frozen FactLock in the system prompt.
 * Respects "sourced-fact" provenance and noesis stance (runtime mirrors, not authority).
 * Used by all graphs for consistency (P2-W2-SC-T15).
 */
export function injectGroundedContext(
  _lock: import('./types.js').FactLock,
  passages?: GroundedPassage[],
): string {
  if (!passages || passages.length === 0) return '';
  const lines: string[] = [];
  lines.push('--- Retrieved Context (sourced-fact provenance; resonance mirrors only — do not override locked facts) ---');
  for (const p of passages) {
    const cite = p.source ? ` [${p.source}]` : '';
    lines.push(`• ${p.excerpt.trim()}${cite} (relevance ${p.score.toFixed(2)})`);
  }
  lines.push('Use the above only as additional mirrors for depth. The Fact Lock above remains the sole source of truth for locked values.');
  return lines.join('\n');
}
