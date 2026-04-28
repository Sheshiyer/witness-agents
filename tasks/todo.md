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
- [ ] Factor `InterpretationPipeline.process()` so the pipeline can accept already-fetched `SelemeneEngineOutput[]` without re-calling Selemene.
  - Files: `src/pipeline/interpreter.ts`
  - Target seam: expose a `processResolvedOutputs(query, engineOutputs)` or equivalent extracted post-fetch path.
- [ ] Initialize the standalone server with the shared knowledge path and a singleton pipeline instance.
  - Files: `src/serve.ts`, `src/standalone/standalone-api.ts`
  - Requirement: pass a concrete `knowledge_path` into pipeline config once at startup, not per request.
- [ ] Replace the current question-only `buildWitnessLayer()` enrichment path with proxy-first dyad enrichment.
  - Files: `src/standalone/standalone-api.ts`
  - Output target: preserve decoder metadata and add `aletheios`, `pichet`, `synthesis`, `routing_mode`, and `response_cadence`.
  - Input target: derive minimal `PipelineQuery` and `UserState` from request birth data, tier, and decoder state.
- [ ] Reuse upstream Selemene results instead of re-fetching inside the pipeline.
  - Reason: avoids extra latency and avoids time drift on engines like `vedic-clock`.
- [ ] Delay optional LLM voice passes until after deterministic dyad extraction is present and verified.
  - Files: `src/inference/dyad-engine.ts`, `src/standalone/standalone-api.ts`
  - Guardrail: do not call `DyadInferenceEngine` directly on raw Selemene output; it expects populated `interpretation.aletheios` and `interpretation.pichet` fields.
- [ ] Expand standalone proxy tests around both engine and workflow endpoints.
  - Files: `tests/standalone.test.ts`
  - Required assertions: single-engine proxy response contains rich dyad fields; workflow response contains per-engine dyad enrichment plus workflow-level synthesis metadata; compatibility field remains present during transition.
- [ ] Verify live against `48.tryambakam.space` after Step 3 deploy.
  - Probe 1: `POST /api/v1/engines/biorhythm/calculate` returns full dyad fields instead of only a short witness question.
  - Probe 2: `POST /api/v1/workflows/:id/execute` returns enriched per-engine dyad output plus workflow-level synthesis.
  - Probe 3: `/metrics` and logs still show healthy LLM and engine behavior with no regression to fallback-only output.

## Step 3 Risks
- `DyadInferenceEngine` is not the first integration seam; using it before deterministic agent extraction will no-op or flatten output.
- Proxy request bodies do not contain a natural-language query, so Step 3 needs a stable default query/user-state mapping or the dyad output will be shallow.
- Response shape churn can break clients if legacy `witness_question` disappears too early.
- Knowledge loading must stay singleton-scoped; per-request initialization will hurt latency and cold starts.
