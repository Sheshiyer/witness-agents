// ─── Autoresearch config: family-penta ─────────────────────────────────
// Variant axis: Pass α lineage-current strength (4th vs 9th vs 12th house emphasis).
// Mode-specific judge axis: lineage-current legibility.
//
// Closes #57 (P6.3).

import type { ModeAutoresearchConfig } from './runner.js';
import { appendToSection } from './_mutators.js';

export const MODE_AUTORESEARCH_CONFIG: ModeAutoresearchConfig = {
  mode_key: 'family-penta',
  variant_axis: 'Pass α lineage-current strength (4th / 9th / 12th house emphasis)',
  workspace_slug: 'autoresearch-family-penta',
  closes_issue: '#57',
  mode_judge_axis: {
    name: 'lineage_current_legibility',
    description: 'Is the lineage-current named with specific chart-architectural anchoring (4th/9th/12th house cross-overlay + Pitru-karaka + generational nakshatra + Gene-Key sphere-of-purpose) and made operationally legible — what the family inherited, what it propagates? (10 = lineage is decoded as structural current; 0 = generic family-systems generalities.)',
  },
  variants: [
    {
      name: '4th-house-emphasis',
      description: 'Pass α foregrounds the 4th-house (mother / root / ancestral home) cross-overlay as the PRIMARY lineage anchor — 9th and 12th read as secondary.',
      mutate: (raw) => appendToSection(raw, 'pass-alpha-template', `
ADDITIONAL CONSTRAINT (variant: 4th-house-emphasis):
- In Section 1.1, treat the 4th house as the PRIMARY architectural anchor of the family's lineage-current. The 4th-house cross-overlay table is your starting point.
- The Moon (the matra/mother karaka) is the SECOND primary signal — Section 1.3 (Moon cross-resonance) carries equal weight to Section 1.1.
- The 9th (paternal-dharma) and 12th (lineage-karma) houses are SECONDARY signals that ratify or qualify the 4th-house signature.
- The family-field's lineage-current is DECODED through the maternal-rooted axis: what came in through the mother / root / home, and how that propagates through all five members.
`),
    },
    {
      name: '9th-house-emphasis',
      description: 'Pass α foregrounds the 9th-house (father / dharma / ancestral wisdom) cross-overlay as the PRIMARY lineage anchor — 4th and 12th read as secondary.',
      mutate: (raw) => appendToSection(raw, 'pass-alpha-template', `
ADDITIONAL CONSTRAINT (variant: 9th-house-emphasis):
- In Section 1.1, treat the 9th house as the PRIMARY architectural anchor — the paternal / dharmic / ancestral-wisdom axis.
- The Sun (pitra / father / sovereignty karaka) is the SECOND primary signal.
- The 4th (mother / root) and 12th (lineage-karma) are SECONDARY ratifying signals.
- The family-field's lineage-current is DECODED through the paternal-dharmic axis: what wisdom-current the family is structurally configured to TRANSMIT, what dharma signature the family-field carries.
`),
    },
    {
      name: '12th-house-emphasis',
      description: 'Pass α foregrounds the 12th-house (the imperishable / lineage-karma / what comes through from before) as the PRIMARY anchor — 4th and 9th read as secondary.',
      mutate: (raw) => appendToSection(raw, 'pass-alpha-template', `
ADDITIONAL CONSTRAINT (variant: 12th-house-emphasis):
- In Section 1.1, treat the 12th house as the PRIMARY architectural anchor — the imperishable / lineage-karma / what-came-through-from-before axis.
- The Atmakaraka of each member + the Pitru-karaka (4th-from-Atmakaraka) carry equal primacy.
- The 4th (mother / root) and 9th (father / dharma) are SECONDARY ratifying signals.
- The family-field's lineage-current is DECODED through the karmic-transmission axis: what UNFINISHED current came in from previous generations, what each member is structurally configured to RELEASE or TRANSMUTE.
`),
    },
    {
      name: 'balanced-4-9-12',
      description: 'Pass α treats 4th + 9th + 12th as a COHERENT THREE-FOLD AXIS — neither dominates; the lineage-current is decoded as the joint pattern of all three.',
      mutate: (raw) => appendToSection(raw, 'pass-alpha-template', `
ADDITIONAL CONSTRAINT (variant: balanced-4-9-12):
- In Section 1.1, produce a THREE-COLUMN cross-overlay table (4th house | 9th house | 12th house) for all five subjects. NO single house dominates.
- The lineage-current is DECODED as the JOINT pattern across all three columns — what 4th says, what 9th says, what 12th says, and where the three converge or diverge.
- Section 1.2 (Pitru-karaka) is read AGAINST this three-fold table — which member's Pitru-karaka activates which house most strongly determines that member's structural role in the lineage-transmission.
- The mature lineage-current decoding names ALL THREE coordinates explicitly.
`),
    },
  ],
};
