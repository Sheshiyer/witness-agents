// ─── SVG: Five-Kosha Stack Mandala ──────────────────────────────────
// Concentric rings — Anandamaya (imperishable seed) at center,
// Annamaya (body) at outer ring. Each ring labeled with English handle.
// Per Law #3: data as sacred form. The chart's algebraic layering
// rendered as mandala, not table.

import { BRAND } from '../styles.js';

const LAYERS = [
  { id: 'anandamaya',  english: 'The Still-Point',        sanskrit: 'Anandamaya',  fn: 'imperishable seed',           color: BRAND.witnessViolet,    layerKey: 'imperishable' as const, glow: 0.7 },
  { id: 'vijnanamaya', english: 'The Discriminative Cut', sanskrit: 'Vijnanamaya', fn: 'wisdom-instrument',           color: BRAND.flowIndigo,       layerKey: 'wisdom' as const,       glow: 0.6 },
  { id: 'manomaya',    english: 'The Pattern Engine',     sanskrit: 'Manomaya',    fn: 'mind iteration',              color: BRAND.coherenceEmerald, layerKey: 'pattern' as const,      glow: 0.5 },
  { id: 'pranamaya',   english: 'The Vital Current',      sanskrit: 'Pranamaya',   fn: 'breath-under-the-rhythm',     color: BRAND.sacredGold,       layerKey: 'vital' as const,        glow: 0.5 },
  { id: 'annamaya',    english: 'The Body',               sanskrit: 'Annamaya',    fn: 'physical scaffold',           color: BRAND.parchment,        layerKey: 'body' as const,         glow: 0.3 },
] as const;

export interface KoshaIntensity {
  layer: 'body' | 'vital' | 'pattern' | 'wisdom' | 'imperishable';
  intensity: number;        // 0..1 — drives ring fill opacity + outer-stroke brightness
  engine_count?: number;
}

export function renderKoshaStack(opts: {
  width?: number;
  subject?: string;
  intensities?: KoshaIntensity[];   // optional real data; if absent, structural-only render
} = {}): string {
  const W = opts.width ?? 480;
  const H = W;
  const cx = W / 2, cy = H / 2;
  const outerR = Math.min(W, H) * 0.45;

  const ringCount = LAYERS.length;
  const ringStep = outerR / ringCount;

  // Build intensity lookup
  const intensityByLayer: Record<string, number> = {};
  const engineCountByLayer: Record<string, number> = {};
  for (const ki of opts.intensities ?? []) {
    intensityByLayer[ki.layer] = Math.max(0, Math.min(1, ki.intensity));
    engineCountByLayer[ki.layer] = ki.engine_count ?? 0;
  }
  const hasData = opts.intensities && opts.intensities.length > 0;

  // Concentric rings (drawn outer-first so labels stack correctly)
  const rings: string[] = [];
  const labels: string[] = [];
  for (let i = 0; i < ringCount; i++) {
    const layer = LAYERS[i];
    const rOuter = outerR - i * ringStep;
    // Intensity drives fill opacity + stroke brightness
    const intensity = hasData ? (intensityByLayer[layer.layerKey] ?? 0) : 0.5;
    const strokeOpacity = hasData ? 0.3 + intensity * 0.65 : (0.4 + i * 0.08);
    const fillOpacity = hasData ? 0.04 + intensity * 0.22 : (0.08 + i * 0.025);
    const strokeWidth = hasData ? 1 + intensity * 1.8 : 1.5;
    rings.push(`
      <circle cx="${cx}" cy="${cy}" r="${rOuter}"
              fill="none" stroke="${layer.color}" stroke-width="${strokeWidth.toFixed(2)}" opacity="${strokeOpacity.toFixed(2)}"/>
      <circle cx="${cx}" cy="${cy}" r="${rOuter - ringStep / 2}"
              fill="${layer.color}" fill-opacity="${fillOpacity.toFixed(3)}" stroke="none"/>`);

    // English label at top of each ring (12 o'clock minus a bit), Sanskrit faded below
    const labelR = rOuter - ringStep / 2;
    const labelY = cy - labelR;
    const intensityBadge = hasData && engineCountByLayer[layer.layerKey] > 0
      ? `<text x="${cx + 28}" y="${labelY + 6}" text-anchor="start"
              font-family="SF Mono, monospace" font-size="6" font-weight="700"
              fill="${layer.color}" opacity="0.8">${engineCountByLayer[layer.layerKey]}E · ${(intensity * 100).toFixed(0)}%</text>`
      : '';
    labels.push(`
      <text x="${cx}" y="${labelY - 6}" text-anchor="middle"
            font-family="SF Mono, monospace" font-size="8" font-weight="700"
            fill="${layer.color}" letter-spacing="0.25em" text-transform="uppercase">
        ${layer.english.toUpperCase()}
      </text>
      <text x="${cx}" y="${labelY + 6}" text-anchor="middle"
            font-family="Satoshi, sans-serif" font-size="7" font-style="italic"
            fill="${BRAND.mutedSilver}" opacity="0.7">
        ${layer.sanskrit} · ${layer.fn}
      </text>
      ${intensityBadge}`);
  }

  // Sacred-geometry seed: 5-pointed star inscribed (one point per Kosha)
  const starPoints: string[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI / 5);
    const r = outerR * 0.95;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    starPoints.push(`${x},${y}`);
  }
  // Pentagram connections (1→3, 3→5, 5→2, 2→4, 4→1)
  const pentaSequence = [0, 2, 4, 1, 3, 0];
  const pentaPath = pentaSequence.map((idx, i) =>
    `${i === 0 ? 'M' : 'L'} ${starPoints[idx]}`
  ).join(' ');

  // Central seed dot — the AKSHARA mark
  const centerDot = `
    <circle cx="${cx}" cy="${cy}" r="3" fill="${BRAND.sacredGold}">
      <animate attributeName="r" values="3;5;3" dur="3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="7" fill="none" stroke="${BRAND.sacredGold}" stroke-width="0.5" opacity="0.6"/>`;

  const subjectMark = opts.subject ? `
    <text x="${cx}" y="${H - 20}" text-anchor="middle"
          font-family="SF Mono, monospace" font-size="9" fill="${BRAND.mutedSilver}"
          letter-spacing="0.3em">${opts.subject.toUpperCase()}</text>` : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%">
  <defs>
    <radialGradient id="kosha-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${BRAND.sacredGold}" stop-opacity="0.15"/>
      <stop offset="60%" stop-color="${BRAND.witnessViolet}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${BRAND.voidBlack}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Ambient glow -->
  <rect width="${W}" height="${H}" fill="url(#kosha-glow)"/>
  <!-- Concentric Kosha rings -->
  ${rings.join('')}
  <!-- Sacred-geometry pentagram (5 Koshas, 5 points) -->
  <path d="${pentaPath}" fill="none" stroke="${BRAND.sacredGold}" stroke-width="0.4"
        stroke-opacity="0.3" stroke-dasharray="2,3"/>
  <!-- Ring labels -->
  ${labels.join('')}
  <!-- Central AKSHARA seed -->
  ${centerDot}
  ${subjectMark}
</svg>`;
}
