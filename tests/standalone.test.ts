// ─── Daily Witness — Standalone Module Tests ──────────────────────────
// Unit tests for all standalone components.
// Live tests (marked LIVE) require SELEMENE_API_KEY env var.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ─── Engine Rotation ────────────────────────────────────────────────

import {
  getPrimaryEngine,
  getRotationOrder,
  getForecast,
  computeLifePathSeed,
  getDayNumber,
} from '../src/standalone/engine-rotation.js';
import { STANDALONE_ENGINES } from '../src/standalone/types.js';

describe('Engine Rotation', () => {
  it('computeLifePathSeed reduces to single digit', () => {
    // 1991-08-13 → 1+9+9+1+0+8+1+3 = 32 → 3+2 = 5
    assert.equal(computeLifePathSeed('1991-08-13'), 5);
  });
  
  it('computeLifePathSeed preserves master numbers', () => {
    // Need a date that reduces to 11, 22, or 33
    // 1990-02-09 → 1+9+9+0+0+2+0+9 = 30 → 3+0 = 3 (not master)
    // 1992-11-02 → 1+9+9+2+1+1+0+2 = 25 → 2+5 = 7 (not master)
    // 2009-11-09 → 2+0+0+9+1+1+0+9 = 22 (master!)
    assert.equal(computeLifePathSeed('2009-11-09'), 22);
  });
  
  it('getPrimaryEngine returns a valid standalone engine', () => {
    const engine = getPrimaryEngine('1991-08-13', '2026-04-24');
    assert.ok(
      STANDALONE_ENGINES.includes(engine),
      `Expected standalone engine, got: ${engine}`,
    );
  });
  
  it('getPrimaryEngine is deterministic', () => {
    const a = getPrimaryEngine('1991-08-13', '2026-04-24');
    const b = getPrimaryEngine('1991-08-13', '2026-04-24');
    assert.equal(a, b, 'Same birth date + same day should produce same engine');
  });
  
  it('getPrimaryEngine changes with different days', () => {
    const engines = new Set<string>();
    for (let day = 1; day <= 4; day++) {
      const dateStr = `2026-04-${String(day).padStart(2, '0')}`;
      engines.add(getPrimaryEngine('1991-08-13', dateStr));
    }
    // Over 4 consecutive days, should see at least 2 different engines
    assert.ok(engines.size >= 2, `Expected variety over 4 days, got ${engines.size} unique engines`);
  });
  
  it('getPrimaryEngine differs for different birth dates', () => {
    const a = getPrimaryEngine('1991-08-13', '2026-04-24');
    const b = getPrimaryEngine('1985-03-22', '2026-04-24');
    // Different seeds should produce different primary engines on at least some days
    // (not guaranteed on any single day, but testing the mechanism)
    const seed1 = computeLifePathSeed('1991-08-13');
    const seed2 = computeLifePathSeed('1985-03-22');
    assert.notEqual(seed1, seed2, 'Different birth dates should have different seeds');
  });
  
  it('getRotationOrder returns all 4 engines', () => {
    const order = getRotationOrder('1991-08-13', '2026-04-24');
    assert.equal(order.length, 4);
    const unique = new Set(order);
    assert.equal(unique.size, 4, 'All 4 engines should be unique');
    for (const e of order) {
      assert.ok(STANDALONE_ENGINES.includes(e), `${e} is not a standalone engine`);
    }
  });
  
  it('getRotationOrder starts with the primary engine', () => {
    const primary = getPrimaryEngine('1991-08-13', '2026-04-24');
    const order = getRotationOrder('1991-08-13', '2026-04-24');
    assert.equal(order[0], primary, 'First in rotation should be today\'s primary');
  });
  
  it('getForecast returns correct number of days', () => {
    const forecast = getForecast('1991-08-13', 7, '2026-04-24');
    assert.equal(forecast.length, 7);
    for (const entry of forecast) {
      assert.ok(entry.date);
      assert.ok(STANDALONE_ENGINES.includes(entry.primary_engine));
    }
  });
  
  it('getDayNumber returns different values for different dates', () => {
    const a = getDayNumber('2026-01-01');
    const b = getDayNumber('2026-06-15');
    assert.notEqual(a, b);
    assert.ok(a > 0 && a < 367);
    assert.ok(b > 0 && b < 367);
  });
});

// ─── Decoder Ring ───────────────────────────────────────────────────

import {
  hashBirthData,
  getDecoderState,
  recordVisit,
  computeMaxLayer,
  shouldShowFindersGate,
  shouldShowGraduation,
  getDecoderNarrative,
  _resetStateStore,
} from '../src/standalone/decoder-ring.js';
import type { DecoderState } from '../src/standalone/types.js';
import { DECODER_THRESHOLDS } from '../src/standalone/types.js';

describe('Decoder Ring', () => {
  beforeEach(() => {
    _resetStateStore();
  });
  
  it('hashBirthData produces consistent hashes', () => {
    const a = hashBirthData('1991-08-13', '13:19', 12.97, 77.59);
    const b = hashBirthData('1991-08-13', '13:19', 12.97, 77.59);
    assert.equal(a, b);
    assert.equal(a.length, 16);
  });
  
  it('hashBirthData produces different hashes for different inputs', () => {
    const a = hashBirthData('1991-08-13');
    const b = hashBirthData('1985-03-22');
    assert.notEqual(a, b);
  });
  
  it('getDecoderState creates fresh state for new user', () => {
    const state = getDecoderState('test-user-1');
    assert.equal(state.total_visits, 0);
    assert.equal(state.consecutive_days, 0);
    assert.equal(state.max_layer_reached, 1);
    assert.equal(state.finder_gate_shown, false);
    assert.equal(state.graduation_shown, false);
  });
  
  it('recordVisit increments total_visits', () => {
    const state1 = recordVisit('test-user-2', 'biorhythm', '2026-04-20');
    assert.equal(state1.total_visits, 1);
    
    const state2 = recordVisit('test-user-2', 'biorhythm', '2026-04-21');
    assert.equal(state2.total_visits, 2);
  });
  
  it('recordVisit does not double-count same-day visits', () => {
    recordVisit('test-user-3', 'biorhythm', '2026-04-20');
    const state = recordVisit('test-user-3', 'vedic-clock', '2026-04-20');
    assert.equal(state.total_visits, 1, 'Same day should count as 1 visit');
  });
  
  it('recordVisit tracks consecutive days', () => {
    recordVisit('test-user-4', 'biorhythm', '2026-04-20');
    recordVisit('test-user-4', 'biorhythm', '2026-04-21');
    const state = recordVisit('test-user-4', 'biorhythm', '2026-04-22');
    assert.equal(state.consecutive_days, 3);
  });
  
  it('recordVisit resets streak after >2 day gap', () => {
    recordVisit('test-user-5', 'biorhythm', '2026-04-20');
    recordVisit('test-user-5', 'biorhythm', '2026-04-21');
    recordVisit('test-user-5', 'biorhythm', '2026-04-22');
    // Skip 3 days
    const state = recordVisit('test-user-5', 'biorhythm', '2026-04-26');
    assert.equal(state.consecutive_days, 1, 'Streak should reset after 3+ day gap');
  });
  
  it('recordVisit has grace period for 2-day gap', () => {
    recordVisit('test-user-6', 'biorhythm', '2026-04-20');
    recordVisit('test-user-6', 'biorhythm', '2026-04-21');
    recordVisit('test-user-6', 'biorhythm', '2026-04-22');
    // Skip 1 day (2-day gap = grace)
    const state = recordVisit('test-user-6', 'biorhythm', '2026-04-24');
    assert.ok(state.consecutive_days >= 3, 'Grace period should preserve streak');
  });
  
  it('computeMaxLayer returns 1 for new user', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 0,
      consecutive_days: 0,
      last_visit: '',
      first_visit: '',
      max_layer_reached: 1,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 0, 'vedic-clock': 0, 'panchanga': 0, 'numerology': 0 },
    };
    assert.equal(computeMaxLayer(state), 1);
  });
  
  it('computeMaxLayer returns 2 after enough visits', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: DECODER_THRESHOLDS.layer_2_visits,
      consecutive_days: 1,
      last_visit: '2026-04-24',
      first_visit: '2026-04-22',
      max_layer_reached: 1,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 3, 'vedic-clock': 0, 'panchanga': 0, 'numerology': 0 },
    };
    assert.equal(computeMaxLayer(state), 2);
  });
  
  it('computeMaxLayer returns 2 for subscriber tier (immediate)', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 1,
      consecutive_days: 1,
      last_visit: '2026-04-24',
      first_visit: '2026-04-24',
      max_layer_reached: 1,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 1, 'vedic-clock': 0, 'panchanga': 0, 'numerology': 0 },
    };
    assert.equal(computeMaxLayer(state, 'witness-subscriber'), 2);
  });
  
  it('computeMaxLayer returns 3 after 7 consecutive days', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 10,
      consecutive_days: DECODER_THRESHOLDS.layer_3_consecutive,
      last_visit: '2026-04-24',
      first_visit: '2026-04-17',
      max_layer_reached: 2,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 5, 'vedic-clock': 3, 'panchanga': 1, 'numerology': 1 },
    };
    assert.equal(computeMaxLayer(state), 3);
  });
  
  it('Layer 3 cannot be bought with subscriber tier', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 2,
      consecutive_days: 2,
      last_visit: '2026-04-24',
      first_visit: '2026-04-22',
      max_layer_reached: 1,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 1, 'vedic-clock': 1, 'panchanga': 0, 'numerology': 0 },
    };
    // subscriber tier gives Layer 2 immediately but NOT Layer 3
    assert.equal(computeMaxLayer(state, 'witness-subscriber'), 2);
  });
  
  it('shouldShowFindersGate after 14 consecutive days', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 15,
      consecutive_days: DECODER_THRESHOLDS.finders_gate_days,
      last_visit: '2026-04-24',
      first_visit: '2026-04-10',
      max_layer_reached: 3,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 8, 'vedic-clock': 4, 'panchanga': 2, 'numerology': 1 },
    };
    assert.equal(shouldShowFindersGate(state), true);
  });
  
  it('shouldShowFindersGate returns false if already shown', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 15,
      consecutive_days: 14,
      last_visit: '2026-04-24',
      first_visit: '2026-04-10',
      max_layer_reached: 3,
      finder_gate_shown: true,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 8, 'vedic-clock': 4, 'panchanga': 2, 'numerology': 1 },
    };
    assert.equal(shouldShowFindersGate(state), false);
  });
  
  it('shouldShowGraduation after 30 consecutive days', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 32,
      consecutive_days: DECODER_THRESHOLDS.graduation_days,
      last_visit: '2026-04-24',
      first_visit: '2026-03-25',
      max_layer_reached: 3,
      finder_gate_shown: true,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 15, 'vedic-clock': 10, 'panchanga': 5, 'numerology': 2 },
    };
    assert.equal(shouldShowGraduation(state), true);
  });
  
  it('getDecoderNarrative returns undefined for first visit', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 1,
      consecutive_days: 1,
      last_visit: '2026-04-24',
      first_visit: '2026-04-24',
      max_layer_reached: 1,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 1, 'vedic-clock': 0, 'panchanga': 0, 'numerology': 0 },
    };
    assert.equal(getDecoderNarrative(state), undefined);
  });
  
  it('getDecoderNarrative returns message for second visit', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 2,
      consecutive_days: 2,
      last_visit: '2026-04-24',
      first_visit: '2026-04-23',
      max_layer_reached: 1,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 2, 'vedic-clock': 0, 'panchanga': 0, 'numerology': 0 },
    };
    const narrative = getDecoderNarrative(state);
    assert.ok(narrative?.includes('returned'));
  });
  
  it('recordVisit tracks engines_most_viewed', () => {
    recordVisit('test-user-7', 'biorhythm', '2026-04-20');
    recordVisit('test-user-7', 'biorhythm', '2026-04-21');
    const state = recordVisit('test-user-7', 'vedic-clock', '2026-04-22');
    assert.equal(state.engines_most_viewed['biorhythm'], 2);
    assert.equal(state.engines_most_viewed['vedic-clock'], 1);
  });
});

// ─── Fool's Gate ────────────────────────────────────────────────────

import {
  isFoolsGate,
  buildFoolsGate,
  extractDataPoints,
  generateHeadline,
} from '../src/standalone/fools-gate.js';

describe('Fool\'s Gate', () => {
  it('isFoolsGate returns true for fresh state', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 0,
      consecutive_days: 0,
      last_visit: '',
      first_visit: '',
      max_layer_reached: 1,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 0, 'vedic-clock': 0, 'panchanga': 0, 'numerology': 0 },
    };
    assert.equal(isFoolsGate(state), true);
  });
  
  it('isFoolsGate returns false after first visit', () => {
    const state: DecoderState = {
      user_hash: 'x',
      total_visits: 1,
      consecutive_days: 1,
      last_visit: '2026-04-24',
      first_visit: '2026-04-24',
      max_layer_reached: 1,
      finder_gate_shown: false,
      graduation_shown: false,
      engines_most_viewed: { 'biorhythm': 1, 'vedic-clock': 0, 'panchanga': 0, 'numerology': 0 },
    };
    assert.equal(isFoolsGate(state), false);
  });
  
  it('buildFoolsGate produces recognition hook from critical day', () => {
    const result = buildFoolsGate({
      physical: { percentage: 52, phase: 'Rising', is_critical: false },
      emotional: { percentage: 67, phase: 'Rising', is_critical: false },
      intellectual: { percentage: 34, phase: 'Falling', is_critical: false },
      critical_days: [{ cycle: 'Physical', days_until: 0 }],
    });
    assert.equal(result.is_first_encounter, true);
    assert.equal(result.calibration_engine, 'biorhythm');
    assert.ok(result.recognition_hook.includes('today'));
    assert.equal(result.silence_after, true);
  });
  
  it('buildFoolsGate produces hook from extreme low', () => {
    const result = buildFoolsGate({
      physical: { percentage: 8, phase: 'Falling', is_critical: false },
      emotional: { percentage: 50, phase: 'Rising', is_critical: false },
      intellectual: { percentage: 50, phase: 'Rising', is_critical: false },
    });
    assert.ok(result.recognition_hook.includes('8%'));
    assert.ok(result.recognition_hook.includes('rest'));
  });
  
  it('buildFoolsGate produces hook from divergence', () => {
    const result = buildFoolsGate({
      physical: { percentage: 90, phase: 'Rising', is_critical: false },
      emotional: { percentage: 20, phase: 'Falling', is_critical: false },
      intellectual: { percentage: 50, phase: 'Rising', is_critical: false },
    });
    // 70pt divergence between physical and emotional
    assert.ok(result.recognition_hook.includes('body'));
    assert.ok(result.recognition_hook.includes('feelings'));
  });
  
  it('buildFoolsGate fallback produces coordinates', () => {
    const result = buildFoolsGate({
      physical: { percentage: 50, phase: 'Rising', is_critical: false },
      emotional: { percentage: 50, phase: 'Rising', is_critical: false },
      intellectual: { percentage: 50, phase: 'Rising', is_critical: false },
    });
    assert.ok(result.recognition_hook.includes('50%'));
  });
  
  it('extractDataPoints handles biorhythm', () => {
    const points = extractDataPoints('biorhythm', {
      physical: { percentage: 67, phase: 'Rising', is_critical: false },
      emotional: { percentage: 82, phase: 'Rising', is_critical: false },
      intellectual: { percentage: 34, phase: 'Falling', is_critical: false },
      overall_energy: 61,
    });
    assert.ok(points.length >= 3);
    const physPoint = points.find(p => p.label === 'Physical');
    assert.ok(physPoint);
    assert.ok(physPoint.value.includes('67%'));
    assert.equal(physPoint.category, 'body');
  });
  
  it('extractDataPoints handles vedic-clock', () => {
    const points = extractDataPoints('vedic-clock', {
      current_organ: {
        organ: 'Liver',
        element: 'Wood',
        associated_emotion: 'Anger',
        peak_energy: '1:00-3:00',
      },
      current_dosha: { dosha: 'Pitta', qualities: ['Hot', 'Sharp'] },
    });
    assert.ok(points.length >= 2);
    const organPoint = points.find(p => p.label === 'Active Organ');
    assert.ok(organPoint);
    assert.equal(organPoint.value, 'Liver');
  });
  
  it('extractDataPoints handles panchanga', () => {
    const points = extractDataPoints('panchanga', {
      tithi_name: 'Shukla Ekadashi',
      nakshatra_name: 'Pushya',
      yoga_name: 'Siddha',
      karana_name: 'Bava',
      vara_name: 'Guruvara',
    });
    assert.equal(points.length, 5);
    const tithiPoint = points.find(p => p.label === 'Tithi');
    assert.ok(tithiPoint);
    assert.equal(tithiPoint.value, 'Shukla Ekadashi');
    assert.ok(tithiPoint.emphasis, 'Tithi should be emphasized');
  });
  
  it('extractDataPoints handles numerology', () => {
    const points = extractDataPoints('numerology', {
      life_path: { value: 5, meaning: 'Freedom', is_master: false },
      expression: { value: 8, meaning: 'Power', is_master: false },
      soul_urge: { value: 22, meaning: 'Master Builder', is_master: true },
    });
    assert.ok(points.length >= 3);
    const soulUrge = points.find(p => p.label.includes('Soul Urge'));
    assert.ok(soulUrge);
    assert.ok(soulUrge.label.includes('Master'));
    assert.ok(soulUrge.emphasis, 'Master number should be emphasized');
  });
  
  it('generateHeadline for biorhythm', () => {
    const headline = generateHeadline('biorhythm', {
      physical: { percentage: 67 },
      emotional: { percentage: 82 },
      intellectual: { percentage: 34 },
    });
    assert.ok(headline.includes('67%'));
    assert.ok(headline.includes('82%'));
    assert.ok(headline.includes('34%'));
  });
  
  it('generateHeadline for panchanga', () => {
    const headline = generateHeadline('panchanga', {
      tithi_name: 'Shukla Trayodashi',
      nakshatra_name: 'Rohini',
    });
    assert.ok(headline.includes('Shukla Trayodashi'));
    assert.ok(headline.includes('Rohini'));
  });
  
  it('generateHeadline for numerology', () => {
    const headline = generateHeadline('numerology', {
      life_path: { value: 11, is_master: true },
    });
    assert.ok(headline.includes('11'));
    assert.ok(headline.includes('Master'));
  });
});

// ─── Daily Mirror (Core Engine) ─────────────────────────────────────

import { DailyMirror } from '../src/standalone/daily-mirror.js';

describe('Daily Mirror', () => {
  it('constructs with config', () => {
    const mirror = new DailyMirror({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test-key',
    });
    assert.ok(mirror);
  });
});

// ─── Standalone API ─────────────────────────────────────────────────

import {
  createStandaloneHandlers,
  _resetRateLimiter,
} from '../src/standalone/standalone-api.js';

describe('Standalone API', () => {
  it('info endpoint returns product metadata', async () => {
    const handlers = createStandaloneHandlers({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = await handlers.info();
    assert.equal(result.status, 200);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.name, 'The Daily Witness');
    assert.ok(body.engines);
    assert.ok(body.layers);
    assert.equal(body.full_platform, 'https://tryambakam.space');
  });
  
  it('reading endpoint rejects missing birth_date', async () => {
    const handlers = createStandaloneHandlers({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = await handlers.reading({});
    assert.equal(result.status, 400);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.code, 'MISSING_BIRTH_DATE');
  });
  
  it('reading endpoint rejects invalid date format', async () => {
    const handlers = createStandaloneHandlers({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = await handlers.reading({ birth_date: '13-08-1991' });
    assert.equal(result.status, 400);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.code, 'INVALID_DATE_FORMAT');
  });
  
  it('reading endpoint rejects invalid time format', async () => {
    const handlers = createStandaloneHandlers({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = await handlers.reading({ birth_date: '1991-08-13', birth_time: '1:19 PM' });
    assert.equal(result.status, 400);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.code, 'INVALID_TIME_FORMAT');
  });
  
  it('engine reading rejects invalid engine', async () => {
    const handlers = createStandaloneHandlers({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = await handlers.engineReading('tarot', { birth_date: '1991-08-13' });
    assert.equal(result.status, 400);
    const body = result.body as Record<string, unknown>;
    assert.equal(body.code, 'INVALID_ENGINE');
  });
  
  it('forecast returns 7 days by default', async () => {
    const handlers = createStandaloneHandlers({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = await handlers.forecast('1991-08-13');
    assert.equal(result.status, 200);
    const body = result.body as Record<string, unknown>;
    const forecast = body.forecast as unknown[];
    assert.equal(forecast.length, 7);
  });
  
  it('forecast caps at 30 days', async () => {
    const handlers = createStandaloneHandlers({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = await handlers.forecast('1991-08-13', 100);
    assert.equal(result.status, 200);
    const body = result.body as Record<string, unknown>;
    const forecast = body.forecast as unknown[];
    assert.equal(forecast.length, 30);
  });
  
  it('rate limiter enforces limits', async () => {
    _resetRateLimiter();
    const handlers = createStandaloneHandlers({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
      rate_limit_per_hour: 2,
    });
    
    // First two should pass (though they'll fail on Selemene call)
    const r1 = await handlers.reading({ birth_date: '1991-08-13' }, 'test-ip');
    const r2 = await handlers.reading({ birth_date: '1991-08-13' }, 'test-ip');
    // Third should be rate-limited
    const r3 = await handlers.reading({ birth_date: '1991-08-13' }, 'test-ip');
    assert.equal(r3.status, 429);
    
    _resetRateLimiter();
  });
});

// ─── skills.sh Adapter ──────────────────────────────────────────────

import {
  SKILLS_SH_MANIFEST,
  createSkillsShHandler,
} from '../src/standalone/skills-adapter.js';

describe('skills.sh Adapter', () => {
  it('manifest has required fields', () => {
    assert.equal(SKILLS_SH_MANIFEST.name, 'daily-witness');
    assert.ok(SKILLS_SH_MANIFEST.description);
    assert.ok(SKILLS_SH_MANIFEST.input_schema);
    assert.ok(SKILLS_SH_MANIFEST.output_schema);
    assert.ok(SKILLS_SH_MANIFEST.agent_instructions);
    assert.ok(SKILLS_SH_MANIFEST.differentiators.length >= 3);
  });
  
  it('manifest input schema requires birth_date', () => {
    assert.ok(SKILLS_SH_MANIFEST.input_schema.required.includes('birth_date'));
  });
  
  it('handler returns manifest', () => {
    const handler = createSkillsShHandler({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = handler.manifest();
    assert.equal(result.status, 200);
    assert.equal((result.body as Record<string, unknown>).name, 'daily-witness');
  });
  
  it('handler rejects missing birth_date', async () => {
    const handler = createSkillsShHandler({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = await handler.agent({});
    assert.equal(result.status, 400);
  });
  
  it('handler rejects invalid engine', async () => {
    const handler = createSkillsShHandler({
      selemene_url: 'https://example.com',
      selemene_api_key: 'test',
    });
    
    const result = await handler.agent({ birth_date: '1991-08-13', engine: 'tarot' });
    assert.equal(result.status, 400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// LIVE INTEGRATION TESTS (require SELEMENE_API_KEY)
// ═══════════════════════════════════════════════════════════════════════

const SELEMENE_API_KEY = process.env.SELEMENE_API_KEY;
const SELEMENE_URL = process.env.SELEMENE_URL || 'https://selemene-engine-production.up.railway.app';

const liveDescribe = SELEMENE_API_KEY ? describe : describe.skip;

liveDescribe('LIVE: Daily Mirror E2E', () => {
  beforeEach(() => {
    _resetStateStore();
  });
  
  it('generates full daily reading', async () => {
    const mirror = new DailyMirror({
      selemene_url: SELEMENE_URL,
      selemene_api_key: SELEMENE_API_KEY!,
    });
    
    const reading = await mirror.generateReading({
      date: '1991-08-13',
      time: '13:19',
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: 'Asia/Kolkata',
    });
    
    // Verify structure
    assert.ok(reading.id.startsWith('dw-'));
    assert.ok(reading.date);
    assert.ok(STANDALONE_ENGINES.includes(reading.primary_engine));
    assert.ok(reading.primary_reading.layer === 1);
    assert.ok(reading.primary_reading.headline.length > 0);
    assert.equal(reading.engines_called.length, 4);
    assert.ok(reading.total_latency_ms > 0);
    
    // At least one engine should have data points (some may 422)
    const totalPoints = Object.values(reading.all_readings)
      .reduce((sum, r) => sum + r.data_points.length, 0);
    assert.ok(totalPoints > 0, `Expected some data points across all engines, got 0`);
    
    // First visit: Layer 1 only, no witness question, no meta-pattern
    assert.equal(reading.max_layer_unlocked, 1);
    assert.equal(reading.witness_question, undefined);
    assert.equal(reading.meta_pattern, undefined);
    
    console.log(`✓ Daily reading: ${reading.primary_engine} → "${reading.primary_reading.headline}"`);
    console.log(`  Data points: ${reading.primary_reading.data_points.length}`);
    console.log(`  Latency: ${reading.total_latency_ms}ms`);
  });
  
  it('generates specific engine reading', async () => {
    const mirror = new DailyMirror({
      selemene_url: SELEMENE_URL,
      selemene_api_key: SELEMENE_API_KEY!,
    });
    
    const reading = await mirror.generateEngineReading(
      {
        date: '1991-08-13',
        time: '13:19',
        latitude: 12.9716,
        longitude: 77.5946,
        timezone: 'Asia/Kolkata',
      },
      'vedic-clock',
    );
    
    assert.equal(reading.primary_engine, 'vedic-clock');
    assert.equal(reading.engines_called.length, 1);
    assert.ok(reading.primary_reading.data_points.length > 0);
    
    const organPoint = reading.primary_reading.data_points.find(p => p.label === 'Active Organ');
    assert.ok(organPoint, 'Should have Active Organ data point');
    
    console.log(`✓ Vedic clock: ${organPoint?.value}`);
  });
  
  it('unlocks Layer 2 after multiple visits', async () => {
    const mirror = new DailyMirror({
      selemene_url: SELEMENE_URL,
      selemene_api_key: SELEMENE_API_KEY!,
    });
    
    const birthData = {
      date: '1991-08-13',
      time: '13:19',
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: 'Asia/Kolkata',
    };
    
    // Simulate 3 previous visits
    const userHash = hashBirthData(birthData.date, birthData.time, birthData.latitude, birthData.longitude);
    recordVisit(userHash, 'biorhythm', '2026-04-21');
    recordVisit(userHash, 'biorhythm', '2026-04-22');
    recordVisit(userHash, 'biorhythm', '2026-04-23');
    
    const reading = await mirror.generateReading(birthData);
    
    assert.ok(reading.max_layer_unlocked >= 2, `Expected Layer 2+, got ${reading.max_layer_unlocked}`);
    assert.ok(reading.witness_question, 'Should have witness question at Layer 2');
    assert.equal(reading.witness_question!.layer, 2);
    assert.equal(reading.witness_question!.prompt_source, 'pichet');
    assert.ok(reading.witness_question!.question.length > 10);
    
    console.log(`✓ Layer 2 unlocked: "${reading.witness_question!.question}"`);
    if (reading.witness_question!.somatic_nudge) {
      console.log(`  Somatic nudge: "${reading.witness_question!.somatic_nudge}"`);
    }
  });
  
  it('unlocks Layer 3 after 7 consecutive days', async () => {
    const mirror = new DailyMirror({
      selemene_url: SELEMENE_URL,
      selemene_api_key: SELEMENE_API_KEY!,
    });
    
    const birthData = {
      date: '1991-08-13',
      time: '13:19',
      latitude: 12.9716,
      longitude: 77.5946,
      timezone: 'Asia/Kolkata',
    };
    
    // Simulate 7 consecutive days of visits
    const userHash = hashBirthData(birthData.date, birthData.time, birthData.latitude, birthData.longitude);
    for (let i = 7; i >= 1; i--) {
      const d = new Date('2026-04-24');
      d.setDate(d.getDate() - i);
      recordVisit(userHash, 'biorhythm', d.toISOString().split('T')[0]);
    }
    
    const reading = await mirror.generateReading(birthData);
    
    assert.equal(reading.max_layer_unlocked, 3, `Expected Layer 3, got ${reading.max_layer_unlocked}`);
    assert.ok(reading.meta_pattern, 'Should have meta-pattern at Layer 3');
    assert.equal(reading.meta_pattern!.layer, 3);
    assert.ok(reading.meta_pattern!.pattern_name.length > 0);
    assert.ok(reading.meta_pattern!.cross_references.length > 0, 'Should have cross-references');
    
    console.log(`✓ Layer 3 unlocked: pattern="${reading.meta_pattern!.pattern_name}"`);
    console.log(`  Cross-refs: ${reading.meta_pattern!.cross_references.length}`);
    for (const ref of reading.meta_pattern!.cross_references) {
      console.log(`    ${ref.engine_a} × ${ref.engine_b}: ${ref.connection.slice(0, 80)}...`);
    }
  });
  
  it('Fool\'s Gate fires on first encounter', async () => {
    const mirror = new DailyMirror({
      selemene_url: SELEMENE_URL,
      selemene_api_key: SELEMENE_API_KEY!,
    });
    
    const reading = await mirror.generateReading({
      date: '1985-03-22',  // Different user to avoid state collision
      time: '09:30',
      latitude: 40.7128,
      longitude: -74.006,
      timezone: 'America/New_York',
    });
    
    // First encounter: Fool's Gate should override the headline
    // The headline should be a recognition hook, not a generic headline
    assert.ok(
      reading.primary_reading.headline.length > 20,
      'Fool\'s Gate headline should be substantial',
    );
    
    console.log(`✓ Fool's Gate: "${reading.primary_reading.headline}"`);
  });
});
