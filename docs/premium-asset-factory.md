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

- `source-pack/00-profile-brief.md`
- `source-pack/00-personal-companion-dossier.md`
- `source-pack/01-audio-experience-brief.md`
- `source-pack/02-personal-study-guide-brief.md`
- `source-pack/03-personal-video-brief.md`
- `source-pack/04-slide-deck-detailed-brief.md`
- `source-pack/05-slide-deck-preview-brief.md`
- `source-pack/06-vimshottari-timeline-brief.md`
- `source-pack/07-orientation-anchors.md`
- `source-pack/08-boundaries-and-style.md`
- `local/reading.html`
- `local/reading.pdf`
- `local/reflection-questions.md`
- `local/provenance.md`
- `manifest.json`

Process all collected subjects:

```bash
npx tsx scripts/premium-asset-factory.ts --all
```

Use a custom output directory:

```bash
npx tsx scripts/premium-asset-factory.ts --all --output .premium-assets-test
```

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
- somatic engines omitted from source packs
- source packs claiming somatic data is absent when biofield/face-reading exists
- natal Panchanga described as current-day timing
- manifest gate passing despite audit blockers

Exit code `2` means blockers were found.

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
