// ─── SVG: Team Web — N-Subject Role-Clustered Force Graph ──────────────
// Force-directed-style layout with DETERMINISTIC precomputed positions
// (print-stable, no animation needed). Nodes are grouped by role-cluster
// and placed on a circle, with each cluster occupying a contiguous arc.
// Critical-path partnership edges render prominently; non-critical edges
// render as faint background lines. Each cluster has a translucent
// bounding hull. Center carries the joint-operative archetype label.
//
// Per design doc § 5 — `web-graph` topology renderer.
// P5.2 deliverable. Closes #53.

import { BRAND } from '../styles.js';

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type RoleCluster = 'visionaries' | 'operators' | 'integrators' | 'connectors';

export interface TeamMember {
  name: string;
  /** Role-cluster assignment. Determines color + cluster placement. */
  role_cluster: RoleCluster;
  /** Optional — hex color override. Falls back to cluster-color. */
  color?: string;
  current_mahadasha_lord?: string;
  next_mahadasha_lord?: string;
  next_mahadasha_iso?: string;
}

export interface CriticalPathEdge {
  /** Indices into the members[] array. */
  a: number;
  b: number;
  /** Resonance strength 0-1; renders thicker for higher values. */
  weight?: number;
  /** Optional short label describing the partnership. */
  label?: string;
}

export interface TeamWebData {
  members: TeamMember[];
  /** 3-5 critical-path partnerships identified by the outline pass. */
  critical_path_edges?: CriticalPathEdge[];
  /** Joint-operative archetype name shown at center (e.g., "The Cauldron"). */
  joint_operative_archetype?: string;
  /** Optional themes that recur across the team — bedrock currents. */
  shared_keys?: string[];
}

// ────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────

const CLUSTER_COLORS: Record<RoleCluster, string> = {
  visionaries: '#E8B923',   // jupiter-gold
  operators:   '#5A7090',   // saturn-slate
  integrators: BRAND.coherenceEmerald,
  connectors:  '#D4A8FF',   // venus-violet
};

const CLUSTER_DISPLAY: Record<RoleCluster, string> = {
  visionaries: 'VISIONARIES',
  operators:   'OPERATORS',
  integrators: 'INTEGRATORS',
  connectors:  'CONNECTORS',
};

const CLUSTER_ORDER: RoleCluster[] = ['visionaries', 'operators', 'integrators', 'connectors'];

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function formatPivot(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso.slice(0, 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

/**
 * Convex hull of a set of points using the gift-wrapping (Jarvis march)
 * algorithm. Simple, deterministic, fine for 1-12 input points.
 */
function convexHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length < 3) return [...points];

  // Start with the leftmost point
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].x < points[start].x ||
        (points[i].x === points[start].x && points[i].y < points[start].y)) {
      start = i;
    }
  }

  const hull: Array<{ x: number; y: number }> = [];
  let current = start;
  do {
    hull.push(points[current]);
    let next = (current + 1) % points.length;
    for (let i = 0; i < points.length; i++) {
      // Cross product: positive = counter-clockwise turn
      const o = (points[next].x - points[current].x) * (points[i].y - points[current].y) -
                (points[next].y - points[current].y) * (points[i].x - points[current].x);
      if (o < 0) next = i;
    }
    current = next;
  } while (current !== start && hull.length < points.length);

  return hull;
}

/**
 * Inflate a polygon outward from its centroid by `padding` pixels.
 * Gives the cluster bounding hull some breathing room around its nodes.
 */
function inflateHull(hull: Array<{ x: number; y: number }>, padding: number): Array<{ x: number; y: number }> {
  if (hull.length === 0) return hull;
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return p;
    return {
      x: p.x + (dx / len) * padding,
      y: p.y + (dy / len) * padding,
    };
  });
}

// ────────────────────────────────────────────────────────────────────────
// Renderer
// ────────────────────────────────────────────────────────────────────────

export function renderTeamWeb(data: TeamWebData, opts: { width?: number } = {}): string {
  const W = opts.width ?? 880;
  const H = W;
  const cx = W / 2, cy = H / 2 + 12;
  const fieldR = W * 0.36;

  if (data.members.length < 2 || data.members.length > 12) {
    throw new Error(`team-web requires 2-12 members, got ${data.members.length}`);
  }

  // ── Group members by cluster ─────────────────────────────────────────
  // Preserve original index for edge references; group ordering follows
  // CLUSTER_ORDER for visual stability across runs.
  const grouped: Record<RoleCluster, Array<{ member: TeamMember; idx: number }>> = {
    visionaries: [], operators: [], integrators: [], connectors: [],
  };
  for (let i = 0; i < data.members.length; i++) {
    const m = data.members[i];
    if (!grouped[m.role_cluster]) {
      // unknown cluster — coerce to connectors as a sensible default
      grouped.connectors.push({ member: { ...m, role_cluster: 'connectors' }, idx: i });
    } else {
      grouped[m.role_cluster].push({ member: m, idx: i });
    }
  }
  const activeClusters = CLUSTER_ORDER.filter((c) => grouped[c].length > 0);
  const totalNodes = data.members.length;

  // ── Place nodes on a circle, each cluster occupying a contiguous arc ─
  // Cluster arc-span proportional to cluster size; small gap between clusters.
  const gapAngle = (Math.PI / 30);  // ~6° gap between clusters
  const totalGap = gapAngle * activeClusters.length;
  const availableArc = (2 * Math.PI) - totalGap;

  const positions: Array<{ x: number; y: number; cluster: RoleCluster; idx: number }> = [];
  let angleCursor = -Math.PI / 2;   // start at top

  for (const cluster of activeClusters) {
    const clusterNodes = grouped[cluster];
    const clusterArcShare = (clusterNodes.length / totalNodes) * availableArc;
    // If the cluster has only 1 node, place it at its arc center; otherwise distribute.
    if (clusterNodes.length === 1) {
      const a = angleCursor + clusterArcShare / 2;
      positions[clusterNodes[0].idx] = {
        x: cx + fieldR * Math.cos(a),
        y: cy + fieldR * Math.sin(a),
        cluster,
        idx: clusterNodes[0].idx,
      };
    } else {
      const step = clusterArcShare / (clusterNodes.length - 1);
      for (let i = 0; i < clusterNodes.length; i++) {
        const a = angleCursor + step * i;
        positions[clusterNodes[i].idx] = {
          x: cx + fieldR * Math.cos(a),
          y: cy + fieldR * Math.sin(a),
          cluster,
          idx: clusterNodes[i].idx,
        };
      }
    }
    angleCursor += clusterArcShare + gapAngle;
  }

  // ── Cluster bounding hulls (translucent fill behind nodes) ───────────
  const clusterHulls = activeClusters.map((cluster) => {
    const nodes = grouped[cluster].map((g) => positions[g.idx]);
    if (nodes.length === 0) return '';
    const color = CLUSTER_COLORS[cluster];
    // For 1-2 nodes, draw a circle around them; for 3+, draw the convex hull.
    if (nodes.length === 1) {
      return `<circle cx="${nodes[0].x}" cy="${nodes[0].y}" r="44"
              fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="0.5"
              stroke-opacity="0.35" data-cluster="${cluster}"/>`;
    }
    if (nodes.length === 2) {
      const mx = (nodes[0].x + nodes[1].x) / 2;
      const my = (nodes[0].y + nodes[1].y) / 2;
      const dx = nodes[1].x - nodes[0].x;
      const dy = nodes[1].y - nodes[0].y;
      const r = Math.sqrt(dx * dx + dy * dy) / 2 + 36;
      return `<circle cx="${mx}" cy="${my}" r="${r}"
              fill="${color}" fill-opacity="0.07" stroke="${color}" stroke-width="0.5"
              stroke-opacity="0.3" data-cluster="${cluster}"/>`;
    }
    const hull = inflateHull(convexHull(nodes), 28);
    const d = hull.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    return `<path d="${d}" fill="${color}" fill-opacity="0.07"
            stroke="${color}" stroke-width="0.5" stroke-opacity="0.3"
            data-cluster="${cluster}"/>`;
  }).join('');

  // ── Cluster labels (positioned at the arc midpoint, outside fieldR) ─
  let clusterLabelAngleCursor = -Math.PI / 2;
  const clusterLabels = activeClusters.map((cluster) => {
    const clusterNodes = grouped[cluster];
    const clusterArcShare = (clusterNodes.length / totalNodes) * availableArc;
    const midA = clusterLabelAngleCursor + clusterArcShare / 2;
    clusterLabelAngleCursor += clusterArcShare + gapAngle;

    const labelR = fieldR + 78;
    const lx = cx + labelR * Math.cos(midA);
    const ly = cy + labelR * Math.sin(midA);
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    if (Math.cos(midA) > 0.3) anchor = 'start';
    else if (Math.cos(midA) < -0.3) anchor = 'end';

    return `
      <text x="${lx}" y="${ly}" text-anchor="${anchor}"
            font-family="SF Mono, monospace" font-size="9" font-weight="700"
            fill="${CLUSTER_COLORS[cluster]}" letter-spacing="0.32em"
            data-cluster-label="${cluster}">${CLUSTER_DISPLAY[cluster]}</text>
      <text x="${lx}" y="${ly + 14}" text-anchor="${anchor}"
            font-family="SF Mono, monospace" font-size="7"
            fill="${BRAND.mutedSilver}" letter-spacing="0.22em" opacity="0.7">${clusterNodes.length} MEMBER${clusterNodes.length === 1 ? '' : 'S'}</text>`;
  }).join('');

  // ── Non-critical edges (faint background — every pair gets one) ──────
  const criticalSet = new Set(
    (data.critical_path_edges ?? []).map(
      (e) => `${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}`,
    ),
  );
  const backgroundEdges: string[] = [];
  for (let i = 0; i < data.members.length; i++) {
    for (let j = i + 1; j < data.members.length; j++) {
      const key = `${i}-${j}`;
      if (criticalSet.has(key)) continue;   // skip — critical edges drawn separately
      const a = positions[i], b = positions[j];
      if (!a || !b) continue;
      backgroundEdges.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
                  stroke="${BRAND.mutedSilver}" stroke-width="0.3"
                  stroke-opacity="0.1" data-edge="${i}-${j}" data-critical="false"/>`);
    }
  }

  // ── Critical-path edges (luminous gradient, weighted) ─────────────────
  const criticalEdges = (data.critical_path_edges ?? []).map((edge, idx) => {
    const a = positions[edge.a], b = positions[edge.b];
    if (!a || !b) return '';
    const weight = Math.max(0.2, Math.min(1, edge.weight ?? 0.8));
    const strokeW = 1 + weight * 1.5;
    const ca = CLUSTER_COLORS[a.cluster];
    const cb = CLUSTER_COLORS[b.cluster];
    const gradId = `team-edge-${idx}`;
    const label = edge.label ?? '';
    return `
      <defs>
        <linearGradient id="${gradId}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${ca}" stop-opacity="0.7"/>
          <stop offset="50%" stop-color="${BRAND.sacredGold}" stop-opacity="0.75"/>
          <stop offset="100%" stop-color="${cb}" stop-opacity="0.7"/>
        </linearGradient>
      </defs>
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
            stroke="${BRAND.sacredGold}" stroke-width="${strokeW + 1.5}" stroke-opacity="0.1"
            data-edge="${edge.a}-${edge.b}" data-critical="glow"/>
      <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
            stroke="url(#${gradId})" stroke-width="${strokeW}"
            data-edge="${edge.a}-${edge.b}" data-critical="true"
            data-label="${label.replace(/"/g, '&quot;')}"/>`;
  }).join('');

  // ── Nodes (member circles + name labels) ─────────────────────────────
  const nodeRadius = totalNodes > 8 ? 12 : 16;
  const nodes = positions.map((p, i) => {
    const m = data.members[i];
    if (!p) return '';
    const color = m.color ?? CLUSTER_COLORS[p.cluster];
    const mdLine = m.current_mahadasha_lord && m.next_mahadasha_lord
      ? `${m.current_mahadasha_lord.slice(0, 3).toUpperCase()}→${m.next_mahadasha_lord.slice(0, 3).toUpperCase()}`
      : '';
    const pivot = formatPivot(m.next_mahadasha_iso);

    // Label radial anchor — push outward from center
    const angleFromCenter = Math.atan2(p.y - cy, p.x - cx);
    const labelDist = nodeRadius + 18;
    const lx = p.x + labelDist * Math.cos(angleFromCenter);
    const ly = p.y + labelDist * Math.sin(angleFromCenter);
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    if (Math.cos(angleFromCenter) > 0.25) anchor = 'start';
    else if (Math.cos(angleFromCenter) < -0.25) anchor = 'end';

    return `
      <!-- node ${i} (${p.cluster}) -->
      <circle cx="${p.x}" cy="${p.y}" r="${nodeRadius + 5}"
              fill="${color}" fill-opacity="0.15" stroke="none"
              data-node="${i}" data-cluster-node="${p.cluster}"/>
      <circle cx="${p.x}" cy="${p.y}" r="${nodeRadius}"
              fill="${BRAND.voidBlack}" stroke="${color}" stroke-width="1.5"
              data-node="${i}" data-cluster-node="${p.cluster}"/>
      <circle cx="${p.x}" cy="${p.y}" r="${nodeRadius - 5}"
              fill="${color}" fill-opacity="0.4"/>
      <text x="${lx}" y="${ly - 4}" text-anchor="${anchor}"
            font-family="Panchang, serif" font-weight="700" font-size="11"
            fill="${color}" letter-spacing="0.04em">${m.name}</text>
      ${mdLine ? `<text x="${lx}" y="${ly + 8}" text-anchor="${anchor}"
            font-family="SF Mono, monospace" font-size="6.5"
            fill="${BRAND.mutedSilver}" letter-spacing="0.16em">${mdLine}</text>` : ''}
      ${pivot ? `<text x="${lx}" y="${ly + 18}" text-anchor="${anchor}"
            font-family="Panchang, serif" font-style="italic" font-size="7"
            fill="${BRAND.sacredGold}">${pivot}</text>` : ''}`;
  }).join('');

  // ── Center seed: joint-operative archetype label ─────────────────────
  const archetype = data.joint_operative_archetype || 'TEAM FIELD';
  const center = `
    <circle cx="${cx}" cy="${cy}" r="56"
            fill="${BRAND.voidBlack}" stroke="${BRAND.sacredGold}" stroke-width="1.2"/>
    <circle cx="${cx}" cy="${cy}" r="42"
            fill="none" stroke="${BRAND.sacredGold}" stroke-width="0.4" opacity="0.4"/>
    <circle cx="${cx}" cy="${cy}" r="28"
            fill="none" stroke="${BRAND.sacredGold}" stroke-width="0.3" opacity="0.3"/>
    <text x="${cx}" y="${cy - 6}" text-anchor="middle"
          font-family="Panchang, serif" font-size="10" font-weight="700"
          fill="${BRAND.sacredGold}" letter-spacing="0.18em">JOINT</text>
    <text x="${cx}" y="${cy + 8}" text-anchor="middle"
          font-family="Panchang, serif" font-size="10" font-weight="700"
          fill="${BRAND.sacredGold}" letter-spacing="0.18em">OPERATIVE</text>
    ${archetype !== 'TEAM FIELD' ? `<text x="${cx}" y="${cy + 22}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="6.5"
          fill="${BRAND.mutedSilver}" letter-spacing="0.22em">${archetype.toUpperCase()}</text>` : ''}`;

  // ── Shared keys legend ───────────────────────────────────────────────
  const sharedLegend = data.shared_keys && data.shared_keys.length > 0 ? `
    <text x="${cx}" y="${H - 40}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="7.5"
          fill="${BRAND.mutedSilver}" letter-spacing="0.32em">SHARED OPERATIONAL CURRENTS</text>
    <text x="${cx}" y="${H - 20}" text-anchor="middle"
          font-family="Panchang, serif" font-size="11" font-style="italic" font-weight="500"
          fill="${BRAND.sacredGold}" letter-spacing="0.01em">${data.shared_keys.join('   ·   ')}</text>` : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="team-bg" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${BRAND.sacredGold}" stop-opacity="0.05"/>
      <stop offset="60%" stop-color="${BRAND.witnessViolet}" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="${BRAND.voidBlack}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#team-bg)"/>
  ${clusterHulls}
  ${backgroundEdges.join('')}
  ${criticalEdges}
  ${nodes}
  ${clusterLabels}
  ${center}
  ${sharedLegend}
</svg>`;
}

export { CLUSTER_COLORS, CLUSTER_DISPLAY, CLUSTER_ORDER };
