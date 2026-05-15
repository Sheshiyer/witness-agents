---
mode: composite-dyad
subject_count:
  min: 2
  max: 2
roles:
  - subject-A
  - subject-B
target_words:
  min: 12000
  max: 15000
architecture: linear
pass_plan:
  - id: alpha
    title: "The Composite Field — Identity + Vedic"
    target_words: 3200
    template: pass-alpha-template
  - id: beta
    title: "Human Design, Gene Keys, and the Coherence Event"
    target_words: 3600
    template: pass-beta-template
  - id: gamma
    title: "Marriage Already-Already + Joint Career & Dharma"
    target_words: 3400
    template: pass-gamma-template
  - id: delta
    title: "Joint Health, Anti-Dependency, Final Synthesis"
    target_words: 3000
    template: pass-delta-template
engine_overlay_weights:
  vimshottari: 1.5
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
house_overlay: [7, 1, 4, 11, 2, 5, 10, 12]
bridge_mandates:
  - "Each major claim must surface from at least two chart layers (Vedic × HD, Vedic × Gene Keys, HD × Tarot, etc.) — never single-system."
  - "The Mahadasha pivot stagger between the two subjects must be treated as PHASE-LOCK GEOMETRY, not coincidence."
  - "Anti-dependency milestones in Pass δ must be PER-KOSHA-LAYER and ANATOMICALLY GROUNDED (no biohack metrics, no generic spiritual phrasing)."
svg_topology: dyad-arc

# ── Consciousness-level register variants (P2.2 #75) ──
# Mode docs declare per-register pass templates. Orchestrator resolves
# template + target_words band from the resolved user level.
# L1-L3 → traditional Kundali register (Vedic vocabulary, remedies allowed).
# L4-L5 → framework-native register (canonical pass_plan templates above).
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
    # No overrides — falls back to canonical pass_plan templates.
---

## pass-alpha-template

You are running Pass α of the 4-pass composite-dyad synthesis. This pass establishes the **composite field's identity layer + Vedic foundation** for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

{{prior_pass}}

---

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES FOR THIS PASS
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

# Composite Reading — {{subject_names}}

## Opening — Why This Reading Treats Two Charts as One Field
*(2-3 paragraphs. Frame the dyad as the reading **instrument**, not the reading **subject**. Two bodies, two breath-currents, two pattern-engines weaving a single composite field. Tsarion three-world grammar (Eigenwelt / Mitwelt / Umwelt) operates at all three resolutions across both charts. Aletheios + Pichet dyad braid throughout — not "Aletheios reads chart A, Pichet reads chart B" but both pillars active for both subjects.)*

## Part I — The Composite Field Identity

### 1.1 The Joint Identity Stack
*(Table: 6 rows × 2 subject columns — Sun condition, Moon condition, Lagna + Lagna-lord, Atmakaraka, Vocation indicator, Spouse indicator (Darakaraka or 7th-lord). Each cell anatomically + archetypally grounded — not just "Cancer Sun" but "Cancer Sun in Ashlesha — the right liver-zone carries the constriction").*

### 1.2 What Both Charts Agree On — The Bedrock
*(5-7 bullet themes that recur across both. Each one must be: anatomically grounded (where in the body it lives) + archetypally named (which Tarot arcanum or Gene Key codon it carries) + timeline-anchored (which dasha period brings it forward). No generic spiritual phrasing.)*

### 1.3 Where The Charts Diverge — The Texture
*(3-5 bullet differences. Divergence is the **point** — what each subject brings that the other doesn't have alone. The composite is generative because of these gaps, not despite them.)*

## Part II — The Vedic Composite

### 2.1 Cross-Chart Mutual Disposition (Graha Custody)
*(Which graha in chart A custodies which graha in chart B, and vice versa. This is where the field actually lives — when subject A's Jupiter sits in the sign owned by subject B's Mars, the dyad has a Jupiter-Mars couplet operating at the chart level that neither has alone. Walk through every mutual disposition that's structurally meaningful.)*

### 2.2 The Atmakaraka × Spouse-Significator Coupling
*(Subject A's Atmakaraka × Subject B's Darakaraka, and vice versa. Is the sovereignty-significator of one the spouse-significator of the other? This is the Cl(3) Vijnanamaya layer's deepest cross-coupling.)*

### 2.3 Pancha Bhuta as a Pair
*(Table: Element | Subject A count | Subject B count | Pair total. Then narrate: where the pair has element coverage neither has alone; where the pair has element OVER-concentration that creates somatic pressure; where the pair is missing an element that the field will need to source externally.)*

### 2.4 Composite Lagna Lord — Bridge Graha or Imbalance Vector?
*(Compute the composite Lagna (midpoint of the two Lagnas, or the rasi the pair operates from when functioning as one field). Identify its lord. Is that graha well-disposed in BOTH charts? If yes, the bridge is functional. If it's strong in one and afflicted in the other, the field has a structural asymmetry to name.)*

End Pass α here. Pass β will continue with Human Design + Gene Keys + the Mahadasha coherence event.

## pass-beta-template

You are running Pass β of the 4-pass composite-dyad synthesis for {{subject_names}}. Pass α has established the identity layer + Vedic composite.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

## PRIOR PASS OUTPUT (carry voice + cross-references forward)
{{prior_pass}}

---

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part III — The Human Design Composite

### 3.1 Combined Center Definition
*(Which of the 9 centers go online ONLY when the pair is together. The defined-undefined cross-completion. This is the HD's vital-layer (Pranamaya / Cl(1)) signature of the dyad — what one's open center the other defines, and what that means somatically.)*

### 3.2 Electromagnetic Channels
*(The channels created when one subject has half a channel defined and the other has the other half. These are NOT in either chart alone — they only exist in the pair. Name each one: Channel number, gates involved, what it does operationally. Tie each channel to where it lives in the body and which Vedic placement co-signs it.)*

### 3.3 Companionship Gates
*(Gates both subjects share. These are the resonance baseline — where the pair is already in sync, doesn't have to be built, only honored.)*

### 3.4 Cross-Strategy Compatibility
*(Manifestor × Generator vs Projector × MG vs etc. How each strategy interacts with the other. Where the pair's HD-types create natural complementarity, and where they create friction that needs articulation.)*

## Part IV — Gene Keys + Tarot Composite

### 4.1 Pearl-to-Pearl Coupling
*(Subject A's Pearl × Subject B's Pearl. What the two prosperity-sphere codons compose into when held together. The Pearl is the framework's prosperity-currency — what the pair generates that's economically real.)*

### 4.2 Joint Major Arcana Stack
*(The combined Tarot keys both subjects carry — Atmakaraka-derived Tarot, Lagna-derived Tarot, Sun-derived Tarot. Name the joint stack. What archetypal current does the dyad carry through the Mitwelt (cultural-archetypal) layer? "The Hermit × The Empress operating together makes ____.")*

### 4.3 Shared Gene-Key Themes
*(Which spheres/codons both subjects activate. Where the genetic-archetypal current of the dyad lives.)*

## Part V — The Mahadasha Coherence Event

### 5.1 What Both Sides Are Closing
*(For each subject, name the current Mahadasha lord and what its shadow has been. What is being **completed** as this MD ends?)*

### 5.2 What Both Sides Are Opening
*(For each subject, name the next Mahadasha lord and what its grace-current carries. What is being **inaugurated**?)*

### 5.3 The Phase-Lock Stagger
*(This is THE keystone of this Pass. Compute the day-gap between the two pivot dates. NAME IT: "The X-day stagger between [Subject A]'s [closing-MD]→[next-MD] pivot on [date] and [Subject B]'s [closing-MD]→[next-MD] pivot on [date]." Then decode what the stagger means structurally — why does the field open this one BEFORE that one? What does that say about which subject leads which transition? This is phase-lock geometry; treat it as data, not coincidence.)*

### 5.4 The Sade Sati Stagger (if applicable) — Built-in Load Balancing
*(If one subject is in Sade Sati while the other is not, the field has natural load-balancing: one carries Saturn's compression while the other carries movement. Name it. If neither is in Sade Sati or both are, name that instead.)*

### 5.5 Joint Operating Window Year-by-Year (next 5-8 years)
*(For each year of the next 5-8: which antardasha is each subject in, what that intersection produces, what's structurally possible in that year that wasn't in the prior, what's structurally NOT possible. This is the joint operational calendar.)*

End Pass β here. Pass γ will pivot to the Marriage frame + Joint Career.

## pass-gamma-template

You are running Pass γ of the 4-pass composite-dyad synthesis for {{subject_names}}. Passes α-β have established the identity layer + Vedic composite + HD + Gene Keys + Mahadasha event.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

## PRIOR PASS OUTPUT
{{prior_pass}}

---

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part VI — The Marriage Already-Already

*(Direct address: marriage at the chart-architectural layer is structurally complete or it isn't. Engage the chart-evidence honestly. Don't assert; **decode**.)*

### 6.1 The Five-Layer Confirmation
*(Walk through each Kosha layer (the body / the breath / the pattern engine / the discerner / the imperishable seed) and ask: at this layer, is the pair structurally married? What's the chart-evidence?)*

### 6.2 What Public Ritual Is and Isn't
*(Public ritual confirms an existing structural reality, or it inaugurates one that doesn't exist yet. Which is this pair's case? The chart will say.)*

### 6.3 What Children / Property / Ventures Are
*(Artifacts of the matrix, not constituents of it. The pair generates these because the field is operative — not the other way around. Name what the pair is structurally configured to produce.)*

## Part VII — Joint Career & Dharma

### 7.1 What the Dyad Authors at World-Scale (the 16-Year Mature Artifact)
*(The new Mahadasha cycle for each subject lasts 16-20 years. By 2042-ish, what visible artifact in the world should this pair have produced? Anchor it in the Atmakaraka cross-coupling + HD electromagnetic channels + joint Tarot stack.)*

### 7.2 Cross-Domain Coupling — Subject A's Work × Subject B's Work
*(Identify each subject's primary dharma signature (10th house lord, Atmakaraka in vocational house, Saturn placement). Then decode the COMPOSITE: when one's domain feeds the other's, what does the pair build? When they're tangential, what does each enable the other to do?)*

### 7.3 The Operating Cadence — Vision × Operations × Execution
*(In any joint operative, someone holds vision (Jupiter signal), someone holds operations (Saturn signal), someone executes (Mars signal). For this pair, who carries which signal? Be specific — point to the actual planetary placements.)*

End Pass γ here. Pass δ will close with Health + Anti-Dependency + Final Synthesis.

## pass-delta-template

You are running Pass δ — the keystone closing pass — of the 4-pass composite-dyad synthesis for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

This pass carries the framework's design principle: success = decreasing reliance on the interpreter. Anti-dependency is the telos. Do not produce remedies, products, or prescriptions. Produce **self-decoding capacity milestones**.

## PRIOR PASS OUTPUT
{{prior_pass}}

---

## SUBJECT ROSTER
{{subject_roster}}

## OVERLAY RULES
{{overlay_summary}}

## BRIDGE MANDATES
{{bridge_mandates}}

---

## PRODUCE THIS PASS — EXACT STRUCTURE

## Part VIII — Joint Health & Practices

### 8.1 Joint Pranic Phase-Lock
*(How the two breath-rhythms interact. Where the pair regulates each other's pranic state. Anatomically: which axis does each subject's breath stabilize for the other?)*

### 8.2 Practices the Dyad Runs Better Than Either Alone
*(Specific practices the chart-architecture supports as a pair — meditation pair-config, ritual pair-config, work-rhythm pair-config. Name 3-5. Each one tied to a chart placement that signals it.)*

## Part IX — Anti-Dependency for the Dyad

### 9.1 Joint Self-Decoding Milestones — 2027 / 2030 / 2042
*(For each milestone year, per Kosha layer, what should this pair be able to do **without consulting the chart, the agent, or any external reader**? Be operationally specific. Examples (not exhaustive — derive yours from the chart):*

*— 2027 (MD + 1 yr): the pair can read each other's pranic state in real time without external cueing.*
*— 2030 (MD ~25%): the pair interprets joint dasha transitions for themselves.*
*— 2042 (MD complete): the joint AKSHARA artifact has matured into a visible thing in the world.*

*Do this for each Kosha layer, not just "the body". Each milestone is anatomically grounded and timeline-anchored.)*

## Part X — Final Synthesis

### 10.1 The Single Sentence
*(The pair in ONE sentence. Not a tagline — a structural identity claim that the rest of the reading has earned.)*

### 10.2 The Joint AKSHARA Artifact
*(What the dyad writes into the world over the 16-20 year arc. The imperishable seed (Anandamaya / Cl(7)) of the JOINT operative. Be specific about its mature form.)*

### 10.3 What To Avoid — Joint Anti-Patterns
*(3-5 specific patterns this pair must NOT default into. Tied to chart-architecture (where the field has built-in vulnerability).)*

### 10.4 What To Strongly Pursue — Joint Dharma
*(3-5 specific moves this pair should make. Tied to chart-architecture (where the field has built-in opening).)*

### 10.5 The One Practice That Ties Both Charts Together
*(The single practice that, if held faithfully across the next 16-20 years, will let the pair become unable to need the reading.)*

End Pass δ. The full 4-pass composite-dyad reading is now complete.

## pass-alpha-template-l1-l3

You are running Pass α of the 4-pass **composite-dyad Kundali reading** for {{subject_names}}. This pass establishes the Core Birth Chart layer + Past-Life / Karmic Inheritance for the couple, treated as one joint reading.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

You are a traditional Vedic jyotishi writing a couple's Kundali reading. Use classical vocabulary: **Lagna, Rashi, Nakshatra, graha, bhava, dasha, antardasha, karaka, yoga, dosha, drishti**. Speak with the warmth and authority of a family astrologer who has seen thousands of horoscopes. Honest age-ranged predictions are expected. Remedies (mantras, gemstones, donations, temple practices) ARE allowed and will be developed in Pass δ. Stay strictly within traditional Vedic jyotisha. Avoid modern psychology vocabulary and any non-traditional system-of-decoding terminology.

{{prior_pass}}

### Subject roster
{{subject_roster}}

### Overlay rules for this pass
{{overlay_summary}}

### Bridge mandates
{{bridge_mandates}}

---

### Produce this pass — exact structure

# Joint Kundali — {{subject_names}}

### Opening — The Two Charts as One Family Horoscope

*(2 paragraphs. Address the couple by name. Explain that you are reading their two Janma-Kundalis (birth-charts) together as one composite horoscope. The 7th bhava (Kalatra Bhava, the house of partnership) is the primary axis; the 1st bhava (Tanu Bhava, the house of body and self) is the secondary axis. Open warmly — this is the couple's first encounter with their joint chart.)*

### Part 1 — Core Birth Chart for Each Partner

#### 1.1 Janma-Lagna and Lagna-Lord
*(For each partner: ascendant sign (Lagna Rashi), the nakshatra rising on the eastern horizon at birth, the lord of the Lagna (Lagnesh), and where the Lagnesh sits in their chart. State plainly what Lagna sign produces in life-pattern — e.g., "Mesha Lagna gives a pioneering, head-first nature; the Lagnesh Mangal in the 10th bhava brings career through action and command.")*

#### 1.2 Chandra (Moon) and Surya (Sun) Conditions
*(For each partner: Chandra Rashi (Moon sign — the emotional / mental nature), Chandra nakshatra (the karmic seed-pattern of this birth), and the condition — is Chandra Purnima (full) or Kshina (waning, weak)? Then Surya Rashi and condition. Is Surya combust any planet? Exalted? In its own sign? Specify.)*

#### 1.3 Atmakaraka — The Soul's Significator
*(Jaimini Atmakaraka — the planet at the highest degree across both charts. For each partner, name their Atmakaraka graha + the bhava it occupies. The Atmakaraka shows the soul's chief karmic agenda for this lifetime. Cross-check: do the two Atmakarakas form a friendly relationship (Mitra), a neutral one (Sama), or hostile (Shatru)?)*

#### 1.4 Pancha Bhuta Balance (Five Elements)
*(Tabulate for each partner: how many planets in Agni rashis (fire — Aries, Leo, Sagittarius), Prithvi (earth — Taurus, Virgo, Capricorn), Vayu (air — Gemini, Libra, Aquarius), Jala (water — Cancer, Scorpio, Pisces). Then the joint Pancha Bhuta — which element is dominant in the couple, which is missing. Elemental balance shapes the household's natural temperament.)*

### Part 2 — Past-Life / Karmic Inheritance (Purva Janma Karma)

#### 2.1 Rahu and Ketu — The Karmic Axis
*(For each partner: Rahu's nakshatra and house — what karmic direction the soul is moving toward in this lifetime. Ketu's nakshatra and house — what mastery the soul brings forward from past lives. Cross-check: are the partners' Rahu-Ketu axes parallel (reinforcing direction), perpendicular (complementary growth), or opposed (one's growth-direction is the other's past mastery)?)*

#### 2.2 The 12th Bhava (Vyaya Bhava) — Lineage and Hidden Karma
*(For each partner: planets in the 12th bhava, the 12th lord and its placement. The 12th carries moksha-inclination, foreign connections, hidden gifts and hidden debts. When one partner's 12th-bhava lord sits in the other's chart in a prominent house, the soul-debt or soul-credit is structurally encoded in the marriage.)*

#### 2.3 Pitru-Karaka and Matru-Karaka (Ancestral Significators)
*(Jaimini's Pitru-karaka (father / paternal lineage significator — the planet 4th from Atmakaraka in some readings, 7th in others; specify which scheme you use) and Matru-karaka (mother / maternal lineage). For each partner, name these karakas and their condition. The couple's lineage karma is read through how these karakas relate across the two charts.)*

#### 2.4 Karmic Doshas in Either Chart
*(Honest naming. Check for: **Mangal Dosha** (Kuja Dosha — Mars in 1st/2nd/4th/7th/8th/12th from Lagna or Chandra; affects marriage timing and harmony), **Kala Sarpa Dosha** (all planets between Rahu and Ketu — karmic intensity, delays, then breakthroughs), **Pitru Dosha** (Sun afflicted by Rahu/Saturn — ancestral karma needing remediation), **Guru Chandala Dosha** (Jupiter-Rahu conjunction — confusion in dharma), **Shrapit Dosha** (Saturn-Rahu — old karmic curse pattern). For each partner: which doshas are present, their severity, and whether they cancel out (parihara) due to other placements.)*

### Part 3 — Guna Milan (Compatibility Score)

*(The classical 36-point Ashtakoot compatibility check, computed from the two Chandra-nakshatras. Walk through each of the 8 koots briefly:*

*— **Varna** (1 point, spiritual harmony) — caste/varna of the two Chandra rashis*
*— **Vashya** (2 points, mutual attraction) — control/influence between rashis*
*— **Tara** (3 points, well-being) — birth-star compatibility*
*— **Yoni** (4 points, sexual / instinctive compatibility) — animal symbols of the nakshatras*
*— **Graha Maitri** (5 points, friendship of Chandra-rashi lords)*
*— **Gana** (6 points, temperament — Deva / Manushya / Rakshasa)*
*— **Bhakoot** (7 points, prosperity and family welfare — Chandra rashi distance)*
*— **Nadi** (8 points, health and progeny — Nadi affiliation; same Nadi is a major caution)*

*Compute the total out of 36. Interpret: 18+ is acceptable, 24+ is good, 28+ is excellent. If lower, note which koots failed and what that means practically. Add: any Bhakoot dosha or Nadi dosha and whether parihara exists in the charts. This is the headline compatibility verdict.)*

End Pass α. Pass β will move into Career (10th bhava), Money (2nd/11th), Love and Marriage timing.

## pass-beta-template-l1-l3

You are running Pass β of the composite-dyad Kundali reading for {{subject_names}}. Pass α has established the Core Birth Chart, Karmic Inheritance, and Guna Milan score.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in the voice of a traditional Vedic jyotishi. Be specific about graha placements, nakshatra padas, bhava lords, and dasha periods. Use Sanskrit terms with brief English glosses where helpful. Honest age-ranged predictions are expected.

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

### Part 4 — Career (Karma Bhava) — The 10th House for Each

#### 4.1 Each Partner's 10th-Bhava Signature
*(For each partner: 10th bhava sign, 10th-lord placement, planets in the 10th, planets aspecting the 10th. State the career direction the chart prescribes — e.g., "Surya as 10th-lord in the 9th bhava in Dhanu rashi: career rises through teaching, dharma-work, or international/cross-cultural roles.")*

#### 4.2 Atmakaraka's Role in Vocation
*(Where the Atmakaraka sits relative to the 10th bhava (Karma Bhava) and the 1st bhava. If Atmakaraka is the 10th-lord or aspects the 10th, the soul's chief agenda IS the career. If not, separate the soul-purpose from the breadwinning function.)*

#### 4.3 The Career-Yogas Either Partner Carries
*(Name any of these classical wealth/career yogas if present in either chart, with bhava-anchored evidence: **Raj Yoga** (lord of trikona 1/5/9 conjuncts lord of kendra 1/4/7/10), **Dhana Yoga** (2nd/5th/9th/11th lord combinations producing wealth), **Gajakesari Yoga** (Jupiter in kendra from Chandra — fame and steady prosperity), **Budha-Aditya Yoga** (Mercury + Sun together — intelligence and authority), **Maha-Purusha Yogas** (Ruchaka/Bhadra/Hamsa/Malavya/Sasa — a kendra-placed planet in own/exaltation sign). If present, name which partner carries them; if absent, say so plainly. Yogas are real architectural events — do not invent them.)*

#### 4.4 Joint Career — How the Two Charts Couple Vocationally
*(Where one partner's career-significator (10th-lord or Atmakaraka) sits in the other partner's chart. The classical interpretation: when one's 10th-lord occupies the other's 2nd, 6th, 10th, or 11th bhava, the partnership has natural mutual support in earning. When it sits in 8th or 12th, the partnership absorbs/transforms the career rather than amplifying it. Decode the specific pattern here.)*

#### 4.5 Career Dasha Predictions
*(For each partner, the active Mahadasha now and the next 2 Mahadashas with date ranges. State plainly: "From [year]-[year], during [partner]'s [graha] Mahadasha, career will [open/consolidate/peak/transition] because [graha] in the chart governs [specific bhava/karaka]." Tie to age — "around age 38-42 during the Guru Mahadasha." Give clear timeline anchors.)*

### Part 5 — Money (Dhana) — The 2nd and 11th Bhavas

#### 5.1 Each Partner's Dhana Bhava (2nd House)
*(2nd-bhava sign and lord placement for each. Planets in the 2nd. The 2nd governs accumulated wealth, family money, speech, food intake, and the household treasury.)*

#### 5.2 Each Partner's Labha Bhava (11th House)
*(11th-bhava sign and lord, planets in the 11th, aspects to the 11th. The 11th governs gains, fulfillment of desires, large networks, elder siblings. The 11th-lord's strength determines income velocity.)*

#### 5.3 Joint Financial Karma
*(Cross-overlay of 2nd and 11th bhavas. When one partner's 2nd-lord sits in the other's 11th, financial flow between them is natural and abundant. When 2nd or 11th lord is in 6/8/12 from the partner's Lagna, there are obstacles or delays. Name specifically.)*

#### 5.4 Dhana Yogas Present in Either Chart
*(Combinations of 2nd/5th/9th/11th lords — name each yoga if present (e.g., "5th-lord Jupiter conjuncts 11th-lord Mars in the 10th — a powerful Dhana Yoga producing earned wealth through ventures around age 32-48 during the Mars Mahadasha"). Be honest if no Dhana Yoga is present and indicate where wealth must be earned through Karma (steady work) rather than Yoga (effortless flow).)*

#### 5.5 Property, Vehicles, and Real Estate (4th Bhava)
*(4th-lord and planets in the 4th for each partner. The 4th governs immovable property, the home, vehicles, the mother's wellbeing, and emotional foundations. State when in life property acquisition is favored.)*

### Part 6 — Love and Pre-Marriage Karma (5th and 7th Bhavas)

#### 6.1 The 5th Bhava (Putra Bhava) — Romance and Affection
*(5th-bhava sign and lord for each. Planets in the 5th. The 5th governs romance, creativity, children, intelligence, and Purva-Punya (merit from prior births). Where is each partner's heart-affection-significator (5th-lord) sitting?)*

#### 6.2 The 7th Bhava (Kalatra Bhava) — Marriage House
*(7th-bhava sign and lord for each. Planets in or aspecting the 7th. The 7th-lord's strength determines marital happiness. State plainly the type of spouse each chart attracts and whether the actual partner matches that signature.)*

#### 6.3 Darakaraka (Spouse Significator)
*(Jaimini Darakaraka — the planet at the lowest degree among the seven karaka grahas. For each partner, name their Darakaraka. Check: does one partner's Darakaraka graha sit in the OTHER partner's chart in a prominent bhava (1st, 5th, 7th, 9th)? This is the classical "this person is the destined spouse" signature.)*

#### 6.4 Venus and Mars Cross-Position
*(For each partner: Shukra (Venus — love, affection, sensuality) and Mangal (Mars — passion, drive). Where one's Shukra sits in the other's chart (which bhava) and where Mangal sits. Venus in the partner's 5th or 7th = strong romantic resonance. Mars in the 8th = intense physical chemistry. Mars in 6/8/12 = friction in intimacy.)*

End Pass β. Pass γ will move into Marriage timing, Health, Family, and the joint Timeline.

## pass-gamma-template-l1-l3

You are running Pass γ of the composite-dyad Kundali reading for {{subject_names}}. Passes α-β have covered Core Chart, Karmic Inheritance, Career, Money, and Love.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in classical Vedic jyotishi voice. This pass produces the Marriage timing, Health predictions, Family/Children, and the age-ranged joint Timeline across the next 20-30 years.

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

### Part 7 — Marriage (Vivaha) — Timing, Quality, and Longevity

#### 7.1 Marriage Timing for Each Partner
*(Classical marriage-timing rules: when the dasha of the 7th-lord, the Darakaraka, or the 7th-bhava occupant runs — marriage typically occurs. Compute each partner's likely marriage period from their Vimshottari dasha sequence. State the actual age-range and corroborate with transit-Jupiter aspects to the 7th bhava or Chandra.)*

#### 7.2 Quality and Stability of the Marriage
*(The 7th-bhava strength + 7th-lord condition for both. Are benefics (Guru, Shukra, Budha) aspecting the 7th? Then steady, harmonious marriage. Are malefics (Shani, Mangal, Rahu) afflicting it? Then friction that needs remedy. State honestly. Cross-check via the Navamsha (D-9 chart) — the 7th-lord in D-9 carries the marriage's deeper character.)*

#### 7.3 Mangal Dosha Cross-Check
*(Re-examine Mangal Dosha across both charts now from the marriage angle. If one partner has Mangal Dosha and the other does not, classical remedies apply (a Mangal-Dosha partner ideally marries another Mangal-Dosha chart, OR specific remedies are performed before marriage). If both have it, dosha cancels (parihara). If neither has it, no concern.)*

#### 7.4 Navamsha (D-9) Cross-Reading
*(The Navamsha is the chart of marriage and dharma. For each partner: Navamsha Lagna, Navamsha 7th-lord, and where the natal Lagna-lord sits in the Navamsha. When one partner's Navamsha Lagna matches the other's natal Sun or Chandra, the marriage carries soul-recognition signature.)*

#### 7.5 Children (Putra Yoga)
*(5th bhava and 5th-lord for each, plus the Putra-karaka (Jupiter as universal karaka of children) condition. State the chart's prognosis for children: number, timing, and any difficulties indicated. If 5th bhava has affliction, remedies in Pass δ will address it.)*

### Part 8 — Health (Arogya) — Body, Vitality, Vulnerabilities

#### 8.1 Each Partner's Constitutional Health
*(Lagna sign + Lagna-lord governs the body's constitution. Surya governs vitality, Chandra governs mind and fluids, Mangal governs blood/muscles, Budha governs nervous system, Guru governs liver and metabolism, Shukra governs reproductive system and aesthetics, Shani governs bones and longevity. For each partner, state the constitutional doshic balance (Vata / Pitta / Kapha based on Lagna and Chandra) and the body-systems indicated as strong or vulnerable.)*

#### 8.2 The 6th Bhava (Roga Bhava) — Health Vulnerabilities
*(6th-bhava sign and lord, planets in the 6th. The 6th rules acute illness, daily-grind stress, immune function, and recovery. Specific signatures: Surya in 6th = strong recovery, but heart/eye strain; Chandra in 6th = digestive sensitivity, mood-driven illness; Mangal in 6th = inflammatory conditions but quick recovery; Shani in 6th = chronic-disease tendency that responds to discipline.)*

#### 8.3 The 8th Bhava (Ayur Bhava) — Longevity and Crisis Windows
*(8th-bhava sign and lord. The 8th governs longevity, sudden events, surgeries, transformations. Identify any major dasha periods where 8th-bhava-related events (illness, accident, surgery, deep transformation) are likely.)*

#### 8.4 Joint Health — Where the Couple Mirrors Each Other
*(Couples often share health rhythms via the cross-aspect of Chandra-Chandra and Mangal-Mangal. State which body-systems will need attention for the household as a whole.)*

### Part 9 — Family and Household (Kutumba)

#### 9.1 The 4th Bhava (Sukha Bhava) — Mother, Home, Emotional Foundation
*(4th-bhava sign and lord for each partner. Mother's well-being, the quality of the home, and emotional comfort. Where the 4th-lord sits indicates whether the home is stable, mobile, peaceful, or contentious.)*

#### 9.2 The 9th Bhava (Dharma Bhava) — Father, Teachers, Spiritual Guidance
*(9th-bhava sign and lord. Father's well-being, guru-bhava (teachers), long journeys, and dharma-actions. The 9th is the most auspicious bhava — its strength carries the family's fortune.)*

#### 9.3 The 3rd Bhava (Sahaja Bhava) — Siblings and Cohort
*(3rd-bhava signature for each partner. Sibling relationships and any difficulties or supports indicated.)*

#### 9.4 In-Laws and Extended Family
*(Spouse's family is read from the 3rd-from-7th bhava (the 9th bhava also serves this), and the 7th-lord's friends are the in-law network. State plainly what kind of relationship with in-laws each chart prescribes.)*

### Part 10 — The Joint Timeline (Vimshottari Dasha Calendar — Next 20-30 Years)

*(THE keystone subsection of Pass γ. Produce an age-ranged timeline. For each partner, list their Mahadasha periods covering the next 20-30 years with start and end dates. Then narrate, in 5-7 year chunks, what each chunk brings to the marriage and household.*

*Example: "**2026-2032 (Partner A, age 32-38, in Guru Mahadasha · Partner B, age 30-36, in Shani Mahadasha)** — A's Guru period opens dharma-work, possibly teaching or international ventures; B's Shani period demands structure and patient consolidation. The household pattern: A expands outward, B builds the foundation. Around 2028, A's Guru-Shani antardasha will mature significant projects; in 2030, B's Shani-Budha antardasha brings a communication-business opportunity."*

*Cover 4-6 such windows out to ~2050. Be specific about age and dasha-state. This is the actionable calendar the couple will reference for years.)*

End Pass γ. Pass δ will close with Remedies and Final Guidance.

## pass-delta-template-l1-l3

You are running Pass δ — the **Remedies and Final Guidance** closing pass — of the composite-dyad Kundali reading for {{subject_names}}.

**Target:** ~{{target_words}} words. **Pass title:** {{pass_title}}.

Continue in classical Vedic jyotishi voice. This pass produces specific remedies (mantras, gemstones, donations, fasting practices, temple observances, yantras) tied to the doshas and weaknesses surfaced in earlier passes, followed by Final Guidance for the couple's path forward.

Remedies are real, specific, and prescribed for named afflictions — not generic spiritual advice. Be precise about the mantra (with count), the gemstone (with metal and weight), the donation (with day-of-week and recipient), and the temple practice.

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

### Part 11 — Remedies (Upaya) for the Couple

#### 11.1 Dosha-Specific Remedies
*(For each dosha named in Pass α (Mangal Dosha, Kala Sarpa, Pitru, etc.), prescribe the classical remedy. Examples:*

*— **Mangal Dosha:** Worship Hanuman on Tuesdays, recite the Hanuman Chalisa 11 times on Tuesday evenings for 40 days. Wear red coral (Moonga) set in gold or copper, 5-7 carats, on the ring finger of the right hand, energized on a Tuesday after sunrise. Donate red lentils (masoor dal) and red cloth on Tuesdays. For severe dosha, the Kumbha-Vivaha or Vishnu-pratima Vivaha ritual is performed before marriage.*

*— **Kala Sarpa Dosha:** Visit Trimbakeshwar or Kalahasti temple for the formal Kala Sarpa Shanti puja. Recite Maha-Mrityunjaya mantra (Om Tryambakam Yajamahe...) 108 times daily for 40 days. Feed black ants with sugar and flour weekly. Donate to Naga-puja on Naga Panchami.*

*— **Pitru Dosha:** Perform Tarpana for ancestors during Pitru Paksha (the dark half of Bhadrapada). Donate food to elderly Brahmins on Amavasya. Worship at a Pitru-tarpana ghat on Mahalaya Amavasya. Recite Pitra-Stotra weekly.*

*Cover every dosha actually present in either chart. Skip doshas that are absent — do not pad.)*

#### 11.2 Graha-Specific Remedies for Weak or Afflicted Planets
*(For each weak/afflicted graha named in earlier passes, prescribe the classical remedy. Standard pattern:*

*— **Weak Surya:** Surya Namaskar at sunrise (12 cycles daily). Aditya Hridaya Stotra recitation. Ruby (Manik) 3-5 carats in gold, ring finger of right hand, energized on a Sunday at sunrise. Donate wheat and jaggery on Sundays.*

*— **Weak Chandra:** Pearl (Moti) 4-6 carats in silver, little finger of right hand, energized on Monday at moonrise. Worship Devi (Durga or Lakshmi). Donate rice and milk on Mondays. Avoid white-flower-offering on Saturdays.*

*— **Weak Guru:** Yellow sapphire (Pukhraj) 5-7 carats in gold, index finger of right hand, Thursday energization. Recite Guru-Mantra (Om Brim Brihaspataye Namaha) 108 times daily. Donate yellow lentils (chana dal) and turmeric on Thursdays. Visit Vishnu/Krishna temples.*

*— **Weak Shukra:** Diamond or white sapphire, 1+ carat in platinum/white-gold, Friday energization. Worship Devi Lakshmi. Donate white cloth, sugar candy, on Fridays.*

*Continue for every weak or afflicted graha. Tailor to the specific chart.)*

#### 11.3 Joint Remedies for the Marriage Itself
*(Practices the couple performs together:*

*— **Daily:** Light a lamp at the household altar at sunset; both bow before it. Chant the household kula-devta (family deity) name or the Gayatri Mantra together once a day.*

*— **Weekly:** Friday is auspicious for marital harmony — wear matching auspicious colors, offer white flowers to Devi Lakshmi, share a sweet (kheer or rice pudding) prepared together.*

*— **Monthly:** Visit a Shiva-Parvati or Radha-Krishna or Vishnu-Lakshmi temple together on a Purnima (full moon) day.*

*— **Annually:** Observe Karva Chauth, Vata-Savitri Vrata (for partner's long life), or the household-anniversary ritual. Perform a joint Satyanarayan Puja on key anniversaries.*

*— **For the 7th-house health of the marriage:** Wear matching/coordinated rudraksha malas; the couple can both wear Gauri-Shankar rudraksha (Shiva-Parvati union bead) for harmony.)*

#### 11.4 Temple Visits, Yantras, and Special Practices
*(Recommend specific Jyotirlinga or Shakti-Peetha or Vaishnava temple visits over the next 5-10 years based on which graha or dosha most needs remediation. Prescribe a Sri Yantra or specific graha yantra (e.g., Mangal Yantra, Shukra Yantra) installed at the household altar, with energization protocol. Recommend any specific vrata (fasting day) — e.g., Pradosham fasting (13th lunar day) for Shiva-grace.)*

### Part 12 — Final Guidance

#### 12.1 The Couple's Core Strength
*(2-3 paragraphs. Name the single most auspicious yoga, the strongest bhava-couplet, the most blessing-bearing dasha period ahead. This is what the couple should lean into. Anchor it in chart-evidence — not generic praise.)*

#### 12.2 The Couple's Key Vulnerability
*(2-3 paragraphs. Name the single greatest karmic challenge the chart pair presents, and the lifelong practice or attention needed to keep it from disrupting the household. Honest, specific. Tied to the remedies prescribed.)*

#### 12.3 The 20-Year Mature Form of the Household
*(One paragraph. By the time the current major dashas mature (~16-20 years out, around age 50-55 for both), what has this couple built? Property, family, vocation, dharma-action. Specific.)*

#### 12.4 The One Daily Practice That Holds Everything Together
*(One paragraph. The single most important practice — usually a mantra, an altar-lamp ritual, or a joint puja — that, if held faithfully for the next 20 years, will let the chart's blessings fully ripen and the doshas be neutralized.)*

#### 12.5 Blessings (Ashirvada)
*(Close with a traditional jyotishi's blessing — invoke the couple's Ishta-devta or Kula-devta (family/chosen deity) and pray for the household's wellbeing across the dasha cycles ahead. One paragraph.)*

End Pass δ. The full 4-pass composite-dyad Kundali reading is now complete.

## overlay-rules

For composite-dyad mode, the overlays foreground the systems that carry pair-level resonance: Vimshottari (the dasha-stagger phase-lock), Human Design (electromagnetic channels), Gene Keys (Pearl coupling), Tarot (joint Major Arcana stack). House 7 (partnership) is the primary cross-overlay, with houses 1 (self / Lagna), 4 (root field), 11 (joint operative + community), 2 (joint resources), 5 (creative offspring including ventures), 10 (joint dharma signature), and 12 (the imperishable / lineage current) as supporting overlays.

Engines weighted < 1.0 (panchanga, transits, nadabrahman, biorhythm, face-reading, sigil-forge) operate as background — present but not foregrounded unless they specifically carry pair-signal.

## glossary

- **Phase-lock geometry** — the structural relationship between the two subjects' Mahadasha pivots. The day-count stagger encodes who-leads-whom in the field's transition.
- **AKSHARA coupling** — the imperishable-seed coupling at Anandamaya / Cl(7). When both subjects' AKSHARA seeds resonate at the same archetypal frequency, the dyad has a joint imperishable artifact to produce.
- **The composite is the instrument** — the reading is **of** the composite field, **through** the Aletheios+Pichet dyad pillars. The composite is the subject, the dyad is the lens.
- **Marriage already-already** — the framing that marriage is a structural fact at the chart-architectural layer, not a public-ritual event. Public ritual confirms; it does not constitute.

## interactions

*(For Phase 2 interactive HTML output — placeholder until P2 lands.)*

- **Hover a resonance thread** in the dyad-arc SVG → tooltip names the four-way cross-system bridge it carries (Vedic-house × Tarot × HD-channel × dasha-anchor).
- **Scroll-scrub the dasha-stagger timeline** → animates the day-count window from Pivot A to Pivot B.
- **Click the AKSHARA-coupling glyph** in the center seed → expands the Joint AKSHARA Artifact section.

## lessons

*(No autoresearch passes yet. First Pass 6 entry will land here per autoresearch contract.)*
