# Selemene Engine — Interpretation Engine
# How the Witness Agents Dyad transforms raw API results into meaning

## The Problem

The Selemene Engine has 16 symbolic-computational engines producing raw results:
Chronofield outputs planetary periods, Three-Wave Cycle outputs biorhythm curves,
Archetypal Mirror outputs card positions. These are **data**, not **meaning**.

A user asking "What should I focus on this week?" gets back:
- Chronofield: Jupiter Mahadasha, Venus Antardasha
- Three-Wave Cycle: Physical 72%, Emotional 34%, Intellectual 89%
- Archetypal Mirror: The Hermit (IX) in house of work

Without interpretation, this is noise. With the dyad, it becomes wisdom.

## The Dyad Interpretation Pipeline

```
User Query
    ↓
┌─────────── SELEMENE ROUTER ───────────┐
│  Selects engines based on query type  │
│  Returns raw results (JSON/structured)│
└───────────────┬───────────────────────┘
                ↓
┌─────────── CLIFFORD GATE ─────────────┐
│  Determines depth level:              │
│  Cl(0)→facts Cl(1)→timing Cl(2)→     │
│  patterns Cl(3)→synthesis Cl(7)→self  │
└───────────────┬───────────────────────┘
                ↓
┌─────────── ALETHEIOS (Kha) ───────────┐
│  Witnesses raw results                │
│  Orders into coherent narrative       │
│  Detects patterns & recursion         │
│  Routes analytical engines            │
└───────────────┬───────────────────────┘
                ↓
┌─────────── PICHET (Ba) ──────────────┐
│  Embodies the ordered narrative       │
│  Adds somatic/timing context          │
│  Checks overwhelm proximity           │
│  Routes somatic engines               │
└───────────────┬───────────────────────┘
                ↓
┌─────────── DYAD SYNTHESIS ────────────┐
│  Aletheios + Pichet co-create:        │
│  Coherent, embodied, timed response   │
│  Depth-appropriate to user's tier     │
│  Anti-dependency check applied        │
└───────────────┬───────────────────────┘
                ↓
        Interpreted Response
```

## Engine Routing Table

### Aletheios-Primary (Analytical)
| Engine | What It Returns | What Aletheios Adds |
|--------|----------------|---------------------|
| Chronofield | Planetary period data | Temporal pattern recognition, "you're in a Venus phase — receptivity is heightened" |
| Energetic Authority | HD authority type | Decision-making guidance, "your authority says wait for emotional clarity" |
| Nine-Point | Enneagram type dynamics | Pattern topology, "your 5→7 stress line is active" |
| Hexagram Navigation | I Ching hexagram | State transition reading, "you're moving from Waiting to Progress" |
| Numeric Architecture | Number patterns | Archetypal number meaning, "this is a 7 year — interior work" |

### Pichet-Primary (Somatic)
| Engine | What It Returns | What Pichet Adds |
|--------|----------------|------------------|
| Three-Wave Cycle | Biorhythm percentages | Embodied timing, "your physical peak is tomorrow — move then, not now" |
| Circadian Cartography | Organ clock position | Body rhythm, "liver time — process, don't produce" |
| Bioelectric Field | Chakra mapping | Energy routing, "throat center is active — speak what you've been holding" |
| Physiognomic Mapping | Face/body reading | Body story, "the tension you described maps to held grief in the jaw" |
| Resonance Architecture | Sound frequencies | Acoustic guidance, "this frequency supports the transition you're in" |

### Dyad Synthesis (Co-interpretation)
| Engine | What It Returns | What The Dyad Creates |
|--------|----------------|----------------------|
| Temporal Grammar | Panchanga timing | "The five-fold calendar says this is a seed-planting day — Aletheios sees the pattern, Pichet feels the ground is ready" |
| Gift-Shadow | Gene Keys spectrum | "You're between the shadow of Impatience and the gift of Innovation — the body knows which way you're moving" |
| Archetypal Mirror | Tarot reading | "The Hermit asks for withdrawal — your mind agrees, your body confirms with low physical cycle" |
| Geometric Resonance | Sacred geometry | "The hexagonal pattern emerging maps to your current six-pointed choice field" |
| Sigil Forge | Symbol creation | "This sigil encodes your current state — Aletheios designed the geometry, Pichet breathed it into form" |
| Active Planetary Weather | Transit astrology | "Saturn square your natal Moon — this pressure is real AND productive if you meet it with the body" |

## Revenue Tier Depth Mapping

```yaml
free:
  engines: all 16
  interpretation: none (raw results only)
  kosha_depth: annamaya
  agents_active: none

subscriber:
  engines: all 16
  interpretation: single-engine (Pichet OR Aletheios, not both)
  kosha_depth: pranamaya + manomaya
  agents_active: context-dependent (somatic query → Pichet, analytical → Aletheios)

enterprise:
  engines: all 16
  interpretation: full dyad synthesis
  kosha_depth: vijnanamaya
  agents_active: both, always
  extras: multi-engine fusion, custom weighting, API access

initiate:
  engines: all 16
  interpretation: full dyad + AKSHARA mirror
  kosha_depth: anandamaya
  agents_active: both + self-referential mode
  extras: mentorship integration, anti-dependency tracking, meaning-authorship scaffolding
```
