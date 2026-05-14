// ─── P6 — Per-Mode Autoresearch tests ──────────────────────────────────
// Covers #55 #56 #57 #58 — autoresearch configs + generic runner.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  MODE_AUTORESEARCH_CONFIG as synastryConfig,
} from '../scripts/autoresearch-integratedreading/per-mode/partner-synastry.js';
import {
  MODE_AUTORESEARCH_CONFIG as businessConfig,
} from '../scripts/autoresearch-integratedreading/per-mode/business-partners.js';
import {
  MODE_AUTORESEARCH_CONFIG as familyConfig,
} from '../scripts/autoresearch-integratedreading/per-mode/family-penta.js';
import {
  MODE_AUTORESEARCH_CONFIG as teamConfig,
} from '../scripts/autoresearch-integratedreading/per-mode/team-synergy.js';
import {
  parseArgs,
  getCanonicalModeDocPath,
  generateVariants,
  buildJudgePrompt,
  parseJudgeJson,
  composeLessonsEntry,
  type ModeAutoresearchConfig,
} from '../scripts/autoresearch-integratedreading/per-mode/runner.js';
import { appendToSection } from '../scripts/autoresearch-integratedreading/per-mode/_mutators.js';
import {
  JUDGE_MODEL,
  BANNED_JUDGE_MODELS,
} from '../scripts/autoresearch-integratedreading/defaults.js';

const ALL_CONFIGS: ModeAutoresearchConfig[] = [synastryConfig, businessConfig, familyConfig, teamConfig];

// ────────────────────────────────────────────────────────────────────────
// Each mode config exports the expected shape
// ────────────────────────────────────────────────────────────────────────

describe('Per-mode autoresearch configs (P6)', () => {
  it('partner-synastry config has correct mode_key', () => {
    assert.equal(synastryConfig.mode_key, 'partner-synastry');
  });
  it('business-partners config has correct mode_key', () => {
    assert.equal(businessConfig.mode_key, 'business-partners');
  });
  it('family-penta config has correct mode_key', () => {
    assert.equal(familyConfig.mode_key, 'family-penta');
  });
  it('team-synergy config has correct mode_key', () => {
    assert.equal(teamConfig.mode_key, 'team-synergy');
  });

  it('every config declares 3+ variants', () => {
    for (const cfg of ALL_CONFIGS) {
      assert.ok(cfg.variants.length >= 3, `${cfg.mode_key} only has ${cfg.variants.length} variants`);
    }
  });

  it('linear-axis configs (synastry, business) use "baseline" as first variant', () => {
    // Modes with a clear baseline-vs-extensions axis name the first variant 'baseline'.
    // Family-penta + team-synergy are radial axes (no natural baseline) so they skip this convention.
    assert.equal(synastryConfig.variants[0].name, 'baseline');
    assert.equal(businessConfig.variants[0].name, 'baseline');
  });

  it('every variant name is kebab-case (used as a slug)', () => {
    for (const cfg of ALL_CONFIGS) {
      for (const v of cfg.variants) {
        assert.match(v.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${cfg.mode_key} variant name '${v.name}' is not kebab-case`);
      }
    }
  });

  it('every variant has a mutate() function', () => {
    for (const cfg of ALL_CONFIGS) {
      for (const v of cfg.variants) {
        assert.equal(typeof v.mutate, 'function', `${cfg.mode_key} ${v.name} missing mutate`);
      }
    }
  });

  it('every config declares a mode-specific judge axis', () => {
    for (const cfg of ALL_CONFIGS) {
      assert.ok(cfg.mode_judge_axis.name, `${cfg.mode_key} missing mode_judge_axis.name`);
      assert.ok(cfg.mode_judge_axis.description, `${cfg.mode_key} missing mode_judge_axis.description`);
      // axis names must be snake_case identifiers (used as JSON keys)
      assert.match(cfg.mode_judge_axis.name, /^[a-z_]+$/, `${cfg.mode_key}: axis name not snake_case`);
    }
  });

  it('every config declares the closes-issue reference', () => {
    for (const cfg of ALL_CONFIGS) {
      assert.match(cfg.closes_issue, /^#\d+$/, `${cfg.mode_key}: closes_issue should be #NN`);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Variant mutators actually mutate the input
// ────────────────────────────────────────────────────────────────────────

describe('Variant mutators are non-identity', () => {
  // We test against a synthetic mode doc since the actual modes/<key>.md
  // files are checked in.
  const SYNTHETIC_DOC = `---
mode: x
subject_count: { min: 2, max: 2 }
roles: [a, b]
target_words: { min: 12000, max: 15000 }
architecture: linear
pass_plan:
  - id: alpha
    title: T
    target_words: 3000
    template: pass-alpha-template
  - id: gamma
    title: T
    target_words: 3000
    template: pass-gamma-template
  - id: outline
    title: T
    target_words: 1500
    template: pass-outline-template
engine_overlay_weights: { x: 1.0 }
house_overlay: [1]
bridge_mandates: [m]
svg_topology: dyad-arc
---

## pass-alpha-template

alpha body

## pass-gamma-template

gamma body

## pass-outline-template

outline body
`;

  it('partner-synastry variants all produce distinct output from canonical', () => {
    for (const v of synastryConfig.variants) {
      const result = v.mutate(SYNTHETIC_DOC);
      assert.notEqual(result, SYNTHETIC_DOC, `synastry ${v.name} did not mutate`);
    }
  });
  it('business-partners variants all produce distinct output', () => {
    for (const v of businessConfig.variants) {
      const result = v.mutate(SYNTHETIC_DOC);
      assert.notEqual(result, SYNTHETIC_DOC, `business ${v.name} did not mutate`);
    }
  });
  it('family-penta variants all produce distinct output', () => {
    for (const v of familyConfig.variants) {
      const result = v.mutate(SYNTHETIC_DOC);
      assert.notEqual(result, SYNTHETIC_DOC, `family ${v.name} did not mutate`);
    }
  });
  it('team-synergy variants all produce distinct output', () => {
    for (const v of teamConfig.variants) {
      const result = v.mutate(SYNTHETIC_DOC);
      assert.notEqual(result, SYNTHETIC_DOC, `team ${v.name} did not mutate`);
    }
  });

  it('non-baseline variants append meaningful constraint text', () => {
    for (const cfg of ALL_CONFIGS) {
      for (const v of cfg.variants.slice(1)) {  // skip baseline
        const result = v.mutate(SYNTHETIC_DOC);
        assert.match(result, /ADDITIONAL CONSTRAINT/, `${cfg.mode_key} ${v.name} doesn't append a constraint`);
      }
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// generateVariants helper
// ────────────────────────────────────────────────────────────────────────

describe('generateVariants', () => {
  const SYNTHETIC = '---\nmode: x\n---\n\n## pass-gamma-template\n\ngamma body\n';

  it('generates one entry per variant', () => {
    const fakeConfig: ModeAutoresearchConfig = {
      mode_key: 'x',
      variant_axis: 'test',
      workspace_slug: 'test',
      closes_issue: '#0',
      mode_judge_axis: { name: 'x_axis', description: 'x' },
      variants: [
        { name: 'a', description: 'desc-a', mutate: (raw) => raw + ' a' },
        { name: 'b', description: 'desc-b', mutate: (raw) => raw + ' b' },
      ],
    };
    const generated = generateVariants(fakeConfig, SYNTHETIC, '/tmp/fake');
    assert.equal(generated.length, 2);
    assert.equal(generated[0].variant.name, 'a');
    assert.equal(generated[1].variant.name, 'b');
  });

  it('throws when a variant\'s mutator returns identical input', () => {
    const badConfig: ModeAutoresearchConfig = {
      mode_key: 'x',
      variant_axis: 'test',
      workspace_slug: 'test',
      closes_issue: '#0',
      mode_judge_axis: { name: 'x', description: 'x' },
      variants: [
        { name: 'identity', description: 'broken', mutate: (raw) => raw },
      ],
    };
    assert.throws(() => generateVariants(badConfig, SYNTHETIC, '/tmp'), /identical output/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// appendToSection helper
// ────────────────────────────────────────────────────────────────────────

describe('appendToSection mutator helper', () => {
  const DOC = `---\nfm: 1\n---\n\n## section-one\n\nbody one\n\n## section-two\n\nbody two\n`;

  it('appends text after the named section\'s body, before next ## header', () => {
    const result = appendToSection(DOC, 'section-one', 'APPENDED');
    assert.match(result, /body one[\s\S]*APPENDED[\s\S]*## section-two/);
  });

  it('preserves other sections unchanged', () => {
    const result = appendToSection(DOC, 'section-one', 'X');
    assert.match(result, /## section-two\s+body two/);
  });

  it('throws when section not found', () => {
    assert.throws(() => appendToSection(DOC, 'nonexistent', 'X'), /not found/);
  });

  it('appends to the LAST section when target is final', () => {
    const result = appendToSection(DOC, 'section-two', 'TAIL_APPEND');
    assert.match(result, /body two[\s\S]*TAIL_APPEND/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// CLI parseArgs
// ────────────────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('requires --mode', () => {
    assert.throws(() => parseArgs([]), /Missing --mode/);
  });

  it('--dry-run passes without --subjects-dir / --output-dir', () => {
    const args = parseArgs(['--mode', 'partner-synastry', '--dry-run']);
    assert.equal(args.mode, 'partner-synastry');
    assert.equal(args.dryRun, true);
  });

  it('requires --subjects-dir + --output-dir without --dry-run', () => {
    assert.throws(
      () => parseArgs(['--mode', 'partner-synastry']),
      /both.*--subjects-dir.*--output-dir.*required/,
    );
  });

  it('--single-variant parses to number', () => {
    const args = parseArgs(['--mode', 'x', '--dry-run', '--single-variant', '2']);
    assert.equal(args.singleVariant, 2);
  });

  it('--promote-winner sets flag', () => {
    const args = parseArgs(['--mode', 'x', '--dry-run', '--promote-winner']);
    assert.equal(args.promoteWinner, true);
  });
});

// ────────────────────────────────────────────────────────────────────────
// getCanonicalModeDocPath resolves to scripts/integratedreading/modes/
// ────────────────────────────────────────────────────────────────────────

describe('getCanonicalModeDocPath', () => {
  it('points at the correct canonical mode doc location', () => {
    const path = getCanonicalModeDocPath('partner-synastry');
    assert.match(path, /scripts\/integratedreading\/modes\/partner-synastry\.md$/);
  });

  it('every config\'s canonical mode doc exists on disk', () => {
    for (const cfg of ALL_CONFIGS) {
      const path = getCanonicalModeDocPath(cfg.mode_key);
      const raw = readFileSync(path, 'utf-8');
      assert.match(raw, new RegExp(`^---\\s*\\n[\\s\\S]*mode:\\s*${cfg.mode_key}`));
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Judge prompt composer
// ────────────────────────────────────────────────────────────────────────

describe('buildJudgePrompt + parseJudgeJson', () => {
  it('includes the mode-specific axis in the system prompt', () => {
    const prompt = buildJudgePrompt(synastryConfig, 'baseline', 'sample output');
    assert.match(prompt.system, /phase_lock_geometry_clarity/);
    assert.match(prompt.system, /STRUCTURAL DATA/);
  });

  it('includes all 4 standard axes', () => {
    const prompt = buildJudgePrompt(synastryConfig, 'x', 'y');
    assert.match(prompt.system, /voice_fidelity/);
    assert.match(prompt.system, /insight_density/);
    assert.match(prompt.system, /cross_reference_density/);
    assert.match(prompt.system, /narrative_coherence/);
  });

  it('asks for JSON only, no preamble', () => {
    const prompt = buildJudgePrompt(synastryConfig, 'x', 'y');
    assert.match(prompt.system, /JSON object.*no preamble/i);
  });

  it('parseJudgeJson extracts all 5 axes + total + one_line', () => {
    const raw = JSON.stringify({
      voice_fidelity: 7,
      insight_density: 8,
      cross_reference_density: 6,
      narrative_coherence: 7,
      phase_lock_geometry_clarity: 9,
      one_line: 'Strong day-count specificity throughout.',
    });
    const parsed = parseJudgeJson(raw, 'phase_lock_geometry_clarity');
    assert.equal(parsed?.voice_fidelity, 7);
    assert.equal(parsed?.insight_density, 8);
    assert.equal(parsed?.cross_reference_density, 6);
    assert.equal(parsed?.narrative_coherence, 7);
    assert.equal(parsed?.mode_specific, 9);
    assert.equal(parsed?.total, 7 + 8 + 6 + 7 + 9);
    assert.match(parsed?.one_line ?? '', /day-count/);
  });

  it('parseJudgeJson handles JSON wrapped in prose', () => {
    const wrapped = 'Here are my scores: ' + JSON.stringify({
      voice_fidelity: 5, insight_density: 5, cross_reference_density: 5,
      narrative_coherence: 5, phase_lock_geometry_clarity: 5, one_line: 'meh',
    }) + ' done.';
    const parsed = parseJudgeJson(wrapped, 'phase_lock_geometry_clarity');
    assert.equal(parsed?.total, 25);
  });

  it('parseJudgeJson returns null on malformed input', () => {
    assert.equal(parseJudgeJson('no json here', 'phase_lock_geometry_clarity'), null);
  });
});

// ────────────────────────────────────────────────────────────────────────
// composeLessonsEntry — format matches the lessons-section contract
// ────────────────────────────────────────────────────────────────────────

describe('composeLessonsEntry', () => {
  const entry = composeLessonsEntry({
    date: '2026-05-15',
    config: synastryConfig,
    variants: synastryConfig.variants,
    winner: {
      variant: synastryConfig.variants[2],
      result: {
        voice_fidelity: 8,
        insight_density: 9,
        cross_reference_density: 8,
        narrative_coherence: 8,
        mode_specific: 10,
        total: 43,
        one_line: 'Explicit day-count + transit-overlay wins decisively.',
      },
    },
    workspace_path: '~/.claude/MEMORY/WORK/autoresearch-partner-synastry-2026-05-15',
  });

  it('emits the date-stamped ### heading format', () => {
    assert.match(entry, /### 2026-05-15 —/);
  });

  it('names all variants in the Variants field', () => {
    for (const v of synastryConfig.variants) {
      assert.ok(entry.includes(v.name), `entry missing variant: ${v.name}`);
    }
  });

  it('includes Winner / Adopted / Reference bold fields', () => {
    assert.match(entry, /\*\*Winner:\*\*/);
    assert.match(entry, /\*\*Adopted:\*\*/);
    assert.match(entry, /\*\*Reference:\*\*/);
  });

  it('reports the winner\'s total score', () => {
    assert.match(entry, /43\/50/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Contract enforcement
// ────────────────────────────────────────────────────────────────────────

describe('Autoresearch contract — runner enforces defaults.ts', () => {
  it('JUDGE_MODEL imports from defaults.ts (not re-declared)', () => {
    // Read runner.ts source to confirm it imports JUDGE_MODEL.
    const runnerSrc = readFileSync(
      resolve('scripts/autoresearch-integratedreading/per-mode/runner.ts'),
      'utf-8',
    );
    assert.match(runnerSrc, /from ['"]\.\.\/defaults\.js['"]/);
    assert.match(runnerSrc, /JUDGE_MODEL/);
    assert.match(runnerSrc, /assertJudgeAllowed/);
  });

  it('runner does NOT redeclare JUDGE_MODEL', () => {
    const runnerSrc = readFileSync(
      resolve('scripts/autoresearch-integratedreading/per-mode/runner.ts'),
      'utf-8',
    );
    // Should NOT contain `const JUDGE_MODEL =` at the source level
    assert.ok(!runnerSrc.match(/const JUDGE_MODEL\s*=/));
  });

  it('JUDGE_MODEL is the contractual gpt-oss-20b value', () => {
    assert.equal(JUDGE_MODEL, 'openai/gpt-oss-20b');
  });

  it('BANNED_JUDGE_MODELS contains nemotron (re-trapped 2026-05-13)', () => {
    assert.ok(BANNED_JUDGE_MODELS.includes('nvidia/nemotron-3-super-120b-a12b'));
  });

  it('runner imports findOrCreateCachedRunDir + countCrossRefs from defaults', () => {
    const runnerSrc = readFileSync(
      resolve('scripts/autoresearch-integratedreading/per-mode/runner.ts'),
      'utf-8',
    );
    assert.match(runnerSrc, /findOrCreateCachedRunDir/);
    assert.match(runnerSrc, /countCrossRefs/);
  });
});
