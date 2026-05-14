// ─── Autoresearch config: business-partners ────────────────────────────
// Variant axis: Pass γ failure-mode specificity.
// Mode-specific judge axis: operational specificity.
//
// Closes #56 (P6.2).

import type { ModeAutoresearchConfig } from './runner.js';
import { appendToSection } from './_mutators.js';

export const MODE_AUTORESEARCH_CONFIG: ModeAutoresearchConfig = {
  mode_key: 'business-partners',
  variant_axis: 'Pass γ failure-mode specificity',
  workspace_slug: 'autoresearch-business-partners',
  closes_issue: '#56',
  mode_judge_axis: {
    name: 'operational_specificity',
    description: 'Are the friction / failure modes named with concrete operational consequences (what decisions break, in what windows, with what early-warning signals), or are they generic personality differences? (10 = chart-architecturally specific + actionable; 0 = abstract platitudes.)',
  },
  variants: [
    {
      name: 'baseline',
      description: 'Canonical Pass γ template, no additional structure demands.',
      mutate: (raw) => appendToSection(raw, 'pass-gamma-template', '<!-- baseline variant — no template mutation -->'),
    },
    {
      name: 'explicit-vulnerability-table',
      description: 'Pass γ requires a structured 3-5-row vulnerability table — chart source / operational manifestation / early-warning signal / remediation lever — for the specific failure modes named.',
      mutate: (raw) => appendToSection(raw, 'pass-gamma-template', `
ADDITIONAL CONSTRAINT (variant: explicit-vulnerability-table):
- In Section 3.3 ("Where the Joint Operative is Structurally Vulnerable"), produce a STRUCTURED TABLE with 3-5 rows:

| # | Chart-Architectural Source | Operational Manifestation | Early-Warning Signal | Remediation Lever (chart-anchored) |
|---|---|---|---|---|
| 1 | [specific placements] | [what it looks like in actual work] | [what to notice] | [tied to chart — e.g. "in [partner]'s [graha] AD windows..."] |

- Each remediation lever MUST be anchored in the chart (a specific dasha window, a specific transit, a specific partner's chart-strength). NEVER generic operational advice like "communicate more clearly" or "schedule regular check-ins".
- The table format is the deliverable — partners need to be able to print it and act on each row.
`),
    },
    {
      name: 'vulnerability-table-plus-remediation-cadence',
      description: 'Vulnerability table PLUS a quarter-by-quarter remediation cadence — which vulnerability is most likely to surface in which calendar quarter of the next 2 years, anchored in the joint dasha matrix.',
      mutate: (raw) => appendToSection(raw, 'pass-gamma-template', `
ADDITIONAL CONSTRAINT (variant: vulnerability-table + remediation-cadence):
- Section 3.3: produce the structured vulnerability table as in 'explicit-vulnerability-table' above.
- Then ADD Section 3.5 ("Remediation Cadence") — a quarter-by-quarter table for the next 2 years (Q1 2026 through Q4 2027):

| Quarter | Active Vulnerability (from § 3.3) | Dasha-AD State (both partners) | Operational Watch-For | Remediation Action |
|---|---|---|---|---|

- Each quarter MUST link to a row in the vulnerability table by # — show WHICH vulnerability is most operative in WHICH window.
- The Dasha-AD State column names the specific antardasha period for both partners.
- The Remediation Action is concrete and chart-anchored — not generic.
- Partners walk away knowing in which calendar quarter each failure-mode is most likely to surface, and what specifically to do in that quarter.
`),
    },
  ],
};
