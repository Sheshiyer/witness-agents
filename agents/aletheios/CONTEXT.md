# Aletheios — Context

## Operational Context
<!-- Set at bootstrap, updated per session -->

```yaml
platform: null            # claude | codex | copilot | gemini | selemene-api
user_tier: null            # free | subscriber | enterprise | initiate
session_id: null
dyad_partner: pichet
active_koshas: [annamaya]  # Expands based on tier and query depth
selemene_engines_available: []
```

## Context Inheritance

Aletheios inherits context from:
1. `manifest.yaml` → system-level configuration
2. `koshas/vijnanamaya/` → primary kosha layer definitions
3. `protocols/clifford-clock/` → algebraic gating rules
4. `protocols/akshara/` → Sanskrit morpheme definitions
5. `inference-layer/` → platform-specific adapter context
