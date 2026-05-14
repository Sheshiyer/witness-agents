// ─── SVG: Composite Pentagon — 5-Subject Family Field ─────────────────
// Five vertices at 72° intervals on a circle (regular pentagon). Each
// vertex carries a subject mini-arc. Ten pair-threads (C(5,2)=10) —
// dominant pairs solid + others faint. Root-pair (vertices 1+2) gets
// a shared inner-arc distinguishing them from the three branches.
// Center seed labeled `LINEAGE FIELD` with 5 petals. Lineage-house glyph
// ring (4/9/12) faint behind the center seed.
//
// Per design doc § 5 — `pentagon` topology renderer.
// P4.2 deliverable. Closes #50.

import { BRAND } from '../styles.js';

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export interface PentaSubject {
  name: string;
  /** Hex string used for the vertex arc + halo. Conventionally:
   *  root-1 + root-2 = warm tones (parchment + sacred-gold),
   *  branches = cool tones (emerald / indigo / witness-violet). */
  arc_color: string;
  current_mahadasha_lord?: string;
  next_mahadasha_lord?: string;
  next_mahadasha_iso?: string;
  /** Optional — display role label below the subject name */
  role?: 'root' | 'branch';
}

export interface CompositePentaData {
  /** Exactly 5 subjects. Convention: indices 0+1 = roots (root-pair gets
   *  shared inner-arc); indices 2,3,4 = branches. */
  subjects: [PentaSubject, PentaSubject, PentaSubject, PentaSubject, PentaSubject];
  /** Optional explicit pair-thread emphasis. Each pair = [i,j] where
   *  i<j ∈ {0..4}. Pairs in this list render solid; pairs absent render faint.
   *  If omitted, the root-pair (0,1) is the only dominant pair by default. */
  dominant_pairs?: Array<[number, number]>;
  /** Optional themes that recur across all 5 charts — bedrock currents. */
  shared_keys?: string[];
}

// ────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ────────────────────────────────────────────────────────────────────────

function formatPivot(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso.slice(0, 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

// ────────────────────────────────────────────────────────────────────────
// Renderer
// ────────────────────────────────────────────────────────────────────────

export function renderCompositePenta(
  data: CompositePentaData,
  opts: { width?: number } = {},
): string {
  const W = opts.width ?? 720;
  const H = W;
  const cx = W / 2, cy = H / 2 + 14;
  const fieldR = W * 0.34;
  const arcRadius = W * 0.085;
  const labelR = fieldR + arcRadius + 30;

  // 5 vertices at 72° intervals, root-pair (0,1) at the TOP (offset to
  // 90° and 162° respectively for the visual "parents-above" convention).
  // Pentagon angle sequence (counter-clockwise from top-right):
  //   -90° (top)   →   roots/branches mix; here we use:
  //   i=0 → -126° (upper-left)   = root-1
  //   i=1 →  -54° (upper-right)  = root-2
  //   i=2 →   18° (right)        = branch-1
  //   i=3 →   90° (bottom)       = branch-2
  //   i=4 →  162° (left)         = branch-3
  // This puts the root-pair as a horizontal couplet at the top, with the
  // three branches fanning out below — the family-tree convention.
  const vertexAngles = [-126, -54, 18, 90, 162].map((d) => (d * Math.PI) / 180);
  const positions = vertexAngles.map((a) => ({
    x: cx + fieldR * Math.cos(a),
    y: cy + fieldR * Math.sin(a),
    angle: a,
  }));

  // ── Subject arcs (halo + main + inner mist + center dot) ────────────
  const arcs = data.subjects.map((s, i) => {
    const p = positions[i];
    return `
      <!-- subject ${i}: halo + arc + mist + dot -->
      <circle cx="${p.x}" cy="${p.y}" r="${arcRadius + 12}"
              fill="none" stroke="${s.arc_color}" stroke-width="0.4" opacity="0.18"/>
      <circle cx="${p.x}" cy="${p.y}" r="${arcRadius + 5}"
              fill="none" stroke="${s.arc_color}" stroke-width="0.6" opacity="0.32"/>
      <circle cx="${p.x}" cy="${p.y}" r="${arcRadius}"
              fill="none" stroke="${s.arc_color}" stroke-width="1.4" opacity="0.85"
              data-vertex="${i}" data-role="${s.role ?? (i < 2 ? 'root' : 'branch')}"/>
      <circle cx="${p.x}" cy="${p.y}" r="${arcRadius - 5}"
              fill="${s.arc_color}" fill-opacity="0.06" stroke="none"/>
      <circle cx="${p.x}" cy="${p.y}" r="2.2"
              fill="${s.arc_color}" opacity="0.8"/>`;
  }).join('');

  // ── Subject labels — on radial sight-lines from center ──────────────
  const labels = data.subjects.map((s, i) => {
    const a = vertexAngles[i];
    const lx = cx + labelR * Math.cos(a);
    const ly = cy + labelR * Math.sin(a);

    // Anchor based on quadrant of label
    let anchor: 'start' | 'middle' | 'end';
    if (Math.cos(a) > 0.25) anchor = 'start';
    else if (Math.cos(a) < -0.25) anchor = 'end';
    else anchor = 'middle';

    // Whether the label is above (top of pentagon) or below center
    const above = Math.sin(a) < 0;

    const mdLine = s.current_mahadasha_lord && s.next_mahadasha_lord
      ? `${s.current_mahadasha_lord.toUpperCase()} → ${s.next_mahadasha_lord.toUpperCase()}`
      : '';
    const pivot = formatPivot(s.next_mahadasha_iso);
    const roleTag = (s.role ?? (i < 2 ? 'root' : 'branch')).toUpperCase();

    // Stack offsets vary by quadrant — labels above-vertex stack upward,
    // labels below-vertex stack downward.
    const nameDy = above ? -14 : 4;
    const roleDy = above ? -28 : -8;
    const mdDy   = above ? 0   : 18;
    const pivDy  = above ? 14  : 32;

    return `
      <!-- label for subject ${i} (${roleTag.toLowerCase()}) -->
      <text x="${lx}" y="${ly + roleDy}" text-anchor="${anchor}"
            font-family="SF Mono, monospace" font-size="6.5"
            fill="${BRAND.coherenceEmerald}" letter-spacing="0.32em" opacity="0.7">${roleTag}</text>
      <text x="${lx}" y="${ly + nameDy}" text-anchor="${anchor}"
            font-family="Panchang, serif" font-weight="700" font-size="13"
            fill="${s.arc_color}" letter-spacing="0.05em">${s.name.toUpperCase()}</text>
      ${mdLine ? `<text x="${lx}" y="${ly + mdDy}" text-anchor="${anchor}"
            font-family="SF Mono, monospace" font-size="7" font-weight="600"
            fill="${BRAND.mutedSilver}" letter-spacing="0.16em">${mdLine}</text>` : ''}
      ${pivot ? `<text x="${lx}" y="${ly + pivDy}" text-anchor="${anchor}"
            font-family="Panchang, serif" font-style="italic" font-size="8.5"
            fill="${BRAND.sacredGold}" letter-spacing="0.02em">pivot · ${pivot}</text>` : ''}`;
  }).join('');

  // ── Pair-threads: all C(5,2)=10 pairs; dominant solid, others faint ─
  const allPairs: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    for (let j = i + 1; j < 5; j++) {
      allPairs.push([i, j]);
    }
  }
  const dominantSet = new Set(
    (data.dominant_pairs ?? [[0, 1]]).map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`),
  );
  const threadStrokes = allPairs.map(([i, j], idx) => {
    const a = positions[i], b = positions[j];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;
    const ax = a.x + ux * arcRadius;
    const ay = a.y + uy * arcRadius;
    const bx = b.x - ux * arcRadius;
    const by = b.y - uy * arcRadius;
    const dominant = dominantSet.has(`${i}-${j}`);
    if (dominant) {
      const ca = data.subjects[i].arc_color;
      const cb = data.subjects[j].arc_color;
      const gradId = `penta-thread-${idx}`;
      return `
        <defs>
          <linearGradient id="${gradId}" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="${ca}" stop-opacity="0.6"/>
            <stop offset="50%" stop-color="${BRAND.sacredGold}" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="${cb}" stop-opacity="0.6"/>
          </linearGradient>
        </defs>
        <line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"
              stroke="${BRAND.sacredGold}" stroke-width="3" stroke-opacity="0.08"/>
        <line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"
              stroke="url(#${gradId})" stroke-width="1.1"
              data-pair="${i}-${j}" data-dominant="true"/>`;
    } else {
      return `
        <line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"
              stroke="${BRAND.sacredGold}" stroke-width="0.5" stroke-opacity="0.16"
              data-pair="${i}-${j}" data-dominant="false"/>`;
    }
  }).join('');

  // ── Root-pair shared inner-arc — the distinguishing root-field mark ──
  const root1 = positions[0], root2 = positions[1];
  const rootMidX = (root1.x + root2.x) / 2;
  const rootMidY = (root1.y + root2.y) / 2;
  // Arc connecting the two roots, bowing UPWARD (toward top of pentagon)
  const rootInnerArc = `
    <!-- Root-pair shared inner-arc — bowing upward, distinguishes roots from branches -->
    <path d="M ${root1.x + arcRadius * 0.3} ${root1.y}
             Q ${rootMidX} ${rootMidY - arcRadius * 2}
             ${root2.x - arcRadius * 0.3} ${root2.y}"
          fill="none" stroke="${BRAND.sacredGold}" stroke-width="1.2" opacity="0.55"
          stroke-dasharray="0" data-root-pair="true"/>
    <text x="${rootMidX}" y="${rootMidY - arcRadius * 2.2}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="7" font-weight="600"
          fill="${BRAND.sacredGold}" letter-spacing="0.28em"
          style="paint-order: stroke; stroke: ${BRAND.voidBlack}; stroke-width: 3px; stroke-linejoin: round;">ROOT FIELD</text>`;

  // ── Center seed: 5 petals + LINEAGE FIELD label + lineage-house ring ─
  const petals = vertexAngles.map((a) => {
    const px = cx + 28 * Math.cos(a);
    const py = cy + 28 * Math.sin(a);
    return `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}"
                  stroke="${BRAND.sacredGold}" stroke-width="0.4" opacity="0.55"/>`;
  }).join('');

  // Lineage-house glyphs (4 / 9 / 12) faint behind the center seed
  const houseRing = `
    <!-- Lineage-house glyph ring (4 / 9 / 12) — faint behind center -->
    <g opacity="0.32">
      <text x="${cx}" y="${cy + 38}" text-anchor="middle"
            font-family="Panchang, serif" font-size="7" font-style="italic"
            fill="${BRAND.mutedSilver}" letter-spacing="0.4em">IV · IX · XII</text>
    </g>`;

  const center = `
    <circle cx="${cx}" cy="${cy}" r="48"
            fill="${BRAND.voidBlack}" stroke="${BRAND.sacredGold}" stroke-width="1.2"/>
    <circle cx="${cx}" cy="${cy}" r="36"
            fill="none" stroke="${BRAND.sacredGold}" stroke-width="0.4" opacity="0.4"/>
    <circle cx="${cx}" cy="${cy}" r="24"
            fill="none" stroke="${BRAND.sacredGold}" stroke-width="0.3" opacity="0.3"/>
    ${petals}
    ${houseRing}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle"
          font-family="Panchang, serif" font-size="11" font-weight="700"
          fill="${BRAND.sacredGold}" letter-spacing="0.22em">LINEAGE</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="6.5"
          fill="${BRAND.mutedSilver}" letter-spacing="0.32em">FIELD</text>`;

  // ── Shared-keys legend (bedrock currents) at bottom ─────────────────
  const sharedLegend = data.shared_keys && data.shared_keys.length > 0 ? `
    <text x="${cx}" y="${H - 38}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="7.5"
          fill="${BRAND.mutedSilver}" letter-spacing="0.32em">SHARED LINEAGE CURRENTS</text>
    <text x="${cx}" y="${H - 18}" text-anchor="middle"
          font-family="Panchang, serif" font-size="11" font-style="italic" font-weight="500"
          fill="${BRAND.sacredGold}" letter-spacing="0.01em">${data.shared_keys.join('   ·   ')}</text>` : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="penta-bg" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${BRAND.sacredGold}" stop-opacity="0.06"/>
      <stop offset="60%" stop-color="${BRAND.witnessViolet}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${BRAND.voidBlack}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#penta-bg)"/>
  ${threadStrokes}
  ${rootInnerArc}
  ${arcs}
  ${labels}
  ${center}
  ${sharedLegend}
</svg>`;
}

export function planetColor(name: string): string {
  const map: Record<string, string> = {
    sun: BRAND.sacredGold, moon: BRAND.parchment, mars: BRAND.terracotta,
    mercury: BRAND.coherenceEmerald, jupiter: '#E8B923', venus: '#D4A8FF',
    saturn: '#5A7090', rahu: BRAND.witnessViolet, ketu: BRAND.mutedSilver,
  };
  return map[name.toLowerCase()] || BRAND.flowIndigo;
}
