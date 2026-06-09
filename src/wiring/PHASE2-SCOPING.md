# Phase 2 Scoping — Extracting Coordination into an Orchestration Service

## Current State (Phase 1)
- `WitnessOrchestrator` + graph builder + assembler live inside `src/wiring/`
- They are used by importing from the main witness-agents package
- Inference is plugged in via adapters (`createWitnessInferenceExecutor`)
- Good for rapid experimentation inside the monolith

## Why Extract (Phase 2)

The coordination logic (task graph definition, wave execution, fact injection, assembly + sparse repair) is becoming a distinct concern:

- It is useful for many flows (dyad, standalone daily witness, multi-perspective research, long-form synthesis, etc.)
- It has different scaling, reliability, and observability needs than the individual agent voices
- We want to be able to evolve the orchestration independently (or even move it to another runtime later)

## Proposed Extraction Target

**Option A (Recommended for now):** Small internal package / module

```
packages/orchestration/
  src/
    orchestrator.ts
    task-graph.ts
    assembler.ts
    fact-lock.ts
    types.ts
    repair.ts
  package.json
```

The main `witness-agents` package depends on it.

**Option B:** Standalone micro-service (HTTP or gRPC)

- Exposes `POST /orchestrate` with a plan + fact lock
- Returns assembled result + contradiction report
- Can be written in TS, Go, or even Elixir later
- Agents call it when they need multi-perspective locked synthesis

## What Moves vs What Stays

**Moves to orchestration layer:**
- Task graph construction and validation
- Topological execution + parallel waves
- FactLock rendering and injection
- Assembly stitching logic
- Mechanical + LLM-based contradiction detection
- Sparse repair loop + targeted re-execution
- Observability hooks (spans for waves, per-task cost/latency, contradiction rate)

**Stays in witness-agents (or moves to perspective packages):**
- Concrete `AtomicTask` definitions (the actual prompts and perspectives)
- Perspective-specific model routing and voice configuration
- Domain-specific graphs (`createDyadWitnessGraph`, daily mirror graph, etc.)
- The actual LLM provider calls (via adapters)
- Higher-level business logic (when to trigger a wired flow, what to do with the result)

## Migration Path (Practical)

1. Keep `src/wiring/` as the working implementation while we prove the pattern in production flows.
2. Once 2–3 real flows are running successfully on the atomic model, extract the generic pieces into `packages/orchestration`.
3. Update `witness-agents` to depend on the package and re-export for backward compatibility.
4. Add metrics around contradiction rate, repair iterations, and per-wave cost — these become first-class signals for the orchestration service.

## Long-term (Beyond Phase 2)

This extracted orchestration layer becomes the natural place where we can later experiment with (or fully migrate to) an actor-model implementation (Elixir/OTP, Akka, etc.) for true concurrent perspectives with supervision.

The TypeScript version serves as the reference implementation and fast iteration surface.

---

**Decision points for the team:**

- Do we want the extracted thing to be a library only, or also a deployable service?
- What is the first non-dyad flow we want to run through the new wiring (standalone daily witness? akshara mirror? research synthesis?)?
- How aggressively do we want to measure contradiction rate and repair cost as quality signals?
