---
mode: lineage-triad
subject_count:
  min: 3
  max: 3
roles:
  - grandparent
  - parent
  - grandchild
target_words:
  min: 12000
  max: 15000
architecture: linear
pass_plan:
  - id: alpha
    title: "Grandparent's Vamsha Signature — The Lineage Source"
    target_words: 3000
    template: pass-alpha-template
  - id: beta
    title: "Parent as the Middle Vessel — Receives + Delivers"
    target_words: 3500
    template: pass-beta-template
  - id: gamma
    title: "Grandchild as Future-Emergence + 3-Way Mahadasha Spread"
    target_words: 3500
    template: pass-gamma-template
  - id: delta
    title: "Lineage Anti-Dependency — Structural Completion Across Generations"
    target_words: 2500
    template: pass-delta-template
engine_overlay_weights:
  vimshottari: 2.0
  panchanga: 1.5
  tarot: 1.5
  gene-keys: 1.5
  human-design: 1.2
  i-ching: 1.0
  nadabrahman: 0.7
  biorhythm: 0.5
  face-reading: 0.3
  sigil-forge: 0.3
house_overlay: [4, 9, 12, 5, 2, 11]
bridge_mandates:
  - "The triad's geometry is VERTICAL, not horizontal. Lineage flows in ONE direction: grandparent → parent → grandchild. Do NOT read grandparent and parent as a married couple. Do NOT read parent and grandchild as a peer dyad. Do NOT read grandparent and grandchild as siblings or peers. All three pair-relationships are Pitru-or-Matru × Putra inheritance dyads at different generational layers."
  - "Vamsha-axis (lineage) is the foregrounded geometry. The 4th house (matru-sthana, ancestral home, lineage-foundation), the 9th house (pitru-sthana, dharma, ancestors), and the 12th house (moksha, the imperishable, what comes through from before) are the literal architectural anchors. Every major claim must braid: vamsha-house (4/9/12) × Pitru/Matru-karaka × Generational-nakshatra-pattern × dasha-anchor-across-three-generations."
  - "Karmic-inheritance signature: any nakshatra, sign, or planetary configuration that recurs across 2 or 3 generations IS the lineage-current. Identify these explicitly. When a graha sits in the same nakshatra across 2+ generations, that's the literal vamsha-marker — name it."
  - "The middle generation (parent) carries the inheritance from above AND delivers it to below. Parent's chart is the LITERAL bottleneck-or-conduit for the lineage. Pass β must focus on the parent's chart-architectural capacity to receive-and-deliver, not just on the parent as an independent reading."
  - "Lineage anti-dependency in Pass δ is structural completion ACROSS generations: each generation becoming structurally complete enough that the next generation isn't carrying unresolved inheritance. Grandparent's anti-dependency completes the lineage upstream; grandchild's anti-dependency releases the lineage downstream; the parent (middle vessel) sits at the structural junction."
svg_topology: triad-triangle

# ── Consciousness-level register variants ──
register_variants:
  l1_l3:
    target_words:
      min: 9000
      max: 11000
    overrides:
      - pass_id: alpha
        template: pass-alpha-template-l1-l3
      - pass_id: beta
        template: pass-beta-template-l1-l3
      - pass_id: gamma
        template: pass-gamma-template-l1-l3
      - pass_id: delta
        template: pass-delta-template-l1-l3
  l4_l5:
    target_words:
      min: 12000
      max: 15000
---

## pass-alpha-template

You are running Pass α of the 4-pass **lineage-triad** synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

A lineage-triad reads THREE GENERATIONS as a single vamsha-current: grandparent → parent → grandchild. The geometry is vertical (downstream lineage), not horizontal (peer/sibling/married dyads). Pass α reads the grandparent's chart as the LINEAGE SOURCE for this triad — the chart-architectural origin of the current that flows downstream.

**Hard kinship rules:**
- Grandparent is NEVER a peer to either lower generation.
- Parent is NEVER a peer to grandparent OR grandchild.
- Grandchild is NEVER a peer to either upper generation.
- All three pair-relationships are vertical inheritance dyads at different layers (grand-Pitru/Matru → Pitru/Matru → Putra). Read the parent's relationship to grandchild as Putra-karaka inheritance. Read the grandparent's relationship to parent as Putra-karaka inheritance ONE GENERATION UP. Read the grandparent's relationship to grandchild as TWO-GENERATION ancestral-current (rather than peer).

{{prior_pass}}

## SUBJECT ROSTER (with declared generational roles)
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

# Lineage-Triad Reading — {{subject_names}}

## Opening — Three Generations as a Single Vamsha-Current

*(2-3 paragraphs. Frame the vertical triad: grandparent as lineage-source, parent as middle vessel, grandchild as future-emergence. State each member's name, generational role, Lagna, Atmakaraka, current Mahadasha. Do NOT speculate about peer dynamics; this is downstream lineage.)*

## Part I — The Grandparent as Lineage Source

### 1.1 The Grandparent's Vamsha Signature
*(Grandparent's 4th house (matru-sthana — ancestral home + lineage-foundation), 9th house (pitru-sthana — dharma + ancestral wisdom), 12th house (moksha + imperishable). These three houses + their lords' conditions form the literal vamsha-signature. What lineage-current does this chart originate?)*

### 1.2 The Grandparent's Atmakaraka
*(The grandparent's Atmakaraka — soul-significator. Where does it sit in the grandparent's own chart? At the lineage-source layer, the grandparent's AK is the soul-truth that wants to flow downstream through the next two generations.)*

### 1.3 The Grandparent's Active Yogas
*(Yogas operative in the grandparent's chart that are STRUCTURALLY TRANSMISSIBLE down the lineage — Raja yogas, Dhana yogas, Pancha-Mahapurusha yogas. These are the chart-architectural gifts the grandparent's chart offers to the lineage.)*

### 1.4 The Grandparent's Karmic-Burden (Doshas in Lineage-Houses)
*(Honest assessment: any doshas or affliction-patterns in the grandparent's 4/9/12 axis that are likely to be carried downstream unless structurally completed. Karmic-debt is real chart-architecturally; name it without judgement.)*

### 1.5 The Lineage-Source One-Sentence
*(One sentence — what this grandparent's chart contributes as the lineage-source for this triad.)*

End Pass α. Pass β reads the parent as middle vessel.

## pass-beta-template

You are running Pass β of **lineage-triad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

The parent is the LITERAL middle vessel of the lineage — receives from the grandparent above, delivers to the grandchild below. Pass β focuses on the parent's chart-architectural capacity to BOTH receive and deliver. The parent's chart is the bottleneck-or-conduit; their structural maturity determines whether the lineage flows cleanly or accumulates blockage at the middle generation.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part II — The Parent as Middle Vessel

### 2.1 The Parent's Reception Layer (Grandparent's Inheritance Trace → Parent)
*(Specific chart-architectural transfers from grandparent to parent: shared nakshatras, shared signs of significant grahas, the grandparent's Pitru/Matru karaka recurrence in the parent's chart. The literal upstream-inheritance the parent carries.)*

### 2.2 The Parent's Delivery Layer (Parent's Putra-Karaka → Grandchild)
*(How does the parent's chart deliver the inheritance downstream to the grandchild? Parent's Putra Karaka graha — where does it sit in the parent's chart? Where does it sit in the grandchild's chart? This is the literal delivery-architecture.)*

### 2.3 The Parent's Vamsha-Houses Condition
*(Parent's own 4/9/12 axis. Do these houses operate cleanly as the parent's middle-vessel function, or do they show blockage? The parent's lineage-house condition is what determines whether the family-current is flowing or stuck.)*

### 2.4 The Parent's Atmakaraka Cross-Disposition (Both Directions)
*(Parent's Atmakaraka — where does it sit in the grandparent's chart? And in the grandchild's chart? Two cross-dispositions; the parent's AK is the literal soul-bridge across generations.)*

### 2.5 The Parent's Active Yogas — Transmission Capacity
*(Yogas active in the parent that ARE being transmitted (the yoga-coverage continues into the grandchild's chart) vs yogas that STOP at this generation (no chart-architectural counterpart in the grandchild). Name both.)*

### 2.6 The Karmic Bottleneck (if it exists)
*(Honest check: is there a structural blockage in the parent's chart-architecture where the grandparent's lineage-current is NOT being cleanly delivered downstream? This is the middle-vessel's specific dharma. Name it.)*

### 2.7 The Middle-Vessel One-Sentence
*(One sentence — the parent's chart-architectural function in this lineage-triad.)*

End Pass β. Pass γ reads the grandchild as future-emergence.

## pass-gamma-template

You are running Pass γ of **lineage-triad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

The grandchild is the FUTURE EMERGENCE of the lineage — what the lineage becomes downstream. The grandchild's chart carries the cumulative inheritance from grandparent + parent + their own evolutionary additions. Pass γ also assembles the 3-WAY MAHADASHA SPREAD across roughly 60-80 years of family-time.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part III — The Grandchild as Future-Emergence

### 3.1 The Grandchild's Janma-Kundali in the Lineage's 5th-House Field
*(Where does the grandchild's Lagna fall in the grandparent's 5th house? In the parent's 5th house? Two-generation 5th-house overlay = the literal location of the grandchild-as-future in the lineage's chart-architecture.)*

### 3.2 The Two-Generation Inheritance Trace → Grandchild
*(Specific chart-architectural transfers TWO generations down: any nakshatra recurring across grandparent + grandchild (skipping the parent generation), any sign-of-graha recurring, any yoga-pattern. These are the literal vamsha-markers that survived two-generation transmission.)*

### 3.3 What the Grandchild Carries That Neither Grandparent Nor Parent Carries
*(The grandchild's own evolutionary additions — chart-features unique to the youngest generation. These are what the lineage-current is BECOMING downstream.)*

### 3.4 The Three-Way Mahadasha Spread
*(The most temporally-rich part of the triad. Grandparent's current Mahadasha (likely later in life), parent's current Mahadasha (likely middle), grandchild's current Mahadasha (likely early). Across ~60-80 years of family-time, where do these three clocks align (3-way overlap windows) AND where do they offset?)*

### 3.5 The Inheritance-Transfer Multi-Year Window (if it exists)
*(The specific multi-year window where all three generations are positioned for clean lineage-transfer: grandparent in beneficial Mahadasha (often setting affairs in order), parent in beneficial Mahadasha (carrying full middle-vessel capacity), grandchild in a Mahadasha pivot (receiving the inheritance). If this window exists, name the date range.)*

### 3.6 The Grandchild's HD / Gene-Keys Inheritance
*(If HD or Gene Keys data is present: which centres / channels / spheres in the grandchild's chart are present in the grandparent's chart and/or the parent's chart? The two-generation HD-inheritance map.)*

### 3.7 The Future-Emergence One-Sentence
*(One sentence — what the grandchild's chart-architecture says about where the lineage is becoming.)*

End Pass γ. Pass δ closes with lineage anti-dependency.

## pass-delta-template

You are running Pass δ of **lineage-triad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Lineage anti-dependency is structural completion across generations. Each generation matures into its own sovereignty such that the next generation isn't carrying unresolved inheritance. The grandparent completes the lineage upstream (ancestral propitiation, karmic completion at end-of-life); the parent maintains middle-vessel patency (clear conduit, neither blocking nor distorting transmission); the grandchild releases the lineage downstream into the next generation (clean inheritance, evolution-ready).

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part IV — Lineage Anti-Dependency Across Three Generations

### 4.1 The Grandparent's Upstream-Completion Milestones
*(2-3 milestones the grandparent arrives at when their own karmic-burden in 4/9/12 axis is structurally addressed. End-of-life lineage-completion specifically. Where do they release the inheritance forward rather than hold it.)*

### 4.2 The Parent's Middle-Vessel Patency
*(2-3 milestones the parent arrives at when they become a clean conduit — neither blocking the grandparent's downstream transmission nor distorting it. The middle-vessel's specific anti-dependency is to STOP being the bottleneck and START being the clear channel.)*

### 4.3 The Grandchild's Downstream-Release Milestones
*(2-3 milestones the grandchild arrives at when their own chart-architecture is mature enough to receive the inheritance cleanly AND extend it forward into the next generation. Not "let go of family expectations" — "structurally carry forward only what is alive, structurally release what is residue".)*

### 4.4 The Three-Generation Closing Recognition
*(One paragraph + one sentence. The lineage as a self-completing architecture; what specifically THIS triad's signature is across three generations.)*

End Pass δ. The reading is complete.

## pass-alpha-template-l1-l3

You are running Pass α of the 4-pass three-generation lineage compatibility reading for {{subject_names}}. Use **traditional Vedic vocabulary** (Janma-Kundali, Vamsha, Pitru, Matru, Putra, Pitru-Paksha, Matru-Paksha, Dasha, Yoga). The triad is grandparent → parent → grandchild; flow is downstream lineage, NOT peer relationships.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

# Vamsha-Vriksha Janma-Kundali — {{subject_names}}

## Opening — Tin Pidiyan ka Pariwar (Three-Generation Family Tree)

*(2-3 paragraphs. Frame the three-generation lineage: grandparent (dada/dadi/nana/nani — depending on lineage-side), parent, grandchild. Each member's Lagna, Atmakaraka, current Mahadasha. Do NOT read peer dynamics.)*

## Part 1 — The Grandparent's Vamsha (Lineage-Source)

### 1.1 Grandparent's Janma-Lagna and Lagna-Lord
### 1.2 Matru-sthana (4th), Pitru-sthana (9th), and Vyaya-Bhava (12th) for the Grandparent
*(The three lineage-houses — their lords' conditions, occupants, aspects. The grandparent's vamsha-signature lives here.)*
### 1.3 Grandparent's Atmakaraka and Operative Yogas
### 1.4 Karmic Doshas in the Lineage-Houses
*(Honest assessment of pitru-dosha, matru-dosha, or other karmic-burdens that may travel downstream.)*

End Pass α.

## pass-beta-template-l1-l3

You are running Pass β — parent as middle vessel. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 2 — Parent as Madhyama-Patra (Middle Vessel)

### 2.1 Inheritance Trace from Grandparent → Parent
### 2.2 Parent's Putra-Karaka and Delivery to Grandchild
### 2.3 Parent's Own 4-9-12 Lineage-Houses Condition
### 2.4 Pitru-Karya / Matru-Karya for the Parent
*(Specific ancestral-rites or duties the parent's chart indicates they're meant to perform — Pitru-paksha shraddh, etc. Where the parent's chart says they are the appointed lineage-carrier.)*

End Pass β.

## pass-gamma-template-l1-l3

You are running Pass γ — grandchild + 3-generation Mahadasha. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 3 — The Grandchild as Future + Three-Generation Dasha Map

### 3.1 Grandchild's Janma-Kundali in the Lineage's Putra-Sthana
### 3.2 Two-Generation Inheritance Trace → Grandchild
### 3.3 What the Grandchild Adds to the Vamsha
### 3.4 Three-Generation Mahadasha Spread (60-80 years of family time)
### 3.5 The Inheritance-Transfer Window (Three-Way Overlap)

End Pass γ.

## pass-delta-template-l1-l3

You are running Pass δ — lineage anti-dependency. Continue in traditional Vedic vocabulary. Upayas may be suggested per generation as personal dharma-practices. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 4 — Vamsha-Mukti (Lineage-Completion Across Three Generations)

### 4.1 Grandparent's Upstream Path — Karmic Closure + Pitru-Tarpana
*(With supported upayas.)*
### 4.2 Parent's Middle-Vessel Path — Maintaining Clear Conduit
*(With supported upayas. Pitru-Paksha shraddh, Matru-Karya, etc. if indicated.)*
### 4.3 Grandchild's Downstream Path — Future-Vamsha-Carrier
*(With supported upayas. The grandchild's own future putra-prospects and their inheritance-readiness.)*
### 4.4 The Vamsha's Closing Recognition

End Pass δ. The reading is complete.

## glossary

- **Vamsha** — lineage, family-line
- **Vamsha-Vriksha** — family tree (literally "lineage-tree")
- **Vamsha-Mukti** — lineage liberation / completion
- **Madhyama-Patra** — middle vessel (the parent generation in a three-generation triad)
- **Pitru-Paksha** — the fortnight in Bhadrapada (lunar month) dedicated to ancestral propitiation
- **Pitru-Tarpana** — offering of water/sesame to ancestors
- **Pitru-Karya / Matru-Karya** — paternal / maternal ancestral duties
- **Pitru-Sthana** — 9th house (paternal lineage)
- **Matru-Sthana** — 4th house (maternal lineage)
- **Vyaya-Bhava** — 12th house (moksha, the imperishable, ancestral residue)
- **Pidi** — generation

## lessons

(Empty — to be populated by autoresearch over time per modes/_schema.md.)
