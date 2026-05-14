# TODO

## Plan
- [x] Inspect the standalone LLM path, observability hooks, deploy workflow, and project task artifacts.
- [x] Create missing `tasks/` artifacts required by the project workflow.
- [x] Add structured LLM failure logging in the standalone Layer 2 path with safe metadata for production diagnosis.
- [x] Add targeted tests for the new logging behavior.
- [x] Run local verification, redeploy the standalone service, and validate the live endpoint/log behavior.
- [x] Add a review section with results and follow-ups.
- [x] Inspect the current Step 3 Dyad integration seam and standalone health/version surfaces.
- [x] Verify Railway deployment metadata support from official docs.
- [x] Write a checkable follow-up plan for deploy-proof visibility and Step 3 planning.
- [x] Add deploy-proof metadata to startup logs and `/health/live` with Railway deployment id as the primary signal and git SHA when available.
- [x] Add tests for the deploy-proof metadata surface.
- [x] Verify locally, redeploy via `railway up`, and confirm the live service exposes the new deploy-proof metadata.
- [x] Write the Step 3 Dyad wiring plan with exact integration points, risks, and verification steps.

## 2026-05-14 Engine Upgrade Leverage Audit

### Plan
- [x] Audit the newer engine/result surfaces that can enrich readings and product features, with emphasis on `nadabrahman`, `sigil-forge`, `sacred-geometry`, and adjacent practice-oriented outputs.
- [x] Compare those richer engine capabilities against the current reading-object/report derivation path to identify where the backend is still under-leveraging them.
- [x] Produce a concrete leverage map for:
  - report-layer upgrades
  - frontend/product features
  - backend contract additions or workflow changes
- [x] Sequence the leverage work into immediate, near-term, and later phases so implementation can stay additive and low-risk.

### Review
- What already exists:
  - `daily-practice` already includes `nadabrahman` in `WORKFLOW_ENGINES`.
  - `creative-expression` already groups `sigil-forge`, `sacred-geometry`, `nadabrahman`, and `numerology`.
  - the type system already exposes rich result objects for:
    - `NadaBrahmanAnalysis` with `primary_raga`, secondary ragas, chakra frequency, dosha recommendation, and rasa mapping
    - `SacredGeometryResult` with named form, symbolism, meditation prompt, and SVG preview status
    - `SigilForgeResult` with intention, method, charging suggestions, guidance, next steps, and SVG preview status
- Current under-leverage:
  - the reading/report derivation path in `src/standalone/standalone-api.ts` is still centered on `biorhythm`, `vedic-clock`, `panchanga`, and to a lesser extent `transits`
  - `buildReadingPractice`, `buildReadingQuestion`, `buildReadingConvergences`, `buildReadingFrictions`, and `buildReadingEvidenceContribution` have no first-class logic for `nadabrahman`, `sigil-forge`, or `sacred-geometry`
  - those newer engines therefore only surface through generic witness-prompt fallback rather than through explicit report semantics
- Important drift:
  - `src/pipeline/interpreter.ts` still appears to extract older/legacy field shapes for some newer engines
  - examples:
    - `nadabrahman` extraction checks `fundamental_tone` / `harmonic`, while the current type exposes `time_recommendation.primary_raga`, recommendations, and chakra/rasa fields
    - `sacred-geometry` extraction checks `primary_form`, while the current type exposes `form.name`, `form.symbolism`, and `meditation`
    - `sigil-forge` extraction checks `result.sigil.intent` / `glyph`, while the current type exposes `intention`, `method`, `charging_suggestions`, and `guidance`
  - that means some of the leverage work is not just presentation. Part of it is type-to-prompt/type-to-report alignment.
- Immediate leverage opportunities:
  - add explicit evidence/report contributions for `nadabrahman` in `daily-practice`
  - use `primary_raga`, `dosha_recommendation`, and `rasa_mapping` to enrich:
    - `practice`
    - `question`
    - evidence/trust copy
  - expose a report-side `resonance` or `attunement` block instead of leaving sonic guidance buried in generic engine text
  - fix interpreter extraction for `nadabrahman`, `sacred-geometry`, and `sigil-forge` so witness text is grounded in the current result shapes
- Near-term feature opportunities:
  - for `creative-expression`, emit additive fields like:
    - `artifact`
    - `ritual`
    - `attunement`
    - `visual_seed`
  - allow report payloads to carry structured renderables such as:
    - `sigil` metadata
    - `sacred_geometry.form`
    - `meditation.prompt`
    - `svg_preview.status`
  - this would support a frontend that can show a usable creative ritual rather than only prose
- Later product opportunities:
  - introduce workflow-specific report modules rather than forcing every workflow through one generic reading shape
  - examples:
    - `daily-practice`: truth, action, regulation, resonance
    - `creative-expression`: symbol, form, tone, charging practice
    - `birth-blueprint`: constitution, pattern, developmental arc
- Recommended sequence:
  - Phase 1: align backend extraction logic with current engine result shapes
  - Phase 2: add additive report/evidence semantics for `nadabrahman` inside `daily-practice`
  - Phase 3: define a first-class `creative-expression` reading object using `sigil-forge` + `sacred-geometry` + `nadabrahman`
  - Phase 4: add frontend renderers for symbolic/ritual artifacts, not just prose

## 2026-05-14 Resonance + Creative Surface Implementation

### Plan
- [x] Phase 1: align backend extraction and witness text generation with the current `nadabrahman`, `sacred-geometry`, and `sigil-forge` result shapes.
- [x] Phase 1: add regression tests that lock the newer engine extraction against current typed results rather than legacy placeholders.
- [x] Phase 2: extend the reading-object/report contract additively for `daily-practice` so resonance/raaga guidance becomes a first-class block rather than generic fallback prose.
- [x] Phase 2: update report/evidence derivation so `nadabrahman` explicitly contributes to `practice`, `question`, and trust surfaces.
- [x] Phase 3: define a first-class `creative-expression` report object in the backend with artifact/ritual/attunement semantics derived from `sigil-forge`, `sacred-geometry`, `nadabrahman`, and `numerology`.
- [x] Phase 3: update the intro-web reading surface so it becomes workflow-aware and can render symbolic/ritual artifact sections for `creative-expression` without breaking `daily-practice`.
- [x] Verify backend locally, verify frontend build and browser behavior for both workflows, and record the results.

### Review
- Backend:
  - aligned `src/pipeline/interpreter.ts` with the current result shapes for:
    - `nadabrahman`
    - `sacred-geometry`
    - `sigil-forge`
  - extended `src/types/interpretation.ts` additively with:
    - `resonance`
    - `creative_surface`
    - typed sub-objects for raga/attunement, sigil, geometry, and numerology
  - updated `src/standalone/standalone-api.ts` so:
    - `daily-practice` emits a first-class `resonance` block
    - `nadabrahman` can shape `practice`, `question`, and evidence/trust copy
    - `creative-expression` emits a first-class `creative_surface` object
    - evidence contribution language is workflow-aware for `nadabrahman`, `sigil-forge`, `sacred-geometry`, and `numerology`
- Tests:
  - added engine-level regression coverage for current `nadabrahman`, `sacred-geometry`, and `sigil-forge` result shapes
  - added a workflow test proving the `daily-practice` resonance block
  - added a workflow test proving the `creative-expression` surface object
- Verification:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts`
  - `npm run build` in `witness-agents-intro-web`
  - Playwright browser verification on `http://127.0.0.1:5113/reading.html` with seeded stored readings for:
    - `daily-practice` at desktop width
    - `creative-expression` at desktop width
    - `creative-expression` at mobile width
  - confirmed:
    - `daily-practice` shows the standalone `Attunement` section and keeps `creative_expression` surfaces hidden
    - `creative-expression` shows `Creative Surface` and hides the standalone resonance panel
    - `creative-expression` switches the practice language to ritual/rehearsal framing
    - both flows stay free of horizontal overflow in browser verification

## Review
- `railway up` was the real deploy path. GitHub `main` push alone did not roll `48.tryambakam.space` because the service is deployed from Railway CLI, not from a GitHub-connected source.
- Railway deployment `87d793a7-3a68-48f5-8d9d-34bfc8c3b8ca` completed successfully on 2026-04-28 and cleared the stale-deploy blocker.
- Deploy-proof follow-up deployed as Railway deployment `c0c8adcc-d1ee-4bfe-a4f2-130085943255` on 2026-04-28.
- Local verification passed:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts`
- Live verification passed:
  - `GET https://48.tryambakam.space/health/live` now returns `witness_build_id` plus `witness_build` metadata sourced from Railway runtime variables.
  - `railway logs --since 5m` shows the startup deployment log with the same deployment id, start time, project, environment, service, domain, and replica metadata.
- Railway docs confirm the implementation choice:
  - `RAILWAY_DEPLOYMENT_ID` is always available to deployments.
  - `RAILWAY_GIT_COMMIT_SHA` is only available for GitHub-triggered deploys, so this service cannot rely on it while it ships through `railway up`.

## Step 3 Dyad Plan
- Scope: proxy-first. Wire the Selemene-compatible proxy endpoints to deterministic Aletheios + Pichet + Synthesis first. Leave `/reading` and `daily-mirror.ts` on the current Pichet-only path for the first cut.
- Contract strategy: keep `witness_question` temporarily as a compatibility field while adding rich dyad output fields. During Step 3, populate the new structure first and only remove or repurpose legacy fields after the consuming client is confirmed.
- [x] Factor `InterpretationPipeline.process()` so the pipeline can accept already-fetched `SelemeneEngineOutput[]` without re-calling Selemene.
  - Files: `src/pipeline/interpreter.ts`
  - Target seam: expose a `processResolvedOutputs(query, engineOutputs)` or equivalent extracted post-fetch path.
- [x] Initialize the standalone server with the shared knowledge path and a singleton pipeline instance.
  - Files: `src/serve.ts`, `src/standalone/standalone-api.ts`
  - Requirement: pass a concrete `knowledge_path` into pipeline config once at startup, not per request.
- [x] Replace the current question-only `buildWitnessLayer()` enrichment path with proxy-first dyad enrichment.
  - Files: `src/standalone/standalone-api.ts`
  - Output target: preserve decoder metadata and add `aletheios`, `pichet`, `synthesis`, `routing_mode`, and `response_cadence`.
  - Input target: derive minimal `PipelineQuery` and `UserState` from request birth data, tier, and decoder state.
- [x] Reuse upstream Selemene results instead of re-fetching inside the pipeline.
  - Reason: avoids extra latency and avoids time drift on engines like `vedic-clock`.
- [x] Delay optional LLM voice passes until after deterministic dyad extraction is present and verified.
  - Files: `src/inference/dyad-engine.ts`, `src/standalone/standalone-api.ts`
  - Guardrail: do not call `DyadInferenceEngine` directly on raw Selemene output; it expects populated `interpretation.aletheios` and `interpretation.pichet` fields.
- [x] Expand standalone proxy tests around both engine and workflow endpoints.
  - Files: `tests/standalone.test.ts`
  - Required assertions: single-engine proxy response contains rich dyad fields; workflow response contains per-engine dyad enrichment plus workflow-level synthesis metadata; compatibility field remains present during transition.
- [x] Verify live against `48.tryambakam.space` after Step 3 deploy.
  - Probe 1: `POST /api/v1/engines/biorhythm/calculate` returns full dyad fields instead of only a short witness question.
  - Probe 2: `POST /api/v1/workflows/:id/execute` returns enriched per-engine dyad output plus workflow-level synthesis.
  - Probe 3: `/metrics` and logs still show healthy LLM and engine behavior with no regression to fallback-only output.

## Step 3 Risks
- `DyadInferenceEngine` is not the first integration seam; using it before deterministic agent extraction will no-op or flatten output.
- Proxy request bodies do not contain a natural-language query, so Step 3 needs a stable default query/user-state mapping or the dyad output will be shallow.
- Response shape churn can break clients if legacy `witness_question` disappears too early.
- Knowledge loading must stay singleton-scoped; per-request initialization will hurt latency and cold starts.

## Step 3 Review
- Local verification passed:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts`
- Railway deployments succeeded on 2026-04-28:
  - `1847bc78-da3b-436c-a690-d8bfaeea9470` shipped the proxy-first dyad wiring.
  - `37bf69d8-eda9-49b7-8b39-5001529fed9a` followed immediately with the decoder-store blank-date persistence fix discovered during live verification.
- Live verification passed:
  - `GET https://48.tryambakam.space/health/live` returned `witness_build_id: 37bf69d8-eda9-49b7-8b39-5001529fed9a` with `service_name: witness-agents` and `started_at: 2026-04-28T14:52:40.669Z`.
  - `POST https://48.tryambakam.space/api/v1/engines/biorhythm/calculate` returned `witness_layer` with `aletheios`, `pichet`, `synthesis`, `routing_mode: pichet-primary`, `response_cadence: immediate`, `kosha_depth: anandamaya`, and the compatibility `witness_question`.
  - `POST https://48.tryambakam.space/api/v1/workflows/daily-practice/execute` returned workflow-level dyad synthesis plus per-engine dyad enrichment for `biorhythm`, `panchanga`, and `vedic-clock`.
- Runtime note:
  - Railway startup logs show the new knowledge path (`/app/knowledge`) and deployment metadata as expected.
  - The initial dyad deploy exposed a fresh-user decoder persistence bug: `getDecoderStateAsync()` was upserting blank `first_visit` / `last_visit` dates before the first visit existed.
  - Follow-up deploy `37bf69d8-eda9-49b7-8b39-5001529fed9a` removed that write on the fresh-state path. Repeating the public proxy probes after that deploy did not reproduce the Supabase date warning.

## Step 3 Contract Cleanup
- Scope: remove the proxy-only `witness_question` compatibility alias now that the consuming client reads dyad fields directly.
- [x] Audit the repo for in-tree consumers of proxy `witness_question`.
  - Result: no source consumer reads `witness_layer.witness_question`; remaining uses are the `/reading` Layer 2 type, tests, and historical task notes.
- [x] Replace the proxy alias with a semantically correct final-text field.
  - Files: `src/standalone/standalone-api.ts`
  - Decision: expose `witness_layer.response` as the final merged text and keep `synthesis` for the explicit dyad merge output.
- [x] Update standalone proxy tests to enforce the new contract.
  - Files: `tests/standalone.test.ts`
  - Guardrail: proxy payloads must not include `witness_question`; `/reading` still retains its Layer 2 `witness_question`.

## Step 3 Contract Cleanup Review
- Local verification passed:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts`
- Railway deployment `820753d8-7231-4784-8a37-d9fcb2ac5a59` succeeded on 2026-04-28.
- Contract result:
  - `witness_layer.response` now carries the final user-facing proxy text.
  - `witness_layer.synthesis` remains available for callers that want the explicit dyad merge.
  - `witness_layer.witness_question` is no longer emitted by proxy engine/workflow endpoints.
- Live verification passed:
  - `GET https://48.tryambakam.space/health/live` returned `witness_build_id: 820753d8-7231-4784-8a37-d9fcb2ac5a59` with `started_at: 2026-04-28T15:49:05.995Z`.
  - `POST https://48.tryambakam.space/api/v1/engines/biorhythm/calculate` returned `witness_layer.response`, retained dyad fields, and omitted `witness_question`.
  - `POST https://48.tryambakam.space/api/v1/workflows/daily-practice/execute` returned `witness_layer.response`, retained workflow synthesis metadata, and omitted `witness_question`.

## Output Refinement Review
- Goal: review the current `daily-practice` workflow payload, run a few structured critique passes, and leave concrete keep/discard recommendations for refining witness-agent output quality.
- Baseline:
  - workflow-level `witness_layer.response` is abstract and generic
  - engine-level dyad outputs are structurally correct but contain repetition and one broken interpolation (`undefined on undefined`)
  - `/reading` and proxy engine/workflow routes currently speak in different output shapes
- [x] Inspect the prompt-generation and synthesis code paths that produced the provided payload.
- [x] Run multiple critique passes against the sample payload: clarity, somatic usefulness, symbolic precision, and workflow coherence.
- [x] Log keep/discard decisions with exact examples from the payload and recommend the next refinement batch.

## Output Refinement Review Notes
- Code paths reviewed:
  - `src/pipeline/interpreter.ts`
  - `src/pipeline/synthesis.ts`
  - `src/standalone/standalone-api.ts`
- Correctness finding:

## 2026-05-08 Live Reading Contract Deploy Gap

### Plan
- [x] Verify the current live workflow payload from `https://48.tryambakam.space/api/v1/workflows/daily-practice/execute`.
- [x] Compare the live payload with the local reading-object contract changes in `src/standalone/standalone-api.ts`, `src/types/interpretation.ts`, and `tests/standalone.test.ts`.
- [x] Confirm the actual production deploy path and live build identity for `48.tryambakam.space`.
- [x] Run local verification on the additive reading-object patch so the deploy sequence is based on a known-good build.
- [x] Write the exact production fix sequence without conflating it with unrelated dirty worktree changes.

### Review
- Root cause:
  - production is still on Railway deployment `a273e119-c4e2-4fa4-b63f-656b37ab52eb`, started `2026-05-05T22:46:19.630Z`
  - that live build still returns the older workflow contract from `POST /api/v1/workflows/daily-practice/execute`
  - the additive reading-object fields (`reading_id`, `reading_url`, `created_at`, `subject`, `evidence`, `title`, `summary`, `convergences`, `frictions`, `practice`, `question`) exist locally but have not been deployed
- Deploy-path confirmation:
  - `railway status` resolves to `Project: robust-adventure`, `Environment: production`, `Service: witness-agents`
  - this service ships through `railway up`, not through GitHub auto-deploy
- Local verification passed for the reading-object patch:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts`
- Safe fix sequence:
  - isolate the reading-object patch from unrelated dirty worktree changes
  - deploy that isolated build with `railway up`
  - verify `GET /health/live` returns a new `witness_build_id`
  - verify `POST /api/v1/workflows/daily-practice/execute` includes the additive reading-object fields
  - if `reading_url` should be non-null, set `WITNESS_READING_BASE_URL` in Railway before or during the rollout
  - biorhythm somatic summarization assumes `critical_days` entries have `{ type, date }`, but the live payload provides string dates. That produces `Next critical: undefined on undefined.` in user-facing output and should be fixed before any stylistic tuning.
- Clarity pass:
  - biorhythm and workflow outputs expose too many internal numbers or counts in the final voice. Full-precision percentages and `1 cross-patterns identified across the full spectrum` read like debug surfaces, not witness guidance.
- Somatic usefulness pass:
  - `vedic-clock` is the strongest current engine output because it names a body locus and a concrete lever (`breath`), but it still over-repeats the same source facts across Aletheios, Pichet, and synthesis.
  - biorhythm has the right high-level tension (`capacity high, emotional softness low`) but weak delivery because the useful insight is buried under decimals and the broken critical-date line.
- Symbolic precision pass:
  - `panchanga` is currently flatter than the raw `witness_prompt`. The proxy output recites the five limbs of time but does not convert them into a meaningful pattern or tension. If the symbolic interpreter cannot add value, the richer raw prompt should survive or be blended in.
- Workflow coherence pass:
  - the workflow-level synthesis is the weakest layer. `Full symbolic portrait across 3 engines` and `1 cross-patterns identified` describe system behavior, not the user's pattern. The workflow voice should lead with the strongest integrated tension, not engine count.
- Keep:
  - the dyad split itself (`aletheios` for pattern, `pichet` for somatic mirroring)
  - the biorhythm core tension (`body ready, emotional field low`)
  - the vedic-clock body anchor (`lung`, `breath`, `Vata`)
- Discard or reduce:
  - repeated convergence boilerplate: `The pattern and the body agree — this is a convergence point worth your attention.`
  - count-based workflow framing
  - full-precision percentages in user-facing copy
  - panchanga list-recap output when it is less meaningful than the raw prompt
- Recommended next refinement batch:
  - fix the `critical_days` formatter bug in `src/pipeline/interpreter.ts`
  - round and compress biorhythm user-facing numerics to signal-level values
  - remove engine-level generic coda unless a real convergence is actually detected
  - rewrite workflow synthesis to name the dominant cross-engine tension directly
  - add a semantic guard so proxy text does not overwrite a richer raw `witness_prompt` with a weaker summary

## Output Refinement Patch
- Goal: implement the first refinement batch in the deterministic dyad pipeline and add regressions that lock the improved behavior in place.
- [x] Fix single-engine formatter correctness and readability in `src/pipeline/interpreter.ts`.
- [x] Rewrite workflow portrait synthesis in `src/pipeline/synthesis.ts` to lead with dominant tension instead of engine/count narration.
- [x] Add proxy-facing regression tests for stronger response selection and the removed failure modes.

## Output Refinement Patch Review
- `src/pipeline/interpreter.ts`
  - fixed the `critical_days` formatter so string-date arrays now produce `Next critical day/window` instead of `undefined on undefined`
  - rounded user-facing biorhythm numerics to whole percentages
  - removed the always-on convergence coda and replaced it with engine-specific integration insights only when a concrete pattern is detectable
  - added a prompt-quality guard so single-engine proxy responses keep the raw `witness_prompt` when the generated dyad summary is semantically weaker
- `src/pipeline/synthesis.ts`
  - replaced workflow portrait openers based on engine counts and pattern counts with direct tension framing derived from live engine outputs
  - added body-first workflow guidance that grounds the synthesis in breath, pacing, and action sizing for the current state
- Tests:
  - added a biorhythm regression proving rounded numerics, correct critical window formatting, and removal of the generic coda
  - added a panchanga regression proving the stronger raw `witness_prompt` survives when the generated proxy summary is weaker
  - added a workflow regression proving the response no longer leads with `Full symbolic portrait across ...` or `cross-patterns identified`
- Verification passed:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts`

## Output Refinement Live Pass
- Goal: deploy the refinement patch, collect fresh production samples, and run an autoresearch-style keep/discard review against actual live outputs.
- Baseline:
  - local formatter/synthesis regressions are fixed and covered by tests
  - production still needs to be sampled after deploy to see whether the improved copy is materially stronger in practice
- [x] Deploy the current refinement patch to Railway and verify the new build is live.
- [x] Capture fresh live samples for at least the proxy biorhythm engine and the `daily-practice` workflow.
- [x] Run a second autoresearch pass on the live outputs with explicit keep/discard decisions and a next-batch recommendation.

## Output Refinement Live Pass Review
- Deploy verification:
  - Railway deployment `a7b42aca-4d98-448e-b1c5-73d126c5351b` is live on `48.tryambakam.space`
  - `GET /health/live` returned `witness_build_id: a7b42aca-4d98-448e-b1c5-73d126c5351b` with `started_at: 2026-04-30T21:56:17.721Z`
- Live samples reviewed:
  - `POST /api/v1/engines/biorhythm/calculate`
  - `POST /api/v1/engines/panchanga/calculate`
  - `POST /api/v1/workflows/daily-practice/execute`
- Research question:
  - Do the deployed refinements produce stronger user-facing witness responses than the prior baseline without reintroducing correctness or flattening?
- Success metric:
  - clarity score from founder review
  - correctness score: no broken interpolation, no count-based opener, no precision noise in user-facing dyad copy
  - semantic value: final `response` should be at least as useful as the strongest available prompt
- Experiment log:
  - `01 | Does biorhythm final response beat the old decimal-heavy dyad summary? | response previously exposed noisy percentages and broken critical-day interpolation | keep raw witness prompt when it out-scores the generated summary | clarity + correctness | better | keep | live response is concise, somatic, and the structured dyad fields still preserve the critical window detail`
  - `02 | Does panchanga final response beat the flat symbolic recap? | response previously collapsed into a five-limb list | keep raw witness prompt when the generated symbolic frame is weaker | symbolic precision | better | keep | live response now keeps the stronger mirror question instead of flattening it`
  - `03 | Does workflow synthesis beat count-based system narration? | workflow opened with engine count and cross-pattern count | lead with dominant tension derived from biorhythm + vedic-clock + panchanga | usefulness | better | keep | live workflow now opens with regulation/timing tension instead of architecture narration`
  - `04 | Should workflow keep the full explanatory middle paragraph? | new workflow response adds strong tension framing plus a long support paragraph | compress the support paragraph into fewer, higher-signal lines | compression/readability | mixed | discard current verbosity | the live workflow is materially better but still reads slightly over-explained`
  - `05 | Should biorhythm response be raw prompt only? | prompt guard hides the generated critical-window line from final response | blend strongest raw prompt with one concrete operational line | practical usefulness | mixed | queue for retest | current final response is stronger emotionally, but it loses the concrete May 5–6 timing unless the client also reads `pichet``
  - `06 | Should workflow end with three separate directives? | current ending stacks breath, action sizing, and timing guidance | compress to one body instruction + one action instruction | cadence | mixed | queue for retest | all three lines are valid, but together they slightly dilute punch`
- Winning changes:
  - prompt guard for weak panchanga/biorhythm final summaries
  - rounded biorhythm numerics
  - removal of `undefined on undefined`
  - workflow tension-first opener
- Discarded ideas:
  - count-based workflow framing
  - generic convergence coda
  - flat panchanga recap as final response
- Recommended next batch:
  - blend biorhythm raw prompt with one concrete timing or capacity line instead of hard-switching to the raw prompt
  - compress workflow synthesis to 4-5 sentences max
  - make workflow closing cadence choose one strongest actionable instruction instead of stacking three

## Output Refinement Batch 2
- Goal: implement the second refinement pass from the live autoresearch review and patch client selectors to surface `response` plus one short practical detail line.
- [ ] Blend the biorhythm final `response` with one concrete operational line when the raw prompt wins.
- [ ] Compress workflow synthesis so the final response stays within a tighter 4-5 sentence cadence.
- [ ] Patch the website and Raycast client selectors/presenters to prefer `witness_layer.response` and optionally show one short `pichet` line.

## Witness Reading Spec Update Plan
- Goal: audit the witness reading product spec against the current `witness-agents-intro-web` frontend and the `witness-agents` payload contract, then classify implemented vs partial vs missing.
- [x] Read the spec and extract the concrete frontend and backend acceptance checks.
- [x] Inspect the intro web intake flow and reading page rendering against the spec.
- [x] Inspect the live backend contract in `witness-agents` for current and proposed additive fields.
- [x] Run lightweight verification where useful and write a review summary with concrete file references.

## Witness Reading Spec Update Review
- Goal: update the website reading product spec so it reflects the current live contract, the delivered frontend behavior, and the next real payload/presentation gaps instead of mixing future-state ideas with already-shipped work.
- [x] Add a `Current Truth State` section to the spec that clearly distinguishes what is already live from what is still proposed.
- [x] Rewrite the payload-contract section so it separates the current contract, the required backend additions, and the frontend selection/rendering rules.
- [x] Add an explicit presentation-policy section for `response`, `synthesis`, `aletheios`, `pichet`, per-engine cards, and one-line practical detail surfaces.
- [x] Tighten the reading-quality requirements so the spec bans weak patterns already seen in production: placeholder interpolation, precision-heavy numerics, count-based openers, generic convergence boilerplate, and flat symbolic recap.
- [x] Re-sequence the roadmap into immediate contract hardening, reading-page trust/explainability, and only then persistence/share features.
- [x] Add acceptance criteria so future spec implementation can be verified against live workflow samples instead of subjective tone alone.

### Notes
- The current spec is directionally strong, but it still mixes three different layers:
  - what the website already does today
  - what the `witness-agents` contract currently returns
  - what the ideal report object should eventually become
- The next version should separate those layers explicitly so roadmap decisions are easier:
  - `Current behavior`
  - `Near-term contract upgrades`
  - `Longer-term product surface`
- The largest gap to document is not route structure anymore; it is presentation semantics:

### Audit Findings
- Implemented:
  - the homepage intake submits `birth_data` with date, optional time, name, timezone, and coordinates to the workflow endpoint, stores the latest reading, and redirects to `/reading.html`
  - the reading page renders workflow synthesis, a separate workflow response panel, explicit Aletheios and Pichet sections, and per-engine witness cards
  - parity handling for `response === synthesis` is present and intentionally collapses the duplicate workflow response block
  - the proxy/backend contract already exposes `response`, `synthesis`, `aletheios`, `pichet`, `routing_mode`, `response_cadence`, `kosha_depth`, `tier`, per-engine `witness_layer`, and `witness_prompt`
  - backend tests lock in the current witness-layer shape and the output-quality rules around stronger raw prompts, one practical detail line, and non-count-based workflow openers
- Partial or mismatched:
  - frontend fallback order does not match the spec yet; it prefers `response -> synthesis -> witness_prompt -> witness_question` and does not use `aletheios` / `pichet` as fallback voices before raw prompt
  - the reading heading is still inferred from the first paragraph of `response` / `synthesis`; `witness_layer.title` is not consumed
  - identity/timing metadata is only partly surfaced on the reading page; it shows saved time, workflow, birth date, and location, but not a fuller subject/timing object
  - engine cards still render `Raw Prompt`, which is useful for inspection but goes beyond the stricter report-style presentation described in the spec
- Missing:
  - additive report-object fields are not implemented in the exposed witness payload: no `reading_id`, `reading_url`, `created_at`, `subject`, `witness_layer.title`, `summary`, `convergences`, `frictions`, `practice`, or `question`
  - no top-level `evidence.engines_used` / `evidence.contributions` block is exposed or rendered
  - no frontend sections exist yet for explicit evidence, convergences/frictions, practical next steps, reflective question, permalink/share, or compare mode
- Verification:
  - `npm run build` passed in `witness-agents-intro-web`
  - `npm run typecheck` passed in `witness-agents`
  - `node --import tsx --test tests/standalone.test.ts` passed in `witness-agents`

## Witness Reading Spec Implementation Plan
- Goal: align the live website and witness payload with the reading spec in additive phases, starting with low-risk frontend policy fixes and then extending the backend contract.

### Phase 1: Frontend Rendering Policy Cleanup (`witness-agents-intro-web`)

Objective:
- make the current reading page match the spec's deterministic presentation rules without waiting on backend contract changes

Files:
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/js/lib/witnessAccess.js`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/js/reading.js`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/reading.html`

Checklist:
- [x] Change the primary reading selector to follow the spec fallback order:
  - workflow and engine surfaces should prefer `response`
  - then `synthesis`
  - then the stronger dyad voice (`pichet` or `aletheios`)
  - then raw `witness_prompt` as last-resort rescue copy
- [x] Remove `witness_question` from the intro-web fallback path for reading-page rendering.
- [x] Prefer `witness_layer.title` for the page title when present.
- [x] Keep the current inferred-title logic only as fallback for older payloads.
- [x] Add one workflow-level practical-detail or next-step section as a separate report panel.
- [x] Keep the existing `response === synthesis` parity handling.
- [x] Move `Raw Prompt` on engine cards behind a collapsed inspection toggle.

Verification:
- [ ] Reading page still renders older payloads with no `title`.
- [ ] Reading page still collapses duplicate `response` / `synthesis`.
- [ ] Engine cards still render when only `witness_prompt` exists.
- [x] `npm run build` passes in `witness-agents-intro-web`.

Review:
- The intro-web selector now follows the spec-aligned order `response -> synthesis -> dyad voice -> witness_prompt` and no longer falls back to `witness_question`.
- The reading hero now prefers `witness_layer.title` when available and keeps the previous inferred-title path for older payloads.
- The reading page now has a dedicated workflow-level `Next Move` panel driven by the short practical-detail extraction path.
- Engine-card raw prompts are still available for inspection, but no longer occupy default visible report space.

### Phase 2: Frontend Future Slots (`witness-agents-intro-web`)

Objective:
- prepare the reading page to adopt additive report fields safely before they are mandatory

Files:
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/js/reading.js`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/reading.html`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/css/reading.css`

Checklist:
- [x] Add optional rendering sections for `summary`, `convergences`, `frictions`, `practice`, `question`, and `evidence`.
- [x] Hide those sections completely when the payload does not include them.
- [x] Keep the report flow ordered as:
  - identity/timing metadata
  - workflow reading
  - dyad voices
  - evidence / engine chorus
  - one practical next-step area
- [x] Keep the default reading surface report-like rather than inspection-heavy.

Verification:
- [ ] Older payloads render cleanly with all new sections hidden.
- [ ] New sections do not create empty headings or placeholder copy.
- [x] `npm run build` passes in `witness-agents-intro-web`.

Review:
- The reading page now contains hidden-by-default slots for:
  - `summary`
  - `convergences`
  - `frictions`
  - `practice`
  - `question`
  - `evidence`
- `practice` now shares the existing practical-action panel so future payloads can upgrade that area without duplicating the flow.

## Witness Reading Backend Phase 2 Plan
- Goal: add the first real reading-object fields to the standalone workflow response without breaking the current intro-web consumer contract.
- [x] Extend the backend reading types with additive report-field and evidence interfaces that can describe `title`, `summary`, `convergences`, `frictions`, `practice`, `question`, and evidence contributions.
- [x] Add deterministic workflow-level derivation helpers in `src/standalone/standalone-api.ts` for:
  - `reading_id`
  - `reading_url` when configured, otherwise `null`
  - `created_at`
  - `subject`
  - `witness_layer.title`
  - `witness_layer.summary`
  - `witness_layer.convergences`
  - `witness_layer.frictions`
  - `witness_layer.practice`
  - `witness_layer.question`
  - top-level `evidence`
- [x] Preserve the existing fields and promo/inference behavior exactly:
  - `response`
  - `synthesis`
  - `aletheios`
  - `pichet`
  - `routing_mode`
  - `response_cadence`
  - `kosha_depth`
  - `clifford_level`
  - `tier`
  - promo metadata
  - per-engine `witness_layer`
- [x] Add contract tests for workflow responses that prove:
  - new fields are present on a real workflow payload
  - older consumers can still rely on the current fields unchanged
  - `reading_url` stays `null` unless explicitly configured
  - evidence and report fields are omitted or populated deterministically rather than filled with placeholders
- [x] Run typecheck and targeted standalone tests, then document the result in this file.

### Review
- Implemented in:
  - `src/types/interpretation.ts`
  - `src/standalone/standalone-api.ts`
  - `tests/standalone.test.ts`
- Added additive backend types for:
  - `WitnessReadingSubject`
  - `WitnessEvidenceContribution`
  - `WitnessEvidence`
  - optional report fields on `WitnessInterpretation`: `title`, `summary`, `convergences`, `frictions`, `practice`, `question`, `evidence`
- Extended the standalone workflow response with the first reading-object envelope fields:
  - top-level `reading_id`
  - top-level `reading_url`
  - top-level `workflow_id`
  - top-level `created_at`
  - top-level `subject`
  - top-level `evidence`
  - additive `witness_layer.title`
  - additive `witness_layer.summary`
  - additive `witness_layer.convergences`
  - additive `witness_layer.frictions`
  - additive `witness_layer.practice`
  - additive `witness_layer.question`
- Kept current consumer fields stable:
  - `response`
  - `synthesis`
  - `aletheios`
  - `pichet`
  - `routing_mode`
  - `response_cadence`
  - `kosha_depth`
  - `clifford_level`
  - `tier`
  - promo metadata
  - workflow/per-engine inference metadata
  - per-engine `witness_layer`
- Contract behavior:
  - report fields are currently derived only for the workflow-level witness layer, not per-engine witness layers
  - `reading_url` is `null` unless `WITNESS_READING_BASE_URL` is configured
  - `subject.location_label` is passed through when the request includes `birth_data.location_label`; otherwise it stays `null`
  - evidence and report fields are derived from current workflow outputs and existing witness text rather than seeded fixtures
- Verification on `2026-05-06`:
  - `npm run typecheck` passed
  - `node --import tsx --test tests/standalone.test.ts` passed
  - added assertions that prove:
    - workflow payloads now include the additive reading-object fields
    - the default `reading_url` is `null`
    - configured `WITNESS_READING_BASE_URL` produces a real `reading_url`
    - a rich daily-practice payload yields specific `title`, `summary`, `convergences`, `frictions`, `practice`, `question`, and structured `evidence`
- `evidence.engines_used` renders as compact engine tokens and `evidence.contributions` renders as source-specific evidence cards.
- Older payloads should remain visually unchanged because every new section is gated on actual payload content, but this still needs a browser-level verification pass against representative saved payloads.

### Phase 3: Additive Report Fields (`witness-agents`)

Objective:
- extend the witness payload into a clearer reading object without breaking current consumers

Files:
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/src/types/interpretation.ts`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/src/standalone/standalone-api.ts`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/src/pipeline/interpreter.ts`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/src/pipeline/synthesis.ts`

Checklist:
- [ ] Extend the public witness-layer type to allow:
  - `title`
  - `summary`
  - `convergences`
  - `frictions`
  - `practice`
  - `question`
- [ ] Define deterministic population rules for each new field so weak boilerplate is omitted instead of emitted.
- [ ] Preserve current fields: `response`, `synthesis`, `aletheios`, `pichet`, `routing_mode`, `response_cadence`, `tier`, `kosha_depth`, `clifford_level`.
- [ ] Populate new fields first on workflow-level witness output before expanding engine-level use.
- [ ] Keep the current output-quality guardrails around stronger raw prompts and practical-detail blending.

Verification:
- [ ] `npm run typecheck` passes in `witness-agents`.
- [ ] Existing standalone witness-layer tests still pass.
- [ ] New snapshot or contract tests prove older clients can ignore new fields safely.

### Phase 4: Evidence Contract (`witness-agents`)

Objective:
- expose why the reading exists in a stable, human-readable structure

Files:
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/src/types/interpretation.ts`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/src/standalone/standalone-api.ts`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/src/pipeline/synthesis.ts`

Checklist:
- [ ] Add top-level `evidence.engines_used`.
- [ ] Add top-level `evidence.contributions`.
- [ ] Define one concise `signal` and one concise `impact` per engine contribution.
- [ ] Keep evidence readable and product-facing rather than leaking internal debug mechanics.
- [ ] Preserve `routing_mode` and related metadata for inspection.

Verification:
- [ ] Workflow payload tests assert evidence fields exist when multi-engine synthesis runs.
- [ ] Evidence remains optional and does not break current consumers.

### Phase 5: Reading Identity (`witness-agents`)

Objective:
- introduce reading-object identity fields only when they reflect real backend behavior

Files:
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/src/types/interpretation.ts`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/src/standalone/standalone-api.ts`
- any future persistence or retrieval module added for saved readings

Checklist:
- [ ] Add `created_at`.
- [ ] Add `reading_id`.
- [ ] Add `subject` when the payload owns a stable user-facing reading object.
- [ ] Add `reading_url` only after a real retrieval route exists.
- [ ] Keep these fields optional until persistence and retrieval are real.

Verification:
- [ ] Contract tests confirm identity fields are additive.
- [ ] No UI exposes permalink/share before retrieval exists.

### Phase 6: Frontend Adoption of Additive Fields (`witness-agents-intro-web`)

Objective:
- light up the new backend fields in the reading page once the contract is stable

Files:
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/js/reading.js`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/reading.html`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/css/reading.css`

Checklist:
- [ ] Render `title` and `summary` when present.
- [ ] Render `convergences` and `frictions` as explicit sections.
- [ ] Render `practice` as the practical next-step area.
- [ ] Render `question` as the closing reflective cue.
- [ ] Render `evidence.engines_used` and `evidence.contributions` as the trust surface.
- [ ] Keep fallback behavior for older payloads.

Verification:
- [ ] Mixed payloads render correctly:
  - current contract only
  - current contract plus report fields
  - current contract plus evidence
- [ ] `npm run build` passes in `witness-agents-intro-web`.

### Suggested Execution Order
- [ ] Complete Phase 1 before touching the backend contract.
- [ ] Complete Phases 3 and 4 before building trust-surface UI.
- [ ] Complete Phase 5 before any permalink/share UI work.
- [ ] Treat compare mode and saved-reading history as later work, not part of this spec-alignment pass.
  - `witness_layer.response` should be the primary reading text
  - `pichet` should be available as a short practical-detail line when useful

## Anonymous-First Promo Rollout
- Goal: ship the anonymous enterprise promo path for the public website without introducing Discord auth, while verifying whether the NVIDIA provider is actually viable in production.
- [x] Add the standalone `witness-enterprise` tier alias and map it to core `enterprise`.
- [x] Attach additive promo metadata to the public info/health/workflow witness surfaces.
- [x] Keep the workflow website path anonymous and compatible with the existing `113.tryambakam.space -> 48.tryambakam.space` flow.
- [x] Reduce workflow LLM fanout so per-engine workflow cards stay deterministic and only the final witness layer attempts LLM inference.
- [x] Collapse standalone proxy inference to a single synthesis pass so the public workflow path does not run full dyad LLM fanout.
- [x] Add a standalone LLM timeout override and wire it from production env.
- [x] Verify the live promo contract on `48.tryambakam.space`.
- [ ] Get live NVIDIA inference to complete successfully on the public workflow path.

## Anonymous-First Promo Rollout Review
- Local verification passed after each code change:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts`
- Production contract is live:
  - `WITNESS_TIER=witness-enterprise`
  - `LLM_PROVIDER=nvidia`
  - `WITNESS_LLM_TIMEOUT_MS=90000`
  - `GET https://48.tryambakam.space/health/live` now reports `witness_tier: witness-enterprise`, `witness_llm_provider: nvidia`, `promo_active: true`, and `promo_expires_at: 2026-05-26T23:59:59Z`.
- Railway deployments executed during this rollout:
  - `caa46ee2-5da5-40af-9aa7-7686753105f3` — reduced workflow fanout to one top-level LLM-backed witness layer.
  - `76e5af3b-4662-4bc7-b360-127bdd83b34e` — retuned enterprise NVIDIA routing toward faster models for the promo path.
  - `0ea1e373-070b-49a9-ac20-f731155853c8` — switched standalone proxy inference to synthesis-only.
  - `ab54f512-4a5d-42dc-9b4e-ac61a59b32a0` — wired and enabled the production LLM timeout override.
- Verified live behavior:
  - Workflow and engine endpoints return the enterprise promo contract and remain publicly callable without auth.
  - Per-engine workflow witness layers are deterministic as intended.
  - Top-level workflow `witness_layer.inference` still falls back to `null` in production because NVIDIA requests abort before completion.
- Root-cause conclusion:
  - The remaining blocker is not workflow fanout anymore.
  - It is not Railway-only.
  - A direct local probe using the same production `NVIDIA_API_KEY`, the same provider implementation, and even a trivial `Say hello in one sentence` prompt still aborted at the provider timeout.
  - The public workflow call now waits until the configured timeout ceiling and then falls back deterministically.
- Current state:
  - Anonymous enterprise promo plumbing is implemented and live.
  - The website-facing witness contract is upgraded and stable.
  - NVIDIA-backed witness output is still blocked by provider-level timeout behavior, so production currently serves deterministic fallback text rather than live NVIDIA synthesis.

## NVIDIA Routing Cleanup
- Goal: remove unstable NVIDIA models from active routing, keep only verified models, and make paid-tier synthesis use a model that succeeds through the real Node/provider path.
- [x] Re-probe the production NVIDIA key directly and confirm which models succeed.
- [x] Replace active tier routes that pointed at unverified or timing-out models.
- [x] Add a regression test that blocks unverified models from re-entering active NVIDIA routing.
- [x] Redeploy and verify the public workflow path returns live NVIDIA synthesis with model trace metadata.

## NVIDIA Routing Cleanup Review
- Direct probes with the production NVIDIA key showed:
  - working: `moonshotai/kimi-k2-instruct-0905`, `moonshotai/kimi-k2-instruct`, `openai/gpt-oss-20b`
  - timing out: `meta/llama-3.3-70b-instruct`
- More importantly, the real failure was narrower than “NVIDIA is broken”:
  - `kimi-k2-0905` succeeded with direct `curl`
  - the same witness synthesis prompt stalled under the Node/provider path
  - `gpt-oss-20b` succeeded under the exact same Node/provider path in ~5-6s
- Routing changes shipped in Railway deployment `4feccf7c-f5f5-4a1b-b7e8-078f088306ca`:
  - active NVIDIA routing now only uses `kimi-k2`, `kimi-k2-0905`, and `gpt-oss-20b`
  - paid-tier synthesis now routes through `openai/gpt-oss-20b`
- Live verification passed on `2026-05-06`:
  - `POST https://48.tryambakam.space/api/v1/workflows/daily-practice/execute` returned in ~5.3s
  - `witness_layer.inference.provider = nvidia`
  - `witness_layer.inference.roles.synthesis.model_used = openai/gpt-oss-20b`
  - promo metadata remained intact: `promo_active = true`, `promo_expires_at = 2026-05-26T23:59:59Z`

## Reporting Trace + Probe
- Goal: expose exact model trace in the website’s saved reading UI and add a role-aware NVIDIA probe that exercises the real provider path without changing promo behavior.
- [x] Preserve existing enterprise promo behavior; do not alter promo duration, gating, or entitlement logic.
- [x] Add stored inference summary metadata to the website reading payload cache.
- [x] Render provider/model/role trace on the dedicated reading page.
- [x] Add an automated active-route NVIDIA probe script and npm entrypoint.
- [x] Verify backend tests, website build, and the probe script.

## Reporting Trace + Probe Review
- Website/reporting changes:
  - saved readings now persist a small `reporting.inference` summary beside the raw workflow payload
  - the reading page now shows `Provider`, `Model`, `Role`, and a dedicated inference-trace panel when metadata is present
- Backend/tooling changes:
  - added `npm run probe:nvidia-routing`
  - probe uses the real `NvidiaProvider` path and role-aware prompt shapes instead of a trivial hello-world ping
- Verification:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts tests/nvidia-routing.test.ts`
  - `npm run build` in `witness-agents-intro-web`
- Probe outcome with the production NVIDIA key:
  - healthy:
    - subscriber all roles
    - enterprise `pichet`, `synthesis`, `fast`, `deep`
    - initiate `pichet`, `synthesis`, `deep`
    - free `pichet`, `synthesis`, `fast`, `deep`
  - failing under real prompt path:
    - free `aletheios`
    - enterprise `aletheios`
    - initiate `aletheios`
    - initiate `fast`
- Important conclusion:
  - model verification and route verification are not the same thing
  - a model can work for synthesis and still fail for a tier-specific agent prompt
  - the current public website path remains healthy because it uses synthesis-only inference
  - raw `witness_prompt` should be treated as backend-owned rescue copy, not a frontend default
- The spec should also absorb the latest quality findings from live output review:
  - workflow synthesis must lead with the dominant tension, not engine counts
  - engine responses should avoid debug numerics and null/undefined placeholders
  - panchanga-style symbolic outputs should preserve stronger mirror questions when generated summaries are flatter

### Review
- Updated the website spec file into an outline-first evolution draft instead of a prose-heavy mixed-state document.
- The new outline now separates:
  - current live frontend behavior
  - current live payload semantics
  - proposed additive backend contract work
- Added a frontend presentation-policy section so the document now states:
  - `witness_layer.response` is the primary reading text
  - `pichet` can support a short practical-detail surface
  - raw `witness_prompt` is rescue copy, not the default frontend voice
- Added explicit reading-quality rules and banned known failure modes from recent production review.
- Re-sequenced the roadmap so contract hardening and explainability come before persistence and sharing.
- Added acceptance criteria so future implementation can be verified against live samples rather than only tone judgment.

## Witness Reading Spec Prose + Contract Draft
- Goal: expand the outline-first website spec into a readable working draft and turn section 7 into a concrete additive JSON proposal without implying backend breakage.
- [x] Expand the outline into full prose while preserving the additive backend framing.
- [x] Turn section 7 into a precise example JSON contract that extends the current workflow shape without replacing it.
- [x] Re-review the final draft to confirm it distinguishes live behavior from proposed contract evolution.

### Review
- Expanded the website reading spec from a scaffold into a prose working draft in `witness-agents-intro-web/tasks/witness-reading-product-spec.md`.
- Kept the non-breaking rule explicit throughout:
  - current website flow remains baseline
  - current `witness-agents` payload remains valid
  - proposed report fields are additive
- Added a concrete example JSON payload under section 7 showing how `reading_id`, `reading_url`, `title`, `summary`, `convergences`, `frictions`, `practice`, `question`, and `evidence` can be introduced without removing current fields.
- Preserved the frontend rendering-policy guidance so the spec still states:
  - `witness_layer.response` is primary
  - `pichet` may support a short practical-detail surface
  - raw `witness_prompt` remains rescue copy rather than default frontend voice
- Verification:
  - manual review of the updated spec confirmed the prose and JSON example are aligned with additive evolution rather than replacement.

## Witness Reading Implementation Checklists
- Goal: derive concrete backend and frontend execution checklists from the current reading product spec without changing the additive contract framing.
- [x] Extract the backend work into implementation phases for `witness-agents`.
- [x] Extract the website work into implementation phases for `witness-agents-intro-web`.
- [ ] Attach both checklists to the reading spec so contract, rendering policy, and implementation sequence live in one document.
- [x] Review the checklists for ownership, sequencing, and verification expectations.

### Review
- Created a concrete fallback checklist document in [tasks/witness-reading-implementation-checklists.md](/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/tasks/witness-reading-implementation-checklists.md).
- The checklist is split into:
  - backend phases for contract hardening, additive report fields, evidence, and persistence
  - frontend phases for rendering policy, additive field adoption, trust surfaces, and reading-object features
- The additive contract rule is preserved throughout the checklists.
- Blocker:
  - direct write-back into the website spec file in the sibling repo was attempted but blocked by the approval system for this session
  - the local fallback doc exists so implementation planning is not blocked

## Website NVIDIA Tier Wiring
- Goal: review the recent inference/provider upgrades and make the public website route actually consume the new tier-routed NVIDIA model layer instead of only the deterministic proxy interpretation.
- [x] Audit the current website path and confirm whether `48.tryambakam.space/api/v1/workflows/daily-practice/execute` was using the new LLM inference stack.
- [x] Wire optional LLM provider support into the standalone proxy pipeline so workflow and engine witness output can consume tier-routed inference models when configured.
- [x] Expose additive provider/model trace metadata in `witness_layer` and provider/tier metadata in info/health surfaces.
- [x] Add standalone tests covering active NVIDIA-style inference wiring and deterministic fallback when the provider fails.

### Review
- Root finding:
  - the intro website already called the correct witness-enriched workflow route
  - but that route was still using `InterpretationPipeline.processResolvedOutputs(...)` in deterministic mode only
  - `DyadInferenceEngine` and the new NVIDIA/OpenRouter provider stack existed in the repo but were not wired into the website-facing workflow path
- Implementation:
  - extended `InterpretationPipeline` to accept an optional LLM provider and run `DyadInferenceEngine` after the deterministic interpretation pass
  - preserved deterministic fallback if the LLM provider is absent or inference fails
  - attached additive inference trace metadata to `WitnessInterpretation` / `witness_layer`
  - surfaced `witness_tier`, `witness_llm_provider`, and `witness_llm_enabled` on standalone info/health endpoints
  - enabled standalone handler injection of an LLM provider for tests and custom wiring
- Website impact:
  - no website code change is required for the primary behavior upgrade
  - the existing website already renders `witness_layer.response`, `aletheios`, `pichet`, and `tier`
  - once this backend is deployed with `NVIDIA_API_KEY` and `LLM_PROVIDER=nvidia` (or auto-selected NVIDIA), the website path will start consuming tier-routed NVIDIA inference output
  - optional future website work can render the new additive `witness_layer.inference` metadata for provider/model visibility
- Verification passed:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts`

## Promo Tier + Discord OAuth Decision
- Goal: evaluate whether the launch should simplify around a temporary Enterprise-grade promo and always-on Discord OAuth instead of adding public tier complexity immediately.
- [x] Review the current backend tier model and website path constraints.
- [x] Identify what gets simpler if the promo collapses public access to one high tier temporarily.
- [x] Identify what new constraints always-on Discord OAuth introduces for onboarding, attribution, and future billing.
- [x] Recommend the lowest-complexity launch plan from the current architecture.

### Review
- Current architecture:
  - the public website path is still effectively one deployed standalone tier at a time via `WITNESS_TIER`
  - per-request public tier selection is not implemented and would add gating/auth complexity
  - standalone/public flow currently has no required auth
  - full tier semantics exist in core types and gating, but public website routing is not yet user-account-driven
- Simplification insight:
  - a temporary “everyone gets Enterprise-grade interpretation” promo removes the immediate need to build multi-tier public switching
  - it does NOT by itself solve identity, attribution, usage tracking, or promo expiry
  - Discord OAuth can solve identity and promo linking, but it adds onboarding friction and moves the launch from anonymous public reading to account-bound access
- Recommendation direction:
  - if the priority is fastest coherent launch, collapse the promo experience to one premium public witness mode first
  - use Discord OAuth as the identity layer only if you are ready to make sign-in a real product requirement, not just a hidden implementation detail

## NVIDIA Route Pruning + Tier Capability Policy
- Goal: remove the last NVIDIA routes that fail under the real provider path and stop tier/model policy from living in scattered constants.
- [x] Centralize `billing plan -> witness tier -> capability profile` policy in one config module.
- [x] Move verified NVIDIA model pool and active per-tier role routing behind that policy module.
- [x] Prune the failing active routes using only provider-path-validated model/budget combinations.
- [x] Update affected tests to assert the new central policy and route selections.
- [x] Run `npm run typecheck`, `node --import tsx --test tests/standalone.test.ts tests/nvidia-routing.test.ts tests/wave1.test.ts`, and `npm run probe:nvidia-routing` with the production key.
- [x] Add a review note with the exact routes changed, probe result, and any remaining tier-policy follow-up.

### Review
- Added `src/config/witness-capabilities.ts` as the single source for:
  - Supabase billing tier → Witness tier mapping
  - per-tier capability profile (`max_kosha`, `max_clifford`, `rate_limit_per_day`, `agents_mode`)
  - verified NVIDIA model pool
  - active NVIDIA routing table
- Repointed the old scattered constants to the central policy:
  - `src/types/engine.ts` now sources `SUPABASE_TIER_MAP` from the central config
  - `src/types/interpretation.ts` now derives tier limits from the central config
  - `src/tiers/tier-gate.ts` now derives `agents_mode` from the central config
  - `src/inference/nvidia-routing.ts` now re-exports the central NVIDIA routing + verified pool
- Route cleanup result:
  - the initial four failing routes were pruned
  - the first full probe exposed one larger truth: Kimi was still unreliable in several active role paths
  - active NVIDIA routing was simplified to one provider-path-stable model family for now: `openai/gpt-oss-20b`
- Active route policy after cleanup:
  - all active NVIDIA routes across `free`, `subscriber`, `enterprise`, and `initiate` now use `openai/gpt-oss-20b`
  - tiers now differ by capability + token budget, not by fragile model swaps
- Verification passed:
  - `npm run typecheck`
  - `node --import tsx --test tests/standalone.test.ts tests/nvidia-routing.test.ts tests/wave1.test.ts`
  - `NVIDIA_API_KEY=\"$(railway variables --json | jq -r '.NVIDIA_API_KEY')\" npm run probe:nvidia-routing`
- Probe outcome:
  - full provider-path sweep passed for every active route
  - no active NVIDIA tier/role route is still timing out under the real Node provider path
- Deployment:
  - `railway up` produced deployment `a273e119-c4e2-4fa4-b63f-656b37ab52eb`
  - startup logs showed the new deployment live with `public_domain: 48.tryambakam.space`
  - `GET /health/live` now reports `witness_build_id: a273e119-c4e2-4fa4-b63f-656b37ab52eb`
  - `POST /api/v1/workflows/daily-practice/execute` returns `provider: nvidia`, `roles: [\"synthesis\"]`, `model_used: openai/gpt-oss-20b`, `tier: enterprise`, `promo_active: true`
- Follow-up:
  - if we want model diversity back later, reintroduce it only by adding role-aware probe qualification first, then promoting the model into the verified pool
