// packages/orchestration/src/event-projector.ts
// Task 3: deterministic replay/projection of NoesisAgentEventV1 streams into a TaskProjectionV1.
// Fails closed on any structural anomaly (duplicates, identity drift, orphans, post-terminal deltas).

import type { TaskResult } from './types.js';
import { validateNoesisAgentEvent, isTerminalEventType, type NoesisAgentEventV1 } from './events.js';
import type { OrchestrationObserver } from './observability.js';

export type TaskProjectionStatus = 'complete' | 'interrupted' | 'errored' | 'incomplete';

export interface TaskProjectionV1 {
  runId: string;
  attemptId: string;
  taskId: string;
  status: TaskProjectionStatus;
  /** present only when status === 'complete' */
  result?: TaskResult;
  /** present when status is 'interrupted' or 'errored' */
  terminalReason?: string;
  eventCount: number;
}

/**
 * Replays an ordered array of events for a single (runId, taskId, attemptId) stream and
 * deterministically projects it to a TaskProjectionV1. Throws on any structural violation
 * rather than silently producing a best-effort result.
 */
export function projectEventStream(events: NoesisAgentEventV1[]): TaskProjectionV1 {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('projectEventStream: empty event stream (no events)');
  }

  const seenEventIds = new Set<string>();
  let identity: { runId: string; attemptId: string; taskId: string } | null = null;
  let started = false;
  let terminal: NoesisAgentEventV1 | null = null;
  const contentParts: string[] = [];
  let endPayload: { outputHash: string; tokensUsed?: number; latencyMs?: number; extensions?: unknown } | null = null;

  for (const raw of events) {
    // validateNoesisAgentEvent also applies the sensitive-field policy at ingestion time.
    const event = validateNoesisAgentEvent(raw);

    if (seenEventIds.has(event.eventId)) {
      throw new Error(`projectEventStream: duplicate event id '${event.eventId}'`);
    }
    seenEventIds.add(event.eventId);

    if (identity === null) {
      identity = { runId: event.runId, attemptId: event.attemptId, taskId: event.taskId };
    } else if (
      identity.runId !== event.runId ||
      identity.attemptId !== event.attemptId ||
      identity.taskId !== event.taskId
    ) {
      throw new Error(
        `projectEventStream: identity mismatch — expected run/task/attempt ${identity.runId}/${identity.taskId}/${identity.attemptId}, got ${event.runId}/${event.taskId}/${event.attemptId}`,
      );
    }

    if (event.type === 'start') {
      if (started) {
        throw new Error('projectEventStream: duplicate start event — stream already started');
      }
      started = true;
      continue;
    }

    if (!started) {
      throw new Error(`projectEventStream: orphan '${event.type}' event with no matching start`);
    }

    if (terminal !== null) {
      throw new Error(
        `projectEventStream: event '${event.type}' arrived after terminal event '${terminal.type}' for this stream`,
      );
    }

    if (event.type === 'delta') {
      const content = event.payload.content;
      if (typeof content !== 'string') {
        throw new Error("projectEventStream: delta payload.content must be a string");
      }
      contentParts.push(content);
    } else if (isTerminalEventType(event.type)) {
      terminal = event;
      if (event.type === 'end') {
        const outputHash = event.payload.outputHash;
        if (typeof outputHash !== 'string' || outputHash.length === 0) {
          throw new Error("projectEventStream: end payload.outputHash must be a non-empty string");
        }
        endPayload = {
          outputHash,
          tokensUsed: event.payload.tokensUsed as number | undefined,
          latencyMs: event.payload.latencyMs as number | undefined,
          extensions: event.payload.extensions,
        };
      }
    }
  }

  if (identity === null) {
    // unreachable given the length check above, but keeps control flow explicit
    throw new Error('projectEventStream: no identity established');
  }

  const base = {
    runId: identity.runId,
    attemptId: identity.attemptId,
    taskId: identity.taskId,
    eventCount: events.length,
  };

  if (terminal === null) {
    return { ...base, status: 'incomplete' };
  }

  if (terminal.type === 'interrupt') {
    const reason = terminal.payload.reason;
    return {
      ...base,
      status: 'interrupted',
      terminalReason: typeof reason === 'string' ? reason : undefined,
    };
  }

  if (terminal.type === 'error') {
    const error = terminal.payload.error;
    return {
      ...base,
      status: 'errored',
      terminalReason: typeof error === 'string' ? error : undefined,
    };
  }

  // terminal.type === 'end'
  const result: TaskResult & { extensions?: unknown } = {
    taskId: identity.taskId,
    perspective: '',
    content: contentParts.join(''),
    latencyMs: endPayload?.latencyMs ?? 0,
    tokensUsed: endPayload?.tokensUsed,
  };
  if (endPayload?.extensions !== undefined) {
    (result as any).extensions = endPayload.extensions;
  }

  return { ...base, status: 'complete', result };
}

/**
 * Same as projectEventStream but reports the resulting projection through an
 * OrchestrationObserver's onEventStreamProjected hook (when present), so callers can
 * wire replay lifecycle into existing metrics/observability without changing those
 * modules' interfaces.
 */
export function projectEventStreamWithObserver(
  events: NoesisAgentEventV1[],
  observer?: OrchestrationObserver,
): TaskProjectionV1 {
  const projection = projectEventStream(events);
  observer?.onEventStreamProjected?.({
    runId: projection.runId,
    attemptId: projection.attemptId,
    taskId: projection.taskId,
    status: projection.status,
    eventCount: projection.eventCount,
  });
  return projection;
}
