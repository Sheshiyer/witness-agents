// ─── Rhythm Server — SSE Event Delivery ───────────────────────────────
// Issue #24: Server-Sent Events for rhythm events
//
// Pushes real-time somatic rhythm events to connected clients:
//   - organ-shift:     vedic-clock organ transitions (2h cycle)
//   - biorhythm-peak:  biorhythm threshold crossings (>85% or <15%)
//   - timing-nudge:    time-of-day transitions (morning/afternoon/evening)
//
// Architecture:
//   RhythmEventEmitter polls Selemene at configurable intervals,
//   detects CHANGES (not absolute values), and yields events via
//   AsyncGenerator for SSE streaming. No WebSocket needed.

import type { BirthData } from '../types/engine.js';
import type { RhythmEvent } from '../api/server.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface RhythmServerConfig {
  selemene_url: string;
  selemene_api_key: string;
  birth_data: BirthData;
  poll_interval_ms?: number;      // Default: 120_000 (2 min)
  max_connections?: number;       // Default: 100
}

export interface RhythmConnection {
  id: string;
  birth_hash: string;
  connected_at: number;
  events_sent: number;
  last_event_at?: number;
}

type TimePeriod = 'night' | 'morning' | 'afternoon' | 'evening';

interface VedicClockResult {
  current_organ?: {
    organ: string;
    element: string;
    recommended_activities?: string[];
  };
}

interface BiorhythmResult {
  physical?: { percentage: number };
  emotional?: { percentage: number };
  intellectual?: { percentage: number };
}

// ═══════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS — Pure, testable change detectors
// ═══════════════════════════════════════════════════════════════════════

/**
 * Detect organ change between two vedic-clock poll results.
 * Returns RhythmEvent if organ changed, null otherwise.
 */
export function detectOrganShift(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
): RhythmEvent | null {
  const prev = previous?.current_organ as VedicClockResult['current_organ'] | undefined;
  const curr = current?.current_organ as VedicClockResult['current_organ'] | undefined;

  // No current data → nothing to report
  if (!curr) return null;

  // Same organ → no change
  if (prev && prev.organ === curr.organ) return null;

  // New organ detected (either first poll or actual change)
  const activity = curr.recommended_activities?.[0] || '';
  return {
    type: 'organ-shift',
    message: `${curr.organ} (${curr.element}) is active. ${activity}`.trim(),
    urgency: 'low',
    timestamp: new Date().toISOString(),
    engine_source: 'circadian-cartography',
  };
}

/**
 * Detect biorhythm threshold crossings between two polls.
 * Thresholds: >85% = peak, <15% = low.
 * Returns array of events (0-3, one per cycle).
 */
export function detectBiorhythmThreshold(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
): RhythmEvent[] {
  const events: RhythmEvent[] = [];
  const now = new Date().toISOString();
  const cycles = ['physical', 'emotional', 'intellectual'] as const;

  const HIGH_THRESHOLD = 85;
  const LOW_THRESHOLD = 15;

  for (const cycle of cycles) {
    const prevData = previous?.[cycle] as { percentage: number } | undefined;
    const currData = current?.[cycle] as { percentage: number } | undefined;

    if (!currData) continue;

    const prevPct = prevData?.percentage;
    const currPct = currData.percentage;

    // Crossed above HIGH_THRESHOLD
    const wasBelow = prevPct === undefined || prevPct <= HIGH_THRESHOLD;
    const isAbove = currPct > HIGH_THRESHOLD;

    if (wasBelow && isAbove) {
      events.push({
        type: 'biorhythm-peak',
        message: `${capitalize(cycle)} peak at ${Math.round(currPct)}% — action window open.`,
        urgency: 'medium',
        timestamp: now,
        engine_source: 'three-wave-cycle',
      });
    }

    // Crossed below LOW_THRESHOLD
    const wasAboveLow = prevPct === undefined || prevPct >= LOW_THRESHOLD;
    const isBelowLow = currPct < LOW_THRESHOLD;

    if (wasAboveLow && isBelowLow) {
      events.push({
        type: 'biorhythm-peak', // Reusing type per RhythmEvent union — message differentiates
        message: `${capitalize(cycle)} at ${Math.round(currPct)}% — rest and recover.`,
        urgency: 'medium',
        timestamp: now,
        engine_source: 'three-wave-cycle',
      });
    }
  }

  return events;
}

/**
 * Detect time-of-day transitions.
 * Returns event if period changed, null otherwise.
 */
export function detectTimingNudge(
  previousPeriod: TimePeriod | null,
  currentPeriod: TimePeriod,
): RhythmEvent | null {
  if (previousPeriod === currentPeriod) return null;

  const messages: Record<TimePeriod, string> = {
    morning: 'Morning transition — optimal for creative work and intention setting.',
    afternoon: 'Afternoon transition — shift to execution and focused tasks.',
    evening: 'Evening transition — wind down, reflect, restore.',
    night: 'Night transition — deep rest and unconscious integration.',
  };

  return {
    type: 'timing-nudge',
    message: messages[currentPeriod],
    urgency: 'low',
    timestamp: new Date().toISOString(),
    engine_source: 'circadian-cartography',
  };
}

/**
 * Format a RhythmEvent as a Server-Sent Events message.
 * Output: "event: <type>\ndata: <json>\n\n"
 */
export function formatSSE(event: RhythmEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Get current time period
// ═══════════════════════════════════════════════════════════════════════

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ═══════════════════════════════════════════════════════════════════════
// RHYTHM EVENT EMITTER
// ═══════════════════════════════════════════════════════════════════════

export class RhythmEventEmitter {
  private config: Required<RhythmServerConfig>;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private startedAt: number | null = null;
  private stoppedAt: number | null = null;
  private eventsEmitted = 0;
  private activeEvents: RhythmEvent[] = [];
  private subscribers = new Set<(event: RhythmEvent) => void>();

  // State tracking for change detection
  private previousVedicClock: Record<string, unknown> = {};
  private previousBiorhythm: Record<string, unknown> = {};
  private previousTimePeriod: TimePeriod | null = null;

  constructor(config: RhythmServerConfig) {
    this.config = {
      selemene_url: config.selemene_url,
      selemene_api_key: config.selemene_api_key,
      birth_data: config.birth_data,
      poll_interval_ms: config.poll_interval_ms ?? 120_000,
      max_connections: config.max_connections ?? 100,
    };
  }

  /**
   * Start polling Selemene engines at configured interval.
   */
  start(): void {
    if (this.pollTimer) return; // Already running
    this.startedAt = Date.now();
    this.stoppedAt = null;

    // First poll immediately
    this.poll().catch(() => { /* swallow — logged internally */ });

    // Then on interval
    this.pollTimer = setInterval(() => {
      this.poll().catch(() => { /* swallow */ });
    }, this.config.poll_interval_ms);
  }

  /**
   * Stop polling.
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.stoppedAt = Date.now();
  }

  /**
   * Get current active events without waiting.
   */
  getActiveEvents(): RhythmEvent[] {
    return [...this.activeEvents];
  }

  /**
   * Subscribe to events as they arrive (for SSE streaming).
   * Yields events until the generator is closed.
   */
  async *subscribe(): AsyncGenerator<RhythmEvent, void, unknown> {
    // Buffered channel pattern: resolve a promise each time an event arrives
    const queue: RhythmEvent[] = [];
    let resolve: (() => void) | null = null;
    let closed = false;

    const handler = (event: RhythmEvent) => {
      if (closed) return;
      queue.push(event);
      if (resolve) {
        resolve();
        resolve = null;
      }
    };

    this.subscribers.add(handler);

    try {
      while (!closed) {
        // Wait for events if queue is empty
        if (queue.length === 0) {
          await new Promise<void>(r => { resolve = r; });
        }

        // Drain all queued events
        while (queue.length > 0) {
          const event = queue.shift()!;
          yield event;
        }
      }
    } finally {
      closed = true;
      this.subscribers.delete(handler);
    }
  }

  /**
   * Get emitter statistics.
   */
  getStats(): { connections: number; events_emitted: number; uptime_ms: number } {
    let uptime_ms = 0;
    if (this.startedAt) {
      const end = this.stoppedAt ?? Date.now();
      uptime_ms = end - this.startedAt;
    }

    return {
      connections: this.subscribers.size,
      events_emitted: this.eventsEmitted,
      uptime_ms,
    };
  }

  // ─── Internal polling logic ──────────────────────────────────────────

  private async poll(): Promise<void> {
    const newEvents: RhythmEvent[] = [];

    // 1. Poll vedic-clock engine
    try {
      const vedicResult = await this.callSelemene('vedic-clock');
      const shift = detectOrganShift(this.previousVedicClock, vedicResult);
      if (shift) newEvents.push(shift);
      this.previousVedicClock = vedicResult;
    } catch {
      // Selemene down → skip this cycle, keep previous state
    }

    // 2. Poll biorhythm engine
    try {
      const bioResult = await this.callSelemene('biorhythm');
      const thresholds = detectBiorhythmThreshold(this.previousBiorhythm, bioResult);
      newEvents.push(...thresholds);
      this.previousBiorhythm = bioResult;
    } catch {
      // Skip
    }

    // 3. Check time-of-day transition
    const currentHour = new Date().getHours();
    const currentPeriod = getTimePeriod(currentHour);
    const nudge = detectTimingNudge(this.previousTimePeriod, currentPeriod);
    if (nudge) newEvents.push(nudge);
    this.previousTimePeriod = currentPeriod;

    // 4. Emit detected events
    if (newEvents.length > 0) {
      this.activeEvents = newEvents;
      this.eventsEmitted += newEvents.length;

      for (const event of newEvents) {
        for (const handler of this.subscribers) {
          handler(event);
        }
      }
    }
  }

  private async callSelemene(engineId: string): Promise<Record<string, unknown>> {
    const url = `${this.config.selemene_url}/api/engines/${engineId}/calculate`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.selemene_api_key}`,
      },
      body: JSON.stringify({
        birth_data: this.config.birth_data,
        current_time: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Selemene ${engineId} returned ${response.status}`);
    }

    const data = await response.json() as { result?: Record<string, unknown> };
    return data.result ?? {};
  }
}
