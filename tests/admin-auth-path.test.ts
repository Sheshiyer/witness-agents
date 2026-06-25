// ─── P2.5 — Admin Auth Path Tests (#78) ───────────────────────────────
// Verifies the auth middleware that gates the `consciousness_level`
// payload override field. Non-admin callers MUST NOT be able to escalate
// their reading register by editing the request body.
//
// Per design doc 2026-05-15-consciousness-level-register-design.md
// § "Security boundary" and the level-resolver's SECURITY BOUNDARY
// comment block (scripts/integratedreading/level-resolver.ts).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveCallerIdentity,
  gateConsciousnessLevelOverride,
} from '../src/api/auth.js';

// ════════════════════════════════════════════════════════════════════════
// deriveCallerIdentity — converts headers/env into a CallerIdentity
// ════════════════════════════════════════════════════════════════════════

describe('P2.5 — deriveCallerIdentity', () => {
  it('returns anonymous free-tier identity when no headers supplied', () => {
    const id = deriveCallerIdentity({ headers: {}, env: {} });
    assert.equal(id.caller_tier, 'free');
    assert.equal(id.caller_is_admin, false);
    assert.ok(id.caller_id.length > 0);
  });

  it('reads X-Caller-Tier header', () => {
    const id = deriveCallerIdentity({
      headers: { 'x-caller-tier': 'subscriber' },
      env: {},
    });
    assert.equal(id.caller_tier, 'subscriber');
    assert.equal(id.caller_is_admin, false);
  });

  it('ignores X-Caller-Admin header because it is client-controlled', () => {
    const id = deriveCallerIdentity({
      headers: { 'x-caller-admin': '1' },
      env: {},
    });
    assert.equal(id.caller_is_admin, false);
  });

  it('does not accept initiate tier from untrusted X-Caller-Tier header', () => {
    const id = deriveCallerIdentity({
      headers: { 'x-caller-tier': 'initiate' },
      env: {},
    });
    assert.equal(id.caller_tier, 'free');
    assert.equal(id.caller_is_admin, false);
  });

  it('WITNESS_DEV_ADMIN=1 env-flag promotes caller_is_admin to true', () => {
    const id = deriveCallerIdentity({
      headers: {},
      env: { WITNESS_DEV_ADMIN: '1' },
    });
    assert.equal(id.caller_is_admin, true);
  });

  it('WITNESS_DEV_ADMIN can opt into trusted initiate tier for local admin tooling', () => {
    const id = deriveCallerIdentity({
      headers: { 'x-caller-tier': 'free' },
      env: { WITNESS_DEV_ADMIN: '1', WITNESS_DEV_TIER: 'initiate' },
    });
    assert.equal(id.caller_tier, 'initiate');
    assert.equal(id.caller_is_admin, true);
  });

  it('WITNESS_DEV_ADMIN=0 does NOT promote', () => {
    const id = deriveCallerIdentity({
      headers: {},
      env: { WITNESS_DEV_ADMIN: '0' },
    });
    assert.equal(id.caller_is_admin, false);
  });

  it('uses X-Caller-Id when supplied', () => {
    const id = deriveCallerIdentity({
      headers: { 'x-caller-id': 'admin-jane' },
      env: {},
    });
    assert.equal(id.caller_id, 'admin-jane');
  });

  it('falls back to free tier on unknown tier value', () => {
    const id = deriveCallerIdentity({
      headers: { 'x-caller-tier': 'celestial-pirate' },
      env: {},
    });
    assert.equal(id.caller_tier, 'free');
  });
});

// ════════════════════════════════════════════════════════════════════════
// gateConsciousnessLevelOverride — pure gate function
// ════════════════════════════════════════════════════════════════════════

describe('P2.5 — gateConsciousnessLevelOverride', () => {
  it('non-admin caller + consciousness_level: 5 → 403 FORBIDDEN_LEVEL_OVERRIDE', () => {
    const result = gateConsciousnessLevelOverride(
      { consciousness_level: 5 },
      { caller_id: 'user-1', caller_tier: 'free', caller_is_admin: false },
    );
    assert.notEqual(result, null);
    assert.equal(result?.status, 403);
    assert.equal(result?.body.code, 'FORBIDDEN_LEVEL_OVERRIDE');
    assert.match(result?.body.error ?? '', /admin/i);
  });

  it('subscriber tier + consciousness_level: 3 → 403 (still non-admin)', () => {
    const result = gateConsciousnessLevelOverride(
      { consciousness_level: 3 },
      { caller_id: 'sub-1', caller_tier: 'subscriber', caller_is_admin: false },
    );
    assert.equal(result?.status, 403);
    assert.equal(result?.body.code, 'FORBIDDEN_LEVEL_OVERRIDE');
  });

  it('initiate tier + consciousness_level: 3 → null (passes gate)', () => {
    const result = gateConsciousnessLevelOverride(
      { consciousness_level: 3 },
      { caller_id: 'init-1', caller_tier: 'initiate', caller_is_admin: false },
    );
    assert.equal(result, null);
  });

  it('caller_is_admin=true + consciousness_level: 5 → null (passes gate)', () => {
    const result = gateConsciousnessLevelOverride(
      { consciousness_level: 5 },
      { caller_id: 'admin-1', caller_tier: 'free', caller_is_admin: true },
    );
    assert.equal(result, null);
  });

  it('spoofed HTTP admin/tier headers cannot pass the consciousness_level gate', () => {
    const caller = deriveCallerIdentity({
      headers: {
        'x-caller-admin': 'true',
        'x-caller-tier': 'initiate',
      },
      env: {},
    });
    const result = gateConsciousnessLevelOverride(
      { consciousness_level: 5 },
      caller,
    );
    assert.equal(result?.status, 403);
    assert.equal(result?.body.code, 'FORBIDDEN_LEVEL_OVERRIDE');
  });

  it('no consciousness_level in body → null regardless of caller tier', () => {
    const result = gateConsciousnessLevelOverride(
      { user_id: 'u', mode: 'single' },
      { caller_id: 'anon', caller_tier: 'free', caller_is_admin: false },
    );
    assert.equal(result, null);
  });

  it('consciousness_level: undefined explicitly → null', () => {
    const result = gateConsciousnessLevelOverride(
      { consciousness_level: undefined },
      { caller_id: 'anon', caller_tier: 'free', caller_is_admin: false },
    );
    assert.equal(result, null);
  });
});
