---
mode: family-triad
subject_count:
  min: 3
  max: 3
roles:
  - mother
  - father
  - child
target_words:
  min: 12000
  max: 15000
architecture: linear
pass_plan:
  - id: alpha
    title: "Parent-Pair Bedrock — Matru × Pitru Field"
    target_words: 3500
    template: pass-alpha-template
  - id: beta
    title: "Child as Emergence — Putra Karaka Through Both Parents"
    target_words: 3500
    template: pass-beta-template
  - id: gamma
    title: "Triadic Field + Mahadasha Co-Timing"
    target_words: 3500
    template: pass-gamma-template
  - id: delta
    title: "Generational Anti-Dependency — How the Triad Matures Apart"
    target_words: 2500
    template: pass-delta-template
engine_overlay_weights:
  vimshottari: 2.0
  panchanga: 1.2
  tarot: 1.5
  gene-keys: 1.5
  human-design: 1.5
  i-ching: 0.7
  nadabrahman: 0.7
  biorhythm: 0.5
  face-reading: 0.3
  sigil-forge: 0.3
house_overlay: [4, 9, 5, 7, 2, 12]
bridge_mandates:
  - "Every major claim must braid four cross-references in the same sentence-flow: parent-pair-house (4th OR 9th) × Pitru/Matru/Putra-karaka × HD-electromagnetic-channel-between-parents × dasha-anchor-across-the-three."
  - "The mother is NEVER the spouse of the child, NEVER the sibling of the father. Treat the dyadic mother-father reading as a married-couple synastry (Vivaha). Treat the parent-child reading as Putra-karaka inheritance (NOT compatibility / Vivaha)."
  - "Mahadasha co-timing across mother + father + child has a SPECIFIC family-shape: when both parents are in their long-form major beneficial dashas AND the child crosses a Rahu→Jupiter or Saturn→Jupiter pivot in the same window, the family is in a STRUCTURAL inheritance-transfer phase. Decode that window if it exists."
  - "Anti-dependency in a family-triad means each member becoming structurally UNABLE TO NEED what the others provide — the family matures by structurally completing its own dispersal. Children's anti-dependency is NOT estrangement; it is the parents becoming optional anchors rather than required ones."
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

You are running Pass α of the 4-pass **family-triad** synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

A family-triad reading is NOT three solo readings stacked, AND NOT three peers in a generic field. It is the chart-architectural decoding of a **parent-pair anchoring a child-as-emergence**. The three roles are pre-declared and must be honoured throughout — the mother and father are a married couple (read their dyad as Vivaha / spousal synastry); the child is the Putra Karaka emergence from their pairing (read the parent-to-child axis as inheritance, NOT compatibility).

**Hard kinship rules** (violating any of these is a reading defect):
- The mother is NEVER the spouse of the child.
- The mother is NEVER the sister of the father.
- The child is NEVER read as a peer of the parents.
- The child's chart is read with the parents' charts as STRUCTURAL CONTEXT (what they carried) — not as cross-romance, not as cross-sibling.
- The parent-child dyadic dynamics use Putra Karaka (Jupiter for the father, Moon for the mother in classical), the 5th house (child-significator), and the 9th house from the parents (the child as the parents' dharma-emergence).

{{prior_pass}}

## SUBJECT ROSTER (with declared family roles)
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

# Family-Triad Reading — {{subject_names}}

## Opening — The Family as a Single Inheritance Field

*(2-3 paragraphs. Frame the triad: two parents whose chart-architectural pairing produced the child's chart-architectural emergence. State up-front what each chart contributes to the family-field: the mother as Matru karaka anchor, the father as Pitru karaka anchor, the child as the Putra-emergence carrying both lineages forward. Do NOT introduce the parents as siblings to each other or to the child. Do NOT treat any dyad as cross-romance except the mother-father dyad.)*

## Part I — The Parent-Pair Bedrock (Matru × Pitru)

### 1.1 The Mother-Father Vivaha Architecture
*(The two parents read AS A MARRIED COUPLE first. Apply standard Vedic Vivaha analysis: each chart's 7th house (Kalatra), Venus + Jupiter as spousal significators, Darakaraka. Cross-overlay: where does Mother's 7th lord sit in Father's chart? Where does Father's 7th lord sit in Mother's? The pair's electromagnetic stability is encoded HERE, not in any other dyad in this reading.)*

### 1.2 The Mother's Lineage Signature (Matru Karaka in the Mother's chart)
*(For the MOTHER: her 4th house, her Moon condition, her Matru karaka, her own mother's lineage as encoded in her chart. This is the maternal current the child inherits.)*

### 1.3 The Father's Lineage Signature (Pitru Karaka in the Father's chart)
*(For the FATHER: his 9th house, his Sun condition, his Pitru karaka, his own father's lineage as encoded in his chart. This is the paternal current the child inherits.)*

### 1.4 The Couple's Shared Mahadasha Window
*(The window where both parents are in their long-form beneficial Mahadashas simultaneously. This is the family's structural CALM-AND-EXPANSION period. State the date range. This is where the inheritance-transfer to the child becomes structurally possible.)*

### 1.5 The Parent-Pair One-Sentence Signature
*(One sentence — what this couple is at the family-field's anchor level. The reading earns this in the next three passes; state the working hypothesis here.)*

End Pass α. Pass β moves into the child as Putra-emergence from this anchor.

## pass-beta-template

You are running Pass β of **family-triad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

The parent-pair has been anchored. NOW read the CHILD's chart not as a peer of the parents but as the **Putra-karaka emergence** from the parents' chart-architectural pairing. The child carries both lineages forward in a specific configuration the parents alone do not generate.

**Reminder of hard kinship rules** — the mother is NOT the child's spouse-significator; do not read 7th-house Kalatra cross-overlay between mother and child. The parent-child dyad is read through the 5th house (child-significator) and Jupiter/Moon (Putra karaka lineage), NEVER through Venus + 7th (which is the parent-pair dynamic only).

{{prior_pass}}

## SUBJECT ROSTER (with declared family roles)
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part II — The Child as Putra-Emergence

### 2.1 The Child's Birth Chart in the Parents' 5th-House Field
*(Where does the child's Lagna fall in the Mother's 5th house? In the Father's 5th house? What's the structural conversation? Then: where does the child's Atmakaraka sit in each parent's chart? In whose 5th, 9th, 4th house does the child's soul-significator land?)*

### 2.2 Maternal Inheritance Trace (Mother → Child)
*(Specific Mother-to-Child chart-architectural transfers: shared nakshatras, shared signs of significant grahas, the Mother's Moon-condition reproduced or inverted in the child's chart. The literal inheritance-current.)*

### 2.3 Paternal Inheritance Trace (Father → Child)
*(Same, Father → Child. The Pitru-karaka transfer: shared Sun-condition, shared 9th-house dynamic, the dharma-current the child receives from the father's chart.)*

### 2.4 What the Child Carries That Neither Parent Carries Alone
*(The 3rd-thing: chart-features in the child that are NOT inherited and NOT explainable as parent-pair sum. These are the child's own evolutionary emergence — what the family field is being asked to make space for. Often a specific yoga or planetary condition unique to the child.)*

### 2.5 The Child's HD/Gene-Keys Signature vs. The Parents' Combined HD Field
*(If HD and Gene-Keys data are present: which of the child's defined centers / channels / gates are ALSO present in one or both parents, and which are the child's own emergent signature. Same for Gene-Keys spheres.)*

### 2.6 The Parent-Child Dharma Conversation (Putra Karaka cross-overlay)
*(For each parent: where does their Putra Karaka graha sit in the child's chart? And where does the child's Atmakaraka sit in each parent's chart? This is the literal dharma-conversation between parent and child encoded in chart-architecture.)*

End Pass β. Pass γ assembles the three-as-one field.

## pass-gamma-template

You are running Pass γ of **family-triad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

The parent-pair has been anchored (Pass α). The child has been read as emergence-from-the-pair (Pass β). NOW assemble the **three-as-one family field**: what the triad IS when operative as a single inheritance-transfer architecture, and HOW the Mahadasha clocks of all three align (or do not align) into specific multi-year windows.

{{prior_pass}}

## SUBJECT ROSTER (with declared family roles)
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part III — The Triadic Field

### 3.1 The Three-Way Mahadasha Map
*(A timeline table or chronological prose: the current Mahadasha of each of the three (with end dates), the next Mahadasha for each, and the overlap windows where 2 or 3 of them are simultaneously in beneficial cycles. This is the family-field's TEMPORAL ARCHITECTURE — when the inheritance-transfer is structurally easiest, when it is structurally hardest.)*

### 3.2 The Inheritance-Transfer Window
*(The specific multi-year window (if it exists in this triad) where ALL THREE are positioned for structural inheritance-transfer: parents both in expansion-Mahadasha simultaneously WHILE child crosses a Rahu→Jupiter or Saturn→Jupiter pivot. Name the date range; decode what this window is FOR — what the family-field structurally accomplishes during it.)*

### 3.3 The Triadic Yoga-Coverage
*(Which Pancha-Mahapurusha Yogas or major yogas does the family-field cover collectively? If the mother carries Malavya, the father carries Sasa, and the child carries Hamsa — the FAMILY covers Venus + Saturn + Jupiter at peak. That is the family's collective YOGA-PORTFOLIO. Decode it.)*

### 3.4 The Cross-Chart 4th-9th-5th-7th Mandala
*(The single triadic table: each subject's 4H (mother), 9H (father), 5H (children), 7H (spouse) positions. Across the three charts, where do these axes resonate AND where do they diverge? This is the family-as-field's COMPLETE HOUSE GEOMETRY in one map.)*

### 3.5 Gene-Keys / Tarot Triadic Resonance
*(Where do the three Gene-Keys Pearls connect? Where do the three Major Arcana correspondences form a coherent narrative triangle? This is the triad's MYTHIC-LAYER signature.)*

### 3.6 The Triadic One-Sentence Statement
*(One sentence — what this family is at the operative-as-one-field layer.)*

End Pass γ. Pass δ moves into anti-dependency.

## pass-delta-template

You are running Pass δ of **family-triad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

The family-triad's field-architecture has been read. NOW close with the **anti-dependency** layer: what each member becomes structurally capable of when the family-field has matured into its own dispersal. Children's anti-dependency from parents is NOT estrangement — it is the parents becoming optional anchors rather than required ones. Parents' anti-dependency from each other is NOT divorce — it is each becoming structurally complete enough that the marriage stops carrying their unmet personal completion.

{{prior_pass}}

## SUBJECT ROSTER (with declared family roles)
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part IV — Generational Anti-Dependency

### 4.1 The Mother's Anti-Dependency Milestones
*(2-4 capacity milestones the mother arrives at when the family-field has matured. Anatomically anchored, not prescriptive. Examples: "the urge to mother becomes selective — directed only where it lands as nourishment, not where it lands as obligation"; "the 4th-house anchor is held internally as her own foundation, not externally as the home-she-runs.")*

### 4.2 The Father's Anti-Dependency Milestones
*(Same shape, father-specific. 2-4 milestones grounded in Pitru-karaka mature operation.)*

### 4.3 The Child's Anti-Dependency Milestones
*(Same shape, child-specific. 2-4 milestones. Critical: these are NOT about distance from parents — they are about the child's own structural completion such that the parents become OPTIONAL anchors. The 9th-house dharma sourced internally; the 5th-house creativity sourced from the child's own Atmakaraka, not validated externally.)*

### 4.4 The Parent-Pair's Joint Anti-Dependency
*(2-3 milestones the parents arrive at as a couple when each has matured into their own sovereignty. Vivaha at its highest is two complete fields choosing each other; this section names what that looks like for this specific pair.)*

### 4.5 The Family-Field's Closing One-Sentence
*(One sentence — what this family IS at the closing layer. The work is done. The structure is named. The dispersal is structurally underway.)*

End Pass δ. The reading is complete.

## pass-alpha-template-l1-l3

You are running Pass α of the 4-pass family kundali compatibility synthesis for a family of three: a mother, a father, and their child. The reading is for the family members themselves to read — so use **traditional Vedic vocabulary throughout** (Lagna, Rashi, Nakshatra, Pada, Bhava, Janma-Kundali, Vivaha, Pitru, Matru, Putra, Dasha, Yoga, Dosha). Do NOT use framework jargon (Aletheios, Pichet, Kosha-Clifford, Eigenwelt, Anatomist). Sanskrit terms can stand on their own — the audience knows them.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

**Hard kinship rules:**
- The mother and father are a married couple — read their dyad as Vivaha Milan (marriage compatibility).
- The child is the Putra (offspring) of the parents — read parent-child dyads as Pitru/Matru → Putra inheritance, NEVER as Vivaha.
- Do NOT read the mother as sister of the father, OR as spouse of the child.

{{prior_pass}}

## SUBJECT ROSTER (with declared family roles)
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

# Family Kundali Reading — {{subject_names}}

## Opening — Pariwar ki Kundali (The Family Horoscope)

*(2-3 paragraphs. Frame the reading: two parents' janma-kundalis interlocking with their child's janma-kundali to reveal the family-field. State each member's name and role explicitly: mother, father, child. Mention each one's Lagna, Atmakaraka, and current Mahadasha. Do NOT speculate about sibling or romantic relationships.)*

## Part 1 — The Parent-Pair Vivaha Architecture

### 1.1 Mother's and Father's Janma-Lagnas in Relation
*(Lagna of each, Lagna lord of each, and the cross-overlay between them. Use standard Vedic synastry for the married couple.)*

### 1.2 Chandra-Surya Coupling Between the Couple
*(Mother's Chandra (Moon) and Father's Surya (Sun) — sign, nakshatra, pada — and how they relate by sign / aspect / nakshatra-lord. This is the classical compatibility marker for the Vivaha pair.)*

### 1.3 Atmakaraka, Darakaraka, and the 7th Bhava (Kalatra) for Each
*(Each parent's Atmakaraka and Darakaraka. Then each parent's 7th Bhava — lord, occupants, aspects. This is the literal marriage-architecture of the couple.)*

### 1.4 Ashtakoot Guna Milan (where possible)
*(For the parents' pair: brief mention of how the 36-point Ashtakoot Guna Milan would score this pair on Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi. Don't fabricate a numerical score — describe the qualitative status of each Guna.)*

### 1.5 The Parents' Shared Mahadasha Calm
*(The window where both parents are in their long-form Shubh Mahadashas simultaneously. State the date range and what this calm-and-expansion window is structurally FOR in the family's life.)*

End Pass α. Pass β moves to the child as Putra emerging from this Vivaha.

## pass-beta-template-l1-l3

You are running Pass β of the family kundali synthesis for {{subject_names}}. Continue in traditional Vedic vocabulary throughout. **Pass title:** {{pass_title}}. **Target:** ~{{target_words}} words.

The mother-father pair has been read as Vivaha. NOW read the CHILD's chart as Putra emerging from that pair — NEVER as a peer, NEVER as a romantic partner, NEVER as a sibling to either parent.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 2 — Putra (The Child) and the Parent-Child Inheritance

### 2.1 The Child's Janma-Kundali in the Parents' 5th Bhava (Putra-sthana)
*(Where does the child's Lagna fall in the Mother's 5th Bhava? In the Father's 5th Bhava? The 5th Bhava (Putra-sthana) is the literal children-house — its activation by the child's chart is the inheritance marker.)*

### 2.2 Matru-Dosha and Mother → Child Transfers
*(Mother's Chandra-condition, Matru-karaka. Specific chart-features of the Mother that re-appear in the child's chart: shared nakshatra, shared sign-of-significant-graha, shared planetary pattern. These are the maternal-line transfers.)*

### 2.3 Pitru-Dosha and Father → Child Transfers
*(Same for father → child. Father's Surya-condition, Pitru-karaka. Father-to-child chart-architectural transfers.)*

### 2.4 The Child's Atmakaraka in Each Parent's Kundali
*(Where does the child's Atmakaraka (soul-significator) sit in the Mother's chart? In the Father's chart? This is the literal soul-conversation between parent and child.)*

### 2.5 What the Child Carries That Neither Parent Carries
*(Specific yogas, nakshatras, or planetary configurations in the child's chart that are NOT explained by inheritance from either parent. These are the child's own evolutionary additions to the family-field.)*

End Pass β.

## pass-gamma-template-l1-l3

You are running Pass γ of the family kundali synthesis for {{subject_names}}. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 3 — The Family Field as a Single Kundali

### 3.1 The Three-Way Mahadasha Timeline
*(Tabulate or describe in chronological prose the active and next Mahadasha for each of the three. State explicitly any window where all three are simultaneously in beneficial Mahadashas — that is the family's STRUCTURAL EXPANSION window.)*

### 3.2 The Inheritance-Transfer Window
*(The specific multi-year window (if any) where both parents are in beneficial cycles WHILE the child crosses a major Mahadasha pivot. State the date range and what the family achieves during it.)*

### 3.3 The Triadic Yoga Portfolio
*(Which Pancha-Mahapurusha or major Yogas does the family-field cover collectively? List by member. The family's collective Vedic yoga-coverage.)*

### 3.4 The 4-9-5-7 Bhava Mandala Across the Triad
*(Each member's 4H (matru-sthana), 9H (pitru-sthana), 5H (putra-sthana), 7H (kalatra). Cross-resonance: where these axes line up across the three charts. This is the family's literal Bhava-geometry.)*

### 3.5 The Family's Vivaha + Vamsha Outlook
*(For each member: marriage-architecture (Vivaha for parents in operation; Vivaha-prospects for the child if unmarried; vamsha-continuation — the lineage-transfer through the child). State this clearly per member.)*

End Pass γ.

## pass-delta-template-l1-l3

You are running Pass δ of the family kundali synthesis for {{subject_names}}. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

In the L1-L3 register, anti-dependency translates as **maturity of each member into their own dharma**. The reading may include remedies (mantras, charity, temple-visits, gemstone, fasting practices) where Vedic tradition supports them — but framed as *practices for each member's own dharma-maturation*, NOT as fixes for relational obligation.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 4 — Each Member's Dharma-Maturation Path

### 4.1 Mother's Path
*(2-3 paragraphs. Her dharma-trajectory from current Mahadasha forward. Specific practices supported by her chart (e.g. Matru-graha mantra, Chandra-strengthening fasts) where Vedic tradition supports them. The framing is HER own dharma, not her role for others.)*

### 4.2 Father's Path
*(Same for father. His own dharma-maturation, supported practices, what his own Surya/Pitru-graha trajectory asks of him.)*

### 4.3 Child's Path
*(Same for child. The child's own evolutionary path — NOT defined by what the parents need. What the child's own Atmakaraka asks of them.)*

### 4.4 The Family-Field's Closing Recognition
*(One paragraph. The family as a field that has structurally completed its inheritance-transfer; what remains is each member living their own dharma fully. Close with one sentence naming this family's specific signature in the lineage.)*

End Pass δ.

## glossary

- **Vivaha** — marriage; the parent-pair's spousal dynamic
- **Pitru karaka** — father-significator (Sun in classical; in Jaimini, the planet at a specific Char-karaka position)
- **Matru karaka** — mother-significator (Moon in classical)
- **Putra karaka** — children-significator (Jupiter in classical; or Char-karaka derivation)
- **Janma-kundali** — birth-chart
- **Janma-lagna** — natal ascendant
- **Bhava** — house
- **Kalatra-bhava** — 7th house, spouse
- **Matru-sthana** — 4th house, mother-place
- **Pitru-sthana** — 9th house, father-place
- **Putra-sthana** — 5th house, children-place
- **Vamsha** — lineage, family-line
- **Dharma** — duty / path / structural purpose
- **Ashtakoot Guna Milan** — 36-point classical compatibility scoring for couples (only for the parent-pair dyad, never for parent-child)

## lessons

(Empty — to be populated by autoresearch over time per modes/_schema.md.)
