// packages/orchestration/src/metrics.ts
// Richer metrics adapter for atomic orchestration.
// Tracks per-task latency, tokens (when provided by executor), waves, contradictions, repairs.
// Can be passed as the `observer` to Orchestrator / assemble.

import type { OrchestrationObserver } from './observability.js';

export interface AtomicRunMetrics {
  totalTasks: number;
  totalLatencyMs: number;
  totalTokens: number;
  waves: number;
  contradictions: number;
  repairIterations: number;
  byPerspective: Record<string, { count: number; latencyMs: number; tokens: number }>;
  // Retrieval (grounding) signals — present when GroundingProvider is wired
  retrieval?: {
    calls: number;
    totalLatencyMs: number;
    totalPassages: number;
    avgRelevance: number;
    totalCostUsd?: number;
    byPerspective: Record<string, { calls: number; passages: number; avgRelevance: number; latencyMs: number; costUsd?: number }>;
  };
}

export function createMetricsCollector(): {
  observer: OrchestrationObserver;
  getMetrics: () => AtomicRunMetrics;
  reset: () => void;
} {
  let metrics: AtomicRunMetrics = {
    totalTasks: 0,
    totalLatencyMs: 0,
    totalTokens: 0,
    waves: 0,
    contradictions: 0,
    repairIterations: 0,
    byPerspective: {},
  };

  const observer: OrchestrationObserver = {
    onTaskComplete(result) {
      metrics.totalTasks += 1;
      metrics.totalLatencyMs += result.latencyMs || 0;
      const tokens = (result as any).tokensUsed || 0;
      metrics.totalTokens += tokens;

      const p = result.perspective;
      if (!metrics.byPerspective[p]) {
        metrics.byPerspective[p] = { count: 0, latencyMs: 0, tokens: 0 };
      }
      metrics.byPerspective[p].count += 1;
      metrics.byPerspective[p].latencyMs += result.latencyMs || 0;
      metrics.byPerspective[p].tokens += tokens;
    },
    onWaveComplete() {
      metrics.waves += 1;
    },
    onContradiction() {
      metrics.contradictions += 1;
    },
    onRepair() {
      // counted at assembly time for accuracy
    },
    onAssemblyComplete(summary) {
      metrics.repairIterations = summary.repairIterations || 0;
      metrics.contradictions = summary.contradictions || metrics.contradictions;
      metrics.totalTasks = summary.totalTasks || metrics.totalTasks;
    },
    onRetrievalStart() {
      if (!metrics.retrieval) {
        metrics.retrieval = { calls: 0, totalLatencyMs: 0, totalPassages: 0, avgRelevance: 0, byPerspective: {} };
      }
      metrics.retrieval.calls += 1;
    },
    onRetrievalComplete(info) {
      if (!metrics.retrieval) {
        metrics.retrieval = { calls: 0, totalLatencyMs: 0, totalPassages: 0, avgRelevance: 0, totalCostUsd: 0, byPerspective: {} };
      }
      const r = metrics.retrieval;
      r.totalLatencyMs += info.latencyMs || 0;
      r.totalPassages += info.passageCount || 0;
      const cost = (info as any).costUsd || 0;
      r.totalCostUsd = (r.totalCostUsd || 0) + cost;

      const p = info.perspective;
      if (!r.byPerspective[p]) {
        r.byPerspective[p] = { calls: 0, passages: 0, avgRelevance: 0, latencyMs: 0, costUsd: 0 };
      }
      const bp = r.byPerspective[p];
      bp.calls += 1;
      bp.passages += info.passageCount || 0;
      bp.latencyMs += info.latencyMs || 0;
      bp.costUsd = (bp.costUsd || 0) + cost;
      // running average across calls for this perspective
      bp.avgRelevance = ((bp.avgRelevance * (bp.calls - 1)) + (info.avgRelevance || 0)) / bp.calls;

      // global running average
      const totalCalls = r.calls || 1;
      r.avgRelevance = ((r.avgRelevance * (totalCalls - 1)) + (info.avgRelevance || 0)) / totalCalls;
    },
  };

  return {
    observer,
    getMetrics: () => ({ ...metrics, byPerspective: { ...metrics.byPerspective } }),
    reset: () => {
      metrics = {
        totalTasks: 0,
        totalLatencyMs: 0,
        totalTokens: 0,
        waves: 0,
        contradictions: 0,
        repairIterations: 0,
        byPerspective: {},
        retrieval: undefined,
      };
    },
  };
}
