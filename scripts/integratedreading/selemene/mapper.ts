// ─── /integratedreading — Selemene → SVG Data Mapper ────────────────
// Translates raw Selemene engine outputs into the shapes the SVG
// generators expect. Each engine has its own envelope structure;
// this module normalizes them.

import type { SelemeneEngineOutput, SelemeneEngineId } from './fetcher.js';

// ──────────────────────────────────────────────────────────────────────
// Engine → Kosha layer routing
// (which Kosha layer each engine primarily serves — drives wheel coloring + Kosha mandala intensity)
// ──────────────────────────────────────────────────────────────────────

export type KoshaLayer = 'body' | 'vital' | 'pattern' | 'wisdom' | 'imperishable';

export const ENGINE_LAYER: Record<SelemeneEngineId, KoshaLayer> = {
  'panchanga':         'wisdom',
  'vimshottari':       'wisdom',
  'human-design':      'vital',
  'gene-keys':         'pattern',
  'numerology':        'pattern',
  'biorhythm':         'vital',
  'vedic-clock':       'wisdom',
  'biofield':          'vital',
  'face-reading':      'body',
  'nadabrahman':       'vital',
  'transits':          'wisdom',
  'tarot':             'imperishable',
  'i-ching':           'wisdom',
  'enneagram':         'pattern',
  'sacred-geometry':   'imperishable',
  'sigil-forge':       'imperishable',
};

// ──────────────────────────────────────────────────────────────────────
// Engine → Selemene 16-engine wheel input
// ──────────────────────────────────────────────────────────────────────

export interface WheelEngineOutput {
  engine: string;
  output?: {
    key_signal?: string;
    tarot_archetype?: string;
    under_routed_in_source?: boolean;
    _error?: string;
  };
}

/** Map a Selemene engine output to the wheel-engine format used by selemene-wheel.ts. */
export function toWheelInput(o: SelemeneEngineOutput): WheelEngineOutput {
  if (o._error) {
    return { engine: o.engine_id.replace(/-/g, '_'), output: { _error: o._error } };
  }
  const r = o.result || {};
  // Try multiple paths to derive a "key_signal" from the engine's specific result shape
  let keySignal = o.witness_prompt || '';
  // For tarot engine: extract card name as tarot_archetype
  let tarotArchetype: string | undefined;
  if (o.engine_id === 'tarot') {
    if (r.card?.name) tarotArchetype = r.card.name;
    else if (r.major_arcana?.name) tarotArchetype = r.major_arcana.name;
    else if (typeof r.archetype === 'string') tarotArchetype = r.archetype;
  }
  return {
    engine: o.engine_id.replace(/-/g, '_'),
    output: {
      key_signal: keySignal,
      tarot_archetype: tarotArchetype,
      under_routed_in_source: false,  // no source-comparison in standalone mode
    },
  };
}

/** Map an array of engine outputs to wheel inputs. */
export function toWheelInputs(outputs: SelemeneEngineOutput[]): WheelEngineOutput[] {
  return outputs.map(toWheelInput);
}

// ──────────────────────────────────────────────────────────────────────
// Engine → Kosha mandala layer intensity
// ──────────────────────────────────────────────────────────────────────

export interface KoshaLayerSignal {
  layer: KoshaLayer;
  intensity: number;      // 0..1 — average consciousness_level + signal density of engines routing here
  engine_count: number;
  example_witness?: string;
}

/** Aggregate engine outputs into per-Kosha-layer signal strengths. */
export function toKoshaLayerSignals(outputs: SelemeneEngineOutput[]): KoshaLayerSignal[] {
  const accum: Record<KoshaLayer, { total: number; count: number; example?: string }> = {
    body: { total: 0, count: 0 },
    vital: { total: 0, count: 0 },
    pattern: { total: 0, count: 0 },
    wisdom: { total: 0, count: 0 },
    imperishable: { total: 0, count: 0 },
  };
  for (const o of outputs) {
    if (o._error) continue;
    const layer = ENGINE_LAYER[o.engine_id];
    if (!layer) continue;
    // Score = consciousness_level (0..3) normalized by 3 + witness-prompt length factor
    const cl = Math.min(3, o.consciousness_level ?? 0) / 3;
    const wpScore = Math.min(1, (o.witness_prompt?.length ?? 0) / 240);
    const score = (cl * 0.6) + (wpScore * 0.4);
    accum[layer].total += score;
    accum[layer].count += 1;
    if (!accum[layer].example && o.witness_prompt) {
      accum[layer].example = o.witness_prompt.slice(0, 140);
    }
  }
  return (Object.keys(accum) as KoshaLayer[]).map((layer) => ({
    layer,
    intensity: accum[layer].count > 0 ? accum[layer].total / accum[layer].count : 0,
    engine_count: accum[layer].count,
    example_witness: accum[layer].example,
  }));
}

// ──────────────────────────────────────────────────────────────────────
// Vimshottari → Mahadasha SVG input
// ──────────────────────────────────────────────────────────────────────

export interface MahadashaInput {
  current_lord: string;
  current_ends_iso?: string;
  next_lord: string;
  next_starts_iso?: string;
  next_duration_years: number;
  antardashas?: Array<{ lord: string; start_iso?: string; end_iso?: string; duration_months?: number }>;
}

/** Extract Mahadasha timeline data from Selemene vimshottari output. */
export function toMahadashaInput(vimOutput?: SelemeneEngineOutput): MahadashaInput | undefined {
  if (!vimOutput || vimOutput._error) return undefined;
  const r = vimOutput.result;
  if (!r?.current_period?.mahadasha || !r?.timeline?.mahadashas) return undefined;

  const current = r.current_period.mahadasha;
  // Find the NEXT mahadasha in the timeline after the current
  const timeline: any[] = r.timeline.mahadashas;
  const currentIdx = timeline.findIndex((m) => m.planet === current.planet && m.start_date === current.start);
  const nextMd = currentIdx >= 0 && currentIdx + 1 < timeline.length ? timeline[currentIdx + 1] : timeline.find((m) => new Date(m.start_date) > new Date(current.end));

  // Build antardasha list for the NEXT mahadasha if available, else from current
  // (Selemene's vimshottari endpoint returns top-level mahadasha info; antardasha breakdown
  //  is typically computed downstream. For now we synthesize antardashas using Vimshottari
  //  proportions for the next MD lord — these are deterministic from the lord identity.)
  const antardashas = nextMd ? computeAntardashas(nextMd.planet, new Date(nextMd.start_date), nextMd.duration_years) : undefined;

  return {
    current_lord: current.planet.toLowerCase(),
    current_ends_iso: current.end,
    next_lord: (nextMd?.planet || '').toLowerCase(),
    next_starts_iso: nextMd?.start_date,
    next_duration_years: nextMd?.duration_years ?? 0,
    antardashas,
  };
}

const VIMSHOTTARI_SEQUENCE = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const VIMSHOTTARI_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

function computeAntardashas(mdLord: string, mdStart: Date, mdDurationYears: number): Array<{ lord: string; start_iso: string; end_iso: string; duration_months: number }> {
  // Vimshottari proportional rule: antardasha sequence starts with the MD lord itself,
  // then proceeds in Vimshottari order. Each AD's duration = (lord_years × md_years) / 120
  const startIdx = VIMSHOTTARI_SEQUENCE.indexOf(mdLord);
  if (startIdx < 0) return [];
  const result: Array<{ lord: string; start_iso: string; end_iso: string; duration_months: number }> = [];
  let cursor = new Date(mdStart);
  for (let i = 0; i < 9; i++) {
    const lord = VIMSHOTTARI_SEQUENCE[(startIdx + i) % 9];
    const lordYears = VIMSHOTTARI_YEARS[lord];
    const adYears = (lordYears * mdDurationYears) / 120;
    const adMs = adYears * 365.25 * 24 * 3600 * 1000;
    const end = new Date(cursor.getTime() + adMs);
    result.push({
      lord: lord.toLowerCase(),
      start_iso: cursor.toISOString().slice(0, 10),
      end_iso: end.toISOString().slice(0, 10),
      duration_months: Math.round(adYears * 12),
    });
    cursor = end;
  }
  return result;
}

// ──────────────────────────────────────────────────────────────────────
// Human Design → chart placement enrichment (for the Kundali SVG)
// ──────────────────────────────────────────────────────────────────────

/** Extract atmakaraka / lagna info from Selemene outputs (panchanga + vimshottari). */
export function extractChartIdentity(outputs: SelemeneEngineOutput[]): { lagna?: string; atmakaraka?: string; birth_nakshatra?: string } {
  const out: { lagna?: string; atmakaraka?: string; birth_nakshatra?: string } = {};
  for (const o of outputs) {
    if (o._error) continue;
    if (o.engine_id === 'vimshottari' && o.result?.birth_nakshatra?.name) {
      out.birth_nakshatra = o.result.birth_nakshatra.name;
    }
    if (o.engine_id === 'panchanga' && o.result) {
      // panchanga may not directly contain Lagna; depends on engine
    }
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Pancha Bhuta from chart placements (deterministic, sign-based)
// ──────────────────────────────────────────────────────────────────────

const SIGN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
};

const SANSKRIT_TO_ENGLISH: Record<string, string> = {
  mesha: 'aries', vrishabha: 'taurus', mithuna: 'gemini', karka: 'cancer',
  simha: 'leo', kanya: 'virgo', tula: 'libra', vrishchika: 'scorpio',
  dhanu: 'sagittarius', makara: 'capricorn', kumbha: 'aquarius', meena: 'pisces',
};

export function computePanchaBhuta(placements: Array<{ planet: string; sign: string; house?: number }>): { fire: number; earth: number; water: number; air: number; ether: number } {
  const counts = { fire: 0, earth: 0, water: 0, air: 0, ether: 0 };
  for (const p of placements) {
    let signKey = p.sign.toLowerCase().split(/[\s(]/)[0];
    if (SANSKRIT_TO_ENGLISH[signKey]) signKey = SANSKRIT_TO_ENGLISH[signKey];
    const element = SIGN_ELEMENT[signKey];
    if (element) counts[element]++;
    // 12th house assigns ether
    if (p.house === 12) counts.ether++;
  }
  return counts;
}
