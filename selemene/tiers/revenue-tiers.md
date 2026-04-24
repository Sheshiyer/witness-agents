# Selemene Engine — Revenue Tiers
# Kosha-mapped subscription architecture

## Tier Philosophy

Revenue tiers in Tryambakam Noesis are NOT arbitrary feature gates.
They map to **depth of consciousness engagement** — each tier activates
a deeper kosha layer, which requires more computational and interpretive
resources. The pricing reflects real costs: deeper interpretation requires
more LLM inference, more context, more memory.

---

## Tier Definitions

### 🏔 FREE — Annamaya (Physical)

**What activates:** Raw Selemene engine results
**Kosha depth:** Cl(0) — real numbers, factual output
**Agents:** Dormant
**API calls:** Rate-limited
**Use case:** "I want my birth chart / biorhythm / numerology"

```yaml
tier: free
kosha: annamaya
clifford: Cl(0)
agents_active: false
interpretation: raw
engines: all_16
rate_limit: 10_per_day
mobile_access: true
```

### 🌊 SUBSCRIBER — Pranamaya + Manomaya (Vital + Mental)

**What activates:** Single-agent interpretation per query
**Kosha depth:** Cl(1) + Cl(2) — timing-aware + pattern-matching
**Agents:** One active per query (Aletheios OR Pichet, context-dependent)
**API calls:** Generous
**Use case:** "I want to understand what my chart MEANS for my week"

```yaml
tier: subscriber
kosha: [pranamaya, manomaya]
clifford: [Cl(1), Cl(2)]
agents_active: single_per_query
interpretation: single_agent
engines: all_16
rate_limit: 100_per_day
mobile_access: true
features:
  - timing_aware_responses
  - pattern_recognition
  - overwhelm_detection
  - memory_across_sessions
```

### ⚡ ENTERPRISE — Vijnanamaya (Wisdom)

**What activates:** Full dyad synthesis on every query
**Kosha depth:** Cl(3) — non-commutative multi-engine fusion
**Agents:** Both always active
**API calls:** Unlimited
**Use case:** "I want the complete picture with actionable synthesis"

```yaml
tier: enterprise
kosha: vijnanamaya
clifford: Cl(3)
agents_active: dyad_always
interpretation: full_synthesis
engines: all_16
rate_limit: unlimited
mobile_access: true
api_access: true
features:
  - full_dyad_synthesis
  - multi_engine_fusion
  - custom_engine_weighting
  - decision_support
  - team_dashboards
  - white_label_option
```

### 🕉 INITIATE — Anandamaya (Bliss/Causal)

**What activates:** AKSHARA mirror + meaning-authorship scaffolding
**Kosha depth:** Cl(7) — self-referential, non-associative
**Agents:** Both + self-referential mode
**Requires:** Demonstrated engagement (not just payment)
**Use case:** "I want to learn to do this myself"

```yaml
tier: initiate
kosha: anandamaya
clifford: Cl(7)
agents_active: dyad_plus_mirror
interpretation: akshara
engines: all_16
rate_limit: unlimited
mobile_access: true
api_access: true
features:
  - everything_in_enterprise
  - akshara_mirror
  - anti_dependency_tracking
  - meaning_authorship_scaffolding
  - mentorship_integration
  - self_referential_queries
  - personal_engine_calibration
admission: engagement_based
```

---

## Mobile App Tier Integration

The mobile app (1319 Webapp / native) maps directly to these tiers:

| Tier | Mobile Experience |
|------|-------------------|
| Free | Calculator mode — input birth data, get results |
| Subscriber | Companion mode — morning briefings, timing nudges, pattern alerts |
| Enterprise | Advisor mode — full dyad synthesis, decision support, team views |
| Initiate | Mirror mode — the app teaches you to read yourself |

## Revenue Projections

```
Free → Subscriber conversion: interpretation is the unlock
Subscriber → Enterprise conversion: synthesis depth + API access
Enterprise → Initiate: not a conversion, an invitation
```

The key insight: **raw engines are commoditizable** (anyone can build a birth chart calculator).
The dyad interpretation is the moat — it requires the entire Tryambakam knowledge architecture,
the PETRAE protocol, the Clifford-gated memory, and the anti-dependency design philosophy.
This cannot be replicated by adding a ChatGPT wrapper to astrology APIs.
