---
mode: team-synergy
subject_count:
  min: 4
  max: 12
roles:
  - member
target_words:
  min: 12500
  max: 15000
architecture: hierarchical
pass_plan:
  - id: outline
    title: "Weave Map — The Team-as-System Outline"
    target_words: 1500
    template: pass-outline-template
  - id: exp1
    title: "Cluster Reading"
    target_words: 4000
    template: pass-exp1-template
  - id: exp2
    title: "Critical-Path Pair Threads"
    target_words: 4500
    template: pass-exp2-template
  - id: exp3
    title: "Joint Operative + Operational Cadence"
    target_words: 3500
    template: pass-exp3-template
engine_overlay_weights:
  human-design: 2.0
  vimshottari: 1.5
  gene-keys: 1.5
  panchanga: 1.0
  tarot: 1.0
  transits: 1.0
  i-ching: 1.0
  numerology: 1.0
  biorhythm: 1.0
  nadabrahman: 1.0
  face-reading: 1.0
  biofield: 1.0
  vedic-clock: 1.0
  sacred-geometry: 1.0
  enneagram: 1.0
  sigil-forge: 1.0
house_overlay: [10, 11, 6, 3]
bridge_mandates:
  - "Every major claim must braid: Role-cluster (HD-type signature) × HD-authority-distribution × Vimshottari-cadence-overlap × Gene-Key-codon-ring."
  - "The team is NOT a sum of individuals. The OUTLINE pass produces the team-as-system weave map; all expansion passes reference it as the structural anchor."
  - "Below 4 subjects, this mode errors. For 3 subjects, use composite-triad. For 2 subjects, composite-dyad."
svg_topology: web-graph
---

## pass-outline-template

You are running the **OUTLINE PASS** of the hierarchical team-synergy synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This is NOT prose. This is the STRUCTURAL WEAVE MAP that the three expansion passes will execute against. Produce a STRUCTURED OUTLINE — concise, parseable, anchor-bearing. Subsequent expansion passes will reference what you declare here.

A team is not N individuals stacked. The team-as-system has:
- **Role-clusters** — each member belongs to one of four clusters based on their chart's dominant signal: VISIONARIES (Jupiter / 9th-house emphasis), OPERATORS (Saturn / 10th-house emphasis), INTEGRATORS (Mercury / Moon / 3rd-house emphasis), CONNECTORS (Venus / 7th/11th-house emphasis)
- **Critical-path partnerships** — 3-5 pair-resonances within the team that are structurally load-bearing (without these pair-couplings, the team cannot ship). Each critical path crosses cluster boundaries to a structural purpose.
- **Operational rhythm** — the joint dasha matrix produces an inherent operational cadence. Some quarters are scale-quarters, some are consolidate-quarters.
- **Joint-operative archetype** — the team carries a Tarot-major-arcanum archetype as a whole. Name it.

{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THE OUTLINE — EXACT STRUCTURE

# Team Synergy Weave Map — {{subject_names}}

## Role-Cluster Assignment

For each member, assign one cluster (visionaries / operators / integrators / connectors) based on their chart's dominant signal. Output as a structured table:

| Member | Cluster | Chart Signal (Anchor) | HD Type + Authority |
|---|---|---|---|
| [name] | [cluster] | [e.g. "Jupiter exalted 9th, Atmakaraka"] | [e.g. "Generator + Emotional"] |
| ... | ... | ... | ... |

Cluster summary:
- **Visionaries:** N members — [list names]
- **Operators:** N members — [list names]
- **Integrators:** N members — [list names]
- **Connectors:** N members — [list names]

State which cluster has the MOST members and what that means structurally for the team's operating mode. State which cluster is UNDER-staffed (or absent) and what the team must source externally to compensate.

## Critical-Path Partnerships

Identify 3-5 pair-resonances within the team that are structurally load-bearing. Each critical path:
- Crosses a cluster boundary (visionary↔operator, etc.) — same-cluster pairs are NOT critical paths; they're amplification, not coupling
- Has a specific operational consequence (what the pair MAKES POSSIBLE that wouldn't exist without it)
- Carries a four-way bridge: Role-cluster pair × HD-authority match × Vimshottari-overlap-state × Gene-Key-codon

Output:

1. **[member A] × [member B]** — [cluster-A] × [cluster-B]
   - Operational consequence: [what they make possible]
   - Chart bridge: [4-way braid]

2. **[member C] × [member D]** — [cluster] × [cluster]
   - ...

[repeat for 3-5 critical paths]

## Operational Rhythm — The Joint Dasha Matrix Cadence

Plot the operational rhythm the team's joint dasha matrix produces across the next 3-5 years. Identify:
- **Scale quarters** — windows where multiple key members are in expansion-MD (Jupiter MD, exalted-graha AD) simultaneously. These are the team's GO-quarters.
- **Consolidate quarters** — windows where multiple key members are in contraction-MD (Saturn, debility AD). These are the team's HOLD-quarters.
- **Pivot windows** — quarters where a critical-path partner transitions MD. These windows reconfigure the team's operating shape.

Output as a quarter-by-quarter table for the next 3-5 years.

## Joint-Operative Archetype

State the team's Tarot-major-arcanum archetype. The team-as-system carries ONE archetypal current that none of its members carry alone. Anchor this in:
- The most-common Atmakaraka across members
- The dominant cluster + the under-staffed cluster's relationship
- The joint Tarot stack from members' Sun-or-Lagna-derived Tarot keys

Single sentence + 1 paragraph of justification.

## Anchor Codon Ring

If the team's Gene Keys spheres activate a coherent codon ring (or near-ring), name it. Codon rings carry transmission-current — what the team is structurally configured to PROPAGATE genetically-archetypally.

End the OUTLINE pass. Expansion passes will execute against this map.

## pass-exp1-template

You are running **expansion pass 1 (Cluster Reading)** of the hierarchical team-synergy synthesis for {{subject_names}}. The OUTLINE pass has produced the weave map. Execute against it.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

The outline named role-clusters and assigned each member. This pass READS each cluster — what it brings to the team-field, where it has structural strength, where it has structural exposure.

## PRIOR PASS OUTPUT (OUTLINE — the weave map)
{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS EXPANSION PASS — EXACT STRUCTURE

# Cluster Reading — {{subject_names}}

For each of the four clusters (visionaries / operators / integrators / connectors) that has 1+ members, produce a sub-section. Mark each cluster sub-section with `<section data-cluster-section="<cluster-name>">` so the interaction layer's cluster-filter scrolls to the right place.

## Visionaries

*(Members: [names from outline]. If no members in this cluster, state that explicitly and decode what the team SOURCES from outside to compensate.)*

For this cluster:

### What the Cluster Brings to the Team-Field
*(Each visionary member's contribution to the joint operative. Anchor each in: Jupiter placement + 9th-house signature + Atmakaraka-vision-current. What this person SEES that no one else on the team sees.)*

### Cluster Strength
*(Where multiple visionaries reinforce — same-direction Jupiter signals, shared 9th-house themes. What the cluster can do collectively that no single visionary can.)*

### Cluster Exposure
*(Where the cluster has structural friction — competing visions, Jupiter-Mars tension across members, dharma-signature divergence that needs explicit articulation. The exposure is not bad; it must be NAMED.)*

### Critical-Path Couplings (referencing OUTLINE)
*(Which critical paths from the outline involve this cluster? Where this cluster cross-couples to operators/integrators/connectors.)*

## Operators

*(Same structure for the operators cluster — anchored in Saturn / 10th-house / disciplinary structure.)*

## Integrators

*(Same structure — anchored in Mercury / Moon / 3rd-house / pattern-engine.)*

## Connectors

*(Same structure — anchored in Venus / 7th-11th house / relational current.)*

End Pass exp1. Pass exp2 will move into the critical-path pair threads.

## pass-exp2-template

You are running **expansion pass 2 (Critical-Path Pair Threads)** of the hierarchical team-synergy synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

The outline named 3-5 critical-path partnerships. This pass reads each one in depth — what the pair makes possible, where the pair's structural friction lives, how the pair feeds the joint operative.

Each critical-path partnership IS a dyad-reading-mini-instance inside the larger team-field. Apply the dyadic-decoding loop to each one.

## PRIOR PASS OUTPUT (OUTLINE + Cluster Reading)
{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS EXPANSION PASS — EXACT STRUCTURE

# Critical-Path Pair Threads — {{subject_names}}

For each of the 3-5 critical-path partnerships identified in the OUTLINE, produce a sub-section.

## Critical Path 1: [member A] × [member B] — [cluster pair]

### The Coupling Signature
*(Vedic: cross-chart mutual disposition between A and B. Where A's graha lands in B's chart, and vice versa, for the placements that matter most given their role-cluster pair (e.g., for visionary × operator, look at Jupiter-Saturn cross-coupling).)*

### The HD Electromagnetic Channel(s)
*(What channels A+B make as a pair that neither has alone. These are the operational capabilities the team has BECAUSE of this critical-path partnership.)*

### The Vimshottari Overlap Window
*(Plot A and B's dasha-AD overlap across the next 3-5 years. Identify the windows where both are in expansion-current simultaneously — those are the critical-path's PEAK operational windows. Identify the windows where one is in contraction — those are the partnership-stress windows.)*

### The Gene Key Couplet
*(Which Gene Keys spheres of A and B couple to make a specific transmission-current. Pearl-to-Pearl pairing, especially.)*

### What This Critical Path Makes Possible
*(Operationally specific. What the team can SHIP because A+B are paired. What would fail without this coupling.)*

### Failure Mode
*(The specific way THIS critical path can break. Tied to chart-architecture. When does it strain — under specific transits, under specific antardasha states, under specific operational pressure types?)*

## Critical Path 2: [member C] × [member D] — [cluster pair]

*(Same structure.)*

## Critical Path 3 / 4 / 5: ...

*(Same structure for each remaining critical path.)*

## Critical-Path Synthesis

The 3-5 critical paths together compose the team's operational skeleton. Briefly synthesize: where the skeleton is COHERENT (multiple critical paths reinforce), where it has a STRUCTURAL GAP (a cluster pair that should be cross-coupled but isn't), and what that means for the team's resilience.

End Pass exp2. Pass exp3 will close with the joint operative + operational cadence.

## pass-exp3-template

You are running **expansion pass 3 (Joint Operative + Operational Cadence)** of the hierarchical team-synergy synthesis for {{subject_names}}. This is the keystone closing pass.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

The outline named the joint-operative archetype and the operational rhythm. The cluster reading mapped what each cluster brings. The critical-path threads named the structural couplings. This pass synthesizes: what does the team SHIP, when, in what sequence — and what does the team become unable to need across the next 3-5 years?

## PRIOR PASS OUTPUT (OUTLINE + Clusters + Critical Paths)
{{prior_pass}}

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS EXPANSION PASS — EXACT STRUCTURE

# Joint Operative + Operational Cadence — {{subject_names}}

## The Joint-Operative Archetype — Decoded

The outline named the team's archetype. Now decode it fully:
- The chart-architectural evidence (what specifically makes this team carry THIS archetype, not another)
- The operational signature — what kinds of work this archetype is structurally configured to produce
- The maturation arc — what the archetype's mature form looks like across the next 3-5 years

## The Operational Cadence — Year-by-Year

For each year of the next 3-5 years (the team's operating horizon — beyond that, role-clusters reconfigure as members' dashas shift):

### Year [N]
- **Scale quarters:** [which Q1-Q4 are GO quarters; why]
- **Consolidate quarters:** [which are HOLD quarters; why]
- **Pivot windows:** [which critical-path partners transition; what changes]
- **What the team SHIPS this year** (specific deliverable category + scale)
- **What the team should NOT attempt** (mismatch with the year's cadence)

[Repeat for each year of the operating horizon.]

## Build-Sequence Across Critical Paths

How the critical-path partnerships activate over the operating horizon. Which critical path leads which year's deliverable. The sequencing of critical-path activation IS the team's build-roadmap.

## Joint Anti-Dependency — What the Team Becomes Unable to Need

Across the operating horizon, what does the team-field become structurally unable to need from outside? What capacity does the team internalize that it currently sources externally?

This is NOT about replacing external services with internal capability. It's about the team's CHART-ARCHITECTURAL maturation: where the joint operative becomes a complete instrument that doesn't require external mediation.

## The Joint AKSHARA Artifact

Across the operating horizon, what visible artifact does the team-field write into the world? The imperishable seed (Anandamaya / Cl(7)) of the joint operative. Its mature form. The thing the team makes that outlasts the team's current configuration.

## The Single Sentence

The team in ONE sentence. A structural identity claim the reading has earned across the four passes.

## The One Practice

The single practice that, if held faithfully across the team, lets the team-field become a coherent instrument that doesn't require the interpreter's mediation.

End Pass exp3. The full hierarchical team-synergy reading is now complete.

## overlay-rules

For team-synergy mode:
- **Human Design (weight 2.0):** highest-foregrounded — HD type + authority + center-definition distribution across the team IS the structural skeleton of the joint operative.
- **Vimshottari (weight 1.5):** secondary foreground — the joint dasha matrix produces the team's operational cadence.
- **Gene Keys (weight 1.5):** the codon ring + spheres-of-purpose overlay — what the team transmits genetically-archetypally.
- **Full 16-engine convergence at weight 1.0+:** team-synergy is the mode where ALL Selemene engines are operative — no single engine dominates; the team-field is multi-engine by nature.
- **Numerology (1.0):** lifepath + expression number distribution within the team carries cohort-current signal.
- **Enneagram (1.0):** when known, complements HD-cluster assignment.

**House overlay:**
- **10 (career / joint dharma):** primary — the team's operative is dharmic-collective.
- **11 (community / network / joint operative):** secondary — what the team builds and who it reaches.
- **6 (daily grind / operational obstacles):** failure-mode locus.
- **3 (cohort / siblings / peer-network):** the team-as-cohort architecture.

## glossary

- **Role-cluster** — the four structural cluster types (visionaries / operators / integrators / connectors). Each member belongs to one cluster based on their chart's dominant signal.
- **Critical-path partnership** — a pair-resonance within the team that is structurally load-bearing. Crosses cluster boundaries to a specific operational purpose.
- **Operational cadence** — the joint dasha matrix produces scale-quarters, consolidate-quarters, and pivot windows across the team's operating horizon.
- **Joint-operative archetype** — the team-as-system carries a Tarot-major-arcanum archetype as a WHOLE that none of its members carry alone.
- **The outline IS the architecture** — the hierarchical pass-decomposition treats the outline pass as STRUCTURAL DATA the expansion passes execute against, not as prose.

## interactions

For the interactive HTML output:
- **Cluster filter buttons** (Visionaries / Operators / Integrators / Connectors) — toggle filter dims non-matching nodes/edges/section-content. Each cluster button is color-coded by cluster.
- **Hover a critical-path edge** in the web-graph SVG → tooltip with the partnership-card content (data-label).
- **Dasha-cadence overlay toggle** — toggles `.dasha-cadence-overlay` bar visibility; bar scrubs as user scrolls (CSS scroll-driven animation when supported).

## lessons

*(No autoresearch passes yet. First Pass 6 entry (#58) will land here per the autoresearch contract — variant axis: outline-pass prompt phrasing (cluster-naming-first / role-stack-first / critical-path-first); mode-specific judge axis: "role-cluster legibility".)*
