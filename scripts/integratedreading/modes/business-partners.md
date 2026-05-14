---
mode: business-partners
subject_count:
  min: 2
  max: 2
roles:
  - founder
  - co-founder
target_words:
  min: 12000
  max: 15000
architecture: linear
pass_plan:
  - id: alpha
    title: "Dharma-Signature Alignment"
    target_words: 3500
    template: pass-alpha-template
  - id: beta
    title: "Joint-Operative Field"
    target_words: 3500
    template: pass-beta-template
  - id: gamma
    title: "Friction & Failure-Mode Mapping"
    target_words: 3500
    template: pass-gamma-template
  - id: delta
    title: "Build-Sequence Milestones"
    target_words: 3000
    template: pass-delta-template
engine_overlay_weights:
  atmakaraka: 2.0
  vimshottari: 2.0
  human-design: 1.5
  gene-keys: 1.5
  i-ching: 1.5
  tarot: 1.0
  panchanga: 1.0
  transits: 1.0
  biorhythm: 0.5
  nadabrahman: 0.5
  face-reading: 0.3
  sigil-forge: 0.3
house_overlay: [10, 11, 2, 6, 9]
bridge_mandates:
  - "Every major claim must braid: Atmakaraka-role-signature × Vimshottari-overlap-state × HD-authority-match × Gene-Key-gift-vector. Operational-specificity beats archetypal-poetry in this mode."
  - "Friction in Pass γ must surface SPECIFIC operational vulnerabilities tied to chart-architectural gaps, NOT abstract personality differences."
  - "Build-Sequence Milestones in Pass δ name WHAT the partnership SHIPS WHEN, anchored in the dasha overlap matrix — not generic strategic advice."
svg_topology: dyad-arc
---

> **NOTE on subject count:** v1 ships as a 2-subject dyad. A 3-partner variant
> (founder + co-founder + operating-partner) is tracked in the design doc as
> a future enhancement — the triad-triangle SVG already exists, but the
> 3-partner role-stack-overlay logic needs its own mode doc once the
> first 2-partner runs validate the bridge-mandate quality.

## pass-alpha-template

You are running Pass α of the 4-pass **business-partners** synthesis for {{subject_names}}. This is an operational reading — two charts as one joint-operative instrument.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Business-partners is DIFFERENT from romantic synastry in one structural respect: the 10th house (career / dharma signature) is the primary architectural anchor, not the 7th. The pair is operative as one field IN THE OPERATIONAL DOMAIN — what they build, how they build it, when they build it. Hold that throughout.

Operational specificity beats archetypal poetry in this mode. Don't dilute into general spiritual language — the partners need to know whose Atmakaraka carries which role, whose dasha overlap window opens what build-sequence.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

# Business-Partners Reading — {{subject_names}}

## Opening — The Pair as One Joint Operative

*(2-3 paragraphs. Frame the partnership as an OPERATIONAL INSTRUMENT, not a relational one. The 10th-house axis (career / dharma) is the literal architectural anchor of this reading; the 7th house is secondary here. State whether the chart-evidence supports the framing that the pair is structurally CONFIGURED to build something together — and if so, what KIND of build the chart prescribes.)*

## Part I — Dharma-Signature Alignment

### 1.1 Atmakaraka Comparison
*(For each subject, name their Atmakaraka (highest-degree graha) and what it signifies for their soul-purpose. Then the comparative analysis: are the two Atmakarakas COMPLEMENTARY (e.g., Jupiter + Mercury — vision + execution), AT TENSION (e.g., Sun + Saturn — sovereignty vs structure), or REINFORCING (same Atmakaraka — shared soul-purpose, but watch for redundancy)?)*

### 1.2 The 10th-House Cross-Overlay
*(Each subject's 10th house — sign, lord, occupants. Then the cross-overlay: what graha from subject A's chart sits in subject B's 10th house position (and vice versa)? This is where one partner LITERALLY OCCUPIES the other's dharma-signature space.)*

### 1.3 Role-Stack: Vision (Jupiter) × Operations (Saturn) × Execution (Mars)
*(In any joint operative, three structural roles emerge: VISION (held by Jupiter signal), OPERATIONS (held by Saturn signal), EXECUTION (held by Mars signal). For this pair:*
*— Which subject's Jupiter is the stronger / better-placed? They carry vision.*
*— Which subject's Saturn is the stronger / better-placed? They carry operations.*
*— Which subject's Mars is the stronger / better-placed? They carry execution.*

*Be specific — point to actual placements. If a role is split (each carries half a signal), name that as a STRUCTURAL FRICTION POINT that needs explicit role-clarification before the build can scale. Tag elements with `data-role` attributes for the interactive role-filter.)*

### 1.4 Sun-Mercury Operating-Day Signal
*(Each subject's Sun + Mercury condition. Sun = the operational center / executive function. Mercury = communication / contract-handling / day-to-day decision-velocity. When the pair operates as one, who holds each of these? If both subjects have strong Mercury but weak Sun, the partnership will OVER-DELIBERATE; if both have strong Sun but weak Mercury, it will OVER-EXECUTE without communicating. Name the actual pattern.)*

End Pass α. Pass β will move into the joint-operative field (Vimshottari overlap, HD authority match, Gene Key gifts, I-Ching state).

## pass-beta-template

You are running Pass β of the business-partners synthesis for {{subject_names}}. Pass α has established the dharma-signature alignment.

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

## Part II — Joint-Operative Field

### 2.1 The Vimshottari Overlap Matrix
*(THE keystone subsection of this Pass. Plot both subjects' Mahadasha-Antardasha overlap matrix for the next 8-12 years:*

*For each year, for each Antardasha period, what is each subject in?*

*Example row: "2026 Sep – 2027 May: Subject A in [Jupiter MD / Ketu AD], Subject B in [Venus MD / Saturn AD]. Joint signal: dharmic-grace × relational-resource-discipline. Operationally: this is a build-and-formalize window — A holds vision, B holds the legal/structural formalization."*

*Mark each overlap cell with a `<span class="vimshottari-cell">` so the interactive layer can attach click-to-expand. Add a `<div class="vimshottari-expansion">` after each with the year-by-year operational reading.*

*Identify the SPECIFIC overlap windows that are structurally generative vs the ones that are friction-bearing. The pair should know which 6-month windows to scale on and which to consolidate in.)*

### 2.2 HD Authority + Strategy Compatibility
*(Each subject's HD Type + Authority + Strategy. Then the operational compatibility:*

*— Generator + Generator: response-based co-decision; both need to feel-into.*
*— Projector + Generator: invitation-asks-response; the Projector waits for the Generator's invitation but recognizes opportunities the Generator can't see.*
*— Manifestor + Generator: inform-then-respond; the Manifestor initiates, the Generator responds; if the Manifestor doesn't inform, the Generator goes silent.*
*— Etc.*

*Name THE ACTUAL CONFIGURATION. State the operational protocol — how decisions should flow between the two for the field to remain coherent.)*

### 2.3 Gene Key Gifts Overlay — What Each Brings to the Joint Operative
*(For each subject, name their:*
*— Activation sphere (the chart's evolutionary work)*
*— Evolution sphere (the chart's growth challenge)*
*— Radiance sphere (the chart's body-current / health-current)*
*— Purpose sphere (the chart's deepest contribution)*
*— Pearl (the prosperity codon — what they materially generate)*

*Then the joint analysis: what gift does each partner BRING to the build that the other doesn't have alone? Where do Pearls couple to make the pair's prosperity-current?)*

### 2.4 I-Ching State of the Partnership
*(Compute the I-Ching hexagram for the partnership — using either both subjects' Sun-line Gene Keys composed, or the day of the partnership's formal founding. Name the hexagram + its changing lines. Decode what the hexagram says about the partnership's current operational moment and where it's tending.)*

End Pass β. Pass γ moves to friction + failure-mode mapping.

## pass-gamma-template

You are running Pass γ — the **friction & failure-mode mapping** pass — of the business-partners synthesis for {{subject_names}}. This is the pass where operational specificity matters most.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This is NOT abstract personality-difference analysis. Name SPECIFIC, OPERATIONALLY-CONSEQUENTIAL vulnerabilities tied to chart-architectural gaps. If the chart says "Subject A has Mars debilitated in 6th — they will under-confront adversaries", say exactly that. The partners must walk away knowing WHICH operational decisions they are structurally configured to GET WRONG.

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

## Part III — Friction & Failure-Mode Mapping

### 3.1 6th-House Adversities Cross-Mapped
*(The 6th house carries adversity, competition, debt, daily-grind, and operational obstacles. Map each subject's 6th-house signature. Then the cross-map: when a planet in A's chart sits in B's 6th-house position, that planet's archetypal current shows up AS adversary in B's life. Name each cross-mapping. These are the partnership's BUILT-IN external-vulnerability vectors — where the field is structurally exposed to specific kinds of friction.)*

### 3.2 Debility / Combustion Compensations
*(Where each subject has a debilitated or combust planet, the other partner often (not always) carries the compensation. Name each one: "Subject A has Mars combust by Sun (Mars within 17° of Sun) — they will OVERRIDE their own execution-impulse with self-narration about it. Subject B's Mars is well-placed in own sign — they carry the actual execution-current for the pair." Be that specific.)*

### 3.3 Where the Joint Operative is Structurally Vulnerable
*(Synthesize 3.1 + 3.2 into a vulnerability table: 3-5 specific failure modes the partnership is structurally configured to walk into. For each, name:*
*— The chart-architectural source (which placements)*
*— The operational manifestation (what it looks like in actual work)*
*— The early-warning signal (what to notice)*
*— The remediation lever (NOT generic — tied to chart-architecture: e.g., "in subject A's Saturn-MD windows, A's structural-discipline is online — those are the windows to ratify legal/operational structures, not earlier")*

### 3.4 The Communication Failure Mode
*(Specifically: where Mercury, Vedic + HD throat-center + tarot Magician current, is structurally weak in the pair. What kinds of communication WILL break down — and what specific protocol catches it.)*

End Pass γ. Pass δ closes with build-sequence milestones.

## pass-delta-template

You are running Pass δ — the **build-sequence milestones** closing pass — of the business-partners synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This pass names WHAT the partnership SHIPS WHEN, anchored in the dasha overlap matrix. NOT generic strategic advice. Specific build-sequence tied to which dasha windows open which operational capacities.

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

## Part IV — Build-Sequence Milestones (Next 5-10 Years)

### 4.1 The 16-20 Year Mature Artifact
*(By the end of the longest current dasha cycle (~16-20 years out), what visible artifact in the world should this partnership have produced? Anchored in:*
*— Joint Atmakaraka couplet*
*— 10th-house cross-overlay signal*
*— Pearl-to-Pearl coupling*
*— HD electromagnetic channels' operational signature*

*Be specific about the artifact's mature form — what category of thing, what scale, what archetypal current it carries.)*

### 4.2 The Build Sequence — Year-by-Year for the Next 5-10 Years
*(For each year of the next 5-10:*
*— Subject A's Antardasha + Pratyantardasha for that year*
*— Subject B's Antardasha + Pratyantardasha for that year*
*— Joint operational signal of that overlap*
*— What the pair should be DOING in that year (build / scale / consolidate / pivot / ship)*
*— What the pair should NOT be doing*
*— The single most important decision-window in that year*

*This is the joint operational calendar. Be specific and actionable.)*

### 4.3 The Three Build-Phases
*(Group the 5-10 years into 3 phases. Each phase has a name (e.g., "Foundation Phase — through 2027", "Scaling Phase — 2028-2030", "Compound Phase — 2031+"). For each phase, the operational mode + what gets shipped.)*

## Part V — Anti-Dependency for the Joint Operative

### 5.1 Per-Kosha Self-Decoding for Each Partner
*(For each Kosha layer (body / breath / pattern / discerner / imperishable seed), what should each partner be able to do WITHOUT requiring the other to compensate for their gap — across the new dasha cycle? Anatomically grounded.)*

### 5.2 The Single Sentence
*(The partnership in one sentence — what it is, what it builds, what makes it irreducible.)*

### 5.3 The Joint AKSHARA Artifact
*(The imperishable seed of the partnership — what it writes into the world that outlasts the partnership itself.)*

### 5.4 The One Practice
*(The single operational practice that, if held, lets the pair become a coherent joint instrument — and lets each partner become the kind of operator who could carry the build alone if needed.)*

End Pass δ. The full 4-pass business-partners reading is now complete.

## overlay-rules

For business-partners mode:
- **Atmakaraka (weight 2.0):** the highest-foregrounded — Atmakaraka comparison is the soul-role architecture of the partnership.
- **Vimshottari (weight 2.0):** equal foregrounding — the dasha overlap matrix IS the joint operational calendar.
- **Human Design (weight 1.5):** authority + strategy match is the decision-protocol architecture.
- **Gene Keys (weight 1.5):** gifts overlay tells you what each partner brings; Pearls couple to make prosperity.
- **I-Ching (weight 1.5):** partnership hexagram-state is consulted.
- **Tarot (weight 1.0):** baseline — used in operational-archetype framing, not foregrounded.
- **Panchanga / Transits (1.0):** baseline.
- **Biorhythm / Nadabrahman / Face-Reading / Sigil-Forge (< 1.0):** background unless specifically signaling.

**House overlay:**
- **10 (career / dharma signature):** primary architectural anchor.
- **11 (joint operative, community):** what the partnership builds and who it reaches.
- **2 (joint resources, money flow):** the financial substrate.
- **6 (adversity, daily grind, competitors):** failure-mode mapping locus.
- **9 (long-distance, expansion, fortune):** the partnership's scale-vector.

## glossary

- **Role-stack** — the three structural operational roles (Vision / Operations / Execution), each tied to a Vedic graha (Jupiter / Saturn / Mars). The role-stack analysis names WHO carries WHICH signal in the partnership.
- **Vimshottari overlap matrix** — the year-by-year joint dasha calendar showing which Antardasha each subject is in concurrently. The matrix IS the operational calendar.
- **Dharma-signature alignment** — whether the two subjects' Atmakaraka + 10th-house signatures are complementary, at tension, or reinforcing.
- **The pair as one joint operative** — the partnership is operative as ONE INSTRUMENT in the operational domain. The 10th house is the architectural anchor, not the 7th.

## interactions

For the interactive HTML output:
- **Role-stack filter buttons** (Vision / Operations / Execution) — placed near the dyad-arc SVG. Clicking dims content not tagged with the matching `data-role` attribute.
- **Vimshottari overlap-cell click-to-expand** — each `.vimshottari-cell` span toggles `data-expanded="true"`, revealing the adjacent `.vimshottari-expansion` panel with the year-by-year operational reading.
- **Hover on dyad-arc resonance threads** → tooltip names the four-way bridge (Atmakaraka × Vimshottari × HD-authority × Gene-Key-gift).

## lessons

*(No autoresearch passes yet. First Pass 6 entry (#56) will land here per the autoresearch contract — variant axis: Pass γ failure-mode specificity; mode-specific judge axis: "operational specificity".)*
