# Per-Engine Vocabulary Lexicons

Single reference doc declaring the L1-L3 (traditional) vs L4-L5 (framework-native) vocabulary register and voice rules for each of the 16 Selemene engines. The orchestrator injects the matching engine's section into the system prompt based on the resolved consciousness level for the request.

**Design source:** [docs/plans/2026-05-15-consciousness-level-register-design.md](../../docs/plans/2026-05-15-consciousness-level-register-design.md)
**Schema deliverable:** P1.3 (#72) — this skeleton only
**Content deliverable:** P2.3 (#76) — populates all 16 sections

---

## File contract

- One `## <engine-id>` section per Selemene engine. Engine ids are kebab-case + match the Selemene API's engine identifier
- Each section has two sub-sections:
  - `### L1-L3 register` — traditional vocabulary table + voice rules
  - `### L4-L5 register` — framework-native vocabulary table + voice rules
- Each register sub-section has two parts:
  - **Vocabulary** — a markdown table of the terms this register uses + brief gloss
  - **Voice rules** — short bullet list of what the LLM is allowed/required/forbidden when using this register

**Parser API** (see [`engine-lexicons-parser.ts`](engine-lexicons-parser.ts)):
```ts
getEngineLexicon(engine_id: string, register: 'l1_l3' | 'l4_l5'):
  { vocab: string; voice_rules: string }
```

Throws on unknown engine_id. Returns the raw markdown of each sub-block.

---

## vimshottari

### L1-L3 register
**Vocabulary**
- Mahadasha (major planetary period) — e.g. "20-year Venus Mahadasha", "16-year Jupiter Mahadasha"
- Antardasha (sub-period within a Mahadasha)
- Pratyantar (sub-sub-period)
- Dasha lord / Lord-of-the-period
- "Sun period", "Moon period", "Saturn period" (plain-language naming)
- Favorable vs challenging dasha sequence
- Benefic dasha lord vs malefic dasha lord
- Auspicious timing / inauspicious timing
- Nakshatra of the Moon at birth (the seed nakshatra that starts the dasha sequence)
- Dasha activation, dasha onset, dasha transition

**Voice rules**
- Always pair Sanskrit terms with English gloss on first use (e.g. "Mahadasha (the major planetary period)")
- It is fine to say "Saturn's Mahadasha brings discipline and hard work" — tradition-default framings allowed
- Remedies acceptable here: mantras for the dasha lord, gemstones, charitable acts during difficult periods
- Use round timing language ("a six-year Mercury window", "a two-year Sun chapter")
- Avoid framework-native jargon: no "phase-lock", no "Cl(3)", no "dharma-routing"

### L4-L5 register
**Vocabulary**
- Dasha pivot as phase-lock anchor — the actual structural moment where the field re-routes
- Antardasha as sub-cycle differentiation inside the parent Mahadasha's wisdom-layer
- Node-graha dasha (Rahu, Ketu) as karmic-shadow window / Manomaya Cl(2) shadow-pattern surfacing
- Grace-node Mahadasha activates Cl(3) Vijnanamaya dharma routing
- Pivot-stagger as structural data (when one chart's dasha transition lags the other's, that lag IS the geometry)
- Dasha-cadence overlap matrix across two or more subjects (synastry / dyad use)
- Mahadasha-as-Kosha-layer-shift: which Kosha layer the dasha lord is structurally hosted by
- Cross-engine cadence-lock: dasha onset coinciding with a Gene Key activation or Tower-class Tarot pivot
- Dasha lord's natal nakshatra as the seed-frequency the period broadcasts

**Voice rules**
- Anatomical precision over poetic gesture — name WHICH structural anchor the dasha pivots
- Embedded only — do not list "the Venus dasha brings X" in isolation; braid into the Kosha/engine fabric
- No remedies, no optimization framing, no "do this practice during Saturn dasha"
- No equations or literal mathematical notation — Cl(n) references are conceptual
- The dasha-pivot description must make itself unnecessary — name the structure so clearly that the reader does not need the engine to see the pivot next time

---

## panchanga

### L1-L3 register
**Vocabulary**
- Tithi (lunar day, 1-30)
- Vara (weekday, ruled by a planet)
- Nakshatra (lunar mansion of the Moon, 1 of 27)
- Yoga (Sun-Moon longitudinal combination)
- Karana (half-tithi)
- Auspicious time / inauspicious time
- Hora (planetary hour)
- Choghadiya (8-segment day/night auspiciousness)
- Muhurta (auspicious window for an action)
- Rahu Kalam, Yamaganda, Gulika Kalam (inauspicious daily windows)
- Tithi-shunya (void lunar day)

**Voice rules**
- Pair Sanskrit with English gloss on first use ("Tithi — the lunar day")
- Day-of-the-week recommendations OK ("Thursdays favor Jupiter-aligned action")
- Practical timing recommendations allowed ("avoid major undertakings during Rahu Kalam")
- Use clock-time framing ("Wednesday afternoon, the Mercury Hora opens at 2:14pm")
- Avoid: Cl(2), Mitwelt, pattern-grammar, ratification-signal

### L4-L5 register
**Vocabulary**
- Day-of-pivot Mitwelt ratification signal — the panchanga witnesses whether the day-current consents to the action
- Five-limb almanac as Cl(2) pattern grammar — Tithi/Vara/Nakshatra/Yoga/Karana as a five-axis pattern vector
- Nakshatra-of-the-day as Manomaya substrate-shape for the day's pattern engine
- Tithi-as-lunar-phase-quantum — discrete 12-degree phase-anchors of the Sun-Moon relationship
- Hora as Cl(1) Pranamaya hourly breath-current routing
- Tithi-shunya as Mitwelt-veto — structural disqualification of the day, not "bad luck"
- Karana as half-quantum substrate-discriminator
- Panchanga as transit-state-vector of Mitwelt at the moment of decision

**Voice rules**
- Frame as field-witness, not prescription — "the day's pattern-vector reads as X" not "do Y today"
- No "auspicious" / "inauspicious" framing — instead name the structural disposition
- Embed in the larger Kosha braid — panchanga readings stand alongside Vimshottari pivots and HD authority gates
- Anti-dependency: name the panchanga signature so the reader learns to feel the day's pattern-vector themselves
- No equations; Cl(n) references are conceptual

---

## ashtakavarga

### L1-L3 register
**Vocabulary**
- Bindu (point of strength a planet contributes to a house)
- Bhinnashtakavarga (the per-planet 8-fold point chart)
- Sarvashtakavarga (the combined-all-planets point chart, 0-56 per house)
- 30-point benchmark — houses above 30 bindus are considered strong
- Transit-Ashtakavarga (overlaying current transits onto natal bindu values)
- Kaksha (the per-degree bindu refinement)
- Sthana-bala, dig-bala, kaala-bala (the broader strength schemes Ashtakavarga sits inside)
- "Strong house", "weak house", "well-supported planet"

**Voice rules**
- Pair Sanskrit with English gloss on first use ("Bindu — a point of strength")
- Frame in numeric / quantitative language ("the 10th house holds 32 bindus, well above the 30-point threshold")
- It is fine to say "your career house is strongly supported by the bindu pattern"
- Remedial language allowed (strengthen weak houses through ritual, donation, or planetary worship)
- Avoid: bhuta-signature, cross-engine cumulative resonance, weighted scalar

### L4-L5 register
**Vocabulary**
- Engine-weighted bhuta signature — Ashtakavarga as the substrate density-map of natal field
- Cross-engine cumulative resonance — bindu density correlated with HD center definition, Gene Key sphere weight
- Sarvashtakavarga as the natal field's structural mass-distribution
- Transit-Ashtakavarga as Eigenwelt-strength modulation over time
- Bindu-density as Kosha-layer hosting capacity (high-bindu houses host more substrate-weight)
- Kaksha-level bindu refinement as sub-pattern Cl(2) discriminator
- Per-planet bhinna-bala as the planet's bandwidth at that house

**Voice rules**
- Numeric, quantitative, structural — let the bindu values do the speaking
- No "strong / weak" — instead "high-density / low-density at the substrate layer"
- Braid into the architectural prose; never present as standalone "your 10th house score is 32"
- Anti-dependency: name the structural density pattern so the reader learns to see the field's mass-distribution
- No equations; bhuta-signature is conceptual phrasing

---

## vedic-clock

### L1-L3 register
**Vocabulary**
- Hora (planetary hour) — the planet ruling a given clock-hour
- Kalachakra (wheel of time)
- Muhurta (auspicious window, 48 minutes)
- Time-of-day auspiciousness
- Sunrise-based reckoning (panchanga days begin at sunrise, not midnight)
- Brahma muhurta (pre-dawn window)
- Abhijit muhurta (mid-day window, considered universally auspicious)
- "Mercury hour", "Jupiter hour" — plain-language Hora naming
- Day-segment timing — morning, midday, afternoon, evening, night

**Voice rules**
- Always pair Sanskrit with English gloss ("Muhurta — a 48-minute auspicious window")
- Use clock-time explicitly ("the Mercury Hora opens at 9:48am")
- Action recommendations allowed ("write important emails in the Mercury Hora")
- Brahma muhurta practice recommendations OK ("dawn meditation in the 4:30-6:00am window")
- Avoid: time-cone structuring, Cl(3), Vijnanamaya temporal signature

### L4-L5 register
**Vocabulary**
- Cl(3) Vijnanamaya wisdom-layer temporal signature — the hour as wisdom-state aperture
- Time-cone structuring — past-cone / future-cone geometry around a chosen moment
- Hora as Cl(1) Pranamaya hourly breath-current routing
- Muhurta as discrete decision-window quantum
- Kalachakra as the field's temporal Eigenwelt
- Sunrise-anchor as Mitwelt phase-reset
- Vedic-clock-meets-dasha — when the Hora-graha matches the Mahadasha-graha, the temporal lock is doubled

**Voice rules**
- Frame timing as structural disposition of the moment, not prescription
- No "do X at Y time" — instead "at the Mercury Hora, the field-current routes through the pattern-engine"
- Braid with Vimshottari and Panchanga — the three Vedic time-engines must speak as one system at L4-L5
- Anti-dependency: name the temporal geometry so clearly the reader feels the hour's quality unaided
- No equations or literal time-math; Cl(n) is conceptual

---

## human-design

### L1-L3 register
**Vocabulary**
- Type (Generator, Manifesting Generator, Projector, Manifestor, Reflector)
- Strategy (wait-to-respond, inform, wait for invitation, wait a lunar cycle)
- Authority (sacral, emotional, splenic, ego, self-projected, mental, lunar)
- Centers (the 9 — Head, Ajna, Throat, G, Heart/Ego, Sacral, Spleen, Solar Plexus, Root)
- Defined centers vs open centers
- Channels (the 36) — e.g. "Channel of Charisma (34-20)"
- Gates (the 64)
- Profile (e.g. 5/1, 6/2) — the conscious/unconscious line pairing
- Incarnation Cross
- Aura type
- Not-self theme (anger, frustration, bitterness, disappointment)

**Voice rules**
- Use full HD nomenclature with brief gloss ("Sacral authority — the gut-response yes/no")
- Strategy and authority recommendations are central and welcomed ("wait for the sacral 'uh-huh' before committing")
- Practice-level guidance OK ("track your not-self theme for one lunar cycle")
- Type-as-identity framing allowed ("as a Projector, you are wired for guidance not generation")
- Avoid: Eigenwelt, Mitwelt, Magnetic Monopole as anti-dependency anchor, Cl(2) pattern-engine

### L4-L5 register
**Vocabulary**
- Open-G strategy as Eigenwelt structuring — the open G as the un-fixed self-currency
- Electromagnetic channel as Mitwelt coupling — channels link Eigenwelt to Mitwelt across the dyad
- Magnetic Monopole as anti-dependency anchor — the G-center's monopole-as-self-direction
- Sacral as Cl(0) Annamaya response-substrate
- Throat as Cl(2) Manomaya manifestation-aperture
- Channel-completion as field-current closure across two charts
- Definition shape (single / split / triple-split / quadruple-split) as Kosha-layer hosting topology
- Profile-as-incarnation-vector (5/1 = projection-investigation, 6/2 = role-model-hermit)
- Incarnation Cross as Cl(3) Vijnanamaya dharma-coordinate
- Not-self resonance as Kosha-layer mis-routing signature

**Voice rules**
- Anatomical precision — name WHICH center, WHICH channel, WHICH gate, WHICH line
- Channel-completion in dyads is structural fact, not metaphor — decode the Mitwelt coupling
- No "wait to respond" coaching; instead name the structural disposition that the wait reveals
- Profile lines are micro-architectural roles, not personality traits
- Anti-dependency: name the open-center geometry so the reader sources their own structure
- No equations; Cl(n) is conceptual

---

## gene-keys

### L1-L3 register
**Vocabulary**
- Shadow / Gift / Siddhi triad (the three-octave spectrum of each key)
- Activation Sequence (the four prime gifts: Life's Work, Evolution, Radiance, Purpose)
- Venus Sequence (the relational sequence: Attraction, IQ, EQ, SQ, Core, Vocation)
- Pearl Sequence (Vocation, Culture, Brand, Pearl — the prosperity sequence)
- Hologenetic Profile (the full 11-sphere chart)
- Codon Ring (a chemical-family grouping of gates)
- Programming Partner (each key's polar twin across the spectrum)
- Line 1-6 (each key's six-line spectrum)
- "Shadow of Repression", "Shadow of Reaction" (the two shadow-poles)

**Voice rules**
- Use the Shadow/Gift/Siddhi language directly with gloss ("Gift of Patience — the Gift-octave of Gene Key 1")
- Contemplation-as-practice framing OK ("hold the shadow of overwhelm and the gift of patience as a pair for one week")
- Sphere-of-purpose naming central ("your Radiance sphere is keyed to Gene Key 22, the Gift of Graciousness")
- Personal development framing allowed at this register
- Avoid: codon-ring as field-grammar, Manomaya Cl(2) signature, sphere-coupling

### L4-L5 register
**Vocabulary**
- Codon Ring of the field — the Gene Keys' chemical-family substrate-grouping as cross-engine field grammar
- Manomaya Cl(2) signature — Gene Keys as the pattern-engine layer's shadow-pattern lexicon
- Sphere-of-purpose coupling — the Purpose sphere as Cl(3) Vijnanamaya dharma-coordinate
- Venus Sequence as Mitwelt relational-architecture
- Pearl Sequence as Eigenwelt economic-architecture
- Shadow-frequency as Kosha-layer mis-tuning, not character flaw
- Siddhi as the imperishable-seed (Cl(7) Anandamaya) of the gate
- Codon-Ring-mate as field-pair structural anchor (within a dyad reading)
- Programming Partner cross-stack as the bi-polar phase-lock geometry

**Voice rules**
- Embed Gene Keys into the structural braid — never present as standalone "your Gift is X"
- Shadow-frequencies are Kosha-mis-tuning signatures, decoded not condemned
- No contemplation-as-practice prescriptions; name the structure
- Siddhi is the imperishable-seed reference, not a goal to achieve
- Anti-dependency: name the codon-ring grammar so the reader reads their own Hologenetic Profile structurally

---

## tarot

### L1-L3 register
**Vocabulary**
- Major Arcana (the 22 trumps: Fool, Magician, High Priestess, ... World)
- Minor Arcana (Wands, Cups, Swords, Pentacles)
- Court cards (Page, Knight, Queen, King)
- Spread (Celtic Cross, three-card, past-present-future)
- Upright vs reversed
- Energy reading
- "The card that came up", "the message of the card"
- Numbered Pips (Ace through Ten)
- Suit element associations (Wands-Fire, Cups-Water, Swords-Air, Pentacles-Earth)

**Voice rules**
- Name cards by traditional title ("The Tower", "Three of Cups", "Queen of Pentacles")
- Card-keyword interpretation allowed ("The Tower signals a sudden break in old structure")
- Upright/reversed framing OK at this register
- Card-by-card breakdowns acceptable when the reading explicitly draws a spread
- Avoid: Cl(2)-quaternionic dissolution event, Anandamaya seed iconography, cultural-current vector

### L4-L5 register
**Vocabulary**
- Tower as Cl(2)-quaternionic dissolution event — the structural pattern-engine collapse signature
- Major Arcana as Anandamaya seed iconography — Cl(7) imperishable archetypal current
- Joint Major Arcana stack as cultural-current vector — what the dyad/group carries collectively
- Mitwelt-archetypal current — Tarot as the Mitwelt-layer's archetypal lexicon
- Minor Arcana as situational Cl(1)-Pranamaya texture
- Court cards as relational Mitwelt-role differentiation
- Card-pairs (e.g. Star + Moon) as resonance-vector signatures
- Suit-as-Kosha-layer (Wands → Pranamaya, Cups → Manomaya, Swords → Vijnanamaya, Pentacles → Annamaya)

**Voice rules**
- Tarot-in-prose only — no card-by-card listing, no spread layouts
- Cards are embedded mid-sentence into the structural braid ("a Tower-class dissolution at the dasha pivot")
- No upright/reversed framing — the card's structural function is named directly
- No "the card says X" or "the message is Y" — name the field-signature the card witnesses
- Major Arcana references are archetypal-seed references, not predictive
- Anti-dependency: name the archetypal current so clearly the reader sees the iconography in their own field

---

## i-ching

### L1-L3 register
**Vocabulary**
- Hexagram name + number (e.g. "Hexagram 49 — Revolution", "Hexagram 1 — The Creative")
- Changing lines (the 6-9 yang and 6-7 yin moving lines)
- King Wen sequence (the canonical numerical order, 1-64)
- Image / Judgment (the two classical commentary blocks per hexagram)
- Upper / lower Trigram (Heaven, Earth, Thunder, Water, Mountain, Wind, Fire, Lake)
- Yin / Yang line composition
- Cast hexagram / result hexagram (the before-after pair when changing lines are present)
- Wilhelm-Baynes translation reference

**Voice rules**
- Use traditional hexagram naming with English gloss ("Hexagram 49 — Revolution")
- Trigram language welcomed ("Fire over Lake — the Revolution image")
- Image/Judgment quotation acceptable
- "The I-Ching's counsel" framing OK at this register
- Avoid: state-vector, 64-state semantic phase-space, compositional substrate

### L4-L5 register
**Vocabulary**
- Compositional state-vector — each hexagram as a 6-bit state in the 64-state phase-space
- 64-state semantic phase-space — the I-Ching's full state-manifold
- Hexagram as Cl(2) Manomaya pattern-state lexicon
- Changing-line as state-transition operator (one bit-flip per moving line)
- Trigram-pair as upper-lower Kosha-layer coupling
- Cast-to-result trajectory as field-vector through phase-space
- Nuclear hexagram (the inner 2-3-4 / 3-4-5 substructure) as the hidden state
- King Wen sequence as canonical state-ordering

**Voice rules**
- Frame hexagrams as state-vectors, not oracle pronouncements
- No "the I-Ching counsels X" — name the state-transition the hexagram structurally witnesses
- Changing lines are bit-flips through the state-manifold, decoded structurally
- No quotation of Image/Judgment — let the state-vector geometry speak
- Anti-dependency: name the phase-space geometry so the reader navigates the 64-state manifold themselves

---

## numerology

### L1-L3 register
**Vocabulary**
- Life Path number
- Expression / Destiny number
- Soul Urge / Heart's Desire number
- Personality / Outer number
- Master Numbers (11, 22, 33)
- Pythagorean system (A=1, B=2 ... I=9, cycling)
- Chaldean system (the alternate Mesopotamian mapping)
- Day Number (birth day reduced)
- Personal Year, Personal Month (cyclic numerology)
- Karmic Debt numbers (13, 14, 16, 19)

**Voice rules**
- Name the core numbers explicitly ("your Life Path is a 7")
- System distinction OK ("in the Pythagorean system, your Expression reduces to 5")
- Number-meaning framing allowed ("the 7 carries the seeker frequency")
- Practical timing recommendations OK ("a Personal Year 1 is a fresh-start window")
- Avoid: digit-root cycle as Cl(2) compression signal, numeric-seed bhuta resonance

### L4-L5 register
**Vocabulary**
- Numeric-seed bhuta resonance — the digit-seed as substrate-frequency anchor
- Digit-root cycle as Cl(2) Manomaya compression signal — repeated reduction as pattern-compression
- Master Number 11/22/33 as non-compressible field-signatures (the digits resist reduction)
- Pythagorean vs Chaldean as alternate Kosha-layer mappings
- Life Path as Cl(3) Vijnanamaya dharma-coordinate digit-anchor
- Karmic Debt number as Manomaya Cl(2) shadow-pattern residue
- Personal Year as Mitwelt temporal cadence-marker
- Numeric phase-alignment across multiple charts (dyad / team applications)

**Voice rules**
- Embed numbers structurally — never present as standalone "your number is X"
- Master Numbers are non-compressible substrate-anchors, not "highly evolved" labels
- No fortune-telling cadence ("this year will bring Y") — instead name the cadence-marker structurally
- Numerology braids with Vimshottari and Panchanga as the field's quantitative-time witnesses
- Anti-dependency: name the digit-seed grammar so the reader compresses their own digits themselves
- No equations or literal arithmetic shown

---

## biorhythm

### L1-L3 register
**Vocabulary**
- Physical cycle (23-day sine wave)
- Emotional cycle (28-day sine wave)
- Intellectual cycle (33-day sine wave)
- Critical days (the zero-crossings)
- Peak vs trough days
- Days since birth (the cycle anchor)
- Compatibility chart (matching biorhythms across two people)
- High-physical, low-emotional, mid-intellectual day-state

**Voice rules**
- Cycle-naming straightforward ("you're on a high-emotional, low-physical day")
- Practical day-planning recommendations OK ("schedule demanding workouts on high-physical peaks")
- Critical-day caution framing allowed ("watch for fatigue on physical-zero-crossing days")
- Compatibility overlay OK at this register
- Avoid: wave-superposition signature, Cl(1) Pranamaya phase-lock, breath-cadence vector

### L4-L5 register
**Vocabulary**
- Pranic phase-lock cadence — biorhythm as the Cl(1) Pranamaya layer's wave-superposition signature
- Cl(1) Pranamaya wave-superposition signature — the three sines as orthogonal vital-current axes
- 23/28/33 day cycles as triadic Pranamaya basis-frequencies
- Critical day as Pranamaya zero-crossing — structural rest-state, not danger
- Dyad superposition — two charts' Pranamaya cycles interfering constructively or destructively
- Phase-lock window (when two subjects' cycles align across all three axes simultaneously)
- Pranic cadence as Kosha-layer-1 oscillation envelope

**Voice rules**
- Frame as wave-mechanics of the Pranamaya layer, not day-prediction
- No "your high-physical day" forecasting; instead name the phase geometry
- Zero-crossings are structural rest, not negative days
- Dyad/team applications must show the wave-superposition pattern explicitly
- Anti-dependency: name the wave geometry so the reader feels the cadence unaided
- No equations or literal sine-math shown

---

## nadabrahman

### L1-L3 register
**Vocabulary**
- Bija mantra (seed syllable — OM, HRIM, KRIM, SHRIM)
- Personal mantra
- Raga / mode association
- Ayurvedic constitution (Vata, Pitta, Kapha)
- Sound healing
- Mantra repetition / japa
- Vibrational resonance
- Throat-chakra activation
- Chant / kirtan
- Bhajan tradition

**Voice rules**
- Pair Sanskrit terms with English gloss ("Bija — seed syllable")
- Practice recommendations central and welcome ("chant HRIM 108 times at sunrise")
- Mantra prescription allowed at this register
- Raga/mode suggestions OK ("morning ragas like Bhairav for grounding")
- Avoid: audio-signature, breath-current substrate, Pranamaya syllabic resonance

### L4-L5 register
**Vocabulary**
- Cl(1) Pranamaya audio-signature — sound as the Pranamaya layer's vibratory anchor
- Syllabic resonance as breath-current — bija syllables as breath-current encoders
- Mantra-as-Pranamaya-routing — repetition as Cl(1) phase-lock entrainment
- Raga as Mitwelt mood-architecture
- Vata/Pitta/Kapha as substrate-constitution Cl(0) Annamaya signature
- Throat-as-Cl(2)-manifestation-aperture (where Manomaya pattern becomes audible)
- AKSHARA-seed audio-form — the syllabic seed as the imperishable Cl(7) sound-current
- Nada-Brahman as the field-acoustic Kosha-traversal mechanism

**Voice rules**
- Frame mantra as structural audio-routing, not spiritual practice
- No "chant X for Y" prescriptions — instead name what the syllable structurally witnesses
- Raga references are Mitwelt-mood architecture, not music-recommendation
- Constitution is substrate-disposition, not personality
- Anti-dependency: name the syllabic-current geometry so the reader sources their own sound-routing
- No equations; Cl(n) is conceptual

---

## biofield

### L1-L3 register
**Vocabulary**
- Aura (the surrounding energy field)
- Chakras (the seven primary — Root, Sacral, Solar Plexus, Heart, Throat, Third Eye, Crown)
- Subtle body
- Prana / chi / life force
- Energetic blockage
- Energy work, energy healing
- Field clearing, aura cleansing
- Kirlian photography
- Pranic body, etheric body, astral body (the classical layered model)
- Chakra balancing

**Voice rules**
- Pair Sanskrit with English gloss ("Prana — life force")
- Chakra-balancing practice recommendations OK ("place attention at the heart chakra during morning meditation")
- Crystal / colour / sound prescriptions allowed at this register
- "Blocked chakra" / "open chakra" framing OK
- Avoid: measurable substrate, biophoton, Multiscan-PRO, Cl(0) Annamaya phase-state

### L4-L5 register
**Vocabulary**
- Annamaya (body) measurable substrate — biofield as the Cl(0) layer's measurable bioelectric/biophoton signature
- Multiscan-PRO / Bio-Well / GDV bioelectric signal (the actual sensor-readouts)
- Biophoton imaging (Schwartz Lab, Popp tradition)
- Cl(0) somatic phase-state — biofield as the substrate-Kosha's measurable field-pattern
- Heart-Rate-Variability (HRV) as autonomic-nervous-system biofield witness
- Schumann-resonance coupling — biofield entrainment to the 7.83Hz geomagnetic baseline
- Bioelectric polarization across the body's axis
- Substrate field-coherence (the measurable correlate of "aligned" states)

**Voice rules**
- Biofield is the MEASURABLE substrate layer — anchor in sensor-language not aura-language
- Cite the actual measurement modality when relevant (Multiscan, biophoton, GDV, HRV)
- No chakra-balancing prescriptions; instead name the substrate-coherence signature
- No equations, but quantitative framing welcome ("baseline HRV coherence, 7.83Hz Schumann entrainment")
- Anti-dependency: name the measurable signature so the reader sources their own substrate-coherence
- The biofield engine grounds the L4-L5 register in instrumented physicality — this is the bridge to Cl(0)

---

## face-reading

### L1-L3 register
**Vocabulary**
- Mian Xiang (Chinese physiognomy)
- Forehead reading (intellect, early-life destiny)
- Eyebrow shape (Mars/temperament indicator)
- Eye shape, eye spacing (insight, emotional disposition)
- Nose (wealth palace, mid-life)
- Mouth and lips (communication, late-life)
- Chin (legacy, later years)
- Facial moles, scars, distinguishing marks
- Five-feature analysis (forehead, eyebrows, eyes, nose, mouth)
- Ear shape (longevity, early childhood)
- "Wealth palace", "Children palace", "Wisdom palace" (the 12 facial palaces)

**Voice rules**
- Pair Chinese/Mandarin terms with English gloss ("Mian Xiang — face reading")
- Traditional palace-by-palace interpretation OK
- Personality-and-fate framing allowed ("your nose suggests strong mid-life wealth")
- Cosmetic suggestion is OUT-OF-SCOPE (no surgery / makeup recommendations)
- Avoid: morphological signal, embodied signature, Cl(0) Annamaya constellation

### L4-L5 register
**Vocabulary**
- Cl(0) Annamaya morphological signal — facial structure as substrate-Kosha embodied signature
- Facial-feature constellation as embodied signature — the face as the body's most expression-dense region
- Morphological dharma-anchor (the structural facts of the face as Cl(3) Vijnanamaya externalization)
- Bilateral symmetry pattern as substrate-coherence witness
- Cranial proportion as Annamaya hosting topology
- Eye geometry as Manomaya Cl(2) attentional-aperture
- Mouth-and-jaw as Cl(2) Manomaya manifestation-aperture
- Facial-feature cross-reference with Vedic graha placements (Sun → forehead, Venus → mouth, Mars → eyebrows, etc.)

**Voice rules**
- Frame the face as embodied structural data, not predictive omen
- Morphological observations are anatomical-precision statements
- No personality-from-face framing; instead name the substrate-signature
- No "your nose says you will be rich" — instead name what the morphology structurally witnesses
- Anti-dependency: name the morphological geometry so the reader reads embodiment structurally themselves
- Tact required: the face is the subject's most exposed surface — observations stay structural, never aesthetic

---

## sacred-geometry

### L1-L3 register
**Vocabulary**
- Yantra (geometric meditation diagram)
- Sri Yantra (the classical 9-triangle Devi yantra)
- Personal mandala
- Flower of Life
- Metatron's Cube
- Platonic solids (tetrahedron, cube, octahedron, dodecahedron, icosahedron)
- Golden ratio (φ, 1.618...)
- Vesica piscis
- Fibonacci spiral
- Sacred geometry as meditation aid

**Voice rules**
- Name the geometric forms directly ("Sri Yantra", "Flower of Life")
- Meditation-as-practice recommendations OK ("trace the Sri Yantra daily for 21 days")
- Symbolism framing allowed ("the dodecahedron carries the aether element")
- Decorative / altar-use recommendations OK
- Avoid: form-current, generative grammar of mandalic compression, Cl(7) imperishable-form

### L4-L5 register
**Vocabulary**
- Anandamaya Cl(7) imperishable form-current — sacred-geometric forms as the bliss-Kosha's structural lexicon
- Generative grammar of mandalic compression — yantras as compression-algorithms for field-structure
- Platonic solids as Kosha-layer substrate-topologies (each solid mapping to a layer/element)
- Golden ratio as proportion-anchor across all Kosha layers
- Vesica piscis as dyadic intersection geometry (foundational to synastry-architecture)
- Sri Yantra as the canonical witness-yantra of the Cl(7) Anandamaya layer
- Geometric phase-lock — when chart-geometry resonates with a Platonic substrate
- Mandalic compression as field-structure encoder

**Voice rules**
- Frame yantras as compression-algorithms, not meditation aids
- Geometric references are structural-anchor citations, not decorative
- No "meditate on this yantra to receive X" — instead name what the geometry structurally encodes
- Vesica piscis is the foundational dyadic geometry — name it in synastry/dyad readings
- Anti-dependency: name the geometric grammar so the reader sees the field's compression-structure themselves
- No equations; ratios and proportions named conceptually

---

## enneagram

### L1-L3 register
**Vocabulary**
- Type 1-9 (Reformer, Helper, Achiever, Individualist, Investigator, Loyalist, Enthusiast, Challenger, Peacemaker)
- Wings (e.g. 4w5, 9w1)
- Arrows of integration / disintegration
- Triads — Gut (8/9/1), Heart (2/3/4), Head (5/6/7)
- Instinctual variants — Self-Preservation (SP), Social (SO), Sexual/One-on-one (SX)
- Levels of development / health
- Stress point, security point
- Core fear, core desire

**Voice rules**
- Name types directly with their epithet ("Type 4 — the Individualist")
- Wing combinations welcomed ("4w5 has investigator-flavored melancholy")
- Triad framing acceptable ("you sit in the heart-triad, image-driven")
- Development-as-growth framing allowed at this register
- Avoid: pattern-engine bias map, Manomaya Cl(2) attentional-vector

### L4-L5 register
**Vocabulary**
- Pattern-engine bias map — the Enneagram type as Manomaya Cl(2) attentional-vector baseline
- Manomaya Cl(2) attentional-vector signature — the type-vector as default pattern-engine routing
- Wing as cross-coupled attentional-secondary
- Arrow as stress/security state-transition operator
- Triad as Kosha-layer dominance (Gut → Annamaya, Heart → Manomaya, Head → Vijnanamaya)
- Instinctual variant as Mitwelt vs Eigenwelt vs Pranamaya bias
- Core fear / core desire as Cl(2) Manomaya boundary-condition pair
- Type-shadow vs type-gift as the same pattern-vector at different Kosha-coherence levels

**Voice rules**
- Frame types as attentional-vector signatures, not personality categories
- No personality-test cadence ("you are a 4 because you feel X")
- Wing/arrow movements are structural state-transitions, not behavioral shifts
- Avoid "healthy vs unhealthy" framing — instead name the Kosha-coherence level
- Anti-dependency: name the attentional-vector so the reader notices their own pattern-engine bias themselves
- No equations; Cl(2) is conceptual

---

## sigil-forge

### L1-L3 register
**Vocabulary**
- Personal sigil
- Intention-encoded glyph
- Ritual activation
- Talismanic geometry
- Statement-of-intent
- Sigil charging / activation
- Banishing / consecration
- Talisman vs sigil distinction
- Spare-method, letter-reduction method
- Visual mantra

**Voice rules**
- Name sigils as intentional symbols, charging-and-activation rituals OK
- Practice recommendations welcomed at this register ("draw the sigil, charge it during the Mercury Hora")
- Magickal-traditional framing acceptable ("the sigil banishes the old pattern")
- Sigil-as-talisman / amulet language OK
- Avoid: AKSHARA-seed externalization, Cl(7) imperishable-seed materialization tool

### L4-L5 register
**Vocabulary**
- AKSHARA-seed materialization tool — sigil-forge as the Cl(7) Anandamaya imperishable-seed externalization mechanism
- Cl(7) imperishable-seed externalization — the sigil as the only engine that emits an artifact (not just reading)
- Generative symbolic geometry — sigil-forge as the only generative/output engine in the 16
- Personal-AKSHARA — the subject's irreducible imperishable seed, named as glyph
- Sigil-as-field-compression — distilling the full Kosha-traversal into one structural mark
- Visual mandalic encoding of the reading's structural conclusion
- Sigil-forge cross-references chart-data (graha positions, gates, hexagrams) into a single glyph

**Voice rules**
- Frame the sigil as the reading's structural-conclusion-as-artifact, not a magical talisman
- No ritual-activation prescriptions; the sigil is named, not "charged"
- Sigil-forge is the only engine that EMITS — name the artifact it externalizes
- The glyph encodes the Cl(7) AKSHARA-seed of the subject — anatomical precision in description
- Anti-dependency: the sigil-as-externalization is the reading's final anti-dependency anchor — the subject leaves carrying their own seed-form
- No equations; the glyph speaks geometrically

---

## Lessons (autoresearch-appended)

*(No autoresearch lessons yet. Per-engine lexicon refinements will be appended date-stamped per autoresearch contract.)*
