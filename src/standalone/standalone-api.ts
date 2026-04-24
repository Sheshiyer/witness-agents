// ─── Daily Witness — Standalone HTTP API ──────────────────────────────
// Lightweight HTTP server for the standalone product.
// Three endpoints:
//   GET  /                          → Product info + available engines
//   POST /reading                   → Generate daily reading
//   POST /reading/stream            → SSE streaming reading
//   POST /reading/:engine_id        → Generate reading for specific engine
//   GET  /forecast?birth_date=...   → 7-day engine forecast
//
// No auth required for free tier. Rate-limited by IP + birth_date hash.
// Designed to be deployable as a single Cloudflare Worker or Railway service.

import type { BirthData } from '../types/engine.js';
import type { StandaloneEngineId, StandaloneTier, SkillsShResponse } from './types.js';
import { STANDALONE_ENGINES } from './types.js';
import { DailyMirror } from './daily-mirror.js';
import type { DailyMirrorConfig } from './daily-mirror.js';
import { getForecast } from './engine-rotation.js';

// ═══════════════════════════════════════════════════════════════════════
// API TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface StandaloneApiConfig extends DailyMirrorConfig {
  port?: number;
  rate_limit_per_hour?: number;  // Default: 30 for free, 300 for subscriber
  cors_origin?: string;          // Default: '*'
}

export interface ReadingRequest {
  birth_date: string;       // YYYY-MM-DD (required)
  birth_time?: string;      // HH:MM (recommended)
  name?: string;
  latitude?: number;        // Default: 0
  longitude?: number;       // Default: 0
  timezone?: string;        // Default: 'UTC'
}

export interface ApiError {
  error: string;
  code: string;
  hint?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// RATE LIMITER (in-memory, per birth_date hash)
// ═══════════════════════════════════════════════════════════════════════

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/** Reset rate limiter (for testing) */
export function _resetRateLimiter(): void {
  rateLimitStore.clear();
}

// ═══════════════════════════════════════════════════════════════════════
// REQUEST VALIDATION
// ═══════════════════════════════════════════════════════════════════════

function validateReadingRequest(body: unknown): ReadingRequest | ApiError {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body required', code: 'INVALID_BODY' };
  }
  
  const req = body as Record<string, unknown>;
  
  if (!req.birth_date || typeof req.birth_date !== 'string') {
    return {
      error: 'birth_date is required (YYYY-MM-DD format)',
      code: 'MISSING_BIRTH_DATE',
      hint: 'Example: { "birth_date": "1991-08-13" }',
    };
  }
  
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(req.birth_date)) {
    return {
      error: 'birth_date must be YYYY-MM-DD format',
      code: 'INVALID_DATE_FORMAT',
      hint: 'Example: "1991-08-13"',
    };
  }
  
  // Validate time format if provided
  if (req.birth_time && typeof req.birth_time === 'string') {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(req.birth_time)) {
      return {
        error: 'birth_time must be HH:MM format',
        code: 'INVALID_TIME_FORMAT',
        hint: 'Example: "13:19"',
      };
    }
  }
  
  return {
    birth_date: req.birth_date as string,
    birth_time: req.birth_time as string | undefined,
    name: req.name as string | undefined,
    latitude: typeof req.latitude === 'number' ? req.latitude : 0,
    longitude: typeof req.longitude === 'number' ? req.longitude : 0,
    timezone: (req.timezone as string) || 'UTC',
  };
}

function toBirthData(req: ReadingRequest): BirthData {
  return {
    name: req.name,
    date: req.birth_date,
    time: req.birth_time,
    latitude: req.latitude || 0,
    longitude: req.longitude || 0,
    timezone: req.timezone || 'UTC',
  };
}

// ═══════════════════════════════════════════════════════════════════════
// API HANDLER FACTORY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create framework-agnostic route handlers for the standalone API.
 * Mount in Express, Hono, Cloudflare Workers, or use the built-in Node server.
 */
export function createStandaloneHandlers(config: StandaloneApiConfig) {
  const mirror = new DailyMirror(config);
  const rateLimit = config.rate_limit_per_hour || 30;
  
  return {
    /**
     * GET / — Product info and available engines
     */
    async info(): Promise<{ status: number; body: unknown }> {
      return {
        status: 200,
        body: {
          name: 'The Daily Witness',
          version: '0.1.0',
          tagline: 'Four mirrors. Three layers. Your body\'s architecture, daily.',
          engines: STANDALONE_ENGINES.map(id => ({
            id,
            role: id === 'biorhythm' ? 'somatic-pulse' :
              id === 'vedic-clock' ? 'temporal-rhythm' :
                id === 'panchanga' ? 'cosmic-weather' : 'structural-anchor',
            frequency: id === 'vedic-clock' ? 'hourly' :
              id === 'numerology' ? 'once' : 'daily',
          })),
          layers: [
            { layer: 1, name: 'Raw Mirror', description: 'Data. No interpretation. The precision is the signal.' },
            { layer: 2, name: 'Witness Question', description: 'Not explanation — inquiry. Earned by returning.' },
            { layer: 3, name: 'Meta-Pattern', description: 'Cross-engine resonance. Earned by practice.' },
          ],
          full_platform: 'https://tryambakam.space',
          docs: 'https://github.com/Sheshiyer/witness-agents',
        },
      };
    },
    
    /**
     * POST /reading — Generate daily reading (primary engine selected by rotation)
     */
    async reading(body: unknown, clientKey?: string): Promise<{ status: number; body: unknown }> {
      const validated = validateReadingRequest(body);
      if ('error' in validated) {
        return { status: 400, body: validated };
      }
      
      const limitKey = clientKey || validated.birth_date;
      if (!checkRateLimit(limitKey, rateLimit)) {
        return {
          status: 429,
          body: {
            error: 'Rate limit exceeded',
            code: 'RATE_LIMITED',
            hint: `Maximum ${rateLimit} readings per hour. Try again later.`,
          } satisfies ApiError,
        };
      }
      
      try {
        const birthData = toBirthData(validated);
        const reading = await mirror.generateReading(birthData);
        
        return {
          status: 200,
          body: {
            reading,
            next_reading_available: getNextMidnight(),
            full_platform_url: 'https://tryambakam.space',
          },
        };
      } catch (err) {
        return {
          status: 500,
          body: {
            error: 'Engine calculation failed',
            code: 'ENGINE_ERROR',
            hint: (err as Error).message,
          } satisfies ApiError,
        };
      }
    },
    
    /**
     * POST /reading/:engine_id — Generate reading for a specific engine
     */
    async engineReading(
      engineId: string,
      body: unknown,
      clientKey?: string,
    ): Promise<{ status: number; body: unknown }> {
      // Validate engine ID
      if (!STANDALONE_ENGINES.includes(engineId as StandaloneEngineId)) {
        return {
          status: 400,
          body: {
            error: `Invalid engine: ${engineId}`,
            code: 'INVALID_ENGINE',
            hint: `Available engines: ${STANDALONE_ENGINES.join(', ')}`,
          } satisfies ApiError,
        };
      }
      
      const validated = validateReadingRequest(body);
      if ('error' in validated) {
        return { status: 400, body: validated };
      }
      
      const limitKey = clientKey || validated.birth_date;
      if (!checkRateLimit(limitKey, rateLimit)) {
        return {
          status: 429,
          body: { error: 'Rate limit exceeded', code: 'RATE_LIMITED' } satisfies ApiError,
        };
      }
      
      try {
        const birthData = toBirthData(validated);
        const reading = await mirror.generateEngineReading(
          birthData,
          engineId as StandaloneEngineId,
        );
        
        return { status: 200, body: { reading } };
      } catch (err) {
        return {
          status: 500,
          body: { error: 'Engine calculation failed', code: 'ENGINE_ERROR' } satisfies ApiError,
        };
      }
    },
    
    /**
     * POST /reading/stream — SSE streaming reading (Layer 1 + Layer 2 streamed)
     * Returns: text/event-stream with events: layer1, layer2_start, layer2_chunk, layer2_done, meta_pattern, done
     */
    async *readingStream(
      body: unknown,
      clientKey?: string,
    ): AsyncGenerator<string, void, unknown> {
      const validated = validateReadingRequest(body);
      if ('error' in validated) {
        yield `event: error\ndata: ${JSON.stringify(validated)}\n\n`;
        return;
      }
      
      const limitKey = clientKey || validated.birth_date;
      if (!checkRateLimit(limitKey, rateLimit)) {
        yield `event: error\ndata: ${JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' })}\n\n`;
        return;
      }
      
      try {
        const birthData = toBirthData(validated);
        const reading = await mirror.generateReading(birthData);
        
        // Send Layer 1 immediately
        yield `event: layer1\ndata: ${JSON.stringify({ primary_reading: reading.primary_reading, all_readings: reading.all_readings })}\n\n`;
        
        // Send Layer 2 (already computed — stream as a whole)
        if (reading.witness_question) {
          yield `event: layer2\ndata: ${JSON.stringify(reading.witness_question)}\n\n`;
        }
        
        // Send Layer 3 if available
        if (reading.meta_pattern) {
          yield `event: layer3\ndata: ${JSON.stringify(reading.meta_pattern)}\n\n`;
        }
        
        // Send full reading metadata
        yield `event: done\ndata: ${JSON.stringify({
          id: reading.id,
          date: reading.date,
          primary_engine: reading.primary_engine,
          max_layer_unlocked: reading.max_layer_unlocked,
          decoder_state: reading.decoder_state,
          total_latency_ms: reading.total_latency_ms,
          cache_stats: reading.cache_stats,
        })}\n\n`;
      } catch (err) {
        yield `event: error\ndata: ${JSON.stringify({ error: (err as Error).message, code: 'ENGINE_ERROR' })}\n\n`;
      }
    },
    
    /** Expose cache stats for health checks. */
    getCacheStats() { return mirror.getCacheStats(); },
    
    /**
     * GET /forecast?birth_date=YYYY-MM-DD&days=7 — Engine rotation forecast
     */
    async forecast(birthDate: string, days?: number): Promise<{ status: number; body: unknown }> {
      if (!birthDate) {
        return {
          status: 400,
          body: { error: 'birth_date query param required', code: 'MISSING_PARAM' } satisfies ApiError,
        };
      }
      
      const forecastDays = Math.min(days || 7, 30);
      const forecast = getForecast(birthDate, forecastDays);
      
      return {
        status: 200,
        body: {
          birth_date: birthDate,
          forecast,
          note: 'Each day\'s primary engine is seeded by your numerological signature.',
        },
      };
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// NODE HTTP SERVER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create a standalone Node.js HTTP server.
 * For production, deploy as Cloudflare Worker or Railway service.
 */
export async function createStandaloneServer(config: StandaloneApiConfig): Promise<{
  close: () => void;
  port: number;
}> {
  const { createServer: createHttpServer } = await import('node:http');
  const handlers = createStandaloneHandlers(config);
  const port = config.port || 3333;
  const corsOrigin = config.cors_origin || '*';
  
  const server = createHttpServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    try {
      const url = new URL(req.url || '/', `http://localhost:${port}`);
      const path = url.pathname;
      
      if (path === '/' && req.method === 'GET') {
        const result = await handlers.info();
        res.writeHead(result.status);
        res.end(JSON.stringify(result.body, null, 2));
        
      } else if (path === '/reading' && req.method === 'POST') {
        const body = await readBody(req);
        const result = await handlers.reading(body);
        res.writeHead(result.status);
        res.end(JSON.stringify(result.body));
        
      } else if (path === '/reading/stream' && req.method === 'POST') {
        const body = await readBody(req);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.writeHead(200);
        for await (const event of handlers.readingStream(body)) {
          res.write(event);
        }
        res.end();
        
      } else if (path.startsWith('/reading/') && req.method === 'POST') {
        const engineId = path.split('/')[2];
        const body = await readBody(req);
        const result = await handlers.engineReading(engineId, body);
        res.writeHead(result.status);
        res.end(JSON.stringify(result.body));
        
      } else if (path === '/forecast' && req.method === 'GET') {
        const birthDate = url.searchParams.get('birth_date') || '';
        const days = parseInt(url.searchParams.get('days') || '7');
        const result = await handlers.forecast(birthDate, days);
        res.writeHead(result.status);
        res.end(JSON.stringify(result.body, null, 2));
        
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({
          error: 'Not found',
          endpoints: ['GET /', 'POST /reading', 'POST /reading/stream', 'POST /reading/:engine_id', 'GET /forecast'],
        }));
      }
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
  });
  
  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ close: () => server.close(), port });
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────

function readBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve(null); }
    });
    req.on('error', reject);
  });
}

function getNextMidnight(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
