// src/wiring/agentscope/event-projector.ts
//
// Translates AgentScope remote stream events into Noesis events and projects them.

import { hashString, sanitizeEventPayload, type NoesisAgentEventType, type NoesisAgentEventV1 } from '@witness/orchestration';
import { projectEventStream, type TaskProjectionV1 } from '@witness/orchestration';

export interface AgentscopeRemoteEvent {
  type: 'start' | 'delta' | 'end' | 'interrupt' | 'error';
  envelope_id: string;
  content?: unknown;
  index?: unknown;
  full_content?: unknown;
  fact_lock_ref?: unknown;
  context_hash?: unknown;
  provenance_ref?: unknown;
  reason?: unknown;
  message?: unknown;
  [key: string]: unknown;
}

function sanitizeUnknownFields(
  event: AgentscopeRemoteEvent,
  knownFields: Set<string>,
): Record<string, unknown> {
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (!knownFields.has(key)) {
      extras[key] = value;
    }
  }
  return extras;
}

function toEventType(type: AgentscopeRemoteEvent['type']): NoesisAgentEventType {
  return type;
}

export interface ProjectAgentscopeStreamParams {
  runId: string;
  attemptId: string;
  taskId: string;
  /** Host-owned expected prompt hash (envelope.task.promptHash). Never sourced from the remote stream. */
  promptHash: string;
  eventIdFor?: (index: number, type: string) => string;
  timestampFor?: (index: number) => string;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export async function toNoesisAgentEvents(
  remoteEvents: AgentscopeRemoteEvent[],
  params: ProjectAgentscopeStreamParams,
): Promise<NoesisAgentEventV1[]> {
  const eventIdFor = params.eventIdFor ?? ((index: number, type: string) => `${params.attemptId}-${type}-${index}`);
  const timestampFor = params.timestampFor ?? ((index: number) => new Date(index).toISOString());

  const events: NoesisAgentEventV1[] = [];
  for (let index = 0; index < remoteEvents.length; index += 1) {
    const remote = remoteEvents[index];
    const known = new Set(['type', 'envelope_id']);
    const payload: Record<string, unknown> = {};

    if (remote.type === 'start') {
      known.add('fact_lock_ref');
      known.add('context_hash');
      known.add('provenance_ref');
      payload.promptHash = params.promptHash;
      if (typeof remote.fact_lock_ref === 'string') {
        payload.factLockHash = remote.fact_lock_ref;
      }
      if (typeof remote.context_hash === 'string') {
        payload.contextHash = remote.context_hash;
      }
      if (typeof remote.provenance_ref === 'string') {
        payload.provenanceRef = remote.provenance_ref;
      }
    }

    if (remote.type === 'delta') {
      known.add('content');
      known.add('index');
      if (typeof remote.content !== 'string') {
        throw new Error('remote delta content is not a string');
      }
      if (!Number.isInteger(remote.index as number)) {
        throw new Error('remote delta index is not an integer');
      }
      payload.content = remote.content;
      payload.index = remote.index;
    }

    if (remote.type === 'end') {
      known.add('full_content');
      known.add('fact_lock_ref');
      known.add('context_hash');
      known.add('provenance_ref');
      payload.outputHash = typeof remote.full_content === 'string' ? await hashString(remote.full_content) : '';
      if (typeof remote.fact_lock_ref === 'string') {
        payload.factLockHash = remote.fact_lock_ref;
      }
      if (typeof remote.context_hash === 'string') {
        payload.contextHash = remote.context_hash;
      }
      if (typeof remote.provenance_ref === 'string') {
        payload.provenanceRef = remote.provenance_ref;
      }
    }

    if (remote.type === 'interrupt') {
      known.add('reason');
      if (typeof remote.reason === 'string') {
        payload.reason = remote.reason;
      }
    }

    if (remote.type === 'error') {
      known.add('message');
      if (typeof remote.message === 'string') {
        payload.error = remote.message;
      }
    }

    const extras = sanitizeUnknownFields(remote, known);
    if (Object.keys(extras).length > 0) {
      payload.extensions = { agentscope: extras };
    }

    events.push({
      schemaVersion: 'noesis.event.v1',
      eventId: eventIdFor(index, remote.type),
      runId: params.runId,
      attemptId: params.attemptId,
      taskId: params.taskId,
      type: toEventType(remote.type),
      timestamp: timestampFor(index),
      payload: sanitizeEventPayload(payload),
    });
  }

  return events;
}

export async function projectAgentscopeStream(
  remoteEvents: AgentscopeRemoteEvent[],
  params: ProjectAgentscopeStreamParams,
): Promise<TaskProjectionV1> {
  const events = await toNoesisAgentEvents(remoteEvents, params);
  return projectEventStream(events);
}
