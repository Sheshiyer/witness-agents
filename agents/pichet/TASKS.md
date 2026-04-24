# Pichet — Tasks

## Current Queue
<!-- Tasks are populated by the Selemene Engine routing layer -->

## Task Schema

```yaml
task:
  id: string
  source: selemene | aletheios | system
  engine: string
  kosha_depth: string
  user_vitality: string      # Current user vitality assessment
  action: embody | vitalize | time | breathe | defer_to_aletheios
  status: pending | active | complete | deferred
  output_to: user | aletheios | selemene | memory
```
