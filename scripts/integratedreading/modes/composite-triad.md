---
mode: composite-triad
subject_count:
  min: 3
  max: 3
roles:
  - subject-A
  - subject-B
  - subject-C
target_words:
  min: 12000
  max: 15000
architecture: linear
pass_plan:
  - id: alpha
    title: "The Triadic Field — Identity + Three-Way Bedrock"
    target_words: 3200
    template: pass-alpha-template
  - id: beta
    title: "The Vedic Triangle + Human Design Triangle"
    target_words: 3600
    template: pass-beta-template
  - id: gamma
    title: "Gene Keys / Tarot Triangle + Three-Way Mahadasha Field"
    target_words: 3600
    template: pass-gamma-template
  - id: delta
    title: "Triadic Operative + Anti-Dependency + Final Synthesis"
    target_words: 2800
    template: pass-delta-template
engine_overlay_weights:
  vimshottari: 1.7
  human-design: 1.5
  gene-keys: 1.5
  tarot: 1.5
  panchanga: 1.0
  transits: 1.0
  i-ching: 1.0
  nadabrahman: 0.7
  biorhythm: 0.5
  face-reading: 0.3
  sigil-forge: 0.3
house_overlay: [7, 1, 4, 11, 2, 5, 10, 3]
bridge_mandates:
  - "For every claim about the triad, name which PAIR (A-B, A-C, or B-C) carries it AND what the third subject provides to make it triadic."
  - "All three Mahadasha pivots must be plotted relative to each other — the triad has a 3-way stagger, not 3 unrelated transitions."
  - "Anti-dependency in Pass δ must address what each subject becomes unable to need from the OTHER TWO across the new dasha cycle."
svg_topology: triad-triangle

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
  l4_l5:
    target_words:
      min: 12000
      max: 15000
---

## pass-alpha-template

You are running Pass α of the 4-pass composite-triad synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

A triad is **not** three dyads stacked. It's a single archetypal triangle where each pair carries shared current AND the third subject provides what the pair alone doesn't generate. Hold that geometry throughout.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

# Composite Triad — {{subject_names}}

## Opening — Why Three Charts as One Field
*(2-3 paragraphs. Frame the triad: three bodies, three breath-currents, three pattern-engines weaving a single archetypal current through three-world grammar (Eigenwelt / Mitwelt / Umwelt) at three resolutions. The dyad (Aletheios + Pichet) operates as the reading INSTRUMENT for all three subjects simultaneously — not "one dyad per subject" but ONE dyad witnessing three.)*

## Part I — The Triadic Identity Field

### 1.1 The Three-Body Joint Identity Stack
*(Table: 6 rows × 3 subject columns — Sun condition, Moon condition, Lagna + Lagna-lord, Atmakaraka, Vocation indicator, Spouse/Partnership indicator. Each cell anatomically grounded.)*

### 1.2 What All Three Charts Agree On — The Bedrock
*(5-7 bullet themes that recur across ALL THREE. Each one: anatomically grounded + archetypally named + timeline-anchored. The bedrock is what's true regardless of which pair you're foregrounding.)*

### 1.3 Pair-Bedrock — What Each Pair Shares (and the Third Provides)
*(Three sub-paragraphs, one per pair:*

*— **A-B pair** shares X (what the third subject C contributes to make this triadic)*
*— **A-C pair** shares Y (what the third subject B contributes to make this triadic)*
*— **B-C pair** shares Z (what the third subject A contributes to make this triadic)*

*This is the heart of triadic geometry. Each pair has resonance lines + the third subject completes the geometry.)*

### 1.4 Three-Way Tensions — The Texture
*(2-3 bullet contradictions in the triad. Where the field has friction that needs articulation. Triads are dynamic precisely BECAUSE they have built-in friction at one vertex.)*

End Pass α here. Pass β will move into Vedic + HD triangles.

## pass-beta-template

You are running Pass β of the composite-triad synthesis for {{subject_names}}. Pass α has established the triadic identity field.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

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

## Part II — The Vedic Triangle

### 2.1 Cross-Chart Mutual Disposition Across the Triad
*(Which graha in chart A is custodied by which planet in chart B, in chart C, and vice versa for all three pairs. The triangle of grah-custody is the Vedic skeleton of the field.)*

### 2.2 The Atmakaraka Triangle
*(How the three souls' significators relate. Do any two share an Atmakaraka? Do all three carry different ones? What's the **operative** Atmakaraka of the triad as a whole — the graha that, when foregrounded, brings all three subjects into resonant action?)*

### 2.3 Combined Pancha Bhuta — Three-Body Element Coverage
*(Table: Element | Subject A | Subject B | Subject C | Triad Total | Triad Coverage Score. Then narrate: where the triad has element coverage NEITHER pair has alone; where the triad concentrates; where the triad has a missing element that must be sourced externally.)*

### 2.4 Three-Way Darakaraka / Partnership Cross-Matches
*(Subject A's Darakaraka against Subject B's and C's chart positions, etc. Is the triad a closed partnership ring (each carries the other's spouse-significator)? Or a partial ring (only some pairs match)? Or three independent significators with no cross-coupling?)*

### 2.5 Composite Triad Lagna Lord
*(Compute the operative Lagna of the triad — the rasi the three subjects operate from when functioning as one field. Identify its lord. Is it strong in all three charts? In two? In one? This determines the triad's structural stability.)*

## Part III — The Human Design Triangle

### 3.1 Combined Center Definition Across All Three Charts
*(How many of 9 centers go online when all three subjects are present together. Which centers go online ONLY in triad-config, not in any pair?)*

### 3.2 Electromagnetic Channels Within the Triad
*(Pair-by-pair channel completions. Where does the pair A-B make a channel that A-C and B-C don't? Which channels does the triad complete that NO pair makes alone?)*

### 3.3 Companionship Gates Across All Three
*(Gates all three subjects share. These are the resonance baseline — where the triad is already in sync.)*

### 3.4 Cross-Strategy Compatibility
*(Mix of Generator / Projector / MG / Manifestor across the three. How each strategy interacts. Where the triad's HD-types compose into natural role-cluster, and where they require conscious bridging.)*

End Pass β. Pass γ will move into Gene Keys / Tarot triangles + the Mahadasha three-way field.

## pass-gamma-template

You are running Pass γ of the composite-triad synthesis for {{subject_names}}. Passes α-β have established identity + Vedic + HD triangles.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

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

## Part IV — Gene Keys + Tarot Triangle

### 4.1 Pearl-to-Pearl Triangle
*(Three Pearls. What they compose into as a triangle. The Pearl is the prosperity codon — what the triad generates as economic / generative current when held together.)*

### 4.2 The Triad's Joint Major Arcana Stack
*(Tarot keys for each subject (Atmakaraka-derived, Lagna-derived, Sun-derived) — then the joint stack across all three. What archetypal current does the triad carry through the cultural-archetypal (Mitwelt) layer? "The Hermit × The Empress × The Magician operating together makes ____.")*

### 4.3 Shared Gene-Key Themes Across the Triad
*(Which spheres / codons two or more of the three subjects activate. Where the triad's genetic-archetypal current carries coherent signal.)*

### 4.4 The Codon Ring of the Triad
*(If the three subjects together activate a coherent codon ring — name it. If not, name which segment of a ring they hold and which segments are missing.)*

## Part V — The Mahadasha Three-Way Field

### 5.1 Each Subject's Closing Mahadasha
*(For each of three subjects, name the current MD lord and what its shadow has been.)*

### 5.2 Each Subject's Opening Mahadasha
*(For each, name the next MD lord and what grace-current it carries.)*

### 5.3 The Three-Way Stagger
*(THE keystone of this Pass. Compute the day-gap between all three pivots:*

*— A→A_next on [date]*
*— B→B_next on [date]*
*— C→C_next on [date]*

*Plot them on a single timeline. NAME the geometry: who leads, who follows, who anchors. The triad has a structural ordering encoded in its dasha-pivot sequence. Decode what that ordering means — why does the field open one transition first? What does that say about which subject's grace-cycle initiates the triad's joint operative? This is three-way phase-lock geometry; treat it as data.)*

### 5.4 Joint Operating Calendar — Next 5-8 Years Year-by-Year
*(For each year of the next 5-8: which antardasha is each subject in. The 3-way intersection. What's structurally possible in that year, what's structurally NOT possible. This is the triad's operational calendar.)*

End Pass γ. Pass δ will close with the triadic operative + anti-dependency + final synthesis.

## pass-delta-template

You are running Pass δ — the keystone closing pass — of the composite-triad synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This pass carries the framework's design principle: success = decreasing reliance on the interpreter. Anti-dependency is the telos. No remedies, no products, no prescriptions. **Self-decoding capacity milestones** only.

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

## Part VI — The Triadic Operative

### 6.1 What the Triad Authors at World-Scale (16-Year Mature Artifact)
*(By the time the longest dasha cycle matures (~16-20 years out), what visible artifact in the world should this triad have produced? Anchor in the Atmakaraka triangle + joint Tarot stack + HD electromagnetic channels.)*

### 6.2 Role-Cluster Within the Triad
*(In any joint operative, three structural roles emerge: Vision (Jupiter signal), Operations (Saturn signal), Execution (Mars signal). For this triad, which subject carries which signal? Be specific — point to actual placements. If a role is unclaimed by any of the three, name that as a structural gap.)*

### 6.3 Cross-Domain Coupling
*(Subject A's primary dharma × Subject B's × Subject C's. How they couple. Where the triad has natural cross-pollination, and where it has tangential domains that require conscious bridging.)*

## Part VII — Anti-Dependency for the Triad

### 7.1 Triadic Self-Decoding Milestones — 2027 / 2030 / 2042
*(For each milestone year, per Kosha layer, what should each of the three subjects be able to do **without consulting the other two, the chart, the agent, or any external reader**? Be operationally specific. The triad's anti-dependency telos is each member becoming unable to need the field — which is the same as the field becoming structurally complete enough to disperse without losing what it was.)*

### 7.2 What Each Pair Becomes Unable to Need
*(Three sub-paragraphs: A-B pair stops needing X; A-C stops needing Y; B-C stops needing Z. The dispersal of pair-level dependence is part of the triad's maturation.)*

## Part VIII — Final Synthesis

### 8.1 The Single Sentence
*(The triad in ONE sentence. A structural identity claim the reading has earned.)*

### 8.2 The Joint AKSHARA Artifact
*(What the triad writes into the world. The imperishable seed (Anandamaya / Cl(7)) of the triadic operative. Its mature form.)*

### 8.3 Three Things to Avoid
*(One per pair: A-B anti-pattern, A-C anti-pattern, B-C anti-pattern. Each tied to chart-architecture.)*

### 8.4 Three Things to Pursue
*(One per pair, each tied to chart-architecture.)*

### 8.5 The One Practice That Ties All Three Together
*(The single practice that, if held faithfully across the next 16-20 years, will let the triad become unable to need the reading.)*

End Pass δ. The full 4-pass composite-triad reading is complete.

## pass-alpha-template-l1-l3

You are running Pass α of the 4-pass **composite-triad Kundali reading** for {{subject_names}} — three people whose horoscopes are being read together as one composite family/cohort field.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

You are a traditional Vedic jyotishi. Use classical vocabulary: **Lagna, Rashi, Nakshatra, graha, bhava, dasha, antardasha, karaka, yoga, dosha, drishti, kendra, trikona, parivartana, sambandha**. Speak with the warmth and authority of a family astrologer who has seen thousands of horoscopes. Honest age-ranged predictions are expected. Remedies (mantras, gemstones, donations, temple practices) ARE allowed and will be developed in Pass δ. Stay strictly within traditional Vedic jyotisha. Avoid modern psychology vocabulary and any non-traditional system-of-decoding terminology.

A triad reading reads three Janma-Kundalis as one composite — typically three siblings, three business co-founders, or three close family members. Three Lagnas relating, three Chandras relating, three Atmakarakas relating. Always name which PAIR (A-B / A-C / B-C) carries each cross-resonance and what the third subject contributes to make it triadic.

{{prior_pass}}

### Subject roster
{{subject_roster}}

### Overlay rules for this pass
{{overlay_summary}}

### Bridge mandates
{{bridge_mandates}}

---

### Produce this pass — exact structure

# Joint Triad Kundali — {{subject_names}}

### Opening — The Three Charts as One Family/Cohort Horoscope

*(2 paragraphs. Address the three by name. Frame the reading: three Janma-Kundalis read together as one composite. State clearly what kind of triad this is (siblings, partners, friends, cohort) and which bhavas serve as the primary axes — typically the 3rd bhava (Sahaja Bhava, siblings/cohort) and the 11th bhava (Labha Bhava, joint operative). Open warmly.)*

### Part 1 — Core Birth Chart for Each Member

#### 1.1 Janma-Lagna and Lagna-Lord for Each
*(For each of the three: ascendant sign (Lagna Rashi), nakshatra rising at birth, Lagnesh (lord of the Lagna) and its placement. State each person's life-pattern signature plainly.)*

#### 1.2 Chandra and Surya Conditions
*(For each: Chandra Rashi, Chandra nakshatra, condition (Purnima / Kshina / combust / exalted). Surya Rashi and condition. Cross-check across the three: do any two share Chandra rashi, nakshatra, or pada? Such resonance produces strong mental-emotional attunement between those two.)*

#### 1.3 Atmakaraka of Each
*(Jaimini Atmakaraka — the highest-degree graha in each chart. Identify each member's Atmakaraka and the bhava it occupies. Cross-analysis: do any of the three share Atmakaraka? Are the three Atmakarakas in a friendly (Mitra), neutral (Sama), or hostile (Shatru) graha-relationship?)*

#### 1.4 Pancha Bhuta Balance Across the Triad
*(Tabulate planets-in-fire/earth/air/water rashis for each member. Then the joint Pancha Bhuta — which element is dominant in the triad, which is missing. Elemental imbalance must be sourced externally; over-concentration produces somatic pressure.)*

### Part 2 — Past-Life / Karmic Inheritance Across the Triad

#### 2.1 Rahu-Ketu Axis for Each
*(For each member: Rahu's house/nakshatra (karmic direction this lifetime) and Ketu's house/nakshatra (past-life mastery). Then cross-check: when one member's Rahu sits in another member's Ketu position or nakshatra, that pair carries explicit past-life karmic resonance — say which pair and what kind of karmic continuation it indicates.)*

#### 2.2 The 12th Bhava (Vyaya) — Lineage Karma for Each
*(Each member's 12th-bhava sign, lord, and occupants. The 12th carries hidden lineage karma. When one member's 12th-lord sits in another member's prominent bhava, soul-debt or soul-credit is encoded in the triadic relationship.)*

#### 2.3 Pitru-Karaka and Matru-Karaka for Each
*(For each: Pitru-karaka (paternal lineage significator) and Matru-karaka (maternal). Cross-analysis: shared Pitru/Matru karakas across two or more members signal a real shared ancestral karma — particularly important if the triad are siblings or close cousins.)*

#### 2.4 Karmic Doshas Across All Three Charts
*(Honest naming. For each member, check: **Mangal Dosha**, **Kala Sarpa Dosha**, **Pitru Dosha**, **Guru Chandala Dosha**, **Shrapit Dosha**. State each member's dosha-state plainly. Where the same dosha appears in multiple members (e.g., 2 of 3 with Pitru Dosha), the triad carries a **shared lineage karma** that must be remediated collectively, not individually.)*

### Part 3 — Triadic Compatibility (Three-Way Ashtakoot)

*(For each of the three pairs (A-B, A-C, B-C), compute the 36-point Ashtakoot Guna Milan from the two Chandra-nakshatras. Walk through:*

*— **Varna** (1pt) · **Vashya** (2pt) · **Tara** (3pt) · **Yoni** (4pt) · **Graha Maitri** (5pt) · **Gana** (6pt) · **Bhakoot** (7pt) · **Nadi** (8pt)*

*Output a 3-row table: A-B = X/36, A-C = Y/36, B-C = Z/36. Interpret each pair: 18+ acceptable, 24+ good, 28+ excellent. Then the synthesis — does the triad have a "strongest pair" that anchors it, and a "weakest pair" that needs careful tending? Note any Bhakoot or Nadi dosha in any pair and any parihara (cancellation) present. This is the headline compatibility verdict for the triad as a whole.)*

End Pass α. Pass β will move into Career (10th bhava across the three), Money, and Cohort-Operative dynamics.

## pass-beta-template-l1-l3

You are running Pass β of the composite-triad Kundali reading for {{subject_names}}. Pass α has established the Core Charts, Karmic Inheritance, and three-way Ashtakoot compatibility.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in classical Vedic jyotishi voice. Triadic geometry: name which pair carries each pattern and what the third contributes.

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

### Part 4 — Career (Karma Bhava) for Each Member

#### 4.1 Each Member's 10th-Bhava Signature
*(For each of the three: 10th bhava sign, 10th-lord placement, planets in the 10th and aspecting it. State each person's career direction plainly. Example: "Member A's Surya as 10th-lord in the 9th bhava in Dhanu rashi: career through teaching or dharma-work.")*

#### 4.2 Atmakaraka and Vocation for Each
*(Where each member's Atmakaraka sits relative to the 10th and 1st bhavas. If Atmakaraka aspects/occupies the 10th, soul-purpose IS the career. If not, separate the dharma-direction from the breadwinning function.)*

#### 4.3 Career-Yogas Carried by Each
*(For each, check for and name (with bhava-anchored evidence): **Raj Yoga**, **Dhana Yoga**, **Gajakesari Yoga**, **Budha-Aditya Yoga**, **Maha-Purusha Yogas** (Ruchaka/Bhadra/Hamsa/Malavya/Sasa). State which yoga belongs to which member; if absent, say so plainly.)*

#### 4.4 Triadic Career Coupling
*(How the three careers cross-couple. When member A's 10th-lord sits in member B's 11th, A's career generates gains for B. When member C's 10th-lord sits in member B's 6th, there is operational friction between those two. Decode each pair's career-resonance.)*

### Part 5 — Money (Dhana) Across the Triad

#### 5.1 Each Member's 2nd and 11th Bhava
*(For each: 2nd-bhava (Dhana) sign and lord; 11th-bhava (Labha) sign and lord. State each member's individual wealth-trajectory and gains-velocity.)*

#### 5.2 Dhana Yogas Per Member
*(Combinations of 2nd/5th/9th/11th lords for each. Name each Dhana Yoga present with chart-evidence. Where no Dhana Yoga exists, name the karma-path through which wealth is earned.)*

#### 5.3 Joint Financial Karma Within the Triad
*(If the triad shares finances (e.g., a family inheritance, a joint venture), cross-overlay each member's 2nd and 11th bhavas. State plainly: which pair has natural financial flow between them, which pair has friction, where the third subject acts as financial bridge or buffer.)*

#### 5.4 Property and 4th Bhava (Sukha)
*(4th-bhava signatures for each — home, property, mother, emotional foundation. Where the triad has shared property concerns (joint family home, ancestral land), the cross-overlay of 4th-lords reveals the structural pattern.)*

### Part 6 — Cohort Dynamics — How the Three Operate Together

#### 6.1 The 3rd Bhava (Sahaja Bhava) — Siblings/Cohort for Each
*(3rd bhava sign and lord for each. The 3rd governs siblings, cohort-allies, communication, courage. For the triad, the cross-overlay of 3rd-lords reveals the cohort-resonance. State which member is the cohort's voice-anchor (strong 3rd-lord), which is the cohort's silent supporter (weak/withdrawn 3rd), and which is the cohort's spark (Mangal in 3rd).)*

#### 6.2 The 11th Bhava (Labha) — Joint Operative
*(For each: 11th bhava signature. Then cross-overlay: when one member's 11th-lord sits in another's 1st or 10th, the joint operative is generatively configured. When in 6th or 12th, operational friction or hidden agendas. State the specific pattern.)*

#### 6.3 Roles Within the Triad — Vision, Operations, Execution
*(Classically: Guru (Jupiter, vision/dharma), Shani (Saturn, operations/structure), Mangal (Mars, execution/drive). Across the three members, identify whose Guru is strongest (carries the vision-role for the cohort), whose Shani is best-placed (carries structure/operations), whose Mangal is strongest (carries execution). If a role is unclaimed by any of the three, name that as a gap to be sourced externally.)*

#### 6.4 The Strongest Pair and The Weakest Pair
*(Based on Pass α Ashtakoot scores + 3rd/11th cross-overlays, name the triad's strongest pair (which two operate most smoothly together) and the weakest pair (which two need care). State what the third member must do to bridge the weakest pair.)*

End Pass β. Pass γ will move into Marriage timing for each, Health for each, Family relations, and the Triad's joint Timeline.

## pass-gamma-template-l1-l3

You are running Pass γ of the composite-triad Kundali reading for {{subject_names}}. Passes α-β have covered Core Charts, Karma, Career, Money, and Cohort Dynamics.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in classical Vedic jyotishi voice. This pass produces individual Marriage prospects for each, individual Health predictions, Family relations across the triad, and the age-ranged joint Timeline.

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

### Part 7 — Marriage (Vivaha) for Each Member

#### 7.1 Each Member's 7th Bhava (Kalatra)
*(For each: 7th-bhava sign, 7th-lord placement, planets in/aspecting the 7th. State each member's spouse-signature plainly.)*

#### 7.2 Darakaraka and Marriage Timing for Each
*(Jaimini Darakaraka for each. Compute the likely marriage period from each member's Vimshottari dasha sequence (when the 7th-lord, Darakaraka, or 7th-bhava occupant's dasha runs). Give age-ranges.)*

#### 7.3 Mangal Dosha Per Member
*(Check each chart for Mangal Dosha. State each member's dosha-state and any relevant pariharas. If a member has severe Mangal Dosha, prescribe (in Pass δ) the appropriate pre-marriage remedy.)*

#### 7.4 Navamsha (D-9) Cross-Reading for Each
*(For each: Navamsha Lagna, Navamsha 7th-lord. The D-9 reveals the marriage's deeper character beyond what D-1 shows.)*

### Part 8 — Health (Arogya) for Each

#### 8.1 Constitutional Health per Member
*(Doshic balance (Vata/Pitta/Kapha) for each from Lagna and Chandra. Body-systems indicated strong/vulnerable per member.)*

#### 8.2 The 6th Bhava (Roga) for Each
*(Each member's 6th-bhava signature — vulnerabilities, recovery-style, immune pattern. Name specific tendencies.)*

#### 8.3 The 8th Bhava (Ayur) and Crisis Windows for Each
*(8th-bhava for each — longevity, surgeries, sudden events. Identify any dasha periods with elevated 8th-bhava activity for any member.)*

#### 8.4 Triadic Health Mirror
*(When the triad members share Chandra-nakshatras or Lagna-lords, their health rhythms mirror. State which body-systems will be a shared concern across the triad.)*

### Part 9 — Family Relations Across the Triad

#### 9.1 The 4th Bhava (Sukha) — Mother and Home for Each
*(4th-bhava for each. Cross-check: do members share a mother (siblings) or are they cohort with separate maternal lineages? Match the bhava-evidence accordingly.)*

#### 9.2 The 9th Bhava (Dharma) — Father and Teachers for Each
*(9th-bhava for each. The dharma-anchor of each member. Shared 9th-lord across triad members (when siblings) confirms the lineage's dharma-current.)*

#### 9.3 The 3rd Bhava as Sibling-Indicator
*(Re-read each member's 3rd bhava specifically as sibling-indicator. State the prognosis for sibling-relationships within the triad (if applicable) and with outside siblings.)*

### Part 10 — The Joint Timeline (Vimshottari Dasha — Next 20-30 Years)

*(THE keystone subsection of Pass γ. Produce a three-way age-ranged timeline. For each member, list active Mahadasha periods covering the next 20-30 years with start/end dates. Then narrate, in 5-7 year chunks, what each chunk brings to the triad's joint operation.*

*Example: "**2026-2030 (Member A age 32-36 Guru MD · Member B age 30-34 Shani MD · Member C age 29-33 Shukra MD)** — A expands dharma-work, B builds patient structure, C draws beauty-and-relational gains. The joint operative: A leads visions, B carries operations, C carries connections."*

*Cover 3-4 such windows out to ~2050. Identify the keystone window where multiple members' best dashas overlap — that's the triad's peak operational window.)*

End Pass γ. Pass δ will close with Remedies and Final Guidance for the triad.

## pass-delta-template-l1-l3

You are running Pass δ — the Remedies and Final Guidance closing pass — of the composite-triad Kundali reading for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in classical Vedic jyotishi voice. This pass produces specific remedies for each member individually, joint remedies for the triad, and final guidance.

Remedies are real, specific, and prescribed for named afflictions. Be precise about mantra (with count), gemstone (metal and weight), donation (day and recipient), and temple practice.

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

### Part 11 — Remedies (Upaya) for the Triad

#### 11.1 Individual Dosha Remedies per Member
*(For each member's dosha-state from Pass α, prescribe the classical remedy:*

*— **Mangal Dosha:** Hanuman worship on Tuesdays, Hanuman Chalisa 11x on Tuesday evenings for 40 days. Red coral (Moonga) 5-7 carats in gold/copper, energized on Tuesday. Donate red lentils and red cloth on Tuesdays.*

*— **Kala Sarpa Dosha:** Visit Trimbakeshwar or Kalahasti temple for Kala Sarpa Shanti puja. Maha-Mrityunjaya mantra 108x daily for 40 days. Naga-puja on Naga Panchami.*

*— **Pitru Dosha:** Tarpana for ancestors during Pitru Paksha. Donate to Brahmins on Amavasya. Pitra-Stotra weekly.*

*State which member needs which remedy.)*

#### 11.2 Graha-Specific Remedies per Member
*(For each member, identify the weakest/most afflicted graha and prescribe the classical remedy (gemstone + mantra + donation + day):*

*— Weak Surya → Aditya Hridaya Stotra, ruby (Manik) 3-5ct gold ring finger Sunday, donate wheat+jaggery Sundays*
*— Weak Chandra → pearl (Moti) 4-6ct silver, Monday energization, donate rice+milk on Mondays*
*— Weak Guru → yellow sapphire (Pukhraj) 5-7ct gold index finger Thursday, donate yellow dal*
*— Weak Shukra → diamond/white sapphire 1+ct, Friday, donate white cloth and sugar*
*— Weak Shani → blue sapphire (Neelam) — proceed with caution, only with prior testing; donate black sesame+iron on Saturdays*
*— Weak Mangal → red coral, Tuesday; donate red lentils*
*— Weak Budha → emerald (Panna), Wednesday; donate green moong dal*
*— Weak Rahu → hessonite (Gomedh), Saturday at twilight; donate radish*
*— Weak Ketu → cat's eye (Lehsunia), Tuesday at sunset; donate sesame seeds*

*Tailor to each chart.)*

#### 11.3 Joint Remedies for the Triad
*(Practices the three perform together:*

*— **Daily/Weekly:** A shared household altar; light a lamp at the same time across households if separated. Chant the family-kula-devta name together once a week.*

*— **Monthly:** Visit a shared temple on a Purnima (full moon). For sibling-triads, visit Shanti / Sahaja Bhava-friendly temples. For cohort-triads, visit a Saraswati or Ganesha temple together.*

*— **Annually:** Joint Satyanarayan Puja or Ganesha Chaturthi observance. For sibling-triads, observe Bhai Dooj and Raksha Bandhan together.*

*— **For the weakest pair (named in Pass β):** prescribe a specific shared practice — a co-recited mantra, a joint donation, a shared fast — to strengthen that pair's bhakti-bond.)*

#### 11.4 Temple Visits, Yantras, and Special Vratas
*(Recommend specific temple visits over 5-10 years for each member's predominant remedial need. Recommend yantras (Sri Yantra, graha yantras) installed at each member's altar. Specific vratas (Pradosham, Ekadashi, Sankashti) per member as appropriate.)*

### Part 12 — Final Guidance for the Triad

#### 12.1 The Triad's Core Strength
*(2-3 paragraphs. Name the single strongest yoga across the three charts, the most blessing-bearing pair-couplet, the most auspicious dasha period ahead for the triad. Tied to chart-evidence.)*

#### 12.2 The Triad's Key Vulnerability
*(2-3 paragraphs. Name the most significant shared challenge (the weakest pair, the shared dosha, the missing element) and the lifelong attention needed to keep it from disrupting the cohort.)*

#### 12.3 The 20-Year Mature Form of the Triad
*(One paragraph. By the time the current major dashas mature (~16-20 years out), what has this triad collectively built? Family wealth, joint enterprise, shared dharma. Specific.)*

#### 12.4 The One Practice That Holds the Triad Together
*(One paragraph. The single most important shared practice — usually a joint mantra, a shared temple visit, or an annual ritual — that, if held faithfully, lets the triad's blessings ripen across the dasha cycles.)*

#### 12.5 Blessings (Ashirvada)
*(Close with a traditional jyotishi's blessing — invoke the triad's shared Ishta-devta or Kula-devta and pray for the cohort's wellbeing across the dasha cycles ahead.)*

End Pass δ. The full 4-pass composite-triad Kundali reading is now complete.

## overlay-rules

For composite-triad mode, Vimshottari is the most foregrounded engine (the 3-way dasha stagger is the field's operational skeleton). HD and Gene Keys carry the structural-identity overlays. Tarot carries the archetypal-cultural overlay. House 7 (partnership) remains primary; house 3 (the third — siblings, cohort, peer-network) is the structural-third overlay specific to triads.

Engines weighted < 1.0 operate as background — present but not foregrounded unless they carry triad-specific signal (e.g., panchanga for the day-of-pivot reading).

## glossary

- **Three-way phase-lock geometry** — the structural ordering of the three Mahadasha pivots. Who leads, who follows, who anchors. The triad has a built-in temporal sequence encoded in its dasha pivots.
- **The triad is not three dyads** — three dyads stacked is a different geometry than a triangle. Triangle = each pair carries shared current + the third subject provides what the pair alone doesn't generate. Hold this throughout.
- **Codon ring of the triad** — when the three subjects' Gene Keys activate consecutive codons in a ring, the triad carries a coherent genetic-archetypal current that no pair carries alone.
- **The dispersal is part of the maturation** — anti-dependency in a triad means each pair becoming unable to need the others. The field matures by structurally completing its own dispersal.

## interactions

*(For Phase 2 interactive HTML output — placeholder until P2 lands.)*

- **Hover a pair-thread** in the triad-triangle SVG → tooltip names which pair carries which resonance.
- **Click any vertex** → that subject's contribution to the triadic field auto-scrolls into view.
- **Scroll-scrub the 3-way dasha-stagger timeline** → animates the three pivot dates with day-counts between each.

## lessons

*(No autoresearch passes yet. First Pass 6 entry will land here per autoresearch contract.)*
