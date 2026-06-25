---
phase: 2
reviewers: [codex]
failed_reviewers: [gemini, claude]
reviewed_at: 2026-06-25T03:03:09Z
plans_reviewed:
  - docs/plans/nvidia-nemo-retriever-grounding-swarm-plan.md
  - docs/p2-grounding-validation-evidence.md
  - docs/P2-GROUNDING-REVIEW-HARNESS.md
github_issues_reviewed: [99, 101, 103, 105, 106, 108]
---

# Cross-AI Plan Review - Phase 2

## Reviewer Availability

- Gemini CLI was detected but failed authentication due an unsupported Gemini Code Assist client tier.
- Claude CLI was detected, but the documented `--no-input` flag is unsupported in this installed version; retrying with `-p` failed with `401 Invalid authentication credentials`.
- Codex CLI completed successfully and is the only usable external review in this run.

Because only one external reviewer completed, this file includes a single-reviewer summary rather than a true multi-reviewer consensus.

## Codex Review

### Summary

Phase 2 is close, but it should not be closed yet. The implementation evidence is strong for service wiring, graph opt-in grounding, metrics hooks, and zero-retrieval compatibility, but the phase's own gate still has unchecked requirements: human fidelity review across 2+ graph types, real/high-fidelity metrics correlation, and GitHub close evidence. Based on the supplied issue snapshot and local files, P3 skeleton work can continue only as non-release preparatory work; full P3 should not be declared active/complete until the P2 fidelity gate is attached and reviewed.

### Strengths

- Good architecture: `GroundingProvider` is optional/default-deny, preserving the FactLock-first contract.
- Good regression posture: NOOP and MOCK runs compare retrieval-disabled vs retrieval-enabled paths.
- Good observability direction: retrieval start/complete hooks, passage counts, relevance, latency, and cost fields exist.
- Good evidence discipline: `docs/p2-grounding-validation-evidence.md` explicitly keeps P2 open until review evidence is present.
- Good review harness: the harness defines concrete qualitative checks for "witness feel," non-prescriptive tone, and FactLock primacy.

### Concerns

- **HIGH: P2 close criteria are not met.** The evidence file still leaves human review, metrics correlation, and phase-close comments unchecked. This alone blocks formal closure.
- **HIGH: Fidelity evidence is too synthetic.** The current runs use mock executor/mock provider. That verifies plumbing, not whether real or high-fidelity retrieval improves daily/dyad/research outputs without "RAG summary" drift.
- **MEDIUM: P3 has advanced beyond "skeleton" while P2 gate remains open.** The evidence lists actor provider, extraction, private index, grounded fact-checker, and repair work. That is acceptable as isolated prep, but risky if treated as validated continuation.
- **MEDIUM: Budget enforcement appears per-query, not aggregate.** The implementation compares each estimate to the budget, but does not visibly decrement or track total budget across retrieval calls.
- **MEDIUM: Planned latency cap is not evidenced.** The P2 task mentions `maxRetrievalLatencyMs`, but the service/orchestrator paths do not show timeout enforcement around `provider.retrieve`.
- **MEDIUM: Graph standardization has one mismatch.** Main graphs rely on central injection, but `section-witness.ts` also injects grounding into user prompts with stronger "ground your interpretation" language, which weakens the "mirrors only" guardrail.
- **LOW: GitHub hygiene is incomplete in the supplied snapshot.** Wave/task issues remain open, and #103 has no close evidence comments. Live GitHub state should be rechecked before closure.

### Suggestions

1. Run the review harness for at least Daily + Dyad, preferably Daily + Dyad + Research, with real or high-fidelity retrieved passages.
2. Attach 1-2 short before/after excerpts per graph showing FactLock preservation, witness tone, and whether retrieval improved depth.
3. Add an explicit retrieval metrics table: calls, hit rate, avg relevance, latency p50/p95, contradictions, repairs, and cost.
4. Add or update tests for aggregate `retrievalBudgetTokens` and retrieval timeout behavior.
5. Normalize `section-witness` grounding language to the same "resonance mirrors only, never authority" stance.
6. Close or update GitHub issues in order: W2 evidence on #101, W3 evidence on #103, master close comment on #105, then task issues.

### Risk Assessment

**MEDIUM.** The core implementation appears directionally sound and regression risk is contained by default-deny retrieval, but the close gate depends on human fidelity and real/high-fidelity retrieval behavior, not just plumbing tests. Do not formally close Phase 2 until the three unchecked evidence items are resolved and attached.

---

## Single-Reviewer Summary

### Agreed Strengths

With only Codex available, there is no multi-reviewer agreement to measure. The successful review highlights that the architecture is sound, default-deny grounding protects existing behavior, and the repo already has an explicit evidence file and review harness for closing Phase 2 responsibly.

### Agreed Concerns

The highest-priority remaining blockers are:

1. Human fidelity review for 2+ graph types is still missing.
2. Retrieval metrics correlation evidence is still missing.
3. GitHub wave/phase close comments have not been posted, and several canonical/task issues remain open.
4. Two implementation risks should be checked before formal close: aggregate retrieval budget behavior and timeout enforcement.

### Divergent Views

No divergent reviewer views are available because Gemini and Claude did not complete.

## Practical Close Checklist

- Fill `docs/p2-grounding-validation-evidence.md` with human review notes for Daily plus Dyad or Research.
- Capture metrics from at least one grounded and one no-grounding run: retrieval calls, hit rate, average relevance, latency, contradiction count, repair count, and cost.
- Decide whether Phase 2 requires fixes for aggregate budget accounting, retrieval timeout enforcement, and `section-witness` guardrail wording before close.
- Post evidence/close comments to #101, #103, and #105.
- Close or annotate stale task issues #106 and #108 if their deliverables are already covered by the landed Phase 2 work.
