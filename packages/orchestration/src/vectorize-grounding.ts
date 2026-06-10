/**
 * VectorizeGroundingProvider — Cloudflare Vectorize adapter for GroundingProvider.
 * Uses wrangler CLI to query the witness-wisdom-corpus Vectorize index.
 * Embeddings via any provider implementing EmbeddingProvider interface.
 *
 * Per backend-architecture-core: ports-and-adapters pattern.
 * Per research-knowledge-core: sourced-fact provenance on all retrieved passages.
 * Per ai-agents-meta-core: optional retrieval augmentation, not authority.
 */

import { execSync } from 'child_process';
import type {
  GroundingProvider,
  GroundedPassage,
  RetrievalQuery,
} from './grounding.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Minimal embedding result interface (duck-typed port).
 * Compatible with NvidiaEmbeddingProvider.embedWithRetry() return type.
 */
export interface EmbeddingResult {
  embedding: number[];
  index: number;
}

/**
 * Minimal embedding provider interface (duck-typed port).
 * Any provider implementing this interface can be used (e.g., NvidiaEmbeddingProvider).
 * Per backend-architecture-core: dependency inversion via interface.
 */
export interface EmbeddingProvider {
  /**
   * Embed texts with automatic retry on transient failures.
   * @param texts - Array of strings to embed
   * @param inputType - 'query' for search queries, 'passage' for documents
   * @returns Array of embedding results with vectors
   */
  embedWithRetry(texts: string[], inputType: 'query' | 'passage'): Promise<EmbeddingResult[]>;
}

export interface VectorizeGroundingConfig {
  /** Vectorize index name (e.g., 'witness-wisdom-corpus') */
  indexName: string;
  /** Optional namespace within the index (e.g., 'selemene-wisdom') */
  namespace?: string;
  /** Number of results to retrieve (default: 5) */
  topK?: number;
  /** Minimum relevance score threshold (default: 0.65) */
  minScore?: number;
  /** Embedding provider instance for query embedding */
  embeddingProvider: EmbeddingProvider;
}

/** Shape of a single match returned by wrangler vectorize query --json */
interface VectorizeMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/** Shape of wrangler vectorize query --json output */
interface VectorizeQueryResult {
  matches: VectorizeMatch[];
  count: number;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.65;

// ═══════════════════════════════════════════════════════════════════════
// VECTORIZE GROUNDING PROVIDER
// ═══════════════════════════════════════════════════════════════════════

export class VectorizeGroundingProvider implements GroundingProvider {
  private config: Required<Omit<VectorizeGroundingConfig, 'namespace'>> & Pick<VectorizeGroundingConfig, 'namespace'>;

  constructor(config: VectorizeGroundingConfig) {
    this.config = {
      indexName: config.indexName,
      namespace: config.namespace,
      topK: config.topK ?? DEFAULT_TOP_K,
      minScore: config.minScore ?? DEFAULT_MIN_SCORE,
      embeddingProvider: config.embeddingProvider,
    };
  }

  /**
   * Retrieve grounded passages from Vectorize index.
   *
   * 1. Build query string from facts + perspective
   * 2. Embed query using provided embedding provider (inputType: 'query')
   * 3. Call wrangler CLI to query Vectorize
   * 4. Filter by minScore threshold
   * 5. Transform to GroundedPassage[] with 'sourced-fact' provenance
   */
  async retrieve(query: RetrievalQuery): Promise<GroundedPassage[]> {
    // Build query string from facts + perspective
    const queryString = this.buildQueryString(query);
    if (!queryString.trim()) {
      return [];
    }

    // Embed the query (inputType: 'query' for search queries)
    const embedResult = await this.config.embeddingProvider.embedWithRetry(
      [queryString],
      'query'
    );

    if (embedResult.length === 0 || !embedResult[0]?.embedding) {
      console.warn('[VectorizeGroundingProvider] Empty embedding result');
      return [];
    }

    const vector = embedResult[0].embedding;

    // Query Vectorize via wrangler CLI
    const matches = this.queryVectorize(vector);

    // Filter by minScore threshold and transform to GroundedPassage[]
    return matches
      .filter(match => match.score >= this.config.minScore)
      .slice(0, query.maxPassages ?? this.config.topK)
      .map(match => this.toGroundedPassage(match));
  }

  /**
   * Estimate cost/latency for a retrieval query.
   * Vectorize queries are generally fast (<100ms) and free within quota.
   */
  async estimateCost(query: RetrievalQuery): Promise<{ latencyMs: number; tokens?: number; costUsd?: number }> {
    // Embedding cost: ~0.0001 USD per 1K tokens (NVIDIA NIM pricing varies)
    // Vectorize query: free within Cloudflare Workers quota
    const queryString = this.buildQueryString(query);
    const estimatedTokens = Math.ceil(queryString.length / 4); // rough estimate

    return {
      latencyMs: 150, // embedding (~100ms) + vectorize query (~50ms)
      tokens: estimatedTokens,
      costUsd: estimatedTokens * 0.0000001, // approximate
    };
  }

  /**
   * Build a query string from facts and perspective.
   * Combines relevant facts with the perspective for semantic search.
   */
  private buildQueryString(query: RetrievalQuery): string {
    const parts: string[] = [];

    // Add perspective as the primary search intent
    if (query.perspective) {
      parts.push(query.perspective);
    }

    // Add relevant facts as context
    if (query.facts && typeof query.facts === 'object') {
      for (const [key, value] of Object.entries(query.facts)) {
        if (value !== null && value !== undefined) {
          // Handle common fact keys meaningfully
          if (typeof value === 'object') {
            parts.push(`${key}: ${JSON.stringify(value)}`);
          } else {
            parts.push(`${key}: ${value}`);
          }
        }
      }
    }

    return parts.join(' | ');
  }

  /**
   * Query Vectorize index using wrangler CLI.
   * @param vector - Embedding vector (e.g., 1024 dimensions for bge-m3)
   * @returns Array of matches with scores and metadata
   */
  private queryVectorize(vector: number[]): VectorizeMatch[] {
    // Format vector as space-separated values for wrangler CLI
    const vectorArg = vector.join(' ');

    // Build wrangler command
    // Note: wrangler vectorize query does NOT support --json flag
    // Output contains JSON embedded after header lines
    let cmd = `wrangler vectorize query "${this.config.indexName}" --vector "${vectorArg}" --top-k ${this.config.topK} --return-metadata all`;

    // Add namespace if configured
    if (this.config.namespace) {
      cmd += ` --namespace "${this.config.namespace}"`;
    }

    try {
      // Execute wrangler CLI
      const output = execSync(cmd, {
        encoding: 'utf-8',
        timeout: 30_000, // 30 second timeout
        stdio: ['pipe', 'pipe', 'pipe'], // capture stdout/stderr
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
      });

      // Parse JSON from wrangler output (embedded after header lines)
      // Format: "⛅️ wrangler ...\n───...\n📋 Searching...\n{ JSON }"
      const result = this.parseWranglerOutput(output);
      return result?.matches || [];
    } catch (err: unknown) {
      // Log error but don't throw - grounding is optional
      const message = err instanceof Error ? err.message : String(err);
      console.error('[VectorizeGroundingProvider] Vectorize query failed:', message);
      return [];
    }
  }

  /**
   * Parse JSON from wrangler CLI output.
   * Wrangler outputs header lines followed by JSON result.
   */
  private parseWranglerOutput(output: string): VectorizeQueryResult | null {
    // Find the first '{' which starts the JSON
    const jsonStart = output.indexOf('{');
    if (jsonStart === -1) {
      console.warn('[VectorizeGroundingProvider] No JSON found in wrangler output');
      return null;
    }

    // Extract JSON portion (from first '{' to end)
    const jsonStr = output.slice(jsonStart);

    try {
      return JSON.parse(jsonStr) as VectorizeQueryResult;
    } catch (err) {
      console.warn('[VectorizeGroundingProvider] Failed to parse JSON from wrangler output:', err);
      return null;
    }
  }

  /**
   * Transform a Vectorize match into a GroundedPassage.
   */
  private toGroundedPassage(match: VectorizeMatch): GroundedPassage {
    const metadata = match.metadata || {};

    // Extract excerpt from metadata (expected field: 'text' or 'content' or 'excerpt')
    const excerpt = this.extractExcerpt(metadata);

    // Extract source from metadata (expected field: 'source' or construct from id)
    const source = this.extractSource(match.id, metadata);

    return {
      id: match.id,
      source,
      excerpt,
      score: match.score,
      provenance: 'sourced-fact',
      metadata,
    };
  }

  /**
   * Extract text excerpt from metadata.
   */
  private extractExcerpt(metadata: Record<string, unknown>): string {
    // Try common field names for text content
    for (const field of ['text', 'content', 'excerpt', 'passage', 'chunk']) {
      if (typeof metadata[field] === 'string' && metadata[field]) {
        return metadata[field] as string;
      }
    }

    // Fallback: serialize metadata if no text field found
    return JSON.stringify(metadata);
  }

  /**
   * Extract or construct source identifier.
   */
  private extractSource(id: string, metadata: Record<string, unknown>): string {
    // Use explicit source field if present
    if (typeof metadata['source'] === 'string' && metadata['source']) {
      return metadata['source'] as string;
    }

    // Construct from type/category/id pattern
    // e.g., "canonical:gene-keys:1:shadow"
    const type = metadata['type'] || metadata['category'] || 'corpus';
    const name = metadata['name'] || metadata['title'] || id;

    return `${type}:${name}`;
  }

  /**
   * Get the configured index name.
   */
  getIndexName(): string {
    return this.config.indexName;
  }

  /**
   * Get the configured namespace (if any).
   */
  getNamespace(): string | undefined {
    return this.config.namespace;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create a VectorizeGroundingProvider with the given configuration.
 *
 * @example
 * ```typescript
 * import { NvidiaEmbeddingProvider } from '../../../src/inference/nvidia-embedding.js';
 *
 * const embeddingProvider = new NvidiaEmbeddingProvider({
 *   api_key: process.env.NVIDIA_API_KEY!,
 * });
 *
 * const groundingProvider = createVectorizeGroundingProvider({
 *   indexName: 'witness-wisdom-corpus',
 *   namespace: 'selemene-wisdom',
 *   embeddingProvider,
 * });
 *
 * const passages = await groundingProvider.retrieve({
 *   subjectId: 'user-123',
 *   facts: { birthTime: '10:30', birthLocation: 'Mumbai' },
 *   perspective: 'Gene Keys Shadow exploration',
 *   taskId: 'task-456',
 * });
 * ```
 */
export function createVectorizeGroundingProvider(
  config: VectorizeGroundingConfig
): VectorizeGroundingProvider {
  return new VectorizeGroundingProvider(config);
}

/**
 * Create a VectorizeGroundingProvider with standard witness-wisdom-corpus configuration.
 * Convenience factory for the common case.
 */
export function createWitnessWisdomGroundingProvider(
  embeddingProvider: EmbeddingProvider,
  options?: {
    namespace?: string;
    topK?: number;
    minScore?: number;
  }
): VectorizeGroundingProvider {
  return new VectorizeGroundingProvider({
    indexName: 'witness-wisdom-corpus',
    namespace: options?.namespace ?? 'selemene-wisdom',
    topK: options?.topK,
    minScore: options?.minScore,
    embeddingProvider,
  });
}
