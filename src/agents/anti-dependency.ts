// ─── Witness Agents — Anti-Dependency Metrics ─────────────────────────
// Issue #12: ANANDAMAYA-002
// "My success is measured by the user's decreasing need for me."
// Quantifiable metrics, cross-session tracking, graduation protocol.

import type { UserState } from '../types/interpretation.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface AntiDependencyMetrics {
  self_reflection_depth: number;      // Can they ask their own deep questions?
  pattern_recognition: number;        // Do they see what Aletheios pointed out?
  somatic_awareness: number;          // Do they feel what Pichet signaled?
  question_sophistication: number;    // Are queries evolving or repeating?
  consultation_frequency: number;     // Consulting less over time? (inverse metric)
  self_authorship_score: number;      // Weighted composite
  trend: 'growing' | 'stable' | 'declining' | 'new';
  sessions_tracked: number;
}

export interface GraduationAssessment {
  ready: boolean;
  score: number;
  areas_of_strength: string[];
  areas_for_growth: string[];
  recommendation: 'continue' | 'reduce-frequency' | 'mirror-mode' | 'graduate';
  message: string;
}

export interface SessionSnapshot {
  session_id: string;
  timestamp: string;
  query_count: number;
  queries: string[];
  self_referential_count: number;
  other_referential_count: number;
  recursion_events: number;
  overwhelm_events: number;
  engines_requested: string[];
  unique_topics: number;
}

// ═══════════════════════════════════════════════════════════════════════
// GRADUATION THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════

export const GRADUATION_THRESHOLDS = {
  FOUNDATION: 0.3,
  DEVELOPING: 0.5,
  MATURING: 0.7,
  MIRROR_READY: 0.85,
  GRADUATION: 0.95,
} as const;

// ═══════════════════════════════════════════════════════════════════════
// QUERY ANALYSIS PATTERNS
// ═══════════════════════════════════════════════════════════════════════

/** Self-referential: user looking inward */
const SELF_REFERENTIAL = [
  /i (notice|observe|see|feel|sense|recognize|realize)/i,
  /my (pattern|tendency|habit|feeling|body|sense)/i,
  /i('m| am) (becoming|learning|growing|noticing|starting to)/i,
  /i think (what|this) (means|suggests|indicates)/i,
  /i already know/i,
  /this reminds me of/i,
];

/** Other-referential: asking the system to do the work */
const OTHER_REFERENTIAL = [
  /^(tell me|what does|what should|what is|explain|show me)/i,
  /^(should i|do i|am i|will i)/i,
  /what do you (think|see|suggest|recommend)/i,
  /^(help me|i need you to|can you)/i,
  /^(just|please) (tell|give|show)/i,
];

/** Sophisticated query patterns: deeper engagement */
const SOPHISTICATED_PATTERNS = [
  /how (does|do) .+ (relate|connect|interact) (with|to)/i,
  /what('s| is) the (relationship|connection|tension) between/i,
  /i('ve| have) been (thinking|reflecting|noticing) about/i,
  /is there a pattern (between|connecting|in)/i,
  /how might (i|this|these)/i,
  /what would happen if/i,
  /i disagree.+because/i,
];

// ═══════════════════════════════════════════════════════════════════════
// TRACKER
// ═══════════════════════════════════════════════════════════════════════

export class AntiDependencyTracker {
  private snapshots: SessionSnapshot[] = [];
  private currentSession: SessionSnapshot | null = null;

  startSession(sessionId: string): void {
    this.currentSession = {
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      query_count: 0,
      queries: [],
      self_referential_count: 0,
      other_referential_count: 0,
      recursion_events: 0,
      overwhelm_events: 0,
      engines_requested: [],
      unique_topics: 0,
    };
  }

  recordQuery(query: string, userState: UserState, enginesUsed: string[]): void {
    if (!this.currentSession) return;

    this.currentSession.query_count++;
    this.currentSession.queries.push(query);
    this.currentSession.engines_requested.push(...enginesUsed);

    const selfCount = SELF_REFERENTIAL.filter(p => p.test(query)).length;
    const otherCount = OTHER_REFERENTIAL.filter(p => p.test(query)).length;
    this.currentSession.self_referential_count += selfCount;
    this.currentSession.other_referential_count += otherCount;

    if (userState.recursion_detected) this.currentSession.recursion_events++;
    if (userState.overwhelm_level > 0.7) this.currentSession.overwhelm_events++;

    const topics = new Set(
      this.currentSession.queries.map(q =>
        q.toLowerCase().replace(/^(what|how|why|when|should|tell|show|help)\b\s*/i, '').split(/\s+/)[0]
      )
    );
    this.currentSession.unique_topics = topics.size;
  }

  endSession(): SessionSnapshot | null {
    if (!this.currentSession) return null;
    const snapshot = { ...this.currentSession };
    this.snapshots.push(snapshot);
    this.currentSession = null;
    return snapshot;
  }

  computeMetrics(): AntiDependencyMetrics {
    const sessions = this.snapshots;
    if (sessions.length === 0) return this.emptyMetrics();

    const totalSelf = sessions.reduce((s, sn) => s + sn.self_referential_count, 0);
    const totalOther = sessions.reduce((s, sn) => s + sn.other_referential_count, 0);
    const totalQueries = sessions.reduce((s, sn) => s + sn.query_count, 0);

    // 1. Self-reflection: ratio of self-referential to total referential
    const selfReflectionDepth = totalQueries > 0
      ? Math.min(1, totalSelf / Math.max(1, totalSelf + totalOther))
      : 0;

    // 2. Pattern recognition: sophistication of recent queries
    const recentQueries = sessions.slice(-3).flatMap(s => s.queries);
    const sophCount = recentQueries.filter(q =>
      SOPHISTICATED_PATTERNS.some(p => p.test(q))
    ).length;
    const patternRecognition = Math.min(1, sophCount / Math.max(1, recentQueries.length * 0.5));

    // 3. Somatic awareness: body-related words in queries
    const somaticWords = ['body', 'feel', 'sense', 'breath', 'tension', 'energy', 'gut', 'heart'];
    const allText = sessions.flatMap(s => s.queries).join(' ').toLowerCase();
    const somaticCount = somaticWords.filter(w => allText.includes(w)).length;
    const somaticAwareness = Math.min(1, somaticCount / (somaticWords.length * 0.6));

    // 4. Question sophistication: absolute recent level
    const secondHalf = sessions.slice(Math.max(1, Math.floor(sessions.length / 2))).flatMap(s => s.queries);
    const secondSoph = secondHalf.filter(q => SOPHISTICATED_PATTERNS.some(p => p.test(q))).length / Math.max(1, secondHalf.length);
    const questionSophistication = Math.min(1, secondSoph * 1.5);

    // 5. Consultation frequency: are they consulting less?
    let consultationFrequency: number;
    if (sessions.length < 2) {
      consultationFrequency = 0.5;
    } else {
      const recentAvg = sessions.slice(-3).reduce((s, sn) => s + sn.query_count, 0) / Math.min(3, sessions.length);
      const overallAvg = totalQueries / sessions.length;
      consultationFrequency = overallAvg > 0
        ? Math.min(1, Math.max(0, 1 - (recentAvg / overallAvg - 0.5)))
        : 0.5;
    }

    // Composite
    const selfAuthorshipScore =
      selfReflectionDepth * 0.25 +
      patternRecognition * 0.25 +
      somaticAwareness * 0.15 +
      questionSophistication * 0.20 +
      consultationFrequency * 0.15;

    // Trend detection
    let trend: AntiDependencyMetrics['trend'] = 'new';
    if (sessions.length >= 3) {
      const recentScore = this.windowScore(sessions.slice(-3));
      const olderScore = sessions.length >= 6
        ? this.windowScore(sessions.slice(-6, -3))
        : selfAuthorshipScore * 0.7;
      const delta = recentScore - olderScore;
      trend = delta > 0.05 ? 'growing' : delta < -0.05 ? 'declining' : 'stable';
    }

    return {
      self_reflection_depth: round(selfReflectionDepth),
      pattern_recognition: round(patternRecognition),
      somatic_awareness: round(somaticAwareness),
      question_sophistication: round(questionSophistication),
      consultation_frequency: round(consultationFrequency),
      self_authorship_score: round(selfAuthorshipScore),
      trend,
      sessions_tracked: sessions.length,
    };
  }

  assessGraduation(): GraduationAssessment {
    const metrics = this.computeMetrics();
    const score = metrics.self_authorship_score;
    const strengths: string[] = [];
    const growth: string[] = [];

    if (metrics.self_reflection_depth > 0.6) strengths.push('self-reflection');
    else growth.push('self-reflection depth');

    if (metrics.pattern_recognition > 0.6) strengths.push('pattern recognition');
    else growth.push('independent pattern recognition');

    if (metrics.somatic_awareness > 0.5) strengths.push('somatic awareness');
    else growth.push('body awareness');

    if (metrics.question_sophistication > 0.6) strengths.push('question sophistication');
    else growth.push('question depth');

    if (metrics.consultation_frequency > 0.6) strengths.push('self-reliance');
    else growth.push('reducing consultation frequency');

    let recommendation: GraduationAssessment['recommendation'];
    let message: string;

    if (score >= GRADUATION_THRESHOLDS.GRADUATION) {
      recommendation = 'graduate';
      message = 'You see clearly on your own. The mirror has served its purpose. The system celebrates your growth and remains an occasional companion, not a guide.';
    } else if (score >= GRADUATION_THRESHOLDS.MIRROR_READY) {
      recommendation = 'mirror-mode';
      message = 'You are ready for mirror mode — the AKSHARA practice where you author your own meaning.';
    } else if (score >= GRADUATION_THRESHOLDS.MATURING) {
      recommendation = 'reduce-frequency';
      message = `Self-authorship maturing (${(score * 100).toFixed(0)}%). Consider consulting less. Trust what you know. Growth edges: ${growth.join(', ')}.`;
    } else {
      recommendation = 'continue';
      message = `Building self-authorship (${(score * 100).toFixed(0)}%). Strengths: ${strengths.join(', ') || 'developing'}. Growth edges: ${growth.join(', ')}.`;
    }

    return { ready: score >= GRADUATION_THRESHOLDS.GRADUATION, score: round(score), areas_of_strength: strengths, areas_for_growth: growth, recommendation, message };
  }

  /** Build user-visible growth dashboard data */
  buildDashboard(): {
    score: number;
    trend: string;
    sessions: number;
    metrics: AntiDependencyMetrics;
    graduation: GraduationAssessment;
    milestones: { label: string; threshold: number; reached: boolean }[];
  } {
    const metrics = this.computeMetrics();
    const graduation = this.assessGraduation();
    return {
      score: metrics.self_authorship_score,
      trend: metrics.trend,
      sessions: metrics.sessions_tracked,
      metrics,
      graduation,
      milestones: [
        { label: 'Foundation', threshold: GRADUATION_THRESHOLDS.FOUNDATION, reached: metrics.self_authorship_score >= GRADUATION_THRESHOLDS.FOUNDATION },
        { label: 'Developing', threshold: GRADUATION_THRESHOLDS.DEVELOPING, reached: metrics.self_authorship_score >= GRADUATION_THRESHOLDS.DEVELOPING },
        { label: 'Maturing', threshold: GRADUATION_THRESHOLDS.MATURING, reached: metrics.self_authorship_score >= GRADUATION_THRESHOLDS.MATURING },
        { label: 'Mirror-Ready', threshold: GRADUATION_THRESHOLDS.MIRROR_READY, reached: metrics.self_authorship_score >= GRADUATION_THRESHOLDS.MIRROR_READY },
        { label: 'Graduated', threshold: GRADUATION_THRESHOLDS.GRADUATION, reached: metrics.self_authorship_score >= GRADUATION_THRESHOLDS.GRADUATION },
      ],
    };
  }

  exportHistory(): SessionSnapshot[] { return [...this.snapshots]; }
  importHistory(snapshots: SessionSnapshot[]): void { this.snapshots = [...snapshots]; }

  private emptyMetrics(): AntiDependencyMetrics {
    return {
      self_reflection_depth: 0, pattern_recognition: 0, somatic_awareness: 0,
      question_sophistication: 0, consultation_frequency: 0.5,
      self_authorship_score: 0, trend: 'new', sessions_tracked: 0,
    };
  }

  private windowScore(sessions: SessionSnapshot[]): number {
    const totalSelf = sessions.reduce((s, sn) => s + sn.self_referential_count, 0);
    const totalOther = sessions.reduce((s, sn) => s + sn.other_referential_count, 0);
    const ratio = totalSelf / Math.max(1, totalSelf + totalOther);
    const queries = sessions.flatMap(s => s.queries);
    const soph = queries.filter(q => SOPHISTICATED_PATTERNS.some(p => p.test(q))).length / Math.max(1, queries.length);
    return ratio * 0.5 + soph * 0.5;
  }
}

function round(n: number): number { return Math.round(n * 1000) / 1000; }
