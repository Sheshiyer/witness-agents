# TODO

## Plan
- [x] Inspect the standalone LLM path, observability hooks, deploy workflow, and project task artifacts.
- [x] Create missing `tasks/` artifacts required by the project workflow.
- [x] Add structured LLM failure logging in the standalone Layer 2 path with safe metadata for production diagnosis.
- [x] Add targeted tests for the new logging behavior.
- [x] Run local verification, redeploy the standalone service, and validate the live endpoint/log behavior.
- [x] Add a review section with results and follow-ups.

## Review
- `railway up` was the real deploy path. GitHub `main` push alone did not roll `48.tryambakam.space` because the service is deployed from Railway CLI, not from a GitHub-connected source.
- Railway deployment `87d793a7-3a68-48f5-8d9d-34bfc8c3b8ca` completed successfully on 2026-04-28.
- Public verification after deploy:
  - `GET https://48.tryambakam.space/metrics` reset to zero immediately after deploy, proving a new process was serving traffic.
  - `POST https://48.tryambakam.space/api/v1/engines/biorhythm/calculate` returned a full 225-character witness question instead of a truncated fragment.
  - `GET https://48.tryambakam.space/metrics` then showed live LLM usage on `anthropic/claude-4.6-sonnet-20260217` under tier `witness-initiate`.
- Railway service logs showed a successful `layer2.llm` event after deploy. No `layer2.llm.error` event was emitted during the verification request because the LLM call succeeded.
- Conclusion: the primary blocker was a stale 4-day-old Railway CLI deployment. Production is now serving the current standalone LLM path cleanly, so Step 3 can be planned against the live service.
