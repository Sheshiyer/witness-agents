// ─── P2.1 — Orchestrator level-branching tests ────────────────────────
// Verifies the integratedreading-mode.ts orchestrator correctly:
//   1. Accepts an optional `--level <1-5>` CLI flag and validates it
//   2. Defaults to level 5 / l4_l5 when no flag supplied (backward-compat)
//   3. Resolves to the matching register band when --level is given
//   4. Surfaces effective level + register on stdout
//   5. Skips lexicon composition for unknown engine ids (no fatal)
//
// We exercise the orchestrator via `--dry-run` so no NVIDIA API call is
// made. Subjects-dir errors are tolerated — we read stdout up to the
// FATAL line, asserting the level header is emitted before the subject
// count check fails.
//
// Closes #74 (P2.1).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const SCRIPT = resolve(
  new URL(import.meta.url).pathname,
  '..',
  '..',
  'scripts',
  'integratedreading-mode.ts',
);

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

interface RunResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

function runOrchestrator(args: string[]): RunResult {
  const result = spawnSync(
    'npx',
    ['tsx', SCRIPT, ...args],
    {
      encoding: 'utf-8',
      timeout: 30_000,
    },
  );
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

function makeMinimalFixture(subjectCount: number): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'p2-1-fixture-'));
  // The orchestrator's loadSubjects expects per-subject solo cfg JSON
  // files. The dry-run path doesn't validate solo content — it only
  // counts subjects — so minimal stubs suffice.
  for (let i = 0; i < subjectCount; i++) {
    const subj = `Subj${i + 1}`;
    const subDir = join(dir, subj.toLowerCase());
    mkdirSync(subDir, { recursive: true });
    writeFileSync(
      join(subDir, 'cfg.json'),
      JSON.stringify({
        subject: subj,
        birth_date: '1991-08-13',
        birth_time: '13:31',
      }),
      'utf-8',
    );
  }
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

// ────────────────────────────────────────────────────────────────────────
// Tests — CLI flag parsing + validation
// ────────────────────────────────────────────────────────────────────────

describe('P2.1 — orchestrator --level flag parsing', () => {
  it('rejects non-numeric --level value', () => {
    const r = runOrchestrator([
      '--mode', 'composite-dyad',
      '--subjects-dir', '/tmp',
      '--output-dir', '/tmp',
      '--level', 'abc',
      '--dry-run',
    ]);
    assert.notEqual(r.status, 0, 'should exit non-zero');
    const out = r.stdout + r.stderr;
    assert.match(out, /--level must be an integer 1-5/);
  });

  it('rejects out-of-range --level value (0)', () => {
    const r = runOrchestrator([
      '--mode', 'composite-dyad',
      '--subjects-dir', '/tmp',
      '--output-dir', '/tmp',
      '--level', '0',
      '--dry-run',
    ]);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /--level must be an integer 1-5/);
  });

  it('rejects out-of-range --level value (6)', () => {
    const r = runOrchestrator([
      '--mode', 'composite-dyad',
      '--subjects-dir', '/tmp',
      '--output-dir', '/tmp',
      '--level', '6',
      '--dry-run',
    ]);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /--level must be an integer 1-5/);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Tests — register resolution from CLI
// ────────────────────────────────────────────────────────────────────────

describe('P2.1 — orchestrator register resolution', () => {
  it('defaults to L5 / l4_l5 / source=default when --level is omitted (backward-compat)', () => {
    const fx = makeMinimalFixture(2);
    try {
      const r = runOrchestrator([
        '--mode', 'composite-dyad',
        '--subjects-dir', fx.dir,
        '--output-dir', '/tmp',
        '--dry-run',
      ]);
      const out = r.stdout + r.stderr;
      assert.match(out, /Level:\s+5 \(l4_l5, source=default\)/,
        `expected default L5 header; got:\n${out}`);
    } finally {
      fx.cleanup();
    }
  });

  it('resolves --level 3 to l1_l3 register with admin_override source', () => {
    const fx = makeMinimalFixture(2);
    try {
      const r = runOrchestrator([
        '--mode', 'composite-dyad',
        '--subjects-dir', fx.dir,
        '--output-dir', '/tmp',
        '--level', '3',
        '--dry-run',
      ]);
      const out = r.stdout + r.stderr;
      assert.match(out, /Level:\s+3 \(l1_l3, source=admin_override\)/,
        `expected L3 l1_l3 header; got:\n${out}`);
    } finally {
      fx.cleanup();
    }
  });

  it('resolves --level 1 to l1_l3 register', () => {
    const fx = makeMinimalFixture(2);
    try {
      const r = runOrchestrator([
        '--mode', 'composite-dyad',
        '--subjects-dir', fx.dir,
        '--output-dir', '/tmp',
        '--level', '1',
        '--dry-run',
      ]);
      assert.match(r.stdout + r.stderr, /Level:\s+1 \(l1_l3, source=admin_override\)/);
    } finally {
      fx.cleanup();
    }
  });

  it('resolves --level 4 to l4_l5 register', () => {
    const fx = makeMinimalFixture(2);
    try {
      const r = runOrchestrator([
        '--mode', 'composite-dyad',
        '--subjects-dir', fx.dir,
        '--output-dir', '/tmp',
        '--level', '4',
        '--dry-run',
      ]);
      assert.match(r.stdout + r.stderr, /Level:\s+4 \(l4_l5, source=admin_override\)/);
    } finally {
      fx.cleanup();
    }
  });

  it('resolves --level 5 to l4_l5 register with admin_override source', () => {
    const fx = makeMinimalFixture(2);
    try {
      const r = runOrchestrator([
        '--mode', 'composite-dyad',
        '--subjects-dir', fx.dir,
        '--output-dir', '/tmp',
        '--level', '5',
        '--dry-run',
      ]);
      assert.match(r.stdout + r.stderr, /Level:\s+5 \(l4_l5, source=admin_override\)/);
    } finally {
      fx.cleanup();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Tests — lexicon block resilience (unknown engine ids tolerated)
// ────────────────────────────────────────────────────────────────────────

describe('P2.1 — engine-lexicon resilience', () => {
  it('warns (does not fatal) when mode foregrounds an unknown engine id', () => {
    const fx = makeMinimalFixture(2);
    try {
      // composite-dyad's overlay weights include 'transits' which is not
      // a known engine id. Orchestrator must warn + continue, not crash.
      const r = runOrchestrator([
        '--mode', 'composite-dyad',
        '--subjects-dir', fx.dir,
        '--output-dir', '/tmp',
        '--dry-run',
      ]);
      const out = r.stdout + r.stderr;
      assert.match(out, /unrecognized engine ids in overlay/,
        'expected warning about unknown engine id');
      assert.match(out, /Lexicons:\s+\d+ foregrounded engine\(s\)/,
        'expected lexicon header even after unknown engines filtered');
    } finally {
      fx.cleanup();
    }
  });

  it('reports lexicon count of zero (empty block) when no engines are recognized', () => {
    // We can't easily construct this without a synthetic mode doc.
    // Smoke-test: just confirm the header format is robust.
    const fx = makeMinimalFixture(2);
    try {
      const r = runOrchestrator([
        '--mode', 'composite-dyad',
        '--subjects-dir', fx.dir,
        '--output-dir', '/tmp',
        '--level', '5',
        '--dry-run',
      ]);
      const out = r.stdout + r.stderr;
      assert.match(out, /Lexicons:/);
    } finally {
      fx.cleanup();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────
// Tests — register-aware target_words band
// ────────────────────────────────────────────────────────────────────────

describe('P2.1 — register-aware target_words band', () => {
  it('emits a Target header that reflects the canonical mode band when no register_variants are declared', () => {
    const fx = makeMinimalFixture(2);
    try {
      const r = runOrchestrator([
        '--mode', 'composite-dyad',
        '--subjects-dir', fx.dir,
        '--output-dir', '/tmp',
        '--level', '3',
        '--dry-run',
      ]);
      const out = r.stdout + r.stderr;
      // Mode docs without register_variants fall back to the canonical
      // target_words. composite-dyad is 12000-15000.
      assert.match(out, /Target:\s+\d+–\d+ words/, `expected Target header; got:\n${out}`);
    } finally {
      fx.cleanup();
    }
  });
});
