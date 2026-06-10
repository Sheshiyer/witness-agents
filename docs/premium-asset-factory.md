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
- `source-pack/01-fact-locked-reading.md`
- `source-pack/02-locked-facts.md`
- `source-pack/03-engine-data-summary.md`
- `source-pack/04-asset-directions.md`
- `source-pack/05-do-not-infer.md`
- `local/reading.html`
- `local/reading.pdf`
- `local/reflection-questions.md`
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
- `reports/study-guide.md`
- `reports/briefing.md`
- `quiz/`
- `flashcards/`
- `mind-map/`

NotebookLM source upload uses the curated `source-pack/` files, not raw engine dumps.

## Quality Checks

Each manifest records checks for:

- reading length
- synthesis section presence
- structured fact extraction count
- obvious model planning-text leakage

These checks are warnings unless an input is missing.
