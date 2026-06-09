# P2 Grounding Validation Review Harness

**Purpose:** Human fidelity / quality gate for Phase 2 (T19).  
**Goal:** Confirm that optional NVIDIA NeMo Retriever grounding improves depth/resonance in synthesis and structural tasks **without** breaking the atomic contract (FactLock primacy, sparse repair, non-prescriptive witness stance) or introducing "search result" feel.

**Single source of truth:** `docs/plans/nvidia-nemo-retriever-grounding-swarm-plan.md`  
**Evidence attachment:** `docs/p2-grounding-validation-evidence.md` (append your notes to the "Human / Validation Agent Review Notes" section and the "Observed Behavior" section).

## Prerequisites
- Repo checked out, dependencies installed (`npm install` in witness-agents root).
- (Optional but recommended for real signal) One of `NVIDIA_API_KEY` or `OPENROUTER_API_KEY` set for live inference. The examples gracefully fall back to deterministic mocks.
- Node 20+ with `tsx` available (`npx tsx`).

## Exact Commands (Run Both Modes for Each Graph)

### 1. Daily Graph (primary production path)
```bash
# NOOP (baseline, no retrieval)
cd witness-agents
npx tsx examples/daily-atomic-layer3.ts

# MOCK grounding (simulates one high-relevance passage; fast, no keys needed)
DEMO_MOCK_GROUNDING=1 npx tsx examples/daily-atomic-layer3.ts
```

**What the MOCK path does:** Injects a single "resonance mirror" after the FactLock in Aletheios/Pichet/synthesis prompts. You will see `[retrieval:done]` lines with `passages=1 avgRel=0.87`.

### 2. Dyad Graph (Aletheios + Pichet + Selemene + synthesis)
```bash
cd witness-agents
npx tsx src/wiring/examples/witness-dyad.ts
```

To exercise grounding on the dyad:
- Temporarily edit `src/wiring/examples/witness-dyad.ts` (or copy it) to pass a `groundingProvider` + `requiresGrounding` tasks through the service (the graph already supports it).
- Or run the daily example as proxy and manually inspect the dyad graph builder output for prompt injection.

For a quick grounded dyad run (recommended for review):
```bash
# After the daily run above, or create a one-off:
DEMO_MOCK_GROUNDING=1 npx tsx -e '
import { createFactLock, createDyadWitnessGraph, InProcessWitnessOrchestrationService, NoopGroundingProvider } from "./src/wiring/index.js";
const lock = createFactLock({ subjectId: "review-dyad", subject: "Review", facts: { moon: "Kanya", relationship: "unmarried_long_term_10_years" } });
const tasks = createDyadWitnessGraph(lock);
// Simple mock provider
const mock = { async retrieve() { return [{id:"p", source:"review:dyad", excerpt:"The 10-year relationship is a stable relational spine.", score:0.9, provenance:"sourced-fact"}]; } };
const svc = new InProcessWitnessOrchestrationService(async (t) => ({taskId:t.id, perspective:t.perspective, content:`[${t.perspective}] grounded output for ${t.id}`, latencyMs:5}), { groundingProvider: mock });
const res = await svc.orchestrate({factLock: lock, tasks});
console.log("=== DYAD GROUNDED OUTPUT ===");
console.log(res.output.slice(0, 1200));
console.log("... (full output in assembled result)");
'
```

### 3. Research / Multi-Engine (optional but good for depth tasks)
Use `createResearchSynthesisGraph` or `createMultiEngineWitnessGraph` the same way as the dyad snippet above.

## What to Look For (Fidelity Checklist)
For each graph + mode (with vs without grounding):

1. **Atomic Contract Invariants (must never break)**
   - FactLock facts appear verbatim and are never contradicted in the final output.
   - Repair behavior (if any contradictions are artificially introduced) still works and is sparse.
   - Wave execution order respected (dependencies before dependents).
   - Selemene precision/anchor tasks (in dyad) remain "exact facts only" — they should not request grounding.

2. **Grounding Injection Quality**
   - When enabled, the "Retrieved Context (sourced-fact...)" block appears **after** the FactLock in the system prompt for tasks that have `requiresGrounding`.
   - Citations are present (e.g. `[demo-corpus:daily-mirror]` or real sources).
   - Language in the injected block says "resonance mirrors only — do not override locked facts".
   - In the generated witness text, the retrieved material is used lightly for texture/depth, **not** as authoritative claims.

3. **Witness Stance & "Feel" (the critical human judgment)**
   - Does the output still feel like a living, non-prescriptive witness (Aletheios clarity + Pichet somatic/relational) rather than a grounded RAG summary?
   - Is there more resonance / depth / useful mirrors without becoming "citation-heavy" or losing the poetic / field quality?
   - For the daily synthesis: does the final practice/question feel more alive or just better sourced?
   - For dyad: does the partnership field description gain useful texture from the relationship-history mirror without diluting the locked "10-year unmarried long-term" fact?

4. **Metrics & Observability (bonus)**
   - Retrieval events appear in logs (start/complete with passageCount, avgRelevance, latency).
   - If using `createMetricsCollector()`, the `retrieval` section shows up with byPerspective breakdown.
   - Latency added is small in the mock case; note any real-NIM numbers.

5. **Regression (no-grounding mode must be identical in spirit to pre-P2)**
   - Run the NOOP commands. Output structure, contradiction rate, repair iterations, and "witness voice" should be essentially unchanged from before grounding was added.

## Review Notes Template (copy into the evidence file)

```markdown
### Human Review — [Date] — Reviewer: [Your Name / "Human"]

**Graphs reviewed:** Daily + Dyad (or list)

**Daily Graph (NOOP vs MOCK / real)**
- Injection observed: yes/no
- Fidelity impact: (e.g. "added useful somatic texture from prior daily mirrors without overriding kosha/center facts")
- Witness feel: (e.g. "still feels like Pichet — more alive, not searchy")
- Any concerns / suggestions: (e.g. "citation format could be lighter in final text"; "raise default minRelevance to 0.75")

**Dyad Graph (NOOP vs MOCK / real)**
- ...

**Overall**
- Improves fidelity for synthesis/research tasks? 
- Preserves atomic contract? 
- Latency / cost impact acceptable for the use case?
- Recommended tightening for P3?
- Ready to close P2 gate? (yes / with conditions)

**Raw excerpts or diffs:** (paste 1-2 short before/after sections if helpful)
```

## After Your Review
1. Paste the filled template + any key excerpts into `docs/p2-grounding-validation-evidence.md` under the Human Review Notes section.
2. Update the checklist at the top of that file.
3. Tell the agent "P2 review notes attached" (or paste them directly). The agent will:
   - Attach to GitHub wave issues.
   - Post Phase 2 close comments.
   - Mark the plan section.
   - Continue straight into completing P3 waves.

## Optional: Real NVIDIA NeMo Retriever Path (for stronger signal)
Once you have a real embedding + rerank NIM endpoint (or the hosted catalog equivalents), replace the mock provider in the examples with a real adapter (to be built in P3-W1, but you can stub one quickly for review). The port is already stable.

## Questions / Edge Cases to Explicitly Call Out
- Any case where a retrieved passage almost contradicted a locked fact?
- Did the "resonance only" language in the helper + prompt prevent over-authority?
- Was there a perspective where grounding added no value (or negative value)?

Run the commands, form your judgment, and feed the notes back. This is the last mechanical gate before we declare Phase 2 complete and move fully into P3.

Thank you — this review is the most important part of the evidence.
