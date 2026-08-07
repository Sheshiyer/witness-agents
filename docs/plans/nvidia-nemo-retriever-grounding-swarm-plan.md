# Swarm Architect Plan: NVIDIA NeMo Retriever Grounding for Atomic Witness Orchestration

**Generated with:** swarm-architect skill (plan-to-github + spec-to-plan runbooks)
**Repo:** Sheshiyer/witness-agents
**Date:** 2026-06-08
**Goal:** Add first-class, optional, evidence-gated NVIDIA NeMo Retriever (embedding + reranker + extraction) as a GroundingProvider to make the atomic fact-locked witness agents (Aletheios + Pichet + Selemene) dramatically more reliable while preserving the existing decomposition + repair contract.

## 1. Discovery Summary
- Planning depth: deeply detailed (full 3-phase, wave/swarm, ~80+ tasks mapped)
- Delivery mode: production + hardening (real daily-mirror integration first, then generalization)
- Release model: phased rollout (P1 = daily-mirror MVP with gates; P2 = parallel generalization; P3 = full NEM ecosystem + future-proofing)
- Quality bar: eval-first gates on every wave (relevance thresholds, provenance labeling, no regression on existing contradiction rate/latency, tests + manual witness review), retrieval metrics in observability, contract preservation
- Team/agent topology: Planner/orchestrator (human + this session) → Backend/orchestration implementation agents (Codex/Claude) → Validation agent (Gemini or manual + tests)
- Constraints: 
  - Atomic FactLock + single-perspective tasks + wave execution + sparse repair contract must remain sacred (no breaking changes).
  - Retrieval is **default-deny / optional** (per ai-agents-meta-core).
  - Privacy-first (NEM self-hosted NIM friendly).
  - Evidence ladder + provenance (per research-knowledge-core).
  - Ports-and-adapters (GroundingProvider port in orchestration core; NVIDIA adapter at edge).
  - Existing daily-mirror + wiring must continue to work with zero retrieval.
- Current state: Atomic orchestration extracted to `packages/orchestration/`, real integration in `standalone/daily-mirror.ts` (Layer 2 atomic + Layer 3 enrichment), observer/metrics hooks exist, no retrieval yet.

## 2. Assumptions and Constraints
- Assumption A: NVIDIA NIM endpoints for embedding + reranking will be available (hosted or self-hosted) with OpenAI-compatible APIs.
- Assumption B: Selemene + decoder outputs + prior daily mirrors + user notes form a high-value private corpus for grounding.
- Assumption C: Relevance threshold (e.g. 0.65) + provenance labeling will be sufficient initial gate (we can tighten later).
- Constraint A: No changes to `FactLock` frozen facts primacy; retrieved context is always "additional mirrors" injected after the lock.
- Constraint B: All new retrieval calls must be observable and budgeted (add to existing metrics/observer).
- Constraint C: Work must be parallelizable across swarms but serialized on shared orchestration core files (use worktrees + lock zones).
- Constraint D: Must create GitHub issues for full orchestration tracking (phase/wave/swarm labels, dependencies encoded).

## 3. Agent Ownership Model
| Concern | Primary owner | Secondary reviewer | Notes |
|---------|---------------|--------------------|-------|
| Planning / orchestration / GitHub sync | Planner / orchestrator agent (human + swarm-architect) | — | This plan + issue creation |
| Orchestration core (GroundingProvider port, FactLock extension, orchestrator changes, metrics) | Backend / orchestration implementation agent (Codex/Claude) | Planner + Validation | Ports-and-adapters discipline |
| Domain graphs + daily-mirror integration | Backend / orchestration + witness domain agent | Planner | Keep src/wiring thin |
| NVIDIA NeMo Retriever adapter + extraction | Backend / infra agent (NVIDIA NIM focus) | Planner | Edge adapter only |
| Observability, metrics, retrieval signals | Backend + Validation | — | Extend existing hooks |
| Tests, verification gates, adversarial review | Validation agent (Gemini + manual witness review) | Planner | Per-wave evidence required |
| Documentation + migration guide | Planner / docs | Backend | Update READMEs, PHASE2-SCOPING, add migration |

## 4. Phase Map

### Phase 1 — Foundations + daily-mirror MVP (Contract freeze + first real grounding)
- Goal: Deliver a minimal, gated, optional GroundingProvider + retrieval in the daily atomic path only. Prove the architecture works without touching other graphs.
- Exit criteria: 
  - Port + interface + noop + basic NVIDIA adapter in place.
  - FactLock + daily graph extended (retrievedContext optional).
  - Integrated and observable in `daily-mirror.ts` (behind config flag).
  - Relevance gate + provenance enforced.
  - Metrics/observer updated.
  - All waves have validation evidence (tests + 3–5 real daily runs reviewed).
  - GitHub issues created for the whole plan.
- Waves: 3 (detailed below)

### Phase 2 — Parallel generalization + service hardening
- Goal: Make retrieval available to all graphs and the service layer. Parallel swarms for graphs, service, docs.
- Exit criteria:
  - `InProcessWitnessOrchestrationService` accepts grounding.
  - All existing graphs (dyad, research, multi-engine, etc.) have optional grounding variants.
  - Retrieval cost/latency in cost-routing and budgets.
  - Full test coverage + metrics dashboards.
- Waves: 3+
- **Status (2026-06-09):** P2-W1 closed with full evidence on #99. Graphs (W2) front-loaded and completed. Living validation evidence package + review harness created (`docs/p2-grounding-validation-evidence.md`, `docs/P2-GROUNDING-REVIEW-HARNESS.md`). P3 skeleton work (extraction provider, index scope, streaming/actor grounding, ADR-003) started in parallel (see evidence file "P3 Skeleton Work Started in Parallel" section and new ADR). Awaiting human fidelity review notes to formally close P2 gate, then immediate continuation into full P3 waves.

### Phase 3 — Full NEM ecosystem leverage + future-proofing
- Goal: Add extraction pipeline, private per-subject indexes, advanced observability, prepare for actor-model.
- Exit criteria:
  - NeMo extraction + ingestion for user notes / prior outputs.
  - Private vector indexes (self-hosted NIM path documented).
  - Retrieval-augmented fact-checker + repair.
  - Strong signals on "retrieval hit rate vs contradiction rate".
  - ADR + migration guide complete.
  - Skeleton for actor-model grounding provider.
- Waves: 3+

## 5. Detailed Phase 1 Wave Layout

### Wave 1 — Contract freeze + discovery (serial, planner-led)
#### Swarm A — Architecture contracts (GroundingProvider port)
- Goal: Freeze the minimal port, types, and integration points in orchestration core.
- Owner: Planner + Backend agent
- Inputs: Prior gap analysis + this plan + existing `orchestrator.ts`, `types.ts`, `observability.ts`
- Outputs: `grounding.ts` (port + GroundedPassage + Noop), updated `AtomicTask` interface, updated FactLock type.
- Validation: Typecheck + unit test for noop path + contract review comment on PR.

#### Swarm B — GitHub orchestration setup (this task)
- Goal: Create the full issue hierarchy for all 3 phases so execution can be tracked.
- Owner: Planner (this session)
- Inputs: This plan + swarm-architect templates + existing P2/P3 issues.
- Outputs: Master epic + phase epics + wave issues + task issues with proper labels/dependencies.
- Validation: All issues created, dependencies visible in bodies, wave summary comments posted.

### Wave 2 — Core implementation (parallel after contracts)
#### Swarm A — Orchestration core + metrics/observer
- Goal: Implement the port wiring in `WitnessOrchestrator` and `assemble`, extend metrics + observer.
- Owner: Backend/orchestration agent
- Inputs: Frozen contracts from Wave 1A
- Outputs: Updated `orchestrator.ts`, `assembler.ts`, `metrics.ts`, `observability.ts`, `InProcess...Service`
- Lock zones: orchestration core files
- Validation: Existing 9 tests still pass + new retrieval metric tests + relevance gate unit test.

#### Swarm B — NVIDIA NeMo Retriever adapter (edge only)
- Goal: Build the concrete adapter using embedding + reranker NIM (OpenAI-compatible).
- Owner: Backend/infra agent
- Inputs: GroundingProvider port definition
- Outputs: `adapters/nvidia-retriever.ts` (or external package later), config for endpoints, basic cost estimator.
- Validation: Fake + real (if key available) retrieval test, relevance scoring verified.

### Wave 3 — daily-mirror integration + gates (serial on top of Wave 2)
#### Swarm A — daily-mirror + graph extension
- Goal: Wire optional grounding into `createDailyWitnessGraph` and `buildDailyWitnessWithAtomicWiring`.
- Owner: Backend + witness domain agent
- Inputs: Core from Wave 2 + contracts
- Outputs: Updated `src/wiring/graphs/daily-witness.ts`, changes in `src/standalone/daily-mirror.ts` (config flag, observer bridge for retrieval signals), FactLock enrichment.
- Validation: 
  - Zero-retrieval path unchanged (existing daily flows still work).
  - With retrieval: 3–5 real daily runs reviewed for quality + provenance in output.
  - New retrieval metrics appear in logs/observer.

#### Swarm B — Validation + evidence collection
- Goal: Run the gates and produce proof.
- Owner: Validation agent
- Inputs: Integrated code + test keys or mocks
- Outputs: Test results, manual review notes, updated metrics examples, "before/after" witness quality diff.
- Validation: All gates passed (relevance threshold, no regression on contradiction rate, latency budget respected).

## 6. Full Task List (Schema-compliant)

(Using the task schema from the skill. IDs are P1-Wx-Sy-Tzz format for traceability.)

**Phase 1 Tasks (core for this response):**

- **P1-W1-SA-T01**: Define GroundingProvider port + GroundedPassage + Noop impl (packages/orchestration/src/grounding.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 2
  - dependencies: []
  - deliverable: New file with interface, types, noop, JSDoc.
  - acceptance: Compiles, has retrieve(query) returning GroundedPassage[] with provenance.
  - validation: Typecheck passes; unit test for noop returns [].
  - phase: p1, wave: w1, swarm: sa
  - branch: feat/p1-grounding-port
  - lock_zone: true

- **P1-W1-SA-T02**: Extend AtomicTask and FactLock with optional grounding (packages/orchestration/src/types.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 1
  - dependencies: ["P1-W1-SA-T01"]
  - deliverable: Updated types with buildPrompts signature change + retrievedContext on FactLock.
  - acceptance: Optional fields only; existing code still type-checks when undefined.
  - validation: Contract review in PR description.

- **P1-W1-SB-T03**: Create full GitHub issue hierarchy for 3-phase plan (this plan)
  - area: product
  - owner_role: planner-orchestrator
  - est_hours: 3
  - dependencies: []
  - deliverable: Master epic + P1/P2/P3 epics + wave issues + task issues with labels, dependencies, bodies per github-issue-template.
  - acceptance: All issues created in Sheshiyer/witness-agents; wave summary comments posted.
  - validation: gh issue list shows correct structure; dependencies visible.

- **P1-W2-SA-T04**: Wire GroundingProvider into WitnessOrchestrator (packages/orchestration/src/orchestrator.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 3
  - dependencies: ["P1-W1-SA-T01", "P1-W1-SA-T02"]
  - deliverable: Optional groundingProvider in constructor/options; call before buildPrompts when required; pass passages.
  - acceptance: Retrieval happens only for tasks with requiresGrounding or service flag.
  - validation: New tests for injection path; existing wave execution tests unchanged.

- **P1-W2-SA-T05**: Extend metrics collector and observer for retrieval signals (packages/orchestration/src/metrics.ts + observability.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 2
  - dependencies: ["P1-W2-SA-T04"]
  - deliverable: retrieval section in AtomicRunMetrics; onRetrieval* hooks.
  - acceptance: Metrics include calls, latency, avgRelevance, passagesUsed.
  - validation: Collector test passes; observer events emitted in integration test.

- **P1-W2-SB-T06**: Implement NVIDIA NeMo Retriever adapter (adapters/nvidia-retriever.ts)
  - area: backend
  - owner_role: backend-infra
  - est_hours: 4
  - dependencies: ["P1-W1-SA-T01"]
  - deliverable: Class implementing GroundingProvider using embedding + rerank NIM endpoints.
  - acceptance: retrieve() returns scored passages; supports basic query from FactLock facts.
  - validation: Unit test with mock responses; optional live test if NIM key present.

- **P1-W3-SA-T07**: Extend createDailyWitnessGraph with optional grounding (src/wiring/graphs/daily-witness.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 2
  - dependencies: ["P1-W2-SA-T04", "P1-W2-SB-T06"]
  - deliverable: Function signature accepts GroundingProvider; retrieves and attaches to lock if useful.
  - acceptance: retrievedContext only added when passages meet threshold; zero-retrieval path identical.
  - validation: Graph unit test + manual inspection of generated tasks.

- **P1-W3-SA-T08**: Integrate into daily-mirror atomic path (src/standalone/daily-mirror.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 3
  - dependencies: ["P1-W3-SA-T07"]
  - deliverable: Config flag (e.g. retrieval: { enabled, minRelevance }), observer bridge for new signals, lock creation + graph call updated.
  - acceptance: Behind flag; existing flows untouched; new retrieval metrics flow through existing WitnessObserver.
  - validation: 3–5 real daily runs with/without retrieval; quality review notes + no regression on Layer 2/3 output.

- **P1-W3-SB-T09**: Validation gate + evidence for Phase 1 (tests + manual review)
  - area: qa
  - owner_role: validation
  - est_hours: 4
  - dependencies: ["P1-W3-SA-T08"]
  - deliverable: Updated test suite, manual witness review doc, before/after examples, confirmation all gates passed.
  - acceptance: Relevance gate works, provenance in output, metrics visible, zero breaking changes.
  - validation: Evidence attached to wave-close issue.

(Additional tasks for P1 close, P2, P3 will be created as issues. Full ~70-80 tasks follow the same schema in the GitHub sync.)

## 7. Dependency Rationale
- Contracts (Wave 1) before any parallel implementation (multi-agent-boundaries playbook).
- Core orchestration changes before daily-mirror (lock zones in packages/orchestration).
- Adapter can be developed in parallel to core wiring once port is frozen.
- Validation wave is always last in a phase (verification-gates playbook).
- Phase 2 only starts after Phase 1 wave-close evidence.

## 8. Verification Strategy
- Per-wave: dedicated validation task + evidence (tests, logs, manual review, metrics).
- Contract validation before every parallel swarm.
- CI gates: typecheck, existing test suite, new retrieval tests.
- Reality gate (ai-agents-meta + noesis): 3–5 real daily witness runs reviewed by human for quality, provenance, and "does it still feel like a witness not a search result".
- Regression: contradiction rate, latency, and output fidelity must not degrade when retrieval is disabled.
- Wave close runbook: summary comment + evidence before next wave unlocked.

## 9. GitHub Sync Strategy
- Master epic: "NVIDIA NeMo Retriever Grounding for Atomic Witness Agents (P1–P3)"
- Phase epics with labels `phase:p1-retrieval-grounding`, `phase:p2-generalize`, `phase:p3-hardening`
- Waves as milestone sections or labeled batches.
- Every task → individual issue using `templates/github-issue-template.md` (with phase/wave/swarm labels, dependencies in body, owner, branch suggestion, validation expectations).
- Wave summary comments posted at start and close of each wave (via gh or manual).
- PRs must reference the owning task issue + wave.
- Existing P2/P3 issues will be linked/updated as children or related.

## 10. Risks and Fallback Plan
- Risk: Latency from retrieval hurts daily UX.
  - Trigger: p95 > 800ms added.
  - Fallback: Make retrieval fully async/pre-fetch for daily; cache aggressively; lower maxPassages; gate by tier.
- Risk: Over-grounding dilutes the "witness" non-prescriptive stance.
  - Trigger: Human review finds outputs feel citation-heavy or less alive.
  - Fallback: Stronger prompt language ("use only as resonance"), lower injection rate, make retrievedContext visible in debug mode only.
- Risk: Contract drift in shared orchestration files.
  - Trigger: Two swarms touch the same file.
  - Fallback: Serialize on lock-zone files; use worktrees + explicit handoff PRs at wave boundaries.
- Risk: NVIDIA NIM availability / quotas.
  - Fallback: Strong noop + local embedding fallback (e.g. transformers.js or sentence-transformers) documented for self-hosted.

**Next immediate action (this session):** Create the GitHub issues from this plan using the swarm-architect github-sync playbook.


## 5b. Detailed Phase 2 Wave Layout (Expanded)

### Wave 1 — Service layer generalization (serial after P1 close)
#### Swarm A — InProcessWitnessOrchestrationService updates
- Goal: Make the service the primary entry point for grounded orchestration.
- Owner: Backend/orchestration agent
- Inputs: P1 service + GroundingProvider port
- Outputs: Service constructor accepts optional groundingProvider; orchestrate/execute/assembleOnly forward it; options for minRelevance, retrievalBudget.
- Validation: Service tests cover grounded vs non-grounded paths; contract review.

#### Swarm B — Observability and cost integration
- Goal: Retrieval becomes first-class in metrics and routing.
- Owner: Backend + Validation
- Inputs: P1 metrics extensions
- Outputs: Retrieval cost/latency in AtomicRunMetrics; integration into cost-aware routing (per ai-agents-meta-core); budget caps in service options.
- Validation: Metrics collector tests + example of cost reporting.

### Wave 2 — Graph expansions (parallel swarms)
#### Swarm A — Dyad and research graphs
- Goal: Add optional grounding to createDyadWitnessGraph and createResearchSynthesisGraph.
- Owner: Backend/orchestration + domain agent
- Inputs: P1 daily pattern + contracts
- Outputs: Updated graph builders that accept GroundingProvider and attach context where requiresGrounding or perspective needs depth.
- Validation: Graph unit tests + prompt inspection showing injected context after FactLock.

#### Swarm B — Multi-engine and new graphs
- Goal: Generalize to createMultiEngineWitnessGraph and any new graphs.
- Owner: Backend/orchestration
- Inputs: Same as above
- Outputs: Grounding support in multi-perspective graphs.
- Validation: Tests + evidence that grounding is perspective-aware.

#### Swarm C — Prompt builders and task augmentation
- Goal: Standardize how retrieved passages are injected in buildPrompts.
- Owner: Backend + planner
- Inputs: All graph updates
- Outputs: Helper in grounding.ts (e.g. injectGroundedContext) used by all tasks; citation format standardized.
- Validation: Consistency across graphs; noesis guardrail (runtime context only, not authority).

### Wave 3 — Hardening, docs, and P2 close
#### Swarm A — Full test suite and examples
- Goal: Comprehensive coverage and usage examples.
- Owner: Validation + Backend
- Inputs: All graphs + service
- Outputs: Expanded tests in packages/orchestration (including retrieval paths); updated examples/ in src/wiring; end-to-end test using daily + dyad.
- Validation: 100% relevant coverage; example runs cleanly with/without grounding.

#### Swarm B — Documentation and migration
- Goal: Make the feature usable by others.
- Owner: Planner / docs
- Inputs: All changes
- Outputs: Updated packages/orchestration/README.md and src/wiring/README.md; new MIGRATION.md section; example in daily-atomic-layer3.ts using grounding; PHASE2-SCOPING.md update.
- Validation: Docs reviewed; no breaking changes documented.

#### Swarm C — P2 validation gate + wave close
- Goal: Prove generalization works and is safe.
- Owner: Validation agent
- Inputs: Tests + docs + real runs
- Outputs: Evidence package (test results, example outputs, metrics before/after, human review for 2+ graph types); Phase 2 close comment on epic.
- Validation: All P2 exit criteria met; no regression on atomic contract; retrieval improves fidelity in deep/synthesis tasks.

## 5c. Detailed Phase 3 Wave Layout (Expanded)

### Wave 1 — Extraction and ingestion pipeline
#### Swarm A — NeMo Retriever extraction integration
- Goal: Add support for ingesting structured data (tables, charts, images) using NeMo extraction NIMs (object detection + OCR + table extraction).
- Owner: Backend/infra + NVIDIA agent
- Inputs: P2 grounding provider
- Outputs: New ExtractionProvider or extension to GroundingProvider; ingestion scripts or service for user notes, prior daily mirrors, Selemene outputs.
- Validation: Extraction test with sample documents; passages include metadata (table vs text).

#### Swarm B — Ingestion for witness corpus
- Goal: Build corpus builder for the witness domain.
- Owner: Backend + domain
- Inputs: Extraction
- Outputs: Tools to ingest user history, canonical references (gene-keys, etc.), previous atomic outputs into vector store.
- Validation: End-to-end ingestion + retrieve test.

### Wave 2 — Private indexes and advanced grounding
#### Swarm A — Per-subject private vector indexes
- Goal: Support subject-specific or user-specific indexes (privacy-first, self-hosted NIM path).
- Owner: Backend/infra
- Inputs: Ingestion + P2 provider
- Outputs: Config for index per subjectId; adapter support for local vector DB or NeMo index; retrieval scoped to subject + global domain corpus.
- Validation: Privacy test (no cross-subject leakage); retrieval quality on personal vs general context.

#### Swarm B — Retrieval-augmented fact-checker and repair
- Goal: Use retrieval during contradiction detection and sparse repair for evidence-backed fixes.
- Owner: Backend/orchestration + Validation
- Inputs: P1 assembler + new indexes
- Outputs: Optional factChecker that retrieves supporting passages for disputed keys; repair prompts include retrieved evidence.
- Validation: Contradiction tests with retrieval; before/after repair quality; metrics show higher repair success with evidence.

### Wave 3 — Observability, actor prep, and release
#### Swarm A — Advanced retrieval observability and quality signals
- Goal: Make retrieval a measurable part of witness quality.
- Owner: Backend + Validation
- Inputs: All previous
- Outputs: Expanded metrics (retrieval hit rate, relevance vs contradiction correlation, passagesUsed per perspective); alerts or logs for low-relevance cases; integration with existing WitnessObserver and daily-mirror.
- Validation: Dashboards or example queries; correlation analysis in review.

#### Swarm B — Actor-model skeleton and future-proofing
- Goal: Prepare the grounding layer for Elixir/OTP style actors (concurrent perspectives with supervision).
- Owner: Backend + planner (long-term)
- Inputs: Current TS implementation
- Outputs: Interface extensions or separate module for async/streaming grounding; ADR documenting the path from current InProcess to actor backend; example stub for actor GroundingProvider.
- Validation: ADR reviewed; skeleton compiles and has basic tests.

#### Swarm C — Phase 3 validation, migration, and release
- Goal: Complete the initiative with full documentation and release readiness.
- Owner: Planner + Validation
- Inputs: All P3 work
- Outputs: Complete MIGRATION.md; updated all READMEs and PHASE2-SCOPING.md; final evidence (quality improvements, cost/latency numbers, privacy notes); release notes for the orchestration package; close all waves on GitHub.
- Validation: Full human review of 3-phase impact on daily witness quality; all exit criteria for P3 met; plan marked complete.

## 6b. Expanded Task List for Phase 2 (Schema-compliant)

- **P2-W1-SA-T10**: Update InProcessWitnessOrchestrationService to accept and forward GroundingProvider (packages/orchestration/src/in-process-service.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 3
  - dependencies: ["P1-W3-SA-T08", "P1-W2-SA-T04"]
  - deliverable: Service constructor takes optional groundingProvider + options (minRelevance, maxRetrievalLatencyMs, retrievalBudgetTokens).
  - acceptance: orchestrate/execute/assembleOnly pass grounding through; options respected.
  - validation: Service unit tests for grounded path; backward compat when undefined.
  - phase: p2, wave: w1, swarm: sa

- **P2-W1-SB-T11**: Integrate retrieval into cost routing and budgets (packages/orchestration/src/metrics.ts + src/inference/nvidia-routing.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 2
  - dependencies: ["P2-W1-SA-T10"]
  - deliverable: Retrieval cost/latency added to AtomicRunMetrics; estimateNvidiaCost extended or new estimateRetrievalCost; budget enforcement in service.
  - acceptance: Cost appears in reports; budget cap can abort retrieval.
  - validation: Metrics test + cost example in docs.

- **P2-W2-SA-T12**: Add grounding support to createDyadWitnessGraph (src/wiring/graphs/dyad-witness.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 2
  - dependencies: ["P1-W3-SA-T07"]
  - deliverable: Function accepts optional GroundingProvider; tasks for aletheios/pichet/synthesis get context injected.
  - acceptance: Retrieved context after FactLock in prompts; requiresGrounding respected.
  - validation: Graph test + prompt diff review.

- **P2-W2-SA-T13**: Add grounding support to createResearchSynthesisGraph (src/wiring/graphs/research-synthesis.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 2
  - dependencies: ["P2-W2-SA-T12"]
  - deliverable: Same pattern as dyad.
  - acceptance: Perspective-aware retrieval (deeper for synthesis).
  - validation: Test + example output with citations.

- **P2-W2-SB-T14**: Add grounding to createMultiEngineWitnessGraph (src/wiring/graphs/multi-engine.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 2
  - dependencies: ["P2-W2-SA-T13"]
  - deliverable: Grounding for multi-engine flows.
  - acceptance: Works with existing engine rotation.
  - validation: Test coverage.

- **P2-W2-SC-T15**: Standardize grounding injection helper (packages/orchestration/src/grounding.ts)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 1
  - dependencies: ["P2-W2-SA-T12", "P2-W2-SA-T13"]
  - deliverable: export function injectGroundedContext(lock: FactLock, passages?: GroundedPassage[]): string
  - acceptance: Used by all graphs; consistent citation format; respects noesis (runtime only).
  - validation: Unit test for helper; consistency check across graphs.

- **P2-W3-SA-T16**: Expand orchestration package tests for retrieval paths
  - area: qa
  - owner_role: validation
  - est_hours: 4
  - dependencies: ["P2-W2-SC-T15"]
  - deliverable: New test files or additions covering service with grounding, multiple graphs, budget enforcement, relevance gate.
  - acceptance: All new paths tested; coverage report.
  - validation: CI passes with new tests.

- **P2-W3-SA-T17**: Update end-to-end example with grounding (examples/daily-atomic-layer3.ts and new dyad example)
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 2
  - dependencies: ["P2-W3-SA-T16"]
  - deliverable: Examples show optional groundingProvider passed to service/graph.
  - acceptance: Examples run with noop and with mock provider.
  - validation: Example output in PR shows retrieved context.

- **P2-W3-SB-T18**: Write migration guide and update READMEs
  - area: product
  - owner_role: planner-orchestrator
  - est_hours: 3
  - dependencies: ["P2-W3-SA-T17"]
  - deliverable: MIGRATION.md section for P1->P2; updates to packages/orchestration/README.md, src/wiring/README.md, and daily-mirror docs.
  - acceptance: Clear instructions for adding grounding to new graphs; notes on provenance and gates.
  - validation: Docs review by planner + one implementer.

- **P2-W3-SC-T19**: Phase 2 validation gate and evidence package
  - area: qa
  - owner_role: validation
  - est_hours: 3
  - dependencies: ["P2-W3-SB-T18"]
  - deliverable: Test results, example runs for dyad + research, metrics showing retrieval usage, human review notes for fidelity improvement, Phase 2 close comment.
  - acceptance: All P2 exit criteria met per plan.
  - validation: Evidence attached to GitHub; no regression on atomic contract or daily flows.

## 6c. Expanded Task List for Phase 3 (Schema-compliant)

- **P3-W1-SA-T20**: Integrate NeMo Retriever extraction NIMs (object detection + OCR + table extraction)
  - area: backend
  - owner_role: backend-infra
  - est_hours: 5
  - dependencies: ["P2-W1-SA-T10"]
  - deliverable: Extraction module or extension; support for ingesting PDFs, images, tables into GroundedPassage format with rich metadata.
  - acceptance: Extraction produces usable passages; works with NVIDIA NIM endpoints.
  - validation: Test with sample structured documents; metadata preserved.

- **P3-W1-SB-T21**: Build corpus ingestion tool for witness domain
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 3
  - dependencies: ["P3-W1-SA-T20"]
  - deliverable: CLI or function to ingest user notes, previous atomic outputs, Selemene engine docs, canonical references (e.g. Gene Keys) into vector store.
  - acceptance: Ingestion script documented; produces searchable corpus per subject + global.
  - validation: Ingestion + retrieve roundtrip test.

- **P3-W2-SA-T22**: Implement per-subject private vector indexes (self-hosted NIM friendly)
  - area: backend
  - owner_role: backend-infra
  - est_hours: 4
  - dependencies: ["P3-W1-SB-T21"]
  - deliverable: Index manager in adapter; config for subjectId-scoped indexes; support for local vector DB fallback or NeMo index.
  - acceptance: Retrieval can be scoped to subject only or subject+global; privacy test (no leakage).
  - validation: Index creation + scoped retrieve test; docs for self-hosting.

- **P3-W2-SB-T23**: Retrieval-augmented fact-checker in assembler
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 3
  - dependencies: ["P3-W2-SA-T22"]
  - deliverable: Optional factChecker that retrieves evidence for disputed locked keys during contradiction detection.
  - acceptance: During repair, evidence passages are pulled and included in repair prompt.
  - validation: Contradiction test suite with retrieval enabled; higher repair success rate in review.

- **P3-W2-SC-T24**: Retrieval in sparse repair loop
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 2
  - dependencies: ["P3-W2-SB-T23"]
  - deliverable: Repair executor can receive additional retrieved context for the disputed excerpt.
  - acceptance: Repair prompts include "Supporting mirrors from corpus".
  - validation: Repair behavior test + quality review of repaired output.

- **P3-W3-SA-T25**: Advanced retrieval metrics and quality signals
  - area: qa
  - owner_role: validation
  - est_hours: 3
  - dependencies: ["P3-W2-SC-T24"]
  - deliverable: Metrics for retrieval hit rate, avg relevance per perspective, correlation with contradiction rate and repair iterations; logging for low-relevance cases.
  - acceptance: Signals visible in daily-mirror observer and service responses.
  - validation: Example analysis in review showing quality improvement.

- **P3-W3-SA-T26**: Actor-model GroundingProvider skeleton and ADR
  - area: backend
  - owner_role: backend-orchestration
  - est_hours: 4
  - dependencies: ["P3-W3-SA-T25"]
  - deliverable: Interface extensions for async/streaming grounding; separate doc/ADR (e.g. ADR-003-grounding-actor.md) outlining path from InProcess to Elixir/OTP actors with supervision; TS stub for actor-style provider.
  - acceptance: ADR reviewed; skeleton has basic async retrieve example.
  - validation: ADR + skeleton in repo; long-term note in PHASE2-SCOPING.md.

- **P3-W3-SB-T27**: Complete documentation, migration guide, and release notes
  - area: product
  - owner_role: planner-orchestrator
  - est_hours: 3
  - dependencies: ["P3-W3-SA-T26"]
  - deliverable: Full MIGRATION.md for P1-P3; final updates to all READMEs; release notes for @witness/orchestration v0.3+; examples for extraction and private indexes.
  - acceptance: Comprehensive; references all skills (ai-agents-meta, research-knowledge, backend-architecture, noesis).
  - validation: Docs review pass.

- **P3-W3-SC-T28**: Phase 3 final validation, evidence, and plan close
  - area: qa
  - owner_role: validation
  - est_hours: 4
  - dependencies: ["P3-W3-SB-T27"]
  - deliverable: Comprehensive evidence package (extraction tests, private index demo, augmented repair quality, advanced metrics, full human review of 3-phase impact on witness fidelity); final wave/phase close comments on all GitHub epics; mark plan complete.
  - acceptance: All P3 exit criteria met; initiative ready for broader adoption.
  - validation: Evidence in GitHub; plan document updated with "Completed" status.

