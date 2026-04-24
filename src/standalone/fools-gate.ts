// ─── Daily Witness — Fool's Gate ──────────────────────────────────────
// "The highest-value first-encounter moment that feels found, not delivered."
// — Downstream Mind thesis
//
// The Fool's Gate is the first reading a new user sees. It must:
// 1. Use biorhythm (the most viscerally verifiable engine)
// 2. Find the ONE data point that creates recognition ("wait, how does it know?")
// 3. Offer zero explanation — let the precision land in silence
// 4. Leave the user more upstream than they arrived
//
// This is NOT onboarding. This is the curated resonance point at the 3am thread.

import type { FoolsGateResponse, StandaloneEngineId, DataPoint } from './types.js';
import type { DecoderState } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// FOOL'S GATE DETECTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if this is a first encounter (Fool's Gate moment).
 */
export function isFoolsGate(state: DecoderState): boolean {
  return state.total_visits === 0 || state.first_visit === '';
}

/**
 * Build the Fool's Gate response from a biorhythm reading.
 * Always biorhythm first — the body doesn't lie, and it's
 * the most immediately verifiable engine we have.
 */
export function buildFoolsGate(
  biorhythmData: Record<string, unknown>,
): FoolsGateResponse {
  const hook = findRecognitionHook(biorhythmData);
  
  return {
    is_first_encounter: true,
    calibration_engine: 'biorhythm',
    recognition_hook: hook,
    silence_after: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// RECOGNITION HOOK EXTRACTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Find the single most striking data point in a biorhythm reading.
 * Priority:
 *   1. Critical day (tomorrow or today) — "Your body knows something is shifting"
 *   2. Extreme low or high (>90% or <15%) — viscerally felt
 *   3. Emotional-physical divergence (>50pt gap) — "head says yes, body says no"
 *   4. Default: overall energy state
 */
function findRecognitionHook(data: Record<string, unknown>): string {
  // Check for critical days (most striking)
  const criticalDays = data.critical_days as Array<Record<string, unknown>> | undefined;
  if (criticalDays && criticalDays.length > 0) {
    const next = criticalDays[0];
    const cycle = next.cycle as string || 'energy';
    const daysUntil = next.days_until as number;
    if (daysUntil !== undefined && daysUntil <= 1) {
      return `Your ${cycle.toLowerCase()} cycle crosses zero ${daysUntil === 0 ? 'today' : 'tomorrow'}. You already feel it.`;
    }
  }
  
  // Check for extreme values
  const physical = data.physical as Record<string, unknown> | undefined;
  const emotional = data.emotional as Record<string, unknown> | undefined;
  const intellectual = data.intellectual as Record<string, unknown> | undefined;
  
  const physPct = (physical?.percentage as number) ?? 50;
  const emoPct = (emotional?.percentage as number) ?? 50;
  const intPct = (intellectual?.percentage as number) ?? 50;
  
  // Extreme low (body screaming "rest")
  if (physPct < 15) {
    return `Physical energy at ${Math.round(physPct)}%. Your body has been asking for rest. It's right.`;
  }
  
  // Extreme high (action window)
  if (physPct > 90) {
    return `Physical energy at ${Math.round(physPct)}%. The window is open. Your body knows.`;
  }
  
  // Emotional-physical divergence (the "something's off" feeling)
  const divergence = Math.abs(physPct - emoPct);
  if (divergence > 50) {
    const higher = physPct > emoPct ? 'body' : 'feelings';
    const lower = physPct > emoPct ? 'feelings' : 'body';
    return `Your ${higher} is running ahead of your ${lower}. That tension you feel? It has a shape: ${Math.round(divergence)}° of divergence.`;
  }
  
  // Intellectual-physical divergence (the "can't think straight" pattern)
  const ipDivergence = Math.abs(physPct - intPct);
  if (ipDivergence > 45) {
    return `${Math.round(physPct)}% physical, ${Math.round(intPct)}% intellectual. The gap between what your body can do and what your mind wants is ${Math.round(ipDivergence)} points wide.`;
  }
  
  // Check for critical phases
  const physPhase = physical?.phase as string;
  const physIsCritical = physical?.is_critical as boolean;
  if (physIsCritical) {
    return `Physical cycle at critical crossing. The instability you sense isn't imagined.`;
  }
  
  // Default: overall energy state
  const overall = data.overall_energy as number | undefined;
  if (overall !== undefined) {
    if (overall < 30) {
      return `Overall energy field: ${Math.round(overall)}%. This isn't laziness. This is your body's architecture today.`;
    }
    if (overall > 80) {
      return `Overall energy field: ${Math.round(overall)}%. What have you been putting off?`;
    }
    return `Overall energy field: ${Math.round(overall)}%. Not good. Not bad. Precise.`;
  }
  
  // Absolute fallback
  return `Physical ${Math.round(physPct)}% · Emotional ${Math.round(emoPct)}% · Intellectual ${Math.round(intPct)}%. These are not opinions. They are coordinates.`;
}

// ═══════════════════════════════════════════════════════════════════════
// DATA POINT EXTRACTION (for Layer 1 display)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Extract displayable data points from any standalone engine output.
 */
export function extractDataPoints(
  engineId: StandaloneEngineId,
  result: Record<string, unknown>,
): DataPoint[] {
  switch (engineId) {
    case 'biorhythm': return extractBiorhythmPoints(result);
    case 'vedic-clock': return extractVedicClockPoints(result);
    case 'panchanga': return extractPanchangaPoints(result);
    case 'numerology': return extractNumerologyPoints(result);
    default: return [];
  }
}

function extractBiorhythmPoints(data: Record<string, unknown>): DataPoint[] {
  const points: DataPoint[] = [];
  
  for (const cycle of ['physical', 'emotional', 'intellectual', 'intuitive'] as const) {
    const c = data[cycle] as Record<string, unknown> | undefined;
    if (c) {
      const pct = c.percentage as number;
      const phase = c.phase as string;
      const isCritical = c.is_critical as boolean;
      points.push({
        label: cycle.charAt(0).toUpperCase() + cycle.slice(1),
        value: `${Math.round(pct)}% ${phase || ''}`.trim(),
        category: 'body',
        emphasis: isCritical || pct > 90 || pct < 10,
      });
    }
  }
  
  const overall = data.overall_energy as number | undefined;
  if (overall !== undefined) {
    points.push({
      label: 'Overall Energy',
      value: `${Math.round(overall)}%`,
      category: 'body',
      emphasis: overall < 25 || overall > 85,
    });
  }
  
  return points;
}

function extractVedicClockPoints(data: Record<string, unknown>): DataPoint[] {
  const points: DataPoint[] = [];
  const organ = data.current_organ as Record<string, unknown> | undefined;
  
  if (organ) {
    points.push({
      label: 'Active Organ',
      value: organ.organ as string || 'Unknown',
      category: 'time',
      emphasis: true,
    });
    points.push({
      label: 'Element',
      value: organ.element as string || 'Unknown',
      category: 'time',
    });
    if (organ.associated_emotion) {
      points.push({
        label: 'Associated Emotion',
        value: organ.associated_emotion as string,
        category: 'time',
      });
    }
    if (organ.peak_energy) {
      points.push({
        label: 'Peak Energy',
        value: organ.peak_energy as string,
        category: 'time',
      });
    }
  }
  
  const dosha = data.current_dosha as Record<string, unknown> | undefined;
  if (dosha) {
    points.push({
      label: 'Active Dosha',
      value: dosha.dosha as string || 'Unknown',
      category: 'time',
    });
  }
  
  return points;
}

function extractPanchangaPoints(data: Record<string, unknown>): DataPoint[] {
  const points: DataPoint[] = [];
  
  const fields: Array<[string, string]> = [
    ['tithi_name', 'Tithi'],
    ['nakshatra_name', 'Nakshatra'],
    ['yoga_name', 'Yoga'],
    ['karana_name', 'Karana'],
    ['vara_name', 'Vara'],
  ];
  
  for (const [key, label] of fields) {
    const val = data[key] as string | undefined;
    if (val) {
      points.push({
        label,
        value: val,
        category: 'cosmic',
        emphasis: key === 'tithi_name' || key === 'nakshatra_name',
      });
    }
  }
  
  return points;
}

function extractNumerologyPoints(data: Record<string, unknown>): DataPoint[] {
  const points: DataPoint[] = [];
  
  const fields: Array<[string, string]> = [
    ['life_path', 'Life Path'],
    ['expression', 'Expression'],
    ['soul_urge', 'Soul Urge'],
    ['personality', 'Personality'],
    ['birthday', 'Birthday'],
  ];
  
  for (const [key, label] of fields) {
    const entry = data[key] as Record<string, unknown> | undefined;
    if (entry) {
      const value = entry.value as number;
      const meaning = entry.meaning as string;
      const isMaster = entry.is_master as boolean;
      points.push({
        label: isMaster ? `${label} (Master)` : label,
        value: `${value}${meaning ? ' — ' + meaning : ''}`,
        category: 'structure',
        emphasis: isMaster,
      });
    }
  }
  
  return points;
}

/**
 * Generate a Layer 1 headline for any engine.
 * Factual. No interpretation. The precision IS the signal.
 */
export function generateHeadline(
  engineId: StandaloneEngineId,
  result: Record<string, unknown>,
): string {
  switch (engineId) {
    case 'biorhythm': {
      const phys = (result.physical as Record<string, unknown>)?.percentage as number;
      const emo = (result.emotional as Record<string, unknown>)?.percentage as number;
      const int = (result.intellectual as Record<string, unknown>)?.percentage as number;
      if (phys !== undefined) {
        return `Body ${Math.round(phys)}% · Heart ${Math.round(emo || 50)}% · Mind ${Math.round(int || 50)}%`;
      }
      return 'Biorhythm reading available.';
    }
    case 'vedic-clock': {
      const organ = result.current_organ as Record<string, unknown> | undefined;
      if (organ?.organ) {
        return `${organ.organ} (${organ.element || '?'}) — active now`;
      }
      return 'Vedic clock reading available.';
    }
    case 'panchanga': {
      const tithi = result.tithi_name as string;
      const nak = result.nakshatra_name as string;
      if (tithi && nak) {
        return `${tithi} · ${nak}`;
      }
      return 'Panchanga reading available.';
    }
    case 'numerology': {
      const lp = result.life_path as Record<string, unknown> | undefined;
      if (lp?.value) {
        return `Life Path ${lp.value}${lp.is_master ? ' (Master Number)' : ''}`;
      }
      return 'Numerology reading available.';
    }
    default:
      return 'Reading available.';
  }
}
