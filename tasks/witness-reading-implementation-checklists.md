# Witness Reading Implementation Checklists

Date: 2026-05-04
Source spec: `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents-intro-web/tasks/witness-reading-product-spec.md`
Status: Fallback checklist draft stored in `witness-agents` because direct sibling-repo write was blocked by the approval system in this session.

## Purpose

These checklists convert the current Witness reading product spec into concrete execution work for:
- `witness-agents`
- `witness-agents-intro-web`

The framing remains additive:
- current backend fields stay valid
- new report fields are additive
- frontend adoption should be opportunistic, not destructive

## Backend Checklist (`witness-agents`)

### Phase 1: Contract Hardening

Objective:
- make the current workflow payload consistently usable as a serious reading without removing existing fields

Checklist:
- [ ] Freeze the current live workflow contract in tests so `response`, `synthesis`, `aletheios`, `pichet`, and engine `witness_layer` remain present and stable.
- [ ] Keep current proxy-compatible fields intact while introducing any new fields additively.
- [ ] Refine workflow `response` generation so it leads with dominant tension instead of system narration.
- [ ] Ensure workflow `response` stays concise enough to function as the primary reading surface.
- [ ] Preserve stronger symbolic or somatic material when generated summaries are flatter.
- [ ] Keep engine-level `response` generation aligned with the same quality rules.
- [ ] Decide whether practical detail remains inferred from `pichet` or gains an explicit additive field later.

Verification:
- [ ] Regression tests cover no field removals and no broken placeholder interpolation.
- [ ] Live sample review confirms no count-based openers and no debug-style numerics in user-facing text.

### Phase 2: Additive Reading-Object Fields

Objective:
- introduce explicit report fields that make the payload more legible without breaking current consumers

Checklist:
- [ ] Add workflow-level `witness_layer.title`.
- [ ] Add workflow-level `witness_layer.summary`.
- [ ] Add workflow-level `witness_layer.convergences`.
- [ ] Add workflow-level `witness_layer.frictions`.
- [ ] Add workflow-level `witness_layer.practice`.
- [ ] Add workflow-level `witness_layer.question`.
- [ ] Preserve current `response` and `synthesis` as valid fields after these additions.
- [ ] Define field population rules so new fields are consistently generated or intentionally omitted.

Verification:
- [ ] Contract tests confirm older clients can ignore new fields safely.
- [ ] Sample payload snapshots show new fields alongside existing ones rather than replacing them.

### Phase 3: Explainability And Evidence

Objective:
- make the reading inspectable instead of opaque

Checklist:
- [ ] Add top-level `evidence.engines_used`.
- [ ] Add top-level `evidence.contributions`.
- [ ] Define one concise `signal` and one concise `impact` per contributing engine.
- [ ] Ensure routing metadata remains available for inspection.
- [ ] Keep evidence human-readable rather than exposing raw internal scoring mechanics.

Verification:
- [ ] Workflow payload examples clearly show what each engine contributed.
- [ ] Frontend can render an evidence block without parsing arbitrary engine internals.

### Phase 4: Reading Identity And Persistence

Objective:
- make the reading an addressable object

Checklist:
- [ ] Define `reading_id` generation rules.
- [ ] Add `created_at` to the reading payload.
- [ ] Add `reading_url` once the retrieval route is real.
- [ ] Decide where persisted reading records live and how they are retrieved.
- [ ] Keep the live request-response path working before persistence is mandatory.

Verification:
- [ ] Persistence fields remain optional until server-backed retrieval is shipped.
- [ ] Reading identity does not break stateless current consumers.

### Backend Exit Criteria

The backend side is ready when:
- [ ] the current reading page keeps working without migration breakage
- [ ] new report fields are additive and documented
- [ ] workflow outputs consistently read like readings rather than system summaries
- [ ] evidence and contribution fields are available for frontend trust surfaces
- [ ] persistence fields are introduced only when the underlying retrieval path exists

## Frontend Checklist (`witness-agents-intro-web`)

### Phase 1: Rendering Policy Lock-In

Objective:
- make the current reading page deterministic and stable before adopting new backend fields

Checklist:
- [ ] Keep `witness_layer.response` as the primary workflow reading text.
- [ ] Keep `aletheios` and `pichet` rendered as separate voices.
- [ ] Keep parity handling when `response === synthesis`.
- [ ] Keep per-engine cards driven by engine `witness_layer` instead of raw `result` payloads.
- [ ] Keep the strict fallback order from the spec reflected in rendering helpers.
- [ ] Surface one short practical-detail line only where it materially improves usability.

Verification:
- [ ] Reading page remains legible when `response` and `synthesis` are identical.
- [ ] Engine cards do not regress into raw engine-output presentation.

### Phase 2: Adopt Additive Report Fields

Objective:
- use new backend report fields when they become available without making them hard requirements too early

Checklist:
- [ ] Use `witness_layer.title` as the reading heading when present.
- [ ] Use `witness_layer.summary` for preview surfaces and metadata summaries when present.
- [ ] Render `convergences` and `frictions` as explicit report sections when present.
- [ ] Render `practice` as the practical next-step section when present.
- [ ] Render `question` as the closing reflective cue when present.
- [ ] Preserve current fallbacks when any of those fields are absent.

Verification:
- [ ] The website still renders older payloads safely.
- [ ] New fields enhance the reading without becoming required for page stability.

### Phase 3: Evidence And Trust Surface

Objective:
- expose why the reading exists

Checklist:
- [ ] Add an evidence section driven by `evidence.engines_used` and `evidence.contributions`.
- [ ] Show which engines contributed without dumping full raw payloads.
- [ ] Show routing or layer metadata only where it increases trust rather than clutter.
- [ ] Add a reading TOC or anchor navigation once the page has enough sections to justify it.

Verification:
- [ ] The evidence section is understandable to a user who never sees raw JSON.
- [ ] The page still feels like a reading page, not an internal diagnostics panel.

### Phase 4: Reading Object Features

Objective:
- use persistence fields when the backend truly supports them

Checklist:
- [ ] Support a permalink route keyed by `reading_id` or `reading_url`.
- [ ] Load saved readings from the server once retrieval exists.
- [ ] Add a share action once canonical URLs are real.
- [ ] Add compare mode only after persisted reading retrieval is stable.

Verification:
- [ ] Local latest-reading behavior still works before server persistence is fully available.
- [ ] Share and permalink UI are not exposed before the backend contract can support them.

### Frontend Exit Criteria

The frontend side is ready when:
- [ ] the reading page renders the current contract deterministically
- [ ] additive report fields are adopted opportunistically, not destructively
- [ ] evidence and practical-detail surfaces improve trust and usefulness
- [ ] permalink and share features wait for real backend support instead of mocking it prematurely
