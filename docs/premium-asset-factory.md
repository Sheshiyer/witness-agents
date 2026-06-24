# Premium Asset Factory

Hybrid asset pipeline for per-person premium reading packs.

## Inputs

- `.batch-inputs/<person>.json`: Selemene engine output.
- `.batch-outputs/<person>.md`: Section-by-section interpretation output.

## Local Outputs

Run:

```bash
npx tsx scripts/premium-asset-factory.ts --person mohan-kumar-m-g
```

Outputs are written to `.premium-assets/<person>/`:

- `source-pack/00-personal-companion-dossier.md`
- `source-pack/00a-partner-deterministic-anchors.md` (synastry/composite only)
- `source-pack/00b-mode-register-policy.md`
- `source-pack/00c-answered-mode-context.md`
- `source-pack/01-audio-experience-brief.md`
- `source-pack/02-personal-study-guide-brief.md`
- `source-pack/03-personal-video-brief.md`
- `source-pack/04-slide-deck-detailed-brief.md`
- `source-pack/05-slide-deck-preview-brief.md`
- `source-pack/06-vimshottari-timeline-brief.md`
- `source-pack/07-orientation-anchors.md`
- `source-pack/08-somatic-anchor.md` (only when the somatic layer is roadmap-approved and somatic facts exist)
- `source-pack/09-boundaries-and-style.md`
- `local/reading.html`
- `local/reading.pdf`
- `local/reflection-questions.md`
- `local/provenance.md`
- `manifest.json`

The factory clears stale markdown files in `source-pack/` before each regeneration. This prevents obsolete sources from crossing the NotebookLM boundary after filenames or layer gates change.

Process all collected subjects:

```bash
npx tsx scripts/premium-asset-factory.ts --all
```

Use a custom output directory:

```bash
npx tsx scripts/premium-asset-factory.ts --all --output .premium-assets-test
```

Select relationship mode and register level:

```bash
npx tsx scripts/premium-asset-factory.ts \
  --person witnessalchemist-harshita-synastry \
  --mode partner-relationship \
  --level 4 \
  --context partner-context.json
```

Supported modes:

- `solo`
- `married`
- `partner-relationship`
- `general-synastry`
- `family`
- `business`

Levels `1-3` use the accessible/traditional register. Levels `4-5` use the more architectural register. The mode and register are written into `source-pack/00b-mode-register-policy.md` and shape NotebookLM audio, video, report, and deck prompts.

Every mode has required intake fields. If the required context is missing, generation stops and prints the questions to ask. Example `partner-context.json`:

```json
{
  "relationship_status": "long-term romantic relationship, not assumed married",
  "commitment_status": "current partnership; marriage should not be assumed unless explicitly discussed",
  "primary_question": "understand relational rhythm, communication, timing, and anti-dependency without prediction"
}
```

The same gate exists upstream in the integrated reading runner:

```bash
node --import tsx scripts/integratedreading-mode.ts \
  --mode partner-synastry \
  --subjects-dir ./subjects \
  --output-dir ./reading-output \
  --level 4 \
  --mode-context partner-context.json
```

This prevents the reading from starting until the operator has answered the mode-specific questions. Downstream asset packs inherit the answered context as `source-pack/00c-answered-mode-context.md`.

## NotebookLM Outputs

NotebookLM is optional and only runs when explicitly enabled:

```bash
npx tsx scripts/premium-asset-factory.ts --person mohan-kumar-m-g --notebooklm
```

Expected NotebookLM assets:

- `audio/deep-dive-long.mp3`
- `video/video-brief.mp4`
- `slide-decks/detailed.pdf`
- `slide-decks/preview.pdf`
- `slide-decks/vimshottari-timeline.pdf`
- `reports/study-guide.md`
- `reports/briefing.md`
- `quiz/`
- `flashcards/`
- `mind-map/`

NotebookLM source upload uses curated, recipient-facing `source-pack/` files, not raw engine dumps or Witness/Selemene implementation material. Technical provenance is kept local in `local/provenance.md` and `manifest.json`.

Recover completed artifacts from an existing notebook without re-uploading sources:

```bash
npx tsx scripts/premium-asset-factory.ts \
  --person witnessalchemist-harshita-synastry \
  --inputDir .asset-run-inputs \
  --readingDir .asset-run-readings \
  --outputDir .premium-assets-witness-harshita \
  --mode partner-relationship \
  --level 3 \
  --context partner-context.json \
  --notebooklm \
  --download-only \
  --notebook-id <notebook-id>
```

Download-only recovery first tries title-specific artifact matches. If NotebookLM has completed artifacts whose titles do not contain the expected words like `detailed`, `preview`, or `vimshottari`, recovery falls back to distinct completed artifacts of the same type rather than marking the asset pending.

## Quality Checks

Each manifest records checks for:

- reading length
- synthesis section presence
- structured fact extraction count
- obvious model planning-text leakage

These checks are warnings unless an input is missing.

## Chain Consistency Audit

Run the read-only audit before sending packs to NotebookLM:

```bash
npx tsx scripts/audit-asset-chain.ts \
  --inputDir .asset-run-inputs \
  --readingDir .asset-run-readings \
  --assetDir .premium-assets-witness-harshita \
  --out .asset-chain-audit.json
```

The audit checks the chain from deterministic engine data to interpretation text to source pack and manifest. It blocks on:

- synastry/composite handoffs without deterministic partner facts
- nakshatra drift against locked natal Panchanga
- somatic engines present while `SOMATIC_LAYER_APPROVED` is false
- creative-oracle engines present while `CREATIVE_ORACLE_LAYER_APPROVED` is false
- somatic engines omitted from source packs
- source packs claiming somatic data is absent when biofield/face-reading exists
- natal Panchanga described as current-day timing
- manifest gate passing despite audit blockers

Exit code `2` means blockers were found.

Do not bypass the layer blockers by flipping roadmap gates. Either remove unapproved somatic/oracle engines from the asset input set, or complete and explicitly approve the corresponding live input flow first. NotebookLM upload must only run after this audit returns zero blockers.

## Synastry Inputs

Synastry/composite packs must use deterministic partner anchors, not only generated synastry prose. The accepted input shape is:

```json
{
  "kind": "synastry_partners",
  "relationship_id": "witnessalchemist-harshita-synastry",
  "relationship_name": "Witnessalchemist x Harshita Synastry",
  "synastry_partners": [
    { "id": "witnessalchemist", "name": "Witnessalchemist", "engines": [] },
    { "id": "harshita", "name": "Harshita", "engines": [] }
  ]
}
```

The asset factory extracts each partner's deterministic anchors and writes `source-pack/00a-partner-deterministic-anchors.md`. Generated synastry prose is treated as narrative texture only; partner chart facts in that prose are not authoritative.
