// ─── Witness Agents — User State Tracker ─────────────────────────────
// Issue #18: MANOMAYA-005
// Assesses HTTP mental state, overwhelm, active kosha, dominant center
// from query analysis and session patterns

import type {
  UserState,
  HttpMentalState,
  DominantCenter,
  Kosha,
  Tier,
} from '../types/interpretation.js';

// ═══════════════════════════════════════════════════════════════════════
// QUERY ANALYSIS — keyword/tone → HTTP consciousness status
// ═══════════════════════════════════════════════════════════════════════

const HTTP_SIGNALS: Record<HttpMentalState, {
  keywords: string[];
  patterns: RegExp[];
  description: string;
}> = {
  200: {
    keywords: ['curious', 'wondering', 'exploring', 'interested', 'what if', 'how does', 'tell me about'],
    patterns: [/^what\b/i, /^how\b/i, /^show\b/i, /i'm curious/i, /let's explore/i],
    description: 'Flow state — open, receptive, processing well',
  },
  301: {
    keywords: ['but', 'however', 'yes but', 'that\'s not what i meant', 'you don\'t understand', 'the real issue'],
    patterns: [/but\s+(what|how|why)/i, /that's not/i, /you (don't|dont) understand/i, /actually/i, /the real/i],
    description: 'Redirecting/defending — query deflects from the actual concern',
  },
  404: {
    keywords: ['nothing', 'numb', 'empty', 'don\'t know', 'don\'t care', 'whatever', 'fine', 'idk'],
    patterns: [/i (don't|dont) (know|care|feel)/i, /whatever/i, /^fine$/i, /doesn't matter/i, /^idk$/i, /^nothing$/i],
    description: 'Dissociated — user is disconnected from feeling',
  },
  500: {
    keywords: ['anxiety', 'anxious', 'panic', 'overwhelmed', 'too much', 'can\'t', 'scared', 'afraid', 'spiraling'],
    patterns: [/can't (stop|handle|deal|breathe)/i, /too much/i, /spiraling/i, /everything is/i, /i'm (scared|afraid|panicking)/i],
    description: 'Anxiety — system overload, cortisol-driven',
  },
  503: {
    keywords: ['exhausted', 'burned out', 'done', 'tired', 'depleted', 'can\'t anymore', 'give up'],
    patterns: [/burned?\s*out/i, /can't anymore/i, /i'm (done|finished|exhausted)/i, /no energy/i, /give up/i],
    description: 'Burnout — service unavailable, needs restoration not interpretation',
  },
};

// Center detection keywords
const CENTER_SIGNALS: Record<DominantCenter, {
  keywords: string[];
  patterns: RegExp[];
}> = {
  heart: {
    keywords: ['feel', 'love', 'relationship', 'hurt', 'sad', 'happy', 'emotion', 'heart', 'connection', 'shame', 'pride'],
    patterns: [/i feel/i, /my heart/i, /relationship/i, /emotionally/i],
  },
  head: {
    keywords: ['think', 'understand', 'analyze', 'figure out', 'plan', 'strategy', 'logic', 'reason', 'fear', 'security'],
    patterns: [/i think/i, /figure out/i, /makes? sense/i, /logically/i, /understand/i],
  },
  gut: {
    keywords: ['do', 'act', 'move', 'anger', 'rage', 'frustrated', 'action', 'power', 'control', 'boundary', 'instinct'],
    patterns: [/i need to/i, /take action/i, /my gut/i, /frustrated/i, /angry/i],
  },
};

// Kosha detection: what layer of experience is the query addressing?
const KOSHA_SIGNALS: Record<Kosha, {
  keywords: string[];
  patterns: RegExp[];
}> = {
  annamaya: {
    keywords: ['body', 'physical', 'pain', 'food', 'sleep', 'exercise', 'weight', 'muscle', 'bone'],
    patterns: [/my body/i, /physical/i, /i (hurt|ache)/i, /health/i],
  },
  pranamaya: {
    keywords: ['energy', 'breath', 'vitality', 'tired', 'alive', 'buzz', 'flow', 'rhythm', 'pulse'],
    patterns: [/my energy/i, /breathing/i, /feel alive/i, /vitality/i],
  },
  manomaya: {
    keywords: ['think', 'mind', 'thought', 'idea', 'pattern', 'analyze', 'worry', 'decision', 'choice'],
    patterns: [/my mind/i, /i think/i, /thought pattern/i, /decide/i],
  },
  vijnanamaya: {
    keywords: ['meaning', 'purpose', 'why', 'wisdom', 'insight', 'understand deeply', 'pattern behind', 'truth'],
    patterns: [/what does it mean/i, /deeper pattern/i, /why (am i|does|is)/i, /the truth/i],
  },
  anandamaya: {
    keywords: ['bliss', 'unity', 'oneness', 'transcend', 'dissolve', 'who am i', 'witness', 'awareness itself'],
    patterns: [/who am i/i, /pure awareness/i, /beyond the/i, /witness/i, /observer/i],
  },
};

// ═══════════════════════════════════════════════════════════════════════
// SESSION TRACKER — accumulates state across queries
// ═══════════════════════════════════════════════════════════════════════

interface SessionAccumulator {
  queries: Array<{
    text: string;
    timestamp: number;
    http_status: HttpMentalState;
  }>;
  topics: Set<string>;
  engines_used: Set<string>;
  patterns_emerging: string[];
  start_time: number;
  recursion_count: number;
}

export class UserStateTracker {
  private sessions = new Map<string, SessionAccumulator>();

  /**
   * Assess user state from a query string and session context.
   * This is the primary entry point — call before each interpretation.
   */
  assess(
    query: string,
    sessionId: string,
    tier: Tier,
    birthDate?: string,
  ): UserState {
    const session = this.getOrCreateSession(sessionId);

    // HTTP consciousness assessment
    const http_status = this.assessHttpStatus(query);

    // Track this query
    session.queries.push({ text: query, timestamp: Date.now(), http_status });

    // Overwhelm estimation
    const overwhelm_level = this.estimateOverwhelm(session, http_status);

    // Active kosha detection
    const active_kosha = this.detectActiveKosha(query, overwhelm_level);

    // Dominant center
    const dominant_center = this.detectDominantCenter(query);

    // Recursion detection
    const recursion_detected = this.detectRecursion(session, query);

    // Anti-dependency score
    const anti_dependency_score = this.calculateAntiDependency(session);

    // Biorhythm (if birth date available)
    const biorhythm = birthDate ? this.calculateBiorhythm(birthDate) : undefined;

    return {
      tier,
      http_status,
      overwhelm_level,
      active_kosha,
      dominant_center,
      recursion_detected,
      anti_dependency_score,
      biorhythm,
      session_query_count: session.queries.length,
    };
  }

  /**
   * Get session accumulator for context-aware routing
   */
  getSessionContext(sessionId: string): {
    topics: string[];
    engines_used: string[];
    patterns_emerging: string[];
    query_count: number;
    session_duration_min: number;
    query_cadence_per_min: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        topics: [], engines_used: [], patterns_emerging: [],
        query_count: 0, session_duration_min: 0, query_cadence_per_min: 0,
      };
    }

    const durationMs = Date.now() - session.start_time;
    const durationMin = durationMs / 60000;

    return {
      topics: Array.from(session.topics),
      engines_used: Array.from(session.engines_used),
      patterns_emerging: session.patterns_emerging,
      query_count: session.queries.length,
      session_duration_min: durationMin,
      query_cadence_per_min: durationMin > 0 ? session.queries.length / durationMin : 0,
    };
  }

  /**
   * Record which engines were used (called after interpretation)
   */
  recordEngineUsage(sessionId: string, engines: string[]): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      for (const e of engines) session.engines_used.add(e);
    }
  }

  /**
   * Add a pattern observation (called by dyad during interpretation)
   */
  addPattern(sessionId: string, pattern: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.patterns_emerging.push(pattern);
    }
  }

  // ─── PRIVATE: HTTP Consciousness Assessment ──────────────────────

  assessHttpStatus(query: string): HttpMentalState {
    const scores: Record<HttpMentalState, number> = { 200: 0, 301: 0, 404: 0, 500: 0, 503: 0 };
    const normalized = query.toLowerCase().trim();

    for (const [status, signals] of Object.entries(HTTP_SIGNALS)) {
      const code = Number(status) as HttpMentalState;

      // Keyword matching
      for (const keyword of signals.keywords) {
        if (normalized.includes(keyword)) {
          scores[code] += 1;
        }
      }

      // Pattern matching (stronger signal)
      for (const pattern of signals.patterns) {
        if (pattern.test(normalized)) {
          scores[code] += 2;
        }
      }
    }

    // Default to 200 if no strong signals
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 200;

    // Return highest-scoring status
    const entries = Object.entries(scores) as [string, number][];
    const winner = entries.reduce((a, b) => b[1] > a[1] ? b : a);
    return Number(winner[0]) as HttpMentalState;
  }

  // ─── PRIVATE: Overwhelm Estimation ──────────────────────────────

  private estimateOverwhelm(session: SessionAccumulator, httpStatus: HttpMentalState): number {
    let level = 0;

    // HTTP status contributes
    if (httpStatus === 500) level += 0.4;
    else if (httpStatus === 503) level += 0.6;
    else if (httpStatus === 404) level += 0.2;

    // Query cadence (more than 5/min = overwhelm signal)
    const recentQueries = session.queries.filter(
      q => Date.now() - q.timestamp < 60000
    );
    if (recentQueries.length > 5) level += 0.3;
    else if (recentQueries.length > 3) level += 0.1;

    // Session duration (>60min = fatigue)
    const durationMin = (Date.now() - session.start_time) / 60000;
    if (durationMin > 60) level += 0.2;
    else if (durationMin > 30) level += 0.1;

    // Recursion amplifies overwhelm
    if (session.recursion_count > 2) level += 0.2;

    // Consecutive negative states amplify
    const lastThree = session.queries.slice(-3);
    const negativeCount = lastThree.filter(
      q => q.http_status === 500 || q.http_status === 503 || q.http_status === 404
    ).length;
    if (negativeCount >= 3) level += 0.2;

    return Math.min(1, level);
  }

  // ─── PRIVATE: Kosha Detection ───────────────────────────────────

  private detectActiveKosha(query: string, overwhelm: number): Kosha {
    // Overwhelm forces lower koshas
    if (overwhelm > 0.9) return 'annamaya';
    if (overwhelm > 0.7) return 'pranamaya';

    const scores: Record<Kosha, number> = {
      annamaya: 0, pranamaya: 0, manomaya: 0,
      vijnanamaya: 0, anandamaya: 0,
    };
    const normalized = query.toLowerCase();

    for (const [kosha, signals] of Object.entries(KOSHA_SIGNALS)) {
      for (const keyword of signals.keywords) {
        if (normalized.includes(keyword)) scores[kosha as Kosha]++;
      }
      for (const pattern of signals.patterns) {
        if (pattern.test(normalized)) scores[kosha as Kosha] += 2;
      }
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'manomaya'; // Default: mental layer

    const entries = Object.entries(scores) as [string, number][];
    return entries.reduce((a, b) => b[1] > a[1] ? b : a)[0] as Kosha;
  }

  // ─── PRIVATE: Center Detection ──────────────────────────────────

  private detectDominantCenter(query: string): DominantCenter {
    const scores: Record<DominantCenter, number> = { heart: 0, head: 0, gut: 0 };
    const normalized = query.toLowerCase();

    for (const [center, signals] of Object.entries(CENTER_SIGNALS)) {
      for (const keyword of signals.keywords) {
        if (normalized.includes(keyword)) scores[center as DominantCenter]++;
      }
      for (const pattern of signals.patterns) {
        if (pattern.test(normalized)) scores[center as DominantCenter] += 2;
      }
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'head'; // Default for analytical queries

    const entries = Object.entries(scores) as [string, number][];
    return entries.reduce((a, b) => b[1] > a[1] ? b : a)[0] as DominantCenter;
  }

  // ─── PRIVATE: Recursion Detection ───────────────────────────────

  private detectRecursion(session: SessionAccumulator, query: string): boolean {
    const normalized = query.toLowerCase().trim();
    const window = session.queries.slice(-10);

    let similar = 0;
    for (const past of window) {
      if (this.similarity(normalized, past.text.toLowerCase().trim()) > 0.65) {
        similar++;
      }
    }

    const detected = similar >= 2;
    if (detected) session.recursion_count++;
    return detected;
  }

  // ─── PRIVATE: Anti-Dependency Score ─────────────────────────────

  private calculateAntiDependency(session: SessionAccumulator): number {
    if (session.queries.length < 3) return 0.5; // Not enough data

    const queries = session.queries.map(q => q.text.toLowerCase());
    let selfAuthoringSignals = 0;
    let dependencySignals = 0;

    for (const q of queries) {
      // Self-authoring: user shows they've integrated prior answers
      if (/i (notice|see|realize|understand|think that)/i.test(q)) selfAuthoringSignals++;
      if (/based on what (you|the engines?) said/i.test(q)) selfAuthoringSignals++;
      if (/i've been (thinking|reflecting|considering)/i.test(q)) selfAuthoringSignals++;

      // Dependency: user asks same-type questions without integration
      if (/^(what should i|tell me|give me)/i.test(q)) dependencySignals++;
      if (/what does (it|this|that) mean/i.test(q)) dependencySignals++;
    }

    const total = selfAuthoringSignals + dependencySignals;
    if (total === 0) return 0.5;

    return Math.min(1, selfAuthoringSignals / total);
  }

  // ─── PRIVATE: Biorhythm Calculator ──────────────────────────────

  calculateBiorhythm(birthDate: string): { physical: number; emotional: number; intellectual: number } {
    const birth = new Date(birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);

    return {
      physical: Math.round(((Math.sin(2 * Math.PI * days / 23) + 1) / 2) * 100),
      emotional: Math.round(((Math.sin(2 * Math.PI * days / 28) + 1) / 2) * 100),
      intellectual: Math.round(((Math.sin(2 * Math.PI * days / 33) + 1) / 2) * 100),
    };
  }

  // ─── PRIVATE: Circadian Position ────────────────────────────────

  /**
   * Maps current hour to Traditional Chinese Medicine organ clock
   */
  static getCircadianPosition(hour: number): string {
    const positions: [number, number, string][] = [
      [1, 3, 'liver_time'],
      [3, 5, 'lung_time'],
      [5, 7, 'large_intestine_time'],
      [7, 9, 'stomach_time'],
      [9, 11, 'spleen_time'],
      [11, 13, 'heart_time'],
      [13, 15, 'small_intestine_time'],
      [15, 17, 'bladder_time'],
      [17, 19, 'kidney_time'],
      [19, 21, 'pericardium_time'],
      [21, 23, 'triple_heater_time'],
      [23, 1, 'gallbladder_time'],
    ];

    for (const [start, end, name] of positions) {
      if (start < end) {
        if (hour >= start && hour < end) return name;
      } else {
        if (hour >= start || hour < end) return name;
      }
    }
    return 'unknown';
  }

  // ─── PRIVATE: Helpers ───────────────────────────────────────────

  private getOrCreateSession(sessionId: string): SessionAccumulator {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        queries: [],
        topics: new Set(),
        engines_used: new Set(),
        patterns_emerging: [],
        start_time: Date.now(),
        recursion_count: 0,
      });
    }
    return this.sessions.get(sessionId)!;
  }

  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    const dist = this.levenshtein(a, b);
    return 1 - dist / maxLen;
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    // Use two-row optimization for memory efficiency
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let curr = new Array(n + 1);

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        curr[j] = a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  }
}
