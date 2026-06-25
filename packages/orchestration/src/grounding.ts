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
    content?: string;
  }): Promise<GroundedPassage[]>;
}

export const NoopExtractionProvider: ExtractionProvider = {
  async extract(_params) {
    return [];
  },
};

/**
 * P3-W1: Factory for a NeMo Retriever extraction-backed provider.
 * The endpoint contract is intentionally small and adapter-friendly: POST JSON
 * with source/kind/subjectId/content and accept either { passages: [...] },
 * { results: [...] }, { text: "..." }, or a raw array.
 */
export function createNemoExtractionProvider(config: {
  endpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
} = {}): ExtractionProvider {
  if (!config.endpoint) return NoopExtractionProvider;

  return {
    async extract(params) {
      const response = await fetchWithTimeout(config.endpoint!, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(params),
      }, config.timeoutMs ?? 30_000);

      if (!response.ok) {
        throw new Error(`NeMo extraction failed: ${response.status} ${response.statusText}`);
      }

      const payload = await response.json() as unknown;
      return normalizeExtractionPayload(payload, params.source, params.subjectId);
    },
  };
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

export function createInMemoryPrivateIndexManager(): PrivateIndexManager {
  const subjectIndexes = new Map<string, GroundedPassage[]>();
  const globalIndex: GroundedPassage[] = [];

  return {
    async addPassages(subjectId, passages, scope = {}) {
      const subjectScoped = subjectIndexes.get(subjectId) ?? [];
      subjectScoped.push(...passages.map(p => ({
        ...p,
        metadata: { ...p.metadata, subjectId, scope: 'subject' },
      })));
      subjectIndexes.set(subjectId, subjectScoped);

      if (scope.includeGlobalCorpus) {
        globalIndex.push(...passages.map(p => ({
          ...p,
          metadata: { ...p.metadata, subjectId, scope: 'global' },
        })));
      }
    },
    async retrieve(query) {
      const includeGlobal = query.scope?.includeGlobalCorpus ?? false;
      const subjectId = query.scope?.subjectId ?? query.subjectId;
      const candidates = [
        ...(subjectIndexes.get(subjectId) ?? []),
        ...(includeGlobal ? globalIndex : []),
      ];
      const ranked = rankPassages(candidates, query)
        .filter(p => p.metadata?.scope === 'global' || p.metadata?.subjectId === subjectId);
      return ranked.slice(0, query.maxPassages ?? 6);
    },
  };
}

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
  indexManager?: PrivateIndexManager,
  scope: IndexScope = {},
): Promise<GroundedPassage[]> {
  const all: GroundedPassage[] = [];
  for (const s of sources) {
    const passages = await extractionProvider.extract({
      source: s.source,
      kind: s.kind,
      subjectId,
    });
    all.push(...passages);
    if (indexManager && passages.length > 0) {
      await indexManager.addPassages(subjectId, passages, scope);
    }
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

function normalizeExtractionPayload(payload: unknown, source: string, subjectId?: string): GroundedPassage[] {
  const raw = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.passages)
      ? payload.passages
      : isRecord(payload) && Array.isArray(payload.results)
        ? payload.results
        : isRecord(payload) && typeof payload.text === 'string'
          ? [{ excerpt: payload.text, metadata: payload.metadata }]
          : [];

  return raw.map((item, index) => {
    const record = isRecord(item) ? item : { excerpt: String(item) };
    const excerpt = typeof record.excerpt === 'string'
      ? record.excerpt
      : typeof record.text === 'string'
        ? record.text
        : JSON.stringify(record);
    return {
      id: typeof record.id === 'string' ? record.id : `${source}#${index + 1}`,
      source: typeof record.source === 'string' ? record.source : source,
      excerpt,
      score: typeof record.score === 'number' ? clampScore(record.score) : 1,
      provenance: 'sourced-fact',
      metadata: {
        ...(isRecord(record.metadata) ? record.metadata : {}),
        subjectId,
        extractionKind: record.kind,
      },
    };
  });
}

function rankPassages(passages: GroundedPassage[], query: RetrievalQuery): GroundedPassage[] {
  const terms = new Set(
    [
      query.perspective,
      query.taskId,
      ...Object.keys(query.facts || {}),
      ...Object.values(query.facts || {}).flatMap(value => {
        if (isRecord(value) && 'value' in value) return [String(value.value)];
        return [String(value)];
      }),
    ]
      .join(' ')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );

  return [...passages]
    .map((passage) => {
      const text = `${passage.source} ${passage.excerpt}`.toLowerCase();
      const matches = [...terms].filter(term => text.includes(term)).length;
      return {
        ...passage,
        score: clampScore(Math.max(passage.score, Math.min(1, 0.35 + matches * 0.1))),
      };
    })
    .sort((a, b) => b.score - a.score);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}
