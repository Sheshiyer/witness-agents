// ─── Decoder State Store — Persistence Abstraction ──────────────────
// Pluggable storage for decoder ring progression.
// In-memory for tests, Supabase for production.

import type { DecoderState, StandaloneEngineId } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// STORE INTERFACE
// ═══════════════════════════════════════════════════════════════════════

export interface DecoderStateStore {
  get(userHash: string): Promise<DecoderState | null>;
  set(userHash: string, state: DecoderState): Promise<void>;
  clear(): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════
// IN-MEMORY STORE (tests + fallback)
// ═══════════════════════════════════════════════════════════════════════

export class InMemoryDecoderStore implements DecoderStateStore {
  private store = new Map<string, DecoderState>();

  async get(userHash: string): Promise<DecoderState | null> {
    return this.store.get(userHash) ?? null;
  }

  async set(userHash: string, state: DecoderState): Promise<void> {
    this.store.set(userHash, state);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SUPABASE STORE (production)
// ═══════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class SupabaseDecoderStore implements DecoderStateStore {
  private client: SupabaseClient;
  private cache = new Map<string, DecoderState>();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async get(userHash: string): Promise<DecoderState | null> {
    // Check local cache first (hot path optimization)
    const cached = this.cache.get(userHash);
    if (cached) return cached;

    const { data, error } = await this.client
      .from('decoder_state')
      .select('*')
      .eq('user_hash', userHash)
      .single();

    if (error || !data) return null;

    const state: DecoderState = {
      user_hash: data.user_hash,
      total_visits: data.total_visits,
      consecutive_days: data.consecutive_days,
      last_visit: data.last_visit,
      first_visit: data.first_visit,
      max_layer_reached: data.max_layer_reached as 1 | 2 | 3,
      finder_gate_shown: data.finder_gate_shown,
      graduation_shown: data.graduation_shown,
      engines_most_viewed: (data.engines_most_viewed ?? {}) as Record<StandaloneEngineId, number>,
    };

    this.cache.set(userHash, state);
    return state;
  }

  async set(userHash: string, state: DecoderState): Promise<void> {
    this.cache.set(userHash, state);

    const { error } = await this.client
      .from('decoder_state')
      .upsert({
        user_hash: state.user_hash,
        total_visits: state.total_visits,
        consecutive_days: state.consecutive_days,
        last_visit: state.last_visit,
        first_visit: state.first_visit,
        max_layer_reached: state.max_layer_reached,
        finder_gate_shown: state.finder_gate_shown,
        graduation_shown: state.graduation_shown,
        engines_most_viewed: state.engines_most_viewed,
      }, { onConflict: 'user_hash' });

    if (error) {
      console.error(`[DecoderStore] Supabase upsert failed for ${userHash}:`, error.message);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════

export function createDecoderStore(): DecoderStateStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (url && key) {
    console.log('[DecoderStore] Using Supabase persistence');
    return new SupabaseDecoderStore(url, key);
  }

  console.log('[DecoderStore] Using in-memory store (no SUPABASE_URL configured)');
  return new InMemoryDecoderStore();
}
