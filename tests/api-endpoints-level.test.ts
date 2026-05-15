// ─── P2.4 — API endpoint consciousness_level integration (#77) ─────────
// End-to-end check that the reading endpoints:
//   1. Accept optional consciousness_level: 1-5 in the payload
//   2. Resolve the effective level via the level-resolver
//   3. Return effective_consciousness_level + level_source + register_band
//   4. Honor the P2.5 gate (non-admin override → 403)
//
// Per design doc 2026-05-15-consciousness-level-register-design.md.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createStandaloneHandlers, _resetRateLimiter } from '../src/standalone/standalone-api.js';
import type { CallerIdentity } from '../src/types/reading-request.js';

// Use a minimal config — the handlers don't need real Selemene for the
// reading paths because mirror.generateReading() runs against stub data.
function mkHandlers(overrides: Partial<Parameters<typeof createStandaloneHandlers>[0]> = {}) {
  _resetRateLimiter();
  return createStandaloneHandlers({
    selemene_url: 'http://localhost:9999',  // never called in unit tests
    selemene_api_key: 'test',
    tier: 'witness-initiate',
    rate_limit_per_hour: 1000,
    ...overrides,
  });
}

const adminCaller: CallerIdentity = {
  caller_id: 'admin-1',
  caller_tier: 'initiate',
  caller_is_admin: false,  // initiate-tier is admin via the resolver
};

const freeCaller: CallerIdentity = {
  caller_id: 'free-1',
  caller_tier: 'free',
  caller_is_admin: false,
};

// ════════════════════════════════════════════════════════════════════════
// POST /reading — base endpoint
// ════════════════════════════════════════════════════════════════════════

describe('P2.4 — POST /reading', () => {
  it('no consciousness_level + no lookup → level_source: "default", level 1', async () => {
    const handlers = mkHandlers();
    const result = await handlers.reading(
      { birth_date: '1991-08-13', birth_time: '13:19' },
      'test-key-1',
      freeCaller,
    );
    assert.equal(result.status, 200);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.effective_consciousness_level, 1);
    assert.equal(body.level_source, 'default');
    assert.equal(body.register_band, 'l1_l3');
  });

  it('user_db_lookup returns 2 → level_source: "user_db", level 2', async () => {
    const handlers = mkHandlers({
      get_user_consciousness_level: (uid) => (uid === 'sub-user' ? 2 : undefined),
    });
    const result = await handlers.reading(
      { birth_date: '1991-08-13', user_id: 'sub-user' },
      'test-key-2',
      freeCaller,
    );
    assert.equal(result.status, 200);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.effective_consciousness_level, 2);
    assert.equal(body.level_source, 'user_db');
    assert.equal(body.register_band, 'l1_l3');
  });

  it('admin caller + consciousness_level: 3 → admin_override path, level 3, l1_l3 band', async () => {
    const handlers = mkHandlers();
    const result = await handlers.reading(
      { birth_date: '1991-08-13', consciousness_level: 3 },
      'test-key-3',
      adminCaller,
    );
    assert.equal(result.status, 200);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.effective_consciousness_level, 3);
    assert.equal(body.level_source, 'admin_override');
    assert.equal(body.register_band, 'l1_l3');
  });

  it('admin caller + consciousness_level: 5 → admin_override path, level 5, l4_l5 band', async () => {
    const handlers = mkHandlers();
    const result = await handlers.reading(
      { birth_date: '1991-08-13', consciousness_level: 5 },
      'test-key-4',
      adminCaller,
    );
    assert.equal(result.status, 200);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.effective_consciousness_level, 5);
    assert.equal(body.level_source, 'admin_override');
    assert.equal(body.register_band, 'l4_l5');
  });

  it('non-admin caller + consciousness_level: 5 → 403 FORBIDDEN_LEVEL_OVERRIDE', async () => {
    const handlers = mkHandlers();
    const result = await handlers.reading(
      { birth_date: '1991-08-13', consciousness_level: 5 },
      'test-key-5',
      freeCaller,
    );
    assert.equal(result.status, 403);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.code, 'FORBIDDEN_LEVEL_OVERRIDE');
  });

  it('invalid consciousness_level (out-of-range) → 400 INVALID_CONSCIOUSNESS_LEVEL', async () => {
    const handlers = mkHandlers();
    const result = await handlers.reading(
      { birth_date: '1991-08-13', consciousness_level: 7 },
      'test-key-6',
      adminCaller,
    );
    assert.equal(result.status, 400);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.code, 'INVALID_CONSCIOUSNESS_LEVEL');
  });

  it('regression: existing payload with no consciousness_level field still works', async () => {
    const handlers = mkHandlers();
    const result = await handlers.reading(
      { birth_date: '1991-08-13', birth_time: '13:19', latitude: 12.97, longitude: 77.59, timezone: 'Asia/Kolkata' },
      'test-key-7',
    );
    assert.equal(result.status, 200);
    const body = result.body as Record<string, unknown>;
    assert.ok(body.reading);
    assert.ok(body.next_reading_available);
  });
});

// ════════════════════════════════════════════════════════════════════════
// POST /reading/:engine_id
// ════════════════════════════════════════════════════════════════════════

describe('P2.4 — POST /reading/:engine_id', () => {
  // NOTE: The happy-path engine reading requires a live Selemene
  // endpoint (the per-engine generateEngineReading() hits the network).
  // The unit tests below cover the policy paths that don't require it:
  // 1) the P2.5 gate fires before the engine runs (403), and
  // 2) invalid engine IDs are rejected at the policy layer.

  it('non-admin override on per-engine endpoint → 403 (gate runs before engine)', async () => {
    const handlers = mkHandlers();
    const result = await handlers.engineReading(
      'biorhythm',
      { birth_date: '1991-08-13', consciousness_level: 4 },
      'engine-key-3',
      freeCaller,
    );
    assert.equal(result.status, 403);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.code, 'FORBIDDEN_LEVEL_OVERRIDE');
  });

  it('invalid engine + admin override → still rejected as INVALID_ENGINE (engine check runs first)', async () => {
    const handlers = mkHandlers();
    const result = await handlers.engineReading(
      'tarot',
      { birth_date: '1991-08-13', consciousness_level: 4 },
      'engine-key-4',
      adminCaller,
    );
    assert.equal(result.status, 400);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.code, 'INVALID_ENGINE');
  });
});

// ════════════════════════════════════════════════════════════════════════
// POST /reading/stream — SSE
// ════════════════════════════════════════════════════════════════════════

describe('P2.4 — POST /reading/stream', () => {
  it('emits a `level` SSE event with resolved meta before layer1', async () => {
    const handlers = mkHandlers();
    const events: string[] = [];
    for await (const ev of handlers.readingStream(
      { birth_date: '1991-08-13', consciousness_level: 2 },
      'stream-key-1',
      adminCaller,
    )) {
      events.push(ev);
    }
    const levelEvent = events.find((e) => e.startsWith('event: level\n'));
    assert.ok(levelEvent, 'expected a level event in the SSE stream');
    const payload = JSON.parse(levelEvent!.split('data: ')[1].trim());
    assert.equal(payload.effective_consciousness_level, 2);
    assert.equal(payload.level_source, 'admin_override');
    assert.equal(payload.register_band, 'l1_l3');
  });

  it('non-admin override on stream → emits SSE error event with FORBIDDEN_LEVEL_OVERRIDE', async () => {
    const handlers = mkHandlers();
    const events: string[] = [];
    for await (const ev of handlers.readingStream(
      { birth_date: '1991-08-13', consciousness_level: 5 },
      'stream-key-2',
      freeCaller,
    )) {
      events.push(ev);
    }
    const errorEvent = events.find((e) => e.startsWith('event: error\n'));
    assert.ok(errorEvent, 'expected an error event on the SSE stream');
    const payload = JSON.parse(errorEvent!.split('data: ')[1].trim());
    assert.equal(payload.code, 'FORBIDDEN_LEVEL_OVERRIDE');
  });
});
