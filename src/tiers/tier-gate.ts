// ─── Witness Agents — Revenue Tier Gating ─────────────────────────────
// Issue #4: PRANAMAYA-002
// Tier-based access control, rate limiting, and Clifford gate enforcement

import type { Tier, CliffordLevel, Kosha } from '../types/interpretation.js';
import { TIER_RATE_LIMITS, TIER_MAX_CLIFFORD, TIER_MAX_KOSHA } from '../types/interpretation.js';
import type { SubscriptionTier } from '../types/engine.js';
import { SUPABASE_TIER_MAP } from '../types/engine.js';

// ═══════════════════════════════════════════════════════════════════════
// TIER GATE CHECK RESULT
// ═══════════════════════════════════════════════════════════════════════

export interface TierCheckResult {
  allowed: boolean;
  tier: Tier;
  reason?: string;
  remaining_quota?: number;
  max_clifford: CliffordLevel;
  max_kosha: Kosha;
  agents_mode: 'none' | 'single' | 'dyad' | 'dyad_mirror';
  upgrade_hint?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// RATE LIMITER — per-session sliding window
// ═══════════════════════════════════════════════════════════════════════

interface UsageWindow {
  timestamps: number[];   // epoch ms of each request
  tier: Tier;
}

export class RateLimiter {
  private windows = new Map<string, UsageWindow>();
  private windowMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Check if session can make another request
   */
  check(tier: Tier, sessionId: string): { allowed: boolean; remaining: number; resetMs: number } {
    const limit = TIER_RATE_LIMITS[tier];
    if (limit === Infinity) {
      return { allowed: true, remaining: Infinity, resetMs: 0 };
    }

    const window = this.getWindow(sessionId, tier);
    const now = Date.now();
    const cutoff = now - this.windowMs;

    // Prune old timestamps
    window.timestamps = window.timestamps.filter(t => t > cutoff);

    const remaining = limit - window.timestamps.length;
    const resetMs = window.timestamps.length > 0
      ? (window.timestamps[0] + this.windowMs) - now
      : 0;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      resetMs,
    };
  }

  /**
   * Record a usage event
   */
  record(tier: Tier, sessionId: string): void {
    const window = this.getWindow(sessionId, tier);
    window.timestamps.push(Date.now());
  }

  private getWindow(sessionId: string, tier: Tier): UsageWindow {
    if (!this.windows.has(sessionId)) {
      this.windows.set(sessionId, { timestamps: [], tier });
    }
    return this.windows.get(sessionId)!;
  }

  /**
   * Clear expired windows (call periodically)
   */
  cleanup(): number {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    let cleaned = 0;

    for (const [id, window] of this.windows) {
      window.timestamps = window.timestamps.filter(t => t > cutoff);
      if (window.timestamps.length === 0) {
        this.windows.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TIER GATE — combines all gating logic
// ═══════════════════════════════════════════════════════════════════════

export class TierGate {
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Full tier check — rate limit + capabilities
   */
  check(tier: Tier, sessionId: string): TierCheckResult {
    const rateCheck = this.rateLimiter.check(tier, sessionId);
    const maxClifford = TIER_MAX_CLIFFORD[tier];
    const maxKosha = TIER_MAX_KOSHA[tier];
    const agentsMode = this.getAgentsMode(tier);

    if (!rateCheck.allowed) {
      return {
        allowed: false,
        tier,
        reason: this.buildRateLimitMessage(tier, rateCheck.resetMs),
        remaining_quota: 0,
        max_clifford: maxClifford,
        max_kosha: maxKosha,
        agents_mode: agentsMode,
        upgrade_hint: this.getUpgradeHint(tier),
      };
    }

    return {
      allowed: true,
      tier,
      remaining_quota: rateCheck.remaining,
      max_clifford: maxClifford,
      max_kosha: maxKosha,
      agents_mode: agentsMode,
    };
  }

  /**
   * Record a usage event after successful processing
   */
  recordUsage(tier: Tier, sessionId: string): void {
    this.rateLimiter.record(tier, sessionId);
  }

  /**
   * Map Supabase tier to WitnessOS tier
   */
  static mapSupabaseTier(supabaseTier: SubscriptionTier): Tier {
    return SUPABASE_TIER_MAP[supabaseTier];
  }

  /**
   * Validate that a Clifford level is allowed for a tier
   */
  validateCliffordLevel(tier: Tier, requested: CliffordLevel): CliffordLevel {
    const max = TIER_MAX_CLIFFORD[tier];
    // Map to ordered values for comparison
    const order: CliffordLevel[] = [0, 1, 2, 3, 7];
    const maxIdx = order.indexOf(max);
    const reqIdx = order.indexOf(requested);
    return reqIdx <= maxIdx ? requested : max;
  }

  // ─── PRIVATE ──────────────────────────────────────────────────────

  private getAgentsMode(tier: Tier): TierCheckResult['agents_mode'] {
    switch (tier) {
      case 'free': return 'none';
      case 'subscriber': return 'single';
      case 'enterprise': return 'dyad';
      case 'initiate': return 'dyad_mirror';
    }
  }

  private buildRateLimitMessage(tier: Tier, resetMs: number): string {
    const hours = Math.ceil(resetMs / (1000 * 60 * 60));
    const limit = TIER_RATE_LIMITS[tier];

    switch (tier) {
      case 'free':
        return `You've used your ${limit} daily readings. ` +
          `The engines will be available again in ~${hours}h. ` +
          `Consider subscribing for deeper interpretation and more access.`;
      case 'subscriber':
        return `You've reached your ${limit} daily interpretations. ` +
          `Resets in ~${hours}h. Enterprise tier offers unlimited access.`;
      default:
        return `Rate limit reached. Resets in ~${hours}h.`;
    }
  }

  private getUpgradeHint(tier: Tier): string | undefined {
    switch (tier) {
      case 'free':
        return 'Upgrade to Subscriber for interpreted readings — the engines speak, but the dyad translates.';
      case 'subscriber':
        return 'Enterprise tier unlocks full dyad synthesis — both Aletheios and Pichet working together on every query.';
      default:
        return undefined;
    }
  }
}
