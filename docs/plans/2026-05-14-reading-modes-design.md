# Integrated-Reading Modes Design — Synastry · Business · Family-Penta · Team-Synergy

**Date:** 2026-05-14
**Status:** Design — validated section-by-section in brainstorming, awaiting implementation start
**Authors:** Sheshnarayan Iyer (principal), Claude Opus 4.7 (drafting)
**Project:** witness-agents · scripts/integratedreading/
**Predecessor PR:** [#26](https://github.com/Sheshiyer/witness-agents/pull/26) — editorial-grade pipeline + autoresearch contract

---

## Context

The `/integratedreading` pipeline currently delivers three modes:

| Mode | Subjects | Words delivered | Architecture |
|---|---:|---:|---|
| Solo | 1 | 11,558 – 12,705 | 3-pass synthesis (Opening+I-IV / V-VIII / IX-XI) |
| Composite Dyad | 2 | 4,721 | Single-pass composite |
| Triad | 3 | 4,244 | Single-pass composite |

The composite/triad outputs under-deliver versus their 5-7k word target because they run **single-pass** over 30k+ words of upstream solo synthesis — the same `max_tokens=8192` ceiling that solos hit before we switched to 3-pass.

This document designs **four new/extended modes** that each deliver **12,000-15,000 meaningful words** via a unified orchestrator, where mode-specific knowledge lives in Markdown documents rather than code. Each mode declares its own pass plan, engine overlays, house overlays, cross-system bridge mandates, and SVG topology in a single mode doc that the autoresearch loop refines over time.

The four modes:

1. **Partner-Synastry** — 2 subjects, romantic/relational
2. **Business-Partners** — 2-3 subjects, co-founder / operating-partner
3. **Family-Penta** — 5 subjects, kinship system
4. **Team-Synergy** — 4-12 subjects, working team / collective

---

## Design Decisions Locked In Brainstorming

| Decision | Choice | Rationale |
|---|---|---|
| Orchestrator architecture | **One unified runner** parameterized by `--mode <name>` | Mode docs evolve via autoresearch without code changes; one contract consumer |
| Mode-doc format | **One Markdown file per mode** with YAML frontmatter + named sections | Matches "documents the orchestrator runs through" framing; lessons sit alongside config in human-readable form |
| Pass-decomposition | **Variable pass count per mode (3-6)** declared in frontmatter as an ordered list | Modes have different natural depth structures; same orchestrator code, mode doc drives the loop |
| Subject input | **Subjects directory** with `01_*.json` lexical ordering | Scales to any N; ordering preserved via filename prefix; no metadata file needed |
| Missing-solo handling | **Auto-chain solos** in parallel before multi-pass composite | One command builds full report; cache makes subsequent runs fast |
| Primary output | **Interactive HTML** with scroll-driven animations + JS interactivity | Not limited by PDF; full leverage of CSS scroll-timeline + GSAP + inline JS |
| PDF role | **Derivative archive** via `@media print` flattening animations | PDF remains for printing/distribution but is no longer the primary experience |

---

## Section 1 — Orchestrator Architecture

**One unified runner**: `scripts/integratedreading-mode.ts`.

### CLI shape

```bash
node --import tsx scripts/integratedreading-mode.ts \
  --mode <partner-synastry|business-partners|family-penta|team-synergy> \
  --subjects-dir <path>      # contains 01_*.json, 02_*.json, ... (lexical order)
  --output-dir <path>        # holds .runs/, html, pdf
  [--use-cache]              # honors findOrCreateCachedRunDir helper
  [--skip-solos]             # opt-out of auto-chain if solos already exist elsewhere
```

### Main loop

1. **Load mode doc** — read `scripts/integratedreading/modes/<mode>.md`. Parse frontmatter (config) + named sections (prompt templates, overlay rules, lessons). A small `modes/parser.ts` returns `{frontmatter, sections, lessons}`.

2. **Load subjects** — `readdirSync(subjects_dir).filter(/^\d+_.+\.json$/).sort()` gives ordered subject configs. Validate `subject_count` range from mode frontmatter; fail with a clear error if subject count is wrong.

3. **Auto-chain solos** — for each subject, check `findLatestRun(cfg.output_dir, slug)` for the canonical `06_synthesis_<slug>.md`. If missing, spawn `integratedreading-full.ts` as a child process in parallel (`Promise.all`). Block until all solos exist. `--skip-solos` bypasses this and assumes solos are pre-built.

4. **Run mode passes** — iterate `pass_plan` from frontmatter. For each pass:
   - Build prompt from named template section in the mode doc.
   - Interpolate `{{subject_names}}`, `{{prior_pass}}` (last 4000 chars of accumulated output), `{{lessons_summary}}` (compressed `## lessons` section).
   - Apply engine/house overlays (filter & weight engine outputs from each subject's cached solo run).
   - Call NVIDIA model — default `SYNTH_MODELS.PRIMARY` from `defaults.ts`, override per pass if declared.
   - Append to assembled output.

5. **Render** — pick SVG topology from frontmatter (`dyad-arc` / `triad-triangle` / `pentagon` / `web-graph`), assemble interactive HTML via `render/templates.ts`, optionally export print-PDF via Chrome headless.

### Contract calls (all from `defaults.ts`)

- `findOrCreateCachedRunDir({outputDir, useCache, cacheFileName})` for run-dir resolution.
- `AUTORESEARCH_BRAND_SYSTEM` as the system anchor (with `ANATOMIST_PERSONA + KOSHA_GRAMMAR + DYADIC_LOOP` appended for the dyad voice).
- `countCrossRefs(assembled)` for the post-run metric report (per-pass + total cross-reference density).
- `JUDGE_MODEL` if the autoresearch loop is in the call.

The orchestrator code is ~250 LOC. All mode-specific knowledge lives in mode docs, not orchestrator code.

---

## Section 2 — Mode Document Schema

**File location:** `scripts/integratedreading/modes/<mode>.md`. One file = one mode.

### Frontmatter (YAML)

```yaml
---
mode: partner-synastry
subject_count: { min: 2, max: 2 }
roles: ["partner-A", "partner-B"]      # ordinal slots; subject identity in each cfg's `subject` field
target_words: { min: 12000, max: 15000 }
architecture: linear                    # or "hierarchical" for outline-first modes
pass_plan:
  - id: alpha
    title: "Cross-Chart Structural Field"
    target_words: 3000
    template: pass-alpha-template       # section anchor in this same file
    model: openai/gpt-oss-120b          # optional; falls back to SYNTH_MODELS.PRIMARY
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
engine_overlay_weights:                 # 0.0 = ignore, 1.0 = baseline, 2.0 = foreground
  vimshottari: 1.5
  tarot: 2.0
  human-design: 2.0
  gene-keys: 1.5
  panchanga: 0.5
  nadabrahman: 0.5
house_overlay: [7, 11, 12, 5, 2]        # Vedic houses to foreground
bridge_mandates:                        # mode-specific four-way triangulation
  - "Every major claim must braid: Vedic-7th × Tarot-relational × HD-electromagnetic-channel × dasha-anchor"
svg_topology: dyad-arc
---
```

### Body sections (orchestrator reads named anchors)

- `## pass-alpha-template`, `## pass-beta-template`, … — prose prompt templates with `{{ }}` interpolation slots.
- `## overlay-rules` — narrative explanation of what the engine/house overlays mean for this mode (read by orchestrator and folded into the system prompt as guidance).
- `## glossary` — mode-specific anchor phrases the synthesis should reach for (e.g., "phase-lock geometry", "AKSHARA-coupling").
- `## interactions` — describes the scroll-driven affordances + GSAP timelines for the interactive HTML output (read by `render/interactions/<mode>.ts`).
- `## lessons` — autoresearch-appended findings (date-stamped, structured table). Compressed and prepended to the system prompt as "what we've learned about this mode" memory.

The orchestrator stays mode-agnostic; **the mode doc IS the mode**. Net new file per mode ≈ 150 lines of declarative config + prompt prose + overlays.

---

## Section 3 — The Four Initial Modes

### 3.1 Partner-Synastry — 2 subjects, romantic/relational

**Pass plan (4 passes, ~13,000w target):**

| Pass | Title | Target | Focus |
|---|---|---:|---|
| α | Cross-Chart Structural Field | 3,000w | Lagna-to-Lagna disposition, Sun-Moon cross-resonance, 7th house double-overlay, Darakaraka × Atmakaraka pair |
| β | Pair-Resonance Threads | 3,500w | Venus/Mars synastry, navamsa (D-9) overlay, Upapada Lagna pair, HD electromagnetic channels, Gene Keys SQ↔IQ programming-partner sphere |
| γ | Phase-Lock Geometry | 3,500w | Dasha-stagger geometry (e.g., 9-week Jupiter→Venus window), transit overlay for the shared window, panchanga state at the pivot |
| δ | Relational Anti-Dependency Milestones | 3,000w | What the dyad makes the pair *no longer need* from each other across the new dasha cycle, per Kosha layer |

**Engine overlay weights (≠1.0 only):** `tarot 2.0` · `human-design 2.0` · `gene-keys 1.5` · `vimshottari 1.5` · `panchanga 0.5` · `nadabrahman 0.5`.

**House overlay:** 7, 11, 12, 5, 2.

**Bridge mandate:** every major claim braids `Vedic-7th × Tarot-relational × HD-electromagnetic-channel × dasha-anchor`.

**SVG topology:** `dyad-arc` → reuses `composite-resonance.ts` with romantic-overlay annotations (Venus-Mars channel labels, Darakaraka-Atmakaraka pair-glyph).

### 3.2 Business-Partners — 2-3 subjects, co-founder / operating-partner

**Pass plan (4 passes, ~13,500w target):**

| Pass | Title | Target | Focus |
|---|---|---:|---|
| α | Dharma-Signature Alignment | 3,500w | Atmakaraka comparison, 10th-house cross-overlay, Sun-Mercury operating-day signal, role-stack from Jupiter (vision) / Saturn (operations) / Mars (execution) emphasis |
| β | Joint-Operative Field | 3,500w | Vimshottari overlap matrix, HD authority+strategy compatibility, Gene Key gifts overlay, I-Ching state of the partnership |
| γ | Friction & Failure-Mode Mapping | 3,500w | 6th-house adversities cross-mapped, debility/combustion compensations, specific operational vulnerabilities |
| δ | Build-Sequence Milestones | 3,000w | What the partnership ships over the next 5-10 years across the shared dasha window |

**Engine overlays:** `atmakaraka 2.0` · `vimshottari 2.0` · `human-design 1.5` · `gene-keys 1.5` · `i-ching 1.5` · `tarot 1.0` · `face-reading 0.3`.

**House overlay:** 10, 11, 2, 6, 9.

**Bridge mandate:** `Atmakaraka-role × Vimshottari-overlap-state × HD-authority-match × Gene-Key-gift-vector`.

**SVG topology:** `dyad-arc` for 2-partner; `triad-triangle` for 3-partner. Operating-role glyph layer added (Vision/Operations/Execution stack indicator per vertex).

### 3.3 Family-Penta — 5 subjects, kinship system

**Pass plan (5 passes, ~14,500w target):**

| Pass | Title | Target | Focus |
|---|---|---:|---|
| α | Lineage Karma Field | 3,000w | 4th/9th/12th house cross-overlay, Pitru karaka comparison, Moon-condition cross-resonance, generational nakshatra pattern |
| β | Member 1+2 (Roots) | 2,500w | The two ordinal anchors (typically parents): joint Atmakaraka dynamic + dasha overlap as the *root field* |
| γ | Members 3-5 (Branches) | 2,500w | What each subsequent member carries from / for the root field. Birth nakshatra resonance back to the roots |
| δ | Joint Operative + Shadow | 3,500w | What the family field is structurally configured to do collectively; what it inherited as shadow |
| ε | Generational Anti-Dependency | 3,000w | What the family field is asking each member to become *unable to need* over the next 12-20 years |

**Engine overlays:** `vimshottari 2.0` · `panchanga 1.5` · `tarot 1.5` · `gene-keys 1.5` · `human-design 1.0` · `nadabrahman 1.0` · `i-ching 0.5`.

**House overlay:** 4, 9, 12, 5, 2, 3.

**Bridge mandate:** `Lineage-house × Pitru-karaka × Generational-nakshatra × Gene-Key-sphere-of-purpose`.

**SVG topology:** `pentagon` — new `composite-penta.ts` renderer with regular pentagon vertices, 10 pair-threads (dominant pairs solid, others faint), shared inner-arc on the root-pair (vertices 1+2), center `LINEAGE FIELD` seed with 5 petals.

### 3.4 Team-Synergy — 4-12 subjects, hierarchical architecture

**Pass plan (1 outline + 3 expansion, ~13,500w target):**

| Pass | Title | Target | Focus |
|---|---|---:|---|
| outline | Weave Map | 1,500w | Cluster members by role-stack (visionaries/operators/integrators/connectors), name the convergence pattern, identify 3-5 critical-path partnerships, declare operational rhythm from the dasha matrix |
| exp1 | Cluster Reading | 4,000w | Read each role-cluster the outline named |
| exp2 | Critical-Path Pair Threads | 4,500w | Read each critical-path partnership (3-5 dyad-mini-readings inside the team) |
| exp3 | Joint Operative + Operational Cadence | 3,500w | What the team is structurally configured to ship, in what sequence, with which dasha windows opening when |

**Engine overlays:** full 16-engine convergence (each engine 1.0 baseline); `vimshottari 1.5` · `human-design 2.0` · `gene-keys 1.5` foregrounded.

**House overlay:** 10, 11, 6, 3.

**Bridge mandate:** `Role-cluster × HD-type+authority-distribution × Vimshottari-cadence-overlap × Gene-Key-codon-ring`.

**SVG topology:** `web-graph` — new `team-web.ts` renderer with force-directed cluster layout (deterministic positions for print stability), nodes colored by role-cluster, edges = critical-path partnerships with weight = resonance strength, cluster bounding hulls.

---

## Section 4 — Cross-Mode Autoresearch Loop + Lessons Writeback

The loop is **autoresearch → write to mode doc → orchestrator reads it on next run** — never touch orchestrator code, never modify `defaults.ts` unless a routing-level constant changes.

### The loop

1. **Baseline run** — orchestrator runs the mode against real subjects. Produces solo syntheses + multi-pass composite + metric report (word count per pass, cross-refs per pass via `countCrossRefs()`, latency, completion-token utilization vs ceiling).
2. **Autoresearch pass** — variant the mode doc, not the code. Spawn 3-5 variant mode docs that differ on one axis (Pass γ prompt phrasing, engine overlay weights, bridge mandate strictness, etc.). Run the orchestrator on each variant against the same subjects. Cached solos make this cheap — only the multi-pass composite re-runs.
3. **Judge** each variant with `JUDGE_MODEL` (`gpt-oss-20b`) using the 4-axis rubric (voice / insight / cross-ref-density / coherence) plus a mode-specific axis:
   - Synastry: "phase-lock-geometry clarity"
   - Business: "operational specificity"
   - Family: "lineage-current legibility"
   - Team: "role-cluster legibility"
4. **Winner-promotion** — winning variant's edits merged into mode doc's pass templates. Losers archived in autoresearch workspace.
5. **Lessons writeback** — append a date-stamped entry to the mode doc's `## lessons` section:

```markdown
## lessons

### 2026-05-20 — Pass γ phase-lock specificity (Pass 3 autoresearch)
**Question:** Does mandating concrete dasha-stagger-day-counts in Pass γ raise phase-lock-geometry clarity?
**Variants:** baseline / explicit-day-count / explicit-day-count + transit-overlay
**Winner:** explicit-day-count + transit-overlay (judge: 28.5/40 vs baseline 24/40)
**Adopted:** Pass γ template now requires "the X-day stagger between [P1 dasha pivot] and [P2 dasha pivot]" as a structural anchor.
**Reference:** ~/.claude/MEMORY/WORK/autoresearch-partner-synastry-2026-05-20/
```

The orchestrator reads the `## lessons` section and prepends a compressed summary to the system prompt as "what we've learned about this mode" — every subsequent run is informed by every prior finding.

### Contract tension

When does a lesson get promoted from mode doc → `defaults.ts` or `SKILL.md`?

- **Mode-specific lesson** (better Pass γ template, better overlay weight) → stays in the mode doc.
- **Pipeline-wide lesson** (better judge model, better cache helper, banned model) → goes to `defaults.ts` + `SKILL.md`, and **both must update together**. Drift between the two = contract violation, flagged in code review.

---

## Section 5 — Interactive HTML as Primary Output

PDF is no longer the primary deliverable. **Each reading is a single self-contained HTML artifact** — scroll-driven narrative, animation-bound viz, interactive cross-references. PDF becomes a secondary archive output via `@media print` flattening.

### Tech stack (zero build step, single-file artifact)

- **CSS scroll-driven animations** — `animation-timeline: scroll()` and `view()` native in Chromium 115+, Firefox 121+. No JS lib needed for 80% of motion (reveals, parallax, scrubbing).
- **GSAP + ScrollTrigger via CDN** — only for what CSS can't do cleanly (coordinated multi-element timelines, dasha-pivot scrub-bar, synastry thread-pulse on hover). One `<script src="…/gsap.min.js">` tag.
- **Inline JS module** — interactivity glue: hover/click handlers, filter toggles, data bindings. ~5-15 KB unminified per artifact.
- **Inline SVG** with class hooks — same renderers as before; major elements get classes the animation layer targets (`.viz-pivot-marker`, `.viz-thread`, `.viz-vertex`).

### Per-mode interactive affordances

| Mode | Interaction |
|---|---|
| Partner-Synastry | Hover a resonance thread → tooltip names the four-way cross-system bridge it carries. Scroll-scrub the dasha-stagger timeline to see the 9-week window animate |
| Business-Partners | Toggle role-stack filter (Vision/Ops/Execution) → vertices and threads dim except matching layer. Click a Vimshottari overlap-cell → that operational window expands into a year-by-year sub-reading |
| Family-Penta | Click a member vertex → that member's contribution-to-field section auto-scrolls into view, lineage-houses faintly glow. Hover root-pair shared inner-arc → root-field summary tooltip |
| Team-Synergy | Filter web-graph by role-cluster (visual + section-content both filter together). Hover any edge → critical-path partnership card. Toggle dasha-cadence overlay → operational rhythm bar animates |

### Scroll-narrative layout (Pudding / NYT-longform pattern)

- **Cover** = first viewport (full-bleed, animated mandala fade-in)
- **TOC** = sticky-positioned side rail (auto-highlights current Part as you scroll)
- **Each Part** = sections with sticky viz (left/right column) + scrolling prose (other column) — viz updates as prose scrolls past
- **Plates** = full-viewport-height sections with viz centered, scroll-snap so they land cleanly
- **Index of Plates** = closing section with clickable thumbnails

### PDF fallback (`@media print`)

- `animation: none` strips all motion
- Sticky-positioned vizes collapse to flow-positioned figures
- Hover-only tooltips hidden
- Collapsed/filtered content expanded
- The PDF is the static archive; the HTML is the experience.

### Renderer architecture impact

SVG modules (`composite-resonance.ts`, etc.) stay where they are — they already emit SVG strings. New per-mode `render/interactions/<mode>.ts` modules export `{ scrollTimelineCss, gsapTimeline, eventHandlers }` inlined into the artifact. Mode docs gain a `## interactions` section describing affordances (autoresearch loop can refine these too).

### Topology → renderer map

| Topology | Renderer | Status |
|---|---|---|
| `dyad-arc` | `composite-resonance.ts` | ✓ exists — extend for romantic overlays + role glyphs |
| `triad-triangle` | `composite-triad.ts` | ✓ exists — extend for business 3-partner role glyphs |
| `pentagon` | `composite-penta.ts` | ✗ build |
| `web-graph` | `team-web.ts` | ✗ build |

---

## Section 6 — Phased Implementation Plan

**Phase 0 — Foundations** (1 PR, ~400 LOC)
- Build mode-doc parser: `scripts/integratedreading/modes/parser.ts` (gray-matter for YAML + regex for `## section-anchor` splits).
- Build renderer-dispatcher: `scripts/integratedreading/render/svg/index.ts` exporting `TOPOLOGY_RENDERERS: Record<string, RendererFn>`.
- Add `scripts/integratedreading/modes/_schema.md` documenting the frontmatter contract.
- No new modes yet; no behavior change.

**Phase 1 — Unified orchestrator + port existing modes** (1 PR, ~600 LOC)
- Build `scripts/integratedreading-mode.ts` (the unified runner from Section 1).
- Port existing `composite` (dyad) and `triad` to mode docs: `modes/composite-dyad.md`, `modes/composite-triad.md`. These two get the multi-pass treatment (current single-pass is the bottleneck) — each gains a 4-pass plan, target 13k+ words.
- Legacy `integratedreading-composite.ts` and `-triad.ts` runners become thin shims that exec the new orchestrator with the right mode flag.

**Phase 2 — HTML-first interactive renderer** (1 PR, ~700 LOC)
- Build the scroll-narrative HTML scaffold: `render/templates.ts` gets `renderInteractiveHTMLPage()` alongside the existing static renderer.
- Build `render/interactions/<mode>.ts` modules: scroll-timeline CSS, GSAP timeline definitions, event-handler glue.
- Add `@media print` styles flattening interactivity for PDF archive.
- Update Phase-1 modes (dyad, triad) to opt into the interactive renderer first. Validate in browser + verify PDF archive still prints cleanly.

**Phase 3 — Partner-Synastry + Business-Partners modes** (1 PR each, ~200 LOC mode doc per)
- Write `modes/partner-synastry.md` per Section 3.1: 4-pass plan, romantic overlays, bridge mandate.
- Write `modes/business-partners.md` per Section 3.2: 4-pass plan, dharma-alignment overlays.
- Both reuse existing `composite-resonance.ts` (dyad-arc) and `composite-triad.ts` (3-partner case) renderers.
- Add per-mode interaction modules (synastry thread tooltips, business role-stack filter).

**Phase 4 — Family-Penta** (1 PR, ~500 LOC)
- Write `modes/family-penta.md` per Section 3.3: 5-pass plan, lineage-karma overlays.
- Build `render/svg/composite-penta.ts` (pentagon-with-root-pair-inner-arc from Section 5).
- Add interaction module: click-member-to-spotlight, lineage-house hover ring.

**Phase 5 — Team-Synergy** (1 PR, ~700 LOC)
- Write `modes/team-synergy.md` per Section 3.4: hierarchical 1+3 pass plan, full 16-engine convergence overlays.
- Build `render/svg/team-web.ts` (force-directed cluster graph from Section 5).
- Add interaction module: cluster-filter, critical-path edge hover.

**Phase 6 — Mode-specific autoresearch passes** (1 PR per mode, parallel)
- Per-mode autoresearch runner under `scripts/autoresearch-integratedreading/per-mode/<mode>.ts`.
- Variant mode docs differing on one axis, judged with `JUDGE_MODEL` per the contract, winners promoted, lessons appended per Section 4.
- Each run produces a `SUMMARY-PASS-N.md` in the autoresearch workspace.

### Total scope

~7 PRs across ~3,500 LOC. Each phase independently shippable. Modes don't depend on each other — Family-Penta can ship before Business-Partners if priorities shift.

### Verification gates per phase

- Generated HTML opens cleanly in Chrome / Safari / Firefox
- `@media print` PDF output retains all content
- Voice rules (no equations, no biohack, Sanskrit-translated) hold across all modes
- Cross-ref density via `countCrossRefs()` meets per-mode floor declared in frontmatter
- The autoresearch contract (`defaults.ts`) never gets re-declared in any mode runner
- Per-mode target word range (12-15k) hit on real-subject runs

---

## Open Questions

These were not nailed down in brainstorming and are explicit follow-ups during implementation:

1. **Subject role validation** — should mode docs declare strict role names (e.g., synastry requires "partner-A" and "partner-B" exactly) or just ordinal positions (subject 1, subject 2)? Strict names help validation; ordinal positions are more flexible.
2. **Cross-mode reuse** — when a 3-partner business reading needs only 2 of the 3 critical-path partnerships to be deeply read, does the mode doc declare adaptive pass plans? Out of scope for v1; revisit after Phase 6 autoresearch.
3. **PDF fallback fidelity floor** — is there a baseline visual quality bar the PDF archive must hit, or is "static plates + flowed prose" enough?
4. **Team-Synergy below 4 subjects** — should team-synergy with 3 subjects auto-degrade to triad-composite, or error?

---

## References

- Predecessor PR: [#26 — editorial-grade dyad reading pipeline + autoresearch scaffolding](https://github.com/Sheshiyer/witness-agents/pull/26)
- Skill spec: `.claude/skills/integratedreading/SKILL.md` (canonical workflow + Multi-Model Routing table + Autoresearch Contract section)
- Contract module: `scripts/autoresearch-integratedreading/defaults.ts`
- Multi-model routing reference: `.claude/skills/integratedreading/references/multi-model-routing.md`
- Autoresearch workspace: `~/.claude/MEMORY/WORK/autoresearch-integratedreading-15k-2026-05-13/`
- Brand voice anchor: `scripts/integratedreading/system-prompts.ts` (`ANATOMIST_PERSONA`, `KOSHA_GRAMMAR`, `DYADIC_LOOP`)
