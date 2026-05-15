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
*(TBD — populated in P2.3 #76. Will name: Mahadasha · Antardasha · Pratyantar · Lord-of-the-period · sign-house-nakshatra of dasha lord · timing in years/months · benefic/malefic dasha sequence.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — populated in P2.3. Will name: phase-lock geometry · dasha-cadence overlap matrix · pivot-stagger as structural data · Cl(3) Vijnanamaya wisdom-layer temporal signature.)*

**Voice rules**
- *(TBD)*

---

## panchanga

### L1-L3 register
**Vocabulary**
*(TBD — Tithi · Vara · Nakshatra · Yoga · Karana · auspicious vs inauspicious time · Hora · Choghadiya.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — day-of-pivot Mitwelt ratification signal · five-limb almanac as Cl(2) pattern grammar.)*

**Voice rules**
- *(TBD)*

---

## ashtakavarga

### L1-L3 register
**Vocabulary**
*(TBD — Bindu count by house and planet · Sarvashtakavarga · Bhinnashtakavarga · 30-point benchmark · transit-Ashtakavarga.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — engine-weighted bhuta signature · cross-engine cumulative resonance.)*

**Voice rules**
- *(TBD)*

---

## vedic-clock

### L1-L3 register
**Vocabulary**
*(TBD — Hora-based hour-by-hour planetary signal · Kalachakra · time-of-day auspiciousness.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — Cl(3) Vijnanamaya wisdom-layer temporal signature · time-cone structuring.)*

**Voice rules**
- *(TBD)*

---

## human-design

### L1-L3 register
**Vocabulary**
*(TBD — Type (Generator/Projector/Manifestor/Reflector/MG) · Strategy · Authority · Centers (9) · Channels · Profile · Incarnation Cross.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — electromagnetic channels · Pranamaya (vital) layer routing · Cl(1) breath signature · cross-coupling channel-completion as field-current.)*

**Voice rules**
- *(TBD)*

---

## gene-keys

### L1-L3 register
**Vocabulary**
*(TBD — Shadow / Gift / Siddhi triad · Activation / Evolution / Radiance / Purpose spheres · Pearl · Hologenetic Profile · Codon Ring.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — codon ring of the field · Manomaya (pattern engine) Cl(2) signature · sphere-of-purpose coupling.)*

**Voice rules**
- *(TBD)*

---

## tarot

### L1-L3 register
**Vocabulary**
*(TBD — Major Arcana · Court cards · Minor Arcana suits · traditional spreads · upright vs reversed.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — Mitwelt-archetypal current · Cl(7) Anandamaya imperishable seed · joint Major Arcana stack as cultural-current vector.)*

**Voice rules**
- *(TBD)*

---

## i-ching

### L1-L3 register
**Vocabulary**
*(TBD — Hexagram name + number · changing lines · Sequence of King Wen · Image · Judgment · Trigrams.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — compositional state-vector · 64-state semantic phase-space.)*

**Voice rules**
- *(TBD)*

---

## numerology

### L1-L3 register
**Vocabulary**
*(TBD — Life Path · Expression · Soul Urge · Personality (Pythagorean) · Master Numbers · Day Number · Year Number.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — numeric-seed bhuta resonance · digit-root cycle as Cl(2) compression signal.)*

**Voice rules**
- *(TBD)*

---

## biorhythm

### L1-L3 register
**Vocabulary**
*(TBD — Physical · Emotional · Intellectual sine waves · cycle days · critical days · peak vs trough.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — Pranic phase-lock cadence · Cl(1) Pranamaya wave-superposition signature.)*

**Voice rules**
- *(TBD)*

---

## nadabrahman

### L1-L3 register
**Vocabulary**
*(TBD — sound-syllable resonance · Ayurvedic body type (Vata/Pitta/Kapha) · personal mantra · bija syllable.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — Cl(1) Pranamaya audio-signature · syllabic resonance as breath-current.)*

**Voice rules**
- *(TBD)*

---

## biofield

### L1-L3 register
**Vocabulary**
*(TBD — Aura layers · Chakras (7) · subtle body · prana flow · energetic blockages.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — Annamaya (body) measurable substrate · Multiscan-PRO / biophoton imaging signal · Cl(0) somatic phase-state.)*

**Voice rules**
- *(TBD)*

---

## face-reading

### L1-L3 register
**Vocabulary**
*(TBD — Mian Xiang traditional 5-feature reading · forehead/eyes/nose/mouth/chin signs · facial mole + scar interpretation.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — Cl(0) Annamaya morphological signal · facial-feature constellation as embodied signature.)*

**Voice rules**
- *(TBD)*

---

## sacred-geometry

### L1-L3 register
**Vocabulary**
*(TBD — Yantras · personal mandala · Sri Yantra · Flower of Life · Metatron's Cube · sacred ratios.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — Anandamaya Cl(7) imperishable form-current · generative grammar of mandalic compression.)*

**Voice rules**
- *(TBD)*

---

## enneagram

### L1-L3 register
**Vocabulary**
*(TBD — Type 1-9 · wings · arrows of integration/disintegration · triads (Gut/Heart/Head) · instincts (SP/SO/SX).)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — pattern-engine bias map · Manomaya Cl(2) attentional-vector signature.)*

**Voice rules**
- *(TBD)*

---

## sigil-forge

### L1-L3 register
**Vocabulary**
*(TBD — Personal sigil · intention-encoded glyph · ritual activation · talismanic geometry.)*

**Voice rules**
- *(TBD)*

### L4-L5 register
**Vocabulary**
*(TBD — AKSHARA-seed materialization tool · Cl(7) imperishable-seed externalization.)*

**Voice rules**
- *(TBD)*

---

## Lessons (autoresearch-appended)

*(No autoresearch lessons yet. Per-engine lexicon refinements will be appended date-stamped per autoresearch contract.)*
