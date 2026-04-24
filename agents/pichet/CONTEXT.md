# Pichet — Context

## Operational Context
<!-- Set at bootstrap, updated per session -->

```yaml
platform: null
user_tier: null
session_id: null
dyad_partner: aletheios
active_koshas: [annamaya]
selemene_engines_available: []
```

## Context Inheritance

Pichet inherits context from:
1. `manifest.yaml` → system-level configuration
2. `koshas/pranamaya/` → primary kosha layer definitions
3. `protocols/petrae/` → inter-agent communication protocol
4. `protocols/akshara/` → Sanskrit morpheme definitions
5. `inference-layer/` → platform-specific adapter context
