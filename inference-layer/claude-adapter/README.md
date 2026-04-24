# Claude Adapter — Witness Agents for Claude Code
# Integration via .claude/skills/ and .claude/agents/

## How to Use

Clone or symlink the witness-agents repo, then reference from your Claude project:

```bash
# In your project's .claude/ directory
ln -s /path/to/witness-agents/inference-layer/claude-adapter/skills/* .claude/skills/
ln -s /path/to/witness-agents/inference-layer/claude-adapter/agents/* .claude/agents/
```

Or add to `.claude/settings.json`:
```json
{
  "skills": {
    "witness-agents": {
      "path": "/path/to/witness-agents/inference-layer/claude-adapter/skills/witness-agent-skill"
    }
  }
}
```

## What Claude Gets

When activated, Claude operates with the Aletheios-Pichet dyad as an interpretation layer.
Selemene Engine results are routed through the dyad before being presented to the user.

## Files

- `skills/witness-agent-skill/SKILL.md` — Claude skill definition (to be created)
- `agents/aletheios.md` — Aletheios agent definition for Claude
- `agents/pichet.md` — Pichet agent definition for Claude
