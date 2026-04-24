// ─── Observability Module Tests ─────────────────────────────────────────
// TDD: RED phase — these tests define the contract for WitnessObserver.
// All 10 test cases per the spec.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  WitnessObserver,
  type LogLevel,
  type StructuredLog,
  type EngineMetrics,
  type CostMetrics,
  type FunnelMetrics,
} from '../src/standalone/observability.js';

describe('WitnessObserver', () => {
  let observer: WitnessObserver;

  beforeEach(() => {
    observer = new WitnessObserver();
  });

  // ─── Test 1: Constructor with defaults ──────────────────────────────

  it('constructs with defaults (info level, console sink)', () => {
    const obs = new WitnessObserver();
    // Should not throw, level defaults to 'info'
    assert.ok(obs, 'Observer should be created');
    // Verify it can log without errors
    obs.info('test.construct', { metadata: { hello: 'world' } });
  });

  // ─── Test 2: Custom sink receives structured logs ──────────────────

  it('custom sink receives structured logs', () => {
    const captured: StructuredLog[] = [];
    const obs = new WitnessObserver({
      sink: (log) => captured.push(log),
    });

    obs.info('test.event', { engine_id: 'biorhythm', duration_ms: 42 });

    assert.equal(captured.length, 1, 'Sink should receive exactly one log');
    const log = captured[0];
    assert.equal(log.level, 'info');
    assert.equal(log.event, 'test.event');
    assert.equal(log.engine_id, 'biorhythm');
    assert.equal(log.duration_ms, 42);
    assert.ok(log.timestamp, 'Should have ISO timestamp');
    // Validate timestamp is valid ISO
    assert.ok(!isNaN(Date.parse(log.timestamp)), 'Timestamp should be valid ISO');
  });

  // ─── Test 3: Log level filtering ───────────────────────────────────

  it('log level filtering works (debug not emitted at info level)', () => {
    const captured: StructuredLog[] = [];
    const obs = new WitnessObserver({
      level: 'info',
      sink: (log) => captured.push(log),
    });

    obs.debug('should.not.appear');
    obs.info('should.appear');
    obs.warn('should.also.appear');
    obs.error('should.also.appear.too');

    assert.equal(captured.length, 3, 'Debug should be filtered out at info level');
    assert.deepEqual(
      captured.map((l) => l.level),
      ['info', 'warn', 'error'],
    );
  });

  it('log level filtering allows debug when level is debug', () => {
    const captured: StructuredLog[] = [];
    const obs = new WitnessObserver({
      level: 'debug',
      sink: (log) => captured.push(log),
    });

    obs.debug('debug.event');
    obs.info('info.event');

    assert.equal(captured.length, 2, 'Both debug and info should appear');
  });

  it('log level filtering at error only emits errors', () => {
    const captured: StructuredLog[] = [];
    const obs = new WitnessObserver({
      level: 'error',
      sink: (log) => captured.push(log),
    });

    obs.debug('nope');
    obs.info('nope');
    obs.warn('nope');
    obs.error('yes');

    assert.equal(captured.length, 1);
    assert.equal(captured[0].level, 'error');
  });

  // ─── Test 4: recordEngineCall updates metrics ──────────────────────

  it('recordEngineCall updates metrics correctly', () => {
    const captured: StructuredLog[] = [];
    const obs = new WitnessObserver({ sink: (log) => captured.push(log) });

    obs.recordEngineCall('biorhythm', 150, true, false);
    obs.recordEngineCall('biorhythm', 200, true, true);
    obs.recordEngineCall('biorhythm', 50, false, false);

    const metrics = obs.getEngineMetrics('biorhythm') as EngineMetrics;
    assert.equal(metrics.engine_id, 'biorhythm');
    assert.equal(metrics.calls, 3);
    assert.equal(metrics.successes, 2);
    assert.equal(metrics.failures, 1);
    assert.equal(metrics.cache_hits, 1);
    assert.equal(metrics.cache_misses, 2);
  });

  // ─── Test 5: recordLLMCall accumulates cost by tier and model ──────

  it('recordLLMCall accumulates cost by tier and model', () => {
    const obs = new WitnessObserver({ sink: () => {} });

    obs.recordLLMCall('gpt-4o-mini', 'free', 0.001, 150, 300);
    obs.recordLLMCall('gpt-4o-mini', 'free', 0.002, 200, 250);
    obs.recordLLMCall('claude-3-haiku', 'subscriber', 0.005, 500, 450);

    const cost = obs.getCostMetrics();
    assert.ok(Math.abs(cost.total_cost_usd - 0.008) < 0.0001, `Expected ~0.008, got ${cost.total_cost_usd}`);
    assert.ok(Math.abs(cost.cost_by_tier['free'] - 0.003) < 0.0001);
    assert.ok(Math.abs(cost.cost_by_tier['subscriber'] - 0.005) < 0.0001);
    assert.ok(Math.abs(cost.cost_by_model['gpt-4o-mini'] - 0.003) < 0.0001);
    assert.ok(Math.abs(cost.cost_by_model['claude-3-haiku'] - 0.005) < 0.0001);
    assert.equal(cost.total_tokens, 850);
  });

  // ─── Test 6: recordFunnelEvent tracks layer conversion ─────────────

  it('recordFunnelEvent tracks layer conversion', () => {
    const obs = new WitnessObserver({ sink: () => {} });

    // 5 users only saw Layer 1
    for (let i = 0; i < 5; i++) obs.recordFunnelEvent(1, false, false);
    // 3 users reached Layer 2
    for (let i = 0; i < 3; i++) obs.recordFunnelEvent(2, false, false);
    // 2 users reached Layer 3
    for (let i = 0; i < 2; i++) obs.recordFunnelEvent(3, true, true);

    const funnel = obs.getFunnelMetrics();
    assert.equal(funnel.total_readings, 10);
    assert.equal(funnel.layer1_only, 5);
    assert.equal(funnel.layer2_reached, 3);
    assert.equal(funnel.layer3_reached, 2);
    assert.equal(funnel.finders_gate_shown, 2);
    assert.equal(funnel.graduation_shown, 2);
  });

  // ─── Test 7: getEngineMetrics returns correct avg and p95 latency ──

  it('getEngineMetrics returns correct avg and p95 latency', () => {
    const obs = new WitnessObserver({ sink: () => {} });

    // Record 20 calls with known latencies
    const latencies = [
      10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
      110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
    ];
    for (const lat of latencies) {
      obs.recordEngineCall('numerology', lat, true, false);
    }

    const metrics = obs.getEngineMetrics('numerology') as EngineMetrics;

    // Average should be 105 (sum 2100 / 20)
    assert.ok(
      Math.abs(metrics.avg_latency_ms - 105) < 0.1,
      `Expected avg ~105, got ${metrics.avg_latency_ms}`,
    );

    // p95 of [10..200]: sorted, index = ceil(0.95 * 20) - 1 = 19 - 1 = 18 → value 190
    assert.equal(metrics.p95_latency_ms, 190, `Expected p95 = 190, got ${metrics.p95_latency_ms}`);
  });

  it('getEngineMetrics returns all engines when no id specified', () => {
    const obs = new WitnessObserver({ sink: () => {} });

    obs.recordEngineCall('biorhythm', 100, true, false);
    obs.recordEngineCall('numerology', 200, true, false);

    const all = obs.getEngineMetrics() as EngineMetrics[];
    assert.ok(Array.isArray(all), 'Should return array when no engineId');
    assert.equal(all.length, 2);

    const ids = all.map((m) => m.engine_id).sort();
    assert.deepEqual(ids, ['biorhythm', 'numerology']);
  });

  it('p95 works with rolling window of last 100', () => {
    const obs = new WitnessObserver({ sink: () => {} });

    // Fill 100 entries with 100ms, then add 10 more with 500ms
    for (let i = 0; i < 100; i++) obs.recordEngineCall('biorhythm', 100, true, false);
    for (let i = 0; i < 10; i++) obs.recordEngineCall('biorhythm', 500, true, false);

    // Rolling window keeps last 100, so now we have 90 entries of 100ms + 10 entries of 500ms
    const metrics = obs.getEngineMetrics('biorhythm') as EngineMetrics;
    // p95 index: ceil(0.95 * 100) - 1 = 94
    // Sorted: 90 × 100ms, then 10 × 500ms → index 94 = 500ms
    assert.equal(metrics.p95_latency_ms, 500, `Expected p95 = 500 in rolling window, got ${metrics.p95_latency_ms}`);
  });

  // ─── Test 8: getCostMetrics returns accumulated costs ──────────────

  it('getCostMetrics returns accumulated costs', () => {
    const obs = new WitnessObserver({ sink: () => {} });

    obs.recordLLMCall('model-a', 'free', 0.01, 1000, 100);
    obs.recordLLMCall('model-b', 'free', 0.02, 2000, 200);

    const cost = obs.getCostMetrics();
    assert.ok(Math.abs(cost.total_cost_usd - 0.03) < 0.0001);
    assert.equal(cost.total_tokens, 3000);
    assert.ok(cost.cost_by_model['model-a'] !== undefined);
    assert.ok(cost.cost_by_model['model-b'] !== undefined);
  });

  it('getCostMetrics returns zeroes when no LLM calls made', () => {
    const obs = new WitnessObserver({ sink: () => {} });
    const cost = obs.getCostMetrics();
    assert.equal(cost.total_cost_usd, 0);
    assert.equal(cost.total_tokens, 0);
    assert.deepEqual(cost.cost_by_tier, {});
    assert.deepEqual(cost.cost_by_model, {});
  });

  // ─── Test 9: getFunnelMetrics computes conversion rates ────────────

  it('getFunnelMetrics computes conversion rates', () => {
    const obs = new WitnessObserver({ sink: () => {} });

    // 10 total: 4 L1-only, 4 L2, 2 L3
    for (let i = 0; i < 4; i++) obs.recordFunnelEvent(1, false, false);
    for (let i = 0; i < 4; i++) obs.recordFunnelEvent(2, false, false);
    for (let i = 0; i < 2; i++) obs.recordFunnelEvent(3, false, false);

    const funnel = obs.getFunnelMetrics();
    assert.equal(funnel.total_readings, 10);

    // L1→L2: (layer2_reached + layer3_reached) / total = (4 + 2) / 10 = 0.6
    assert.ok(
      Math.abs(funnel.conversion_rate_l1_to_l2 - 0.6) < 0.001,
      `Expected L1→L2 rate 0.6, got ${funnel.conversion_rate_l1_to_l2}`,
    );

    // L2→L3: layer3_reached / (layer2_reached + layer3_reached) = 2 / 6 ≈ 0.333
    assert.ok(
      Math.abs(funnel.conversion_rate_l2_to_l3 - (2 / 6)) < 0.001,
      `Expected L2→L3 rate ~0.333, got ${funnel.conversion_rate_l2_to_l3}`,
    );
  });

  it('getFunnelMetrics handles zero readings without NaN', () => {
    const obs = new WitnessObserver({ sink: () => {} });
    const funnel = obs.getFunnelMetrics();
    assert.equal(funnel.total_readings, 0);
    assert.equal(funnel.conversion_rate_l1_to_l2, 0);
    assert.equal(funnel.conversion_rate_l2_to_l3, 0);
  });

  // ─── Test 10: getAllMetrics returns combined view ───────────────────

  it('getAllMetrics returns combined view', () => {
    const obs = new WitnessObserver({ sink: () => {} });

    obs.recordEngineCall('biorhythm', 100, true, false);
    obs.recordLLMCall('gpt-4o-mini', 'free', 0.001, 100, 150);
    obs.recordFunnelEvent(2, false, false);

    const all = obs.getAllMetrics();

    // engines
    assert.ok(Array.isArray(all.engines), 'engines should be an array');
    assert.equal(all.engines.length, 1);
    assert.equal(all.engines[0].engine_id, 'biorhythm');

    // cost
    assert.ok(Math.abs(all.cost.total_cost_usd - 0.001) < 0.0001);
    assert.equal(all.cost.total_tokens, 100);

    // funnel
    assert.equal(all.funnel.total_readings, 1);
    assert.equal(all.funnel.layer2_reached, 1);
  });

  // ─── Additional edge cases ─────────────────────────────────────────

  it('log method with explicit level works', () => {
    const captured: StructuredLog[] = [];
    const obs = new WitnessObserver({
      level: 'debug',
      sink: (log) => captured.push(log),
    });

    obs.log('warn', 'explicit.warn', { error: 'something broke' });

    assert.equal(captured.length, 1);
    assert.equal(captured[0].level, 'warn');
    assert.equal(captured[0].event, 'explicit.warn');
    assert.equal(captured[0].error, 'something broke');
  });

  it('recordEngineCall logs engine.call events', () => {
    const captured: StructuredLog[] = [];
    const obs = new WitnessObserver({
      sink: (log) => captured.push(log),
    });

    obs.recordEngineCall('vedic-clock', 250, true, false);

    // Should have emitted a structured log
    const engineLogs = captured.filter((l) => l.event === 'engine.call');
    assert.equal(engineLogs.length, 1);
    assert.equal(engineLogs[0].engine_id, 'vedic-clock');
    assert.equal(engineLogs[0].duration_ms, 250);
  });

  it('recordLLMCall logs layer2.llm events', () => {
    const captured: StructuredLog[] = [];
    const obs = new WitnessObserver({
      sink: (log) => captured.push(log),
    });

    obs.recordLLMCall('gpt-4o-mini', 'free', 0.001, 150, 300);

    const llmLogs = captured.filter((l) => l.event === 'layer2.llm');
    assert.equal(llmLogs.length, 1);
    assert.equal(llmLogs[0].tier, 'free');
    assert.equal(llmLogs[0].duration_ms, 300);
  });

  it('metadata is preserved in structured logs', () => {
    const captured: StructuredLog[] = [];
    const obs = new WitnessObserver({
      sink: (log) => captured.push(log),
    });

    obs.info('custom.event', {
      metadata: { custom_key: 'custom_value', count: 42 },
    });

    assert.equal(captured.length, 1);
    assert.deepEqual(captured[0].metadata, { custom_key: 'custom_value', count: 42 });
  });
});
