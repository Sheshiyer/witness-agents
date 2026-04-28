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
