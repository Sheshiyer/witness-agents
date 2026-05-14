// ─── SVG: Pancha Bhuta — Five-Element Pentagon ──────────────────────
// Pentagonal radar showing the 5 classical elements (fire/earth/water/air/ether)
// distribution from the chart's placements. Pentagram lines connect the values.

import { BRAND } from '../styles.js';

const ELEMENTS = [
  { id: 'fire',  english: 'Fire',  sanskrit: 'Agni',     color: '#E27749', angle: -Math.PI / 2 },                          // top
  { id: 'air',   english: 'Air',   sanskrit: 'Vayu',     color: '#A0C8E0', angle: -Math.PI / 2 + (2 * Math.PI / 5) },     // upper-right
  { id: 'water', english: 'Water', sanskrit: 'Apas',     color: BRAND.flowIndigo, angle: -Math.PI / 2 + 2 * (2 * Math.PI / 5) }, // lower-right
  { id: 'earth', english: 'Earth', sanskrit: 'Prithvi',  color: '#8B7355', angle: -Math.PI / 2 + 3 * (2 * Math.PI / 5) }, // lower-left
  { id: 'ether', english: 'Ether', sanskrit: 'Akasha',   color: BRAND.witnessViolet, angle: -Math.PI / 2 + 4 * (2 * Math.PI / 5) }, // upper-left
];

export interface PanchaBhutaData {
  fire: number;
  earth: number;
  water: number;
  air: number;
  ether: number;
}

export function renderPanchaBhuta(data: PanchaBhutaData, opts: { width?: number; subject?: string } = {}): string {
  const W = opts.width ?? 420;
  const H = W;
  const cx = W / 2, cy = H / 2;
  const maxR = W * 0.36;

  // Normalize values (sum + cap)
  const total = (data.fire ?? 0) + (data.earth ?? 0) + (data.water ?? 0) + (data.air ?? 0) + (data.ether ?? 0);
  const maxVal = Math.max(data.fire ?? 0, data.earth ?? 0, data.water ?? 0, data.air ?? 0, data.ether ?? 0, 1);

  // Concentric gridline rings (4 rings)
  const grid: string[] = [];
  for (let r = 0.25; r <= 1.0; r += 0.25) {
    const points = ELEMENTS.map((e) => {
      const x = cx + maxR * r * Math.cos(e.angle);
      const y = cy + maxR * r * Math.sin(e.angle);
      return `${x},${y}`;
    }).join(' ');
    grid.push(`<polygon points="${points}" fill="none"
                       stroke="${BRAND.mutedSilver}" stroke-width="0.4" opacity="0.25"/>`);
  }

  // Radial spokes
  const spokes = ELEMENTS.map((e) => {
    const x = cx + maxR * Math.cos(e.angle);
    const y = cy + maxR * Math.sin(e.angle);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"
                  stroke="${BRAND.mutedSilver}" stroke-width="0.5" opacity="0.3"/>`;
  }).join('');

  // Data polygon (the actual element distribution)
  const dataPoints = ELEMENTS.map((e) => {
    const value = (data[e.id as keyof PanchaBhutaData] ?? 0) / maxVal;
    const r = maxR * Math.max(0.05, value);
    const x = cx + r * Math.cos(e.angle);
    const y = cy + r * Math.sin(e.angle);
    return { x, y, value, element: e };
  });
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Vertex dots and value labels
  const vertices = dataPoints.map((p) => `
    <circle cx="${p.x}" cy="${p.y}" r="4" fill="${p.element.color}" stroke="${BRAND.parchment}" stroke-width="1"/>
    <text x="${p.x}" y="${p.y - 10}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="9" font-weight="700"
          fill="${p.element.color}">
      ${(data[p.element.id as keyof PanchaBhutaData] ?? 0).toFixed(0)}
    </text>`).join('');

  // Outer labels (English + Sanskrit)
  const outerLabels = ELEMENTS.map((e) => {
    const labelR = maxR * 1.22;
    const x = cx + labelR * Math.cos(e.angle);
    const y = cy + labelR * Math.sin(e.angle);
    return `
      <text x="${x}" y="${y - 6}" text-anchor="middle"
            font-family="Panchang, serif" font-size="12" font-weight="700"
            fill="${e.color}" letter-spacing="0.08em">${e.english.toUpperCase()}</text>
      <text x="${x}" y="${y + 8}" text-anchor="middle"
            font-family="Satoshi, sans-serif" font-size="8" font-style="italic"
            fill="${BRAND.mutedSilver}" opacity="0.7">${e.sanskrit}</text>`;
  }).join('');

  // Subject mark
  const subjectMark = opts.subject ? `
    <text x="${W / 2}" y="${H - 12}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="8"
          fill="${BRAND.mutedSilver}" letter-spacing="0.3em">${opts.subject.toUpperCase()}</text>` : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%">
  ${grid.join('')}
  ${spokes}
  <!-- Data polygon -->
  <polygon points="${polygonPoints}"
           fill="${BRAND.sacredGold}" fill-opacity="0.15"
           stroke="${BRAND.sacredGold}" stroke-width="1.5" stroke-linejoin="round"/>
  ${vertices}
  ${outerLabels}
  ${subjectMark}
  <text x="${cx}" y="${cy + 4}" text-anchor="middle"
        font-family="SF Mono, monospace" font-size="8"
        fill="${BRAND.mutedSilver}" letter-spacing="0.2em" opacity="0.5">N=${total}</text>
</svg>`;
}
