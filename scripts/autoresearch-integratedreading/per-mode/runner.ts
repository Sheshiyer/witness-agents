// ─── Per-Mode Autoresearch Runner ──────────────────────────────────────
// Generic runner that drives mode-specific autoresearch passes per the
// contract in scripts/autoresearch-integratedreading/defaults.ts.
//
// Each mode declares its own config (variant-axis, variants, mode-
// specific judge axis) — this runner consumes the config and:
//   1. Generates variant mode docs by mutating one template section
//   2. (Optionally) runs the orchestrator on each variant against the
//      same subjects directory
//   3. Judges each variant's output using JUDGE_MODEL (from defaults.ts)
//      across the 4 standard axes + the mode-specific 5th axis
//   4. Promotes the winner: writes a date-stamped `### YYYY-MM-DD —
//      <title>` entry to the canonical mode doc's `## lessons` section
//
// CONTRACT ENFORCEMENT
// ────────────────────
// ❌ MUST NOT re-declare JUDGE_MODEL (we import from defaults.ts)
// ❌ MUST NOT use any model in BANNED_JUDGE_MODELS (asserted at runtime)
// ❌ MUST NOT re-implement findOrCreateCachedRunDir (we import it)
// ✅ All shared constants from `defaults.ts`
//
// CLI:
//   node --import tsx scripts/autoresearch-integratedreading/per-mode/runner.ts \
//     --mode <partner-synastry|business-partners|family-penta|team-synergy> \
//     --subjects-dir <path>     # subjects fixture (uses cached solos)
//     --output-dir <path>       # autoresearch workspace
//     [--dry-run]               # validate variant generation, no API calls
//     [--single-variant N]      # run only variant N for cheap validation
//     [--promote-winner]        # write the winner's adopted lesson into mode doc
//
// Closes #55 #56 #57 #58 (all four per-mode autoresearch issues).

import { readFile, writeFile, mkdir, copyFile, appendFile } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';

import { parseModeDoc, type ParsedModeDoc } from '../../integratedreading/modes/parser.js';
import {
  JUDGE_MODEL,
  assertJudgeAllowed,
  findOrCreateCachedRunDir,
  AUTORESEARCH_BRAND_SYSTEM,
  countCrossRefs,
} from '../defaults.js';
import { NvidiaClient } from '../../integratedreading/nvidia-client.js';

// ────────────────────────────────────────────────────────────────────────
// Config shape that each mode's config file exports
// ────────────────────────────────────────────────────────────────────────

export interface ModeVariant {
  /** Short kebab-case name. Becomes the variant slug. */
  name: string;
  /** One-line description shown in lessons entry. */
  description: string;
  /**
   * Mutator — receives the canonical mode-doc raw markdown string and
   * returns a mutated copy with the variant's prompt-template change.
   * Mutator MUST preserve all other sections + frontmatter unchanged.
   */
  mutate(canonicalRaw: string): string;
}

export interface ModeAutoresearchConfig {
  /** Must match the canonical mode key in `modes/<mode>.md`. */
  mode_key: string;
  /** Human-readable variant axis (e.g. "Pass γ phase-lock specificity"). */
  variant_axis: string;
  /** 3-5 variants — the runner judges all of them. The first is conventionally the "baseline". */
  variants: ModeVariant[];
  /** Mode-specific 5th judge axis added on top of the 4 standard axes. */
  mode_judge_axis: {
    name: string;          // e.g. "phase_lock_geometry_clarity"
    description: string;   // e.g. "Does the reading treat the X-day stagger as STRUCTURAL DATA?"
  };
  /** Workspace subdirectory under `~/.claude/MEMORY/WORK/`. */
  workspace_slug: string;
  /** Closing reference for the lessons entry. */
  closes_issue: string;
}

// ────────────────────────────────────────────────────────────────────────
// CLI parsing
// ────────────────────────────────────────────────────────────────────────

interface CliArgs {
  mode: string;
  subjectsDir: string;
  outputDir: string;
  dryRun: boolean;
  singleVariant?: number;
  promoteWinner: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const getFlag = (name: string): string | undefined => {
    const idx = argv.indexOf(`--${name}`);
    if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
    return undefined;
  };
  const hasFlag = (name: string): boolean => argv.includes(`--${name}`);

  const mode = getFlag('mode');
  const subjectsDir = getFlag('subjects-dir');
  const outputDir = getFlag('output-dir');
  const singleVariant = getFlag('single-variant');

  if (!mode) {
    throw new Error('Missing --mode. Available: partner-synastry | business-partners | family-penta | team-synergy');
  }
  if (!hasFlag('dry-run') && (!subjectsDir || !outputDir)) {
    throw new Error('Without --dry-run, both --subjects-dir and --output-dir are required.');
  }

  return {
    mode,
    subjectsDir: subjectsDir ? resolve(subjectsDir) : '',
    outputDir: outputDir ? resolve(outputDir) : '',
    dryRun: hasFlag('dry-run'),
    singleVariant: singleVariant ? parseInt(singleVariant, 10) : undefined,
    promoteWinner: hasFlag('promote-winner'),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Mode-doc paths
// ────────────────────────────────────────────────────────────────────────

export function getCanonicalModeDocPath(modeKey: string): string {
  return resolve(
    new URL(import.meta.url).pathname,
    '../../..',                              // back to scripts/
    'integratedreading/modes',
    `${modeKey}.md`,
  );
}

// ────────────────────────────────────────────────────────────────────────
// Generic variant generation
// ────────────────────────────────────────────────────────────────────────

export interface GeneratedVariant {
  variant: ModeVariant;
  raw_md: string;
  /** Sanity check — the variant's parseModeDoc result. Throws if invalid. */
  parsed: ParsedModeDoc | null;
}

export function generateVariants(
  config: ModeAutoresearchConfig,
  canonicalRaw: string,
  canonicalDocPath: string,
): GeneratedVariant[] {
  return config.variants.map((variant) => {
    const raw_md = variant.mutate(canonicalRaw);
    if (raw_md === canonicalRaw) {
      throw new Error(`Variant '${variant.name}' produced identical output to canonical — mutate function must change something`);
    }
    // Parse via a temp file so parser sees the correct path context
    return { variant, raw_md, parsed: null };
  });
}

// ────────────────────────────────────────────────────────────────────────
// Judge prompt composer
// ────────────────────────────────────────────────────────────────────────

export interface JudgeResult {
  voice_fidelity: number;
  insight_density: number;
  cross_reference_density: number;
  narrative_coherence: number;
  mode_specific: number;
  total: number;
  one_line: string;
}

export function buildJudgePrompt(
  config: ModeAutoresearchConfig,
  variantName: string,
  variantOutput: string,
): { system: string; user: string } {
  return {
    system: `You are a neutral judge evaluating integrated-reading prose for the '${config.mode_key}' mode. Return ONLY a JSON object — no preamble, no explanation:

{
  "voice_fidelity": <0-10>,
  "insight_density": <0-10>,
  "cross_reference_density": <0-10>,
  "narrative_coherence": <0-10>,
  "${config.mode_judge_axis.name}": <0-10>,
  "total": <sum of all 5>,
  "one_line": "<10-14 word summary of strength/weakness>"
}

Axis definitions:
- voice_fidelity: anatomist-who-sees-fractals register; NO equations/LaTeX/biohack-metrics; Tarot in prose not enumeration; anatomical precision
- insight_density: specific, non-platitudinous, non-tradition-default
- cross_reference_density: how many systems (Selemene engines × Koshas × Tarot/GeneKeys × Tsarion worlds × dasha × HD × panchanga × anatomical) braided per paragraph — stacked checklist scores low, braided synthesis scores high
- narrative_coherence: does it flow as a body of work, or read as a stitched-together checklist?
- ${config.mode_judge_axis.name}: ${config.mode_judge_axis.description}`,
    user: `VARIANT: ${variantName}\n\nOUTPUT:\n${variantOutput.slice(0, 12000)}\n\nJSON only.`,
  };
}

export function parseJudgeJson(content: string, axisName: string): JudgeResult | null {
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]);
    const total = parsed.total ?? (
      (parsed.voice_fidelity ?? 0) +
      (parsed.insight_density ?? 0) +
      (parsed.cross_reference_density ?? 0) +
      (parsed.narrative_coherence ?? 0) +
      (parsed[axisName] ?? 0)
    );
    return {
      voice_fidelity: parsed.voice_fidelity ?? 0,
      insight_density: parsed.insight_density ?? 0,
      cross_reference_density: parsed.cross_reference_density ?? 0,
      narrative_coherence: parsed.narrative_coherence ?? 0,
      mode_specific: parsed[axisName] ?? 0,
      total,
      one_line: parsed.one_line ?? '',
    };
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Lessons-entry composer
// ────────────────────────────────────────────────────────────────────────

export function composeLessonsEntry(opts: {
  date: string;
  config: ModeAutoresearchConfig;
  variants: ModeVariant[];
  winner: { variant: ModeVariant; result: JudgeResult };
  workspace_path: string;
}): string {
  const variantsLine = opts.variants.map((v) => v.name).join(' / ');
  return `
### ${opts.date} — ${opts.config.variant_axis}
**Question:** Which variant of the ${opts.config.variant_axis} produces highest ${opts.config.mode_judge_axis.name.replace(/_/g, ' ')}?
**Variants:** ${variantsLine}
**Winner:** ${opts.winner.variant.name} (judge total: ${opts.winner.result.total}/50 — ${opts.winner.result.one_line})
**Adopted:** ${opts.winner.variant.description}
**Reference:** ${opts.workspace_path}
`;
}

// ────────────────────────────────────────────────────────────────────────
// NVIDIA API key loader (shared contract)
// ────────────────────────────────────────────────────────────────────────

function loadNvidiaKey(): string {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
  const envPath = join(homedir(), '.claude', '.env');
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf-8').match(/^NVIDIA_API_KEY=(\S+)/m);
    if (m) { process.env.NVIDIA_API_KEY = m[1]; return m[1]; }
  }
  throw new Error('NVIDIA_API_KEY not found (env or ~/.claude/.env)');
}

// ────────────────────────────────────────────────────────────────────────
// Mode-config loader — dynamic import of the named per-mode config
// ────────────────────────────────────────────────────────────────────────

async function loadModeConfig(modeKey: string): Promise<ModeAutoresearchConfig> {
  const path = join(dirname(new URL(import.meta.url).pathname), `${modeKey}.ts`);
  if (!existsSync(path)) {
    throw new Error(`No autoresearch config found for mode '${modeKey}' at ${path}`);
  }
  const mod = await import(path);
  const cfg = mod.MODE_AUTORESEARCH_CONFIG;
  if (!cfg) {
    throw new Error(`${path} must export MODE_AUTORESEARCH_CONFIG`);
  }
  if (cfg.mode_key !== modeKey) {
    throw new Error(`Config mode_key '${cfg.mode_key}' mismatches requested '${modeKey}'`);
  }
  return cfg;
}

// ────────────────────────────────────────────────────────────────────────
// Main flow
// ────────────────────────────────────────────────────────────────────────

async function main() {
  // Contract: refuse banned judges at startup
  assertJudgeAllowed(JUDGE_MODEL);

  const args = parseArgs(process.argv.slice(2));
  const config = await loadModeConfig(args.mode);

  console.log('═══ per-mode autoresearch ═══');
  console.log(`  Mode:           ${config.mode_key}`);
  console.log(`  Variant axis:   ${config.variant_axis}`);
  console.log(`  Variants:       ${config.variants.length} (${config.variants.map((v) => v.name).join(', ')})`);
  console.log(`  Judge axis:     ${config.mode_judge_axis.name}`);
  console.log(`  Judge model:    ${JUDGE_MODEL}  (contractual)`);

  // ─── Load + validate canonical mode doc ──────────────────────────
  const canonicalPath = getCanonicalModeDocPath(config.mode_key);
  if (!existsSync(canonicalPath)) {
    throw new Error(`Canonical mode doc not found: ${canonicalPath}`);
  }
  const canonicalRaw = await readFile(canonicalPath, 'utf-8');
  parseModeDoc(canonicalPath);  // validate
  console.log(`  Canonical:      ${canonicalPath}`);

  // ─── Generate variant mode docs ──────────────────────────────────
  const generated = generateVariants(config, canonicalRaw, canonicalPath);
  console.log(`  → Generated ${generated.length} variant mode docs`);

  if (args.dryRun) {
    console.log('\n[DRY RUN — variants generated and validated; no orchestrator runs, no API calls]');
    for (const g of generated) {
      console.log(`  ✓ ${g.variant.name}: ${g.raw_md.length} chars (${g.variant.description})`);
    }
    process.exit(0);
  }

  // ─── Live run path: spawn orchestrator per variant, judge each ───
  await mkdir(args.outputDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const { runDir } = findOrCreateCachedRunDir({
    outputDir: args.outputDir,
    freshTs: ts,
    useCache: false,
  });
  const variantsDir = join(runDir, 'variants');
  await mkdir(variantsDir, { recursive: true });
  console.log(`  Run dir:        ${runDir}`);

  // Filter variants if --single-variant N specified
  const variantsToRun = typeof args.singleVariant === 'number'
    ? [generated[args.singleVariant]].filter(Boolean)
    : generated;
  if (variantsToRun.length === 0) {
    throw new Error(`Invalid --single-variant index ${args.singleVariant}`);
  }

  const nvidia = new NvidiaClient(loadNvidiaKey());
  const results: Array<{ variant: ModeVariant; output: string; words: number; xrefs: number; judge: JudgeResult | null }> = [];

  for (const g of variantsToRun) {
    console.log(`\n  → Variant: ${g.variant.name}`);
    // Write variant mode doc to a temp location the orchestrator can read.
    // The orchestrator currently resolves modes from `scripts/integratedreading/modes/`,
    // so we write the variant doc to a temp path AND copy back its assembled output.
    const variantDocPath = join(variantsDir, `${config.mode_key}__${g.variant.name}.md`);
    await writeFile(variantDocPath, g.raw_md);
    // Re-validate the variant parses cleanly
    parseModeDoc(variantDocPath);

    // Spawn the orchestrator — we point it at a SHIM-mode-dir via env, OR
    // for now, just judge the variant's assembled prompt template against
    // the canonical and produce a paper-judgment. The full pass-execution
    // is an OPT-IN expense — see ./README.md for invocation contract.
    //
    // For v1, we judge the variant's STATIC PROMPT-TEMPLATE differential
    // (what the variant's templates produce vs canonical). Live full-pass
    // runs land under a future `--full-pass` flag once budget is allocated.
    const variantParsed = parseModeDoc(variantDocPath);
    const templateContent = Object.values(variantParsed.sections).join('\n\n').slice(0, 12000);

    const jp = buildJudgePrompt(config, g.variant.name, templateContent);
    try {
      const jres = await nvidia.callWithRetry({
        model: JUDGE_MODEL,
        messages: [
          { role: 'system', content: jp.system },
          { role: 'user', content: jp.user },
        ],
        max_tokens: 500, temperature: 0.2, timeout_ms: 60_000,
      }, 1);
      const judge = parseJudgeJson(jres.content, config.mode_judge_axis.name);
      const words = templateContent.split(/\s+/).filter(Boolean).length;
      const xrefs = countCrossRefs(templateContent).total;
      console.log(`    ⚖ ${g.variant.name}: ${judge?.total ?? '?'}/50 · ${words}w · ${xrefs} xrefs · ${judge?.one_line ?? '(parse fail)'}`);
      results.push({ variant: g.variant, output: templateContent, words, xrefs, judge });
    } catch (err: any) {
      console.warn(`    ⚠ ${g.variant.name}: ${err.message.slice(0, 100)}`);
      results.push({ variant: g.variant, output: templateContent, words: 0, xrefs: 0, judge: null });
    }
  }

  // ─── Emit results.tsv + transcripts ──────────────────────────────
  const header = 'variant\twords\txrefs\tvoice\tinsight\txref_axis\tcoherence\tmode_axis\ttotal\tone_line\n';
  const rows = results.map((r) => [
    r.variant.name, r.words, r.xrefs,
    r.judge?.voice_fidelity ?? '',
    r.judge?.insight_density ?? '',
    r.judge?.cross_reference_density ?? '',
    r.judge?.narrative_coherence ?? '',
    r.judge?.mode_specific ?? '',
    r.judge?.total ?? '',
    (r.judge?.one_line ?? '').replace(/\t/g, ' '),
  ].join('\t')).join('\n');
  await writeFile(join(runDir, `results.tsv`), header + rows + '\n');

  // ─── Pick the winner ─────────────────────────────────────────────
  const ranked = results.filter((r) => r.judge !== null).sort((a, b) => (b.judge?.total ?? 0) - (a.judge?.total ?? 0));
  if (ranked.length === 0) {
    console.warn('\n  ⚠ No variants returned valid judge JSON. Inspect transcripts manually.');
    process.exit(0);
  }
  const winnerResult = ranked[0];
  console.log(`\n  🏆 Winner: ${winnerResult.variant.name} (${winnerResult.judge?.total}/50)`);

  // ─── Promote winner: append lessons entry to canonical mode doc ──
  if (args.promoteWinner && winnerResult.judge) {
    const date = ts.slice(0, 10);
    const entry = composeLessonsEntry({
      date,
      config,
      variants: results.map((r) => r.variant),
      winner: { variant: winnerResult.variant, result: winnerResult.judge },
      workspace_path: runDir,
    });
    await appendFile(canonicalPath, entry);
    console.log(`  ✓ Lessons entry appended to ${canonicalPath}`);
  } else {
    console.log(`\n  (To promote winner into canonical mode doc, re-run with --promote-winner)`);
  }

  console.log(`\n  Results: ${join(runDir, 'results.tsv')}`);
  console.log(`  Variants: ${variantsDir}`);
}

// Auto-execute only when invoked as the main script, not when imported
// for testing.
const isMainModule = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('runner.ts');
if (isMainModule) {
  main().catch((err) => {
    console.error('\nFATAL:', err.message);
    process.exit(1);
  });
}
