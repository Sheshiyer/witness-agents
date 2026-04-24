// ─── Circuit Breaker Tests ──────────────────────────────────────────────
// TDD: Tests written FIRST. Must fail before implementation.
// Protects Daily Mirror from cascading Selemene engine failures.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CircuitBreaker,
  type CircuitState,
  type EngineHealth,
  type CircuitBreakerConfig,
} from '../src/standalone/circuit-breaker.js';
import type { StandaloneEngineId } from '../src/standalone/types.js';

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

const ALL_ENGINES: StandaloneEngineId[] = ['biorhythm', 'vedic-clock', 'panchanga', 'numerology'];

/** Simulate N consecutive failures for an engine */
function failEngine(breaker: CircuitBreaker, engineId: StandaloneEngineId, times: number, error = 'test error') {
  for (let i = 0; i < times; i++) {
    breaker.recordFailure(engineId, error);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker();
  });

  // ─── Test 1: Initial state ──────────────────────────────────────────

  describe('initial state', () => {
    it('all engines start in closed state', () => {
      for (const engineId of ALL_ENGINES) {
        const health = breaker.getHealth(engineId) as EngineHealth;
        assert.equal(health.state, 'closed', `${engineId} should start closed`);
        assert.equal(health.consecutive_failures, 0);
        assert.equal(health.total_failures, 0);
        assert.equal(health.total_successes, 0);
      }
    });

    it('canCall returns true for all engines initially', () => {
      for (const engineId of ALL_ENGINES) {
        assert.equal(breaker.canCall(engineId), true, `Should be able to call ${engineId}`);
      }
    });
  });

  // ─── Test 2: Circuit opens after N failures ─────────────────────────

  describe('failure threshold', () => {
    it('circuit opens after default threshold (3) consecutive failures', () => {
      failEngine(breaker, 'numerology', 3);
      const health = breaker.getHealth('numerology') as EngineHealth;
      assert.equal(health.state, 'open', 'Circuit should be open after 3 failures');
      assert.equal(health.consecutive_failures, 3);
      assert.equal(health.total_failures, 3);
    });

    it('circuit stays closed before reaching threshold', () => {
      failEngine(breaker, 'numerology', 2);
      const health = breaker.getHealth('numerology') as EngineHealth;
      assert.equal(health.state, 'closed', 'Circuit should stay closed with 2 failures');
      assert.equal(health.consecutive_failures, 2);
    });

    it('respects custom failure threshold', () => {
      const custom = new CircuitBreaker({ failure_threshold: 5 });
      failEngine(custom, 'numerology', 4);
      assert.equal((custom.getHealth('numerology') as EngineHealth).state, 'closed');
      failEngine(custom, 'numerology', 1);
      assert.equal((custom.getHealth('numerology') as EngineHealth).state, 'open');
    });
  });

  // ─── Test 3: Open circuit blocks calls ──────────────────────────────

  describe('open circuit behavior', () => {
    it('canCall returns false when circuit is open', () => {
      failEngine(breaker, 'numerology', 3);
      assert.equal(breaker.canCall('numerology'), false, 'Open circuit should block calls');
    });

    it('open circuit does not affect other engines', () => {
      failEngine(breaker, 'numerology', 3);
      assert.equal(breaker.canCall('biorhythm'), true, 'Biorhythm should still be callable');
      assert.equal(breaker.canCall('vedic-clock'), true, 'Vedic-clock should still be callable');
      assert.equal(breaker.canCall('panchanga'), true, 'Panchanga should still be callable');
    });

    it('records last_error on failure', () => {
      breaker.recordFailure('numerology', 'Selemene numerology: 422 Unprocessable Entity');
      const health = breaker.getHealth('numerology') as EngineHealth;
      assert.equal(health.last_error, 'Selemene numerology: 422 Unprocessable Entity');
    });

    it('tracks last_failure_time', () => {
      const before = Date.now();
      breaker.recordFailure('numerology', 'fail');
      const health = breaker.getHealth('numerology') as EngineHealth;
      assert.ok(health.last_failure_time !== undefined);
      assert.ok(health.last_failure_time! >= before);
      assert.ok(health.last_failure_time! <= Date.now());
    });
  });

  // ─── Test 4: Cooldown → half-open ──────────────────────────────────

  describe('cooldown and half-open state', () => {
    it('circuit transitions to half-open after cooldown', () => {
      // Use very short cooldown for testing
      const fast = new CircuitBreaker({ cooldown_ms: 50 });
      failEngine(fast, 'numerology', 3);
      assert.equal(fast.canCall('numerology'), false, 'Should be open immediately');

      // Wait for cooldown
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          assert.equal(fast.canCall('numerology'), true, 'Should be callable after cooldown (half-open)');
          const health = fast.getHealth('numerology') as EngineHealth;
          assert.equal(health.state, 'half-open', 'State should be half-open after cooldown');
          resolve();
        }, 80);
      });
    });
  });

  // ─── Test 5: Success in half-open closes circuit ───────────────────

  describe('half-open recovery', () => {
    it('success in half-open closes the circuit', () => {
      const fast = new CircuitBreaker({ cooldown_ms: 50 });
      failEngine(fast, 'numerology', 3);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Now in half-open — calling canCall transitions it
          assert.equal(fast.canCall('numerology'), true);
          // Simulate success
          fast.recordSuccess('numerology');
          const health = fast.getHealth('numerology') as EngineHealth;
          assert.equal(health.state, 'closed', 'Should close after success in half-open');
          assert.equal(health.consecutive_failures, 0, 'Failures should reset');
          assert.equal(health.total_successes, 1);
          resolve();
        }, 80);
      });
    });
  });

  // ─── Test 6: Failure in half-open re-opens circuit ─────────────────

  describe('half-open failure', () => {
    it('failure in half-open re-opens the circuit', () => {
      const fast = new CircuitBreaker({ cooldown_ms: 50 });
      failEngine(fast, 'numerology', 3);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Transition to half-open
          assert.equal(fast.canCall('numerology'), true);
          // Simulate failure in half-open
          fast.recordFailure('numerology', 'still broken');
          const health = fast.getHealth('numerology') as EngineHealth;
          assert.equal(health.state, 'open', 'Should re-open after failure in half-open');
          assert.equal(fast.canCall('numerology'), false, 'Should block calls again');
          resolve();
        }, 80);
      });
    });
  });

  // ─── Test 7: Substitute engines ────────────────────────────────────

  describe('getSubstitute', () => {
    it('biorhythm → vedic-clock', () => {
      failEngine(breaker, 'biorhythm', 3);
      assert.equal(breaker.getSubstitute('biorhythm'), 'vedic-clock');
    });

    it('vedic-clock → biorhythm', () => {
      failEngine(breaker, 'vedic-clock', 3);
      assert.equal(breaker.getSubstitute('vedic-clock'), 'biorhythm');
    });

    it('panchanga → numerology', () => {
      failEngine(breaker, 'panchanga', 3);
      assert.equal(breaker.getSubstitute('panchanga'), 'numerology');
    });

    it('numerology → panchanga', () => {
      failEngine(breaker, 'numerology', 3);
      assert.equal(breaker.getSubstitute('numerology'), 'panchanga');
    });
  });

  // ─── Test 8: Substitute returns null if both open ──────────────────

  describe('getSubstitute when both open', () => {
    it('returns null if both biorhythm and vedic-clock are open', () => {
      failEngine(breaker, 'biorhythm', 3);
      failEngine(breaker, 'vedic-clock', 3);
      assert.equal(breaker.getSubstitute('biorhythm'), null);
      assert.equal(breaker.getSubstitute('vedic-clock'), null);
    });

    it('returns null if both panchanga and numerology are open', () => {
      failEngine(breaker, 'panchanga', 3);
      failEngine(breaker, 'numerology', 3);
      assert.equal(breaker.getSubstitute('panchanga'), null);
      assert.equal(breaker.getSubstitute('numerology'), null);
    });
  });

  // ─── Test 9: getHealth returns all engine states ───────────────────

  describe('getHealth', () => {
    it('returns all engine health when called without argument', () => {
      const allHealth = breaker.getHealth() as EngineHealth[];
      assert.equal(allHealth.length, 4, 'Should return health for all 4 engines');
      const ids = allHealth.map(h => h.engine_id);
      for (const engineId of ALL_ENGINES) {
        assert.ok(ids.includes(engineId), `Should include ${engineId}`);
      }
    });

    it('returns single engine health when called with argument', () => {
      breaker.recordSuccess('biorhythm');
      const health = breaker.getHealth('biorhythm') as EngineHealth;
      assert.equal(health.engine_id, 'biorhythm');
      assert.equal(health.total_successes, 1);
      assert.equal(health.state, 'closed');
    });

    it('tracks totals independently per engine', () => {
      failEngine(breaker, 'numerology', 5);
      breaker.recordSuccess('biorhythm');
      breaker.recordSuccess('biorhythm');

      const numHealth = breaker.getHealth('numerology') as EngineHealth;
      const bioHealth = breaker.getHealth('biorhythm') as EngineHealth;

      assert.equal(numHealth.total_failures, 5);
      assert.equal(numHealth.total_successes, 0);
      assert.equal(bioHealth.total_failures, 0);
      assert.equal(bioHealth.total_successes, 2);
    });
  });

  // ─── Test 10: Success resets consecutive failures ──────────────────

  describe('success resets', () => {
    it('success resets consecutive failures and closes circuit', () => {
      failEngine(breaker, 'biorhythm', 2); // below threshold
      breaker.recordSuccess('biorhythm');
      const health = breaker.getHealth('biorhythm') as EngineHealth;
      assert.equal(health.consecutive_failures, 0);
      assert.equal(health.state, 'closed');
      assert.equal(health.total_failures, 2);
      assert.equal(health.total_successes, 1);
    });

    it('tracks last_success_time', () => {
      const before = Date.now();
      breaker.recordSuccess('biorhythm');
      const health = breaker.getHealth('biorhythm') as EngineHealth;
      assert.ok(health.last_success_time !== undefined);
      assert.ok(health.last_success_time! >= before);
      assert.ok(health.last_success_time! <= Date.now());
    });
  });
});
