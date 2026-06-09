// packages/orchestration/src/in-process-service.ts
// Concrete in-process implementation of the WitnessOrchestrationService contract.
// This is the default "library" implementation for Phase 2.
// Future: this can be swapped for a remote/actor implementation without changing callers.

import type {
  AtomicTask,
  FactLock,
  AssemblyResult,
  TaskResult,
} from './types.js';
import type { OrchestrateRequest, OrchestrateResponse } from './service.js';
import { WitnessOrchestrator } from './orchestrator.js';
import { assemble } from './assembler.js';
import type { WitnessOrchestrationService } from './service.js';
import type { OrchestrationObserver } from './observability.js';
import type { GroundingProvider } from './grounding.js';

export interface InProcessServiceOptions {
  defaultMaxParallel?: number;
  defaultMaxRepairIterations?: number;
  observer?: OrchestrationObserver;
  groundingProvider?: GroundingProvider;
  defaultMinRelevance?: number;
}

export class InProcessWitnessOrchestrationService implements WitnessOrchestrationService {
  constructor(
    private executor: (task: AtomicTask, lock: FactLock, prior: Record<string, string>, grounding?: import('./grounding.js').GroundedPassage[]) => Promise<TaskResult>,
    private options: InProcessServiceOptions = {},
  ) {}

  async orchestrate(req: OrchestrateRequest): Promise<OrchestrateResponse> {
    const groundingProvider = req.options?.groundingProvider ?? this.options.groundingProvider;
    const minRelevance = req.options?.minRelevance ?? this.options.defaultMinRelevance ?? 0.65;

    const orchestrator = new WitnessOrchestrator(this.executor, {
      maxParallel: req.options?.maxParallel ?? this.options.defaultMaxParallel,
      observer: this.options.observer,
      groundingProvider,
      minRelevance,
      retrievalBudgetTokens: req.options?.retrievalBudgetTokens ?? (this.options as any).retrievalBudgetTokens,
    } as any);

    const results = await orchestrator.execute(req.tasks, req.factLock);

    const assembled = await assemble(results, req.factLock, {
      maxRepairIterations: req.options?.maxRepairIterations ?? this.options.defaultMaxRepairIterations,
      observer: this.options.observer,
      groundingProvider,
    });

    return assembled;
  }

  async executeTasks(tasks: AtomicTask[], lock: FactLock): Promise<TaskResult[]> {
    const groundingProvider = this.options.groundingProvider;
    const orchestrator = new WitnessOrchestrator(this.executor, {
      maxParallel: this.options.defaultMaxParallel,
      observer: this.options.observer,
      groundingProvider,
      minRelevance: this.options.defaultMinRelevance,
      retrievalBudgetTokens: (this.options as any).retrievalBudgetTokens,
    } as any);
    return orchestrator.execute(tasks, lock);
  }

  async assembleOnly(
    results: TaskResult[],
    lock: FactLock,
    options?: { maxRepairIterations?: number },
  ): Promise<AssemblyResult> {
    return assemble(results, lock, {
      maxRepairIterations: options?.maxRepairIterations ?? this.options.defaultMaxRepairIterations,
      observer: this.options.observer,
      groundingProvider: this.options.groundingProvider,
    });
  }
}
