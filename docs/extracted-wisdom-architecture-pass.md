# EXTRACT WISDOM: Selemene + Witness Agents Architecture Pass
> A 30-commit system build across two engines, six visual docs, five deterministic gates, one mode intake policy, and a fully operational NotebookLM L3 synastry pipeline for Witnessalchemist and Harshita.

---

## The Gate Was Never About Blocking. It Was About Not Lying.

- Every gate in this system exists because of a specific failure that actually happened in production. They are not hypothetical guardrails. They are scar tissue.
- The nakshatra drift gate came from a real synastry pass that assigned Witness Alchemist's Moon to Harshita in one section. The somatic absence gate came from biofield and face-reading engines returning data while the reading said none existed. These are not edge cases. They are the default failure mode of LLM pipelines.
- The mode intake gate asks relationship questions before any LLM tokens are spent. If you pass a partner synastry as married when it is actually unmarried, the gate catches the missing commitment_status field and prints the exact questions to ask. It does not guess.
- The system blocks NotebookLM upload if the source pack has any blocker. This is not a warning. It is a hard stop. Manifest gate status cannot say "pass" if audit finds blockers because the audit runs first.

## Generated Prose Is Texture, Not Authority

- The first synastry pass we ran used a metrics JSON with generated markdown as if it were deterministic engine output. That markdown already contained contradictory claims. The system extracted zero deterministic facts from it.
- The fix was to require a synastry_partners input shape where each person carries their own engine outputs as deterministic anchors. The asset factory now extracts facts per partner with a prefix and writes a separate source file that explicitly says: if the narrative texture disagrees, the anchors win.
- In the current L3 pass, the source pack includes 40 deterministic extracted facts across two partners. The synastry narrative texture is explicitly marked as texture-only, with all nakshatra names sanitized to "see deterministic partner anchors."

## NVIDIA BGE-M3 Is The Embedding Spine Of The Entire Grounding Layer

- Every grounded task sends a query string to NVIDIA's embedding endpoint. The returned 1024-dimensional vector goes to Cloudflare Vectorize via wrangler CLI. The returned passages are filtered by relevance threshold and injected after the FactLock in the system prompt.
- This is not a side integration. It is the retrieval-augmented layer that prevents the LLM from hallucinating interpretations. The wisdom corpus stores passages. Subject engine data is also embedded per-person. Both are queryable.
- The wrangler CLI vector quoting bug was a real problem — negative numbers in float vectors were being parsed as CLI flags. The fix was switching from space-separated strings to argument arrays with execFile, passing each dimension as a separate value.

## The Dual-Agent Architecture Predates Everything Else In Witness Agents

- Aletheios and Pichet were the original witness layer. Aletheios is Kha — the observer, the map, the structural witness. Pichet is Ba — the walker, the terrain, the embodied witness who senses overwhelm before cognition registers it.
- The VoicePromptBuilder constructs system prompts per agent, per tier, per user state. HTTP status codes map to different instructions: a 404 user gets grounding, not insight. A 500 user gets structure, not content. Anti-dependency scores above 0.7 trigger the system to step back and ask what the user sees first.
- Clifford-gated memory means you can only read or write memory categories that match your current depth. Factual at Cl(0), rhythmic at Cl(1), quaternionic at Cl(2), discriminative at Cl(3), causal at Cl(7). Session memories decay over time. Persistent memories survive.
- The knowledge store loads YAML domains, cross-references, and engine-domain maps. The routing engine evaluates engine, state, temporal, multi-engine, and pain-override triggers against user state. Pain override has the highest priority.

## The L1-L3 Register Is A Different Product Than L4-L5

- L1-L3 uses traditional Vedic language, concrete self-inquiry, accessible explanations, remedies, and practical reflection. The notebook voice says "plain, traditional, practical, accessible." The deck frame says "clear titles, simple definitions." The audio frame says "warm explainer tone."
- L4-L5 uses architectural language, pattern-native vocabulary, kosha, field, anti-dependency, and structural terms. But it still must be grounded in anchors and kept recipient-facing. You may use "field" and "layer" but you cannot become abstract jargon.
- The fresh L3 synastry pass ran at level 3, l1_l3 register. The reading came out at 11,670 words across four passes. The NotebookLM study guide that followed is traditional Vedic in voice — it explains Ashtakoota, Bhakoot Dosha, Parihara, Darakaraka, and the 7th Bhava in plain language.

## NotebookLM Is The Last Mile, Not The Source Of Truth

- NotebookLM receives curated markdown sources only. Raw engine dumps are never uploaded. The source pack is recipient-facing: a dossier, deterministic partner anchors, mode policy, answered context, audio brief, study guide brief, video brief, slide deck briefs, Vimshottari timeline brief, orientation anchors, somatic anchors, and boundaries.
- Asset generation is async and flaky. Multiple artifacts timed out across runs. The download-only recovery path lets you pull completed artifacts later without re-uploading sources. This is not a bug to fix. It is the operational model.
- The L3 synastry NotebookLM run produced: a 70MB audio deep-dive, a 9.2MB video brief, a study guide, a briefing doc, a quiz, flashcards, a mind map, and three recovered slide decks. All of this was generated from sources that passed the deterministic gate and chain audit first.

## 2026-06-14 Workflow Repair Pass

- Gate truth was repaired in the asset factory: generated manifests now block when unapproved somatic or creative-oracle engines are present instead of reporting a false pass.
- Current Witnessalchemist/Harshita asset inputs were sanitized to approved deterministic layers only, then the three local packs were regenerated from clean source packs.
- The chain audit now returns zero blockers across `harshita`, `witnessalchemist`, and `witnessalchemist-harshita-synastry`.
- NotebookLM download-only recovery now falls back to distinct completed artifacts when slide deck titles do not contain the expected `detailed`, `preview`, or `vimshottari` labels.
- The synastry manifest now records ready outputs for audio, video, study guide, briefing doc, detailed slide deck, preview slide deck, Vimshottari timeline slide deck, quiz, flashcards, and mind map.

## The Commit History Is The Architecture Story

- The system was built in layers starting from vectorized grounding, section interpretation, and rate-limited NVIDIA batch processing. Then the hybrid asset factory and NotebookLM integration. Then the deterministic gates. Then the mode intake contract. Then synastry partner anchors. Then visual documentation. Then the dyad/knowledge integration pass.
- Four commits are purely fix commits for real production bugs: vector quoting, deterministic facts gate, Panchanga scope separation, and synastry anchor requirements.
- The final pass wove Aletheios/Pichet and knowledge/routing references into every visual architecture doc because the original suite only showed the newer section-orchestration and asset pipeline layers.

---

## One-Sentence Takeaway

You cannot generate safe NotebookLM artifacts downstream if your upstream LLM pipeline is allowed to silently transfer one person's Moon data to another person's chart.

## If You Only Have 2 Minutes

- Every gate in this system was built because a real failure happened first, not because someone anticipated a risk.
- The source pack is the security boundary between deterministic engine facts and NotebookLM. Nothing crosses it that has not been audited.
- The mode intake gate prints the exact questions to ask and blocks if they are not answered. It does not guess relationship type.
- NVIDIA BGE-M3 embeddings feed every grounded task. The wrangler vector quoting bug was a genuine production issue.
- Aletheios and Pichet predate the section orchestration and asset pipeline. They remain the original witness architecture.
- L1-L3 is a fundamentally different reading and asset product than L4-L5, not just a token budget difference.
- NotebookLM is async and flaky by design. The download-only recovery path is part of the architecture, not a workaround.

## References and Rabbit Holes

- **NVIDIA BGE-M3** — 1024-dimension embedding model used for all Vectorize queries. Open license. 8192 token context window.
- **Cloudflare Vectorize** — The `witness-wisdom-corpus` index stores wisdom passages and per-subject engine data. Queried via wrangler CLI.
- **NotebookLM CLI** — The `notebooklm` Python CLI controls notebook creation, source upload, artifact generation, and download. Supports JSON output for scripting.
- **Aletheios/Pichet Dyad Engine** — Located in `src/inference/dyad-engine.ts`. Orchestrates parallel agent calls with tier-gated synthesis.
- **Clifford-Gated Memory** — Located in `src/agents/memory.ts`. Five memory categories gated by Clifford algebra depth.
- **Knowledge Store** — Located in `src/knowledge/domain-loader.ts`. Loads YAML knowledge domains into in-memory query structures.
- **Routing Engine** — Located in `src/knowledge/routing-engine.ts`. Evaluates engine/state/temporal triggers against user state.
- **Mode Policy Registry** — Located in `scripts/asset-mode-policy.ts`. Single source of truth for six relationship modes across two register bands.
- **Chain Audit** — Located in `scripts/audit-asset-chain.ts`. Read-only audit across engine data, interpretation, source pack, and manifest.
- **Premium Asset Factory** — Located in `scripts/premium-asset-factory.ts`. Generates local assets and orchestrates NotebookLM.
- **Integrated Reading Runner** — Located in `scripts/integratedreading-mode.ts`. Multi-pass mode runner with L1-L5 consciousness level resolution.
