---
mode: family-quad
subject_count:
  min: 4
  max: 4
roles:
  - mother
  - father
  - elder-child
  - younger-child
target_words:
  min: 14000
  max: 16000
architecture: linear
pass_plan:
  - id: alpha
    title: "Parent-Pair Bedrock — Matru × Pitru"
    target_words: 3000
    template: pass-alpha-template
  - id: beta
    title: "Both Children as Putra-Emergence Through the Pair"
    target_words: 3500
    template: pass-beta-template
  - id: gamma
    title: "Sibling Dyad — Sahaja Axis, Jyeshta vs Kaniyasa"
    target_words: 3000
    template: pass-gamma-template
  - id: delta
    title: "Quadratic Field + 4-Way Mahadasha Co-Timing"
    target_words: 3000
    template: pass-delta-template
  - id: epsilon
    title: "Generational Anti-Dependency Across Four"
    target_words: 2500
    template: pass-epsilon-template
engine_overlay_weights:
  vimshottari: 1.8
  panchanga: 1.2
  tarot: 1.5
  gene-keys: 1.5
  human-design: 1.5
  i-ching: 0.8
  nadabrahman: 0.7
  biorhythm: 0.5
  face-reading: 0.3
  sigil-forge: 0.3
house_overlay: [4, 9, 5, 3, 11, 7, 2, 12]
bridge_mandates:
  - "Every major claim must braid four cross-references in the same sentence-flow: parent-pair-house (4th/9th) OR sibling-house (3rd/11th) × Pitru/Matru/Putra/Sahaja-karaka × HD-electromagnetic-channel-between-relevant-pair × dasha-anchor-across-the-four."
  - "Inherit the family-triad kinship contract: mother is NEVER the spouse/sibling of any child, father is NEVER the spouse/sibling of any child, parent-child dyads read as Putra-karaka inheritance (NOT Vivaha), parent-pair reads as Vivaha. The TWO children are siblings of EACH OTHER (Sahaja-bandhus); they are NEVER read as a romantic dyad, NEVER as parents to each other."
  - "Birth order matters in Vedic kinship. The elder-child carries Jyeshta dynamics (the inheritor of certain dharmic responsibilities, the 'first-receiver' of the parent-pair's chart-architecture). The younger-child carries Kaniyasa dynamics (often the freer of formal expectations, more direct lineage from one specific parent depending on chart configuration). Pass γ must honour this asymmetry without flattening either child into the other."
  - "Mahadasha co-timing across mother + father + 2 children produces SIX dyadic Mahadasha-overlap maps (mother-father, mother-elder, mother-younger, father-elder, father-younger, elder-younger). Pass δ must name the windows when 3+ members are simultaneously in beneficial cycles — those are the family's structural inheritance-transfer windows."
  - "Anti-dependency in Pass ε is per-member capacity. The elder-child often carries an inherited-responsibility-pattern that anti-dependency loosens; the younger-child often carries an inherited-comparison-pattern (against the elder) that anti-dependency releases. Name both."
svg_topology: web-graph

# ── Consciousness-level register variants ──
register_variants:
  l1_l3:
    target_words:
      min: 10000
      max: 12000
    overrides:
      - pass_id: alpha
        template: pass-alpha-template-l1-l3
      - pass_id: beta
        template: pass-beta-template-l1-l3
      - pass_id: gamma
        template: pass-gamma-template-l1-l3
      - pass_id: delta
        template: pass-delta-template-l1-l3
      - pass_id: epsilon
        template: pass-epsilon-template-l1-l3
  l4_l5:
    target_words:
      min: 14000
      max: 16000
---

## pass-alpha-template

You are running Pass α of the 5-pass **family-quad** synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

A family-quad is the parent-pair anchor with TWO children as emergence-vectors. This pass establishes the parent-pair bedrock (same shape as family-triad Pass α). Subsequent passes add the second child, the sibling dynamic, and the 4-way field.

**Hard kinship rules** (carry forward from family-triad):
- Mother and father are a married couple — read their dyad as Vivaha synastry.
- Each child is a Putra-emergence from the parent-pair; parent-child dyads are NOT Vivaha and NEVER cross-romantic.
- The two children are siblings of each other (Sahaja-bandhus) — Pass γ handles their dynamic. They are not peers to the parents, and never a romantic dyad with each other.

{{prior_pass}}

## SUBJECT ROSTER (with declared family roles + birth order)
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

# Family-Quad Reading — {{subject_names}}

## Opening — The Family as a Single Field With Two Emergence-Vectors

*(2-3 paragraphs. Frame the quad: two parents whose Vivaha-architecture produced two children — each a distinct emergence from the same pair. State each member's name, role, Lagna, Atmakaraka, current Mahadasha. Honour birth order — elder-child first, younger-child second.)*

## Part I — The Parent-Pair Bedrock (Matru × Pitru)

### 1.1 The Mother-Father Vivaha Architecture
*(Same structure as family-triad Pass α 1.1. The parents read AS A MARRIED COUPLE. 7th house cross-overlay, Darakaraka cross-disposition, electromagnetic stability indicators.)*

### 1.2 The Mother's Lineage Signature (Matru Karaka in the Mother's chart)
*(Mother's 4th house, Moon condition, Matru karaka. The maternal current both children inherit FROM HER.)*

### 1.3 The Father's Lineage Signature (Pitru Karaka in the Father's chart)
*(Father's 9th house, Sun condition, Pitru karaka. The paternal current both children inherit FROM HIM.)*

### 1.4 The Couple's Active Putra-Yoga
*(Specific check: do the parents' charts indicate Putra-yoga (children-blessing yogas) — Jupiter in 5th, 5th lord in kendra/trikona, Putra karaka well-placed? This is the structural reason the pair has TWO children rather than zero or one. Decode it.)*

### 1.5 The Parent-Pair One-Sentence Signature
*(One sentence — the parent-pair's anchor for this family.)*

End Pass α. Pass β reads both children as Putra-emergence.

## pass-beta-template

You are running Pass β of **family-quad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Two children, each a distinct emergence from the same parent-pair. Read EACH child's chart as Putra-emergence (the way family-triad Pass β reads its one child) — but now twice, with attention to what's similar and what's distinct between the two children's inheritance-patterns.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part II — Both Children as Putra-Emergence

### 2.1 Elder-Child in the Parents' 5th-House Field
*(Where does the elder-child's Lagna sit in each parent's 5th house? Atmakaraka cross-disposition: where does the elder-child's AK land in each parent's chart? This is the elder-child's structural anchor in the family-field.)*

### 2.2 Maternal Inheritance Trace — Mother → Elder-Child
*(Specific chart-architectural transfers: shared nakshatras, shared signs of significant grahas, the Mother's Chandra-condition reproduced or inverted in the elder-child. The literal Matru-line inheritance.)*

### 2.3 Paternal Inheritance Trace — Father → Elder-Child
*(Same for Father → Elder-Child. Pitru-line inheritance.)*

### 2.4 Younger-Child in the Parents' 5th-House Field
*(Same exercise as 2.1 for the younger child.)*

### 2.5 Maternal Inheritance Trace — Mother → Younger-Child
*(Same as 2.2 for younger child.)*

### 2.6 Paternal Inheritance Trace — Father → Younger-Child
*(Same as 2.3 for younger child.)*

### 2.7 What Each Child Carries That the Other Doesn't
*(The distinct-emergence layer. The two children are NOT carbon copies — each carries something specific. Name what's unique to each child's chart-architecture that isn't carried by the sibling.)*

### 2.8 The Parent-Pair's Combined Putra Karaka Cross-Overlay
*(Each parent's Putra Karaka graha — where does it sit in each child's chart? Four mappings total (mother-PK in elder, mother-PK in younger, father-PK in elder, father-PK in younger). Decode the pattern.)*

End Pass β. Pass γ reads the siblings as a dyad.

## pass-gamma-template

You are running Pass γ of **family-quad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

The two children form a sibling-dyad of their own. The 3rd house (Sahaja-bhava — siblings, courage, communication) and the 11th house (gains, network, the elder-sibling for the younger / the younger-sibling network for the elder) frame this dyad. The sibling-dyad is NEVER cross-romantic, NEVER peer-equivalent in the way the parents are. It is a structural inheritance-shared, with birth-order asymmetry (Jyeshta dynamic for the elder, Kaniyasa dynamic for the younger).

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part III — The Sibling Dyad (Sahaja Axis)

### 3.1 Each Sibling's 3rd House (Sahaja-bhava) and 11th House (Labha-bhava)
*(For each sibling: the 3rd house (courage, communication, siblings) AND the 11th house (network, gains, elder/younger-sibling specifics). Lord-conditions, occupants, aspects. The structural sibling-architecture per chart.)*

### 3.2 Cross-Overlay: Elder's Sahaja-bhava in Younger's Chart, and Vice Versa
*(Where does the elder-child's 3rd lord sit in the younger-child's chart? And the younger-child's 3rd lord in the elder-child's chart? This is the literal sibling-bond architecture.)*

### 3.3 Jyeshta Dynamics for the Elder
*(The elder-child carries Jyeshta dynamics in Vedic kinship — the first-receiver of inheritance, often carrying parental-expectation, possibly the family's outward-facing representative. Specifically what does the elder's chart indicate about how this is carried? Where it lands kindly vs where it weighs.)*

### 3.4 Kaniyasa Dynamics for the Younger
*(The younger-child carries Kaniyasa dynamics — often the freer-of-formal-expectations, possibly the more direct inheritor of one specific parent's gift, sometimes the family's mediator. Specifically what does the younger's chart indicate?)*

### 3.5 The Sibling Mahadasha Co-Timing
*(Where do the elder and younger Mahadasha clocks overlap? Are they simultaneously in beneficial cycles? Mahadasha-overlap windows are where the siblings can structurally support each other most; non-overlap windows are when one carries the field while the other works through difficulty.)*

### 3.6 The HD / Gene-Keys Sibling Resonance
*(If HD or Gene Keys data is present: shared centres, shared channels, shared Gene Key spheres between siblings. This is the literal chosen-kinship layer at the chart level.)*

### 3.7 One-Sentence — The Sibling Bond as a Field
*(One sentence — what the elder + younger together carry as a dyad.)*

End Pass γ. Pass δ assembles the four-as-one field.

## pass-delta-template

You are running Pass δ of **family-quad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Now assemble the FOUR-as-one family field: the temporal architecture across 4 Mahadasha clocks. There are 6 possible dyadic Mahadasha-overlap maps within this quad — name the structurally significant ones, name the inheritance-transfer windows, and name the family-as-field's complete house-geometry across 4 charts.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part IV — The Quadratic Family Field

### 4.1 The 4-Way Mahadasha Map
*(A chronological table or prose. Current Mahadasha + end-date for each of the 4 members; next Mahadasha for each; overlap windows where 2/3/4 members are simultaneously in beneficial cycles. The family's complete TEMPORAL ARCHITECTURE.)*

### 4.2 The 4-Way Inheritance-Transfer Windows
*(Specific multi-year windows where 3+ members are positioned for inheritance-transfer: parents both in expansion-Mahadasha WHILE one or both children cross major Mahadasha pivots. Name the date ranges; decode what each window is FOR.)*

### 4.3 The Quad's Collective Yoga-Portfolio
*(Which Pancha-Mahapurusha or major yogas does the family-field cover across all 4 charts? List by member; name the family's collective yoga-coverage.)*

### 4.4 The Cross-Chart 4-9-5-3-11-7 Bhava Mandala
*(A triadic table per member: 4H (matru), 9H (pitru), 5H (putra/creativity), 3H (sahaja/siblings), 11H (labha/gains/network), 7H (kalatra/spouse). Cross-resonance across 4 charts. The family's complete bhava-geometry.)*

### 4.5 Gene-Keys / Tarot Quadratic Resonance
*(The four Pearl spheres + four Major Arcana correspondences. The family's mythic-layer signature as a 4-way pattern.)*

### 4.6 One-Sentence — The Family-Field as an Operative Unit
*(One sentence.)*

End Pass δ. Pass ε closes with anti-dependency per member.

## pass-epsilon-template

You are running Pass ε (the closing pass) of **family-quad** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Anti-dependency per member. The work for each is to mature into their own sovereignty such that the family-field's structural completion — and structural dispersal — is healthy. Each member's path is distinct.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part V — Generational Anti-Dependency

### 5.1 Mother's Path
*(2-3 milestones the mother arrives at as her own dharma matures.)*

### 5.2 Father's Path
*(Same for father.)*

### 5.3 Elder-Child's Path — Releasing the Jyeshta-Burden
*(Specifically: the elder-child often carries an inherited-responsibility pattern that anti-dependency loosens. The reading names the milestones where this loosening happens at the structural level — not "let go of being responsible" but "the responsibility is internally chosen, not externally inherited".)*

### 5.4 Younger-Child's Path — Releasing the Comparison-Pattern
*(The younger-child often carries an inherited-comparison pattern (against the elder) that anti-dependency releases. The milestones where this happens.)*

### 5.5 The Sibling-Bond After Both Are Mature
*(What the elder-younger bond looks like after both have crossed their respective milestones — not "they become best friends" but "their bond is sourced from each one's own sovereignty rather than from inherited family-role dynamics".)*

### 5.6 The Family-Field's Closing Recognition
*(One paragraph + one sentence. The family as a structurally-completing field; what remains.)*

End Pass ε. The reading is complete.

## pass-alpha-template-l1-l3

You are running Pass α of the 5-pass family kundali compatibility synthesis for a family of four: mother, father, and two children. Use **traditional Vedic vocabulary** (Janma-Kundali, Lagna, Rashi, Nakshatra, Bhava, Pitru, Matru, Putra, Sahaja, Dasha, Yoga, Dosha). Do NOT use framework jargon.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

**Hard kinship rules:**
- Mother and father are a married couple — Vivaha frame.
- Each child is Putra of both parents — parent-child dyads are inheritance, NOT Vivaha.
- The two children are siblings (Sahaja-bandhus) of each other — NEVER a romantic dyad, NEVER peers to the parents.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

# Pariwar ki Kundali — {{subject_names}}

## Opening — Char-Sadasya Pariwar (The Four-Member Family Horoscope)

*(2-3 paragraphs. Frame: two parents, two children (elder + younger). Each member's Lagna, Atmakaraka, current Mahadasha. Honour birth order.)*

## Part 1 — The Parent-Pair Vivaha Architecture (Same as family-triad)

### 1.1 Mother's and Father's Janma-Lagnas in Relation
### 1.2 Chandra-Surya Coupling Between the Couple
### 1.3 Atmakaraka, Darakaraka, and Saptama-Bhava (Kalatra) for Each
### 1.4 Putra-Yoga in the Parents' Charts
*(Why this couple has two children rather than zero, one, or many — what Putra-yoga or Putra-bhava architecture in the parents' charts indicates the actual number.)*
### 1.5 The Parents' Shared Mahadasha Calm

End Pass α.

## pass-beta-template-l1-l3

You are running Pass β. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 2 — Both Children as Putra (Inheritance From Both Parents)

### 2.1 Elder-Child's Janma-Kundali in the Parents' 5th-Bhava
### 2.2 Matru and Pitru Transfers → Elder-Child
### 2.3 Younger-Child's Janma-Kundali in the Parents' 5th-Bhava
### 2.4 Matru and Pitru Transfers → Younger-Child
### 2.5 What Each Child Inherits Differently
*(The asymmetric inheritance. One child often inherits more of one parent's chart-architecture, the other inherits more of the other parent's. Name this without making it judgemental.)*

End Pass β.

## pass-gamma-template-l1-l3

You are running Pass γ — the sibling dyad. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 3 — Bhraatru-Bhagini Yoga (The Sibling Bond)

### 3.1 Each Sibling's Sahaja-Bhava (3rd House) and Labha-Bhava (11th House)
### 3.2 Sahaja-bhava Cross-Overlay Between Siblings
### 3.3 Jyeshta-Dharma for the Elder
### 3.4 Kaniyasa-Lakshana for the Younger
*(Younger-sibling dynamics. Often the family's mediator, often less burdened by formal expectations. Specifically what does the younger's chart say?)*
### 3.5 Sibling Mahadasha Overlap

End Pass γ.

## pass-delta-template-l1-l3

You are running Pass δ — the four-way family field. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 4 — The Family as One Pariwar-Kundali

### 4.1 The Four-Member Mahadasha Timeline
### 4.2 The Inheritance-Transfer Windows
### 4.3 The Quadratic Yoga Portfolio
### 4.4 The 4-9-5-3-11-7 Bhava Cross-Mandala
### 4.5 The Family's Vivaha + Vamsha + Sahaja Outlook
*(For each parent: Vivaha-in-operation. For each child: Vivaha-prospects + Vamsha-continuation. For the sibling pair: the Sahaja-bond's structural arc.)*

End Pass δ.

## pass-epsilon-template-l1-l3

You are running Pass ε — closing. Continue in traditional Vedic vocabulary. Upayas may be suggested as personal dharma-practices per member. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 5 — Each Member's Own Dharma-Maturation

### 5.1 Mother's Path (with supported upayas)
### 5.2 Father's Path (with supported upayas)
### 5.3 Elder-Child's Path — Releasing Jyeshta-Bharas (Eldest-Burden)
*(With supported upayas.)*
### 5.4 Younger-Child's Path — Releasing the Comparison-Pattern
*(With supported upayas.)*
### 5.5 The Family-Field's Closing Sentence

End Pass ε. The reading is complete.

## glossary

- **Sahaja-bhava** — 3rd house: siblings, courage, communication
- **Labha-bhava** — 11th house: gains, network, elder/younger-sibling nuance
- **Jyeshta** — elder; the elder-sibling's classical responsibilities
- **Kaniyasa** — younger; the younger-sibling's classical positioning
- **Bhraatru-Bhagini Yoga** — brother-sister / sibling combinations and yogas
- **Vamsha** — lineage / family-line
- **Putra-Yoga** — yogas in a chart indicating children-blessing
- (All other terms inherit from family-triad's glossary.)

## lessons

(Empty — to be populated by autoresearch over time per modes/_schema.md.)
