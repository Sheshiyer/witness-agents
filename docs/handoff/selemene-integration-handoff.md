# Witness-Agents → Selemene Engine Integration Handoff

**Date:** 2026-06-26
**Source:** `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents/`
**Targets:**
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/Selemene-engine/`
- `/Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/selemene-engine-port-witness/`

## Summary

The `witness-agents` repo has evolved a hardened premium-reading pipeline that is **not yet integrated** into the Selemene-engine witness-pipeline. This document inventories the gaps so the Selemene team can plan the port.

## Verified Gaps

### 1. Structured NVIDIA Batch Interpretation
- **File:** `witness-agents/scripts/batch-interpret.ts`
- **What it does:** Reads Selemene engine JSON, runs a multi-section reading through NVIDIA NIM, applies engine filters and fact overrides, and emits a deterministic markdown reading.
- **Selemene status:** Not present. The Selemene `witness-pipeline` orchestrator (`packages/witness-pipeline/src/orchestrator/integrated.ts`) uses a generic LLM callback and mode documents, but has no NVIDIA-specific batch path or section-witness graph.
- **Port priority:** High — this is the current production path for Harshita/Anitha/CS readings.

### 2. Section-Witness Graph + FactLock
- **File:** `witness-agents/src/wiring/graphs/section-witness.ts`
- **What it does:** Builds a `createSectionWitnessGraph()` that injects authoritative FactLock facts into every section prompt, preventing drift on ascendant, nakshatra, dasha dates, HD type, etc.
- **Selemene status:** Not present.
- **Port priority:** High — required for deterministic accuracy on Vedic/HumDes facts.

### 3. Batch Output Quality Validator
- **File:** `witness-agents/src/wiring/batch-output-quality.ts`
- **What it does:** Programmatic checks for gated vocabulary (biofield, chakra, oracle, etc.), incomplete final sentences, and planning-text leakage.
- **Tests:** `witness-agents/tests/batch-output-quality.test.ts`
- **Selemene status:** Not present. Selemene factory only counts deterministic facts.
- **Port priority:** High — gate that keeps unapproved layers out of outputs.

### 4. Premium Asset Factory (Full)
- **File:** `witness-agents/scripts/premium-asset-factory.ts`
- **What it does:**
  - Generates `source-pack/*.md` briefs tailored for NotebookLM.
  - Renders `reading.html` and `reading.pdf` via Chrome.
  - Generates `reflection-questions.md`.
  - Optionally drives NotebookLM to create audio deep-dive, video brief, study guide, briefing, slide decks, quiz, flashcards, and mind map.
- **Selemene status:** `packages/witness-pipeline/src/assets/factory.ts` only creates a minimal source pack + reading markdown + reflection questions. It explicitly says "HTML/PDF rendering is out of scope for this pass" and has no NotebookLM integration.
- **Port priority:** High — this is the deliverable surface end users see.

### 5. NotebookLM Integration
- **Files:**
  - `witness-agents/scripts/premium-asset-factory.ts` (NotebookLM section)
  - `witness-agents/scripts/notebooklm-artifacts.ts`
- **What it does:**
  - Creates fresh notebooks per run (does not reuse old ones without clearing sources).
  - Uploads source pack.
  - Generates/downloads audio, video, reports, slide decks, quiz, flashcards, mind map.
  - **New robust pattern (2026-06-26):** `generate --no-wait` → `artifact wait --timeout 600` → download by artifact ID. Avoids server-side 300s timeouts that previously caused false failures.
- **Selemene status:** Not present.
- **Port priority:** Medium-High — only needed if Selemene wants to produce NotebookLM assets.

### 6. Asset Mode Policy + Answered Mode Context
- **Files:**
  - `witness-agents/scripts/asset-mode-policy.ts`
  - `witness-agents/.batch-contexts/solo-context.json`
- **What it does:** Defines mode policies (consciousness level, register band, approved engines) and binds answered context for premium assets.
- **Selemene status:** Not present.
- **Port priority:** Medium — needed to keep asset briefs aligned with the reading's mode/register.

### 7. Structured Fact Overrides
- **File:** `witness-agents/.batch-contexts/structured-fact-overrides.json`
- **What it does:** Source-truth overrides for screenshot-authoritative facts (e.g., Harshita's Pisces ascendant, Pushya Charan 1, Ketu→Venus date).
- **Selemene status:** Not present.
- **Port priority:** High — required when external screenshots/PDFs override engine output.

### 8. Audit-Asset-Chain
- **File:** `witness-agents/scripts/audit-asset-chain.ts`
- **What it does:** Full chain audit of a premium pack: deterministic anchors, no oracle/somatic engines when layers are unapproved, manifest integrity, etc.
- **Selemene status:** `packages/witness-pipeline/src/assets/audit.ts` exists but is simpler.
- **Port priority:** Medium — gap analysis against Selemene audit needed.

### 9. Section-Witness FactLock Test
- **File:** `witness-agents/tests/section-witness-factlock.test.ts`
- **What it does:** Regression test ensuring section prompts include FactLock facts.
- **Selemene status:** Not present.
- **Port priority:** Medium — bring over with the Section-Witness Graph port.

### 10. Harshita-Specific Overrides and Inputs
- **Files:**
  - `witness-agents/.batch-inputs/harshita.json`
  - `witness-agents/.batch-outputs/harshita.md`
  - `witness-agents/.batch-contexts/structured-fact-overrides.json` (`harshita` key)
- **What it does:** A complete validated example of the new pipeline.
- **Selemene status:** Not present.
- **Port priority:** Reference only — data belongs in Selemene storage, but the pipeline logic must support it.

## Recommended Port Order

1. **Section-Witness Graph + FactLock** — accuracy foundation.
2. **Batch Output Quality Validator + tests** — safety gate.
3. **Structured NVIDIA Batch Interpretation** — replaces/augments current LLM orchestrator.
4. **Structured Fact Overrides** — enables screenshot-authoritative workflows.
5. **Premium Asset Factory HTML/PDF + NotebookLM** — end-user deliverables.
6. **Audit-Asset-Chain parity** — verify integrity of ported packs.

## Notes for Selemene Integrators

- The `witness-agents` pipeline currently runs with `SOMATIC_LAYER_APPROVED=false` and `CREATIVE_ORACLE_LAYER_APPROVED=false`. Any port must preserve these gates.
- The new NotebookLM async pattern (`--no-wait` + `artifact wait`) is required because `generate --wait` times out server-side after 300s for long audio/video/slide artifacts while generation continues in the background.
- All Harshita artifacts were generated and verified in `witness-agents/.premium-assets/harshita/` as a reference output.

## Contact / Questions

See `witness-agents/ISA.md` for the full ideal-state criteria, verification evidence, and decisions that drove the current implementation.
