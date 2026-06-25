// packages/orchestration/src/service.ts
// Small service interface for Phase 2 extraction boundary.
// This defines the contract that a standalone orchestration service (or library facade) should expose.

import type { AtomicTask, FactLock, AssemblyResult, TaskResult, Contradiction } from './types.js';
import type { GroundingProvider } from './grounding.js';

export interface OrchestrateRequest {
  /** Frozen facts for the subject */
  factLock: FactLock;
  /** List of atomic tasks (can be produced by domain-specific graph builders) */
  tasks: AtomicTask[];
  /** Optional overrides */
  options?: {
    maxParallel?: number;
    maxRepairIterations?: number;
    groundingProvider?: GroundingProvider;
    minRelevance?: number;
    maxRetrievalLatencyMs?: number;
    retrievalBudgetTokens?: number;
  };
}

export interface OrchestrateResponse extends AssemblyResult {
  // Already includes: output, taskResults, contradictions, repairIterations
}

/**
 * High-level service interface for multi-perspective atomic orchestration.
 *
 * Implementations can be:
 * - In-process (current WitnessOrchestrator + assemble)
 * - Remote HTTP/gRPC service
 * - Future actor-model backend
 */
export interface WitnessOrchestrationService {
  /**
   * Execute a set of atomic tasks against a frozen FactLock,
   * assemble the result, and perform optional sparse repair.
   */
  orchestrate(req: OrchestrateRequest): Promise<OrchestrateResponse>;

  /**
   * Optional: just run the tasks without full assembly/repair (for debugging or partial flows).
   */
  executeTasks?(tasks: AtomicTask[], lock: FactLock): Promise<TaskResult[]>;

  /**
   * Optional: run only the assembly + repair stage on already-computed results.
   */
  assembleOnly?(results: TaskResult[], lock: FactLock, options?: { maxRepairIterations?: number }): Promise<AssemblyResult>;
}
