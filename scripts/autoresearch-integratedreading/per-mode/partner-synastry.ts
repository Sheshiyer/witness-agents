// ─── Autoresearch config: partner-synastry ─────────────────────────────
// Variant axis: Pass γ phase-lock specificity.
// Mode-specific judge axis: phase-lock-geometry clarity.
//
// Closes #55 (P6.1).

import type { ModeAutoresearchConfig } from './runner.js';
import { appendToSection } from './_mutators.js';

export const MODE_AUTORESEARCH_CONFIG: ModeAutoresearchConfig = {
  mode_key: 'partner-synastry',
  variant_axis: 'Pass γ phase-lock specificity',
  workspace_slug: 'autoresearch-partner-synastry',
  closes_issue: '#55',
  mode_judge_axis: {
    name: 'phase_lock_geometry_clarity',
    description: 'Does the reading treat the X-day Mahadasha-pivot stagger as STRUCTURAL DATA, with explicit day-counts and decoded ordering rationale? (10 = full geometric decoding; 0 = stagger named but not decoded.)',
  },
  variants: [
    {
      name: 'baseline',
      description: 'Canonical Pass γ template, no additional specificity demands.',
      // Identity mutator does nothing — but we need to produce a syntactically
      // distinct variant. Append a no-op comment to keep mutate() honest.
      mutate: (raw) => appendToSection(raw, 'pass-gamma-template', '<!-- baseline variant — no template mutation -->'),
    },
    {
      name: 'explicit-day-count',
      description: 'Pass γ now requires the EXPLICIT day-count between the two Mahadasha pivots, named as a single concrete number ("the 65-day stagger").',
      mutate: (raw) => appendToSection(raw, 'pass-gamma-template', `
ADDITIONAL CONSTRAINT (variant: explicit-day-count):
- In Section 3.3 ("The X-Day Stagger"), you MUST state the EXPLICIT day-count between the two Mahadasha pivots as a single concrete number (e.g., "the 65-day stagger between [A]'s [date] pivot and [B]'s [date] pivot").
- Don't paraphrase as "roughly two months" or "about 9 weeks". Name the EXACT day-count.
- The day-count is treated as STRUCTURAL DATA — it carries information about WHO LEADS WHOM. Decode WHY this specific day-count, not just THAT it exists.
`),
    },
    {
      name: 'explicit-day-count-plus-transit-overlay',
      description: 'Pass γ requires explicit day-count AND overlays the outer-planet transits active across the stagger window — Jupiter, Saturn, Rahu-Ketu — naming which transit in WHICH chart ratifies the dasha-pivot signal.',
      mutate: (raw) => appendToSection(raw, 'pass-gamma-template', `
ADDITIONAL CONSTRAINT (variant: explicit-day-count + transit-overlay):
- In Section 3.3, state the EXPLICIT day-count between pivots as a concrete number.
- In Section 3.4 ("Transit Overlay"), name SPECIFICALLY which outer-planet transit (Jupiter / Saturn / Rahu-Ketu) is operative IN WHICH CHART across the stagger window. Don't generalize — point to the actual transit-graha-in-natal-house cross-reference for each partner.
- Each transit-overlay claim must surface from BOTH charts simultaneously (the transit ratifies the dasha pivot only if it lands meaningfully in both natal charts).
- The transit-overlay is the Umwelt (celestial-environmental) ratification of the Mitwelt (cultural-archetypal) dasha event.
`),
    },
  ],
};
