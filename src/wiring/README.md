# Atomic Fact-Locked Wiring (Phase 1)

This module implements the core pattern for wiring the Witness Agents:

- **FactLock**: Immutable subject facts frozen before any generation.
- **AtomicTask**: Small, single-perspective units of work with explicit dependencies.
- **Dependency Graph**: Tasks run in waves; independent tasks within a wave can run in parallel.
- **Invariant Injection**: Every task receives the locked facts as hard system constraints (primacy + recency).
- **Assembly-time Repair**: After all tasks complete we stitch, then run mechanical contradiction detection. Only contradictory excerpts are sent for targeted repair.

## Goals of Phase 1
- Give most of the quality and cost benefits immediately in the existing TypeScript stack.
- Make fact fidelity the default instead of an afterthought.
- Reduce the blast radius of any single model mistake (sparse repair instead of full re-runs).
- Provide a clean foundation that can later be extracted into a dedicated orchestration service (Phase 2) or even ported to an actor model (long-term Elixir direction).

## Usage

See `src/wiring/examples/witness-dyad.ts` for a complete (commented) example of wiring Aletheios + Pichet + Selemene flows against a locked subject.

Basic skeleton:

```ts
import { createFactLock, WitnessOrchestrator, assemble } from './wiring/index.js';

const lock = createFactLock({ ... });

const tasks = [ /* AtomicTask definitions for aletheios, pichet, synthesis, etc. */ ];

const orchestrator = new WitnessOrchestrator(yourExecutorFn);
const results = await orchestrator.execute(tasks, lock);

const final = await assemble(results, lock, {
  repairExecutor: async (prompt, lock) => { /* call model with narrow repair prompt */ },
});
```

## What's Implemented (after this iteration)

- Real executor via `createWitnessInferenceExecutor` (uses existing provider factory + perspective routing from `witness-capabilities`).
- Strengthened contradiction detection in assembler + optional `factChecker` for structured LLM-based claim extraction (`createSimpleLLMFactChecker`).
- First real production graph: `createDyadWitnessGraph` in `graphs/dyad-witness.ts`.
- Phase 2 scoping document (`PHASE2-SCOPING.md`).

## Recommended Usage (Current Best Practice)

```ts
import { createFactLock, createWitnessInferenceExecutor, WitnessOrchestrator, assemble, createSimpleLLMFactChecker, createDyadWitnessGraph } from './wiring/index.js';

const lock = createFactLock({ subject: "...", facts: { ... } });

const executor = createWitnessInferenceExecutor({ tier: 'subscriber' });

const orchestrator = new WitnessOrchestrator(executor);

const tasks = createDyadWitnessGraph(lock);           // production graph

const results = await orchestrator.execute(tasks, lock);

const factChecker = createSimpleLLMFactChecker(yourCheapModelCall);

const final = await assemble(results, lock, {
  repairExecutor: yourRepairFn,
  factChecker,
});
```

## Next (Phase 2 — in progress)
See `PHASE2-SCOPING.md` for extraction strategy toward a cleaner orchestration boundary (library or service).

**P2 grounding (NVIDIA NeMo Retriever) status (as of this edit):**
- `InProcessWitnessOrchestrationService` is the primary entry point and accepts `groundingProvider`.
- All production graphs (daily, dyad, research, multi-engine) support optional `requiresGrounding` + standardized context injection via `injectGroundedContext`.
- Real daily atomic path now goes through the service.
- Metrics + observer have first-class retrieval signals.
- 12/12 orchestration tests green; end-to-end example demonstrates the feature.

The individual atomic task definitions (prompts, perspectives) stay in the main package / domain graphs. Continue to Phase 3 (extraction, private indexes, actor prep) after P2 validation gate.
