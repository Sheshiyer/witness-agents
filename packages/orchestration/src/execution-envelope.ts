// packages/orchestration/src/execution-envelope.ts
// Executor-neutral ExecutionEnvelopeV1 schema (Task 1).

import type { FactLock } from './types.js';
import { canonicalize, hashCanonical } from './context-packet.js';

export interface AtomicTaskDescriptorV1 {
  taskId: string;
  perspective: string;
  dependsOn: string[];
  targetTokens: number;
  temperature?: number;
  requiresGrounding?: boolean;
  promptTemplateId: string;
  promptHash: string;
  meta?: Record<string, unknown>;
}

export interface ExecutionEnvelopeV1 {
  schemaVersion: 'noesis.execution.v1';
  runId: string;
  attemptId: string;
  idempotencyKey: string;
  contextPacketHash: string;
  factLock: FactLock;
  factLockHash: string;
  task: AtomicTaskDescriptorV1;
  priorOutputRefs: Array<{ taskId: string; outputHash: string }>;
  allowedTools: string[];
  deadlineAt: string;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireNonEmptyString(obj: Record<string, unknown>, key: string, label: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label}.${key} must be a non-empty string`);
  }
  return value;
}

function requireStringArray(obj: Record<string, unknown>, key: string, label: string): string[] {
  const value = obj[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label}.${key} must be an array of strings`);
  }
  return [...value] as string[];
}

function validateFactLock(value: unknown): FactLock {
  const lock = requireObject(value, 'ExecutionEnvelopeV1.factLock');
  const subjectId = requireNonEmptyString(lock, 'subjectId', 'ExecutionEnvelopeV1.factLock');
  const subject = requireNonEmptyString(lock, 'subject', 'ExecutionEnvelopeV1.factLock');
  const frozenAt = requireNonEmptyString(lock, 'frozenAt', 'ExecutionEnvelopeV1.factLock');
  const version = requireNonEmptyString(lock, 'version', 'ExecutionEnvelopeV1.factLock');
  const facts = requireObject(lock.facts, 'ExecutionEnvelopeV1.factLock.facts');
  for (const [key, fact] of Object.entries(facts)) {
    const f = requireObject(fact, `ExecutionEnvelopeV1.factLock.facts.${key}`);
    requireNonEmptyString(f, 'source', `ExecutionEnvelopeV1.factLock.facts.${key}`);
  }
  return {
    subjectId,
    subject,
    facts: facts as FactLock['facts'],
    engineData: lock.engineData as Record<string, string> | undefined,
    frozenAt,
    version,
    retrievedContext: lock.retrievedContext as FactLock['retrievedContext'],
  };
}

function validateTaskDescriptor(value: unknown): AtomicTaskDescriptorV1 {
  const t = requireObject(value, 'ExecutionEnvelopeV1.task');
  const taskId = requireNonEmptyString(t, 'taskId', 'ExecutionEnvelopeV1.task');
  const perspective = requireNonEmptyString(t, 'perspective', 'ExecutionEnvelopeV1.task');
  const dependsOn = requireStringArray(t, 'dependsOn', 'ExecutionEnvelopeV1.task');
  if (typeof t.targetTokens !== 'number' || !Number.isFinite(t.targetTokens) || t.targetTokens <= 0) {
    throw new Error('ExecutionEnvelopeV1.task.targetTokens must be a positive number');
  }
  if (t.temperature !== undefined && (typeof t.temperature !== 'number' || !Number.isFinite(t.temperature))) {
    throw new Error('ExecutionEnvelopeV1.task.temperature must be a finite number when present');
  }
  if (t.requiresGrounding !== undefined && typeof t.requiresGrounding !== 'boolean') {
    throw new Error('ExecutionEnvelopeV1.task.requiresGrounding must be a boolean when present');
  }
  const promptTemplateId = requireNonEmptyString(t, 'promptTemplateId', 'ExecutionEnvelopeV1.task');
  const promptHash = requireNonEmptyString(t, 'promptHash', 'ExecutionEnvelopeV1.task');
  if (t.meta !== undefined) {
    requireObject(t.meta, 'ExecutionEnvelopeV1.task.meta');
  }
  return {
    taskId,
    perspective,
    dependsOn,
    targetTokens: t.targetTokens,
    temperature: t.temperature as number | undefined,
    requiresGrounding: t.requiresGrounding as boolean | undefined,
    promptTemplateId,
    promptHash,
    meta: t.meta as Record<string, unknown> | undefined,
  };
}

function validatePriorOutputRefs(value: unknown): Array<{ taskId: string; outputHash: string }> {
  if (!Array.isArray(value)) {
    throw new Error('ExecutionEnvelopeV1.priorOutputRefs must be an array');
  }
  return value.map((item, index) => {
    const label = `ExecutionEnvelopeV1.priorOutputRefs[${index}]`;
    const r = requireObject(item, label);
    return {
      taskId: requireNonEmptyString(r, 'taskId', label),
      outputHash: requireNonEmptyString(r, 'outputHash', label),
    };
  });
}

export function validateExecutionEnvelope(envelope: unknown): ExecutionEnvelopeV1 {
  const e = requireObject(envelope, 'ExecutionEnvelopeV1');
  if (e.schemaVersion !== 'noesis.execution.v1') {
    throw new Error("ExecutionEnvelopeV1.schemaVersion must be 'noesis.execution.v1'");
  }
  const runId = requireNonEmptyString(e, 'runId', 'ExecutionEnvelopeV1');
  const attemptId = requireNonEmptyString(e, 'attemptId', 'ExecutionEnvelopeV1');
  const idempotencyKey = requireNonEmptyString(e, 'idempotencyKey', 'ExecutionEnvelopeV1');
  const contextPacketHash = requireNonEmptyString(e, 'contextPacketHash', 'ExecutionEnvelopeV1');
  const factLockHash = requireNonEmptyString(e, 'factLockHash', 'ExecutionEnvelopeV1');
  const deadlineAt = requireNonEmptyString(e, 'deadlineAt', 'ExecutionEnvelopeV1');
  const factLock = validateFactLock(e.factLock);
  const task = validateTaskDescriptor(e.task);
  const priorOutputRefs = validatePriorOutputRefs(e.priorOutputRefs);
  const allowedTools = requireStringArray(e, 'allowedTools', 'ExecutionEnvelopeV1');

  return {
    schemaVersion: 'noesis.execution.v1',
    runId,
    attemptId,
    idempotencyKey,
    contextPacketHash,
    factLock,
    factLockHash,
    task,
    priorOutputRefs,
    allowedTools,
    deadlineAt,
  };
}

export async function hashExecutionEnvelope(envelope: ExecutionEnvelopeV1): Promise<string> {
  const validated = validateExecutionEnvelope(envelope);
  return hashCanonical(canonicalize(validated));
}
