// ─── /integratedreading — Selemene Engine Fetcher ───────────────────
// Calls all 16 Selemene engines in parallel for a given birth-data block.
// Each engine returns { engine_id, result, witness_prompt, consciousness_level, metadata }.
//
// Auth: X-API-Key header (from SELEMENE_API_KEY env var, loaded from ~/.claude/.env).

export const SELEMENE_BASE_URL = 'https://selemene.tryambakam.space';

export const SELEMENE_ENGINE_IDS = [
  'panchanga',
  'vimshottari',
  'human-design',
  'gene-keys',
  'numerology',
  'biorhythm',
  'vedic-clock',
  'biofield',
  'face-reading',
  'nadabrahman',
  'transits',
  'tarot',
  'i-ching',
  'enneagram',
  'sacred-geometry',
  'sigil-forge',
] as const;
export type SelemeneEngineId = (typeof SELEMENE_ENGINE_IDS)[number];

export interface BirthData {
  date: string;          // YYYY-MM-DD
  time?: string;         // HH:MM
  timezone?: string;     // IANA timezone, e.g. Asia/Kolkata
  latitude?: number;
  longitude?: number;
  name?: string;
}

export interface SelemeneEngineOutput {
  engine_id: SelemeneEngineId;
  result?: any;
  witness_prompt?: string;
  consciousness_level?: number;
  metadata?: {
    calculation_time_ms?: number;
    backend?: string;
    precision_achieved?: string;
    cached?: boolean;
    timestamp?: string;
    engine_version?: string;
  };
  envelope_version?: string;
  _error?: string;
}

export interface FetchOptions {
  api_key: string;
  base_url?: string;
  timeout_ms?: number;
  engines?: SelemeneEngineId[];
}

async function callEngine(engineId: SelemeneEngineId, birthData: BirthData, opts: FetchOptions): Promise<SelemeneEngineOutput> {
  const url = `${opts.base_url ?? SELEMENE_BASE_URL}/api/v1/engines/${engineId}/calculate`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout_ms ?? 30_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': opts.api_key,
      },
      body: JSON.stringify({ birth_data: birthData }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { engine_id: engineId, _error: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data: any = await res.json();
    return { ...data, engine_id: engineId };
  } catch (err: any) {
    clearTimeout(t);
    return { engine_id: engineId, _error: err.message };
  }
}

/** Fetch every Selemene engine in parallel. Returns one entry per engine in input order. */
export async function fetchAllEngines(birthData: BirthData, opts: FetchOptions): Promise<SelemeneEngineOutput[]> {
  const engines = opts.engines ?? Array.from(SELEMENE_ENGINE_IDS);
  const results = await Promise.all(engines.map((eId) => callEngine(eId, birthData, opts)));
  return results;
}

/** Convenience: load SELEMENE_API_KEY from ~/.claude/.env (and process.env). */
export async function loadSelemeneKey(): Promise<string | undefined> {
  if (process.env.SELEMENE_API_KEY) return process.env.SELEMENE_API_KEY;
  const fs = await import('node:fs');
  const path = await import('node:path');
  const os = await import('node:os');
  const envPath = path.join(os.homedir(), '.claude', '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const txt = fs.readFileSync(envPath, 'utf-8');
  const match = txt.match(/^SELEMENE_API_KEY=(\S+)/m);
  if (match) {
    process.env.SELEMENE_API_KEY = match[1];
    return match[1];
  }
  return undefined;
}
