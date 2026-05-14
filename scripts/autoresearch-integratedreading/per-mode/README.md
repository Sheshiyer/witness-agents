# Per-Mode Autoresearch Runners

Closes #55 #56 #57 #58 — Phase 6 of the reading-modes plan.

The autoresearch loop refines mode docs (not orchestrator code) by spawning variant mode docs that mutate one template section, judging the variants with the contractual `JUDGE_MODEL` from `../defaults.ts` (`openai/gpt-oss-20b`), and promoting the winner's edits + lessons entry back into the canonical mode doc.

## Quick Reference

| Mode | Config file | Issue | Variant axis | Mode-specific judge axis |
|---|---|---|---|---|
| partner-synastry | `partner-synastry.ts` | #55 | Pass γ phase-lock specificity | `phase_lock_geometry_clarity` |
| business-partners | `business-partners.ts` | #56 | Pass γ failure-mode specificity | `operational_specificity` |
| family-penta | `family-penta.ts` | #57 | Pass α lineage-current strength (4th vs 9th vs 12th house emphasis) | `lineage_current_legibility` |
| team-synergy | `team-synergy.ts` | #58 | Outline-pass prompt phrasing | `role_cluster_legibility` |

## Invocation

### Dry-run — validate variant generation without any API calls

```bash
node --import tsx scripts/autoresearch-integratedreading/per-mode/runner.ts \
  --mode partner-synastry \
  --dry-run
```

Validates that each variant's `mutate()` function produces a syntactically distinct mode-doc + that the result still parses cleanly via `parseModeDoc`. Use this to sanity-check a new variant before paying for API time.

### Single-variant — run one variant for cheap validation

```bash
node --import tsx scripts/autoresearch-integratedreading/per-mode/runner.ts \
  --mode family-penta \
  --subjects-dir /path/to/5-subject-fixture \
  --output-dir ~/.claude/MEMORY/WORK/autoresearch-family-penta-2026-05-15 \
  --single-variant 0
```

Index into the variants array. Useful for testing the judge pipeline end-to-end with minimal cost.

### Full pass — run all variants + judge + select winner

```bash
node --import tsx scripts/autoresearch-integratedreading/per-mode/runner.ts \
  --mode partner-synastry \
  --subjects-dir /path/to/2-subject-fixture \
  --output-dir ~/.claude/MEMORY/WORK/autoresearch-partner-synastry-YYYY-MM-DD
```

Runs every variant, judges each with `JUDGE_MODEL`, writes `results.tsv`, identifies the winner. Does NOT modify the canonical mode doc unless `--promote-winner` is passed.

### Promote winner — append lessons entry to canonical mode doc

```bash
node --import tsx scripts/autoresearch-integratedreading/per-mode/runner.ts \
  --mode partner-synastry \
  --subjects-dir <path> \
  --output-dir <workspace> \
  --promote-winner
```

After the full pass completes, this writes a date-stamped `### YYYY-MM-DD —` entry to the canonical mode doc's `## lessons` section. The orchestrator picks this up automatically on the next live run via `summarizeLessons` and prepends it to the system prompt as "what we've learned about this mode" memory.

## Contract Enforcement

The runner imports + uses these from `../defaults.ts`:

- **`JUDGE_MODEL`** = `openai/gpt-oss-20b` — re-declaring is a contract violation
- **`assertJudgeAllowed()`** — runtime check; refuses any model in `BANNED_JUDGE_MODELS`
- **`findOrCreateCachedRunDir()`** — shared run-dir helper
- **`AUTORESEARCH_BRAND_SYSTEM`** — voice anchor (drift-resistant)
- **`countCrossRefs()`** — cross-reference density metric

If a future autoresearch runner is written without importing from `defaults.ts`, treat that as a code-review red flag.

## Variant Authoring Contract

When adding a new variant to an existing config or designing a new mode's config:

1. **Each variant's `mutate()` MUST change the input.** The runner explicitly rejects identity mutators (returning the canonical raw unchanged).
2. **Variants should change ONE thing only.** Two variables changed at once = uninterpretable judge result.
3. **The first variant should be the `baseline`.** It captures the canonical state for comparison. Implement baseline as a no-op comment append (so `mutate()` is non-identity but semantically null).
4. **Use the `appendToSection` helper** from `_mutators.ts` to keep mutations targeted to one template section. Don't rewrite the whole mode doc.
5. **Mode-specific judge axis must be ORTHOGONAL** to the 4 standard axes (voice / insight / cross-ref-density / coherence). The 5th axis tests something the canonical judge rubric doesn't catch.

## Workspace Layout

```
~/.claude/MEMORY/WORK/autoresearch-<mode>-<date>/
├── results.tsv                          # 5-axis judge scores + word/xref counts
├── variants/
│   ├── <mode>__baseline.md              # mutated mode docs
│   ├── <mode>__variant-A.md
│   └── ...
└── (transcripts of variant outputs land here in --full-pass mode)
```

## Open Questions (post-P6)

- **Full-pass orchestrator integration.** The current `runner.ts` judges the variant's prompt-template differential rather than running the full orchestrator on each variant. The latter is more accurate but ~5× the API spend. A `--full-pass` flag that subprocesses `integratedreading-mode.ts` per variant is a future enhancement once token budget is allocated for it.
- **Cross-judge cross-validation.** The 2026-05-13 autoresearch found that even `gpt-oss-20b` (the contractual judge) returns ~80% parse-fail rate on long-input prompts. A future enhancement: spawn a 2nd judge (different family) on each variant and compare. Adds cost but catches judge artifacts.
- **Auto-replay loop.** Once a mode has 3+ autoresearch passes recorded in `## lessons`, the orchestrator's system prompt may carry contradictory guidance. A future enhancement: detect contradictions and surface them for manual reconciliation.

## References

- Design doc: [`docs/plans/2026-05-14-reading-modes-design.md`](../../../docs/plans/2026-05-14-reading-modes-design.md) § Section 4 — Cross-Mode Autoresearch Loop + Lessons Writeback
- Autoresearch contract: [`../defaults.ts`](../defaults.ts)
- Prior workspace: `~/.claude/MEMORY/WORK/autoresearch-integratedreading-15k-2026-05-13/`
- Skill doc: [`.claude/skills/integratedreading/SKILL.md`](../../../.claude/skills/integratedreading/SKILL.md) § "Autoresearch Contract (Mandatory, Hardened 2026-05-13)"
