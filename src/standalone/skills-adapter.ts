// ─── Daily Witness — skills.sh Adapter ────────────────────────────────
// Stateless API adapter for skills.sh integration.
// Any LLM agent can invoke The Daily Witness through the skills.sh protocol.
//
// Unlike SoulTrace's quiz-based skill (accumulate answers → result),
// ours is birth-data-driven: one call → daily reading. Living relationship.
//
// skills.sh spec:
//   POST /api/agent — stateless, JSON body, JSON response
//   No auth required, rate-limited
//   Returns structured data the LLM can interpret
//
// Our differentiator:
// - SoulTrace: 24 questions → one-time color label (dead data)
// - Daily Witness: birth date → daily mirror (living reading, changes every day)

import type { SkillsShRequest, SkillsShResponse, StandaloneEngineId } from './types.js';
import { STANDALONE_ENGINES } from './types.js';
import type { BirthData } from '../types/engine.js';
import { DailyMirror } from './daily-mirror.js';
import type { DailyMirrorConfig } from './daily-mirror.js';

// ═══════════════════════════════════════════════════════════════════════
// SKILLS.SH MANIFEST
// ═══════════════════════════════════════════════════════════════════════

/**
 * The skills.sh manifest that describes this skill to any LLM agent.
 * This is what gets registered at skills.sh/tryambakam/daily-witness
 */
export const SKILLS_SH_MANIFEST = {
  name: 'daily-witness',
  display_name: 'The Daily Witness',
  description: 'Birth-data-driven daily consciousness mirror. Four somatic engines (biorhythm, vedic-clock, panchanga, numerology) generate a living daily reading from your birth coordinates. No quiz, no questions — just your birth data. Returns change daily.',
  version: '0.1.0',
  author: 'tryambakam',
  
  // What makes it different from every other personality/astrology skill
  differentiators: [
    'Zero friction: birth date only, no quiz required',
    'Living data: reading changes every day (biorhythm, vedic-clock hourly)',
    'Four engines running simultaneously (vs single-dimension tools)',
    'Decoder ring: depth increases with consistent return visits',
    'Body-first: somatic engines, not analytical frameworks',
  ],
  
  input_schema: {
    type: 'object',
    required: ['birth_date'],
    properties: {
      birth_date: {
        type: 'string',
        format: 'date',
        description: 'Birth date in YYYY-MM-DD format',
      },
      birth_time: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}$',
        description: 'Birth time in HH:MM format (recommended for accuracy)',
      },
      latitude: {
        type: 'number',
        description: 'Birth location latitude (default: 0)',
      },
      longitude: {
        type: 'number',
        description: 'Birth location longitude (default: 0)',
      },
      timezone: {
        type: 'string',
        description: 'IANA timezone (default: UTC)',
      },
      engine: {
        type: 'string',
        enum: [...STANDALONE_ENGINES],
        description: 'Specific engine to query (omit for daily primary)',
      },
    },
  },
  
  output_schema: {
    type: 'object',
    properties: {
      reading: {
        type: 'object',
        description: 'The daily reading with engine data, witness question, and meta-pattern',
      },
      next_reading_available: {
        type: 'string',
        format: 'date-time',
        description: 'When the next reading will be available',
      },
      engines_available: {
        type: 'array',
        items: { type: 'string' },
        description: 'Available engine IDs',
      },
      full_platform_url: {
        type: 'string',
        description: 'URL for the full 16-engine platform',
      },
    },
  },
  
  // Prompt guidance for LLM agents using this skill
  agent_instructions: `
When presenting Daily Witness readings to users:

1. ALWAYS start with the primary engine's headline — don't summarize, quote it directly
2. If Layer 2 (witness question) is present, ask the question VERBATIM — it's calibrated
3. If Layer 3 (meta-pattern) shows cross-references, describe the pattern between engines
4. NEVER explain biorhythm theory or numerology theory — the data speaks for itself
5. If the Finder's Whisper appears, deliver it quietly at the end
6. If the Graduation Note appears, deliver it with reverence

The reading is designed to create recognition, not understanding.
Let the precision land before adding commentary.

For repeat users: reference their decoder_state.consecutive_days
("This is your 7th consecutive day witnessing" creates different context than "first time")
`,
} as const;

// ═══════════════════════════════════════════════════════════════════════
// SKILLS.SH HANDLER
// ═══════════════════════════════════════════════════════════════════════

/**
 * Process a skills.sh agent request.
 * Stateless: each call is independent.
 */
export async function handleSkillsShRequest(
  request: SkillsShRequest,
  config: DailyMirrorConfig,
): Promise<SkillsShResponse> {
  const mirror = new DailyMirror(config);
  
  const birthData: BirthData = {
    date: request.birth_date,
    time: request.birth_time,
    latitude: request.latitude ?? 0,
    longitude: request.longitude ?? 0,
    timezone: request.timezone ?? 'UTC',
  };
  
  const reading = request.engine
    ? await mirror.generateEngineReading(birthData, request.engine)
    : await mirror.generateReading(birthData);
  
  // Compute next reading time
  const nextMidnight = new Date();
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  
  return {
    reading,
    next_reading_available: nextMidnight.toISOString(),
    engines_available: [...STANDALONE_ENGINES],
    full_platform_url: 'https://tryambakam.space',
    version: '0.1.0',
  };
}

/**
 * Create an HTTP handler for skills.sh integration.
 * Mounts at POST /api/agent (skills.sh convention).
 */
export function createSkillsShHandler(config: DailyMirrorConfig) {
  return {
    /**
     * POST /api/agent — skills.sh standard endpoint
     */
    async agent(body: unknown): Promise<{ status: number; body: unknown }> {
      if (!body || typeof body !== 'object') {
        return {
          status: 400,
          body: {
            error: 'Request body required',
            schema: SKILLS_SH_MANIFEST.input_schema,
          },
        };
      }
      
      const req = body as Record<string, unknown>;
      
      if (!req.birth_date || typeof req.birth_date !== 'string') {
        return {
          status: 400,
          body: {
            error: 'birth_date is required (YYYY-MM-DD)',
            schema: SKILLS_SH_MANIFEST.input_schema,
          },
        };
      }
      
      // Validate engine if specified
      if (req.engine && !STANDALONE_ENGINES.includes(req.engine as StandaloneEngineId)) {
        return {
          status: 400,
          body: {
            error: `Invalid engine: ${req.engine}`,
            available: [...STANDALONE_ENGINES],
          },
        };
      }
      
      try {
        const response = await handleSkillsShRequest(
          req as unknown as SkillsShRequest,
          config,
        );
        return { status: 200, body: response };
      } catch (err) {
        return {
          status: 500,
          body: { error: (err as Error).message },
        };
      }
    },
    
    /**
     * GET /api/agent/manifest — Return skill manifest
     */
    manifest(): { status: number; body: unknown } {
      return { status: 200, body: SKILLS_SH_MANIFEST };
    },
  };
}
