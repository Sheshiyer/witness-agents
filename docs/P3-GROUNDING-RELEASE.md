# P3 Grounding Release Notes

**Initiative:** NVIDIA NeMo Retriever Grounding for Atomic Witness Orchestration  
**Status:** Release candidate complete for ports/adapters, private index prototype, actor skeleton, and validation harnesses.

## What Is Included

- **Extraction adapter seam:** `createNemoExtractionProvider` calls a NeMo-compatible extraction endpoint and normalizes common response shapes into `GroundedPassage[]`.
- **Corpus ingestion:** `ingestWitnessCorpus` can extract passages and write them into a supplied `PrivateIndexManager`.
- **Private indexes:** `createInMemoryPrivateIndexManager` provides a self-hosted-friendly reference implementation with subject-scoped retrieval and optional global corpus inclusion.
- **Retrieval-augmented repair:** assembler repair can retrieve supporting mirrors, relevance-filter them, and honor latency caps.
- **Actor preparation:** `ActorGroundingProvider`, `RetrievalActorPool`, and `RetrievalWorkerActor` provide a supervised streaming skeleton for a future actor runtime.
- **Graph coverage:** daily, dyad, research, multi-engine, and section witness graphs all use consistent resonance-only grounding guardrails.

## Validation Evidence

- `npm --prefix packages/orchestration run typecheck`
- `npm --prefix packages/orchestration test` — 34/34 passing
- `npm run typecheck`
- `npm test` — 618/618 passing

## Operational Notes

- Retrieval remains default-deny: no provider, no retrieval.
- Aggregate retrieval budgets are reserved before each retrieval call; calls that would exceed the remaining budget are skipped.
- `maxRetrievalLatencyMs` prevents slow retrieval from blocking witness output.
- Private index retrieval does not leak another subject's passages unless those passages are explicitly added to the global corpus.

## Known Boundaries

- Real production quality still depends on the deployed extraction/reranking endpoint and corpus content.
- The in-memory private index is a reference implementation, not durable storage.
- Actor grounding is a TypeScript supervision skeleton; Elixir/OTP or Durable Object runtime migration remains future work.
