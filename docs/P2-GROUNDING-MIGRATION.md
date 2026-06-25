# P2 Grounding Migration Notes (NVIDIA NeMo Retriever)

**For consumers of the atomic wiring (witness-agents, custom graphs, or direct users of @witness/orchestration).**

## What Changed in P2
- The recommended entry point is now `InProcessWitnessOrchestrationService` (it unifies orchestrator + assemble + options + grounding + budgets).
- `AtomicTask.buildPrompts` signature is `(lock, priorOutputs, grounding?: GroundedPassage[])` — grounding is the 3rd optional parameter.
- Tasks opt-in to retrieval with `requiresGrounding: true`.
- A `GroundingProvider` (port) + `minRelevance` + optional `retrievalBudgetTokens` / `maxRetrievalLatencyMs` are passed at service (or orchestrator) construction / orchestrate options.
- Retrieved passages (if any) are injected **after** the frozen FactLock using the standardized helper `injectGroundedContext` (or your own renderer). The helper labels them clearly as "sourced-fact" resonance mirrors only.
- New observer hooks: `onRetrievalStart` / `onRetrievalComplete` (with passageCount, avgRelevance, latency, cost).
- `AtomicRunMetrics` (from `createMetricsCollector`) now includes an optional `retrieval` section.
- Cost estimator hook: providers can implement `estimateCost(query)`; the orchestrator reserves aggregate token budget before retrieval and skips calls that would exceed it.
- Latency cap: `maxRetrievalLatencyMs` is default-deny; slow retrieval returns no passages rather than blocking the witness flow.
- `NoopGroundingProvider` is the safe default (zero behavior change).

## Zero-Retrieval Path (Backward Compat)
- If you pass no `groundingProvider` (or `NoopGroundingProvider`), or if no tasks have `requiresGrounding`, behavior is identical to Phase 1.
- All prior tests, daily flows, dyad, research, etc. continue to work unchanged when grounding is not enabled.

## How to Adopt (Minimal)
1. Switch direct `WitnessOrchestrator` + `assemble` usage to `InProcessWitnessOrchestrationService` where possible.
2. For tasks that should benefit from grounding (synthesis, research, structural layers, etc.), add `requiresGrounding: true` and update the `buildPrompts` to accept the third parameter and call `injectGroundedContext(lock, grounding)` in the system prompt after the FactLock block.
3. When creating the service, pass your provider:
   ```ts
   const service = new InProcessWitnessOrchestrationService(executor, {
     groundingProvider: myNeMoProvider, // or NoopGroundingProvider
     defaultMinRelevance: 0.65,
     observer: myObserver,
     defaultRetrievalBudgetTokens: 8000,
     defaultMaxRetrievalLatencyMs: 800,
   });
   ```
4. (Optional) Pass per-call overrides: `options: { retrievalBudgetTokens: 8000, maxRetrievalLatencyMs: 800 }` in `orchestrate()`.

## Graphs That Already Support It
- `createDailyWitnessGraph`
- `createDyadWitnessGraph`
- `createResearchSynthesisGraph`
- `createMultiEngineWitnessGraph`
- `createSectionWitnessGraph`

They mark synthesis + structural perspectives with `requiresGrounding: true` and use the helper. The Selemene precision/anchor tasks intentionally do **not** request grounding to protect the "exact facts only" contract.

## Observability
Wire the new retrieval events in your observer/bridge (daily-mirror does this). Look for `atomic.retrieval.*` or use `createMetricsCollector()` and inspect `metrics.retrieval`.

## Cost & Budget
NVIDIA hosted retrieval is currently credit-quota / free for individuals. When paid tiers appear, populate rates in `estimateRetrievalCost` (or your provider's `estimateCost`) and use the budget cap to protect latency/cost.

## Rollback / Disable
- Pass `NoopGroundingProvider` explicitly, or omit the provider.
- Remove `requiresGrounding` from any tasks.
- The code paths are fully guarded; no retrieval calls will be made.

## See Also
- `packages/orchestration/README.md` (Grounding section)
- `src/wiring/README.md` (status)
- `docs/p2-grounding-validation-evidence.md` (validation gate evidence)
- The main plan: `docs/plans/nvidia-nemo-retriever-grounding-swarm-plan.md`

## P3 Additions
- `createNemoExtractionProvider({ endpoint, apiKey, timeoutMs })` posts to a NeMo-compatible extraction endpoint and normalizes `{ passages }`, `{ results }`, `{ text }`, or array payloads into `GroundedPassage[]`.
- `createInMemoryPrivateIndexManager()` provides a privacy-scoped adapter for tests, demos, and self-hosted prototypes. It prevents cross-subject leakage unless `includeGlobalCorpus` is explicitly requested.
- `ingestWitnessCorpus(sources, subjectId, extractionProvider, indexManager?, scope?)` can now write extracted passages directly into the private index.
- Retrieval-augmented repair filters supporting passages by relevance and honors retrieval latency caps.

## Release Notes Summary
- Safe default remains no retrieval unless a provider is passed and tasks opt in.
- P2 is graph-complete across daily, dyad, research, multi-engine, and section witness graphs.
- P3 includes functional extraction/index adapter seams, private index roundtrip tests, actor streaming skeleton, and release-ready examples.
