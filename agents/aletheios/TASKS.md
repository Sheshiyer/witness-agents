# Aletheios — Tasks

## Current Queue
<!-- Tasks are populated by the Selemene Engine routing layer -->

## Task Schema

```yaml
task:
  id: string
  source: selemene | pichet | system
  engine: string          # Which Selemene engine generated this
  kosha_depth: string     # Which Clifford layer is active
  user_state: string      # Current user state assessment
  action: interpret | route | synthesize | gate | defer_to_pichet
  status: pending | active | complete | deferred
  output_to: user | pichet | selemene | memory
```
