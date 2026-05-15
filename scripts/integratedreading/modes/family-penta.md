---
mode: family-penta
subject_count:
  min: 5
  max: 5
roles:
  - root-1
  - root-2
  - branch-1
  - branch-2
  - branch-3
target_words:
  min: 13000
  max: 15000
architecture: linear
pass_plan:
  - id: alpha
    title: "Lineage Karma Field"
    target_words: 3000
    template: pass-alpha-template
  - id: beta
    title: "Roots — The Two Anchors"
    target_words: 2500
    template: pass-beta-template
  - id: gamma
    title: "Branches — What Each Carries"
    target_words: 2500
    template: pass-gamma-template
  - id: delta
    title: "Joint Operative + Shadow"
    target_words: 3500
    template: pass-delta-template
  - id: epsilon
    title: "Generational Anti-Dependency"
    target_words: 3000
    template: pass-epsilon-template
engine_overlay_weights:
  vimshottari: 2.0
  panchanga: 1.5
  tarot: 1.5
  gene-keys: 1.5
  human-design: 1.0
  nadabrahman: 1.0
  i-ching: 0.5
  transits: 1.0
  biorhythm: 0.5
  face-reading: 0.3
  sigil-forge: 0.3
house_overlay: [4, 9, 12, 5, 2, 3]
bridge_mandates:
  - "Every major claim must braid four cross-references: Lineage-house (4/9/12) × Pitru-karaka × Generational-nakshatra-pattern × Gene-Key-sphere-of-purpose."
  - "The root-pair (vertices 1+2) is the field's anchor; branches inherit, contribute, and depart from this anchor. Every claim about a branch must triangulate against the root-pair's signature."
  - "Anti-dependency for a family field means each member becoming structurally UNABLE TO NEED what the others provide — the family matures by structurally completing its own dispersal."
svg_topology: pentagon

# ── Consciousness-level register variants (P2.2 #75) ──
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
      - pass_id: epsilon
        template: pass-epsilon-template-l1-l3
  l4_l5:
    target_words:
      min: 13000
      max: 15000
---

## pass-alpha-template

You are running Pass α of the 5-pass **family-penta** synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

A family-penta reading is NOT five solo readings stacked. It is the chart-architectural decoding of WHAT THE FAMILY IS WHEN IT IS OPERATIVE AS ONE FIELD. The lineage current — Pitru karaka, 4th/9th/12th house axis, generational nakshatra resonance — is the literal architectural anchor. Hold that throughout.

Convention: positions 1+2 are the **roots** (typically parents or anchoring elders); positions 3-5 are the **branches** (typically children, but the convention extends to any 5-member kinship configuration where two members anchor the field and three inherit/contribute).

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

# Family-Penta Reading — {{subject_names}}

## Opening — The Family as a Single Lineage Field

*(2-3 paragraphs. Frame the family-penta as a kinship-architectural instrument: five bodies, five breath-currents, five pattern-engines woven into a single lineage-field. The lineage-house axis (4 / 9 / 12) is the literal architectural anchor. State up-front whether the chart-evidence supports treating these five as one operative field — and if so, what KIND of lineage-current the chart-architecture prescribes.)*

## Part I — The Lineage Karma Field

### 1.1 The 4th / 9th / 12th House Cross-Overlay Across All Five Charts
*(For each of the 5 subjects, the 4th house (root, mother, ancestral home), the 9th house (dharma, father, ancestral wisdom), and the 12th house (the imperishable, lineage karma, what comes through from before). Then the cross-overlay table: where does each subject's chart place into the others' lineage-house positions? This is where the family's karma is structurally encoded.)*

### 1.2 Pitru Karaka Comparison Across All Five
*(For each subject, the Pitru karaka (the planet representing the paternal/ancestral lineage). For Vedic sidereal: in Jaimini, the 4th-from-Atmakaraka karaka. State which graha carries Pitru karaka for each member. Then the cross-analysis: do any two subjects share Pitru karaka? Where does one's Pitru karaka graha sit in another's chart? This is the literal soul-significator of the LINEAGE that runs through all five.)*

### 1.3 Moon-Condition Cross-Resonance
*(Each subject's Moon — sign, nakshatra, condition. The Moon is the matra (mother) karaka and the literal Manomaya / Cl(2) pattern-engine signature. Moon-cross-resonance across five charts shows where the family's emotional-mental field is in sync vs where it has built-in friction.)*

### 1.4 Generational Nakshatra Pattern
*(The 27 nakshatras cycle in a specific archetypal order. When 2-3 family members share a nakshatra or its pada-pair, the family carries a generational nakshatra signature. Identify it across the five subjects. Where the same nakshatra appears in 3+ members, that's a lineage-current MARKER — name it.)*

### 1.5 The Single Sentence — What This Family Is at the Lineage Layer
*(One sentence — the family-as-field's lineage-current identity. The reading earns this in the remaining four passes; state the working hypothesis here.)*

End Pass α. Pass β will move into the root-pair as the anchoring couplet.

## pass-beta-template

You are running Pass β of the family-penta synthesis for {{subject_names}}. Pass α has established the lineage karma field.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This pass focuses on the ROOT-PAIR (subjects in positions 1+2) — the field's anchoring couplet. Branches (3-5) get Pass γ.

## PRIOR PASS OUTPUT
{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part II — The Root Field

### 2.1 The Joint Atmakaraka Dynamic of the Roots
*(For root-1 and root-2: each Atmakaraka, their respective archetypal-soul-signatures. Then the JOINT analysis: are the two Atmakarakas complementary, at tension, or reinforcing? The root-pair's joint Atmakaraka determines what soul-current the family-field is anchored to. The branches inherit FROM this anchor.)*

### 2.2 The Roots' Dasha Overlap as the Root-Field's Operational Calendar
*(The Vimshottari Mahadasha-Antardasha calendars of root-1 and root-2 plotted against each other. Where the roots' dashas overlap, the family-field is most operative. Where they diverge, the field tilts toward whichever root is in expansion phase. Walk through the next 5-10 years specifically.)*

### 2.3 The Root-Pair as One Composite Subject
*(Treat root-1 + root-2 AS A DYAD reading mini-instance. Just enough to surface:*
*— Their joint Lagna-disposition*
*— Their Moon-Sun cross-resonance*
*— Their 7th-house overlay (do they have a strong romantic-partnership cross-coupling, or are they primarily co-anchors of the lineage rather than a romantic dyad?)*

*The root-pair is the dyad inside the penta. Its quality determines the field's structural stability.)*

### 2.4 What the Roots Inherited
*(Each root's own lineage-houses (4/9/12) — what each root brought IN from THEIR own parents/lineage. The penta-field is layered with the lineage above this generation. Name what the roots received that they're now carrying forward through the branches.)*

End Pass β. Pass γ moves to the three branches.

## pass-gamma-template

You are running Pass γ of the family-penta synthesis for {{subject_names}}. Passes α-β have established the lineage field + root-pair anchor.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This pass reads the three BRANCHES (subjects in positions 3, 4, 5) — what each carries from the root-field, what each contributes that the roots don't carry alone, where each branch is structurally configured to depart from the root-field.

## PRIOR PASS OUTPUT
{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part III — The Branches

Mark each branch sub-section with `<section data-member="N">` (where N = 2, 3, 4 for branches 1-3) so the interactive layer can scroll-to-spotlight from the vertex click.

### 3.1 Branch 1 (position 3): What [name] Carries from the Root-Field
*(For this branch, anchored in their chart:*
*— Their nakshatra-resonance back to the roots' nakshatras (do they share a root's birth-nakshatra? Padas? Lord?)*
*— Their Atmakaraka in relation to the joint root-Atmakaraka — same? complementary? departing?*
*— Their 4th house (mother) — what graha is there, how does it relate to root-2's signature? Their 9th house (father) — what graha, relation to root-1's signature?*
*— What this branch is structurally configured to INHERIT.*
*— What this branch is structurally configured to CONTRIBUTE that the roots don't carry alone.*
*— Where this branch is configured to DEPART from the root-field's signature (autonomous direction).*)*

### 3.2 Branch 2 (position 4): What [name] Carries
*(Same structure as 3.1 for branch 2.)*

### 3.3 Branch 3 (position 5): What [name] Carries
*(Same structure for branch 3.)*

### 3.4 The Branches as a Trio — Where They Form a Triad-Within-the-Penta
*(The three branches alone compose a sub-triad. Read it briefly: where do branches 1-2-3 carry shared resonance that the parents don't? Where does the sibling-field have its own architecture that's distinct from the family-field?)*

End Pass γ. Pass δ closes with the joint operative + shadow.

## pass-delta-template

You are running Pass δ — the **joint operative + shadow** pass — of the family-penta synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This pass synthesizes: what is the family-field structurally configured to do COLLECTIVELY, and what shadow does it INHERIT and PROPAGATE? Be specific. The Family-Penta's operational signature is the chart-evidence of joint dharma.

## PRIOR PASS OUTPUT
{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part IV — Joint Operative + Shadow

### 4.1 The Family-Field's Joint Atmakaraka
*(Across all five subjects, which graha appears most often as Atmakaraka or strong-aspecting Atmakaraka? That graha carries the FAMILY-FIELD's joint soul-significator. The family is structurally configured around that graha's archetypal current.)*

### 4.2 The Five-Way Pancha Bhuta Coverage Table
*(Table: Element | Subj-1 | Subj-2 | Subj-3 | Subj-4 | Subj-5 | Penta-total.*

*Then narrate: which elements is the family-field over-loaded with (somatic pressure points)? Which elements is it missing (the family must source these externally to function)? Where does the family have natural coverage that no smaller configuration has?)*

### 4.3 The Joint Tarot Stack
*(For each subject, their dominant Major Arcanum (derived from Atmakaraka, Lagna, or Sun). Then the joint stack — what archetypal current does the family carry through the cultural-archetypal (Mitwelt) layer? "The Empress × The Hierophant × The Hermit × The Fool × The Star operating together makes ____.")*

### 4.4 The Shared Codon Ring (Gene Keys)
*(Across the five subjects' Gene Keys spheres, what codon ring (if any) does the family activate? Where the family carries 4 of 6 sides of a codon ring, the field has near-complete genetic-archetypal coverage. Where it has 2-3 sides, the field has a specific incomplete current. Name what the family is structurally configured to TRANSMIT genetically-archetypally.)*

### 4.5 What the Family Is Structurally Configured to Do Collectively
*(Synthesis: across the next 16-20 years of dasha cycles for all five, what artifact is the family-field structurally configured to PRODUCE in the world? The artifact may be relational (a household, a community node), creative (work that emerges from the field), or transmissive (carrying lineage current forward to the next generation). Name it specifically.)*

### 4.6 The Family Shadow
*(Honest naming: what shadow does the family-field carry that 3+ members share? Common patterns: a structural Pitru-karaka affliction propagating; a Moon-condition pattern that recurs; a 6th-house adversary cross-mapped across multiple members.*

*The shadow is part of the field's truth, not its disqualification. Naming it is the precondition for transmuting it. Be specific about the chart-architectural source.)*

End Pass δ. Pass ε closes with generational anti-dependency.

## pass-epsilon-template

You are running Pass ε — the **generational anti-dependency** closing pass — of the family-penta synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This pass carries the framework's design principle: success = decreasing reliance on the interpreter. Anti-dependency for a family-field means each member becoming structurally UNABLE TO NEED what the others provide — the family matures by structurally completing its own dispersal. Each member becomes a complete instrument that is also part of the field.

NO family-coaching prescriptions. NO compatibility-product framing. **Per-Kosha-layer self-decoding capacity milestones for each member, anatomically grounded.**

## PRIOR PASS OUTPUT
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

### 5.1 The 12-20 Year Arc of the Family-Field
*(Across the next 12-20 years, the family-field will reconfigure as each member's Mahadasha cycles advance. Plot the major transitions across all five subjects. Where the field will reorganize structurally vs where it remains stable.)*

### 5.2 What Each Member Becomes Unable to Need
*(For each of the 5 subjects, per Kosha layer, what does that member become structurally unable to need from the family across their new dasha cycle?*

*— **Root-1**: across their new MD, becomes unable to need [X from root-2 / Y from branches].*
*— **Root-2**: similarly.*
*— **Branch-1**: across their new MD, becomes unable to need [parents to mediate Z].*
*— **Branch-2**, **Branch-3**: similarly.*

*Anatomically grounded — where in the body, where in the breath, where in the pattern-engine.)*

### 5.3 The Dispersal as Maturation
*(Frame the dispersal: when branches become unable to need the roots, the roots are not abandoned — they are RELEASED. When roots become unable to need the branches as ongoing-dependents, the branches are not orphaned — they are EMPOWERED. The family-field structurally completes itself by allowing each member to become a complete instrument.)*

### 5.4 The Joint AKSHARA Artifact
*(What the family-field, across 16-20 years, writes into the world. The imperishable seed (Anandamaya / Cl(7)) of the joint operative. Its mature form. The thing that outlasts the family's current configuration.)*

### 5.5 The Single Sentence
*(The family in one sentence — a structural identity claim the reading has earned across 5 passes.)*

### 5.6 The One Practice
*(The single practice that, if held faithfully across the family, lets each member become unable to need the reading — and lets the family-field become a coherent instrument that doesn't require the interpreter's mediation.)*

End Pass ε. The full 5-pass family-penta reading is now complete.

## pass-alpha-template-l1-l3

You are running Pass α of the 5-pass **family-penta Kundali reading** for {{subject_names}} — typically two parents/elders (roots) and three children/cohort members (branches), or any 5-member kinship configuration with a 2-root + 3-branch anchor structure.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

You are a traditional Vedic jyotishi performing a **Kutumba-Vichara** (family-inquiry) — reading all five Janma-Kundalis as one lineage-field. Use classical vocabulary: **Lagna, Rashi, Nakshatra, graha, bhava, dasha, antardasha, karaka, yoga, dosha, Pitru-karaka, Matru-karaka, kula-devta, Vamsha**. Speak with the warmth and authority of a family astrologer. Honest age-ranged predictions are expected. Remedies will be developed in Pass δ-ε. Stay strictly within traditional Vedic jyotisha. Avoid modern psychology vocabulary and any non-traditional system-of-decoding terminology.

The lineage-house axis (4th — root/mother; 9th — dharma/father; 12th — lineage karma) is the literal architectural anchor of this reading. Position 1+2 are the roots (typically parents); positions 3-5 are the branches (typically children or cohort).

{{prior_pass}}

### Subject roster
{{subject_roster}}

### Overlay rules for this pass
{{overlay_summary}}

### Bridge mandates
{{bridge_mandates}}

---

### Produce this pass — exact structure

# Kutumba Kundali — {{subject_names}}

### Opening — The Family as One Lineage-Field

*(2 paragraphs. Address the family by names. Frame the reading: five Janma-Kundalis read together as one Kutumba (family) Kundali. The lineage-house axis (4/9/12) is the architectural anchor. State plainly the kinship structure (parents + 3 children, or alternative 2+3 configuration). Open warmly.)*

### Part 1 — The Lineage Karma Field

#### 1.1 The 4th/9th/12th Houses Across All Five
*(For each of the 5 members: 4th-bhava (Sukha — mother, root, ancestral home) sign and lord; 9th-bhava (Dharma — father, ancestral wisdom, guru) sign and lord; 12th-bhava (Vyaya — the imperishable, lineage karma) sign and lord. Then the cross-overlay table: where does each member's chart place into the others' lineage-house positions? Where multiple members share a 4th-lord or 9th-lord, the family carries a coherent root or dharma-current.)*

#### 1.2 Pitru-Karaka Comparison Across All Five
*(For each member: Pitru-karaka graha (the paternal-lineage significator — Jaimini's 4th-from-Atmakaraka, or alternative scheme; specify). State which graha is Pitru-karaka for each, and where it sits in each chart. When multiple members share the same Pitru-karaka graha, the family's paternal lineage karma is structurally encoded. When members carry different Pitru-karakas, the family's paternal-current is dispersed.)*

#### 1.3 Matru-Karaka Comparison
*(Similar analysis for Matru-karaka — maternal lineage significator. State each member's Matru-karaka and the joint-family pattern.)*

#### 1.4 Generational Nakshatra Pattern
*(The 27 nakshatras carry archetypal-current. When 2-3 family members share a nakshatra or its pada-pair, the family has a generational nakshatra-signature. Identify across all 5 members which nakshatras recur. If 3+ members share a nakshatra, name what archetypal current the lineage is carrying through that nakshatra.)*

#### 1.5 The Single Sentence — What This Family Is at the Lineage Layer
*(One sentence stating the working hypothesis of the family's lineage-current. The remaining 4 passes will earn or revise this.)*

### Part 2 — Past-Life Karma and Family Doshas (Pitru Vichara)

#### 2.1 Rahu-Ketu Axis Across All Five
*(For each member: Rahu's nakshatra + house (this-life karmic direction); Ketu's (past-life mastery). Look for cross-resonances — when one member's Rahu sits in another's Ketu position, that pair carries explicit past-life karmic continuation. State each pair-wise resonance briefly.)*

#### 2.2 Pitru Dosha Across the Family
*(THE keystone subsection of Pass α for a family. Pitru Dosha (Surya afflicted by Rahu/Shani, OR 9th-lord afflicted, OR family-malefic pattern) is the most important family-level dosha to detect. For each member, state Pitru-Dosha status. When 3+ members of a family carry Pitru Dosha, the family carries a SHARED ancestral karma that must be remediated collectively (joint Tarpana, joint pilgrimage to Pitru-tarpana sthala). Name plainly which members carry it.)*

#### 2.3 Other Family-Affecting Doshas
*(Check each member for: **Mangal Dosha** (affects marriage prospects of unmarried members), **Kala Sarpa Dosha** (intensifies family karmic-pattern), **Guru Chandala Dosha** (affects dharma-transmission across generations), **Shrapit Dosha** (Shani-Rahu, indicates old curse-pattern in the family line). State each member's dosha-state.)*

#### 2.4 The 12th-Bhava as Lineage-Karma Indicator
*(For each member, what graha occupies the 12th and what the 12th-lord's condition is. The 12th carries unfinished karma from prior generations. When members of the family share a 12th-lord (e.g., 3 members have Shani as 12th-lord), the family is collectively working through Saturn-flavored ancestral karma in this lifetime.)*

End Pass α. Pass β will focus on the Root-Pair (positions 1+2) — the family's anchor.

## pass-beta-template-l1-l3

You are running Pass β of the family-penta Kundali reading for {{subject_names}}. Pass α has established the lineage karma field. This pass focuses on the **Root-Pair** (positions 1+2) — typically the parents or anchoring elders.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in classical Vedic jyotishi voice. Pass β is a mini Kundali-Milan of the root-pair, treating them as the anchoring couple inside the family-field.

### Prior pass output
{{prior_pass}}

### Subject roster
{{subject_roster}}

### Overlay rules
{{overlay_summary}}

### Bridge mandates
{{bridge_mandates}}

---

### Produce this pass — exact structure

### Part 3 — The Root-Pair as the Family's Anchor

#### 3.1 Root-1 and Root-2 — Core Chart Summary
*(For each of the two roots: Lagna and Lagnesh, Chandra Rashi and condition, Surya condition, Atmakaraka, Darakaraka. The two roots' joint signature determines the kind of household this family runs.)*

#### 3.2 Root-Pair Ashtakoot (Guna Milan)
*(Compute the classical 36-point Ashtakoot for the root-pair (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi). Interpret. This is the headline-compatibility score for the parental anchor. A high score means the family has a stable structural foundation; a low score means the family has been operating with active maintenance.)*

#### 3.3 Root-Pair's 7th-Bhava Cross-Overlay
*(For each root: 7th-bhava sign and lord. Then the cross-overlay — who occupies whose 7th. This reveals whether the parents operate primarily as a romantic partnership, primarily as co-anchors of the lineage, or both.)*

#### 3.4 The Roots' Dasha Overlap — Past, Present, Next 15 Years
*(The Vimshottari Mahadasha sequences of root-1 and root-2 plotted against each other. Where the roots' dashas overlap in expansion-current simultaneously, the family enjoyed/will-enjoy generative windows. Where divergent, the family-field tilted/will-tilt toward whichever root is in expansion. Walk through the past 5 years briefly (to confirm the chart's reading against lived experience), then the next 10-15 years prospectively.)*

### Part 4 — What the Roots Inherited from Their Own Parents

#### 4.1 Each Root's Lineage Inheritance (Their Own 4/9/12)
*(Each root's own 4th-bhava (mother) and 9th-bhava (father) signatures. What each root carries IN from their own parents that they are now transmitting through THIS family. The penta-field is layered with the prior generation above this one.)*

#### 4.2 The Family Wealth (Joint 2nd-Bhava Across the Roots)
*(Each root's 2nd-bhava (family wealth, accumulated treasury). When both roots have strong 2nd-lord, the household has natural wealth-stability. When weak, wealth-flow needs active management.)*

#### 4.3 The Family Property (4th-Bhava as Sukha)
*(Each root's 4th-bhava (immovable property, the home). State the household's property-trajectory: stable home, mobile, expansion-oriented, ancestral-property-holder, etc.)*

#### 4.4 The Family Dharma (9th-Bhava as Bhagya)
*(Each root's 9th-bhava (dharma, fortune, ancestral wisdom). State the dharma-current the roots carry: religious, scholarly, charitable, public-service, business-dharma, etc. This is what they transmit to the branches.)*

End Pass β. Pass γ will focus on each of the three branches individually.

## pass-gamma-template-l1-l3

You are running Pass γ of the family-penta Kundali reading for {{subject_names}}. Passes α-β have established the lineage karma field and the root-pair anchor. This pass reads the **three branches** (positions 3, 4, 5) individually — what each carries from the roots, what each contributes that the roots don't, and where each will autonomously depart from the family-current.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in classical Vedic jyotishi voice. Each branch is a Janma-Kundali in its own right, read in the context of the root-anchor.

### Prior pass output
{{prior_pass}}

### Subject roster
{{subject_roster}}

### Overlay rules
{{overlay_summary}}

### Bridge mandates
{{bridge_mandates}}

---

### Produce this pass — exact structure

### Part 5 — Branch 1 (Position 3)

#### 5.1 Branch 1's Core Chart Summary
*(Lagna and Lagnesh, Chandra Rashi and nakshatra, Surya condition, Atmakaraka. State this branch's personal life-pattern.)*

#### 5.2 Branch 1's Lineage-Resonance with the Roots
*(How does this branch's Lagna, Chandra, or Atmakaraka resonate (or diverge) with root-1 and root-2? Does branch 1 share Chandra-nakshatra with a parent (powerful karmic-emotional inheritance)? Does branch 1's Atmakaraka match the root-pair's dominant graha?)*

#### 5.3 Branch 1's Career and Marriage Outlook
*(Branch 1's 10th bhava (career), 7th bhava (marriage), 5th bhava (children if applicable). Brief outlook — when career opens, when marriage is timed by Vimshottari, what kind of spouse the chart attracts.)*

#### 5.4 Branch 1's Doshas and Their Inheritance Pattern
*(Branch 1's dosha-state (Mangal, Kala Sarpa, Pitru, etc.). Where Branch 1's doshas mirror a root parent's doshas, the lineage-karma is being passed down — name the inheritance.)*

#### 5.5 Branch 1's Autonomous Direction
*(Where Branch 1 is structurally configured to DEPART from the family-current — a different Atmakaraka, a different dharma-direction (9th-bhava), or an opposite Rahu-Ketu axis. This is where Branch 1 brings something the family hasn't carried before. Honest naming.)*

### Part 6 — Branch 2 (Position 4)

*(Same 5-subsection structure as Branch 1: Core Chart Summary; Lineage-Resonance; Career/Marriage Outlook; Doshas and Inheritance; Autonomous Direction.)*

#### 6.1 Branch 2's Core Chart Summary
#### 6.2 Branch 2's Lineage-Resonance with the Roots
#### 6.3 Branch 2's Career and Marriage Outlook
#### 6.4 Branch 2's Doshas and Their Inheritance
#### 6.5 Branch 2's Autonomous Direction

### Part 7 — Branch 3 (Position 5)

*(Same 5-subsection structure for Branch 3.)*

#### 7.1 Branch 3's Core Chart Summary
#### 7.2 Branch 3's Lineage-Resonance with the Roots
#### 7.3 Branch 3's Career and Marriage Outlook
#### 7.4 Branch 3's Doshas and Their Inheritance
#### 7.5 Branch 3's Autonomous Direction

### Part 8 — The Branches as a Sibling-Trio (the 3rd-Bhava Triangle)

#### 8.1 Cross-Resonance Among the Three Branches
*(How the three branches resonate with each other beyond the parental anchor. Do branches 1 and 2 share Chandra-nakshatra? Do branches 2 and 3 carry compatible Atmakarakas? Where does the sibling-triangle have natural cohesion, and where friction?)*

#### 8.2 The Eldest-Branch Role
*(In classical jyotisha, the eldest sibling (position 3 here, typically) often carries a leadership-role for the cohort. State whether Branch 1's chart confirms or contradicts that eldest-leader pattern.)*

#### 8.3 Sibling-Yogas and Sibling-Doshas
*(Where any of the three branches' 3rd-bhavas couple to produce sibling-yogas (mutual support) or sibling-doshas (rivalry, distance). Name plainly.)*

End Pass γ. Pass δ closes with the family as joint operative + shadow + remedies.

## pass-delta-template-l1-l3

You are running Pass δ of the family-penta Kundali reading for {{subject_names}}. Passes α-γ have established the lineage field, the root-pair, and the three branches. This pass synthesizes the **family-as-one operative** + the **family shadow**, and prescribes **collective family remedies**.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in classical Vedic jyotishi voice.

### Prior pass output
{{prior_pass}}

### Subject roster
{{subject_roster}}

### Overlay rules
{{overlay_summary}}

### Bridge mandates
{{bridge_mandates}}

---

### Produce this pass — exact structure

### Part 9 — The Family as One Joint Operative

#### 9.1 The Family's Joint Atmakaraka
*(Across all 5 members, which graha appears most often as Atmakaraka or strong-aspecting Atmakaraka? That graha is the FAMILY-FIELD's joint soul-significator. The family is structurally configured around that graha's archetypal current — name what that means for the family's collective dharma.)*

#### 9.2 The Five-Way Pancha Bhuta Coverage
*(Tabulate planet-counts in fire/earth/air/water rashis for all 5 members. State the family-level element coverage: which element is dominant (often a household pattern — earth-heavy = property-and-stability-focused; fire-heavy = ambitious-and-volatile; etc.), which element is missing (must be sourced externally, often through specific household practices, foods, or environment).)*

#### 9.3 The Family's Joint Career and Wealth Vector
*(Look across all 5 members' 10th-bhava signatures + 2nd/11th bhava signatures. State the family's collective career-trajectory and wealth-pattern: is this an entrepreneurial-family, a service-family, a scholarly-family, a creative-family? What kind of joint enterprise or shared income-pattern does the family chart prescribe?)*

#### 9.4 The Family Dharma Across 16-20 Years
*(By the time the longest current dasha matures across the 5 members (~16-20 years out), what visible artifact in the world will the family have produced — a household, a community-node, a charity, a business, an intellectual-or-spiritual lineage-contribution? Be specific.)*

### Part 10 — The Family Shadow (Honest Naming)

#### 10.1 The Shared Affliction
*(Where 3+ members share an affliction pattern — Pitru Dosha across the line, a debilitated Chandra-pattern (mood instability across generations), a Mangal-affliction pattern (marital friction recurring), a Shani-pattern (chronic-discipline-burden), or a recurring 6/8/12-current. Name plainly. The shadow is part of the family's truth, not its disqualification.)*

#### 10.2 The Generational Karma Specific to This Family
*(What soul-debt is this family-line working through this generation? When the roots inherited a specific karmic pattern and the branches carry mirror-patterns, that's the generational karma needing remediation. State it specifically. This is what the family is here to transmute — and the remedies in 11 are aimed at it.)*

#### 10.3 Where Each Member Carries Part of the Family Burden
*(Across the 5 members, how is the family burden distributed? Often one member carries the lion's share of the Pitru-karma, another carries the marital-friction load, etc. Name plainly who carries what — this is not blame, it's structural honesty.)*

### Part 11 — Family Remedies (Joint Upaya)

#### 11.1 Joint Pitru Tarpana
*(If Pitru Dosha is present in 2+ members, the family performs joint Pitru Tarpana — water-offering for ancestors during Pitru Paksha (dark half of Bhadrapada). The eldest male of the family leads; all adult members participate. The Tarpana includes naming the family lineage (Gotra-Pravara) and offering pinda (rice-balls) to seven generations of ancestors. Recommend the family priest to perform this OR provide step-by-step householder protocol.)*

#### 11.2 Joint Family Devta Worship
*(Identify the family's Kula-devta (clan deity) and Ishta-devta (chosen deity) — if known. If not, the family can adopt a unifying deity based on chart-evidence (Hanuman for Mangal-burdened families, Shiva-Parvati for marital-stability-need, Vishnu for dharma-transmission, Devi-Lakshmi for wealth-flow, Saraswati for scholarly families). Prescribe weekly + monthly + annual family-deity worship with specific mantras and offerings.)*

#### 11.3 Individual Member Remedies (Brief)
*(For each member who carries a specific dosha or weak graha, prescribe the classical individual remedy (mantra + gemstone + day + donation). Keep concise — each member gets a 3-5 line prescription.)*

#### 11.4 Joint Family Vratas and Pilgrimages
*(The family observes together: Akshaya Tritiya (auspicious new beginnings), Diwali Lakshmi Puja (joint household wealth-invocation), Karva Chauth or Vata-Savitri (for marital pairs in the family), Satyanarayan Puja annually. For Pitru-affected families, a joint pilgrimage to Gaya (the classical Pitru-tarpana sthala) is the most powerful collective remedy — recommend timing within the next 3-5 years.)*

#### 11.5 The Household Altar and Yantras
*(Prescribe a household altar arrangement with the family-deity at center, surrounded by graha-yantras for the planets most-needing-remediation across the 5 members. Energization protocol: amavasya or new-moon day, by the family priest or eldest, with the appropriate mula-mantras.)*

End Pass δ. Pass ε closes with the Generational Timeline and Final Guidance.

## pass-epsilon-template-l1-l3

You are running Pass ε — the closing Generational-Timeline and Final-Guidance pass — of the family-penta Kundali reading for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in classical Vedic jyotishi voice. This pass produces the multi-generational Vimshottari timeline across all 5 members for the next 20-30 years, and closes with family-level Final Guidance.

### Prior pass output
{{prior_pass}}

### Subject roster
{{subject_roster}}

### Overlay rules
{{overlay_summary}}

### Bridge mandates
{{bridge_mandates}}

---

### Produce this pass — exact structure

### Part 12 — The Generational Timeline (Vimshottari Across All 5)

#### 12.1 Multi-Member Dasha Map for the Next 20-30 Years
*(THE keystone subsection of Pass ε. For each member, list their current Mahadasha + next 2 MDs with date ranges. Then narrate the family-level pattern, decade by decade:*

*— **2026-2035 (decade ahead):** Each member's MD-state during this decade. The KEYSTONE family-windows: when 3+ members are in expansion-MDs simultaneously, the family will have collective generative windows (good time for major moves — weddings, property, joint ventures). When 3+ are in contraction-MDs (Shani, debilitated grahas, malefic AD), the family enters a consolidation-decade.*

*— **2036-2045 (next decade):** Same analysis. Identify the major life-events likely: branch-marriages (when 7th-lord dashas run for branches), branch career-launches (10th-lord dashas), root-retirement or transition phases, possible elder-passing windows (if 8th-bhava signatures activate for roots).*

*— **2046+:** The decade where the branches mature into their adult dharma-current. The family-field reconfigures — branches become autonomous, roots become elder-witnesses, and the next-generation children (grandchildren of the roots) often enter the field.*

*Be specific about ages and life-stage transitions across the 5 members.)*

#### 12.2 The Major Family Events Likely in Each Window
*(For each major MD-transition across any member, name the family-event likely:*
*— Marriage of Branch 1 around year-Y during their Shukra-AD*
*— Career-peak for Root-1 around year-Z during Guru-MD*
*— Sade Sati for Root-2 from year-Q1 to year-Q2 (Shani transit over Chandra) — a 7.5-year consolidation phase that affects the entire household*
*— Possible 8th-bhava activity for Root-1 around year-X — requires foresight and joint remedy*

*Be honest. Don't invent events that the chart doesn't actually indicate.)*

#### 12.3 Sade Sati Windows Across the Family
*(For each member, identify any Sade Sati (Saturn-transit-over-Chandra) windows in the next 30 years. The Sade Sati is a 7.5-year discipline-and-consolidation phase. When multiple members' Sade Satis overlap or sequentially-chain, the family carries a multi-generational Saturn-current that shapes 10-15 years of the family's life. State each member's Sade Sati timing and what the household should expect.)*

### Part 13 — Final Guidance for the Family

#### 13.1 The Family's Core Strength
*(2-3 paragraphs. Name the strongest yoga across the 5 charts, the strongest dharma-line (the 9th-bhava current across the family), the strongest blessing-current available across the next 20 years. What does this family DO BEST when it is operating in its dharmic-truth?)*

#### 13.2 The Family's Key Vulnerability
*(2-3 paragraphs. Name the family's most-significant generational karma (named in Pass δ), the most-vulnerable member-pair, the most-likely-to-fragment window in the timeline. Honest, specific. Tied to the remedies prescribed.)*

#### 13.3 The 20-Year Mature Form of the Family
*(One paragraph. What this family will have built across 20 years — property, lineage-transmission, joint dharma, branch-marriages and grandchildren, charitable or community contribution. Specific.)*

#### 13.4 The One Practice That Holds the Family Together
*(One paragraph. The single family-level practice — usually a weekly puja, an annual pilgrimage, or a daily lamp-lighting at the household altar — that, if held faithfully across all 5 members, lets the family's blessings ripen and the doshas neutralize across generations.)*

#### 13.5 Blessings for Each Member (Ashirvada)
*(Close with a traditional jyotishi's blessing for the family as a whole + one specific blessing for each of the 5 members. Invoke the family's Kula-devta (or recommend one if unknown) for the household's wellbeing across the dasha cycles ahead.)*

End Pass ε. The full 5-pass family-penta Kundali reading is now complete.

## overlay-rules

For family-penta mode:
- **Vimshottari (weight 2.0):** the highest-foregrounded — the family-field's operational calendar IS the 5-way dasha overlap matrix.
- **Panchanga (weight 1.5):** secondary foreground — the day-of-pivot panchanga across multiple members carries lineage-current.
- **Tarot (weight 1.5):** the joint Major Arcana stack names the family's archetypal-current.
- **Gene Keys (weight 1.5):** the codon ring + spheres-of-purpose overlay — the literal genetic-archetypal transmission signature.
- **Human Design (weight 1.0):** baseline — used in the joint center-definition analysis but not foregrounded.
- **Nadabrahman (weight 1.0):** baseline — sound/syllabic resonance can carry lineage-current.
- **I-Ching (weight 0.5):** background.
- **Biorhythm / Face-Reading / Sigil-Forge (< 1.0):** background unless specifically signaling lineage.

**House overlay:**
- **4 (root, mother, ancestral home):** primary lineage anchor.
- **9 (dharma, father, ancestral wisdom):** secondary lineage anchor.
- **12 (the imperishable, lineage karma):** what comes through from before.
- **5 (creative offspring, children, generation forward):** what the field generates.
- **2 (family resources):** the substrate.
- **3 (siblings, cohort):** the branches-as-siblings architecture.

## glossary

- **Lineage-house axis** — the 4/9/12 house cross-overlay that carries the family's karma. Where 4 (root) and 9 (dharma) meet, the family's structural lineage-current lives.
- **Root-pair** — the two anchoring members of the family-field (positions 1+2). The branches inherit, contribute, and depart from this anchor.
- **Pitru karaka** — the soul-significator of the paternal/ancestral lineage. In Jaimini, the 4th-from-Atmakaraka karaka graha.
- **Generational nakshatra pattern** — when 2+ family members share a nakshatra or its pada-pair, the family carries a generational nakshatra signature.
- **The dispersal IS the maturation** — anti-dependency for a family-field means each member becoming a complete instrument. The field matures by structurally completing its own dispersal, not by perpetuating dependence.
- **Codon ring of the family** — when the family's Gene Keys spheres activate consecutive codons in a ring, the family carries a coherent genetic-archetypal transmission current.

## interactions

For the interactive HTML output:
- **Click a member vertex** in the pentagon SVG → that member's contribution-to-field section (`<section data-member="N">`) auto-scrolls into view; the vertex gets a stroke-width emphasis; the lineage-house glyph ring (IV · IX · XII) faintly glows for 2.5 seconds.
- **Hover the root-pair shared inner-arc** → tooltip displays the root-field summary (uses `document.body.dataset.bridgeMandate` for the rotating text).
- **Toggle a vertex's spotlight** by clicking it again — restores all vertices to baseline emphasis.

## lessons

*(No autoresearch passes yet. First Pass 6 entry (#57) will land here per the autoresearch contract — variant axis: Pass α lineage-current strength (4th vs 9th vs 12th house emphasis combinations); mode-specific judge axis: "lineage-current legibility".)*
