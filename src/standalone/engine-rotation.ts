// ─── Daily Witness — Engine Rotation ───────────────────────────────────
// Deterministic daily rotation seeded by the user's numerological signature.
// Not random — personal. The engine you see today is for YOU today.

import type { StandaloneEngineId } from './types.js';
import { STANDALONE_ENGINES } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// ROTATION LOGIC
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the primary engine for a given user on a given day.
 * 
 * The rotation is deterministic: same user + same day = same engine.
 * The seed is the user's numerological "life path" number, so the
 * rotation feels personal without being random.
 * 
 * The 4 engines rotate in this order (Pichet's somatic territory):
 * 1. biorhythm    — "How does your body feel today?"
 * 2. panchanga    — "What cosmic weather are you in?"
 * 3. vedic-clock  — "What organ is active right now?"
 * 4. numerology   — "What is your structural architecture?"
 * 
 * But the starting point depends on the user, so two people checking
 * on the same day see different primary engines.
 */
export function getPrimaryEngine(birthDate: string, today?: string): StandaloneEngineId {
  const seed = computeLifePathSeed(birthDate);
  const dayNumber = getDayNumber(today);
  const index = (seed + dayNumber) % STANDALONE_ENGINES.length;
  return STANDALONE_ENGINES[index];
}

/**
 * Get the full rotation order for a user (starting from today's primary).
 * Returns all 4 engines in their rotation order.
 */
export function getRotationOrder(birthDate: string, today?: string): StandaloneEngineId[] {
  const seed = computeLifePathSeed(birthDate);
  const dayNumber = getDayNumber(today);
  const startIndex = (seed + dayNumber) % STANDALONE_ENGINES.length;
  
  const order: StandaloneEngineId[] = [];
  for (let i = 0; i < STANDALONE_ENGINES.length; i++) {
    order.push(STANDALONE_ENGINES[(startIndex + i) % STANDALONE_ENGINES.length]);
  }
  return order;
}

/**
 * Predict the next N days' primary engines for a user.
 * Useful for "what's coming" previews and streak motivation.
 */
export function getForecast(birthDate: string, days: number, startDate?: string): Array<{
  date: string;
  primary_engine: StandaloneEngineId;
}> {
  const start = startDate ? new Date(startDate) : new Date();
  const forecast: Array<{ date: string; primary_engine: StandaloneEngineId }> = [];
  
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    forecast.push({
      date: dateStr,
      primary_engine: getPrimaryEngine(birthDate, dateStr),
    });
  }
  
  return forecast;
}

// ═══════════════════════════════════════════════════════════════════════
// NUMEROLOGICAL SEED
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute a numerological "life path" seed from birth date.
 * Standard numerology: sum all digits, reduce to single digit (1-9).
 * Master numbers (11, 22, 33) are NOT reduced — they get special rotation.
 */
export function computeLifePathSeed(birthDate: string): number {
  // Parse date string: "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM..."
  const clean = birthDate.replace(/[-T:Z.]/g, '').slice(0, 8); // Get YYYYMMDD
  
  let sum = 0;
  for (const ch of clean) {
    const digit = parseInt(ch, 10);
    if (!isNaN(digit)) sum += digit;
  }
  
  // Reduce to single digit (unless master number)
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    let newSum = 0;
    while (sum > 0) {
      newSum += sum % 10;
      sum = Math.floor(sum / 10);
    }
    sum = newSum;
  }
  
  return sum;
}

/**
 * Get day number (day of year, 1-366) for rotation index.
 */
export function getDayNumber(dateStr?: string): number {
  const date = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
