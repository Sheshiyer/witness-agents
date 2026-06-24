// ─── Witness Agents — NVIDIA NIM Embedding Provider ────────────────────
// Embedding inference via NVIDIA's hosted NIM platform using baai/bge-m3.
// Endpoint: https://integrate.api.nvidia.com/v1/embeddings
// Returns 1024-dimensional vectors, supports 8192 token context.

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface EmbeddingConfig {
  api_key: string;
  base_url?: string;
  timeout_ms?: number;
  model?: string;
}

export interface EmbeddingResult {
  embedding: number[];
  index: number;
}

export interface EmbeddingError {
  provider: 'nvidia';
  model: string;
  status: number;
  message: string;
  retryable: boolean;
}

export interface BatchEmbeddingItem {
  id: string;
  text: string;
}

export interface BatchEmbeddingResult {
  id: string;
  embedding: number[];
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const NVIDIA_EMBEDDING_BASE = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'baai/bge-m3';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BATCH_SIZE = 50;

// ═══════════════════════════════════════════════════════════════════════
// NVIDIA EMBEDDING PROVIDER
// ═══════════════════════════════════════════════════════════════════════

export class NvidiaEmbeddingProvider {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private model: string;

  constructor(config: EmbeddingConfig) {
    this.apiKey = config.api_key;
    this.baseUrl = config.base_url || NVIDIA_EMBEDDING_BASE;
    this.timeout = config.timeout_ms || DEFAULT_TIMEOUT_MS;
    this.model = config.model || DEFAULT_MODEL;
  }

  /**
   * Embed one or more texts using NVIDIA NIM.
   * @param texts - Array of strings to embed
   * @param inputType - 'query' for search queries, 'passage' for documents
   * @returns Array of embedding results with index positions
   */
  async embed(texts: string[], inputType: 'query' | 'passage'): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
          input_type: inputType,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        const err: EmbeddingError = {
          provider: 'nvidia',
          model: this.model,
          status: res.status,
          message: errBody || res.statusText,
          retryable: res.status === 429 || res.status >= 500,
        };
        throw err;
      }

      const data = await res.json() as {
        data: Array<{ embedding: number[]; index: number }>;
        usage?: { total_tokens: number };
      };

      return data.data.map(item => ({
        embedding: item.embedding,
        index: item.index,
      }));
    } catch (err: unknown) {
      // Handle abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutErr: EmbeddingError = {
          provider: 'nvidia',
          model: this.model,
          status: 408,
          message: `Request timed out after ${this.timeout}ms`,
          retryable: true,
        };
        throw timeoutErr;
      }
      // Re-throw EmbeddingError as-is
      if (isEmbeddingError(err)) {
        throw err;
      }
      // Wrap unexpected errors
      const unexpectedErr: EmbeddingError = {
        provider: 'nvidia',
        model: this.model,
        status: 0,
        message: err instanceof Error ? err.message : String(err),
        retryable: false,
      };
      throw unexpectedErr;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Embed with automatic retry on transient failures.
   * @param texts - Array of strings to embed
   * @param inputType - 'query' for search queries, 'passage' for documents
   * @param maxRetries - Maximum number of retry attempts (default: 2)
   * @returns Array of embedding results
   */
  async embedWithRetry(
    texts: string[],
    inputType: 'query' | 'passage',
    maxRetries = 2
  ): Promise<EmbeddingResult[]> {
    let lastError: EmbeddingError | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.embed(texts, inputType);
      } catch (err: unknown) {
        if (isEmbeddingError(err)) {
          lastError = err;
          if (!err.retryable || attempt === maxRetries) {
            throw err;
          }
          // Exponential backoff: 1s, 2s, 3s...
          await sleep(1000 * (attempt + 1));
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  }

  /**
   * Embed a batch of items with IDs, automatically chunking by batch size.
   * @param items - Array of { id, text } objects
   * @param inputType - 'query' for search queries, 'passage' for documents (default: 'passage')
   * @param batchSize - Number of texts per API request (default: 50)
   * @returns Array of { id, embedding } results
   */
  async embedBatch(
    items: BatchEmbeddingItem[],
    inputType: 'query' | 'passage' = 'passage',
    batchSize: number = DEFAULT_BATCH_SIZE
  ): Promise<BatchEmbeddingResult[]> {
    if (items.length === 0) {
      return [];
    }

    const results: BatchEmbeddingResult[] = [];

    // Process in chunks
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      const texts = chunk.map(item => item.text);

      const embeddings = await this.embedWithRetry(texts, inputType);

      // Map embeddings back to IDs using index
      for (const emb of embeddings) {
        const item = chunk[emb.index];
        if (item) {
          results.push({
            id: item.id,
            embedding: emb.embedding,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get the model being used for embeddings.
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get embedding dimension for the configured model.
   * baai/bge-m3 returns 1024-dimensional vectors.
   */
  getDimension(): number {
    // bge-m3 always returns 1024 dimensions
    if (this.model === 'baai/bge-m3') {
      return 1024;
    }
    // Default assumption for other models
    return 1024;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function isEmbeddingError(err: unknown): err is EmbeddingError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'provider' in err &&
    'model' in err &&
    'status' in err &&
    'message' in err &&
    'retryable' in err
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
