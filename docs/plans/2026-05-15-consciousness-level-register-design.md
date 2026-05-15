# Consciousness-Level Register System — Design

**Date:** 2026-05-15
**Status:** Design — validated section-by-section, materializing as GitHub issues
**Authors:** Sheshnarayan Iyer (principal), Claude Opus 4.7 (drafting)
**Project:** witness-agents · scripts/integratedreading/
**Predecessor milestone:** [#1 Reading Modes](https://github.com/Sheshiyer/witness-agents/milestone/1) (closed, all 24 task issues + 7 epics merged 2026-05-14)

---

## Context

The integratedreading pipeline currently produces readings exclusively at the **L5 / initiate** register — framework-native vocabulary (Aletheios/Pichet dyad, Koshas-as-Clifford-algebras, Eigenwelt/Mitwelt/Umwelt, AKSHARA seed, anti-dependency telos, multi-system braided cross-references). This is correct for users at consciousness_level 4-5 who have internalized the Tryambakam Noesis framework grammar.

But Selemene's user-profile DB tracks `consciousness_level: 1-5`. The pipeline currently ignores this field. Users at levels 1-3 — the majority by population — get readings whose vocabulary is opaque to them. They want **traditional Vedic astrology vocabulary** (Lagna, Rashi, Nakshatra, dasha periods, yogas, doshas, remedies), structured in the conventional 11-part Kundali format, with pragmatic predictions and honest both-sides framing.

The same register-split applies to every Selemene engine: Human Design at L1-L3 uses traditional Type/Strategy/Authority/Centers/Channels/Profile language; at L4-L5 it uses electromagnetic-channel + cross-coupling language. Gene Keys at L1-L3 stays in the Shadow/Gift/Siddhi triad; at L4-L5 it talks about codon rings + sphere-of-purpose couplings. Etc.

## The contract

**One reading per user per request, generated at exactly one consciousness level.** Level is resolved by precedence:

```
effective_level = admin_payload_override     // if request is authenticated as admin/initiate AND payload sets it
                ?? user_db_stored_level      // for normal API calls
                ?? 1                          // default for unregistered / first-time
```

The register split is **binary** for content (L1-L3 traditional / L4-L5 framework-native). Finer-grained variation within each band is autoresearch-tunable later but architecturally we only branch twice.

**Security boundary:** the admin-payload override is honored only when caller has `tier === 'initiate'` OR an explicit admin role flag. Non-admins passing `consciousness_level: 5` in their payload get a 403, not a privileged reading.

## Existing infrastructure (what we build ON)

| File | What it provides |
|---|---|
| `src/config/witness-capabilities.ts` | 4-tier capability profiles (free/subscriber/enterprise/initiate) with `max_kosha`, `max_clifford`, `agents_mode`, `rate_limit_per_day` |
| `src/api/server.ts:300` | Tier-to-level coarse mapping `0|2|3|5` — needs to be re-grained to support all 5 distinct levels |
| `src/agents/user-state.ts` | User-state tracking + level promotion-over-time machinery (already exists) |
| `scripts/integratedreading/modes/*.md` | 6 shipped mode docs (composite-dyad, composite-triad, partner-synastry, business-partners, family-penta, team-synergy). All currently L4-L5 register. |
| `scripts/integratedreading-mode.ts` | Unified orchestrator (PR #60). Currently mode-aware but level-blind. |
| `scripts/autoresearch-integratedreading/defaults.ts` | Autoresearch contract (PR #65). Adds `JUDGE_MODEL`, contract enforcement. |

## What gets built

### 1. Level-resolver module (NEW)
`scripts/integratedreading/level-resolver.ts` exports `resolveLevel({user_id, admin_override, default_level=1}): 1|2|3|4|5`. Handles auth gate for admin override. Throws `403 ForbiddenLevelOverride` for non-admin callers trying to override.

### 2. Mode-doc register-variant schema (EXTEND)
`scripts/integratedreading/modes/_schema.md` gets a new optional frontmatter block `register_variants:` plus body sections `## register-l1-l3` and `## register-l4-l5` that override specific pass templates by ID. Mode docs without this block keep current L5 behavior (backward-compat). Six mode docs get L1-L3 variants added.

### 3. Per-engine vocabulary lexicon (NEW)
`scripts/integratedreading/engine-lexicons.md` — single reference doc with 16 sections (one per Selemene engine). Each section declares:
- L1-L3 vocabulary table (traditional terms only — Lagna/Rashi/Nakshatra; HD Type/Strategy/Authority; Gene Keys Shadow/Gift/Siddhi)
- L1-L3 voice rules (remedies allowed; bare Sanskrit allowed; tradition-default framing allowed)
- L4-L5 vocabulary table (current framework-native register)
- L4-L5 voice rules (anatomical precision, Tarot-in-prose, no biohack metrics — current rules)

### 4. API endpoint updates (TOUCH 2 files)
`src/api/server.ts` + `src/standalone/standalone-api.ts` — every reading endpoint accepts optional `consciousness_level: 1|2|3|4|5` in payload, resolves via `level-resolver.ts`, returns `effective_consciousness_level` in response.

### 5. Orchestrator level-branching (TOUCH 1 file)
`scripts/integratedreading-mode.ts` gains `--level` CLI flag + reads `consciousness_level` from API context. Selects matching register variant from mode doc. Injects engine lexicon section into system prompt. Result: same orchestrator code path, register-adaptive output.

### 6. Admin auth path (TOUCH 1 file)
`src/api/server.ts` auth middleware — before honoring `consciousness_level` payload field, verify caller has `initiate` tier OR `admin` role. Otherwise 403.

## Phase map (3 phases, ~17 issues)

### Phase 1 — Contract Freeze 🔒 (1 PR, blocking)

**Goal:** Lock all data shapes + auth rules so Phase 2 swarms build in parallel without collision.

**Exit criteria:** all 4 contracts merged + tested + backward-compatibility verified.

**Wave 1 — Sequential within one PR (contracts are inter-referential):**

| # | Swarm | File | Owner |
|---|---|---|---|
| 1.1 | Level-resolution rule | `scripts/integratedreading/level-resolver.ts` | claude |
| 1.2 | Mode-doc register-variant schema | `scripts/integratedreading/modes/_schema.md` (extend) | claude |
| 1.3 | Per-engine lexicon schema | `scripts/integratedreading/engine-lexicons.md` (skeleton) | claude |
| 1.4 | API request/response contract | `src/types/reading-request.ts` + type updates | claude |

### Phase 2 — Parallel Build ⚡ (5 PRs in parallel after Phase 1 lands)

**Goal:** Implement orchestrator branching, register-variant mode docs, engine lexicon content, API endpoints, admin auth — all in non-overlapping file zones.

| # | Swarm | Files (allowed edit surface) | Depends on |
|---|---|---|---|
| 2.1 | Orchestrator level-branching | `scripts/integratedreading-mode.ts` | 1.1, 1.2, 1.3 |
| 2.2 | Mode-doc L1-L3 register variants (6 modes) | `scripts/integratedreading/modes/{composite-dyad,composite-triad,partner-synastry,business-partners,family-penta,team-synergy}.md` (append `## register-l1-l3` block to each) | 1.2 |
| 2.3 | Per-engine L1-L3 lexicons (16 engines) | `scripts/integratedreading/engine-lexicons.md` (populate 16 sections) | 1.3 |
| 2.4 | API endpoint updates | `src/api/server.ts`, `src/standalone/standalone-api.ts` | 1.1, 1.4 |
| 2.5 | Admin auth path | `src/api/server.ts` (auth middleware), `src/agents/user-state.ts` | 1.1, 1.4 |

### Phase 3 — Integration + Hardening ✅ (2 PRs sequential)

**Goal:** Live runs at each level on real fixtures, render verification, autoresearch extension, SKILL.md updates.

| # | Swarm | Deliverable |
|---|---|---|
| 3.1 | Live-run + render verification | All 6 modes at L1, L3, L5 on Chitra+Harshita+Varsha fixture. Word counts + cross-ref density + voice-fidelity per level. Side-by-side screenshot comparison. |
| 3.2 | Autoresearch + SKILL.md | `scripts/autoresearch-integratedreading/per-mode/runner.ts` gains `--level` flag. Mode configs gain `variant_axis_per_level`. SKILL.md gets "Consciousness Level Register" section. |

## Verification gates

| Phase | Gate |
|---|---|
| P1 exit | (a) Mode doc with NO `register_variants:` parses + produces identical output to current behavior (backward-compat smoke test). (b) `level-resolver.ts` rejects non-admin override with 403. (c) New tests pass. |
| P2 exit | Each new L1-L3 mode-doc variant hand-reviewed for traditional-vocabulary purity. Each engine lexicon has both L1-L3 + L4-L5 sections. API endpoints accept new field. Auth path verified by adversarial test (non-admin override → 403). |
| P3 exit | Live runs at L1, L3, L5 on the same fixture produce distinctly-registered readings (voice-judge confirms). Word counts: L1-L3 ~9-11k, L4-L5 ~12-15k. SKILL.md + design doc both updated. Autoresearch loop runs at both bands. |

## GitHub sync strategy

Per `swarm-architect/runbooks/plan-to-github.md`:

- **1 milestone:** "Consciousness-Level Register System"
- **3 phase-epic issues** (one per phase)
- **14 atomic task issues** (4 P1 contracts + 6 P2 mode variants + 1 P2 lexicon + 1 P2 orchestrator + 1 P2 API + 1 P2 auth + 1 P3 verification + 1 P3 autoresearch/docs)
- **Labels:**
  - `consciousness-level` (umbrella)
  - `phase:1-contracts` / `phase:2-build` / `phase:3-hardening`
  - `area:api` / `area:orchestrator` / `area:modes` / `area:lexicons` / `area:auth` / `area:autoresearch` / `area:verification`
  - `epic` (for the 3 phase issues)

## Multi-agent boundaries (per swarm-architect `playbooks/multi-agent-boundaries.md`)

- **One issue → one owner → one branch/worktree** — preserved across all 17 issues
- **Contracts freeze before parallel build** — Phase 1's 4 contracts must merge before any P2 swarm starts
- **No overlapping ownership inside a wave** — P2's 5 swarms operate on disjoint files (mode docs vs lexicon vs orchestrator vs API vs auth)
- **Contract updates require integration task** — if a P2 swarm finds it needs to modify a P1 contract, that's a "contract update" issue, not silent drift

## Engine-lexicon scope reference

The 16 Selemene engines (each gets L1-L3 + L4-L5 vocab + voice rules in `engine-lexicons.md`):

| Engine | L1-L3 register summary | L4-L5 register summary (current) |
|---|---|---|
| vimshottari | Mahadasha + antardasha + traditional planet/sign/house framing | Phase-lock geometry, dasha-cadence overlap matrix |
| panchanga | Tithi / Vara / Nakshatra / Yoga / Karana — traditional 5-limb almanac | Day-of-pivot ratification signal, Mitwelt overlay |
| ashtakavarga | Bindu count by house + planet | Engine-weighted bhuta signature |
| vedic-clock | Hour-by-hour planetary signal (Hora) | Cl(3) wisdom-layer temporal signature |
| human-design | Type / Strategy / Authority / Centers / Channels / Profile / Incarnation Cross | Electromagnetic channels + Pranamaya (vital) layer routing |
| gene-keys | Shadow / Gift / Siddhi triad + Activation/Evolution/Radiance/Purpose spheres | Codon ring + Manomaya (pattern engine) signature |
| tarot | Major Arcana + Court cards + Minor in traditional spreads | Mitwelt-archetypal current, Cl(7) imperishable seed |
| i-ching | Hexagram + changing lines + Sequence of Wen | Compositional state-vector |
| numerology | Life Path / Expression / Soul Urge / Personality (Pythagorean) | Numeric-seed bhuta resonance |
| biorhythm | Physical/Emotional/Intellectual sine waves | Pranic phase-lock cadence |
| nadabrahman | Sound-syllable resonance + ayurvedic body type | Cl(1) Pranamaya audio-signature |
| biofield | Aura + chakra reading | Annamaya (body) measurable substrate |
| face-reading | Mian Xiang traditional features | Cl(0) Annamaya morphological signal |
| sacred-geometry | Yantras, mandala patterns | Anandamaya imperishable form-current |
| enneagram | 9 types + wings + arrows | Pattern-engine bias map |
| sigil-forge | Personal sigil generation | AKSHARA-seed materialization tool |

The lexicon doc is the SINGLE reference for orchestrator + mode-doc authors. When the orchestrator builds a system prompt, it pulls the matching engine sections at the correct level band.

## Open questions (resolved or deferred)

- **Resolved:** "Binary L1-L3 vs L4-L5 split" — yes, per user
- **Resolved:** "One reading per user per request at one level" — yes, per user
- **Resolved:** "Admin override via payload" — yes, gated by `initiate` tier or admin role
- **Deferred to P3 autoresearch:** within the L1-L3 band, does a level-1 user get a SHORTER reading than a level-3 user? (Currently: same register, same length. May vary later via autoresearch.)
- **Deferred:** does the orchestrator EVER auto-promote a user's level based on this single reading's completion? (No — level promotion is the user-state machinery's job, not the orchestrator's.)

## References

- Predecessor milestone: [#1 Reading Modes — Synastry / Business / Family / Team](https://github.com/Sheshiyer/witness-agents/milestone/1)
- Predecessor design: [docs/plans/2026-05-14-reading-modes-design.md](2026-05-14-reading-modes-design.md)
- Autoresearch contract: `scripts/autoresearch-integratedreading/defaults.ts`
- User-state machinery: `src/agents/user-state.ts`
- Tier capability profiles: `src/config/witness-capabilities.ts`
- Swarm-architect: `~/.craft-agent/workspaces/my-workspace/skills/swarm-architect/`
- User-pasted Vedic baseline prompt: the 11-Part Kundali structure that defines the L1-L3 target register (Core Birth Chart → Past Life → Career → Money → Love → Marriage → Health → Family → Timeline → Remedies → Final Guidance)
