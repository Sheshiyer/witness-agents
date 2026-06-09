# ADR-003: Grounding Layer Path to Actor Model (Elixir/OTP or Equivalent)

**Status:** Draft / Skeleton (P3 parallel work started while P2 gate review is in progress)  
**Date:** 2026-06-09  
**Context:** NVIDIA NeMo Retriever grounding added in P1/P2 as an optional, evidence-gated `GroundingProvider` port on top of the atomic fact-locked orchestration.

## Decision

We will evolve the grounding layer (and eventually the full orchestration) toward an actor-model implementation (Elixir/OTP style, or Cloudflare Durable Objects / other supervised concurrent runtime) while keeping the current TypeScript InProcess implementation as the fast reference and primary runtime for the foreseeable future.

## Rationale

- Atomic perspectives (Aletheios, Pichet, Selemene, synthesis, research, etc.) are naturally concurrent and benefit from independent supervision, restarts, and back-pressure.
- Retrieval (embedding + rerank + future extraction) is I/O heavy and can be offloaded to supervised workers without blocking the main witness flow.
- Privacy-first per-subject vector indexes and long-running ingestion pipelines fit actor state + supervision trees better than stateless request/response.
- The existing ports-and-adapters design (`GroundingProvider`, soon `ExtractionProvider`, `IndexScope`) already gives us a clean boundary to swap the backend.

## Current State (P2 complete / P3 skeleton)

- `GroundingProvider` + `GroundedPassage` + `RetrievalQuery` + `injectGroundedContext` are the stable contract.
- `InProcessWitnessOrchestrationService` + `WitnessOrchestrator` are the current execution model.
- Observability, metrics, and budget hooks are in place.
- All graphs declare `requiresGrounding` declaratively.

## Target Shape (Actor Direction)

- A `StreamingGroundingProvider` (or `ActorGroundingProvider`) that can yield passages asynchronously and support cancellation / supervision signals.
- The orchestration core will grow an optional "actor boundary" (or be re-implemented behind the same service interface).
- Retrieval, extraction, and private index management become supervised actors (one per subject or per corpus namespace).
- FactLock and atomic tasks remain the same; only the execution and grounding substrate change.
- Backwards compatibility: the TypeScript InProcess path must continue to work identically for existing callers.

## Interface Sketches (P3 starting point)

See `packages/orchestration/src/grounding.ts`:

```ts
export interface StreamingGroundingProvider extends GroundingProvider {
  retrieveStream?(query: RetrievalQuery): AsyncIterable<GroundedPassage>;
}
```

Future extraction and index actors will follow similar patterns.

## Migration Considerations

- Keep the port stable — only add optional methods.
- Provide a thin adapter layer so existing `InProcess...Service` can delegate to an actor runtime when configured.
- Document supervision, restart, and back-pressure expectations in the ADR as real actor code lands.
- Private indexes (P3-W2) will be the first real driver for actor state.

## Risks & Mitigations

- Premature actor complexity: Mitigated by doing skeleton + ADR first, real implementation only after P2 gate is closed and P3 extraction/indexes prove value.
- Contract drift: Strict interface + tests + the "no breaking changes to atomic contract" rule.
- Observability loss: All retrieval/extraction signals must continue to flow through the existing `OrchestrationObserver` + metrics collector.

## Next Steps (P3 waves)

- P3-W1: ExtractionProvider + basic ingestion for witness corpus.
- P3-W2: Per-subject private indexes + retrieval-augmented fact-checker/repair.
- P3-W3: Full actor skeleton implementation behind the streaming interface + this ADR finalized + release notes.

## Decision Record

Approved in principle as part of the 3-phase NVIDIA NeMo grounding initiative. Implementation will be gated behind P2 validation evidence and explicit human review of witness quality.

**Related:**
- Main plan: `docs/plans/nvidia-nemo-retriever-grounding-swarm-plan.md`
- P2 evidence: `docs/p2-grounding-validation-evidence.md`
- P2 review harness: `docs/P2-GROUNDING-REVIEW-HARNESS.md`
- Current port: `packages/orchestration/src/grounding.ts`
