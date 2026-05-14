// ─── Autoresearch config: team-synergy ─────────────────────────────────
// Variant axis: outline-pass prompt phrasing (cluster-naming-first /
// role-stack-first / critical-path-first).
// Mode-specific judge axis: role-cluster legibility.
//
// Closes #58 (P6.4).

import type { ModeAutoresearchConfig } from './runner.js';
import { appendToSection } from './_mutators.js';

export const MODE_AUTORESEARCH_CONFIG: ModeAutoresearchConfig = {
  mode_key: 'team-synergy',
  variant_axis: 'Outline-pass prompt phrasing (sequence-of-emphasis)',
  workspace_slug: 'autoresearch-team-synergy',
  closes_issue: '#58',
  mode_judge_axis: {
    name: 'role_cluster_legibility',
    description: 'Is the role-cluster assignment + critical-path identification produced as STRUCTURED DATA (a parseable table + a numbered list) rather than as prose? Does each cluster-member assignment surface from a SPECIFIC chart signal? (10 = clean structured map downstream passes can execute against; 0 = clusters named loosely with no structural anchor.)',
  },
  variants: [
    {
      name: 'cluster-naming-first',
      description: 'Outline pass orders: (1) role-cluster assignment table FIRST → (2) critical-path identification SECOND → (3) operational cadence THIRD. Clusters anchor the rest of the outline.',
      mutate: (raw) => appendToSection(raw, 'pass-outline-template', `
ADDITIONAL CONSTRAINT (variant: cluster-naming-first):
- The outline pass MUST be ordered: cluster table → critical paths → operational cadence → joint-operative archetype.
- The cluster-assignment table comes FIRST and anchors everything downstream. Each subsequent section REFERENCES the cluster assignments by member name.
- Critical-path partnerships are NAMED in terms of cluster-pair handoffs: "Vision → Operations handoff carried by [member A] × [member B]".
- Operational cadence is decoded BY CLUSTER: which clusters are in expansion when, which in consolidation.
`),
    },
    {
      name: 'role-stack-first',
      description: 'Outline pass orders: (1) role-stack analysis (Vision/Ops/Execution graha signals) FIRST → (2) cluster assignments emerge from role-stack → (3) critical paths from cluster-stack handoffs. Graha signals anchor the rest.',
      mutate: (raw) => appendToSection(raw, 'pass-outline-template', `
ADDITIONAL CONSTRAINT (variant: role-stack-first):
- The outline pass MUST start with the ROLE-STACK analysis — for each team member, identify their dominant graha signal (Jupiter / Saturn / Mars / Mercury / etc.) and which role-stack tier (Vision / Operations / Execution / Integration / Connection) they primarily occupy.
- Cluster assignments emerge FROM the role-stack — clusters are derived from graha-signal groupings, not pre-declared.
- Critical-path partnerships are identified as ROLE-STACK HANDOFFS — Vision-graha-A × Operations-graha-B is a more meaningful critical path than two same-stack members.
- The chart-architectural anchoring is the GRAHA SIGNAL — every cluster assignment must point to a specific graha placement.
`),
    },
    {
      name: 'critical-path-first',
      description: 'Outline pass orders: (1) critical-path partnerships FIRST (find the 3-5 load-bearing pair-resonances by Vedic / HD cross-coupling) → (2) cluster assignments derived from who-anchors-which-critical-path → (3) operational cadence emerges from critical-path activation order.',
      mutate: (raw) => appendToSection(raw, 'pass-outline-template', `
ADDITIONAL CONSTRAINT (variant: critical-path-first):
- The outline pass MUST start by IDENTIFYING the 3-5 critical-path partnerships first — find pair-resonances using cross-chart Vedic disposition + HD electromagnetic channel pre-completion + Gene Key sphere coupling. These 3-5 pairs are the team's load-bearing skeleton.
- Cluster assignments are DERIVED: each member's role-cluster is determined by which critical paths they anchor. A member who anchors 2+ critical paths is a HUB.
- The operational cadence emerges from the ACTIVATION ORDER of the critical paths — which pair's dasha window opens when.
- This approach foregrounds RELATIONAL STRUCTURE over individual-role-categorization. The team is decoded as a graph of critical edges, not as a list of typed members.
`),
    },
  ],
};
