// src/inference/rate-limited-nvidia.ts
// Rate-limited wrapper for NVIDIA NIM provider.
// Respects 40 RPM limit with token bucket + retry backoff.
//
// Usage:
//   const provider = new RateLimitedNvidiaProvider({
//     api_key: process.env.NVIDIA_API_KEY,
//     rpm_limit: 40,  // requests per minute
//     retry_max: 5,   // max retries on 429
//   });

import { NvidiaProvider } from './nvidia.js';
import type {
  InferenceRequest,
  InferenceResponse,
  InferenceError,
} from './types.js';

export interface RateLimitedConfig {
  api_key: string;
  base_url?: string;
  timeout_ms?: number;
  rpm_limit?: number;      // default: 40
  retry_max?: number;      // default: 5
  retry_base_ms?: number;  // default: 2000
  max_retry_ms?: number;   // default: 30000
  verbose?: boolean;       // log waits
}

/**
 * Token bucket rate limiter.
 * Allows bursts up to bucket size, then enforces steady rate.
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(rpm: number) {
    this.maxTokens = Math.ceil(rpm / 10); // burst: 10% of RPM
    this.tokens = this.maxTokens;
    this.refillRate = rpm / 60 / 1000; // tokens per ms
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Need to wait
    const needed = 1 - this.tokens;
    const waitMs = needed / this.refillRate;
    await sleep(waitMs);
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Rate-limited NVIDIA provider with automatic retry.
 *
 * Features:
 * - Token bucket rate limiting (default 40 RPM)
 * - Exponential backoff on 429/5xx errors
 * - Automatic retry with jitter
 * - Verbose logging of wait times
 */
export class RateLimitedNvidiaProvider {
  private provider: NvidiaProvider;
  private bucket: TokenBucket;
  private config: Required<Omit<RateLimitedConfig, 'api_key' | 'base_url'>> &
    Pick<RateLimitedConfig, 'api_key' | 'base_url'>;

  constructor(config: RateLimitedConfig) {
    this.provider = new NvidiaProvider({
      api_key: config.api_key,
      base_url: config.base_url,
      timeout_ms: config.timeout_ms,
    });

    this.config = {
      api_key: config.api_key,
      base_url: config.base_url,
      timeout_ms: config.timeout_ms ?? 60_000,
      rpm_limit: config.rpm_limit ?? 40,
      retry_max: config.retry_max ?? 5,
      retry_base_ms: config.retry_base_ms ?? 2000,
      max_retry_ms: config.max_retry_ms ?? 30000,
      verbose: config.verbose ?? true,
    };

    this.bucket = new TokenBucket(this.config.rpm_limit);
  }

  get id() {
    return 'nvidia-rate-limited' as const;
  }

  async complete(request: InferenceRequest): Promise<InferenceResponse> {
    await this.bucket.acquire();

    let lastError: any;
    for (let attempt = 0; attempt <= this.config.retry_max; attempt++) {
      try {
        if (attempt > 0 && this.config.verbose) {
          console.log(`   [retry ${attempt}/${this.config.retry_max}] Waiting before attempt...`);
        }

        return await this.provider.complete(request);
      } catch (err: any) {
        lastError = err;

        // Check if retryable (429 or 5xx)
        const isRetryable =
          err.status === 429 ||
          (err.status >= 500 && err.status < 600) ||
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT';

        if (!isRetryable || attempt === this.config.retry_max) {
          throw err;
        }

        // Exponential backoff with jitter
        const baseDelay = this.config.retry_base_ms * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delay = Math.min(baseDelay + jitter, this.config.max_retry_ms);

        if (this.config.verbose) {
          console.log(`   [rate-limit] ${err.status === 429 ? '429 Too Many Requests' : err.status || err.code}. Sleeping ${(delay / 1000).toFixed(1)}s...`);
        }

        await sleep(delay);

        // Re-acquire rate limit token after sleep
        await this.bucket.acquire();
      }
    }

    throw lastError;
  }

  async completeWithRetry(
    request: InferenceRequest,
    maxRetries?: number
  ): Promise<InferenceResponse> {
    // This provider already has built-in retry
    return this.complete(request);
  }

  async *completeStream(
    request: InferenceRequest
  ): AsyncGenerator<string, void, unknown> {
    await this.bucket.acquire();
    yield* this.provider.completeStream(request);
  }
}

/**
 * Create a rate-limited provider with sensible defaults.
 */
export function createRateLimitedProvider(
  apiKey: string,
  opts?: Omit<RateLimitedConfig, 'api_key'>
): RateLimitedNvidiaProvider {
  return new RateLimitedNvidiaProvider({
    api_key: apiKey,
    ...opts,
  });
}
