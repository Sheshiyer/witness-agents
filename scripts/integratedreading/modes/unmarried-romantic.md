---
mode: unmarried-romantic
subject_count:
  min: 2
  max: 2
roles:
  - partner-A
  - partner-B
target_words:
  min: 12000
  max: 15000
architecture: linear
pass_plan:
  - id: alpha
    title: "Two Charts as Candidate-Field — Not Yet a Vivaha"
    target_words: 3000
    template: pass-alpha-template
  - id: beta
    title: "Romance + Resonance — 5th House Foregrounded"
    target_words: 3500
    template: pass-beta-template
  - id: gamma
    title: "Marriage-Indication Windows — Timing as Open Question"
    target_words: 3500
    template: pass-gamma-template
  - id: delta
    title: "Sovereignty Before Commitment — Anti-Dependency Per Partner"
    target_words: 3000
    template: pass-delta-template
engine_overlay_weights:
  tarot: 2.0
  human-design: 1.7
  gene-keys: 1.5
  vimshottari: 1.5
  panchanga: 0.7
  i-ching: 1.0
  nadabrahman: 0.5
  biorhythm: 0.5
  face-reading: 0.3
  sigil-forge: 0.3
house_overlay: [5, 7, 11, 8, 12, 4]
bridge_mandates:
  - "This is a romantic but UNMARRIED dyad — dating, engaged, cohabiting, or long-term-partnered without legal/ceremonial marriage. Do NOT presume the Vivaha (marriage) frame is the operative one. The chart-architectural question is candidacy + readiness, not established-marriage diagnosis."
  - "7th house (Kalatra) is read as candidate-partner signifier — what KIND of spouse each chart's architecture wants. 5th house (romance, creativity, Putra-prospect-future) is foregrounded as the actual operative house for this stage of the relationship."
  - "Marriage TIMING is a CHART-DERIVED QUESTION across both Mahadasha clocks, not an assumption. Pass γ must explicitly name (a) the dasha-windows where both charts indicate marriage-readiness AND (b) the dasha-windows where one or both indicate moksha / dissolution / non-marriage instead. Do not force a marriage-prediction if the architecture doesn't support one."
  - "Anti-dependency in Pass δ for an unmarried-romantic dyad is sovereignty-before-commitment: each partner becomes structurally capable of FULL operation whether or not the relationship becomes a marriage. Children, joint-property, legal-frame are not assumed. The work is each chart maturing into its own dharma such that the choice — to marry, to remain unmarried, or to part — comes from clarity not from incompletion."
svg_topology: dyad-arc

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

You are running Pass α of the 4-pass **unmarried-romantic** synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This is a **romantic but unmarried** dyad — the pair are dating, engaged, cohabiting, or long-term-partnered without legal/ceremonial marriage. The reading treats this as a **candidate-field** rather than an established marriage. Do not import the Vivaha (marriage compatibility) framing wholesale; read the 7th house as candidate-partner-significator and foreground the 5th house (romance, creativity, the future-Putra-prospect) as the actual operative dharma-house for this stage.

**Hard relational rules:**
- The pair are NOT married. Do not write as if Ashtakoot Guna Milan is the operative scoring system.
- The pair ARE romantically partnered. Do not treat this as a business or peer dyad.
- Marriage may or may not be in the architecture. Pass γ decides; Pass α/β do not assume.

{{prior_pass}}

## SUBJECT ROSTER (with declared relationship roles)
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

# Unmarried-Romantic Reading — {{subject_names}}

## Opening — Two Charts at the Candidate Threshold

*(2-3 paragraphs. Frame the dyad: two adult charts that have chosen each other in romance but have not yet (or may not) crossed into formal marriage. State up-front that the reading honours candidacy as its own complete stage — not as marriage-pending. Name each partner's Lagna, Atmakaraka, current Mahadasha; do NOT yet speculate about marriage timing.)*

## Part I — The Candidate Field

### 1.1 Each Partner's 7th House as Candidate-Signifier
*(For each chart: what kind of spouse does this 7th house describe? The Kalatra-bhava + 7th lord + Venus condition together form a candidate-portrait — the chart's structural answer to "what kind of partner would this body be ready for?" Cross-reference: does the OTHER partner's chart match the portrait, partially-match, or diverge significantly?)*

### 1.2 Each Partner's 5th House (Romance + Creativity + Future-Putra-Prospect)
*(For each chart: the 5th house architecture — Putra-bhava, 5th lord, Sun condition (since Sun is creativity-significator), Jupiter-aspect-to-5th (children-blessing). At this stage of the relationship, 5th house is MORE diagnostic than 7th. What's the creative/romantic operative current in each chart that the pair is currently inhabiting?)*

### 1.3 Atmakaraka Cross-Disposition
*(Where does each partner's Atmakaraka sit in the OTHER's chart? This is the soul-recognition layer — what each partner's chart sees as significant in the other. Critical for unmarried-romantic specifically: the Atmakaraka cross-disposition often reveals what's keeping the pair TOGETHER pre-marriage, before any legal/ceremonial commitment has structured the bond.)*

### 1.4 The 5th-House Cross-Overlay
*(Where does each partner's 5th lord sit in the other's chart? Each partner's 5th house ruled-graha lands somewhere in the other's chart — that landing point is where the romance is structurally HELD between them. Decode it.)*

### 1.5 The Candidate One-Sentence Statement
*(One sentence — what this pair IS at the candidate-field layer, before any further passes weigh in. Stay descriptive; do not predict marriage or non-marriage yet.)*

End Pass α. Pass β goes deeper into the romance-and-resonance current.

## pass-beta-template

You are running Pass β of **unmarried-romantic** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Pass α established the candidate field. NOW go deeper into the operative current — Tarot resonance, Human Design electromagnetic-channels, Gene Keys sphere alignment — at the level of romance and resonance, NOT marriage-architecture. Read this dyad as a creative-erotic-aesthetic field; the legal/ceremonial dimension is not in scope yet.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part II — Romance + Resonance

### 2.1 Tarot Cross-Resonance (Each Partner's Atmakaraka → Major Arcana → Pair Coherence)
*(Each partner's Atmakaraka maps to a Major Arcana. The cross-pair archetypal current: does The Lovers, The Empress, The Tower, The Star, or another card best describe the operative dyad? Be specific to THIS pair; do not import generic relationship-Tarot.)*

### 2.2 Human Design Electromagnetic Channels Between the Two
*(If both HD charts are present: which channels does ONE partner's defined gate complete in the OTHER's open gate, and vice versa? These are the literal electromagnetic-attraction channels between the two — the chart-architectural reason the pair feels chemically pulled to each other. Distinguish electromagnetic (attraction-current) from companionship (shared-defined-channels).)*

### 2.3 Gene Keys Pearl + Venus Sequence Cross-Read
*(Each partner's Pearl Sphere + Venus Sequence. Where do these sequences intersect? The Pearl carries the prosperity-vocational current; the Venus Sequence carries the relational-shadow-to-gift current. For an unmarried-romantic dyad, the Venus Sequence is more operative than the Activation Sequence.)*

### 2.4 The Bhukti-Level Mahadasha Resonance
*(Current Mahadasha + Antardasha for each partner. Are both partners simultaneously in beneficial sub-periods? Or is one carrying the relational-current while the other is in a personally-difficult window? This pre-marriage stage is uniquely SENSITIVE to bhukti-level (sub-Mahadasha) friction — name where each is right now.)*

### 2.5 The 5th-House Future-Putra-Prospect
*(If the pair were to marry and have children, what does the 5th-house architecture across both charts suggest about that future? Treat this as a hypothetical structural reading, not a prediction. Address it because the 5th house is foregrounded in this mode AND because children-prospect is often part of why an unmarried-romantic pair holds the question of marriage open.)*

### 2.6 Where the Romance is Structurally HELD
*(One paragraph synthesising — what specifically is the chart-architectural anchor that's holding this pair together as a candidate-field, pre-commitment?)*

End Pass β. Pass γ opens the marriage-timing question.

## pass-gamma-template

You are running Pass γ of **unmarried-romantic** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Now the question Pass α + β deliberately deferred: **when (if ever) does the chart-architecture indicate marriage is structurally ready?** This pass must explicitly hold the question open — naming both pro-marriage windows AND anti-marriage windows (moksha, dissolution, non-marriage-as-a-valid-outcome) without forcing a prediction.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part III — Marriage-Timing as Open Question

### 3.1 7th Lord Mahadasha / Antardasha for Each Partner
*(For each chart: when is the 7th lord active as Mahadasha or Antardasha? Those are the classical marriage-indication windows. State the date ranges for each partner, then overlay them — is there a window where BOTH partners simultaneously activate their 7th lord?)*

### 3.2 Venus + Jupiter Mahadasha / Antardasha
*(Venus = marriage-significator; Jupiter = blessing-of-marriage. Same exercise: when does each partner activate Venus AND Jupiter periods? Overlay for joint-windows.)*

### 3.3 The Inhibitor-Periods (Saturn over 7th, Rahu-Ketu Across 1st-7th)
*(Equally important: when is each partner in a Saturn-aspect-7th transit, or Rahu/Ketu crossing the 1st-7th axis? These are marriage-friction or marriage-delay periods. Some pairs hold off marriage for years specifically BECAUSE the architecture is in inhibitor-mode; mistaking these windows for "we're not ready" can mean missing the real signal.)*

### 3.4 The Pro-Marriage Window (if it exists)
*(Synthesis: is there a specific multi-year window where BOTH charts indicate marriage-readiness simultaneously? If yes, state the date range and what the architecture suggests about WHAT KIND of marriage that window would support — civil/legal, ceremonial/religious, child-bearing, partnership-sans-children, etc.)*

### 3.5 The Anti-Marriage or Moksha-Window (if it exists)
*(Equally important: is there a specific window where one or both charts indicate the relationship is structurally heading toward dissolution OR toward a relationship-as-moksha-practice (12th house, spiritual partnership without legal-frame)? Name it without judgment.)*

### 3.6 The Open Question — Stated Clearly
*(Restate: marriage is not pre-decided by these charts. The reading names what IS in the architecture across multiple timing-lenses; the partners hold the decision. This is sovereignty-honouring, not non-committal.)*

End Pass γ. Pass δ moves into anti-dependency per partner.

## pass-delta-template

You are running Pass δ of **unmarried-romantic** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Close with **anti-dependency per partner**. The reading's telos for an unmarried-romantic dyad is sovereignty-before-commitment: each partner becoming structurally complete enough that the choice — to marry, to remain unmarried-partnered, or to part — comes from clarity, not from incompletion or default. The work is per-individual; the dyad ripens or doesn't ripen as a consequence.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part IV — Sovereignty Before Commitment

### 4.1 Partner-A's Anti-Dependency Milestones
*(2-4 capacity milestones partner-A arrives at when their own chart-architecture is mature enough that the relationship-question stops being a structural anxiety. Anatomically grounded. Examples: "the 7th-house Kalatra-question stops feeling like an external-fix and starts feeling like an internal-clarity"; "the Venus-condition is sourced internally before being projected onto the partner".)*

### 4.2 Partner-B's Anti-Dependency Milestones
*(Same shape, partner-B specific. 2-4 milestones.)*

### 4.3 What the Pair Looks Like When Both Have Crossed These Milestones
*(A short paragraph: if both partners arrive at their own anti-dependency, what does the dyad look like then? Not "they marry happily ever after" — what it actually looks like at the architecture level when two sovereign charts choose each other (or choose not to) from clarity.)*

### 4.4 The Closing One-Sentence
*(One sentence — what this candidate-field is at the closing layer of the reading. The work has named what is named; the choice remains the partners'.)*

End Pass δ. The reading is complete.

## pass-alpha-template-l1-l3

You are running Pass α of the 4-pass unmarried-romantic compatibility reading for {{subject_names}}. The audience is the partners themselves; use **traditional Vedic vocabulary** (Janma-Kundali, Lagna, Rashi, Nakshatra, Bhava, Pancha-Tattva, Vivaha, Putra, Dasha, Yoga, Dosha). The pair are romantically partnered but NOT yet married.

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

# Janma-Kundali Compatibility — {{subject_names}}

## Opening — Two Janma-Kundalis at the Pre-Vivaha Threshold

*(2-3 paragraphs. Frame the reading: two janma-kundalis compared in candidate-mode, before formal Vivaha. State each partner's name, role, Lagna, Atmakaraka, current Mahadasha.)*

## Part 1 — Each Partner's Marriage-Architecture

### 1.1 Each Partner's Janma-Lagna and Lagna-Lord
*(Lagna of each, Lagna lord position. The lagna-pair compatibility is the foundation but does NOT settle the Vivaha question alone.)*

### 1.2 Each Partner's Saptama-Bhava (7th house) — Read AS Candidate-Signifier
*(Each partner's 7th house, 7th lord, Venus (kalatra karaka). At the candidate stage, the question is NOT "are they compatible" but "what kind of spouse does this 7th house architecture describe — and is the other partner that kind of person?")*

### 1.3 Each Partner's Pancham-Bhava (5th house) — Foregrounded for Pre-Vivaha
*(The 5th house architecture is foregrounded because: it carries romance, creativity, AND the future-putra-prospect. Pre-marriage, 5th house is more diagnostic than 7th. Decode 5th house + 5th lord + Sun-condition for each partner.)*

### 1.4 Atmakaraka and Darakaraka Cross-Disposition
*(Each partner's Atmakaraka. Where does it sit in the OTHER's chart? Then Darakaraka — same exercise. This is the soul-significator cross-recognition that's often what's holding an unmarried-romantic pair together pre-Vivaha.)*

End Pass α.

## pass-beta-template-l1-l3

You are running Pass β of the unmarried-romantic reading for {{subject_names}}. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 2 — Romance, Resonance, and Pancham-Bhava Operative Current

### 2.1 The Pancham-Bhava Cross-Overlay
*(Where does each partner's 5th lord sit in the other's chart? The 5th-to-5th synastry is the literal romance-anchor.)*

### 2.2 Tara, Yoni, Gana, Nadi (Selected Ashtakoot Gunas — for partial assessment, not a marriage-decision)
*(Selected Gunas from Ashtakoot Guna Milan can be applied pre-marriage as a partial-assessment tool — NOT a marriage decision. State Tara (3rd-9th compatibility from each other's nakshatra), Yoni (sexual-compatibility category), Gana (deva/manushya/rakshasa), Nadi (constitutional health-axis). Each partner's status for each. Don't compute a score; describe qualitative status.)*

### 2.3 Chandra-Mangala Yoga or Other Couple-Yogas
*(Are there yogas that form across the pair? Chandra-Mangala (Moon + Mars in same sign or aspect across two charts is a unifying relational-yoga), Gaja-Kesari, etc.)*

### 2.4 Mahadasha + Antardasha Currently Active for Each
*(The current bhukti (sub-period) for each partner. Pre-marriage relationships are uniquely sensitive to bhukti-level friction; state where each is right now and what the bhukti is asking of each individually.)*

End Pass β.

## pass-gamma-template-l1-l3

You are running Pass γ of the unmarried-romantic reading for {{subject_names}}. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 3 — Vivaha Timing as Open Question

### 3.1 7th Lord Mahadasha / Antardasha for Each
*(When the 7th lord is active as Mahadasha or Antardasha for each partner — those are classical Vivaha-indication windows. State the date ranges.)*

### 3.2 Shukra (Venus) + Guru (Jupiter) Mahadasha / Antardasha
*(Shukra = kalatra karaka; Guru = vivaha-blessing graha. When does each partner activate these? Overlap-windows are the marriage-supportive periods.)*

### 3.3 Inhibitor Periods — Saturn over Saptama, Rahu/Ketu across Lagna-Saptama
*(When is each partner in Saturn-7th aspect or Rahu/Ketu 1-7 transit? These are vivaha-delay or vivaha-friction windows.)*

### 3.4 The Window for Vivaha (if architecturally indicated)
*(Synthesis. The specific multi-year window when both charts simultaneously indicate Vivaha-readiness, if one exists. State the date range. If no such window exists in the next 7-10 years, state that without judgement — Vivaha is not the only valid outcome of a romantic dyad.)*

### 3.5 Moksha-Window (if the chart architecture suggests release / non-vivaha)
*(Equally important: when the architecture indicates the relationship is moving toward dissolution OR toward partnership-as-spiritual-practice (12th-bhava framework). Name it openly.)*

End Pass γ.

## pass-delta-template-l1-l3

You are running Pass δ of the unmarried-romantic reading for {{subject_names}}. Continue in traditional Vedic vocabulary. **Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

In the L1-L3 register, anti-dependency translates as **each partner's own dharma-maturation, irrespective of whether vivaha occurs**. Personal upayas (mantras, fasting, gemstones) may be suggested as personal dharma-practices, not as fixes for the relationship.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS

## Part 4 — Each Partner's Own Dharma-Maturation

### 4.1 Partner-A's Path
*(Their own dharma trajectory through current and next Mahadasha. Specific upayas supported by their chart (e.g. Shukra-strengthening, 7th-lord propitiation) — framed as personal dharma-practices, not Vivaha-fixes.)*

### 4.2 Partner-B's Path
*(Same.)*

### 4.3 The Pair When Both Are Mature
*(One paragraph: what the dyad looks like when both partners have matured into their own dharma. Whether Vivaha follows or not, the maturity is the point.)*

### 4.4 Closing
*(One sentence naming this candidate-pair's chart-architectural signature.)*

End Pass δ. The reading is complete.

## glossary

- **Vivaha** — marriage; the legally / ceremonially formalised partnership
- **Kalatra / Kalatra-bhava** — spouse / 7th house
- **Pancham-bhava** — 5th house: romance, creativity, future children, intelligence
- **Putra-bhava** — same as Pancham-bhava (the children-house aspect)
- **Atmakaraka** — soul-significator (highest-degree graha)
- **Darakaraka** — spouse-significator (lowest-degree graha)
- **Bhukti** — sub-period within a Mahadasha (Antardasha)
- **Shukra** — Venus (kalatra-karaka)
- **Guru** — Jupiter (vivaha-blessing)
- **Saptama** — 7th (saptama-bhava = 7th house)
- **Moksha** — liberation / release; 12th-house dynamic relevant to relationship-dissolution OR relationship-as-spiritual-practice
- **Tara, Yoni, Gana, Nadi** — Ashtakoot Gunas applied selectively pre-Vivaha
- **Upaya** — remedy / practice (mantra, fasting, gemstone, charity)

## lessons

(Empty — to be populated by autoresearch over time per modes/_schema.md.)
