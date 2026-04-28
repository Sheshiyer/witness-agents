// ─── Daily Witness — Decoder Ring ──────────────────────────────────────
// Layer progression based on return frequency. Not a paywall — a practice wall.
// "The system succeeds when you no longer need it." — The Quine
//
// Layer 1: Raw mirror. Data. No interpretation. Free. Always.
// Layer 2: The witness question. Earned by returning (3+ visits) or paying.
// Layer 3: The meta-pattern. Earned by practice (7+ consecutive days).
//           This layer CANNOT be bought — only earned. The Quine demands it.
//
// After 14 consecutive days: The Finder's Gate whisper.
// After 30 consecutive days: Graduation.

import type {
  DecoderState,
  MirrorLayer,
  StandaloneEngineId,
  StandaloneTier,
} from './types.js';
import { DECODER_THRESHOLDS, STANDALONE_TIER_FEATURES } from './types.js';
import { createHash } from 'node:crypto';
import type { DecoderStateStore } from './decoder-store.js';
import { InMemoryDecoderStore } from './decoder-store.js';

// ═══════════════════════════════════════════════════════════════════════
// DECODER STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Module-level default store. Overridable via setDecoderStore().
 * Tests use in-memory (default); production uses Supabase.
 */
let activeStore: DecoderStateStore = new InMemoryDecoderStore();

/**
 * Sync in-memory cache — used by the sync API (getDecoderState/recordVisit).
 * Populated on first access and kept in sync with the async store.
 */
const syncCache = new Map<string, DecoderState>();

/** Replace the active store (call once at startup). */
export function setDecoderStore(store: DecoderStateStore): void {
  activeStore = store;
  syncCache.clear();
}

/** Get the active store (for DailyMirror to use directly). */
export function getDecoderStore(): DecoderStateStore {
  return activeStore;
}

/**
 * Hash birth data to create a privacy-safe user identifier.
 * No PII is stored — only the hash of their birth coordinates.
 */
export function hashBirthData(birthDate: string, birthTime?: string, lat?: number, lng?: number): string {
  const input = `${birthDate}|${birthTime || ''}|${lat || 0}|${lng || 0}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/** Fresh decoder state for a new user. */
function freshState(userHash: string): DecoderState {
  return {
    user_hash: userHash,
    total_visits: 0,
    consecutive_days: 0,
    last_visit: '',
    first_visit: '',
    max_layer_reached: 1,
    finder_gate_shown: false,
    graduation_shown: false,
    engines_most_viewed: {
      'biorhythm': 0,
      'vedic-clock': 0,
      'panchanga': 0,
      'numerology': 0,
    },
  };
}

/**
 * Get or create decoder state for a user (sync — uses local cache).
 * The cache is hydrated from the async store on first async access.
 */
export function getDecoderState(userHash: string): DecoderState {
  const existing = syncCache.get(userHash);
  if (existing) return existing;

  const state = freshState(userHash);
  syncCache.set(userHash, state);
  return state;
}

/**
 * Get decoder state asynchronously (works with any store, including Supabase).
 * Populates the sync cache for subsequent sync reads.
 */
export async function getDecoderStateAsync(userHash: string): Promise<DecoderState> {
  const existing = await activeStore.get(userHash);
  if (existing) {
    syncCache.set(userHash, existing);
    return existing;
  }
  const state = freshState(userHash);
  syncCache.set(userHash, state);
  return state;
}

/**
 * Record a visit and update decoder state (sync).
 * Persists to async store via fire-and-forget.
 */
export function recordVisit(
  userHash: string,
  engineViewed: StandaloneEngineId,
  today?: string,
): DecoderState {
  const state = getDecoderState(userHash);
  const updated = applyVisit(state, engineViewed, today);
  syncCache.set(userHash, updated);
  // Fire-and-forget persist to async store
  activeStore.set(userHash, updated).catch(err => {
    console.error(`[DecoderRing] Failed to persist state for ${userHash}:`, err);
  });
  return updated;
}

/**
 * Record a visit asynchronously (works with any store).
 */
export async function recordVisitAsync(
  userHash: string,
  engineViewed: StandaloneEngineId,
  today?: string,
): Promise<DecoderState> {
  const state = await getDecoderStateAsync(userHash);
  const updated = applyVisit(state, engineViewed, today);
  syncCache.set(userHash, updated);
  await activeStore.set(userHash, updated);
  return updated;
}

/**
 * Pure function: apply a visit to decoder state.
 */
function applyVisit(
  state: DecoderState,
  engineViewed: StandaloneEngineId,
  today?: string,
): DecoderState {
  const todayStr = today || new Date().toISOString().split('T')[0];
  
  // Don't double-count same-day visits for consecutive tracking
  if (state.last_visit !== todayStr) {
    state.total_visits++;
    
    // Check if yesterday was the last visit (consecutive)
    if (state.last_visit) {
      const lastDate = new Date(state.last_visit);
      const todayDate = new Date(todayStr);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      
      if (diffDays === 1) {
        state.consecutive_days++;
      } else if (diffDays > 1) {
        // Streak broken — but keep a grace period of 1 day
        // (life happens, the system should be compassionate)
        if (diffDays === 2) {
          // Grace: don't reset, just don't increment
        } else {
          state.consecutive_days = 1;
        }
      }
    } else {
      state.consecutive_days = 1;
    }
    
    if (!state.first_visit) {
      state.first_visit = todayStr;
    }
    state.last_visit = todayStr;
  }
  
  // Track engine view counts
  state.engines_most_viewed[engineViewed] =
    (state.engines_most_viewed[engineViewed] || 0) + 1;
  
  // Update max layer reached
  const maxLayer = computeMaxLayer(state);
  if (maxLayer > state.max_layer_reached) {
    state.max_layer_reached = maxLayer;
  }
  
  return state;
}

// ═══════════════════════════════════════════════════════════════════════
// LAYER COMPUTATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the maximum layer a user has access to.
 * 
 * Layer 1: Always available (raw data).
 * Layer 2: 3+ total visits OR 2+ consecutive days OR paid tier.
 * Layer 3: 7+ consecutive days. CANNOT be bought — only earned.
 */
export function computeMaxLayer(
  state: DecoderState,
  tier?: StandaloneTier,
): MirrorLayer {
  const features = tier ? STANDALONE_TIER_FEATURES[tier] : undefined;
  
  // Layer 3: earned through practice (7+ consecutive days)
  // Even paid users must earn this — the Quine demands it
  if (state.consecutive_days >= DECODER_THRESHOLDS.layer_3_consecutive) {
    return 3;
  }
  // Override: enterprise tier on full platform bypasses (but not standalone)
  if (features?.layer_3_immediate) {
    return 3;
  }
  
  // Layer 2: earned through return visits or paid
  if (features?.layer_2_immediate) {
    return 2;
  }
  if (state.total_visits >= DECODER_THRESHOLDS.layer_2_visits) {
    return 2;
  }
  if (state.consecutive_days >= DECODER_THRESHOLDS.layer_2_consecutive) {
    return 2;
  }
  
  // Layer 1: always available
  return 1;
}

/**
 * Check if the Finder's Gate whisper should be shown.
 * After 14 consecutive days: "There are twelve more mirrors. You've earned the map."
 */
export function shouldShowFindersGate(state: DecoderState): boolean {
  if (state.finder_gate_shown) return false;
  return state.consecutive_days >= DECODER_THRESHOLDS.finders_gate_days;
}

/**
 * Check if the Graduation note should be shown.
 * After 30 consecutive days: "You see the patterns without us now."
 */
export function shouldShowGraduation(state: DecoderState): boolean {
  if (state.graduation_shown) return false;
  return state.consecutive_days >= DECODER_THRESHOLDS.graduation_days;
}

/**
 * Mark Finder's Gate as shown (only shown once).
 */
export function markFindersGateShown(userHash: string): void {
  const state = getDecoderState(userHash);
  state.finder_gate_shown = true;
  activeStore.set(userHash, state).catch(err => {
    console.error(`[DecoderRing] Failed to persist finder gate for ${userHash}:`, err);
  });
}

/**
 * Mark Graduation as shown (only shown once).
 */
export function markGraduationShown(userHash: string): void {
  const state = getDecoderState(userHash);
  state.graduation_shown = true;
  activeStore.set(userHash, state).catch(err => {
    console.error(`[DecoderRing] Failed to persist graduation for ${userHash}:`, err);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// DECODER RING NARRATIVE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate the decoder ring's narrative wrapper for the current state.
 * This is the meta-text that frames the reading — not the reading itself.
 */
export function getDecoderNarrative(state: DecoderState): string | undefined {
  if (state.total_visits === 1) {
    return undefined; // First visit: silence. Let the data speak.
  }
  
  if (state.total_visits === 2) {
    return 'You returned. The mirror remembers.';
  }
  
  if (state.consecutive_days === DECODER_THRESHOLDS.layer_2_visits) {
    return 'A pattern is forming. Not in the data — in you.';
  }
  
  if (state.consecutive_days === DECODER_THRESHOLDS.layer_3_consecutive) {
    return 'Seven days of witnessing. The engines begin to speak to each other.';
  }
  
  if (shouldShowFindersGate(state)) {
    return 'There are twelve more mirrors. You\'ve earned the map.';
  }
  
  if (shouldShowGraduation(state)) {
    return 'You see the patterns without us now. The mirror was always yours.';
  }
  
  return undefined;
}

/**
 * Reset the state store (for testing).
 */
export function _resetStateStore(): void {
  activeStore = new InMemoryDecoderStore();
  syncCache.clear();
}
