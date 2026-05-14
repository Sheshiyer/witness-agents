# Multi-Model Routing Reference

**Stitched approach:** user-specified role assignments × autoresearch-validated quality data × per-engine specialization.

## Master Routing Table

| Phase | Model | Source of choice | Justification |
|---|---|---|---|
| 1. Ingestion | `openai/gpt-oss-120b` | User-specified + autoresearch | "GPT-OSS 120B for larger ingestion of the data" — also autoresearch-validated as analytical winner |
| 2. Math/Astro | `z-ai/glm4.7` | User-specified | "GLM for math and finding the astro data" — strong on deterministic computation |
| 3. Engines (mixed) | 5 models | Plan + diversity principle | See per-engine table below — model diversity prevents single-model bias |
| 4. Aletheios | `openai/gpt-oss-120b` | Autoresearch (Pass 2 + Pass 3) | 24.8/30 combined; robust across emotional registers |
| 5. Pichet | `openai/gpt-oss-120b` | Autoresearch unanimous | 24.5/30 unanimous across both judges |
| 6. Synthesis | `moonshotai/kimi-k2-instruct-0905` | User-specified | "Kimi for synthesis" — long context (256k), strong fusion-writing |
| 7. Section chunking | `minimaxai/minimax-m2.7` | User-specified | "Minimax for delivery of nicely chunked JS sections" — structured output specialist |
| 8. Adversarial review | `nvidia/nemotron-3-super-120b-a12b` | Plan (autoresearch protocol) | Different family from synthesis catches drift |
| 9. Voice integration (optional) | Claude | Plan (optional) | Off in NVIDIA-only mode |

## Per-Engine Routing (Phase 3) — 16 engines, 5 models

| Engine | Model | Why |
|---|---|---|
| Vimshottari (Chronofield) | `gpt-oss-120b` | Analytical, dasha-timing reasoning |
| Human Design | `gpt-oss-120b` | Gate-channel structural |
| Gene Keys | `kimi-k2-instruct` | Long-context archetypal frequency |
| Tarot (Archetypal Mirror) | `kimi-k2-instruct` | Symbolic-pattern archetypal |
| Numerology | `gpt-oss-20b` | Fast deterministic arithmetic |
| Biorhythm | `gpt-oss-20b` | Math-deterministic |
| Vedic Sidereal yogas/Atmakaraka | `glm4.7` | Sidereal calculation precision |
| Western Tropical | `gpt-oss-20b` | Surface-pattern, fast |
| Panchanga | `gpt-oss-120b` | 5-fold structural reasoning |
| Biofield | `kimi-k2-instruct` | Cross-system long-context |
| Face Reading | `gpt-oss-20b` | Fast |
| Nadabrahman | `kimi-k2-instruct` | Sound-resonance archetypal |
| I-Ching | `gpt-oss-120b` | Hexagram structural |
| Enneagram | `gpt-oss-120b` | 9-point logic |
| Sacred Geometry | `nemotron-120b` | Mathematical-structural |
| Sigil Forge | `kimi-k2-instruct` | Symbol-creation archetypal |

**Distribution:** gpt-oss-120b (5), gpt-oss-20b (4), kimi-k2-instruct (5), glm4.7 (1), nemotron-120b (1).

## Why Two GPT-OSS Variants

- **gpt-oss-20b** — 1.7s latency, 22.7/30 quality. Routes to deterministic-arithmetic engines (numerology, biorhythm, fast Western surface-pattern).
- **gpt-oss-120b** — 1-3s latency, 24.8/30 quality. Routes to structural-reasoning engines (Vimshottari, Panchanga, HD, I-Ching, Enneagram) and pillar passes.

The split is by required-quality-vs-speed at each engine, not by total cost saving.

## Why Kimi K2 (and 0905) Over GPT-OSS-120B for Synthesis

- **Synthesis Phase 6** uses `kimi-k2-instruct-0905`, not gpt-oss-120b, because:
  1. User specification: "Kimi for synthesis"
  2. Long context (256k tokens) lets the synthesis model hold both pillar passes + chart data simultaneously without truncation
  3. Autoresearch noted Kimi as "strong somatic alternative" (23.7/30 for Pichet) — meaning it carries both witness and embodied registers, ideal for fusion
  4. The 0905 variant is the latest, with improved coherence over k2-instruct
- **Per-engine Phase 3** uses regular `kimi-k2-instruct` (not 0905) for cost efficiency on engine-level calls.

## Why Minimax for Chunking, Not Synthesis

- Minimax M2.7 was discarded in autoresearch for the Pichet voice role (mean 19.3/30, "verbose, conciseness wildly variable")
- BUT — verbose + structured-output-prone is exactly what's wanted for Phase 7 chunking
- The Phase 7 chunker is deliberately separate from the synthesis author. The chunker operates on already-written prose and breaks it into structured JSON sections for deterministic stitching. This prevents synthesis-time format drift.
- User's intuition is correct: Minimax fills the chunking role better than the synthesis role.

## Why Nemotron 120B for Adversarial Review

- Different model family than synthesis (Kimi/Moonshot)
- Different model family than pillar passes (OpenAI gpt-oss)
- Used in autoresearch Pass 3 specifically because cross-family judging catches voice drift
- 16-41s latency is acceptable because adversarial review is non-blocking

## Cost Profile

NVIDIA build platform is currently free for individual developers (per-account credit quota). All listed models are $0/M tokens. Rate limits and credit limits are the actual constraints, not per-token cost.

Estimated total inference per subject solo reading:
- Phase 1: 1 call to gpt-oss-120b
- Phase 2: 1 call to glm4.7
- Phase 3: 16 parallel calls (5 different models)
- Phase 4: 1 call to gpt-oss-120b
- Phase 5: 1 call to gpt-oss-120b
- Phase 6: 1 call to kimi-k2-instruct-0905
- Phase 7: 1 call to minimax-m2.7
- **Subtotal solo:** 22 calls

Dyadic reading adds Phase 8 composite (1 call to kimi-k2-instruct-0905) and Phase 9 adversarial review (1 call to nemotron-120b). **Subtotal dyadic:** 22 + 22 + 2 = 46 calls.

## Source Citations

- Autoresearch experiment (May 2026, witness-agents subscriber tier): `~/.claude/MEMORY/WORK/autoresearch-witness-models-2026-05-05/SUMMARY-FINAL.md`
- Autoresearch experiment (May 2026, /integratedreading workflow): `audit-output/integratedreading-autoresearch-2026-05-10T06-22-29/SUMMARY-FINAL.md` — 3 passes, 36 trials, V3 baseline.
- Validated model pool: `src/config/witness-capabilities.ts` → `VERIFIED_NVIDIA_MODEL_IDS`
- Routing table source: `src/inference/nvidia-routing.ts` → `WITNESS_NVIDIA_ROUTING`

## Production Lessons (V3 baseline run, May 10 2026)

Real-world reliability data from the 723 dyad regeneration sessions:

### Models that worked reliably
- `openai/gpt-oss-120b` (~30-85s) — ingestion, pillars, synthesis, astro fallback. Solid.
- `openai/gpt-oss-20b` (~400ms-2s) — fast deterministic engines, autoresearch judge. Solid.
- `moonshotai/kimi-k2-instruct` (~80-160s for synthesis pass) — synthesis, composite. Solid; output capped ~3000-4500tk per call.
- `nvidia/nemotron-3-super-120b-a12b` (~3s for short, longer for synthesis) — engine-level reads. Reliable for inference, UNRELIABLE as judge.

### Models with reliability issues
- `z-ai/glm4.7` — **100% failure rate for one subject** (10 consecutive timeouts at 120s each across primary + alias retry chains). Primary suspect: server-side overload at NVIDIA endpoint. Production status: keep as primary with tight 90s cap, mandatory gpt-oss-120b fallback chain, skip-on-fail acceptable.
- `minimaxai/minimax-m2.7` — failed twice with `fetch failed` in V3 runs at chunking step. Regex V2 fallback in `integratedreading-resume.ts` recovered both runs. Production status: best-effort with regex fallback as primary safety net.
- `moonshotai/kimi-k2-instruct-0905` — **deprecated** (returns 410 Gone). Alias to `kimi-k2-instruct`.
- `nvidia/nemotron-3-super-120b-a12b` AS JUDGE — returned 0/40 across all Pass 3 cross-judge calls. **Don't use as judge**; use kimi-k2 or gpt-oss-20b instead.

### Voice calibration findings (2026-05-10 user feedback)
1. **Anatomical precision register beats clinical-equation register.** User preferred Variant A's "pelvic-thoracic junction" prose over baseline-V2's "v₆ = Sun + Mars + Ketu" notation.
2. **Sanskrit kosha names must be translated to meaningful English.** Bare "Pranamaya layer" reads as jargon; "the breath / vital current / rhythm-under-the-rhythm" lands.
3. **Biohack metrics are off-brand.** "HRV > 50ms", "0.2 Hz oscillator", "528 Hz" all violate the brand AVOID list (optimization, hacks, biohacking-as-selling-point). Replace with qualitative somatic tests.

### Hardened Reference Data Principle (LOCKED IN — do not violate)

**The DOCX source readings in `/Volumes/madara/2026/twc-vault/01-Projects/723/` (and equivalent for any future subject) are HARDENED REGRESSION FIXTURES. They are the truth source. The Selemene Rust engines are the system under test.**

Concrete rules:

1. **Chart placements come from the DOCX, not from Selemene.** Lagna, Sun/Moon/Mars sign-degree-nakshatra-pada, Atmakaraka assignment, Darakaraka, planetary placement table, yogas, Mahadasha boundaries — all hardened in the docx. Pre-extract these into the config and feed them into the pipeline.

2. **Selemene output is the engine under test, not the source of truth.** When the pipeline fetches Selemene engine data, we compare it against the docx-extracted truth and **report drift**. We do NOT overwrite the config with Selemene output. We do NOT silently use Selemene values where the docx has authoritative ones.

3. **Drift report is mandatory when a docx exists.** For any subject with a `source_path` config pointing to a docx, the pipeline must emit a drift table: docx-value vs Selemene-value vs delta, per measured field (Vimshottari MD boundaries, birth nakshatra, etc.). Drifts feed back to the Rust engine team for calibration; they do not feed back into the reading.

4. **When the docx says "Mars MD ends 10 Nov 2027 08:16" and Selemene says "26 Sep 2027 13:08", the docx wins in the rendered output, AND the drift is reported.** Either the Rust engine has an ayanamsa calibration bug or the docx has rounding — but the user-facing reading must not pick one silently.

5. **The Lessons file is canonical.** Lessons learned about which fields are authoritative live in this file and in `SKILL.md` under "Hardened Data Principle". Do not drift from this even when the LLM-generated synthesis suggests engine values.

### Autoresearch findings (low-confidence due to judge instability)
- **Pichet V3-anti-pattern-explicit prompt > baseline** (30/40 vs 27.5/40) — only clean comparison, both scored validly. **APPLIED to production**: pichetPillarPrompt now includes explicit anti-pattern list + GOOD/BAD examples.
- **Synthesis Variant rankings inconclusive** — baseline kimi-k2-instruct two-pass scored 0/40 due to judge timeout corruption. Voice inspection of variants shows kimi two-pass is genuinely best (most aphoristic, least wordy, no Eigenwelt/Mitwelt/Umwelt label-leakage).
- **Chunking ranking inconclusive** — both gpt-oss-20b and regex returned judge-timeout zeros. Production stays on minimax-best-effort + regex V2 fallback.
