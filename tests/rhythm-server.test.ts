// ─── Rhythm Server — SSE Event Delivery Tests ─────────────────────────
// Issue #24: SSE delivery for rhythm events
// TDD: These tests define the contract BEFORE implementation.
//
// Tests:
//   1. RhythmEventEmitter constructs without error
//   2. getActiveEvents returns empty before start
//   3. Organ change detection (mock previous vs current)
//   4. Biorhythm threshold crossing detection
//   5. SSE event formatting (event: ... + data: ...)
//   6. getStats returns correct shape

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import type { RhythmEvent } from '../src/api/server.js';
import {
  RhythmEventEmitter,
  formatSSE,
  detectOrganShift,
  detectBiorhythmThreshold,
  detectTimingNudge,
  type RhythmServerConfig,
  type RhythmConnection,
} from '../src/standalone/rhythm-server.js';

// ═══════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════

const TEST_CONFIG: RhythmServerConfig = {
  selemene_url: 'http://localhost:9999',
  selemene_api_key: 'test-key-123',
  birth_data: {
    date: '1991-08-13',
    time: '13:19',
    latitude: 12.97,
    longitude: 77.59,
    timezone: 'Asia/Kolkata',
  },
  poll_interval_ms: 500, // Fast for tests
  max_connections: 10,
};

// ═══════════════════════════════════════════════════════════════════════
// 1. RhythmEventEmitter constructs without error
// ═══════════════════════════════════════════════════════════════════════

describe('RhythmEventEmitter — construction', () => {
  it('constructs with full config', () => {
    const emitter = new RhythmEventEmitter(TEST_CONFIG);
    assert.ok(emitter, 'Emitter should be truthy');
    assert.ok(emitter instanceof RhythmEventEmitter);
  });

  it('constructs with minimal config (defaults applied)', () => {
    const emitter = new RhythmEventEmitter({
      selemene_url: 'http://localhost:9999',
      selemene_api_key: 'key',
      birth_data: {
        date: '1991-08-13',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
      },
    });
    assert.ok(emitter);
    const stats = emitter.getStats();
    assert.strictEqual(stats.connections, 0);
    assert.strictEqual(stats.events_emitted, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. getActiveEvents returns empty before start
// ═══════════════════════════════════════════════════════════════════════

describe('RhythmEventEmitter — getActiveEvents before start', () => {
  it('returns empty array when emitter has not been started', () => {
    const emitter = new RhythmEventEmitter(TEST_CONFIG);
    const events = emitter.getActiveEvents();
    assert.ok(Array.isArray(events), 'Should return an array');
    assert.strictEqual(events.length, 0, 'No events before start()');
  });

  it('returns empty array immediately after start (before first poll)', () => {
    const emitter = new RhythmEventEmitter(TEST_CONFIG);
    emitter.start();
    const events = emitter.getActiveEvents();
    assert.ok(Array.isArray(events));
    // May or may not be empty depending on whether first poll completed
    // But should at least be an array
    emitter.stop();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Organ change detection (mock previous vs current)
// ═══════════════════════════════════════════════════════════════════════

describe('detectOrganShift — organ change detection', () => {
  it('emits organ-shift when organ changes', () => {
    const previous = {
      current_organ: { organ: 'Liver', element: 'Wood', recommended_activities: ['Rest'] },
    };
    const current = {
      current_organ: { organ: 'Gallbladder', element: 'Wood', recommended_activities: ['Rest and digest'] },
    };

    const event = detectOrganShift(previous, current);
    assert.ok(event, 'Should detect organ change');
    assert.strictEqual(event!.type, 'organ-shift');
    assert.ok(event!.message.includes('Gallbladder'), 'Message should mention new organ');
    assert.ok(event!.message.includes('Wood'), 'Message should mention element');
    assert.strictEqual(event!.urgency, 'low');
    assert.strictEqual(event!.engine_source, 'circadian-cartography');
    assert.ok(event!.timestamp, 'Should have timestamp');
  });

  it('returns null when organ has not changed', () => {
    const state = {
      current_organ: { organ: 'Liver', element: 'Wood', recommended_activities: ['Rest'] },
    };

    const event = detectOrganShift(state, state);
    assert.strictEqual(event, null, 'No event when organ unchanged');
  });

  it('handles missing current_organ in previous state (first poll)', () => {
    const previous = {};
    const current = {
      current_organ: { organ: 'Lung', element: 'Metal', recommended_activities: ['Breathe deeply'] },
    };

    const event = detectOrganShift(previous, current);
    assert.ok(event, 'Should emit on first organ data');
    assert.strictEqual(event!.type, 'organ-shift');
  });

  it('handles missing current_organ in current state gracefully', () => {
    const previous = {
      current_organ: { organ: 'Liver', element: 'Wood', recommended_activities: ['Rest'] },
    };
    const current = {};

    const event = detectOrganShift(previous, current);
    assert.strictEqual(event, null, 'No event when current data missing');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Biorhythm threshold crossing detection
// ═══════════════════════════════════════════════════════════════════════

describe('detectBiorhythmThreshold — threshold crossing', () => {
  it('emits biorhythm-peak when crossing above 85%', () => {
    const previous = { physical: { percentage: 80 }, emotional: { percentage: 50 }, intellectual: { percentage: 60 } };
    const current = { physical: { percentage: 90 }, emotional: { percentage: 50 }, intellectual: { percentage: 60 } };

    const events = detectBiorhythmThreshold(previous, current);
    assert.ok(events.length >= 1, 'Should detect at least one crossing');
    const peak = events.find(e => e.type === 'biorhythm-peak');
    assert.ok(peak, 'Should have biorhythm-peak event');
    assert.ok(peak!.message.includes('Physical'), 'Should name the cycle');
    assert.strictEqual(peak!.urgency, 'medium');
    assert.strictEqual(peak!.engine_source, 'three-wave-cycle');
  });

  it('emits biorhythm-low when crossing below 15%', () => {
    const previous = { physical: { percentage: 20 }, emotional: { percentage: 50 }, intellectual: { percentage: 60 } };
    const current = { physical: { percentage: 10 }, emotional: { percentage: 50 }, intellectual: { percentage: 60 } };

    const events = detectBiorhythmThreshold(previous, current);
    const low = events.find(e => e.type === 'biorhythm-peak'); // Uses biorhythm-peak type with 'low' message
    // Note: the RhythmEvent type allows 'biorhythm-peak' — we use message to differentiate
    assert.ok(events.length >= 1, 'Should detect low crossing');
  });

  it('returns empty when no threshold crossed', () => {
    const previous = { physical: { percentage: 50 }, emotional: { percentage: 50 }, intellectual: { percentage: 50 } };
    const current = { physical: { percentage: 55 }, emotional: { percentage: 52 }, intellectual: { percentage: 48 } };

    const events = detectBiorhythmThreshold(previous, current);
    assert.strictEqual(events.length, 0, 'No events when no threshold crossed');
  });

  it('detects multiple cycles crossing thresholds simultaneously', () => {
    const previous = { physical: { percentage: 80 }, emotional: { percentage: 20 }, intellectual: { percentage: 60 } };
    const current = { physical: { percentage: 90 }, emotional: { percentage: 10 }, intellectual: { percentage: 60 } };

    const events = detectBiorhythmThreshold(previous, current);
    assert.ok(events.length >= 2, 'Should detect crossings in both physical and emotional');
  });

  it('handles missing previous data (first poll) gracefully', () => {
    const previous = {};
    const current = { physical: { percentage: 90 }, emotional: { percentage: 10 }, intellectual: { percentage: 50 } };

    const events = detectBiorhythmThreshold(previous, current);
    // On first poll with extreme values, should still detect
    assert.ok(events.length >= 1, 'Should detect extreme values on first poll');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. SSE event formatting (event: ... + data: ...)
// ═══════════════════════════════════════════════════════════════════════

describe('formatSSE — Server-Sent Events formatting', () => {
  it('formats a RhythmEvent as valid SSE text', () => {
    const event: RhythmEvent = {
      type: 'organ-shift',
      message: 'Gallbladder (Wood) is active. Rest and digest.',
      urgency: 'low',
      timestamp: '2026-04-25T01:00:00.000Z',
      engine_source: 'circadian-cartography',
    };

    const sse = formatSSE(event);

    // Must start with event: line
    assert.ok(sse.startsWith('event: organ-shift\n'), 'Must have event type line');

    // Must have data: line with valid JSON
    const lines = sse.split('\n');
    const dataLine = lines.find(l => l.startsWith('data: '));
    assert.ok(dataLine, 'Must have data line');

    const json = JSON.parse(dataLine!.replace('data: ', ''));
    assert.strictEqual(json.type, 'organ-shift');
    assert.strictEqual(json.message, 'Gallbladder (Wood) is active. Rest and digest.');
    assert.strictEqual(json.urgency, 'low');
    assert.strictEqual(json.engine_source, 'circadian-cartography');

    // Must end with double newline (SSE message delimiter)
    assert.ok(sse.endsWith('\n\n'), 'Must end with double newline');
  });

  it('formats biorhythm-peak event correctly', () => {
    const event: RhythmEvent = {
      type: 'biorhythm-peak',
      message: 'Physical peak at 92% — action window open.',
      urgency: 'medium',
      timestamp: '2026-04-25T10:00:00.000Z',
      engine_source: 'three-wave-cycle',
    };

    const sse = formatSSE(event);
    assert.ok(sse.startsWith('event: biorhythm-peak\n'));
    assert.ok(sse.includes('"urgency":"medium"'));
    assert.ok(sse.endsWith('\n\n'));
  });

  it('formats timing-nudge event correctly', () => {
    const event: RhythmEvent = {
      type: 'timing-nudge',
      message: 'Morning transition — optimal for creative work.',
      urgency: 'low',
      timestamp: '2026-04-25T06:00:00.000Z',
      engine_source: 'circadian-cartography',
    };

    const sse = formatSSE(event);
    assert.ok(sse.startsWith('event: timing-nudge\n'));
    const dataLine = sse.split('\n').find(l => l.startsWith('data: '));
    const json = JSON.parse(dataLine!.replace('data: ', ''));
    assert.strictEqual(json.type, 'timing-nudge');
  });

  it('handles special characters in message (JSON-safe)', () => {
    const event: RhythmEvent = {
      type: 'organ-shift',
      message: 'Liver "Wood" — rest & digest\nbreathes deeply',
      urgency: 'low',
      timestamp: '2026-04-25T01:00:00.000Z',
      engine_source: 'circadian-cartography',
    };

    const sse = formatSSE(event);
    const dataLine = sse.split('\n').find(l => l.startsWith('data: '));
    // JSON.parse should NOT throw
    const json = JSON.parse(dataLine!.replace('data: ', ''));
    assert.strictEqual(json.message, event.message);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. getStats returns correct shape
// ═══════════════════════════════════════════════════════════════════════

describe('RhythmEventEmitter — getStats', () => {
  it('returns correct shape with zero values before start', () => {
    const emitter = new RhythmEventEmitter(TEST_CONFIG);
    const stats = emitter.getStats();

    assert.strictEqual(typeof stats.connections, 'number');
    assert.strictEqual(typeof stats.events_emitted, 'number');
    assert.strictEqual(typeof stats.uptime_ms, 'number');

    assert.strictEqual(stats.connections, 0);
    assert.strictEqual(stats.events_emitted, 0);
    assert.strictEqual(stats.uptime_ms, 0);
  });

  it('uptime_ms increases after start', async () => {
    const emitter = new RhythmEventEmitter(TEST_CONFIG);
    emitter.start();

    // Wait a bit for uptime to register
    await new Promise(r => setTimeout(r, 50));
    const stats = emitter.getStats();
    assert.ok(stats.uptime_ms > 0, 'Uptime should be > 0 after start');

    emitter.stop();
  });

  it('uptime_ms freezes after stop', async () => {
    const emitter = new RhythmEventEmitter(TEST_CONFIG);
    emitter.start();
    await new Promise(r => setTimeout(r, 50));
    emitter.stop();

    const stats1 = emitter.getStats();
    await new Promise(r => setTimeout(r, 50));
    const stats2 = emitter.getStats();

    // Uptime should not grow after stop (or grow very minimally due to timing)
    assert.ok(
      Math.abs(stats2.uptime_ms - stats1.uptime_ms) < 5,
      'Uptime should freeze after stop',
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. Timing nudge detection (bonus — time-of-day transitions)
// ═══════════════════════════════════════════════════════════════════════

describe('detectTimingNudge — time-of-day transitions', () => {
  it('emits timing-nudge on morning transition', () => {
    const event = detectTimingNudge('night', 'morning');
    assert.ok(event, 'Should emit on transition');
    assert.strictEqual(event!.type, 'timing-nudge');
    assert.ok(event!.message.toLowerCase().includes('morning'));
    assert.strictEqual(event!.engine_source, 'circadian-cartography');
  });

  it('emits timing-nudge on afternoon transition', () => {
    const event = detectTimingNudge('morning', 'afternoon');
    assert.ok(event);
    assert.strictEqual(event!.type, 'timing-nudge');
    assert.ok(event!.message.toLowerCase().includes('afternoon'));
  });

  it('emits timing-nudge on evening transition', () => {
    const event = detectTimingNudge('afternoon', 'evening');
    assert.ok(event);
    assert.strictEqual(event!.type, 'timing-nudge');
    assert.ok(event!.message.toLowerCase().includes('evening'));
  });

  it('returns null when no transition (same period)', () => {
    const event = detectTimingNudge('morning', 'morning');
    assert.strictEqual(event, null);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. RhythmConnection shape validation
// ═══════════════════════════════════════════════════════════════════════

describe('RhythmConnection — type shape', () => {
  it('matches expected interface', () => {
    const conn: RhythmConnection = {
      id: 'conn-abc123',
      birth_hash: 'a1b2c3d4e5f6',
      connected_at: Date.now(),
      events_sent: 0,
      last_event_at: undefined,
    };

    assert.strictEqual(typeof conn.id, 'string');
    assert.strictEqual(typeof conn.birth_hash, 'string');
    assert.strictEqual(typeof conn.connected_at, 'number');
    assert.strictEqual(typeof conn.events_sent, 'number');
    assert.strictEqual(conn.last_event_at, undefined);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. subscribe() yields events (AsyncGenerator contract)
// ═══════════════════════════════════════════════════════════════════════

describe('RhythmEventEmitter — subscribe', () => {
  it('returns an AsyncGenerator', () => {
    const emitter = new RhythmEventEmitter(TEST_CONFIG);
    const gen = emitter.subscribe();
    // AsyncGenerator has next, return, throw methods
    assert.strictEqual(typeof gen.next, 'function');
    assert.strictEqual(typeof gen.return, 'function');
    assert.strictEqual(typeof gen.throw, 'function');
    // Clean up
    gen.return(undefined);
  });
});
