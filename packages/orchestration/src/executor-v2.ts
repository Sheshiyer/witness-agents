// packages/orchestration/src/executor-v2.ts
// Backward-compatible legacy executor adapter (Task 2).

import { createHash } from 'node:crypto';
import type { AtomicTask, FactLock, TaskExecutor, TaskResult } from './types.js';
import type { ExecutionEnvelopeV1 } from './execution-envelope.js';
import type { ExecutorCandidateV1 } from './executor-validation.js';
import type { ProvenanceEnvelopeV1 } from './provenance.js';
import type { GroundedPassage } from './grounding.js';

export type ExecutorV2 = (
  envelope: ExecutionEnvelopeV1,
  task: AtomicTask,
  context?: { priorOutputs?: Record<string, string>; grounding?: GroundedPassage[] },
) => Promise<ExecutorCandidateV1>;

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function buildProvenance(
  envelope: ExecutionEnvelopeV1,
  outputHash: string,
): ProvenanceEnvelopeV1 {
  return {
    schemaVersion: 'noesis.provenance.v1',
    runId: envelope.runId,
    attemptId: envelope.attemptId,
    executor: 'native',
    adapterVersion: '1.0.0',
    contextPacketHash: envelope.contextPacketHash,
    factLockHash: envelope.factLockHash,
    promptTemplateId: envelope.task.promptTemplateId,
    promptHash: envelope.task.promptHash,
    modelCalls: [],
    toolCalls: [],
    claimRefs: [],
    events: [
      {
        schemaVersion: 'noesis.event.v1',
        eventId: `${envelope.attemptId}-start`,
        runId: envelope.runId,
        attemptId: envelope.attemptId,
        taskId: envelope.task.taskId,
        type: 'start',
        timestamp: envelope.deadlineAt,
        payload: { promptHash: envelope.task.promptHash },
      },
      {
        schemaVersion: 'noesis.event.v1',
        eventId: `${envelope.attemptId}-end`,
        runId: envelope.runId,
        attemptId: envelope.attemptId,
        taskId: envelope.task.taskId,
        type: 'end',
        timestamp: envelope.deadlineAt,
        payload: { outputHash },
      },
    ],
    terminal: { reason: 'completed', outputHash },
  };
}

export function adaptLegacyTaskExecutor(legacyExecutor: TaskExecutor): ExecutorV2 {
  return async (envelope, task, context) => {
    const priorOutputs = context?.priorOutputs ?? {};
    const grounding = context?.grounding;
    const result: TaskResult = await legacyExecutor(task, envelope.factLock, priorOutputs, grounding);
    const output = result.content;
    const outputHash = sha256Hex(output);
    return {
      runId: envelope.runId,
      attemptId: envelope.attemptId,
      contextPacketHash: envelope.contextPacketHash,
      factLockHash: envelope.factLockHash,
      task: { taskId: envelope.task.taskId, perspective: envelope.task.perspective },
      output,
      outputHash,
      provenance: buildProvenance(envelope, outputHash),
    };
  };
}

export function createNativeExecutorV2(legacyExecutor: TaskExecutor): ExecutorV2 {
  return adaptLegacyTaskExecutor(legacyExecutor);
}
