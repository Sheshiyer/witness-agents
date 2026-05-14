// ─── SVG: Mahadasha Timeline ────────────────────────────────────────
// Horizontal ribbon spanning 30+ years, current dasha as wider band,
// next dasha with antardashas as sub-bars, vertical "you-are-here" pulse.

import { BRAND } from '../styles.js';

// Classical Vedic graha → brand-palette mapping
const PLANET_COLOR: Record<string, string> = {
  sun:      BRAND.sacredGold,
  moon:     BRAND.parchment,
  mars:     BRAND.terracotta,
  mercury:  BRAND.coherenceEmerald,
  jupiter:  '#E8B923',                // warmer gold
  venus:    '#D4A8FF',                // light violet-pink
  saturn:   '#3A4A66',                // saturnine blue-grey
  rahu:     BRAND.witnessViolet,
  ketu:     BRAND.mutedSilver,
};

function planetColor(name: string): string {
  return PLANET_COLOR[name.toLowerCase()] || BRAND.flowIndigo;
}

// Vimshottari Mahadasha durations (years)
const DASHA_YEARS: Record<string, number> = {
  ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7,
  rahu: 18, jupiter: 16, saturn: 19, mercury: 17,
};

// Vimshottari sequence
const DASHA_SEQUENCE = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury'];

export interface MahadashaData {
  current_lord: string;
  current_ends_iso?: string;   // when current dasha ends → next opens
  next_lord: string;
  next_starts_iso?: string;
  next_duration_years: number;
  antardashas?: Array<{ lord: string; start_iso?: string; end_iso?: string; duration_months?: number }>;
}

export function renderMahadashaTimeline(data: MahadashaData, opts: { width?: number; height?: number; bodyText?: string } = {}): string {
  const W = opts.width ?? 720;
  const H = opts.height ?? 260;
  const marginX = 48, marginTop = 40, marginBottom = 70;
  const barH = 38;
  const subBarH = 18;
  const innerW = W - marginX * 2;

  // Determine timeline span — current dasha end through end of next dasha
  const nowDate = new Date('2026-05-10');                  // anchor "now"
  const nextStart = data.next_starts_iso ? new Date(data.next_starts_iso) : new Date('2026-09-14');
  const nextDuration = data.next_duration_years ?? DASHA_YEARS[data.next_lord.toLowerCase()] ?? 16;
  const timelineStart = new Date(nowDate);
  timelineStart.setFullYear(timelineStart.getFullYear() - 1);  // back-show 1 year of current dasha
  const timelineEnd = new Date(nextStart);
  timelineEnd.setFullYear(timelineEnd.getFullYear() + nextDuration);

  const totalMs = timelineEnd.getTime() - timelineStart.getTime();
  const xAt = (d: Date) => marginX + ((d.getTime() - timelineStart.getTime()) / totalMs) * innerW;

  const currentColor = planetColor(data.current_lord);
  const nextColor = planetColor(data.next_lord);

  // Main dasha bars
  const currentBarX = marginX;
  const currentBarW = xAt(nextStart) - marginX;
  const nextBarX = xAt(nextStart);
  const nextBarW = W - marginX - nextBarX;

  // Antardasha sub-bars (within next dasha if provided)
  const antarBars: string[] = [];
  if (data.antardashas && data.antardashas.length > 0) {
    for (const ad of data.antardashas.slice(0, 9)) {
      if (!ad.start_iso || !ad.end_iso) continue;
      const s = new Date(ad.start_iso), e = new Date(ad.end_iso);
      const x1 = xAt(s), x2 = xAt(e);
      if (x2 < x1 || x1 > W - marginX) continue;
      const col = planetColor(ad.lord);
      antarBars.push(`
        <rect x="${x1}" y="${marginTop + barH + 6}" width="${x2 - x1}" height="${subBarH}"
              fill="${col}" fill-opacity="0.6" stroke="${col}" stroke-width="0.5"/>
        <text x="${x1 + 4}" y="${marginTop + barH + 6 + subBarH / 2 + 3}"
              font-family="SF Mono, monospace" font-size="8" fill="${BRAND.voidBlack}"
              opacity="0.9">${ad.lord.charAt(0).toUpperCase() + ad.lord.slice(1, 3)}</text>`);
    }
  }

  // Year axis ticks
  const yearTicks: string[] = [];
  for (let y = timelineStart.getFullYear() + 1; y <= timelineEnd.getFullYear(); y++) {
    const x = xAt(new Date(`${y}-01-01`));
    if (x < marginX || x > W - marginX) continue;
    const tickY = marginTop + barH + subBarH + 20;
    yearTicks.push(`
      <line x1="${x}" y1="${tickY - 4}" x2="${x}" y2="${tickY + 4}"
            stroke="${BRAND.mutedSilver}" stroke-width="0.5" opacity="0.6"/>
      <text x="${x}" y="${tickY + 18}" text-anchor="middle"
            font-family="SF Mono, monospace" font-size="9" fill="${BRAND.mutedSilver}">${y}</text>`);
  }

  // "Now" pulse marker
  const nowX = xAt(nowDate);
  const nowMarker = `
    <line x1="${nowX}" y1="${marginTop - 12}" x2="${nowX}" y2="${marginTop + barH + subBarH + 12}"
          stroke="${BRAND.coherenceEmerald}" stroke-width="1.5" stroke-dasharray="4,3"/>
    <circle cx="${nowX}" cy="${marginTop - 18}" r="5" fill="${BRAND.coherenceEmerald}">
      <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
    </circle>
    <text x="${nowX}" y="${marginTop - 26}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="9" font-weight="700"
          fill="${BRAND.coherenceEmerald}" letter-spacing="0.2em">NOW</text>`;

  // "Pivot" marker at dasha transition
  const pivotX = xAt(nextStart);
  const pivotMarker = `
    <line x1="${pivotX}" y1="${marginTop - 4}" x2="${pivotX}" y2="${marginTop + barH + 4}"
          stroke="${BRAND.sacredGold}" stroke-width="2"/>
    <polygon points="${pivotX - 5},${marginTop - 12} ${pivotX + 5},${marginTop - 12} ${pivotX},${marginTop - 4}"
             fill="${BRAND.sacredGold}"/>
    <text x="${pivotX}" y="${marginTop + barH + 60}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="8" font-weight="700"
          fill="${BRAND.sacredGold}" letter-spacing="0.15em">PIVOT ${nextStart.toISOString().slice(0, 10)}</text>`;

  // Dasha labels
  const currentLabel = `
    <text x="${currentBarX + 12}" y="${marginTop + barH / 2 + 4}"
          font-family="Panchang, serif" font-size="13" font-weight="700"
          fill="${BRAND.voidBlack}" letter-spacing="0.05em">
      ${data.current_lord.toUpperCase()}
    </text>
    <text x="${currentBarX + 12}" y="${marginTop + barH / 2 + 18}"
          font-family="SF Mono, monospace" font-size="8"
          fill="${BRAND.voidBlack}" opacity="0.7">closing</text>`;
  const nextLabel = `
    <text x="${nextBarX + 16}" y="${marginTop + barH / 2 + 4}"
          font-family="Panchang, serif" font-size="13" font-weight="700"
          fill="${BRAND.voidBlack}" letter-spacing="0.05em">
      ${data.next_lord.toUpperCase()} · ${nextDuration} yr
    </text>
    <text x="${nextBarX + 16}" y="${marginTop + barH / 2 + 18}"
          font-family="SF Mono, monospace" font-size="8"
          fill="${BRAND.voidBlack}" opacity="0.7">opening</text>`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%">
  <defs>
    <linearGradient id="md-current-${data.current_lord}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${currentColor}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${currentColor}" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="md-next-${data.next_lord}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${nextColor}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${nextColor}" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <!-- Current dasha bar (closing) -->
  <rect x="${currentBarX}" y="${marginTop}" width="${currentBarW}" height="${barH}"
        fill="url(#md-current-${data.current_lord})" stroke="${currentColor}" stroke-width="1"/>
  <!-- Next dasha bar (opening) -->
  <rect x="${nextBarX}" y="${marginTop}" width="${nextBarW}" height="${barH}"
        fill="url(#md-next-${data.next_lord})" stroke="${nextColor}" stroke-width="1"/>
  ${currentLabel}
  ${nextLabel}
  <!-- Antardasha sub-bars -->
  ${antarBars.join('')}
  <!-- Year axis -->
  ${yearTicks.join('')}
  <!-- Now + Pivot markers -->
  ${nowMarker}
  ${pivotMarker}
</svg>`;
}
