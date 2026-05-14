// ─── SVG: Selemene 16-Engine Wheel ──────────────────────────────────
// Mandala with 16 wedges, one per Selemene engine. Each wedge:
//  - Colored by Kosha layer it routes to (5-color brand palette cycles)
//  - Length/intensity = signal strength from engine_outputs micro-reading
//  - Outer ring labels: engine name + tarot archetype if present
//  - Under-routed-in-source engines marked with a dim outer ring

import { BRAND } from '../styles.js';

// 16-engine canonical order with Kosha layer mapping
const ENGINES: Array<{ id: string; name: string; layer: 'body' | 'vital' | 'pattern' | 'wisdom' | 'imperishable' }> = [
  { id: 'vimshottari',     name: 'Chronofield',         layer: 'wisdom' },
  { id: 'human_design',    name: 'Energetic Authority', layer: 'vital' },
  { id: 'gene_keys',       name: 'Gift-Shadow',         layer: 'pattern' },
  { id: 'tarot',           name: 'Archetypal Mirror',   layer: 'imperishable' },
  { id: 'numerology',      name: 'Numeric Architecture',layer: 'pattern' },
  { id: 'biorhythm',       name: 'Three-Wave Cycle',    layer: 'vital' },
  { id: 'vedic_yogas',     name: 'Vedic Sidereal',      layer: 'wisdom' },
  { id: 'western_tropical',name: 'Western Persona',     layer: 'pattern' },
  { id: 'panchanga',       name: 'Temporal Grammar',    layer: 'wisdom' },
  { id: 'biofield',        name: 'Bioelectric Field',   layer: 'vital' },
  { id: 'face_reading',    name: 'Physiognomy',         layer: 'body' },
  { id: 'nadabrahman',     name: 'Resonance / Sound',   layer: 'vital' },
  { id: 'i_ching',         name: 'Hexagram Navigation', layer: 'wisdom' },
  { id: 'enneagram',       name: 'Nine-Point',          layer: 'pattern' },
  { id: 'sacred_geometry', name: 'Geometric Resonance', layer: 'imperishable' },
  { id: 'sigil_forge',     name: 'Sigil Forge',         layer: 'imperishable' },
];

const LAYER_COLOR = {
  body:           BRAND.parchment,
  vital:          BRAND.sacredGold,
  pattern:        BRAND.coherenceEmerald,
  wisdom:         BRAND.flowIndigo,
  imperishable:   BRAND.witnessViolet,
};

export interface EngineOutput {
  engine: string;
  output?: {
    key_signal?: string;
    tarot_archetype?: string;
    under_routed_in_source?: boolean;
    _error?: string;
  };
}

export function renderSelemeneWheel(engineOutputs: EngineOutput[], opts: { width?: number; subject?: string } = {}): string {
  const W = opts.width ?? 540;
  const H = W;
  const cx = W / 2, cy = H / 2;
  const innerR = W * 0.16;
  const outerR = W * 0.40;
  const labelR = W * 0.46;

  // Index engine outputs by engine id
  const outputByEngine: Record<string, EngineOutput> = {};
  for (const o of engineOutputs || []) {
    outputByEngine[o.engine] = o;
  }

  const segmentAngle = (2 * Math.PI) / 16;
  const wedges: string[] = [];
  const labels: string[] = [];

  for (let i = 0; i < 16; i++) {
    const engine = ENGINES[i];
    const out = outputByEngine[engine.id];
    const layerCol = LAYER_COLOR[engine.layer];

    // Signal strength: 1.0 if has key_signal, 0.5 if has output but minimal, 0.2 if errored
    let strength = 0.5;
    if (out?.output) {
      if (out.output._error) strength = 0.15;
      else if (out.output.key_signal && out.output.key_signal.length > 30) strength = 1.0;
      else if (out.output.key_signal) strength = 0.7;
    } else {
      strength = 0.3;
    }

    // Wedge geometry — pie segment from innerR to (innerR + (outerR-innerR)*strength)
    const wedgeOuter = innerR + (outerR - innerR) * strength;
    const startAngle = i * segmentAngle - Math.PI / 2;       // start at top (12 o'clock)
    const endAngle = startAngle + segmentAngle * 0.92;       // 8% gap between wedges
    const largeArcFlag = segmentAngle > Math.PI ? 1 : 0;

    const x1Inner = cx + innerR * Math.cos(startAngle);
    const y1Inner = cy + innerR * Math.sin(startAngle);
    const x2Inner = cx + innerR * Math.cos(endAngle);
    const y2Inner = cy + innerR * Math.sin(endAngle);
    const x1Outer = cx + wedgeOuter * Math.cos(startAngle);
    const y1Outer = cy + wedgeOuter * Math.sin(startAngle);
    const x2Outer = cx + wedgeOuter * Math.cos(endAngle);
    const y2Outer = cy + wedgeOuter * Math.sin(endAngle);

    const path = `M ${x1Inner} ${y1Inner}
                  L ${x1Outer} ${y1Outer}
                  A ${wedgeOuter} ${wedgeOuter} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}
                  L ${x2Inner} ${y2Inner}
                  A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner} Z`;

    const opacity = 0.4 + strength * 0.55;
    wedges.push(`
      <path d="${path}" fill="${layerCol}" fill-opacity="${opacity}"
            stroke="${layerCol}" stroke-width="1" stroke-opacity="0.8"/>`);

    // Under-routed marker — dim outer ring arc
    if (out?.output?.under_routed_in_source) {
      const ringR = outerR + 6;
      const xRing1 = cx + ringR * Math.cos(startAngle + segmentAngle * 0.1);
      const yRing1 = cy + ringR * Math.sin(startAngle + segmentAngle * 0.1);
      const xRing2 = cx + ringR * Math.cos(endAngle - segmentAngle * 0.1);
      const yRing2 = cy + ringR * Math.sin(endAngle - segmentAngle * 0.1);
      wedges.push(`
        <path d="M ${xRing1} ${yRing1} A ${ringR} ${ringR} 0 0 1 ${xRing2} ${yRing2}"
              fill="none" stroke="${BRAND.terracotta}" stroke-width="1.2" stroke-dasharray="2,2" opacity="0.7"/>`);
    }

    // Outer ring label — engine name (rotated to follow the circle)
    const midAngle = (startAngle + endAngle) / 2;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);
    const rotation = (midAngle * 180) / Math.PI + 90;
    // Flip text on bottom half for readability
    const isBottomHalf = midAngle > 0 && midAngle < Math.PI;
    const adjRotation = isBottomHalf ? rotation + 180 : rotation;
    const textAnchor = 'middle';

    labels.push(`
      <text x="${labelX}" y="${labelY}"
            font-family="SF Mono, monospace" font-size="8" font-weight="600"
            fill="${layerCol}" text-anchor="${textAnchor}" letter-spacing="0.1em"
            transform="rotate(${adjRotation} ${labelX} ${labelY})"
            opacity="${0.6 + strength * 0.4}">
        ${engine.name.toUpperCase()}
      </text>`);

    // Tarot archetype glyph inside the wedge (if present)
    if (out?.output?.tarot_archetype) {
      const tarotR = (innerR + wedgeOuter) / 2;
      const tarotX = cx + tarotR * Math.cos(midAngle);
      const tarotY = cy + tarotR * Math.sin(midAngle);
      wedges.push(`
        <text x="${tarotX}" y="${tarotY + 3}" text-anchor="middle"
              font-family="Panchang, serif" font-size="9" font-style="italic"
              fill="${BRAND.parchment}" opacity="0.85" letter-spacing="0.02em">
          ${out.output.tarot_archetype.length > 14 ? out.output.tarot_archetype.slice(0, 12) + '…' : out.output.tarot_archetype}
        </text>`);
    }
  }

  // Center disc — framework mark
  const center = `
    <circle cx="${cx}" cy="${cy}" r="${innerR}"
            fill="${BRAND.voidBlack}" stroke="${BRAND.sacredGold}" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="${innerR * 0.5}"
            fill="none" stroke="${BRAND.sacredGold}" stroke-width="0.5" opacity="0.5"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle"
          font-family="Panchang, serif" font-size="11" font-weight="700"
          fill="${BRAND.sacredGold}" letter-spacing="0.15em">16</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="7"
          fill="${BRAND.mutedSilver}" letter-spacing="0.25em">ENGINES</text>`;

  // Layer-legend dots (small, top-right)
  const legendY = H - 20;
  const legend = (Object.keys(LAYER_COLOR) as Array<keyof typeof LAYER_COLOR>).map((k, i) => `
    <circle cx="${24 + i * 92}" cy="${legendY}" r="4" fill="${LAYER_COLOR[k]}"/>
    <text x="${34 + i * 92}" y="${legendY + 4}"
          font-family="SF Mono, monospace" font-size="7"
          fill="${BRAND.mutedSilver}" letter-spacing="0.1em">${k.toUpperCase()}</text>
  `).join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%">
  <defs>
    <radialGradient id="selemene-bg" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${BRAND.witnessViolet}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${BRAND.voidBlack}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#selemene-bg)"/>
  ${wedges.join('')}
  ${labels.join('')}
  ${center}
  ${legend}
</svg>`;
}
