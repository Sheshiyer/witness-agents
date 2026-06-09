// packages/orchestration/src/orchestrator.ts
import type { AtomicTask, FactLock, TaskExecutor, TaskResult } from './types.js';
import { buildExecutionPlan } from './task-graph.js';
import { renderFactLock, buildFactsReminder } from './fact-lock.js';
import type { OrchestrationObserver } from './observability.js';
import { NoopObserver } from './observability.js';
import type { GroundingProvider, GroundedPassage, RetrievalQuery } from './grounding.js';

export interface OrchestratorOptions {
  maxParallel?: number;
  taskTimeoutMs?: number;
  observer?: OrchestrationObserver;
  groundingProvider?: GroundingProvider;
  minRelevance?: number;
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
            // Budget check (T11): if estimateCost available and budget in options, skip if would exceed
            const budget = (this.options as any).retrievalBudgetTokens;
            if (budget && provider.estimateCost) {
              const est = await provider.estimateCost(query);
              if (est.tokens && est.tokens > budget) {
                // skip retrieval for this task under budget
                grounding = undefined;
                const latency = Date.now() - start;
                this.observer.onRetrievalComplete?.({
                  taskId: task.id,
                  perspective: task.perspective,
                  passageCount: 0,
                  avgRelevance: 0,
                  latencyMs: latency,
                  costUsd: 0,
                } as any);
              } else {
                const passages = await provider.retrieve(query);
                const filtered = passages.filter(p => p.score >= minRel);
                const latency = Date.now() - start;
                const avgRel = filtered.length > 0 ? filtered.reduce((s, p) => s + p.score, 0) / filtered.length : 0;
                let costUsd = 0;
                if (provider.estimateCost) {
                  const est = await provider.estimateCost(query);
                  costUsd = (est as any).costUsd || 0;
                }
                this.observer.onRetrievalComplete?.({
                  taskId: task.id,
                  perspective: task.perspective,
                  passageCount: filtered.length,
                  avgRelevance: avgRel,
                  latencyMs: latency,
                  costUsd,
                } as any);
                grounding = filtered.length > 0 ? filtered : undefined;
              }
            } else {
              const passages = await provider.retrieve(query);
              const filtered = passages.filter(p => p.score >= minRel);
              const latency = Date.now() - start;
              const avgRel = filtered.length > 0 ? filtered.reduce((s, p) => s + p.score, 0) / filtered.length : 0;
              let costUsd = 0;
              if (provider.estimateCost) {
                const est = await provider.estimateCost(query);
                costUsd = (est as any).costUsd || 0;
              }
              this.observer.onRetrievalComplete?.({
                taskId: task.id,
                perspective: task.perspective,
                passageCount: filtered.length,
                avgRelevance: avgRel,
                latencyMs: latency,
                costUsd,
              } as any);
              grounding = filtered.length > 0 ? filtered : undefined;
            }
          }

          const { system, user } = task.buildPrompts(lock, priorOutputs, grounding);
          const lockedSystem = [renderFactLock(lock), system].join('\n\n---\n\n');
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
