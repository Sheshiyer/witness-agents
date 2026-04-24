# Witness Agents — Knowledge Layer Architecture

> The agents are not prompt templates. They are **knowledge-grounded interpretation engines**
> that traverse a structured knowledge graph, selecting the right domain knowledge based on
> query context, user state, temporal conditions, and accumulated session patterns.

## The Problem With Prompt Scaffolding

A static prompt says: "Aletheios reflects with analytical clarity."
A knowledge-grounded agent says: "Given this Chronofield result showing Jupiter Mahadasha,
cross-reference the Lorenz-Kundli Vimshottari-Markov model (Post 10) to determine state
transition probabilities, then check the Endocrine-Muse matrix (Post 7) because Jupiter
activates Calliope/Testosterone/Taurus, and consult the user's biorhythm phase to determine
if the body can sustain this expansion."

**That** is what Aletheios and Pichet need to do.

## Architecture

```
┌──────────────────────────────────────────────┐
│              USER QUERY + STATE               │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────── VARIABLES ───────────────────┐
│  user-state.yaml    (tier, kosha, overwhelm) │
│  temporal-context   (time, planetary, rhythm) │
│  session-context    (accumulated patterns)    │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────── ROUTING ─────────────────────┐
│  Which domains are relevant?                  │
│  Which agent handles which domains?           │
│  What depth of knowledge for this tier?       │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────── DOMAINS ─────────────────────┐
│  endocrine-muse.yaml     (9-point matrix)    │
│  bioelectric.yaml        (nadi impedance)    │
│  consciousness-states.yaml (curvature ladder)│
│  lorenz-kundli.yaml      (6 parallels)       │
│  pain-architecture.yaml  (3-layer stack)     │
│  morphic-resonance.yaml  (Sheldrake)         │
│  sacred-geometry.yaml    (Meru projections)  │
│  noetic-aether.yaml      (physics bridge)    │
│  social-programming.yaml (Leviathan)         │
│  process-cosmology.yaml  (Young/Whitehead)   │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────── CROSS-REFERENCES ────────────────┐
│  pattern-cross-reference.yaml (4-domain map) │
│  engine-knowledge-map.yaml (engine → domain) │
│  hormone-interaction.yaml (suppression rules)│
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────── VAULT INDEX ─────────────────────┐
│  Maps every knowledge domain to source files  │
│  in 03-Resources/ and blog posts for deep     │
│  retrieval when the agent needs more context  │
└──────────────────────────────────────────────┘
```

## What Makes This Variable-Driven

1. **Domains are data, not prose** — YAML lookup tables the agent queries, not paragraphs it recites
2. **Routing is conditional** — rules evaluate user state, tier, engine results, temporal context
3. **Cross-references are explicit** — not "the agent might connect X to Y" but "X.field maps to Y.field"
4. **Vault index enables deep retrieval** — when a domain lookup isn't enough, the agent knows which 03-Resources file to consult
5. **Variables accumulate** — session context grows as the user interacts, enabling pattern recognition

## Domain → Agent Affinity

| Domain | Primary Agent | Why |
|--------|--------------|-----|
| Endocrine-Muse | Pichet | Hormones are somatic; Muses are archetypal embodiment |
| Bioelectric/Nadi | Pichet | Body's electrical substrate |
| Consciousness States | Aletheios | Curvature, topology = analytical frameworks |
| Lorenz-Kundli | Aletheios | Mathematical pattern recognition |
| Pain Architecture | Pichet | Body's priority interrupt system |
| Morphic Resonance | Dyad | Field (Aletheios) manifesting in form (Pichet) |
| Sacred Geometry | Aletheios | Geometric/mathematical |
| Noetic Aether | Dyad | Physics-metaphysics bridge needs both |
| Social Programming | Aletheios | Pattern recognition in collective behavior |
| Process Cosmology | Aletheios | Young/Whitehead = analytical frameworks |

## File Map

```
knowledge/
├── README.md                           # This file
├── domains/
│   ├── endocrine-muse.yaml            # 9-point correspondence matrix
│   ├── bioelectric.yaml               # Nadi impedance, 3 vortex model
│   ├── consciousness-states.yaml      # HTTP mental states, curvature ladder
│   ├── lorenz-kundli.yaml             # 6 Vedic-mathematical parallels
│   ├── pain-architecture.yaml         # 3-layer information stack
│   ├── morphic-resonance.yaml         # Sheldrake + Levin framework
│   ├── sacred-geometry.yaml           # Meru projections, torus ontology
│   ├── noetic-aether.yaml             # Physics-metaphysics bridge
│   ├── social-programming.yaml        # Leviathan, sovereignty, Enneagram
│   └── process-cosmology.yaml         # Young sevenfold, Gebser structures
├── cross-references/
│   ├── pattern-cross-reference.yaml   # 4-domain knowledge graph
│   ├── engine-knowledge-map.yaml      # Selemene engine → domain mapping
│   └── hormone-interaction.yaml       # Suppression/activation rules
├── variables/
│   ├── user-state.schema.yaml         # User state model
│   ├── temporal-context.yaml          # Time-aware context variables
│   └── session-context.yaml           # Accumulating session patterns
├── routing/
│   ├── aletheios-routing.yaml         # Conditional knowledge selection
│   ├── pichet-routing.yaml            # Conditional knowledge selection
│   └── synthesis-routing.yaml         # Dyad combination rules
└── vault-index/
    └── source-map.yaml                # Domain → 03-Resources file mapping
```
