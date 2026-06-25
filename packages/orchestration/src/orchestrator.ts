// packages/orchestration/src/orchestrator.ts
import type { AtomicTask, FactLock, TaskExecutor, TaskResult } from './types.js';
import { buildExecutionPlan } from './task-graph.js';
import { renderFactLock, buildFactsReminder } from './fact-lock.js';
import type { OrchestrationObserver } from './observability.js';
import { NoopObserver } from './observability.js';
import type { GroundingProvider, GroundedPassage, RetrievalQuery } from './grounding.js';
import { injectGroundedContext } from './grounding.js';

export interface OrchestratorOptions {
  maxParallel?: number;
  taskTimeoutMs?: number;
  observer?: OrchestrationObserver;
  groundingProvider?: GroundingProvider;
  minRelevance?: number;
  maxRetrievalLatencyMs?: number;
  retrievalBudgetTokens?: number;
}

export class WitnessOrchestrator {
  private observer: OrchestrationObserver;

  constructor(private executor: TaskExecutor, private options: OrchestratorOptions = {}) {
    this.observer = options.observer ?? NoopObserver;
  }

  async execute(tasks: AtomicTask[], lock: FactLock): Promise<TaskResult[]> {
    const waves = buildExecutionPlan(tasks);
    const results = new Map<string, TaskResult>();
    const maxParallel = this.options.maxParallel ?? 3;
    const provider = this.options.groundingProvider;
    const minRel = this.options.minRelevance ?? 0.65;
    const maxRetrievalLatencyMs = this.options.maxRetrievalLatencyMs;
    let retrievalBudgetRemaining = this.options.retrievalBudgetTokens;

    for (const wave of waves) {
      const batch = [...wave.tasks];
      const waveResults: TaskResult[] = [];

      for (let i = 0; i < batch.length; i += maxParallel) {
        const chunk = batch.slice(i, i + maxParallel);
        const promises = chunk.map(async (task) => {
          this.observer.onTaskStart?.({ id: task.id, perspective: task.perspective }, { subject: lock.subject });

          const priorOutputs: Record<string, string> = {};
          for (const dep of task.dependsOn) {
            const prev = results.get(dep);
            if (prev) priorOutputs[dep] = prev.content;
          }

          let grounding: GroundedPassage[] | undefined;
          if (provider && (task.requiresGrounding || false)) {
            const start = Date.now();
            this.observer.onRetrievalStart?.({ taskId: task.id, perspective: task.perspective });
            const query: RetrievalQuery = {
              subjectId: lock.subjectId,
              facts: lock.facts,
              perspective: task.perspective,
              taskId: task.id,
              maxPassages: 6,
            };

            const estimate = provider.estimateCost ? await provider.estimateCost(query) : undefined;
            const estimatedTokens = estimate?.tokens ?? 0;
            const wouldExceedBudget =
              retrievalBudgetRemaining !== undefined &&
              estimatedTokens > retrievalBudgetRemaining;

            if (wouldExceedBudget) {
              const latency = Date.now() - start;
              this.observer.onRetrievalComplete?.({
                taskId: task.id,
                perspective: task.perspective,
                passageCount: 0,
                avgRelevance: 0,
                latencyMs: latency,
                costUsd: 0,
              });
            } else {
              if (retrievalBudgetRemaining !== undefined) {
                retrievalBudgetRemaining = Math.max(0, retrievalBudgetRemaining - estimatedTokens);
              }
              const passages = await retrieveWithinLatency(provider, query, maxRetrievalLatencyMs);
              const filtered = passages.filter(p => p.score >= minRel);
              const latency = Date.now() - start;
              const avgRel = filtered.length > 0 ? filtered.reduce((s, p) => s + p.score, 0) / filtered.length : 0;
              const costUsd = estimate?.costUsd ?? 0;
              this.observer.onRetrievalComplete?.({
                taskId: task.id,
                perspective: task.perspective,
                passageCount: filtered.length,
                avgRelevance: avgRel,
                latencyMs: latency,
                costUsd,
              });
              grounding = filtered.length > 0 ? filtered : undefined;
            }
          }

          const { system, user } = task.buildPrompts(lock, priorOutputs, grounding);

          // Inject grounded context AFTER FactLock, BEFORE system prompt (P2-W2-SC-T15)
          // Format: [FactLock] --- [Retrieved Context] --- [System prompt]
          const groundedSection = injectGroundedContext(lock, grounding);
          const lockedSystem = [
            renderFactLock(lock),
            groundedSection,  // inserted between FactLock and system
            system,
          ].filter(Boolean).join('\n\n');

          const lockedUser = [user, buildFactsReminder(lock)].join('\n\n');

          const augmentedTask: AtomicTask = {
            ...task,
            buildPrompts: () => ({ system: lockedSystem, user: lockedUser }),
          };

          const result = await this.executor(augmentedTask, lock, priorOutputs, grounding);
          this.observer.onTaskComplete?.(result);
          return result;
        });

        const chunkResults = await Promise.all(promises);
        waveResults.push(...chunkResults);
      }

      this.observer.onWaveComplete?.(wave.wave, waveResults.length);
      for (const r of waveResults) {
        results.set(r.taskId, r);
      }
    }

    return Array.from(results.values());
  }
}

async function retrieveWithinLatency(
  provider: GroundingProvider,
  query: RetrievalQuery,
  maxRetrievalLatencyMs?: number,
): Promise<GroundedPassage[]> {
  if (!maxRetrievalLatencyMs || maxRetrievalLatencyMs <= 0) {
    return provider.retrieve(query);
  }

  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      provider.retrieve(query),
      new Promise<GroundedPassage[]>((resolve) => {
        timeout = setTimeout(() => resolve([]), maxRetrievalLatencyMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
