// packages/orchestration/src/observability.ts
// Core observability types for the generic orchestration layer.
// These are intentionally minimal so domain layers (witness-agents) can provide richer adapters.

export interface OrchestrationObserver {
  onTaskStart?(task: { id: string; perspective: string }, lock: { subject: string }): void;
  onTaskComplete?(result: { taskId: string; perspective: string; latencyMs: number }): void;
  /** wave index (0-based), number of tasks completed in that wave */
  onWaveComplete?(wave: number, count: number): void;
  onContradiction?(c: { type: string; description: string }): void;
  onRepair?(info: { iterations: number }): void;
  onAssemblyComplete?(summary: { totalTasks: number; contradictions: number; repairIterations: number }): void;

  // Retrieval signals (P1/P2 grounding)
  onRetrievalStart?(info: { taskId: string; perspective: string }): void;
  onRetrievalComplete?(info: { taskId: string; perspective: string; passageCount: number; avgRelevance: number; latencyMs: number }): void;
}

export const NoopObserver: OrchestrationObserver = {};
