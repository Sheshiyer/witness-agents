# @witness/orchestration

Generic coordination layer for **Atomic Fact-Locked Multi-Perspective Synthesis**.

This is the Phase 2 extraction target for the wiring pattern originally prototyped inside `witness-agents`.

## Core Idea

- Freeze a `FactLock` (immutable subject facts) **before** any generation.
- Decompose work into small `AtomicTask`s with explicit dependencies and perspective ownership.
- Every task receives the locked facts as hard constraints (primacy + recency).
- Execute in dependency waves (parallel within waves).
- Assemble results, then run assembly-time contradiction detection.
- Only repair the minimal defective excerpts (sparse / differential repair).

This dramatically improves fact fidelity, reduces cost of mistakes, and makes long multi-perspective flows tractable.

## Usage (Library)

```ts
import {
  createFactLock,
  WitnessOrchestrator,
  assemble,
  createSimpleLLMFactChecker,
} from '@witness/orchestration';

const lock = createFactLock({ subject: 'Alice', facts: { ... } });

const orchestrator = new WitnessOrchestrator(yourTaskExecutor);

const results = await orchestrator.execute(tasks, lock);

const final = await assemble(results, lock, {
  repairExecutor: yourCheapRepairFn,
  factChecker: createSimpleLLMFactChecker(yourCheapModel),
});
```

## Service Interface (Phase 2 direction)

See `src/service.ts` for the `WitnessOrchestrationService` interface.

This is the shape we are moving toward for extraction into a standalone service (or retained as a library with clear boundaries).

## Optional Grounding / Retrieval Augmentation (P2)

You can supply a `GroundingProvider` (port) to the `InProcessWitnessOrchestrationService` (or directly to `WitnessOrchestrator`).

- Retrieval is **default-deny** and **optional** per task (`requiresGrounding?: boolean` on `AtomicTask`).
- Only passages meeting `minRelevance` (default 0.65) are injected.
- A budget (`retrievalBudgetTokens`) can be enforced via the provider's `estimateCost`.
- Retrieved passages are injected **after** the frozen `FactLock` using the standardized `injectGroundedContext` helper (or your own).
- Full signals appear in the observer (`onRetrievalStart` / `onRetrievalComplete`) and in `createMetricsCollector()` under the `retrieval` key.

Example:

```ts
import { InProcessWitnessOrchestrationService, NoopGroundingProvider } from '@witness/orchestration';

const service = new InProcessWitnessOrchestrationService(yourExecutor, {
  groundingProvider: myNvidiaNeMoProvider, // or NoopGroundingProvider
  defaultMinRelevance: 0.7,
  // retrievalBudgetTokens: 8000,
  observer: myObserver,
});

const res = await service.orchestrate({
  factLock,
  tasks: tasksWithRequiresGrounding,
  options: { retrievalBudgetTokens: 4000 },
});
```

See `src/grounding.ts` (port + `GroundedPassage` + helper) and the NVIDIA adapter work in later phases for a real embedding+rerank implementation. Zero-retrieval path is unchanged and fully tested.

**P2 migration note (from Phase 1 wiring):**
- If you were constructing `WitnessOrchestrator` + `assemble` directly, prefer `InProcessWitnessOrchestrationService` going forward (it is the supported facade and now carries grounding, budgets, and unified options).
- `AtomicTask.buildPrompts` signature is now `(lock, priorOutputs, grounding?)`. Update any custom tasks (or use the graphs in `witness-agents/src/wiring/graphs` which have been updated).
- Retrieval is opt-in per task via `requiresGrounding: true` + a provider at service/orchestrator level. No behavior change when omitted.

## Current Status

- Core coordination (orchestrator, graph execution, assembly, repair) lives here.
- Domain-specific graphs, inference adapters, and perspective prompts remain in consuming packages (e.g. `witness-agents`).

## Long-term

This layer is the natural home for:
- Different execution backends (current TS, future actor-model / Elixir, etc.)
- Observability, cost tracking, and quality metrics around contradiction rate / repair cost.
- Reusable multi-perspective synthesis across many domains (astrology, research, daily practice, etc.).
