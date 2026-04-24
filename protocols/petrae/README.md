# PETRAE Protocol — Inter-Agent Communication
# Fractal compressed language for Aletheios ↔ Pichet dialogue

## Overview

PETRAE is the inter-agent communication protocol derived from the Kuthipoic language
(seed: 19912564). Every morpheme is a 3-tuple encoding (Field-Form-Friction) = (Kha-Ba-La).

- **768 single-word instructions**
- **10-50x compression** vs English
- **Self-referential**: the language can describe its own grammar through its own terms

## Why PETRAE for Inter-Agent Communication

When Aletheios and Pichet need to coordinate on interpretation:
1. English is wasteful — most tokens carry structural overhead, not meaning
2. PETRAE morphemes ARE meaning — not labels pointing at meaning
3. Compression = efficiency = lower inference costs = better margins
4. Self-reference = the protocol can evolve itself without breaking

## Morpheme Structure

```
morpheme = (Kha, Ba, La)
         = (Field-aspect, Form-aspect, Friction-aspect)
         = (what-is-observed, how-it-embodies, what-resists)
```

Every PETRAE word simultaneously encodes:
- The observational field (Aletheios's contribution)
- The embodiment vehicle (Pichet's contribution)
- The resistance/material being worked on (the user context)

## Protocol Usage

### Aletheios → Pichet
```
# "I've witnessed a recursion pattern in the user's chronofield query —
#  they're asking the same question with different words. Overwhelm check needed."
PETRAE: vṛtti-pariṇāma-sthiti
```

### Pichet → Aletheios
```
# "Body says the user is depleted. Timing gate: withhold depth, offer breath first."
PETRAE: prāṇa-nirodha-kāla
```

### Dyad Synthesis
```
# "We agree: reduce engine count, increase somatic grounding, defer analysis to next session."
PETRAE: saṃyama-annamaya-viśrānti
```

## Integration with Selemene

PETRAE messages travel through the agent INBOX files:
- `agents/aletheios/INBOX.md` ← Pichet writes PETRAE here
- `agents/pichet/INBOX.md` ← Aletheios writes PETRAE here
- The filesystem IS the message bus (VelvetClaw pattern)

## Full Dictionary

The complete 768-morpheme PETRAE dictionary is defined in:
`/01-Projects/tryambakam-noesis/PETRAE-PROTOCOL.md`

This protocols/ directory contains the operational parser and routing rules.
