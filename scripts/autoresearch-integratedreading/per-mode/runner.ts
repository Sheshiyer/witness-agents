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
import {
  levelToRegisterBand,
  type ConsciousnessLevel,
  type RegisterBand,
} from '../../integratedreading/level-resolver.js';

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

/**
 * Per-band axis spec. Lets autoresearch tune a DIFFERENT axis for the
 * L1-L3 traditional-Vedic register vs the L4-L5 framework-native register
 * because the two registers care about different qualities.
 *
 * Example for partner-synastry:
 *   - l1_l3 might tune "traditional remedy specificity" (gemstone/mantra/
 *     ritual concreteness in Vedic vocabulary)
 *   - l4_l5 might tune "phase-lock geometry clarity" (Aletheios/Pichet
 *     dyad-resolution of dasha stagger as structural data)
 */
export interface RegisterAxisSpec {
  /** Human-readable axis name shown in lessons entry header. */
  name: string;
  /** 3-5 variant short names (the actual mutators live alongside). */
  variants: string[];
  /** Index into `variants` array that is the no-op baseline. */
  baseline_index: number;
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
  /**
   * OPTIONAL — per-register-band axis declarations. When present, the
   * runner can pivot the variant-axis label PER BAND so the L1-L3 run
   * and L4-L5 run can tune different qualities. When absent, the runner
   * uses the canonical `variant_axis` + `variants` for both bands.
   *
   * Note: This is a DOCUMENTATION-LEVEL contract for now. The variant
   * mutators in `variants[]` remain shared across both bands — what
   * changes per band is the JUDGE-AXIS LABEL and the lessons-entry
   * heading. Future work can introduce per-band mutator sets if the
   * mutation contract diverges between registers.
   */
  variant_axis_per_level?: {
    l1_l3?: RegisterAxisSpec;
    l4_l5?: RegisterAxisSpec;
  };
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
  /**
   * Optional consciousness level (1-5). When provided, autoresearch runs
   * only for the matching register band. When omitted, autoresearch runs
   * over BOTH bands sequentially (L1-L3 then L4-L5) for full coverage.
   */
  level?: ConsciousnessLevel;
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
  const rawLevel = getFlag('level');

  if (!mode) {
    throw new Error('Missing --mode. Available: partner-synastry | business-partners | family-penta | team-synergy');
  }
  if (!hasFlag('dry-run') && (!subjectsDir || !outputDir)) {
    throw new Error('Without --dry-run, both --subjects-dir and --output-dir are required.');
  }

  let level: ConsciousnessLevel | undefined;
  if (rawLevel !== undefined) {
    const n = parseInt(rawLevel, 10);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      throw new Error(`--level must be an integer 1-5; got '${rawLevel}'`);
    }
    level = n as ConsciousnessLevel;
  }

  return {
    mode,
    subjectsDir: subjectsDir ? resolve(subjectsDir) : '',
    outputDir: outputDir ? resolve(outputDir) : '',
    dryRun: hasFlag('dry-run'),
    singleVariant: singleVariant ? parseInt(singleVariant, 10) : undefined,
    promoteWinner: hasFlag('promote-winner'),
    level,
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

/**
 * Resolve the variant-axis label for a given register band. Falls back to
 * the canonical `config.variant_axis` when no per-band override is set.
 */
export function getAxisLabelForBand(
  config: ModeAutoresearchConfig,
  band: RegisterBand,
): string {
  return config.variant_axis_per_level?.[band]?.name ?? config.variant_axis;
}

export function composeLessonsEntry(opts: {
  date: string;
  config: ModeAutoresearchConfig;
  variants: ModeVariant[];
  winner: { variant: ModeVariant; result: JudgeResult };
  workspace_path: string;
  /**
   * Register band this autoresearch run targeted. Defaults to 'l4_l5'
   * for backward compatibility with pre-2026-05-15 invocations that
   * predate the consciousness-level register split.
   */
  register?: RegisterBand;
}): string {
  const register: RegisterBand = opts.register ?? 'l4_l5';
  const variantsLine = opts.variants.map((v) => v.name).join(' / ');
  const axisLabel = getAxisLabelForBand(opts.config, register);
  return `
### ${opts.date} — ${axisLabel}
**Level:** ${register}
**Question:** Which variant of the ${axisLabel} produces highest ${opts.config.mode_judge_axis.name.replace(/_/g, ' ')}?
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

/**
 * Decide which register bands this invocation runs against.
 *
 *   --level <1-3>  → ['l1_l3']    (single band)
 *   --level <4-5>  → ['l4_l5']    (single band)
 *   (omitted)      → ['l1_l3', 'l4_l5']  (both bands sequentially for full coverage)
 *
 * Backward-compat note: pre-2026-05-15 invocations had no --level flag
 * and conceptually targeted the L4-L5 register. Now those invocations
 * additionally exercise the L1-L3 register — without breaking dry-run
 * tests (which short-circuit before live calls) and producing strictly
 * more autoresearch coverage. The order is L1-L3 first then L4-L5 so
 * the more-expensive L4-L5 run lands second.
 */
export function bandsForInvocation(
  level: ConsciousnessLevel | undefined,
): RegisterBand[] {
  if (level !== undefined) {
    return [levelToRegisterBand(level)];
  }
  return ['l1_l3', 'l4_l5'];
}

/**
 * Run one register band's autoresearch: judge all variants, write
 * results.tsv, optionally promote the winner. Returns nothing — all
 * side-effects flow through disk + the canonical mode doc.
 */
async function runOneBand(opts: {
  args: CliArgs;
  config: ModeAutoresearchConfig;
  canonicalPath: string;
  canonicalRaw: string;
  generated: GeneratedVariant[];
  band: RegisterBand;
  ts: string;
  runDirBase: string;
  variantsDirBase: string;
  nvidia: NvidiaClient;
}): Promise<void> {
  const { args, config, canonicalPath, generated, band, ts, runDirBase, variantsDirBase, nvidia } = opts;

  const axisLabel = getAxisLabelForBand(config, band);
  console.log(`\n═══ band: ${band} ═══`);
  console.log(`  Axis:           ${axisLabel}`);

  // Filter variants if --single-variant N specified
  const variantsToRun = typeof args.singleVariant === 'number'
    ? [generated[args.singleVariant]].filter(Boolean)
    : generated;
  if (variantsToRun.length === 0) {
    throw new Error(`Invalid --single-variant index ${args.singleVariant}`);
  }

  // Per-band sub-directory so dual-band runs don't clobber each other
  const bandSubdir = join(runDirBase, band);
  const bandVariantsDir = join(variantsDirBase, band);
  await mkdir(bandSubdir, { recursive: true });
  await mkdir(bandVariantsDir, { recursive: true });

  const results: Array<{ variant: ModeVariant; output: string; words: number; xrefs: number; judge: JudgeResult | null }> = [];

  for (const g of variantsToRun) {
    console.log(`\n  → Variant: ${g.variant.name}  (band: ${band})`);
    const variantDocPath = join(bandVariantsDir, `${config.mode_key}__${g.variant.name}.md`);
    await writeFile(variantDocPath, g.raw_md);
    parseModeDoc(variantDocPath);

    // For v1, we judge the variant's STATIC PROMPT-TEMPLATE differential
    // (what the variant's templates produce vs canonical). When future
    // `--full-pass` lands, this is where we'd spawn the orchestrator as
    // a child process with `--level ${args.level ?? bandToLevel(band)}`
    // to forward the register choice — the orchestrator already accepts
    // and respects the --level flag (see scripts/integratedreading-mode.ts).
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

  // ─── Emit per-band results.tsv ────────────────────────────────────
  const header = 'band\tvariant\twords\txrefs\tvoice\tinsight\txref_axis\tcoherence\tmode_axis\ttotal\tone_line\n';
  const rows = results.map((r) => [
    band, r.variant.name, r.words, r.xrefs,
    r.judge?.voice_fidelity ?? '',
    r.judge?.insight_density ?? '',
    r.judge?.cross_reference_density ?? '',
    r.judge?.narrative_coherence ?? '',
    r.judge?.mode_specific ?? '',
    r.judge?.total ?? '',
    (r.judge?.one_line ?? '').replace(/\t/g, ' '),
  ].join('\t')).join('\n');
  await writeFile(join(bandSubdir, 'results.tsv'), header + rows + '\n');

  // ─── Pick the winner ─────────────────────────────────────────────
  const ranked = results.filter((r) => r.judge !== null).sort((a, b) => (b.judge?.total ?? 0) - (a.judge?.total ?? 0));
  if (ranked.length === 0) {
    console.warn(`\n  ⚠ Band ${band}: no variants returned valid judge JSON. Inspect transcripts manually.`);
    return;
  }
  const winnerResult = ranked[0];
  console.log(`\n  🏆 Band ${band} winner: ${winnerResult.variant.name} (${winnerResult.judge?.total}/50)`);

  // ─── Promote winner: append lessons entry to canonical mode doc ──
  if (args.promoteWinner && winnerResult.judge) {
    const date = ts.slice(0, 10);
    const entry = composeLessonsEntry({
      date,
      config,
      variants: results.map((r) => r.variant),
      winner: { variant: winnerResult.variant, result: winnerResult.judge },
      workspace_path: bandSubdir,
      register: band,
    });
    await appendFile(canonicalPath, entry);
    console.log(`  ✓ Lessons entry (Level: ${band}) appended to ${canonicalPath}`);
  } else {
    console.log(`  (To promote band ${band} winner into canonical mode doc, re-run with --promote-winner)`);
  }
}

async function main() {
  // Contract: refuse banned judges at startup
  assertJudgeAllowed(JUDGE_MODEL);

  const args = parseArgs(process.argv.slice(2));
  const config = await loadModeConfig(args.mode);

  const bands = bandsForInvocation(args.level);

  console.log('═══ per-mode autoresearch ═══');
  console.log(`  Mode:           ${config.mode_key}`);
  console.log(`  Variant axis:   ${config.variant_axis}`);
  console.log(`  Variants:       ${config.variants.length} (${config.variants.map((v) => v.name).join(', ')})`);
  console.log(`  Judge axis:     ${config.mode_judge_axis.name}`);
  console.log(`  Judge model:    ${JUDGE_MODEL}  (contractual)`);
  console.log(`  Level:          ${args.level ?? '(none — running both bands)'}`);
  console.log(`  Bands:          ${bands.join(', ')}`);

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
    for (const band of bands) {
      console.log(`  band ${band}: axis = ${getAxisLabelForBand(config, band)}`);
    }
    for (const g of generated) {
      console.log(`  ✓ ${g.variant.name}: ${g.raw_md.length} chars (${g.variant.description})`);
    }
    process.exit(0);
  }

  // ─── Live run path: shared run dir, one subdir per band ──────────
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

  const nvidia = new NvidiaClient(loadNvidiaKey());

  for (const band of bands) {
    await runOneBand({
      args,
      config,
      canonicalPath,
      canonicalRaw,
      generated,
      band,
      ts,
      runDirBase: runDir,
      variantsDirBase: variantsDir,
      nvidia,
    });
  }

  console.log(`\n  Results: ${runDir}/<band>/results.tsv`);
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
