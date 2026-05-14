# Mode Document Schema

Reference for authors of new reading-mode documents under `scripts/integratedreading/modes/`. One Markdown file per mode. The unified orchestrator (`scripts/integratedreading-mode.ts`) parses the file at startup via `parser.ts` and drives the entire run from what it finds here.

**Design source:** [docs/plans/2026-05-14-reading-modes-design.md](../../../docs/plans/2026-05-14-reading-modes-design.md) § Section 2.

---

## Structure

Every mode doc has three regions:

1. **YAML frontmatter** between `---` delimiters at the top — declares the mode's contract (subject count, pass plan, overlays, topology).
2. **Body sections** introduced by `## <section-name>` — prose prompt templates the orchestrator interpolates into LLM calls, plus advisory sections like glossary and interactions.
3. **Lessons section** (`## lessons`) at the bottom — autoresearch-appended findings the orchestrator compresses into the system prompt as "what we've learned about this mode" memory.

A mode doc that fails any structural rule below will fail at parse time, not at the first LLM call. Errors surface a path to the design doc.

---

## Frontmatter — required fields

```yaml
---
mode: partner-synastry                   # canonical mode key — matches CLI --mode flag + filename stem
subject_count:                           # accepted subject count range
  min: 2
  max: 2
roles:                                   # ordinal slot labels — purely descriptive
  - partner-A
  - partner-B
target_words:                            # acceptable output size range
  min: 12000
  max: 15000
architecture: linear                     # "linear" (default) or "hierarchical"
pass_plan:                               # ordered list of synthesis passes
  - id: alpha
    title: "Cross-Chart Structural Field"
    target_words: 3000
    template: pass-alpha-template        # name of a ## section below (no leading '##')
    model: openai/gpt-oss-120b           # optional — falls back to SYNTH_MODELS.PRIMARY
  - id: beta
    title: "Pair-Resonance Threads"
    target_words: 3500
    template: pass-beta-template
  - id: gamma
    title: "Phase-Lock Geometry"
    target_words: 3500
    template: pass-gamma-template
  - id: delta
    title: "Relational Anti-Dependency Milestones"
    target_words: 3000
    template: pass-delta-template
engine_overlay_weights:                  # 0.0 ignore · 1.0 baseline · 2.0 foreground
  tarot: 2.0
  human-design: 2.0
  gene-keys: 1.5
  vimshottari: 1.5
  panchanga: 0.5
  nadabrahman: 0.5
house_overlay: [7, 11, 12, 5, 2]         # Vedic houses to foreground
bridge_mandates:                         # mode-specific four-way triangulation rules
  - "Every major claim must braid: Vedic-7th × Tarot-relational × HD-electromagnetic-channel × dasha-anchor"
svg_topology: dyad-arc                   # one of: dyad-arc | triad-triangle | pentagon | web-graph
---
```

### Field reference

| Field | Type | Notes |
|---|---|---|
| `mode` | string | Canonical key. Filename stem must match (e.g. `partner-synastry.md` → `mode: partner-synastry`). |
| `subject_count` | `{min: number, max: number}` | Inclusive range. `min === max` for fixed-N modes like family-penta (5). |
| `roles` | string[] | Ordinal labels — descriptive only; subject identity comes from each cfg's `subject` field. |
| `target_words` | `{min: number, max: number}` | Acceptance gate on assembled output. |
| `architecture` | `"linear"` \| `"hierarchical"` | Linear = sequential passes. Hierarchical = outline pass first, then expansion passes that reference it. |
| `pass_plan` | `PassSpec[]` | Ordered list, 3-6 entries typical. Each `template` must resolve to a `## section-name` in the body. |
| `engine_overlay_weights` | `Record<string, number>` | Keyed by Selemene engine id (kebab-case). Missing engines default to 1.0. |
| `house_overlay` | `number[]` | Vedic house numbers (1-12). |
| `bridge_mandates` | `string[]` | Mode-specific 4-way triangulation rules. Folded into every pass system prompt. |
| `svg_topology` | `TopologyKey` | One of `dyad-arc` / `triad-triangle` / `pentagon` / `web-graph`. Routes to the matching renderer in `render/svg/index.ts`. |

### Pass spec fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Short identifier (`alpha`, `beta`, `outline`, `exp1`, etc). Used in logs + cache filenames. |
| `title` | string | Human-readable pass name. Shown in console output + assembled report headings. |
| `target_words` | number | Per-pass target. Sum across all passes should fall inside `target_words` range. |
| `template` | string | Name of a `## <name>` body section. Must exist or parse fails. |
| `model` | string \| undefined | Optional NVIDIA model override. Defaults to `SYNTH_MODELS.PRIMARY` from autoresearch contract. |

---

## Body sections

The orchestrator consumes these by `## section-name` (case-insensitive, lowercase-hyphenated as the parse key).

### Required

- **`## pass-<id>-template`** — one per entry in `pass_plan`. Prose prompt template. Available interpolation slots:
  - `{{subject_names}}` — comma-separated list of subject names (in declared role order)
  - `{{prior_pass}}` — last 4000 chars of accumulated output from earlier passes; empty on the first pass
  - `{{lessons_summary}}` — compressed `## lessons` section (5 most recent entries) injected as "prior autoresearch findings" memory
  - `{{overlay_summary}}` — derived summary of `engine_overlay_weights` + `house_overlay` for the system prompt
  - `{{bridge_mandates}}` — pre-formatted list of bridge mandates from frontmatter

### Recommended

- **`## overlay-rules`** — narrative explanation of what the engine/house overlays mean for this mode. The orchestrator folds this into the system prompt as guidance.
- **`## glossary`** — mode-specific anchor phrases the synthesis should reach for. Helps the dyad voice stay in mode-native register.
- **`## interactions`** — describes the scroll-driven affordances + GSAP timelines for the interactive HTML output (read by `render/interactions/<mode>.ts` in Phase 2+).

### Always present (may be empty initially)

- **`## lessons`** — autoresearch-appended findings, date-stamped. Append-only over time.

---

## Lessons section format

Each entry is a `### YYYY-MM-DD — <title>` heading followed by bold fields. The parser extracts the fields into structured `LessonsEntry` objects; missing fields are tolerated (lessons are advisory, not contractual).

```markdown
## lessons

### 2026-05-20 — Pass γ phase-lock specificity
**Question:** Does mandating concrete dasha-stagger-day-counts in Pass γ raise phase-lock-geometry clarity?
**Variants:** baseline / explicit-day-count / explicit-day-count + transit-overlay
**Winner:** explicit-day-count + transit-overlay (judge: 28.5/40 vs baseline 24/40)
**Adopted:** Pass γ template now requires "the X-day stagger between [P1 dasha pivot] and [P2 dasha pivot]" as a structural anchor.
**Reference:** ~/.claude/MEMORY/WORK/autoresearch-partner-synastry-2026-05-20/

### 2026-06-03 — Bridge mandate strictness
**Question:** ...
```

Field meanings:

| Field | Required? | Purpose |
|---|---|---|
| Date | yes (in heading) | Sort order + auditability |
| Title | yes (in heading) | Short label for the finding |
| Question | recommended | What the autoresearch pass was testing |
| Variants | recommended | Comma- or slash-separated list of variants tested |
| Winner | recommended | The variant that won |
| Adopted | recommended | What change actually landed in the mode doc |
| Reference | recommended | Path to the autoresearch workspace with full transcripts + judge results |

---

## Validation rules (enforced by parser)

The parser fails fast on:

1. Missing leading `---` frontmatter delimiter
2. Missing closing `---` frontmatter delimiter
3. Malformed YAML in frontmatter
4. Missing any required frontmatter key (`mode`, `subject_count`, `roles`, `target_words`, `architecture`, `pass_plan`, `engine_overlay_weights`, `house_overlay`, `bridge_mandates`, `svg_topology`)
5. `svg_topology` not in `{dyad-arc, triad-triangle, pentagon, web-graph}`
6. `architecture` not in `{linear, hierarchical}`
7. Empty `pass_plan`
8. Pass entry missing `id` / `title` / `template` / `target_words`
9. `subject_count.min > subject_count.max`
10. Any `pass_plan[].template` that doesn't resolve to a `## <name>` section in the body

Out of scope for validation (intentionally — these are autoresearch-tuneable):
- Engine overlay weight values
- House overlay numbers
- Bridge mandate prose quality
- Pass target_words summing exactly to `target_words` range (advisory guidance, judged at run time)

---

## Authoring a new mode

1. Copy `partner-synastry.md` (once it lands in P3.1) as a template — closest in structure.
2. Update frontmatter for the new mode's contract.
3. Write the body templates — each `## pass-<id>-template` is a complete prompt that ends with `{{prior_pass}}` and any mode-specific instructions.
4. Add `## overlay-rules`, `## glossary`, `## interactions` (these can start as placeholders).
5. Leave `## lessons` empty.
6. Run `npx tsx scripts/integratedreading-mode.ts --mode <new-mode> --subjects-dir <fixture>` against a fixture; check the metric report at end of run.
7. Once stable, kick off the per-mode autoresearch (Phase 6) — variants get appended to `## lessons` automatically.

---

## See also

- [parser.ts](parser.ts) — the parser implementation (P0.1 deliverable)
- [render/svg/index.ts](../render/svg/index.ts) — topology → renderer map (P0.2 deliverable)
- [defaults.ts](../../autoresearch-integratedreading/defaults.ts) — pinned `JUDGE_MODEL`, `SYNTH_MODELS`, shared helpers
- [SKILL.md](../../../.claude/skills/integratedreading/SKILL.md) — full skill spec including the Multi-Model Routing table + Autoresearch Contract
- [Design doc](../../../docs/plans/2026-05-14-reading-modes-design.md) — the validated design this schema derives from
