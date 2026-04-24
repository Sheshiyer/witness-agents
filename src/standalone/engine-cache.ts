// ─── Daily Witness — Smart Engine Cache ───────────────────────────────
// TTL-based in-memory cache for Selemene engine results.
// Numerology never changes. Biorhythm changes daily. Vedic-clock hourly.
//
// Cache key: engine_id + SHA(birth_data) + time_bucket
// This eliminates redundant Selemene API calls and cuts latency dramatically.

import type { SelemeneEngineOutput } from '../types/engine.js';
import type { StandaloneEngineId } from './types.js';
import { createHash } from 'node:crypto';

// ═══════════════════════════════════════════════════════════════════════
// TTL CONFIGURATION PER ENGINE
// ═══════════════════════════════════════════════════════════════════════

/** Cache TTL in seconds per engine */
export const ENGINE_TTL: Record<StandaloneEngineId, number> = {
  'numerology':  Infinity,   // Birth architecture never changes
  'biorhythm':   86_400,     // Changes daily (24h)
  'panchanga':   43_200,     // Changes ~twice daily (12h)
  'vedic-clock': 3_600,      // Changes every 2h organ cycle (cache 1h)
};

// ═══════════════════════════════════════════════════════════════════════
// CACHE TYPES
// ═══════════════════════════════════════════════════════════════════════

interface CacheEntry {
  output: SelemeneEngineOutput;
  cached_at: number;          // Unix timestamp ms
  ttl_ms: number;             // TTL in milliseconds
  birth_hash: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entries: number;
  hit_rate: number;
  saved_latency_ms: number;   // Estimated latency saved
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE CACHE
// ═══════════════════════════════════════════════════════════════════════

export class EngineCache {
  private store = new Map<string, CacheEntry>();
  private stats = { hits: 0, misses: 0, evictions: 0, saved_latency_ms: 0 };
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Get a cached engine result, or undefined if not cached/expired.
   */
  get(
    engineId: StandaloneEngineId,
    birthHash: string,
  ): SelemeneEngineOutput | undefined {
    const key = this.buildKey(engineId, birthHash);
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check TTL expiry
    if (entry.ttl_ms !== Infinity && Date.now() - entry.cached_at > entry.ttl_ms) {
      this.store.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    // Estimate ~300ms saved per cache hit (avg Selemene latency)
    this.stats.saved_latency_ms += 300;
    return entry.output;
  }

  /**
   * Store an engine result in the cache.
   */
  set(
    engineId: StandaloneEngineId,
    birthHash: string,
    output: SelemeneEngineOutput,
  ): void {
    const ttlSeconds = ENGINE_TTL[engineId];
    const ttlMs = ttlSeconds === Infinity ? Infinity : ttlSeconds * 1000;
    const key = this.buildKey(engineId, birthHash);

    // Evict oldest entries if at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evictOldest();
    }

    this.store.set(key, {
      output,
      cached_at: Date.now(),
      ttl_ms: ttlMs,
      birth_hash: birthHash,
    });
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      entries: this.store.size,
      hit_rate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Clear all entries (for testing).
   */
  clear(): void {
    this.store.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, saved_latency_ms: 0 };
  }

  /**
   * Hash birth data into a cache-safe key component.
   */
  static hashBirth(date: string, time?: string, lat?: number, lng?: number): string {
    const input = `${date}|${time || ''}|${lat || 0}|${lng || 0}`;
    return createHash('sha256').update(input).digest('hex').slice(0, 12);
  }

  // ─── Private ──────────────────────────────────────────────────────

  private buildKey(engineId: string, birthHash: string): string {
    // For time-sensitive engines, bucket by the relevant time unit
    const timeBucket = this.getTimeBucket(engineId as StandaloneEngineId);
    return `${engineId}:${birthHash}:${timeBucket}`;
  }

  private getTimeBucket(engineId: StandaloneEngineId): string {
    const now = new Date();
    switch (engineId) {
      case 'numerology':
        return 'forever'; // Never changes
      case 'biorhythm':
        return now.toISOString().split('T')[0]; // Daily bucket: YYYY-MM-DD
      case 'panchanga':
        // 12h buckets: morning (0-11) and afternoon (12-23)
        return `${now.toISOString().split('T')[0]}-${now.getHours() < 12 ? 'am' : 'pm'}`;
      case 'vedic-clock':
        // 1h buckets: YYYY-MM-DD-HH
        return `${now.toISOString().split('T')[0]}-${String(now.getHours()).padStart(2, '0')}`;
      default:
        return now.toISOString().split('T')[0];
    }
  }

  private evictOldest(): void {
    // Simple FIFO eviction — Map preserves insertion order
    const firstKey = this.store.keys().next().value;
    if (firstKey) {
      this.store.delete(firstKey);
      this.stats.evictions++;
    }
  }
}
