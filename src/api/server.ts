// ─── Witness Agents — Mobile App Interpretation API ───────────────────
// Issue #5: PRANAMAYA-003
// Framework-agnostic REST handlers: POST /interpret, GET /heartbeat,
// POST /mirror, /rhythm (WebSocket event definitions).
// Tier-enforced, mobile-optimized condensed format.

import type {
  PipelineQuery,
  WitnessInterpretation,
  UserState,
  Tier,
  HttpMentalState,
  Kosha,
} from '../types/interpretation.js';
import type { SelemeneEngineId, BirthData } from '../types/engine.js';

// ═══════════════════════════════════════════════════════════════════════
// API TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface InterpretRequest {
  query: string;
  user_id: string;
  session_id: string;
  engine_hints?: string[];
  workflow_hint?: string;
  birth_data?: {
    date: string;      // ISO date
    time?: string;     // HH:MM
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
}

export interface MobileInterpretation {
  id: string;
  // Condensed for mobile
  headline: string;              // ≤80 chars, the ONE thing
  body: string;                  // ≤500 chars for mobile
  agent_voice: 'aletheios' | 'pichet' | 'dyad';
  // Metadata
  engines_used: string[];
  tier: Tier;
  kosha_depth: Kosha;
  cadence: 'immediate' | 'measured' | 'slow';
  // Safety
  overwhelm_flag: boolean;
  graduation_prompt?: string;
  // Somatic nudge (Pichet)
  somatic_nudge?: string;        // ≤140 chars body-awareness micro-prompt
}

export interface HeartbeatResponse {
  aletheios: AgentHeartbeat;
  pichet: AgentHeartbeat;
  dyad_active: boolean;
  system_time: string;
  user_tier: Tier;
  consciousness_level: number;
}

export interface AgentHeartbeat {
  status: 'active' | 'dormant' | 'overwhelm-pause';
  last_active: string;
  queries_today: number;
}

export interface MirrorRequest {
  intention: string;
  user_id: string;
  session_id: string;
}

export interface MirrorResponse {
  original_intention: string;
  encoded_form: string;           // AKSHARA-dense encoding
  morphemes: { sanskrit: string; transliteration: string; meaning: string }[];
  quine_check: boolean;           // Does the encoding describe what it does?
  reflection_prompt: string;      // Mirror question back to user
  self_authorship_score: number;
}

export interface RhythmEvent {
  type: 'timing-nudge' | 'breath-cue' | 'organ-shift' | 'transit-alert' | 'biorhythm-peak';
  message: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: string;
  engine_source: string;
}

// ═══════════════════════════════════════════════════════════════════════
// MOBILE RESPONSE CONDENSER
// ═══════════════════════════════════════════════════════════════════════

export class MobileCondenser {
  /**
   * Condense a full WitnessInterpretation into mobile-optimized format
   */
  condense(interp: WitnessInterpretation): MobileInterpretation {
    const headline = this.extractHeadline(interp);
    const body = this.extractBody(interp);
    const somaticNudge = this.extractSomaticNudge(interp);

    const agentVoice: MobileInterpretation['agent_voice'] =
      interp.synthesis ? 'dyad'
        : interp.aletheios ? 'aletheios'
        : interp.pichet ? 'pichet'
        : 'aletheios';

    return {
      id: interp.id,
      headline,
      body,
      agent_voice: agentVoice,
      engines_used: interp.engines_invoked,
      tier: interp.tier,
      kosha_depth: interp.kosha_depth,
      cadence: interp.response_cadence,
      overwhelm_flag: interp.overwhelm_flag,
      graduation_prompt: interp.graduation_prompt,
      somatic_nudge: somaticNudge,
    };
  }

  /**
   * Generate rhythm events from engine outputs (for WebSocket push)
   */
  generateRhythmEvents(
    engineOutputs: { engine_id: string; result: Record<string, unknown> }[],
  ): RhythmEvent[] {
    const events: RhythmEvent[] = [];
    const now = new Date().toISOString();

    for (const output of engineOutputs) {
      switch (output.engine_id) {
        case 'vedic-clock': {
          const organ = output.result?.current_organ as Record<string, unknown> | undefined;
          if (organ) {
            events.push({
              type: 'organ-shift',
              message: `${organ.organ} (${organ.element}) is active. ${(organ.recommended_activities as string[])?.[0] || ''}`.trim(),
              urgency: 'low',
              timestamp: now,
              engine_source: 'circadian-cartography',
            });
          }
          break;
        }
        case 'biorhythm': {
          const physical = output.result?.physical as Record<string, unknown> | undefined;
          const pct = physical?.percentage as number | undefined;
          if (pct !== undefined && pct > 85) {
            events.push({
              type: 'biorhythm-peak',
              message: `Physical peak at ${Math.round(pct)}% — action window open.`,
              urgency: 'medium',
              timestamp: now,
              engine_source: 'three-wave-cycle',
            });
          }
          break;
        }
        case 'transits': {
          const active = output.result?.active_transits as unknown[];
          if (active && active.length > 0) {
            events.push({
              type: 'transit-alert',
              message: `${active.length} active transit(s) shaping your field today.`,
              urgency: 'low',
              timestamp: now,
              engine_source: 'active-planetary-weather',
            });
          }
          break;
        }
      }
    }

    return events;
  }

  // ─── Private extraction ───────────────────────────────────────────

  private extractHeadline(interp: WitnessInterpretation): string {
    // Priority: graduation prompt > overwhelm > first meaningful sentence
    if (interp.graduation_prompt) {
      return truncate(interp.graduation_prompt, 80);
    }
    if (interp.overwhelm_flag) {
      return 'Slow down. Your system is saturated. One thing at a time.';
    }
    // Extract first sentence from response
    const firstSentence = interp.response.split(/[.!?]\s/)[0] + '.';
    return truncate(firstSentence, 80);
  }

  private extractBody(interp: WitnessInterpretation): string {
    if (interp.tier === 'free') {
      return truncate(interp.response, 300);
    }
    return truncate(interp.response, 500);
  }

  private extractSomaticNudge(interp: WitnessInterpretation): string | undefined {
    if (interp.pichet?.somatic_note) {
      return truncate(interp.pichet.somatic_note, 140);
    }
    if (interp.overwhelm_flag) {
      return 'Three slow breaths. Feet on the floor. You are here.';
    }
    return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// API HANDLER FACTORY
// ═══════════════════════════════════════════════════════════════════════

export interface ApiDependencies {
  processPipeline: (query: PipelineQuery) => Promise<WitnessInterpretation>;
  getUserState: (userId: string) => Promise<UserState>;
  getTierForUser: (userId: string) => Promise<Tier>;
  processAkshara?: (req: MirrorRequest) => Promise<MirrorResponse>;
}

/**
 * Creates framework-agnostic route handlers.
 * Mount these in Express, Elysia, Hono, or any HTTP framework.
 */
export function createApiHandlers(deps: ApiDependencies) {
  const condenser = new MobileCondenser();
  const heartbeatState: Record<string, { queries: number; lastActive: string }> = {};

  return {
    /**
     * POST /interpret
     * Main interpretation endpoint — sends query through the full pipeline
     */
    async interpret(req: InterpretRequest): Promise<{ status: number; body: MobileInterpretation }> {
      const userState = await deps.getUserState(req.user_id);

      const birthData: BirthData = req.birth_data
        ? {
            date: req.birth_data.date,
            time: req.birth_data.time,
            latitude: req.birth_data.latitude ?? 0,
            longitude: req.birth_data.longitude ?? 0,
            timezone: req.birth_data.timezone ?? 'UTC',
          }
        : { date: '1990-01-01', latitude: 0, longitude: 0, timezone: 'UTC' };

      const pipelineQuery: PipelineQuery = {
        query: req.query,
        user_state: userState,
        birth_data: birthData,
        engine_hints: req.engine_hints as SelemeneEngineId[] | undefined,
        workflow_hint: req.workflow_hint,
        session_id: req.session_id,
        request_id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };

      const interp = await deps.processPipeline(pipelineQuery);
      const mobile = condenser.condense(interp);

      // Track heartbeat
      heartbeatState[req.user_id] = {
        queries: (heartbeatState[req.user_id]?.queries || 0) + 1,
        lastActive: new Date().toISOString(),
      };

      return { status: 200, body: mobile };
    },

    /**
     * GET /heartbeat
     * Agent activation status for UI state management
     */
    async heartbeat(userId: string): Promise<{ status: number; body: HeartbeatResponse }> {
      const tier = await deps.getTierForUser(userId);
      const state = heartbeatState[userId];
      const now = new Date().toISOString();

      const agentStatus = (active: boolean): AgentHeartbeat => ({
        status: active ? 'active' : 'dormant',
        last_active: state?.lastActive || now,
        queries_today: state?.queries || 0,
      });

      const dyadActive = tier === 'enterprise' || tier === 'initiate';

      return {
        status: 200,
        body: {
          aletheios: agentStatus(tier !== 'free'),
          pichet: agentStatus(tier !== 'free'),
          dyad_active: dyadActive,
          system_time: now,
          user_tier: tier,
          consciousness_level: tier === 'free' ? 0 : tier === 'subscriber' ? 2 : tier === 'enterprise' ? 3 : 5,
        },
      };
    },

    /**
     * POST /mirror
     * AKSHARA mirror mode (Initiate tier only)
     */
    async mirror(req: MirrorRequest): Promise<{ status: number; body: MirrorResponse | { error: string } }> {
      const tier = await deps.getTierForUser(req.user_id);
      if (tier !== 'initiate') {
        return {
          status: 403,
          body: { error: 'Mirror mode requires Initiate tier. Current: ' + tier },
        };
      }

      if (!deps.processAkshara) {
        return { status: 501, body: { error: 'AKSHARA mirror mode not yet configured' } };
      }

      const result = await deps.processAkshara(req);
      return { status: 200, body: result };
    },

    /**
     * Rhythm event generator (for WebSocket /rhythm)
     * Returns events to push to the client
     */
    generateRhythmEvents: condenser.generateRhythmEvents.bind(condenser),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// SIMPLE NODE HTTP SERVER (optional, for standalone use)
// ═══════════════════════════════════════════════════════════════════════

export interface ServerConfig {
  port: number;
  handlers: ReturnType<typeof createApiHandlers>;
}

/**
 * Create a minimal Node.js HTTP server (no framework required).
 * For production, mount the handlers in your existing Elysia/Express server.
 */
export async function createServer(config: ServerConfig): Promise<{
  close: () => void;
  port: number;
}> {
  const { createServer: createHttpServer } = await import('node:http');

  const server = createHttpServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url || '/', `http://localhost:${config.port}`);
      const path = url.pathname;

      if (path === '/interpret' && req.method === 'POST') {
        const body = await readBody(req);
        const result = await config.handlers.interpret(body as InterpretRequest);
        res.writeHead(result.status);
        res.end(JSON.stringify(result.body));
      } else if (path === '/heartbeat' && req.method === 'GET') {
        const userId = url.searchParams.get('user_id') || 'anonymous';
        const result = await config.handlers.heartbeat(userId);
        res.writeHead(result.status);
        res.end(JSON.stringify(result.body));
      } else if (path === '/mirror' && req.method === 'POST') {
        const body = await readBody(req);
        const result = await config.handlers.mirror(body as MirrorRequest);
        res.writeHead(result.status);
        res.end(JSON.stringify(result.body));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found', endpoints: ['/interpret', '/heartbeat', '/mirror'] }));
      }
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
  });

  return new Promise((resolve) => {
    server.listen(config.port, () => {
      resolve({ close: () => server.close(), port: config.port });
    });
  });
}

function readBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + '...';
}
