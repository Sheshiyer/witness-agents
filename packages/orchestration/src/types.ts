// packages/orchestration/src/types.ts
// Core types for Atomic Fact-Locked Orchestration (extracted coordination layer)

export type FactValue = string | number | boolean | null | Record<string, unknown> | unknown[];

export interface LockedFact {
  value: FactValue;
  source: string;
  confidence?: number;
}

export interface FactLock {
  subjectId: string;
  subject: string;
  facts: Record<string, LockedFact>;
  frozenAt: string;
  version: string;
  retrievedContext?: import('./grounding.js').GroundedPassage[];
}

export interface AtomicTask<TPerspective extends string = string> {
  id: string;
  perspective: TPerspective;
  dependsOn: string[];
  targetTokens: number;
  temperature?: number;
  requiresGrounding?: boolean;
  buildPrompts: (
    lock: FactLock,
    priorOutputs: Record<string, string>,
    grounding?: import('./grounding.js').GroundedPassage[]
  ) => {
    system: string;
    user: string;
  };
  meta?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  perspective: string;
  content: string;
  tokensUsed?: number;
  latencyMs: number;
  model?: string;
  notes?: string[];
}

export interface AssemblyResult {
  output: string;
  taskResults: TaskResult[];
  contradictions: Contradiction[];
  repairIterations: number;
}

export interface Contradiction {
  type: 'fact-violation' | 'internal-inconsistency' | 'missing-lock';
  taskId?: string;
  description: string;
  excerpt: string;
  suggestedFix?: string;
}

export type TaskExecutor = (
  task: AtomicTask,
  lock: FactLock,
  prior: Record<string, string>,
  grounding?: import('./grounding.js').GroundedPassage[]
) => Promise<TaskResult>;

export type ContradictionDetector = (output: string, lock: FactLock) => Contradiction[];
