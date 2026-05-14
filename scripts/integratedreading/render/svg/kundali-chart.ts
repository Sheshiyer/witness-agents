// ─── SVG: Vedic D-1 Chart (South Indian style) ─────────────────────
// 4×4 grid, signs fixed in positions, Lagna marked, planets in cells.
// South Indian style chosen because:
//  - Cleaner geometric rendering than North Indian diamond
//  - Native to Tamil Brahmin lineage
//  - Signs are fixed; only planets and Lagna marker vary

import { BRAND } from '../styles.js';

// Sign positions in South Indian 4×4 grid (counterclockwise from top-left)
// Each cell: [col, row] where col,row ∈ {0,1,2,3}
const SIGN_POS: Record<string, [number, number]> = {
  pisces:      [0, 0], aries:       [1, 0], taurus:      [2, 0], gemini:      [3, 0],
  aquarius:    [0, 1],                                            cancer:      [3, 1],
  capricorn:   [0, 2],                                            leo:         [3, 2],
  sagittarius: [0, 3], scorpio:     [1, 3], libra:       [2, 3], virgo:       [3, 3],
};

// Sanskrit ↔ English signs
const SIGN_SANSKRIT: Record<string, string> = {
  pisces: 'Meena', aries: 'Mesha', taurus: 'Vrishabha', gemini: 'Mithuna',
  aquarius: 'Kumbha', cancer: 'Karka', capricorn: 'Makara', leo: 'Simha',
  sagittarius: 'Dhanu', scorpio: 'Vrischika', libra: 'Tula', virgo: 'Kanya',
};

// Planet abbreviations
const PLANET_ABBR: Record<string, string> = {
  sun: 'Su', moon: 'Mo', mars: 'Ma', mercury: 'Me', jupiter: 'Ju',
  venus: 'Ve', saturn: 'Sa', rahu: 'Ra', ketu: 'Ke', pluto: 'Pl',
};

const PLANET_COLOR: Record<string, string> = {
  sun:      BRAND.sacredGold,
  moon:     BRAND.parchment,
  mars:     BRAND.terracotta,
  mercury:  BRAND.coherenceEmerald,
  jupiter:  '#E8B923',
  venus:    '#D4A8FF',
  saturn:   '#5A7090',
  rahu:     BRAND.witnessViolet,
  ketu:     BRAND.mutedSilver,
  pluto:    '#7A4DA0',
};

export interface Placement {
  planet: string;
  sign: string;
  retrograde?: boolean;
  degree?: string;
  condition?: string;  // e.g., "exalted", "own sign", "debilitated"
}

export interface KundaliData {
  lagna: string;          // sign name, e.g., "aries" or "Mesha (Aries)"
  placements: Placement[];
  atmakaraka?: string;    // planet name
  subject_name?: string;
}

function normalizeSign(name: string): string {
  const lower = name.toLowerCase().trim();
  // Try to match by English name or Sanskrit
  for (const [eng, skt] of Object.entries(SIGN_SANSKRIT)) {
    if (lower.includes(eng) || lower.includes(skt.toLowerCase())) return eng;
  }
  return lower.split(/[\s(]/)[0];   // first word
}

function normalizePlanet(name: string): string {
  return name.toLowerCase().trim().split(/[\s_]/)[0];
}

export function renderKundaliChart(data: KundaliData, opts: { width?: number } = {}): string {
  const W = opts.width ?? 480;
  const H = W;
  const padding = 24;
  const gridSize = W - padding * 2;
  const cellSize = gridSize / 4;
  const x0 = padding, y0 = padding;

  const lagnaSign = normalizeSign(data.lagna);

  // Group placements by sign
  const placementsBySign: Record<string, Placement[]> = {};
  for (const p of data.placements) {
    const s = normalizeSign(p.sign);
    if (!placementsBySign[s]) placementsBySign[s] = [];
    placementsBySign[s].push(p);
  }

  // Render outer frame + grid lines (only the 12 outer cells)
  const lines: string[] = [];
  // Outer rectangle
  lines.push(`<rect x="${x0}" y="${y0}" width="${gridSize}" height="${gridSize}"
                     fill="none" stroke="${BRAND.sacredGold}" stroke-width="2"/>`);
  // Inner divisions: 3 vertical + 3 horizontal lines, but only along edges
  for (let i = 1; i < 4; i++) {
    const x = x0 + i * cellSize;
    const y = y0 + i * cellSize;
    // Top edge (row 0) and bottom edge (row 3) vertical separators
    lines.push(`<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + cellSize}"
                       stroke="${BRAND.sacredGold}" stroke-width="0.8" opacity="0.7"/>`);
    lines.push(`<line x1="${x}" y1="${y0 + 3 * cellSize}" x2="${x}" y2="${y0 + gridSize}"
                       stroke="${BRAND.sacredGold}" stroke-width="0.8" opacity="0.7"/>`);
    // Left edge (col 0) and right edge (col 3) horizontal separators
    lines.push(`<line x1="${x0}" y1="${y}" x2="${x0 + cellSize}" y2="${y}"
                       stroke="${BRAND.sacredGold}" stroke-width="0.8" opacity="0.7"/>`);
    lines.push(`<line x1="${x0 + 3 * cellSize}" y1="${y}" x2="${x0 + gridSize}" y2="${y}"
                       stroke="${BRAND.sacredGold}" stroke-width="0.8" opacity="0.7"/>`);
  }
  // Inner empty square (cells (1,1)..(2,2)) — diagonal X for the void
  lines.push(`
    <rect x="${x0 + cellSize}" y="${y0 + cellSize}" width="${cellSize * 2}" height="${cellSize * 2}"
          fill="rgba(7,11,29,0.6)" stroke="${BRAND.sacredGold}" stroke-width="0.6" opacity="0.5"/>
    <line x1="${x0 + cellSize}" y1="${y0 + cellSize}"
          x2="${x0 + 3 * cellSize}" y2="${y0 + 3 * cellSize}"
          stroke="${BRAND.sacredGold}" stroke-width="0.4" opacity="0.35"/>
    <line x1="${x0 + 3 * cellSize}" y1="${y0 + cellSize}"
          x2="${x0 + cellSize}" y2="${y0 + 3 * cellSize}"
          stroke="${BRAND.sacredGold}" stroke-width="0.4" opacity="0.35"/>`);

  // Render each sign cell with planets
  const cells: string[] = [];
  for (const [sign, [col, row]] of Object.entries(SIGN_POS)) {
    const cx = x0 + col * cellSize;
    const cy = y0 + row * cellSize;
    const isLagna = sign === lagnaSign;
    const planets = placementsBySign[sign] || [];

    // Background tint for Lagna
    if (isLagna) {
      cells.push(`<rect x="${cx + 1}" y="${cy + 1}" width="${cellSize - 2}" height="${cellSize - 2}"
                         fill="${BRAND.sacredGold}" fill-opacity="0.12"/>`);
    }

    // Sign abbreviation in corner
    cells.push(`<text x="${cx + 6}" y="${cy + 16}"
                       font-family="SF Mono, monospace" font-size="9"
                       fill="${BRAND.mutedSilver}" opacity="0.8" letter-spacing="0.1em">
                  ${SIGN_SANSKRIT[sign].slice(0, 3).toUpperCase()}
                </text>`);

    // Lagna mark
    if (isLagna) {
      cells.push(`<text x="${cx + cellSize - 6}" y="${cy + 16}" text-anchor="end"
                         font-family="SF Mono, monospace" font-size="8" font-weight="700"
                         fill="${BRAND.sacredGold}" letter-spacing="0.15em">ASC</text>`);
    }

    // Planet glyphs (stack 2-per-row)
    planets.forEach((p, i) => {
      const planet = normalizePlanet(p.planet);
      const abbr = PLANET_ABBR[planet] || planet.slice(0, 2);
      const color = PLANET_COLOR[planet] || BRAND.parchment;
      const px = cx + 8 + (i % 2) * (cellSize / 2 - 4);
      const py = cy + 32 + Math.floor(i / 2) * 18;
      const isAK = data.atmakaraka && normalizePlanet(data.atmakaraka).startsWith(planet);
      const retroMark = p.retrograde ? '<tspan font-size="7" baseline-shift="super" opacity="0.7">R</tspan>' : '';
      const akMark = isAK ? `<circle cx="${px + 6}" cy="${py - 4}" r="2" fill="${BRAND.sacredGold}"/>` : '';
      cells.push(`
        <text x="${px}" y="${py}"
              font-family="Panchang, serif" font-size="13" font-weight="600"
              fill="${color}" letter-spacing="0.04em">
          ${abbr}${retroMark}
        </text>
        ${akMark}`);
    });
  }

  // Center label
  const centerLabel = `
    <text x="${W / 2}" y="${H / 2 - 6}" text-anchor="middle"
          font-family="Panchang, serif" font-size="11" font-weight="600"
          fill="${BRAND.sacredGold}" letter-spacing="0.2em">RASHI</text>
    <text x="${W / 2}" y="${H / 2 + 10}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="8"
          fill="${BRAND.mutedSilver}" letter-spacing="0.25em">D-1 · NATAL</text>`;

  const subjectLabel = data.subject_name ? `
    <text x="${W / 2}" y="${H / 2 + 28}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="9"
          fill="${BRAND.coherenceEmerald}" letter-spacing="0.2em" opacity="0.85">
      ${data.subject_name.toUpperCase()}
    </text>` : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%">
  ${lines.join('')}
  ${cells.join('')}
  ${centerLabel}
  ${subjectLabel}
</svg>`;
}
