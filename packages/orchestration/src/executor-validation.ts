// packages/orchestration/src/executor-validation.ts
// Host-side executor result validation (Task 2).

import { createHash } from 'node:crypto';
import type { TaskResult } from './types.js';
import { validateProvenanceEnvelope, type ProvenanceEnvelopeV1 } from './provenance.js';

function sha256HexSync(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export type { ProvenanceEnvelopeV1 } from './provenance.js';

export interface ExecutorCandidateV1 {
  runId: string;
  attemptId: string;
  contextPacketHash: string;
  factLockHash: string;
  task: { taskId: string; perspective: string };
  output: string;
  outputHash: string;
  provenance: ProvenanceEnvelopeV1;
}

export interface ValidationParams {
  expectedContextPacketHash: string;
  expectedFactLockHash: string;
  expectedTaskIds: Set<string>;
  knownAttemptIds: Set<string>;
  consumedAttemptIds?: Set<string>;
  allowedSourceIds?: Set<string>;
}

export type ValidationResult =
  | { valid: true; result: TaskResult }
  | { valid: false; reason: string; securityEvent?: boolean };

function fail(reason: string, securityEvent?: boolean): ValidationResult {
  return securityEvent ? { valid: false, reason, securityEvent: true } : { valid: false, reason };
}

export function validateExecutorResult(
  candidate: ExecutorCandidateV1,
  params: ValidationParams,
): ValidationResult {
  if (candidate.contextPacketHash !== params.expectedContextPacketHash) {
    return fail('context packet hash mismatch', true);
  }
  if (candidate.factLockHash !== params.expectedFactLockHash) {
    return fail('fact lock hash mismatch', true);
  }
  if (!params.expectedTaskIds.has(candidate.task.taskId)) {
    return fail(`task mismatch: unexpected taskId '${candidate.task.taskId}'`);
  }
  if (params.consumedAttemptIds?.has(candidate.attemptId)) {
    return fail(`duplicate or late attempt id: ${candidate.attemptId}`);
  }
  if (!params.knownAttemptIds.has(candidate.attemptId)) {
    return fail(`unknown attempt id: ${candidate.attemptId}`);
  }

  const expectedOutputHash = sha256HexSync(candidate.output);
  if (candidate.outputHash !== expectedOutputHash) {
    return fail('output hash mismatch');
  }

  let provenance: ProvenanceEnvelopeV1;
  try {
    provenance = validateProvenanceEnvelope(candidate.provenance);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  if (
    candidate.runId !== provenance.runId ||
    candidate.attemptId !== provenance.attemptId ||
    candidate.contextPacketHash !== provenance.contextPacketHash ||
    candidate.factLockHash !== provenance.factLockHash
  ) {
    return fail('identity mismatch between candidate and provenance');
  }

  if (provenance.terminal.reason !== 'completed') {
    return fail(`terminal reason must be 'completed', got '${provenance.terminal.reason}'`);
  }
  if (provenance.terminal.outputHash !== candidate.outputHash) {
    return fail('terminal output hash mismatch');
  }

  if (params.allowedSourceIds) {
    for (const claimRef of provenance.claimRefs) {
      for (const sourceId of claimRef.sourceIds) {
        if (!params.allowedSourceIds.has(sourceId)) {
          return fail(`claim references unauthorized source id: ${sourceId}`, true);
        }
      }
    }
  }

  params.consumedAttemptIds?.add(candidate.attemptId);

  return {
    valid: true,
    result: {
      taskId: candidate.task.taskId,
      perspective: candidate.task.perspective,
      content: candidate.output,
      latencyMs: 0,
    },
  };
}
