#!/usr/bin/env node --import tsx
// ─── /integratedreading — Composite Dyad (LEGACY SHIM) ─────────────────
//
// This file is a thin compatibility shim. The canonical implementation now
// lives in `scripts/integratedreading-mode.ts` driven by the mode doc at
// `scripts/integratedreading/modes/composite-dyad.md`.
//
// The shim translates legacy CLI flags (--subject-a / --subject-b /
// --output-dir / --use-cache) into the new orchestrator's contract
// (--mode composite-dyad / --subjects-dir / --output-dir / --use-cache)
// by materializing a temporary subjects-directory.
//
// Preserves CI / external workflows that still invoke this filename
// directly. New work should call `integratedreading-mode.ts` directly.
//
// Closes #41 (P1.4) — composite half.

import { mkdtempSync, copyFileSync, existsSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx > 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const subjectA = getArg('subject-a');
const subjectB = getArg('subject-b');
const outputDir = getArg('output-dir');
const useCache = hasFlag('use-cache');

if (!subjectA || !subjectB || !outputDir) {
  console.error('Usage: integratedreading-composite.ts --subject-a <cfg.json> --subject-b <cfg.json> --output-dir <dir> [--use-cache]');
  console.error('');
  console.error('NOTE: This is a deprecation shim. Prefer:');
  console.error('  integratedreading-mode.ts --mode composite-dyad --subjects-dir <dir> --output-dir <dir>');
  process.exit(1);
}

if (!existsSync(subjectA)) { console.error(`Subject A config not found: ${subjectA}`); process.exit(1); }
if (!existsSync(subjectB)) { console.error(`Subject B config not found: ${subjectB}`); process.exit(1); }

console.warn('[deprecation] integratedreading-composite.ts is a shim — prefer integratedreading-mode.ts --mode composite-dyad');

// Materialize a temporary subjects-directory with the ordinal-prefix convention
const subjectsDir = mkdtempSync(join(tmpdir(), 'composite-dyad-subjects-'));
copyFileSync(resolve(subjectA), join(subjectsDir, '01_' + basename(subjectA)));
copyFileSync(resolve(subjectB), join(subjectsDir, '02_' + basename(subjectB)));

const orchestratorPath = join(dirname(new URL(import.meta.url).pathname), 'integratedreading-mode.ts');
const args = ['--import', 'tsx', orchestratorPath,
  '--mode', 'composite-dyad',
  '--subjects-dir', subjectsDir,
  '--output-dir', resolve(outputDir),
];
if (useCache) args.push('--use-cache');

const proc = spawn('node', args, { stdio: 'inherit' });
proc.on('exit', (code) => process.exit(code ?? 1));
proc.on('error', (err) => { console.error('Failed to spawn orchestrator:', err); process.exit(1); });
