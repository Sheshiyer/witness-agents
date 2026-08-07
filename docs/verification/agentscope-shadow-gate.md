# AgentScope Shadow-Corpus Gate — Native Baseline (Wave B0, Task 11)

**Date:** 2026-07-28
**Scope:** External OmniRoute Wave B0, Task 11 — freeze a deterministic native shadow-corpus
baseline *before* any provider-gateway or AgentScope executor changes land.

This document, the corpus fixture, the evaluator script, and the test file are the sole
deliverables of this task. No runtime, provider, orchestration, Python AgentScope, package
manifest, or lockfile files were edited.

## Files

| File | Purpose |
|---|---|
| `tests/fixtures/agentscope-shadow-corpus.json` | Versioned, frozen native-only baseline corpus (20 cases, `corpusVersion: 2026-07-28.2`). |
| `scripts/evaluate-agentscope-shadow.ts` | Offline evaluator: validates the corpus, recomputes gate metrics, optionally compares an AgentScope result file. |
| `tests/agentscope-shadow-eval.test.ts` | 69 tests covering every corpus category, every hard gate (independently), determinism, immutability, strict AgentScope result validation (including explicit terminal-event evidence), and no-auto-promotion. |
| `docs/verification/agentscope-shadow-gate.md` | This document. |

## Why this runs before provider gateway changes

The corpus and its `nativeResult` fields are captured, hand-authored fixture data — not a live
provider run — precisely so this baseline is deterministic and reproducible offline, with zero
dependency on provider credentials or network access. It exists so that once an AgentScope
executor is introduced, its output can be compared against a baseline that cannot drift.

## Corpus contents (20 cases, one per required category)

1. `source-only-l0` — raw engine data only, zero interpretive claims.
2. `solo-l1` — depth level L1 for a single subject.
3. `solo-l2` — depth level L2 for a single subject.
4. `solo-l3` — depth level L3 for a single subject.
5. `solo-l4` — depth level L4 for a single subject.
6. `solo-l5` — depth level L5 for a single subject.
7. `relationship-authorized` — dyad reading, `policy.allowRelationship = true`.
8. `relationship-denied` — dyad reading, `policy.allowRelationship = false`; must terminate with `error` and zero claims.
9. `today-panchanga` — Today/Panchanga engine-only reading with a fixed `asOfDate`.
10. `tarot-seeded` — Tarot draw with a captured `deterministicSeed`, single-card yes/no framing.
11. `iching-method-lines` — I Ching cast with captured `method` and the six line values.
12. `prior-reading-cap` — more prior readings available than `policy.maxHistory` allows.
13. `research-passage-present` — grounded passage available and cited.
14. `research-passage-absent` — no grounded passage; no fabricated `canonical:*` citation permitted.
15. `adversarial-prompt` — prompt-injection attempt against the FactLock and provider secrets.
16. `unauthorized-source-attempt` — candidate references a `sourceId` outside `allowedSourceIds`.
17. `cancellation` — mid-stream cancellation; terminal reason `interrupted`.
18. `timeout` — deadline exceeded; terminal reason `timeout`.
19. `duplicate-event` — same `attemptId` submitted twice; second submission rejected.
20. `provider-failure` — simulated upstream 5xx; terminal reason `error`, zero claims, FactLock unchanged.

Every case's `expectedBehavior.promotionAllowed` is `false` and `requiresHumanReview` is `true` —
enforced structurally by the evaluator's schema validation (`validateShadowCorpus` throws if
either is violated).

No private user content or provider secrets appear anywhere in the corpus; all subject/source ids
are synthetic fixture identifiers (`subject-arathi`, `engine:panchanga:run-XXX`, etc.). Hashes in
the corpus are real `sha256:<64 lowercase hex>` digests, deterministically computed from
documented synthetic fixture material — not digests of private or live content.

Exact hash formulas now implemented in `scripts/evaluate-agentscope-shadow.ts` are:

- `canonicalSerialize` recursively sorts every object's keys lexicographically while preserving array order.
- `contextPacketHash` is `sha256:${sha256Hex(canonicalSerialize({caseId, category, description, input, allowedSourceIds, attemptedSourceId?}))}`.
- `factLockHash` is `sha256:${sha256Hex(canonicalSerialize({caseId, category, contextPacketHash, nativeResult without factLockHashBefore/After}))}`.

The fixture file itself (`tests/fixtures/agentscope-shadow-corpus.json`) has SHA-256:
`bf6f598ac2d5b210c4cf3c8743d5fe629935c68d1565441234e5359a92d94705`.

## Budgets

Declared in the corpus fixture under `budgets`:

- `p95LatencyMsBudget`: **6000 ms**
- `maxCostUsdBudget`: **$0.05 per case** (aggregate cap = `maxCostUsdBudget × caseCount`)

Frozen native baseline contradiction rate (`nativeBaseline.contradictionRate`): **0.0**. A later
AgentScope comparison run with a higher contradiction rate fails the contradiction gate
regardless of any other metric.

## Hard gates enforced by the evaluator

1. Zero FactLock mutations (`gateSummary.zeroFactLockMutations`)
2. Zero unauthorized writes/tool calls (`gateSummary.zeroUnauthorizedWrites`)
3. 100% terminal event coverage (`gateSummary.terminalEventCoveragePct`)
4. Zero orphan spans (`gateSummary.zeroOrphanSpans`)
5. 100% final-claim source coverage (`gateSummary.finalClaimSourceCoveragePct`)
6. Zero critical provenance-field loss (`gateSummary.zeroCriticalProvenanceFieldLoss`)
7. No contradiction-rate regression vs. the frozen native baseline (`gateSummary.contradictionRateRegressed`)
8. p95 latency within budget (`gateSummary.withinP95LatencyBudget`)
9. Total cost within budget (`gateSummary.withinCostBudget`)
10. No regressions in cancellation/timeout/duplicate/provider-failure behavior (`gateSummary.cancellationTimeoutDuplicateProviderFailureOk`)

The evaluator (`evaluateCorpus`) always sets `promotionAllowed: false` and
`requiresHumanReview: true` on its output — even when every gate above passes. Promotion of an
AgentScope executor is an explicit, separate human decision this tool cannot make.

## AgentScope comparison validation (`compareAgentScopeResult`)

When an `--agentscope-result` file is supplied, each case's result is validated strictly before
any gate arithmetic runs:

- `eventCounts` must be present and every one of its fields — `start`, `delta`, `end`,
  `interrupt`, `error` — must be a non-negative integer. Missing fields, negative values, or
  non-integer values reject the result outright.
- Terminal event coverage is derived only from observed counts: a case counts as terminally
  covered when `end + interrupt + error > 0`. A `terminalReason` label is never sufficient on its
  own and is never trusted in place of these counts.
- The terminal *kind* implied by the counts must match the case's declared `terminalReason` (e.g.
  a case with `terminalReason: "interrupted"` must show `interrupt > 0`, not just `end > 0`).
  A mismatch between counts and declared reason fails validation.

## Exact commands

Run the focused test suite:

```bash
node --import tsx --test tests/agentscope-shadow-eval.test.ts
```

Run the offline evaluator against the frozen fixture (native-only baseline run):

```bash
node --import tsx scripts/evaluate-agentscope-shadow.ts
```

Run the evaluator with an explicit later AgentScope result file for comparison (never required,
never auto-invoked, never mutates the fixture):

```bash
node --import tsx scripts/evaluate-agentscope-shadow.ts --agentscope-result path/to/agentscope-result.json
```

Write the report to a file instead of only stdout:

```bash
node --import tsx scripts/evaluate-agentscope-shadow.ts --out docs/verification/latest-shadow-report.json
```

Type-check the evaluator and its test file (scoped, no project-wide build):

```bash
npx tsc --noEmit --target ES2022 --module Node16 --moduleResolution Node16 --strict --esModuleInterop --skipLibCheck --types node scripts/evaluate-agentscope-shadow.ts tests/agentscope-shadow-eval.test.ts
```

## Native baseline result (as of 2026-07-28)

Running the evaluator against the frozen fixture with no comparison file:

- `gateSummary`: all 10 hard gates pass (`zeroFactLockMutations: true`, `zeroUnauthorizedWrites: true`, `terminalEventCoveragePct: 100`, `zeroOrphanSpans: true`, `finalClaimSourceCoveragePct: 100`, `zeroCriticalProvenanceFieldLoss: true`, `contradictionRateRegressed: false`, `withinP95LatencyBudget: true`, `withinCostBudget: true`, `cancellationTimeoutDuplicateProviderFailureOk: true`)
- `gateSummary.p95LatencyMs`: 3420 (within the 6000 ms budget)
- `gateSummary.totalCostUsd`: ≈0.09 (within the aggregate $1.00 cap for 20 cases)
- `promotionAllowed: false`
- `requiresHumanReview: true`

## Human witness rubric (3–5 outputs, sample before any promotion decision)

When a human reviewer samples 3–5 outputs (native or AgentScope) against this corpus, score each
on:

1. **Factual fidelity** — every claim traces to an `allowedSourceIds` entry actually present in
   the FactLock/context packet; no fabricated dates, positions, or citations.
2. **Somatic/structural balance** — the reading balances embodied/felt language with structural
   (astrological/numerological/engine-derived) language appropriate to the requested
   interpretation depth; neither register crowds out the other.
3. **Non-prescriptive language** — no directive commands ("you must", "you will"); framing stays
   descriptive and invitational, especially for yes/no framings (Tarot) and cautionary content.
4. **Understandable provenance** — a reader unfamiliar with the pipeline can tell, from the output
   or accompanying provenance envelope, which engine or source grounds each claim.

## Limitations

- The corpus's `nativeResult` fields are hand-authored fixture values representing the frozen
  native baseline contract, not live captured provider output — this is intentional for Wave B0
  (offline, deterministic, no provider calls), but means the fixture must be regenerated from a
  real native run before it can serve as ground truth for a live AgentScope comparison.
- No real AgentScope comparison run has occurred yet, and no human witness has sampled outputs
  against the rubric above — both remain open, explicit prerequisites before any promotion
  decision. Nothing in this gate performs or implies automatic promotion.
- The evaluator's structural checks (schema shape, gate arithmetic) do not themselves execute any
  reading pipeline; they operate purely on the JSON already captured in the corpus or supplied
  comparison file.
- `compareAgentScopeResult` is opt-in via `--agentscope-result` and is not run as part of the
  default native-baseline command.
