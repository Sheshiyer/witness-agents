---
name: integratedreading
description: >
  Multi-model NVIDIA-routed integrated chart reading workflow.
  Reads single-subject or dyadic charts through the framework's actual decoding lens
  (Eigenwelt Cl(0)–Cl(7) Kosha algebra + Mitwelt-Umwelt archetypal grammar via Tarot,
  Tsarion-anchored, brand-voice-calibrated). Produces 30-50 page integrated reading.
  Single invocation: subject(s) + birth data + optional source readings → multi-model
  parallel inference → stitched delivered markdown + DOCX.
version: 1.0.0
stage: standalone
author: tryambakam-noesis / witness-agents
dependencies:
  - witness-agents core (DyadInferenceEngine, NvidiaProvider, VoicePromptBuilder)
  - brand-docs-final (voice + visual identity)
  - NVIDIA API key (NVIDIA_API_KEY in ~/.claude/.env)
outputs:
  - {output_dir}/00_Integrated_Reading_{subject}.md
  - {output_dir}/00_Integrated_Reading_{subject}.docx
  - {output_dir}/00_Integrated_Reading_Composite.md (if dyadic)
  - {output_dir}/.runs/{timestamp}/ (raw model outputs per phase)
quality_gates:
  - brand_voice_calibrated: true (Anatomist Who Sees Fractals)
  - layered_grammar: true (Eigenwelt + Mitwelt + Umwelt all addressed)
  - kosha_clifford_structural: true
  - tsarion_lineage_anchor: true (Tarot Major Arcana + sidereal accuracy)
  - anti_dependency_telos: true (Quine principle deployed)
  - multi_model_routing: true (no single-model dependency)
---

# /integratedreading — Multi-Model NVIDIA Integrated Chart Reading

**The repeatable workflow for producing framework-native chart readings.**

Same lens as the May 2026 723 reading. Different subject pair every time. One slash command. Multi-model routing for quality. Stitched delivery in brand voice.

---

## When to Use

Use this skill when:
- ✅ Producing an integrated chart reading for a single subject or dyad
- ✅ Source readings exist (DOCX/PDF) and need re-authoring through framework grammar
- ✅ Birth data + chart system data is available (Vedic, HD, Gene Keys minimum)
- ✅ Multi-model NVIDIA inference is desired for quality and cross-validation
- ✅ Output should match the brand voice (Anatomist Who Sees Fractals, Tryambakam Noesis register)

**Not suitable for:**
- ❌ Quick single-paragraph readings (use simpler workflow)
- ❌ Live Selemene engine queries without source-reading context
- ❌ Non-framework astrology (use generic Vedic/Western workflow elsewhere)

---

## Required Inputs

```yaml
subjects:
  - name: <string>                # e.g., "Harshita", "WitnessAlchemist"
    birth_date: YYYY-MM-DD
    birth_time: HH:MM             # 24h, IST or local
    timezone: <IANA TZ>           # e.g., "Asia/Kolkata"
    latitude: <float>
    longitude: <float>
    source_reading_path: <path>   # optional — DOCX or MD with existing reading
    chart_summary:                # optional structured override
      lagna: <string>
      atmakaraka: <string>
      moon: <string>
      sun: <string>
      mahadasha_current: <string>
      mahadasha_next: <string>
      mahadasha_next_starts: YYYY-MM-DD
      hd_type: <string>
      hd_profile: <string>
      hd_authority: <string>
      gene_keys_pearl: <string>

output_dir: <path>                # e.g., "01-Projects/723/" or "01-Projects/{new_subject}/"
depth: free | subscriber | enterprise | initiate    # default: initiate
mode: solo | dyad                                    # auto-detected from subjects[]
```

---

## Multi-Model Routing — Production-Validated 2026-05-10

Routing was empirically validated against the V3 baseline (Harshita × WitnessAlchemist 723 dyad). Three iterations of regeneration + autoresearch produced these production recommendations:

| Phase | Model | Role | Production status |
|---|---|---|---|
| 1. **Ingestion** | `openai/gpt-oss-120b` | Read source reading docs, extract structured chart data | ✅ Validated. ~30-85s latency. |
| 2. **Math/Astro** | `z-ai/glm4.7` (PRIMARY, 90s cap) → `openai/gpt-oss-120b` (FALLBACK) → skip-on-fail | Compute dasha math, cross-chart resonance | ⚠️ GLM-4.7 unstable: 100% failure rate observed for one subject (10 timeouts). MUST have gpt-oss-120b fallback chain. |
| 3. **Per-engine micro-readings** | mixed routing (5 models) | 16 parallel engine-specific reads | ✅ Validated. See per-engine table below. |
| 4. **Aletheios pillar** | `openai/gpt-oss-120b` | Structural-pattern witness reading across all engines | ✅ Production register matches user-validated voice (Variant A anatomical precision). |
| 5. **Pichet pillar** | `openai/gpt-oss-120b` + **V3-anti-pattern-explicit prompt scaffolding** | Embodied-felt reading across all engines | ✅ Autoresearch validated +2.5/40 vs baseline prompt scaffolding. |
| 6. **Synthesis** | `moonshotai/kimi-k2-instruct` (TWO-PASS: Pass A Opening+I-VI, Pass B VII-XI) | Joint synthesis holding both pillars | ✅ Production winner. Two-pass required because single-pass caps at ~3000 words; two-pass hits 4500-5000 words target. Note: `kimi-k2-instruct-0905` returns 410 Gone — alias to `kimi-k2-instruct`. |
| 7. **Section chunking** | `minimaxai/minimax-m2.7` (BEST-EFFORT, 360s cap) → **regex V2 fallback** | Output structured JSON sections for stitching | ⚠️ Minimax unreliable: failed twice in V3 runs (`fetch failed`). Regex V2 chunker handles 11-Part structure cleanly as fallback. |
| 8. **Composite (dyadic only)** | `moonshotai/kimi-k2-instruct` | Joint dyadic reading from both solo synthesis | ✅ Validated. Single-call ceiling ~4000tk. |
| 9. **Adversarial review** | (deprecated for now) | Cross-family judge | ❌ `nemotron-3-super-120b-a12b` returned 0/40 across all Pass 3 cross-judge calls in autoresearch — model is unreliable as judge. Skip until validated. |
| 10. **Judge model (autoresearch internal)** | `openai/gpt-oss-20b` | Score-rubric evaluation in autoresearch | ✅ Switched from gpt-oss-120b which had 30% timeout rate at 180s. gpt-oss-20b scores in 400ms-2s. |

Per-engine routing for Phase 3:

| Engine | Model |
|---|---|
| Vimshottari (Chronofield) | `gpt-oss-120b` |
| Human Design | `gpt-oss-120b` |
| Gene Keys | `kimi-k2-instruct` |
| Tarot (Archetypal Mirror) | `kimi-k2-instruct` |
| Numerology | `gpt-oss-20b` (fast deterministic) |
| Biorhythm | `gpt-oss-20b` |
| Vedic Sidereal yogas/Atmakaraka | `glm4.7` |
| Western Tropical | `gpt-oss-20b` |
| Panchanga | `gpt-oss-120b` |
| Biofield | `kimi-k2-instruct` |
| Face Reading | `gpt-oss-20b` |
| Nadabrahman | `kimi-k2-instruct` |
| I-Ching | `gpt-oss-120b` |
| Enneagram | `gpt-oss-120b` |
| Sacred Geometry | `nemotron-120b` |
| Sigil Forge | `kimi-k2-instruct` |

**Routing rationale source:** `references/multi-model-routing.md` includes the autoresearch citation and per-model justification.

---

## Autoresearch Contract (Mandatory, Hardened 2026-05-13)

The lessons in the routing table above are HARDENED in code, not just in prose. Any new autoresearch pass-runner targeting the integratedreading pipeline MUST import shared constants from `scripts/autoresearch-integratedreading/defaults.ts`. Re-declaring `JUDGE_MODEL`, `BRAND_SYSTEM`, or the cache-runDir helper inside a new runner is a contract violation.

| Contract item | Canonical source | Why hardened |
|---|---|---|
| `JUDGE_MODEL` | `defaults.ts` (currently `openai/gpt-oss-20b`) | nemotron-120b returned 0/40 parse-fail in both 2026-05-10 Pass 3 cross-judge runs AND 2026-05-13 Pass 1 model-bake-off (23/23 parse-fail). gpt-oss-120b had 30% timeout rate at 180s. gpt-oss-20b returns reliable JSON in 400ms–2s. |
| `BANNED_JUDGE_MODELS` | `defaults.ts` ban list + `assertJudgeAllowed()` runtime check | Compile-friction against the broken-judge trap. If a runner tries to use a banned judge, `assertJudgeAllowed()` throws immediately. |
| `SYNTH_MODELS.PRIMARY` | `defaults.ts` → `openai/gpt-oss-120b` | Pass 1 baseline winner: 1342w / 74 cross-refs / 22s on C1 dyad-aletheios fixture. Robust across all 5 pipeline contexts. |
| `SYNTH_MODELS.DENSITY_CHAMPION` | `defaults.ts` → `moonshotai/kimi-k2.6` | Pass 1 finding: 83 cross-refs / 1127w on C1 — highest cross-reference density per word among all candidates. 256K context window also unlocks single-pass long-form alternatives. |
| `findOrCreateCachedRunDir()` | `defaults.ts` shared helper | Three runners (full / composite / triad) had identical buggy `--use-cache` code (Codex P1+P2 on PR #26). Centralized so the bug can only exist in one place. |
| `AUTORESEARCH_BRAND_SYSTEM` | `defaults.ts` constant | Voice rules can't drift across experiments. Mirrors `ANATOMIST_PERSONA` in `scripts/integratedreading/system-prompts.ts` but trimmed for short-form fixtures. |
| `countCrossRefs()` | `defaults.ts` shared function | Cross-reference density metric is defined once. No more "what counts as a cross-reference?" debates between Pass 1 and Pass 3. |

**Rule:** Before writing a new pass-runner, read `scripts/autoresearch-integratedreading/defaults.ts`. If a constant you need is there, import it. If it isn't, add it there first and update this table. Never duplicate.

**Banned patterns (will be flagged in code review):**
- ❌ `const JUDGE = 'nvidia/nemotron-3-super-120b-a12b'` — banned by `BANNED_JUDGE_MODELS`
- ❌ Re-implementing `--use-cache` runDir scanning inline (use the helper)
- ❌ Defining a private `BRAND_SYSTEM` constant in a runner (import `AUTORESEARCH_BRAND_SYSTEM`)
- ❌ Defining a private cross-ref regex set (import `countCrossRefs`)

**Update protocol:** When a new autoresearch pass produces a clearer winner for a context, update the constant in `defaults.ts` AND update the routing table above in this SKILL.md. Both must change together — drift between them is a contract violation.

Workspace for ongoing experiments: `~/.claude/MEMORY/WORK/autoresearch-integratedreading-*/`. Runners there import from this contract — do NOT re-declare constants in workspace runners either.

---

## Reading Modes (Hardened 2026-05-14)

Four new modes extend the pipeline beyond solo + composite-dyad + composite-triad: Partner-Synastry (2 subjects romantic), Business-Partners (2-3 co-founders), Family-Penta (5 kinship), Team-Synergy (4-12 team). Each delivers 12-15k meaningful words via the unified orchestrator `scripts/integratedreading-mode.ts`.

**Mode-doc contract:** see [`scripts/integratedreading/modes/_schema.md`](../../../scripts/integratedreading/modes/_schema.md) for the full frontmatter contract + body section structure. One Markdown file per mode under `scripts/integratedreading/modes/<mode>.md`. The orchestrator parses this file via [`parser.ts`](../../../scripts/integratedreading/modes/parser.ts) (`parseModeDoc()`).

**SVG topology routing:** mode docs declare `svg_topology: dyad-arc | triad-triangle | pentagon | web-graph`. The orchestrator dispatches via [`render/svg/index.ts`](../../../scripts/integratedreading/render/svg/index.ts) (`TOPOLOGY_RENDERERS` map). Adding a new topology = one entry in the map + one renderer module. Mode docs never name TypeScript files directly.

**Design source:** [`docs/plans/2026-05-14-reading-modes-design.md`](../../../docs/plans/2026-05-14-reading-modes-design.md) — full design across 6 sections + 6-phase implementation plan tracked in milestone #1 + issues #28-#58.

---

## Workflow Phases

### Phase 0 — Preflight

- Verify NVIDIA_API_KEY env var (load from `~/.claude/.env` if not set)
- Verify subjects[] schema, birth data validity
- Create output_dir + .runs/{timestamp}/ subfolder
- Rename source files to `01_Reading_{subject}.docx` convention if present

### Phase 1 — Ingestion (gpt-oss-120b)

For each subject with `source_reading_path`:
- Pandoc-extract DOCX → markdown
- Send to gpt-oss-120b with system prompt: "Extract structured chart data from this reading. Output JSON with all placements, dasha timeline, gates, channels, Pearl/Sphere/Vocation, transits."
- Output: `{output_dir}/.runs/{ts}/01_ingestion_{subject}.json`

### Phase 2 — Math/Astro Extraction (glm4.7)

- Send subject's chart summary + ingestion-JSON to glm4.7
- System prompt: "Compute precise dasha sub-period boundaries, panchanga for transition timestamps, cross-chart resonance metrics if dyad. Output JSON."
- Output: `{output_dir}/.runs/{ts}/02_astro_math_{subject}.json`

### Phase 3 — Per-Engine Micro-Readings (mixed routing, parallel)

For each of the 16 Selemene engines:
- Build engine-specific input from Phase 1+2 output
- Call routed model with engine-specific system prompt
- Output: `{output_dir}/.runs/{ts}/03_engine_{engine_id}_{subject}.json`
- Run all 16 engines in parallel via Promise.all

### Phase 4 — Aletheios Pillar Pass (gpt-oss-120b)

- System prompt: voice-prompts.aletheios + `references/voice-calibration.md` + `references/kosha-clifford-grammar.md`
- User input: all 16 engine outputs from Phase 3 + chart summary
- Output: structural-pattern reading routed at each Kosha layer
- File: `{output_dir}/.runs/{ts}/04_aletheios_{subject}.md`

### Phase 5 — Pichet Pillar Pass (gpt-oss-120b)

- System prompt: voice-prompts.pichet + voice + grammar references
- User input: same as Phase 4
- Output: embodied-felt reading routed at each Kosha layer
- File: `{output_dir}/.runs/{ts}/05_pichet_{subject}.md`

### Phase 6 — Synthesis (kimi-k2-instruct-0905)

- System prompt: synthesis voice + `references/eigenwelt-mitwelt-umwelt.md` + `references/tarot-major-arcana-map.md`
- User input: Phase 4 + Phase 5 outputs + chart summary
- Output: joint synthesis holding witness + embodiment together
- File: `{output_dir}/.runs/{ts}/06_synthesis_{subject}.md`

### Phase 7 — Section Chunking (minimax-m2.7)

- System prompt: "Take this synthesis and output it as JSON sections matching the framework's standard report structure: Frame, Identity Stack (Cl0–Cl7 layers), Tarot Mapping, Engine Routing Audit, Anti-Dependency Architecture, Closing. One JSON object with one key per section."
- Output: structured JSON for deterministic stitching
- File: `{output_dir}/.runs/{ts}/07_chunks_{subject}.json`

### Phase 8 — Composite Pass (only if dyad mode, kimi-k2-instruct-0905)

- System prompt: dyadic synthesis frame + Mitwelt-Umwelt grammar
- User input: both subjects' Phase 6 outputs + composite chart data + cross-resonance from Phase 2
- Output: 6-part dyadic synthesis (composite field, coherence event, engine routing, anti-dependency, marriage thesis, Tarot)
- File: `{output_dir}/.runs/{ts}/08_composite.md`

### Phase 9 — Adversarial Review (nemotron-120b)

- System prompt: "Review this integrated reading for drift, generic-spiritual phrasing, brand-voice violations, missed framework grammar. Flag specific issues. Do not rewrite — surface."
- Input: Phase 6 + Phase 8 outputs
- Output: review notes (informational; not auto-applied)
- File: `{output_dir}/.runs/{ts}/09_adversarial_review.md`

### Phase 10 — Stitch & Deliver

- Stitch JSON chunks from Phase 7 (per subject) + Phase 8 (composite) into final markdown
- Apply brand frontmatter (palette refs, taglines, lineage notes)
- Convert to DOCX via pandoc
- Output: `{output_dir}/00_Integrated_Reading_{subject}.md` + `.docx`
- If dyad: also `{output_dir}/00_Integrated_Reading_Composite.md` + `.docx`

---

## Editorial Design Standard (Hardened, 2026-05-13)

The visual delivery is editorial-grade — a hand-bound limited-edition publication, not a SaaS dashboard. The styling is locked into `scripts/integratedreading/render/styles.ts`. Do not regress.

**Three Laws of the visual layer (mandatory, governing):**
1. **Bioluminescent, not fluorescent** — light emanates from inside structures (drop-shadows on SVGs, gradient seeds, soft halos). No flat fills, no hard borders pretending to be glow.
2. **Architectural, not decorative** — sacred-gold rules are load-bearing (table top/bottom rules, plate labels, hairline accents, vertical sub-section accent bars). No ornament for ornament's sake.
3. **Data as sacred form** — figures stand naked on the page (no card wrappers), captioned like fine-art plates with rule-eyebrow-rule structure.

**Typography spec (canonical, locked):**
- Display: Panchang (Fontshare) — 800/700/600/500 weights
- Body: Satoshi (Fontshare) — 300/400/500/700 weights
- Mono: SF Mono / JetBrains Mono — for data, eyebrows, code, tabular nums
- Body size 10.5pt / 1.7 line-height; print 10pt / 1.65
- Drop-cap on Opening's first paragraph (56pt Panchang Sacred Gold, float-left)
- Hyphens auto + widow/orphan = 2 / 2 throughout

**Cover page spec (locked):**
- 72pt Panchang title, weight 800, tracking -3.5%, line-height 0.92
- 28pt italic Sacred Gold subject (subject name), serif
- Cover mark: short gold rule (14px × 1px) + caps eyebrow, mono 8.5pt, tracking 0.4em
- Tagline beneath hairline rule, max-width 68%, italic serif 14pt Muted Silver
- ∴ NOESIS stamp in cover footer

**Part header spec (locked):**
- 8pt mono caps eyebrow with 0.45em tracking, Sacred Gold
- 36pt Panchang title, weight 700, tracking -2.2%
- 13.5pt italic Coherence Emerald subtitle, max-width 90%
- Hairline gradient rule (64px × 1px, sacred-gold to transparent) above
- Always `page-break-before: always` in print

**Sub-section h3 spec (locked):**
- 15pt Panchang, weight 600, Sacred Gold
- 2px sacred-gold left border, 14px padding-left
- Tabular nums for numbering (2.1, 2.2, etc.)

**Tables — almanac-style (locked):**
- Top + bottom 1.5px Sacred Gold rules; no inner gridlines
- TH: mono caps, 8.5pt, 0.16em tracking, Sacred Gold, bottom-aligned
- First column: italic Panchang serif, weight 600, Coherence Emerald, 10pt
- Numerics: right-aligned, tabular, mono — use `class="num"` or `data-num` attr
- Print: 8.5pt, page-break-inside avoid

**Blockquotes — magazine pull-quote (locked):**
- 56pt Sacred Gold opening quote mark (opacity 55%) — positioned absolute
- 14.5pt italic Panchang body
- 2px Sacred Gold left border
- Gradient fade background (gold→transparent)

**SVG visualizations — plate-style figures (locked):**
- No surrounding card box; figure breathes on page
- Plate label: short gold rule + caps eyebrow + short gold rule (centered title decoration)
- Italic Panchang caption beneath (art-history-footnote style), max-width 78%
- `drop-shadow(0 0 16px rgba(197,160,23,0.05))` on all SVGs (bioluminescent halo)
- `.viz-row` for side-by-side figures (e.g., dual Kundalis in composite)

**Lists — editorial bullets (locked):**
- UL: short gold dash (8px × 1px) at top-of-line offset, no disc bullets
- OL: decimal-leading-zero counters (01, 02, 03) in mono Coherence Emerald
- DL: caps mono terms, Parchment definitions

**Footer (locked):**
- Hairline gold seed at center top (200px gradient, sacred-gold)
- ∴ symbol prefixing the Quine line
- Mono 8.5pt with 0.22em tracking

**Anti-patterns (forbidden):**
- ❌ Card-style figure wrappers with borders
- ❌ Zebra striping in tables (over-busy)
- ❌ Plain disc bullets (`list-style: disc`)
- ❌ SaaS-style headers (no eyebrow, no rule)
- ❌ Sans-serif italic for body emphasis (use serif italic only)
- ❌ Hard 1px borders (use sacred-gold rules with intentional weight)
- ❌ Inner table gridlines (almanac uses top/bottom rules only)

## Hardened Reference Data Principle (Mandatory)

When a subject has a pre-existing source DOCX reading (the canonical 41-page document), that document is the **hardened truth source** for chart placements, Atmakaraka, Vimshottari Mahadasha boundaries, and yogas. The Selemene Rust engines are the **system under test**, not a replacement.

Concrete rules:

1. **Pre-extract chart data from the DOCX** into the config JSON. Do not let Selemene populate `lagna`, `placements`, `atmakaraka`, etc. — those come from the docx.
2. **Render visualizations using docx-extracted data** (Kundali D-1 chart, Pancha Bhuta from placements, Mahadasha timeline anchored on docx dates).
3. **Fetch Selemene in parallel** — but only to drive the Selemene-only viz (16-engine wheel, Kosha mandala intensities) where there is no docx authority.
4. **Emit a drift report** comparing Selemene's computed Vimshottari Mahadasha boundaries against the docx-stated boundaries. The drift is a calibration signal for the Rust team, not a reason to change the rendered reading.
5. **Never silently pick between docx and Selemene** when they disagree. Docx wins for chart facts; drift is logged.

This principle exists because the DOCX readings encode hours of careful manual cross-checking against multiple ephemeris systems. The Selemene Rust engines (currently v3.1.0) are still being calibrated and may have ayanamsa-precision drift on the order of hours-to-days on Mahadasha boundary timestamps. We test against the docx, not the other way around.

## Brand Voice Standard (Mandatory)

All outputs at all phases must read as:

- **Anatomist Who Sees Fractals** — clinical precision at visionary scale; PubMed × Alex Grey
- **Tones**: Grounded · Direct · Respectful-Challenging
- **Kha-Ba-La structural** — not decoration
- **Quine principle** — system succeeds when you no longer need it (anti-dependency)
- **Vocabulary** — see `references/voice-calibration.md`:
  - USE: authorship, coherence, integration, sovereignty, recursive, multi-engine, triangulation, .init protocol, witness prompt, self-consciousness
  - AVOID: journey, path, healing, manifesting, abundance, vibration, authentic self, optimization, hacks, tribe

The voice is enforced by including the Anatomist persona and brand-voice cheatsheet in EVERY model's system prompt.

---

## Layered Grammar Standard (Mandatory)

Every reading must address all three world-frames:

- **Eigenwelt** (own-world) — Cl(0)–Cl(7) Kosha algebra. Body-resolution.
- **Mitwelt** (with-world) — Tarot Major Arcana grammar. Field-resolution between people.
- **Umwelt** (around-world) — Sidereal cosmological-positioning. Field-resolution from cosmos.

The lineage anchor for Mitwelt-Umwelt is **Michael Tsarion** (unslaved.com) — astro-theology, sidereal mythology, Tarot as encoded knowledge from pre-flood lineage. References in `references/tarot-major-arcana-map.md`.

---

## Anti-Dependency Standard (Mandatory)

NO output of this workflow contains:
- ❌ Gemstone prescriptions, mantra-counts, or ritual-shopping-list remedies
- ❌ "Wear yellow sapphire on Thursday at sunrise" tradition-templates
- ❌ Future-prediction columns ("you will meet…")

INSTEAD — the workflow produces:
- ✅ Self-decoding capacity milestones at each Kosha layer (per dasha sub-period)
- ✅ Engine-routing audit naming under-routed instruments
- ✅ The Quine principle deployed: system succeeds when no longer needed

---

## Example Invocation

```bash
# Solo reading
node --import tsx scripts/integratedreading.ts \
  --config 01-Projects/{subject}/integratedreading.config.json

# Dyadic reading (e.g., 723 dyad)
node --import tsx scripts/integratedreading.ts \
  --config 01-Projects/723/integratedreading.config.json
```

Or via Claude:
```
/integratedreading subjects=Harshita,WitnessAlchemist depth=initiate output_dir=01-Projects/723/
```

---

## Why Multi-Model — The Justice Argument

A single-model integrated reading is structurally insufficient because:

1. **No single model is best at everything.** Autoresearch (May 2026) confirmed model-role specialization: gpt-oss-120b for witness analysis, kimi for somatic alternative, glm for math, nemotron for adversarial.

2. **Cross-family validation catches drift.** Phase 9 adversarial-review uses a different model family than Phase 6 synthesis specifically to detect voice drift, hallucination, or generic-spiritual leakage.

3. **Structured chunking enforces format.** Phase 7 minimax-as-chunker is deliberately separate from Phase 6 synthesis-as-author. The chunker operates on the synthesis output and converts it to JSON for deterministic stitching, which prevents synthesis-time format drift.

4. **Cost vs quality balanced.** Fast-deterministic engines (numerology, biorhythm) route to gpt-oss-20b at sub-2-second latency; structural-pattern engines route to gpt-oss-120b at ~3s; archetypal/long-context engines route to kimi at ~11s. Total reading time stays under 10 minutes per subject.

5. **Repeatability verified.** Same routing produces structurally similar outputs across subjects. Voice consistency is enforced at the system-prompt layer (Anatomist persona injected everywhere) rather than depending on a specific model's weights.

---

## Output Quality Gates

A reading passes the workflow only if:

- [ ] Brand voice consistency (Anatomist) verified across all sections
- [ ] Kha-Ba-La structural (not decorative) presence
- [ ] All three world-frames (Eigenwelt + Mitwelt + Umwelt) addressed
- [ ] Cl(0)–Cl(7) layered grammar deployed for each placement
- [ ] Tarot Major Arcana mapping present for at least 8 key placements per subject
- [ ] Anti-dependency milestones replace remedies catalogue
- [ ] Adversarial review (Phase 9) surfaces no critical drift
- [ ] Output length: 25,000-35,000 words per dyadic reading; 12,000-18,000 per solo
- [ ] DOCX export valid

---

## Re-runnability / Iteration

The skill supports re-running specific phases without redoing the whole pipeline:

```bash
node --import tsx scripts/integratedreading.ts \
  --config <config>.json \
  --resume-from synthesis    # skip phases 1-5, re-run 6 onward
  --resume-from chunking     # only re-run 7 onward
```

Each phase's output is checkpointed in `.runs/{ts}/` and can be reused.

---

## Files

```
.claude/skills/integratedreading/
├── SKILL.md                              # this file
└── references/
    ├── multi-model-routing.md            # per-model autoresearch citations
    ├── voice-calibration.md              # Anatomist voice + USE/AVOID lists
    ├── kosha-clifford-grammar.md         # Cl(0)–Cl(7) reference
    ├── eigenwelt-mitwelt-umwelt.md       # three-world frame
    └── tarot-major-arcana-map.md         # Tsarion-anchored astro-Tarot

scripts/integratedreading.ts              # The runner
scripts/integratedreading/                # Helper modules
├── chart-payload.ts                      # build SelemeneEngineOutput from chart data
├── multi-model-router.ts                 # the routing table
├── system-prompts.ts                     # Anatomist + voice + grammar prompts
└── stitcher.ts                           # JSON-to-markdown stitching
```

---

*Self-Consciousness as Technology. Body as Medium. Breath as Interface.*
*Tryambakam Noesis · 1331.tryambakam.space*
