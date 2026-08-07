// packages/orchestration/src/provenance.ts
// Executor-neutral ProvenanceEnvelopeV1 schema (Task 1).

import { validateNoesisAgentEvent, isTerminalEventType, type NoesisAgentEventV1 } from './events.js';
import { canonicalize, hashCanonical } from './context-packet.js';

export type ProvenanceExecutor = 'native' | 'agentscope-2.0.5';

export type TerminalReason = 'completed' | 'interrupted' | 'timeout' | 'error' | 'invalid';

const TERMINAL_REASONS: TerminalReason[] = ['completed', 'interrupted', 'timeout', 'error', 'invalid'];

export interface ProvenanceModelCallV1 {
  role: string;
  provider: string;
  model: string;
  providerRequestId?: string;
  inputHash: string;
  outputHash: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}

export interface ProvenanceToolCallV1 {
  id: string;
  name: string;
  inputHash: string;
  outputHash?: string;
  decision: 'allowed' | 'denied' | 'asked';
  state: 'success' | 'error' | 'interrupted' | 'denied';
}

export interface ProvenanceClaimRefV1 {
  claimId: string;
  sourceIds: string[];
}

export interface ProvenanceTerminalV1 {
  reason: TerminalReason;
  outputHash?: string;
}

export interface ProvenanceEnvelopeV1 {
  schemaVersion: 'noesis.provenance.v1';
  runId: string;
  attemptId: string;
  executor: ProvenanceExecutor;
  adapterVersion: string;
  contextPacketHash: string;
  factLockHash: string;
  promptTemplateId: string;
  promptHash: string;
  modelCalls: ProvenanceModelCallV1[];
  toolCalls: ProvenanceToolCallV1[];
  claimRefs: ProvenanceClaimRefV1[];
  events: NoesisAgentEventV1[];
  terminal: ProvenanceTerminalV1;
  extensions?: { agentscope?: Record<string, unknown> };
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

function validateModelCall(value: unknown, index: number): ProvenanceModelCallV1 {
  const label = `ProvenanceEnvelopeV1.modelCalls[${index}]`;
  const m = requireObject(value, label);
  const role = requireNonEmptyString(m, 'role', label);
  const provider = requireNonEmptyString(m, 'provider', label);
  const model = requireNonEmptyString(m, 'model', label);
  const inputHash = requireNonEmptyString(m, 'inputHash', label);
  const outputHash = requireNonEmptyString(m, 'outputHash', label);
  if (typeof m.latencyMs !== 'number' || !Number.isFinite(m.latencyMs)) {
    throw new Error(`${label}.latencyMs must be a finite number`);
  }
  return {
    role,
    provider,
    model,
    providerRequestId: m.providerRequestId as string | undefined,
    inputHash,
    outputHash,
    inputTokens: m.inputTokens as number | undefined,
    outputTokens: m.outputTokens as number | undefined,
    latencyMs: m.latencyMs,
  };
}

const TOOL_DECISIONS = ['allowed', 'denied', 'asked'];
const TOOL_STATES = ['success', 'error', 'interrupted', 'denied'];

function validateToolCall(value: unknown, index: number): ProvenanceToolCallV1 {
  const label = `ProvenanceEnvelopeV1.toolCalls[${index}]`;
  const t = requireObject(value, label);
  const id = requireNonEmptyString(t, 'id', label);
  const name = requireNonEmptyString(t, 'name', label);
  const inputHash = requireNonEmptyString(t, 'inputHash', label);
  if (!TOOL_DECISIONS.includes(t.decision as string)) {
    throw new Error(`${label}.decision must be one of ${TOOL_DECISIONS.join(', ')}`);
  }
  if (!TOOL_STATES.includes(t.state as string)) {
    throw new Error(`${label}.state must be one of ${TOOL_STATES.join(', ')}`);
  }
  return {
    id,
    name,
    inputHash,
    outputHash: t.outputHash as string | undefined,
    decision: t.decision as ProvenanceToolCallV1['decision'],
    state: t.state as ProvenanceToolCallV1['state'],
  };
}

function validateClaimRef(value: unknown, index: number): ProvenanceClaimRefV1 {
  const label = `ProvenanceEnvelopeV1.claimRefs[${index}]`;
  const c = requireObject(value, label);
  const claimId = requireNonEmptyString(c, 'claimId', label);
  if (!Array.isArray(c.sourceIds) || c.sourceIds.some((s) => typeof s !== 'string')) {
    throw new Error(`${label}.sourceIds must be an array of strings`);
  }
  return { claimId, sourceIds: [...c.sourceIds] as string[] };
}

function validateTerminal(value: unknown, events: NoesisAgentEventV1[]): ProvenanceTerminalV1 {
  const t = requireObject(value, 'ProvenanceEnvelopeV1.terminal');
  if (!TERMINAL_REASONS.includes(t.reason as TerminalReason)) {
    throw new Error(`ProvenanceEnvelopeV1.terminal.reason must be one of ${TERMINAL_REASONS.join(', ')}`);
  }
  if (t.outputHash !== undefined && typeof t.outputHash !== 'string') {
    throw new Error('ProvenanceEnvelopeV1.terminal.outputHash must be a string when present');
  }
  const reason = t.reason as TerminalReason;
  const terminalEvents = events.filter((e) => isTerminalEventType(e.type));

  if (terminalEvents.length === 0) {
    throw new Error('ProvenanceEnvelopeV1 requires exactly one terminal event in events');
  }
  if (terminalEvents.length > 1) {
    throw new Error('ProvenanceEnvelopeV1 requires exactly one terminal event, found multiple');
  }

  const terminalEvent = terminalEvents[0];
  const expectedType = reason === 'completed' ? 'end' : reason === 'interrupted' ? 'interrupt' : 'error';
  if (reason === 'completed' || reason === 'interrupted' || reason === 'error' || reason === 'timeout') {
    if (terminalEvent.type !== expectedType && !(reason === 'timeout' && terminalEvent.type === 'error')) {
      throw new Error(
        `ProvenanceEnvelopeV1.terminal.reason '${reason}' is inconsistent with terminal event type '${terminalEvent.type}'`
      );
    }
  }
  if (reason === 'completed' && !t.outputHash) {
    throw new Error("ProvenanceEnvelopeV1.terminal.outputHash is required when reason is 'completed'");
  }

  return {
    reason,
    outputHash: t.outputHash as string | undefined,
  };
}

export function validateProvenanceEnvelope(provenance: unknown): ProvenanceEnvelopeV1 {
  const p = requireObject(provenance, 'ProvenanceEnvelopeV1');
  if (p.schemaVersion !== 'noesis.provenance.v1') {
    throw new Error("ProvenanceEnvelopeV1.schemaVersion must be 'noesis.provenance.v1'");
  }
  const runId = requireNonEmptyString(p, 'runId', 'ProvenanceEnvelopeV1');
  const attemptId = requireNonEmptyString(p, 'attemptId', 'ProvenanceEnvelopeV1');
  if (p.executor !== 'native' && p.executor !== 'agentscope-2.0.5') {
    throw new Error("ProvenanceEnvelopeV1.executor must be 'native' or 'agentscope-2.0.5'");
  }
  const adapterVersion = requireNonEmptyString(p, 'adapterVersion', 'ProvenanceEnvelopeV1');
  const contextPacketHash = requireNonEmptyString(p, 'contextPacketHash', 'ProvenanceEnvelopeV1');
  const factLockHash = requireNonEmptyString(p, 'factLockHash', 'ProvenanceEnvelopeV1');
  const promptTemplateId = requireNonEmptyString(p, 'promptTemplateId', 'ProvenanceEnvelopeV1');
  const promptHash = requireNonEmptyString(p, 'promptHash', 'ProvenanceEnvelopeV1');

  if (!Array.isArray(p.modelCalls)) {
    throw new Error('ProvenanceEnvelopeV1.modelCalls must be an array');
  }
  const modelCalls = p.modelCalls.map((m, i) => validateModelCall(m, i));

  if (!Array.isArray(p.toolCalls)) {
    throw new Error('ProvenanceEnvelopeV1.toolCalls must be an array');
  }
  const toolCalls = p.toolCalls.map((t, i) => validateToolCall(t, i));

  if (!Array.isArray(p.claimRefs)) {
    throw new Error('ProvenanceEnvelopeV1.claimRefs must be an array');
  }
  const claimRefs = p.claimRefs.map((c, i) => validateClaimRef(c, i));

  if (!Array.isArray(p.events)) {
    throw new Error('ProvenanceEnvelopeV1.events must be an array');
  }
  const events = p.events.map((e) => validateNoesisAgentEvent(e));

  const terminal = validateTerminal(p.terminal, events);

  let extensions: ProvenanceEnvelopeV1['extensions'];
  if (p.extensions !== undefined) {
    const ext = requireObject(p.extensions, 'ProvenanceEnvelopeV1.extensions');
    extensions = { agentscope: ext.agentscope as Record<string, unknown> | undefined };
  }

  return {
    schemaVersion: 'noesis.provenance.v1',
    runId,
    attemptId,
    executor: p.executor,
    adapterVersion,
    contextPacketHash,
    factLockHash,
    promptTemplateId,
    promptHash,
    modelCalls,
    toolCalls,
    claimRefs,
    events,
    terminal,
    extensions,
  };
}

export async function hashProvenanceEnvelope(provenance: ProvenanceEnvelopeV1): Promise<string> {
  const validated = validateProvenanceEnvelope(provenance);
  return hashCanonical(canonicalize(validated));
}
