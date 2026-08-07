import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deterministicCanaryBucket,
  parseAgentscopeRuntimeConfig,
  selectAgentscopeRoute,
} from '../src/wiring/agentscope/routing.js';

function validCanaryConfig(overrides: Record<string, string> = {}) {
  return parseAgentscopeRuntimeConfig({
    WITNESS_EXECUTOR_MODE: 'agentscope-canary',
    AGENTSCOPE_EXECUTOR_URL: 'http://agentscope-executor:8000',
    AGENTSCOPE_INTERNAL_TOKEN: 'internal-secret',
    AGENTSCOPE_TIMEOUT_MS: '5000',
    AGENTSCOPE_CANARY_PERCENT: '10',
    ...overrides,
  });
}

test('absent AgentScope configuration defaults unconditionally to native', () => {
  const config = parseAgentscopeRuntimeConfig({});
  assert.equal(config.mode, 'native');
  assert.equal(config.valid, true);
  assert.equal(config.canaryPercent, 0);
  assert.equal(config.executorUrl, undefined);
  assert.equal(config.internalToken, undefined);

  assert.deepEqual(selectAgentscopeRoute(config, { stableKey: 'reader-1' }), {
    selectedMode: 'native',
    configuredMode: 'native',
    reason: 'native-default',
    eligible: false,
    canaryPercent: 0,
    bucket: null,
  });
});

test('invalid explicit configuration fails closed with a safe category', () => {
  const secret = 'Bearer super-private-value';
  const config = parseAgentscopeRuntimeConfig({
    WITNESS_EXECUTOR_MODE: 'agentscope-canary',
    AGENTSCOPE_EXECUTOR_URL: `https://user:${secret}@example.com/private`,
    AGENTSCOPE_INTERNAL_TOKEN: secret,
    AGENTSCOPE_TIMEOUT_MS: '5000',
    AGENTSCOPE_CANARY_PERCENT: '5',
  });

  assert.equal(config.mode, 'native');
  assert.equal(config.valid, false);
  assert.equal(config.errorCategory, 'invalid-url');
  assert.equal(config.executorUrl, undefined);
  assert.equal(config.internalToken, undefined);

  const serialized = JSON.stringify(
    selectAgentscopeRoute(config, { stableKey: secret, tenant: secret, taskClass: secret }),
  );
  assert.doesNotMatch(serialized, /super-private-value|Bearer|example\.com|private/);
});

test('invalid modes and unsafe integer fields fail closed without throwing', () => {
  const invalidMode = parseAgentscopeRuntimeConfig({ WITNESS_EXECUTOR_MODE: 'remote-secret-mode' });
  assert.equal(invalidMode.configuredMode, 'invalid');
  assert.equal(invalidMode.errorCategory, 'invalid-mode');

  const invalidTimeout = validCanaryConfig({ AGENTSCOPE_TIMEOUT_MS: '1.5' });
  assert.equal(invalidTimeout.mode, 'native');
  assert.equal(invalidTimeout.errorCategory, 'invalid-timeout');

  const invalidPercentage = validCanaryConfig({ AGENTSCOPE_CANARY_PERCENT: '101' });
  assert.equal(invalidPercentage.mode, 'native');
  assert.equal(invalidPercentage.errorCategory, 'invalid-canary-percent');
});

test('deterministic assignment produces a stable bucket from only the stable key', () => {
  const first = deterministicCanaryBucket('reader-123');
  const second = deterministicCanaryBucket('reader-123');
  assert.equal(first, second);
  assert.ok(first >= 0 && first <= 99);
  assert.notEqual(first, deterministicCanaryBucket('reader-124'));
});

test('tenant and task-class allowlists must both pass', () => {
  const config = parseAgentscopeRuntimeConfig({
    WITNESS_EXECUTOR_MODE: 'agentscope-shadow',
    AGENTSCOPE_EXECUTOR_URL: 'http://agentscope-executor:8000',
    AGENTSCOPE_INTERNAL_TOKEN: 'internal-secret',
    AGENTSCOPE_TIMEOUT_MS: '5000',
    AGENTSCOPE_ALLOWED_TENANTS: 'tenant-a',
    AGENTSCOPE_ALLOWED_TASK_CLASSES: 'reading-interpretation',
  });

  assert.equal(
    selectAgentscopeRoute(config, {
      stableKey: 'reader-1',
      tenant: 'tenant-b',
      taskClass: 'reading-interpretation',
    }).reason,
    'tenant-not-allowed',
  );
  assert.equal(
    selectAgentscopeRoute(config, {
      stableKey: 'reader-1',
      tenant: 'tenant-a',
      taskClass: 'autoresearch',
    }).reason,
    'task-class-not-allowed',
  );
  assert.equal(
    selectAgentscopeRoute(config, {
      stableKey: 'reader-1',
      tenant: 'tenant-a',
      taskClass: 'reading-interpretation',
    }).selectedMode,
    'agentscope-shadow',
  );
});

test('zero-percent canary remains native even for an eligible request', () => {
  const config = validCanaryConfig({ AGENTSCOPE_CANARY_PERCENT: '0' });
  const decision = selectAgentscopeRoute(config, {
    stableKey: 'reader-1',
    tenant: 'tenant-a',
    taskClass: 'reading-interpretation',
  });

  assert.equal(decision.selectedMode, 'native');
  assert.equal(decision.reason, 'canary-percentage-excluded');
  assert.equal(decision.eligible, true);
  assert.equal(typeof decision.bucket, 'number');
});

test('one-hundred-percent canary selects every eligible stable bucket', () => {
  const config = validCanaryConfig({ AGENTSCOPE_CANARY_PERCENT: '100' });
  const decision = selectAgentscopeRoute(config, { stableKey: 'reader-1' });
  assert.equal(decision.selectedMode, 'agentscope-canary');
  assert.equal(decision.reason, 'canary-selected');
});

test('routing decision provenance has an exact safe, serializable field set', () => {
  const secret = 'token-secret-never-serialize';
  const config = validCanaryConfig({
    AGENTSCOPE_INTERNAL_TOKEN: secret,
    AGENTSCOPE_CANARY_PERCENT: '100',
  });
  const decision = selectAgentscopeRoute(config, {
    stableKey: `reader-${secret}`,
    tenant: `tenant-${secret}`,
    taskClass: `task-${secret}`,
  });

  assert.deepEqual(Object.keys(decision).sort(), [
    'bucket',
    'canaryPercent',
    'configuredMode',
    'eligible',
    'reason',
    'selectedMode',
  ]);
  const serialized = JSON.stringify(decision);
  assert.doesNotMatch(
    serialized,
    /token-secret|executor|http|url|endpoint|authorization|bearer|prompt|context|trace|provider/i,
  );
});
