// src/wiring/agentscope/shadow-executor.ts
//
// Bounded, in-memory shadow store for remote comparison candidates.

import type { ExecutorCandidateV1 } from '@witness/orchestration';

export interface ShadowRecord {
  attemptId: string;
  native: ExecutorCandidateV1;
  agentscope: ExecutorCandidateV1 | null;
  agentscopeError?: string;
  recordedAt: number;
}

export interface ShadowStore {
  record(runId: string, entry: Omit<ShadowRecord, 'recordedAt'>): void;
  get(runId: string): ShadowRecord[] | undefined;
  size(): number;
}

export interface BoundedShadowStoreOptions {
  /** Maximum number of distinct runIds retained at any point in time. */
  maxRuns: number;
  /** Maximum records retained for each runId. */
  maxRecordsPerRun: number;
  now?: () => number;
}

function toPositiveInteger(value: number, label: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

/**
 * In-memory bounded store with FIFO eviction per run and across runIds.
 * Never persists. Host owns persistence semantics.
 */
export function createBoundedShadowStore(options: BoundedShadowStoreOptions): ShadowStore {
  const maxRuns = toPositiveInteger(options.maxRuns, 'maxRuns');
  const maxRecordsPerRun = toPositiveInteger(options.maxRecordsPerRun, 'maxRecordsPerRun');
  const now = options.now ?? (() => Date.now());

  const byRun = new Map<string, ShadowRecord[]>();
  const runOrder: string[] = [];

  function touchRun(runId: string): void {
    const existing = runOrder.indexOf(runId);
    if (existing >= 0) {
      runOrder.splice(existing, 1);
    }
    runOrder.push(runId);
  }

  function evictRuns(): void {
    while (runOrder.length > maxRuns) {
      const oldest = runOrder.shift();
      if (oldest !== undefined) {
        byRun.delete(oldest);
      }
    }
  }

  return {
    record(runId, entry): void {
      let records = byRun.get(runId);
      if (!records) {
        records = [];
        byRun.set(runId, records);
      }

      records.push({ ...entry, recordedAt: now() });
      if (records.length > maxRecordsPerRun) {
        records.shift();
      }

      touchRun(runId);
      evictRuns();
    },
    get(runId): ShadowRecord[] | undefined {
      return byRun.get(runId);
    },
    size(): number {
      return byRun.size;
    },
  };
}
