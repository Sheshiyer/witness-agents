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
  - `witness_layer.response` should be the primary reading text
  - `pichet` should be available as a short practical-detail line when useful
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
