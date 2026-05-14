// ─── SVG: Composite Field Resonance Map (dyad) ──────────────────────
// Two concentric half-arcs (left = subject A, right = subject B) with
// luminous gradient threads in the gap = the electromagnetic channels
// the pair generates that neither chart has alone. Mahadasha pivots
// are stacked above each arc as a paired-transition signature.

import { BRAND } from '../styles.js';

const PLANET_COLOR: Record<string, string> = {
  sun: BRAND.sacredGold, moon: BRAND.parchment, mars: BRAND.terracotta,
  mercury: BRAND.coherenceEmerald, jupiter: '#E8B923', venus: '#D4A8FF',
  saturn: '#5A7090', rahu: BRAND.witnessViolet, ketu: BRAND.mutedSilver,
};

export interface CompositeResonanceData {
  subject_a: string;
  subject_b: string;
  a_mahadasha?: { current: string; next: string; transition_iso?: string };
  b_mahadasha?: { current: string; next: string; transition_iso?: string };
  electromagnetic_channels?: string[];
  companionship_gates?: string[];
  shared_atmakaraka?: string;
}

function formatPivot(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso.slice(0, 10);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(m[3], 10)} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

export function renderCompositeResonance(data: CompositeResonanceData, opts: { width?: number } = {}): string {
  const W = opts.width ?? 640;
  const H = W;
  const cx = W / 2, cy = H / 2 + 8;
  const arcRA = W * 0.31;
  const arcRB = W * 0.38;

  // ── Subject A : left half-arc, emerald
  const arcA = `
    <path d="M ${cx} ${cy - arcRA - 10} A ${arcRA + 10} ${arcRA + 10} 0 0 0 ${cx} ${cy + arcRA + 10}"
          fill="none" stroke="${BRAND.coherenceEmerald}" stroke-width="0.5" opacity="0.25"/>
    <path d="M ${cx} ${cy - arcRA} A ${arcRA} ${arcRA} 0 0 0 ${cx} ${cy + arcRA}"
          fill="none" stroke="${BRAND.coherenceEmerald}" stroke-width="1.8" opacity="0.85"/>`;
  // ── Subject B : right half-arc, indigo
  const arcB = `
    <path d="M ${cx} ${cy - arcRB - 10} A ${arcRB + 10} ${arcRB + 10} 0 0 1 ${cx} ${cy + arcRB + 10}"
          fill="none" stroke="${BRAND.flowIndigo}" stroke-width="0.5" opacity="0.25"/>
    <path d="M ${cx} ${cy - arcRB} A ${arcRB} ${arcRB} 0 0 1 ${cx} ${cy + arcRB}"
          fill="none" stroke="${BRAND.flowIndigo}" stroke-width="1.8" opacity="0.85"/>`;

  // ── Subject names — at the tops of each arc, on radial sight-lines.
  // Clamp to the inner viewBox so they never crop on very long names.
  const labelMaxLen = 18;
  const aName = (data.subject_a || '').length > labelMaxLen
    ? data.subject_a.slice(0, labelMaxLen - 1) + '…'
    : data.subject_a;
  const bName = (data.subject_b || '').length > labelMaxLen
    ? data.subject_b.slice(0, labelMaxLen - 1) + '…'
    : data.subject_b;
  const subjectLabels = `
    <text x="${cx - 18}" y="${cy - arcRA + 4}" text-anchor="end"
          font-family="Panchang, serif" font-weight="700" font-size="14"
          fill="${BRAND.coherenceEmerald}" letter-spacing="0.06em">${aName.toUpperCase()}</text>
    <text x="${cx - 18}" y="${cy - arcRA + 22}" text-anchor="end"
          font-family="SF Mono, monospace" font-size="7.5"
          fill="${BRAND.mutedSilver}" letter-spacing="0.28em">SUBJECT · A</text>
    <text x="${cx + 18}" y="${cy - arcRB + 4}" text-anchor="start"
          font-family="Panchang, serif" font-weight="700" font-size="14"
          fill="${BRAND.flowIndigo}" letter-spacing="0.06em">${bName.toUpperCase()}</text>
    <text x="${cx + 18}" y="${cy - arcRB + 22}" text-anchor="start"
          font-family="SF Mono, monospace" font-size="7.5"
          fill="${BRAND.mutedSilver}" letter-spacing="0.28em">SUBJECT · B</text>`;

  // ── Mahadasha pivots — paired markers near the top center
  const pivots: string[] = [];
  if (data.a_mahadasha?.transition_iso) {
    const col = PLANET_COLOR[data.a_mahadasha.next.toLowerCase()] || BRAND.sacredGold;
    const px = cx - 38, py = cy - arcRA - 28;
    pivots.push(`
      <line x1="${px}" y1="${py + 6}" x2="${px}" y2="${py + 28}"
            stroke="${col}" stroke-width="1.6"/>
      <circle cx="${px}" cy="${py + 2}" r="4" fill="${col}"/>
      <text x="${px - 8}" y="${py + 2}" text-anchor="end"
            font-family="SF Mono, monospace" font-size="8" font-weight="700"
            fill="${col}" letter-spacing="0.18em">${data.a_mahadasha.next.toUpperCase()}</text>
      <text x="${px - 8}" y="${py + 16}" text-anchor="end"
            font-family="Panchang, serif" font-style="italic" font-size="9"
            fill="${BRAND.sacredGold}">pivot · ${formatPivot(data.a_mahadasha.transition_iso)}</text>`);
  }
  if (data.b_mahadasha?.transition_iso) {
    const col = PLANET_COLOR[data.b_mahadasha.next.toLowerCase()] || BRAND.sacredGold;
    const px = cx + 38, py = cy - arcRB - 28;
    pivots.push(`
      <line x1="${px}" y1="${py + 6}" x2="${px}" y2="${py + 28}"
            stroke="${col}" stroke-width="1.6"/>
      <circle cx="${px}" cy="${py + 2}" r="4" fill="${col}"/>
      <text x="${px + 8}" y="${py + 2}" text-anchor="start"
            font-family="SF Mono, monospace" font-size="8" font-weight="700"
            fill="${col}" letter-spacing="0.18em">${data.b_mahadasha.next.toUpperCase()}</text>
      <text x="${px + 8}" y="${py + 16}" text-anchor="start"
            font-family="Panchang, serif" font-style="italic" font-size="9"
            fill="${BRAND.sacredGold}">pivot · ${formatPivot(data.b_mahadasha.transition_iso)}</text>`);
  }

  // ── Electromagnetic channel threads — luminous gradient arcs in the gap
  const channelThreads: string[] = [];
  if (data.electromagnetic_channels && data.electromagnetic_channels.length > 0) {
    data.electromagnetic_channels.forEach((ch, i) => {
      const yOffset = (i - (data.electromagnetic_channels!.length - 1) / 2) * 32;
      const startY = cy + yOffset;
      const ctrlX = cx;
      const ctrlY = startY + 8;
      const gradId = `dyad-thread-${i}`;
      channelThreads.push(`
        <defs>
          <linearGradient id="${gradId}" x1="${cx - arcRA + 4}" y1="${startY}" x2="${cx + arcRB - 4}" y2="${startY}" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="${BRAND.coherenceEmerald}" stop-opacity="0.6"/>
            <stop offset="50%" stop-color="${BRAND.sacredGold}" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="${BRAND.flowIndigo}" stop-opacity="0.6"/>
          </linearGradient>
        </defs>
        <!-- glow -->
        <path d="M ${cx - arcRA + 4} ${startY} Q ${ctrlX} ${ctrlY} ${cx + arcRB - 4} ${startY}"
              fill="none" stroke="${BRAND.sacredGold}" stroke-width="3" stroke-opacity="0.1"/>
        <!-- primary thread -->
        <path d="M ${cx - arcRA + 4} ${startY} Q ${ctrlX} ${ctrlY} ${cx + arcRB - 4} ${startY}"
              fill="none" stroke="url(#${gradId})" stroke-width="1.2"/>
        <!-- end caps -->
        <circle cx="${cx - arcRA + 4}" cy="${startY}" r="3" fill="${BRAND.coherenceEmerald}"/>
        <circle cx="${cx + arcRB - 4}" cy="${startY}" r="3" fill="${BRAND.flowIndigo}"/>
        <!-- label hugs midpoint with void-black halo so text reads -->
        <text x="${cx}" y="${startY - 6}" text-anchor="middle"
              font-family="SF Mono, monospace" font-size="7.5" font-weight="600"
              fill="${BRAND.sacredGold}" letter-spacing="0.18em"
              style="paint-order: stroke; stroke: ${BRAND.voidBlack}; stroke-width: 3px; stroke-linejoin: round;">${ch.toUpperCase()}</text>`);
    });
  }

  // ── Shared Atmakaraka — central seed under the field if matched
  let centralLock = '';
  if (data.shared_atmakaraka) {
    const akCol = PLANET_COLOR[data.shared_atmakaraka.toLowerCase()] || BRAND.sacredGold;
    const akY = cy + arcRA + 36;
    centralLock = `
      <circle cx="${cx}" cy="${akY}" r="22" fill="${BRAND.voidBlack}" stroke="${akCol}" stroke-width="1.2"/>
      <circle cx="${cx}" cy="${akY}" r="14" fill="${akCol}" fill-opacity="0.18" stroke="none"/>
      <text x="${cx}" y="${akY + 4}" text-anchor="middle"
            font-family="Panchang, serif" font-size="11" font-weight="700"
            fill="${akCol}" letter-spacing="0.08em">${data.shared_atmakaraka.slice(0, 2).toUpperCase()}</text>
      <text x="${cx}" y="${akY + 38}" text-anchor="middle"
            font-family="SF Mono, monospace" font-size="7"
            fill="${BRAND.mutedSilver}" letter-spacing="0.32em">SHARED ATMAKARAKA · ${data.shared_atmakaraka.toUpperCase()}</text>`;
  }

  // ── Companionship gates — soft violet dots near the base
  const gateDots: string[] = [];
  if (data.companionship_gates && data.companionship_gates.length > 0) {
    const baseY = H - 30;
    const spacing = Math.min(34, (W - 80) / data.companionship_gates.length);
    const startX = cx - (data.companionship_gates.length - 1) * spacing / 2;
    data.companionship_gates.forEach((g, i) => {
      const x = startX + i * spacing;
      gateDots.push(`
        <circle cx="${x}" cy="${baseY}" r="10" fill="${BRAND.witnessViolet}" fill-opacity="0.32"
                stroke="${BRAND.witnessViolet}" stroke-width="1"/>
        <text x="${x}" y="${baseY + 4}" text-anchor="middle"
              font-family="SF Mono, monospace" font-size="9" font-weight="700"
              fill="${BRAND.parchment}">${g}</text>`);
    });
    gateDots.push(`
      <text x="${cx}" y="${baseY - 18}" text-anchor="middle"
            font-family="SF Mono, monospace" font-size="7.5"
            fill="${BRAND.mutedSilver}" letter-spacing="0.32em">COMPANIONSHIP GATES</text>`);
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="composite-bg" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${BRAND.sacredGold}" stop-opacity="0.05"/>
      <stop offset="60%" stop-color="${BRAND.witnessViolet}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${BRAND.voidBlack}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#composite-bg)"/>
  ${arcA}
  ${arcB}
  ${subjectLabels}
  ${pivots.join('')}
  ${channelThreads.join('')}
  ${centralLock}
  ${gateDots.join('')}
</svg>`;
}
