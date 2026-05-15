// ─── P1 — Consciousness-Level Contract Tests ──────────────────────────
// Covers all 4 Phase 1 contracts for the consciousness-level register
// system: level-resolver (1.1), mode-doc register-variant schema (1.2),
// engine-lexicons schema (1.3), API request/response types (1.4).
//
// Closes #70, #71, #72, #73 (verification half).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  resolveLevel,
  isCallerAdmin,
  levelToRegisterBand,
  ForbiddenLevelOverrideError,
  InvalidConsciousnessLevelError,
  type ConsciousnessLevel,
} from '../scripts/integratedreading/level-resolver.js';
import {
  parseModeDoc,
  getPassTemplate,
  getTargetWordsForRegister,
} from '../scripts/integratedreading/modes/parser.js';
import {
  getEngineLexicon,
  composeLexiconBlock,
  parseLexicons,
  clearLexiconCache,
  KNOWN_ENGINE_IDS,
} from '../scripts/integratedreading/engine-lexicons-parser.js';
import type {
  ReadingRequest,
  ReadingResponse,
  CallerIdentity,
} from '../src/types/reading-request.js';

// ════════════════════════════════════════════════════════════════════════
// P1.1 — Level resolver (#70)
// ════════════════════════════════════════════════════════════════════════

describe('P1.1 — resolveLevel', () => {
  it('admin caller (initiate tier) with admin_override → returns the override', () => {
    const r = resolveLevel({
      user_id: 'user-1',
      admin_override: 3,
      caller_tier: 'initiate',
    });
    assert.equal(r.effective_level, 3);
    assert.equal(r.source, 'admin_override');
    assert.equal(r.register_band, 'l1_l3');
  });

  it('admin caller (caller_is_admin) with admin_override → returns the override', () => {
    const r = resolveLevel({
      user_id: 'user-1',
      admin_override: 5,
      caller_tier: 'free',
      caller_is_admin: true,
    });
    assert.equal(r.effective_level, 5);
    assert.equal(r.source, 'admin_override');
    assert.equal(r.register_band, 'l4_l5');
  });

  it('non-admin caller with admin_override → throws ForbiddenLevelOverrideError', () => {
    assert.throws(
      () => resolveLevel({
        user_id: 'user-1',
        admin_override: 5,
        caller_tier: 'subscriber',
      }),
      (err: any) => {
        return err instanceof ForbiddenLevelOverrideError && err.status === 403;
      },
    );
  });

  it('non-admin caller with admin_override (free tier) → throws', () => {
    assert.throws(
      () => resolveLevel({
        user_id: 'user-1',
        admin_override: 3,
        caller_tier: 'free',
        caller_is_admin: false,
      }),
      ForbiddenLevelOverrideError,
    );
  });

  it('normal user (no override, no admin) → resolves via user_db_lookup', () => {
    const r = resolveLevel({
      user_id: 'user-1',
      user_db_lookup: (id) => (id === 'user-1' ? 2 : undefined),
    });
    assert.equal(r.effective_level, 2);
    assert.equal(r.source, 'user_db');
    assert.equal(r.register_band, 'l1_l3');
  });

  it('user not in DB → falls back to default level (1)', () => {
    const r = resolveLevel({
      user_id: 'unknown',
      user_db_lookup: () => undefined,
    });
    assert.equal(r.effective_level, 1);
    assert.equal(r.source, 'default');
    assert.equal(r.register_band, 'l1_l3');
  });

  it('user not in DB, custom default_level → uses that default', () => {
    const r = resolveLevel({
      user_id: 'unknown',
      default_level: 4,
    });
    assert.equal(r.effective_level, 4);
    assert.equal(r.source, 'default');
    assert.equal(r.register_band, 'l4_l5');
  });

  it('invalid admin_override (0) → throws InvalidConsciousnessLevelError', () => {
    assert.throws(
      () => resolveLevel({
        user_id: 'u',
        admin_override: 0,
        caller_tier: 'initiate',
      }),
      InvalidConsciousnessLevelError,
    );
  });

  it('invalid admin_override (6) → throws', () => {
    assert.throws(
      () => resolveLevel({
        user_id: 'u',
        admin_override: 6,
        caller_tier: 'initiate',
      }),
      InvalidConsciousnessLevelError,
    );
  });

  it('invalid admin_override (string) → throws', () => {
    assert.throws(
      () => resolveLevel({
        user_id: 'u',
        admin_override: '3' as any,
        caller_tier: 'initiate',
      }),
      InvalidConsciousnessLevelError,
    );
  });

  it('user_db_lookup returns invalid level → throws', () => {
    assert.throws(
      () => resolveLevel({
        user_id: 'u',
        user_db_lookup: () => 99,
      }),
      InvalidConsciousnessLevelError,
    );
  });

  it('invalid default_level → throws', () => {
    assert.throws(
      () => resolveLevel({
        user_id: 'u',
        default_level: 0,
      }),
      InvalidConsciousnessLevelError,
    );
  });

  it('admin_override: null is treated as "not set" (falls back to lookup)', () => {
    const r = resolveLevel({
      user_id: 'u',
      admin_override: null as any,
      user_db_lookup: () => 4,
    });
    assert.equal(r.source, 'user_db');
    assert.equal(r.effective_level, 4);
  });
});

describe('P1.1 — isCallerAdmin helper', () => {
  it('initiate tier → true', () => {
    assert.equal(isCallerAdmin({ caller_tier: 'initiate' }), true);
  });
  it('caller_is_admin flag → true', () => {
    assert.equal(isCallerAdmin({ caller_tier: 'free', caller_is_admin: true }), true);
  });
  it('subscriber/enterprise → false', () => {
    assert.equal(isCallerAdmin({ caller_tier: 'subscriber' }), false);
    assert.equal(isCallerAdmin({ caller_tier: 'enterprise' }), false);
  });
  it('no tier, no admin flag → false', () => {
    assert.equal(isCallerAdmin({}), false);
  });
});

describe('P1.1 — levelToRegisterBand', () => {
  it('1, 2, 3 → l1_l3', () => {
    assert.equal(levelToRegisterBand(1), 'l1_l3');
    assert.equal(levelToRegisterBand(2), 'l1_l3');
    assert.equal(levelToRegisterBand(3), 'l1_l3');
  });
  it('4, 5 → l4_l5', () => {
    assert.equal(levelToRegisterBand(4), 'l4_l5');
    assert.equal(levelToRegisterBand(5), 'l4_l5');
  });
});

// ════════════════════════════════════════════════════════════════════════
// P1.2 — Mode-doc register-variant schema (#71)
// ════════════════════════════════════════════════════════════════════════

function makeTempDoc(content: string): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'mode-doc-register-test-'));
  const path = join(dir, 'sample.md');
  writeFileSync(path, content, 'utf-8');
  return { path, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const DOC_WITH_VARIANTS = `---
mode: test-mode
subject_count: { min: 2, max: 2 }
roles: [a, b]
target_words: { min: 12000, max: 15000 }
architecture: linear
pass_plan:
  - id: alpha
    title: Alpha
    target_words: 6000
    template: pass-alpha-template
  - id: beta
    title: Beta
    target_words: 6000
    template: pass-beta-template
engine_overlay_weights:
  tarot: 2.0
house_overlay: [7]
bridge_mandates:
  - mandate-x
svg_topology: dyad-arc
register_variants:
  l1_l3:
    target_words:
      min: 9000
      max: 11000
    overrides:
      - pass_id: alpha
        template: pass-alpha-template-l1-l3
  l4_l5:
    target_words:
      min: 12000
      max: 15000
---

## pass-alpha-template

L5 alpha template body.

## pass-alpha-template-l1-l3

L1-L3 alpha template body.

## pass-beta-template

Beta template body.
`;

const DOC_WITHOUT_VARIANTS = `---
mode: legacy-mode
subject_count: { min: 2, max: 2 }
roles: [a, b]
target_words: { min: 12000, max: 15000 }
architecture: linear
pass_plan:
  - id: alpha
    title: Alpha
    target_words: 6000
    template: pass-alpha-template
engine_overlay_weights: { tarot: 1.0 }
house_overlay: [7]
bridge_mandates: [mandate]
svg_topology: dyad-arc
---

## pass-alpha-template

legacy body
`;

describe('P1.2 — register_variants parsing', () => {
  it('parses register_variants block when present', () => {
    const { path, cleanup } = makeTempDoc(DOC_WITH_VARIANTS);
    try {
      const doc = parseModeDoc(path);
      assert.ok(doc.frontmatter.register_variants);
      assert.equal(doc.frontmatter.register_variants?.l1_l3?.target_words?.min, 9000);
      assert.equal(doc.frontmatter.register_variants?.l1_l3?.overrides?.length, 1);
      assert.equal(doc.frontmatter.register_variants?.l1_l3?.overrides?.[0].pass_id, 'alpha');
    } finally {
      cleanup();
    }
  });

  it('mode doc WITHOUT register_variants parses cleanly (backward-compat)', () => {
    const { path, cleanup } = makeTempDoc(DOC_WITHOUT_VARIANTS);
    try {
      const doc = parseModeDoc(path);
      assert.equal(doc.frontmatter.register_variants, undefined);
    } finally {
      cleanup();
    }
  });

  it('throws when register_variants override pass_id not in pass_plan', () => {
    const bad = DOC_WITH_VARIANTS.replace('pass_id: alpha', 'pass_id: nonexistent');
    const { path, cleanup } = makeTempDoc(bad);
    try {
      assert.throws(() => parseModeDoc(path), /pass_id 'nonexistent' has no matching pass/);
    } finally {
      cleanup();
    }
  });

  it('throws when register_variants override template has no body section', () => {
    const bad = DOC_WITH_VARIANTS.replace(
      'template: pass-alpha-template-l1-l3',
      'template: nonexistent-template',
    );
    const { path, cleanup } = makeTempDoc(bad);
    try {
      assert.throws(() => parseModeDoc(path), /no '## nonexistent-template' section/);
    } finally {
      cleanup();
    }
  });
});

describe('P1.2 — getPassTemplate resolves correctly per register', () => {
  it('l1_l3 register returns overridden template', () => {
    const { path, cleanup } = makeTempDoc(DOC_WITH_VARIANTS);
    try {
      const doc = parseModeDoc(path);
      const template = getPassTemplate(doc, 'alpha', 'l1_l3');
      assert.match(template, /L1-L3 alpha template body/);
    } finally {
      cleanup();
    }
  });

  it('l4_l5 register falls back to canonical pass_plan template', () => {
    const { path, cleanup } = makeTempDoc(DOC_WITH_VARIANTS);
    try {
      const doc = parseModeDoc(path);
      const template = getPassTemplate(doc, 'alpha', 'l4_l5');
      assert.match(template, /L5 alpha template body/);
    } finally {
      cleanup();
    }
  });

  it('pass not in overrides falls back to canonical template', () => {
    const { path, cleanup } = makeTempDoc(DOC_WITH_VARIANTS);
    try {
      const doc = parseModeDoc(path);
      const template = getPassTemplate(doc, 'beta', 'l1_l3');  // beta not in l1_l3.overrides
      assert.match(template, /Beta template body/);
    } finally {
      cleanup();
    }
  });

  it('mode doc without register_variants falls back to canonical for both bands', () => {
    const { path, cleanup } = makeTempDoc(DOC_WITHOUT_VARIANTS);
    try {
      const doc = parseModeDoc(path);
      const t1 = getPassTemplate(doc, 'alpha', 'l1_l3');
      const t2 = getPassTemplate(doc, 'alpha', 'l4_l5');
      assert.equal(t1, t2);
      assert.match(t1, /legacy body/);
    } finally {
      cleanup();
    }
  });

  it('throws on unknown pass_id', () => {
    const { path, cleanup } = makeTempDoc(DOC_WITH_VARIANTS);
    try {
      const doc = parseModeDoc(path);
      assert.throws(() => getPassTemplate(doc, 'gamma', 'l1_l3'), /No pass with id 'gamma'/);
    } finally {
      cleanup();
    }
  });
});

describe('P1.2 — getTargetWordsForRegister', () => {
  it('returns variant-specific target_words when declared', () => {
    const { path, cleanup } = makeTempDoc(DOC_WITH_VARIANTS);
    try {
      const doc = parseModeDoc(path);
      assert.deepEqual(getTargetWordsForRegister(doc, 'l1_l3'), { min: 9000, max: 11000 });
      assert.deepEqual(getTargetWordsForRegister(doc, 'l4_l5'), { min: 12000, max: 15000 });
    } finally {
      cleanup();
    }
  });

  it('falls back to canonical target_words when variant absent', () => {
    const { path, cleanup } = makeTempDoc(DOC_WITHOUT_VARIANTS);
    try {
      const doc = parseModeDoc(path);
      assert.deepEqual(getTargetWordsForRegister(doc, 'l1_l3'), { min: 12000, max: 15000 });
      assert.deepEqual(getTargetWordsForRegister(doc, 'l4_l5'), { min: 12000, max: 15000 });
    } finally {
      cleanup();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// P1.3 — Engine lexicons parser (#72)
// ════════════════════════════════════════════════════════════════════════

const FIXTURE_LEXICONS_MD = `# Engine Lexicons (test fixture)

## vimshottari

### L1-L3 register
**Vocabulary**
Mahadasha · Antardasha · Pratyantar

**Voice rules**
- Use traditional dasha vocabulary
- Allow Sanskrit anchors

### L4-L5 register
**Vocabulary**
phase-lock geometry · Cl(3) Vijnanamaya

**Voice rules**
- Framework-native register

## human-design

### L1-L3 register
**Vocabulary**
Type · Strategy · Authority · Centers

**Voice rules**
- Use HD traditional vocabulary

### L4-L5 register
**Vocabulary**
electromagnetic channels · Pranamaya routing

**Voice rules**
- Framework-native

## Lessons (autoresearch-appended)
none yet
`;

describe('P1.3 — engine-lexicons-parser', () => {
  it('parses all engine sections from a fixture file', () => {
    const { path, cleanup } = makeTempDoc(FIXTURE_LEXICONS_MD);
    try {
      clearLexiconCache();
      const parsed = parseLexicons(path);
      assert.ok(parsed.engines.vimshottari);
      assert.ok(parsed.engines['human-design']);
    } finally {
      cleanup();
      clearLexiconCache();
    }
  });

  it('skips non-engine sections (e.g., Lessons)', () => {
    const { path, cleanup } = makeTempDoc(FIXTURE_LEXICONS_MD);
    try {
      clearLexiconCache();
      const parsed = parseLexicons(path);
      assert.equal(parsed.engines.lessons, undefined);
    } finally {
      cleanup();
      clearLexiconCache();
    }
  });

  it('extracts vocab + voice_rules per register band', () => {
    const { path, cleanup } = makeTempDoc(FIXTURE_LEXICONS_MD);
    try {
      clearLexiconCache();
      const lex = getEngineLexicon('vimshottari', 'l1_l3', path);
      assert.match(lex.vocab, /Mahadasha · Antardasha/);
      assert.match(lex.voice_rules, /traditional dasha vocabulary/);
    } finally {
      cleanup();
      clearLexiconCache();
    }
  });

  it('returns distinct content for l1_l3 vs l4_l5', () => {
    const { path, cleanup } = makeTempDoc(FIXTURE_LEXICONS_MD);
    try {
      clearLexiconCache();
      const l1 = getEngineLexicon('vimshottari', 'l1_l3', path);
      const l5 = getEngineLexicon('vimshottari', 'l4_l5', path);
      assert.notEqual(l1.vocab, l5.vocab);
      assert.match(l5.vocab, /phase-lock geometry/);
    } finally {
      cleanup();
      clearLexiconCache();
    }
  });

  it('throws on unknown engine_id', () => {
    const { path, cleanup } = makeTempDoc(FIXTURE_LEXICONS_MD);
    try {
      clearLexiconCache();
      assert.throws(() => getEngineLexicon('unknown-engine' as any, 'l1_l3', path), /Unknown engine_id/);
    } finally {
      cleanup();
      clearLexiconCache();
    }
  });

  it('returns empty content for engines absent from the fixture (graceful degrade)', () => {
    const { path, cleanup } = makeTempDoc(FIXTURE_LEXICONS_MD);
    try {
      clearLexiconCache();
      const lex = getEngineLexicon('gene-keys', 'l1_l3', path);
      assert.equal(lex.vocab, '');
      assert.equal(lex.voice_rules, '');
    } finally {
      cleanup();
      clearLexiconCache();
    }
  });

  it('composeLexiconBlock combines multiple engines into one system-prompt block', () => {
    const { path, cleanup } = makeTempDoc(FIXTURE_LEXICONS_MD);
    try {
      clearLexiconCache();
      const block = composeLexiconBlock(['vimshottari', 'human-design'], 'l1_l3', path);
      assert.match(block, /Engine Lexicons \(l1_l3\)/);
      assert.match(block, /vimshottari \(l1_l3\)/);
      assert.match(block, /human-design \(l1_l3\)/);
      assert.match(block, /Mahadasha/);
      assert.match(block, /Type · Strategy/);
    } finally {
      cleanup();
      clearLexiconCache();
    }
  });

  it('KNOWN_ENGINE_IDS has all 16 Selemene engines', () => {
    assert.equal(KNOWN_ENGINE_IDS.length, 16);
    for (const required of ['vimshottari', 'panchanga', 'human-design', 'gene-keys', 'tarot', 'i-ching']) {
      assert.ok((KNOWN_ENGINE_IDS as ReadonlyArray<string>).includes(required), `missing ${required}`);
    }
  });

  it('canonical engine-lexicons.md exists + parses cleanly (skeleton from P1.3)', () => {
    clearLexiconCache();
    const parsed = parseLexicons();   // uses default path
    // Skeleton has all 16 engine headings, even if their content is TBD
    for (const engine_id of KNOWN_ENGINE_IDS) {
      assert.ok(
        parsed.engines[engine_id] !== undefined,
        `Skeleton missing engine section: ${engine_id}`,
      );
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// P1.4 — API request/response contract (#73)
// ════════════════════════════════════════════════════════════════════════

describe('P1.4 — Reading request/response types compile + have expected shape', () => {
  it('ReadingRequest accepts admin override field', () => {
    const req: ReadingRequest = {
      user_id: 'u1',
      mode: 'partner-synastry',
      subjects: [{ profile_id: 'p1' }, { profile_id: 'p2' }],
      consciousness_level: 3,
    };
    assert.equal(req.consciousness_level, 3);
  });

  it('ReadingRequest accepts inline subject birth data', () => {
    const req: ReadingRequest = {
      user_id: 'u1',
      mode: 'composite-dyad',
      subjects: [
        { subject: 'Alice', birth_date: '1990-01-01', birth_time: '12:00' },
        { profile_id: 'p2' },
      ],
    };
    assert.equal(req.subjects.length, 2);
  });

  it('ReadingResponse carries effective_consciousness_level + level_source + register_band', () => {
    const res: ReadingResponse = {
      reading_id: 'r1',
      effective_consciousness_level: 3,
      level_source: 'user_db',
      register_band: 'l1_l3',
      mode: 'partner-synastry',
      total_words: 10000,
      pass_metrics: [],
      generated_at: '2026-05-15T00:00:00Z',
    };
    assert.equal(res.effective_consciousness_level, 3);
    assert.equal(res.level_source, 'user_db');
    assert.equal(res.register_band, 'l1_l3');
  });

  it('CallerIdentity is distinct from ReadingRequest (server-derived)', () => {
    const caller: CallerIdentity = {
      caller_id: 'admin-1',
      caller_tier: 'initiate',
      caller_is_admin: true,
    };
    assert.equal(caller.caller_tier, 'initiate');
  });
});
