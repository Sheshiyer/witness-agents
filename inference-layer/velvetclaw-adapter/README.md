# VelvetClaw Adapter — Witness Agents as VelvetClaw-compatible Org
# Drop-in compatibility with the VelvetClaw bootstrap

## How to Use

The witness-agents `manifest.yaml` is VelvetClaw-compatible.
Any system that reads VelvetClaw manifests can bootstrap witness-agents:

```bash
# If using clawhub or similar VelvetClaw bootstrap
clawhub install --manifest /path/to/witness-agents/manifest.yaml
```

## Mapping

| VelvetClaw Concept | Witness Agents Equivalent |
|-------------------|--------------------------|
| Organization | Dyad (Aletheios + Pichet) |
| Department | Kosha Layer |
| Agent | Aletheios or Pichet |
| 12 State Files | 10 State Files (same pattern) |
| manifest.yaml | manifest.yaml (compatible) |
| bootstrap.yaml | prana_prathistapana.sh |
| Loop runner | Selemene Engine query cycle |

## Compatibility Notes

- VelvetClaw expects `agents/{name}/` directories with state files → ✅ present
- VelvetClaw expects `manifest.yaml` at root → ✅ present
- VelvetClaw expects departments → mapped to koshas in manifest
- VelvetClaw uses YAML state files → witness-agents uses YAML + Markdown (compatible)
