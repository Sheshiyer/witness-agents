# Witness Agents — Retirement & Migration Guide

**Status:** RETIRED FOR LIVE RUNTIME (2026-07-01)  
**Runtime canonical service:** Selemene (`https://selemene.tryambakam.space`)  
**This repository:** Long-term source of truth for personas, `.premium-assets/`, historical batches, generation scripts, and mode definitions.

---

## What Changed

- **Live rich Aletheios + Pichet dyad interpretation** now happens inside Selemene.
- **Premium asset generation** (source packs, integrated readings, NotebookLM-ready artifacts) is an additive Selemene surface.
- The old `witness-agents` standalone server / direct CLI runtime paths are no longer the production path.
- Personas (IDENTITY, AGENTS, SOUL, etc.) have been (or are being) enriched into the `noesis-witness` crate inside Selemene for live use.

**This repo is NOT deleted.** It is now read-mostly reference + authoritative asset source.

---

## Where to Go Now (Migration)

### Get a rich dyad interpretation (Aletheios + Pichet + synthesis)

**Recommended:**
```bash
# Via SDK (TypeScript)
import { NoesisClient } from '@tryambakam/noesis-sdk';

const client = new NoesisClient({ baseUrl: 'https://selemene.tryambakam.space' });
const dyad = await client.interpretWitness({
  engine_outputs: [...],   // from calculate() or workflow()
  context: { ...optional }
});
```

**Direct API:**
```bash
curl -X POST https://selemene.tryambakam.space/api/v1/witness/interpret \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "engine_outputs": [ ... ],
    "context": { "subject_name": "..." }
  }'
```

Response shape (frozen contract):
```json
{
  "aletheios": "...",
  "pichet": "...",
  "synthesis": "...",
  "witness_question": "...",
  "engines_used": ["panchanga", ...],
  "llm_powered": true
}
```

### Get premium assets (source pack, integrated reading, NotebookLM artifacts)

**SDK:**
```ts
const result = await client.generatePremiumAsset({
  mode: "solo" | "dyad" | "family-triad" | ...,
  subjects: [...],
  engine_outputs: [...],
  // optional: llm, modeDoc override, etc.
});
```

**Direct API:**
```
POST /api/v1/assets/generate
```

See Selemene docs:
- `docs/api/README.md` (Witness + Assets sections)
- `packages/noesis-sdk-ts/README.md`

### Lightweight rule-based mirror (unchanged)

Individual engine responses still include the original non-prescriptive `witness_prompt` / `witness_prompts[]`. This remains the "quick mirror" path and is unaffected.

---

## What Remains Authoritative Here

| Asset / Artifact                  | Location                              | Status                  | Notes |
|-----------------------------------|---------------------------------------|-------------------------|-------|
| Full agent definitions (Aletheios + Pichet) | `agents/aletheios/`, `agents/pichet/` | Source of truth (reference) | IDENTITY.md, SOUL.md, AGENTS.md, etc. |
| Historical premium outputs        | `.premium-assets/`                    | Authoritative history + generation reference | Per-subject packs, drift reviews, audits |
| Batch generation scripts          | `scripts/` (premium-asset-factory.ts, batch-interpret.ts, audit-asset-chain.ts, integratedreading/*.ts, etc.) | Reference implementations | Use to understand pipeline; run locally for research |
| Integrated reading modes          | `scripts/integratedreading/modes/`    | Authoritative mode docs | family-triad, solo, dyad, matru-putra, etc. |
| Batch inputs/outputs (historical) | `.batch-inputs/`, `.batch-outputs/`   | Historical record       | Do not treat as live cache |
| Fact override patterns            | `.batch-contexts/structured-fact-overrides.json` | Proven pattern | Reference for screenshot-authoritative flows |
| Persona + mode research           | `docs/`, `knowledge/`, `ISA.md`       | Long-term reference     | Architecture decisions, validation evidence |

**Do not delete or overwrite** `.premium-assets/` or historical batch directories. They are the audit trail and content seed source.

---

## Honest Status (What Has / Has Not Been Fully Ported)

**Ported / Canonical in Selemene now:**
- `/api/v1/witness/interpret` rich dyad (6-field frozen contract)
- `POST /api/v1/assets/generate` + SDK `generatePremiumAsset`
- Core 16 engines + rule-based witness prompts
- Basic source-pack + reading + reflection question generation
- Persona voice enrichment into `noesis-witness` crate (in progress / partial)

**Still maturing or not yet fully ported (as of 2026-07-01):**
- Full multi-pass per-section LLM orchestration with FactLock injection (the complete `section-witness` graph + quality validator loop)
- Complete NotebookLM artifact pipeline (audio deep-dive, video, slide decks, quiz, mind-map) — reference lives in `scripts/notebooklm-artifacts.ts` and `premium-asset-factory.ts`
- Full HTML/PDF rendering of premium readings
- Advanced mode policy + register band enforcement for high-consciousness subjects
- Structured fact overrides + chain audit parity for complex synastry / lineage cases
- The complete historical `.premium-assets/` corpus and drift-review discipline

Until the above are fully ported and validated, treat `witness-agents/scripts/` and `.premium-assets/` as the authoritative reference for how premium integrated readings should be built.

---

## Optional Thin Compat Shim (If Needed)

If downstream consumers still call old direct interfaces, a minimal shim can live here later (e.g., a small proxy or CLI that forwards to Selemene). This is **not yet implemented** and should only be added after explicit request.

Current recommendation: migrate callers to the Selemene endpoints / SDK instead of adding shims.

---

## Quick Migration Checklist (Previous witness-agents Users)

- [ ] Replace direct `DyadInferenceEngine` / local orchestrator calls with `POST /api/v1/witness/interpret` or SDK `interpretWitness()`.
- [ ] Replace local premium asset factory calls with `POST /api/v1/assets/generate` or SDK `generatePremiumAsset()`.
- [ ] Keep using this repo's `agents/`, `.premium-assets/`, and `scripts/` for:
  - Researching how a mode or asset pack should look
  - Regenerating historical-style outputs locally
  - Auditing drift against locked facts
- [ ] Update any internal docs or runbooks that pointed at `48.tryambakam.space` or local witness-agents server to point at `selemene.tryambakam.space`.
- [ ] Preserve `.premium-assets/` and batch history — do not treat them as disposable cache.

---

## Contact / Further Reading

- Selemene API reference: `Selemene-engine/docs/api/README.md`
- SDK: `Selemene-engine/packages/noesis-sdk-ts/README.md`
- Retirement architecture plan: `Selemene-engine/docs/plans/2026-07-01-witness-agents-retirement-minimal-arch-design.md`
- Historical handoff inventory: `witness-agents/docs/handoff/selemene-integration-handoff.md`
- This repo's ideal-state record: `ISA.md`

**Built for Tryambakam Noesis • Witness Agents v0.1.0 (now reference)**
