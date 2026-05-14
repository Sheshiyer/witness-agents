// ─── SVG: Composite Triad — Three-Subject Synastry Field ────────────
// Three arcs in a triangular formation, with luminous thread-lines
// showing the cross-resonances among all three subjects. Labels are
// positioned on radial sight-lines from the figure center so they
// never collide with the arcs at any width.

import { BRAND } from '../styles.js';

const PLANET_COLOR: Record<string, string> = {
  sun: BRAND.sacredGold, moon: BRAND.parchment, mars: BRAND.terracotta,
  mercury: BRAND.coherenceEmerald, jupiter: '#E8B923', venus: '#D4A8FF',
  saturn: '#5A7090', rahu: BRAND.witnessViolet, ketu: BRAND.mutedSilver,
};

export interface TriadSubject {
  name: string;
  arc_color: string;
  current_mahadasha_lord?: string;
  next_mahadasha_lord?: string;
  next_mahadasha_iso?: string;
}

export interface CompositeTriadData {
  subjects: [TriadSubject, TriadSubject, TriadSubject];
  shared_keys: string[];               // e.g., ['Wheel of Fortune', 'Atmakaraka Jupiter']
  cross_pair_links?: Array<{           // optional explicit pair-resonances
    a: 0 | 1 | 2;
    b: 0 | 1 | 2;
    label: string;
  }>;
}

/** Compact human-friendly pivot date: "14 Sep 2026" — no caps gimmick. */
function formatPivot(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso.slice(0, 10);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

export function renderCompositeTriad(data: CompositeTriadData, opts: { width?: number } = {}): string {
  const W = opts.width ?? 720;
  const H = W;
  const cx = W / 2, cy = H / 2 + 14;
  const fieldR = W * 0.34;                  // ring on which subject centers sit
  const arcRadius = W * 0.115;              // each subject arc radius
  const labelR = fieldR + arcRadius + 36;   // labels sit just outside the arc, on the same sight-line

  // Three vertices at 90°, 210°, 330° (top, lower-left, lower-right)
  const angles = [-Math.PI / 2, Math.PI / 2 + Math.PI / 3 + Math.PI / 3, Math.PI / 2 + Math.PI / 3];
  // Simpler: explicit
  const baseAngles = [-90, 210, 330].map((d) => (d * Math.PI) / 180);
  const positions = baseAngles.map((a) => ({
    x: cx + fieldR * Math.cos(a),
    y: cy + fieldR * Math.sin(a),
    angle: a,
  }));

  // Subject arcs — circle + soft halo pulse + inner mist
  const arcs = data.subjects.map((s, i) => {
    const p = positions[i];
    return `
      <!-- halo pulse -->
      <circle cx="${p.x}" cy="${p.y}" r="${arcRadius + 14}"
              fill="none" stroke="${s.arc_color}" stroke-width="0.4" opacity="0.18"/>
      <circle cx="${p.x}" cy="${p.y}" r="${arcRadius + 6}"
              fill="none" stroke="${s.arc_color}" stroke-width="0.6" opacity="0.32"/>
      <!-- primary arc -->
      <circle cx="${p.x}" cy="${p.y}" r="${arcRadius}"
              fill="none" stroke="${s.arc_color}" stroke-width="1.6" opacity="0.85"/>
      <!-- inner mist -->
      <circle cx="${p.x}" cy="${p.y}" r="${arcRadius - 6}"
              fill="${s.arc_color}" fill-opacity="0.07" stroke="none"/>
      <!-- center dot -->
      <circle cx="${p.x}" cy="${p.y}" r="2.2"
              fill="${s.arc_color}" opacity="0.8"/>`;
  }).join('');

  // Subject labels — on radial sight-lines from center.
  // Each label has: subject name (display serif), MD signature (mono caps),
  // pivot date (italic serif), all stacked outward along the same axis.
  const labels = data.subjects.map((s, i) => {
    const a = baseAngles[i];
    const lx = cx + labelR * Math.cos(a);
    const ly = cy + labelR * Math.sin(a);

    // Anchor based on which side of center the label sits
    let anchor: 'start' | 'middle' | 'end';
    if (Math.cos(a) > 0.3) anchor = 'start';
    else if (Math.cos(a) < -0.3) anchor = 'end';
    else anchor = 'middle';

    const mdLine = s.current_mahadasha_lord && s.next_mahadasha_lord
      ? `${s.current_mahadasha_lord.toUpperCase()} → ${s.next_mahadasha_lord.toUpperCase()}`
      : '';
    const pivot = formatPivot(s.next_mahadasha_iso);

    // Stack offsets (positive = down for top label, etc.) — keyed to label position
    const isTop = i === 0;
    const nameDy = isTop ? -22 : 0;
    const mdDy   = isTop ? -8  : 14;
    const pivDy  = isTop ? 6   : 28;

    const nameSvg = `<text x="${lx}" y="${ly + nameDy}" text-anchor="${anchor}"
            font-family="Panchang, serif" font-weight="700" font-size="15"
            fill="${s.arc_color}" letter-spacing="0.06em">${s.name.toUpperCase()}</text>`;
    const mdSvg = mdLine ? `<text x="${lx}" y="${ly + mdDy}" text-anchor="${anchor}"
            font-family="SF Mono, monospace" font-size="7.5" font-weight="600"
            fill="${BRAND.mutedSilver}" letter-spacing="0.18em">${mdLine}</text>` : '';
    const pivotSvg = pivot ? `<text x="${lx}" y="${ly + pivDy}" text-anchor="${anchor}"
            font-family="Panchang, serif" font-style="italic" font-size="9"
            fill="${BRAND.sacredGold}" letter-spacing="0.02em">pivot · ${pivot}</text>` : '';

    return nameSvg + mdSvg + pivotSvg;
  }).join('');

  // Luminous thread between each pair of subjects — gradient stroke + faint glow.
  // Anchored to arc edges (not centers) so the threads "land" on the arcs.
  const pairs: Array<[number, number]> = [[0, 1], [1, 2], [0, 2]];
  const threadStrokes = pairs.map(([i, j], idx) => {
    const a = positions[i], b = positions[j];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;
    const ax = a.x + ux * arcRadius;
    const ay = a.y + uy * arcRadius;
    const bx = b.x - ux * arcRadius;
    const by = b.y - uy * arcRadius;
    // Each thread gets its own gradient id to blend the two subjects' colors
    const ca = data.subjects[i].arc_color;
    const cb = data.subjects[j].arc_color;
    const gradId = `triad-thread-${idx}`;
    return `
      <defs>
        <linearGradient id="${gradId}" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${ca}" stop-opacity="0.55"/>
          <stop offset="50%" stop-color="${BRAND.sacredGold}" stop-opacity="0.65"/>
          <stop offset="100%" stop-color="${cb}" stop-opacity="0.55"/>
        </linearGradient>
      </defs>
      <!-- faint outer glow -->
      <line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"
            stroke="${BRAND.sacredGold}" stroke-width="3" stroke-opacity="0.08"/>
      <!-- primary luminous thread -->
      <line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"
            stroke="url(#${gradId})" stroke-width="1.1"/>`;
  }).join('');

  // Pair labels — text-on-path, no opaque rect anymore.
  // Placed just inside the midpoint of each thread.
  const pairLabels: string[] = [];
  if (data.cross_pair_links && data.cross_pair_links.length > 0) {
    for (const link of data.cross_pair_links) {
      const a = positions[link.a], b = positions[link.b];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // Compute the perpendicular offset so the label sits cleanly above the thread
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len, ny = dx / len;   // perpendicular unit
      const off = 12;
      const tx = mx + nx * off;
      const ty = my + ny * off;
      pairLabels.push(`
        <text x="${tx}" y="${ty}" text-anchor="middle"
              font-family="SF Mono, monospace" font-size="7" font-weight="600"
              fill="${BRAND.sacredGold}" letter-spacing="0.18em"
              style="paint-order: stroke; stroke: ${BRAND.voidBlack}; stroke-width: 3px; stroke-linejoin: round;">${link.label.toUpperCase()}</text>`);
    }
  }

  // Center seed — the triad's shared field. Now with three petals pointing
  // to each subject, anchoring the field-as-instrument concept.
  const petals = baseAngles.map((a) => {
    const px = cx + 28 * Math.cos(a);
    const py = cy + 28 * Math.sin(a);
    return `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}"
                  stroke="${BRAND.sacredGold}" stroke-width="0.4" opacity="0.55"/>`;
  }).join('');

  const center = `
    <circle cx="${cx}" cy="${cy}" r="44"
            fill="${BRAND.voidBlack}" stroke="${BRAND.sacredGold}" stroke-width="1.2"/>
    <circle cx="${cx}" cy="${cy}" r="32"
            fill="none" stroke="${BRAND.sacredGold}" stroke-width="0.4" opacity="0.45"/>
    <circle cx="${cx}" cy="${cy}" r="20"
            fill="none" stroke="${BRAND.sacredGold}" stroke-width="0.3" opacity="0.35"/>
    ${petals}
    <text x="${cx}" y="${cy - 3}" text-anchor="middle"
          font-family="Panchang, serif" font-size="11" font-weight="700"
          fill="${BRAND.sacredGold}" letter-spacing="0.22em">TRIAD</text>
    <text x="${cx}" y="${cy + 11}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="6.5"
          fill="${BRAND.mutedSilver}" letter-spacing="0.32em">FIELD</text>`;

  // Shared-keys legend — italic serif at bottom, gold em-dash separators
  const sharedLegend = data.shared_keys.length > 0 ? `
    <text x="${cx}" y="${H - 38}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="7.5"
          fill="${BRAND.mutedSilver}" letter-spacing="0.32em">SHARED ARCHETYPAL CURRENTS</text>
    <text x="${cx}" y="${H - 18}" text-anchor="middle"
          font-family="Panchang, serif" font-size="11" font-style="italic" font-weight="500"
          fill="${BRAND.sacredGold}" letter-spacing="0.01em">${data.shared_keys.join('   ·   ')}</text>` : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="triad-bg" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${BRAND.sacredGold}" stop-opacity="0.06"/>
      <stop offset="60%" stop-color="${BRAND.witnessViolet}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${BRAND.voidBlack}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#triad-bg)"/>
  ${threadStrokes}
  ${arcs}
  ${labels}
  ${pairLabels.join('')}
  ${center}
  ${sharedLegend}
</svg>`;
}

export function planetColor(name: string): string {
  return PLANET_COLOR[name.toLowerCase()] || BRAND.flowIndigo;
}
