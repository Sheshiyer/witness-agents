// src/wiring/adapters/observability.ts
// Domain adapter that wraps any TaskExecutor with observability hooks.
// This is the recommended way to add tracing/metrics when using the atomic wiring
// from inside witness-agents (daily-mirror, interpreter, etc.).

import type { TaskExecutor, AtomicTask, FactLock, TaskResult } from '@witness/orchestration';

export interface WitnessOrchestrationObserver {
  onTaskStart?(task: AtomicTask, lock: FactLock): void;
  onTaskComplete?(result: TaskResult, task: AtomicTask): void;
  onWaveComplete?(wave: number, results: TaskResult[]): void;
  onContradiction?(contradiction: any, output: string): void;
  onRepair?(originalExcerpt: string, repaired: string): void;
  onAssemblyComplete?(result: { contradictions: number; repairIterations: number; totalTasks: number }): void;
}

/**
 * Wraps an executor with before/after hooks.
 * Use this in daily-mirror, interpreter, or any high-level flow.
 */
export function withObservability(
  executor: TaskExecutor,
  observer: WitnessOrchestrationObserver,
): TaskExecutor {
  return async (task: AtomicTask, lock: FactLock, prior: Record<string, string>) => {
    observer.onTaskStart?.(task, lock);

    const result = await executor(task, lock, prior);

    observer.onTaskComplete?.(result, task);
    return result;
  };
}

// Re-export the core NoopObserver for convenience (single source of truth)
export { NoopObserver } from '@witness/orchestration';
