// packages/orchestration/src/api/contextual-interpretation.ts
// Witness Task 6: contextual interpretation endpoint (in-process handler).
//
// Design notes:
// - The public request schema is intentionally minimal and strictly validated: the
//   untrusted browser client may only supply a readingId and bounded interpretation
//   parameters. Any additional/unknown field (in particular anything that looks like
//   calculation facts, source data, or prior context) causes the whole request to be
//   REJECTED (not silently stripped) — this is a deliberate "fail loud" choice so a
//   client attempting to smuggle fabricated facts gets an explicit, auditable error
//   instead of a request that quietly "worked" with different semantics than the
//   caller expected.
// - The requesting owner identity is passed via `CallContext`, never read from the
//   request body — callers (e.g. an authenticated HTTP layer) are responsible for
//   deriving it from a verified session/token before invoking this handler.
// - Trusted facts are always loaded server-side via injected repositories.
// - Cross-owner access and "reading does not exist" produce an identical error shape
//   so an attacker cannot use error content to enumerate reading IDs.
// - L0 never touches the executor. L1+ always goes through the existing
//   ExecutorV2 seam (see ../executor-v2.ts / ../executor-validation.ts).

import type { AtomicTaskDescriptorV1, ExecutionEnvelopeV1 } from '../execution-envelope.js';
import type { ExecutorV2 } from '../executor-v2.js';
import { validateExecutorResult, type ValidationParams } from '../executor-validation.js';
import { validateContextPacket, hashContextPacket, hashFactLock, type ContextPacketV1 } from '../context-packet.js';
import { createFactLock } from '../fact-lock.js';
import type { FactLock } from '../types.js';

// --- Public request contract -------------------------------------------------

export const INTERPRETATION_DEPTHS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const;
export type InterpretationDepth = (typeof INTERPRETATION_DEPTHS)[number];

const DEPTH_TO_INT: Record<InterpretationDepth, 0 | 1 | 2 | 3 | 4 | 5> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5,
};

const MAX_READING_ID_LENGTH = 128;
const MAX_QUESTION_LENGTH = 2000;
// Reject path-traversal-ish / control characters in the reading id.
const READING_ID_SAFE_PATTERN = /^[A-Za-z0-9_.-]+$/;

/** Whitelisted, bounded interpretation parameters the browser client may supply. */
export interface ContextualInterpretationParams {
  depth: InterpretationDepth;
  /** Optional free-text question to steer the interpretation (bounded length). */
  question?: string;
  /** Whether the caller is requesting relationship/dyad-aware context. */
  includeRelationship?: boolean;
}

/** The full public request body — strictly whitelisted, no calculation/context fields allowed. */
export interface ContextualInterpretationRequest {
  readingId: string;
  params: ContextualInterpretationParams;
}

export interface CallContext {
  /** Derived from an authenticated session — never read from the request body. */
  ownerId: string;
}

const TOP_LEVEL_ALLOWED_KEYS = new Set(['readingId', 'params']);
const PARAMS_ALLOWED_KEYS = new Set(['depth', 'question', 'includeRelationship']);

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

function requirePlainObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function rejectUnknownKeys(obj: Record<string, unknown>, allowed: Set<string>, label: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new RequestValidationError(`${label} contains unknown/forbidden field '${key}'`);
    }
  }
}

/**
 * Strictly validates the untrusted request body. Rejects (does not strip) any
 * unknown field — including anything that looks like a calculation payload or
 * prior-context data — so a browser client can never smuggle fabricated facts
 * into the pipeline.
 */
export function validateContextualInterpretationRequest(body: unknown): ContextualInterpretationRequest {
  const top = requirePlainObject(body, 'ContextualInterpretationRequest');
  rejectUnknownKeys(top, TOP_LEVEL_ALLOWED_KEYS, 'ContextualInterpretationRequest');

  const readingId = top.readingId;
  if (typeof readingId !== 'string' || readingId.length === 0) {
    throw new RequestValidationError('readingId must be a non-empty string');
  }
  if (readingId.length > MAX_READING_ID_LENGTH) {
    throw new RequestValidationError(`readingId exceeds maximum length of ${MAX_READING_ID_LENGTH}`);
  }
  if (!READING_ID_SAFE_PATTERN.test(readingId)) {
    throw new RequestValidationError('readingId contains disallowed characters');
  }

  const paramsRaw = requirePlainObject(top.params, 'ContextualInterpretationRequest.params');
  rejectUnknownKeys(paramsRaw, PARAMS_ALLOWED_KEYS, 'ContextualInterpretationRequest.params');

  const depth = paramsRaw.depth;
  if (typeof depth !== 'string' || !INTERPRETATION_DEPTHS.includes(depth as InterpretationDepth)) {
    throw new RequestValidationError(`params.depth must be one of ${INTERPRETATION_DEPTHS.join(', ')}`);
  }

  let question: string | undefined;
  if (paramsRaw.question !== undefined) {
    if (typeof paramsRaw.question !== 'string') {
      throw new RequestValidationError('params.question must be a string when present');
    }
    if (paramsRaw.question.length > MAX_QUESTION_LENGTH) {
      throw new RequestValidationError(`params.question exceeds maximum length of ${MAX_QUESTION_LENGTH}`);
    }
    question = paramsRaw.question;
  }

  let includeRelationship: boolean | undefined;
  if (paramsRaw.includeRelationship !== undefined) {
    if (typeof paramsRaw.includeRelationship !== 'boolean') {
      throw new RequestValidationError('params.includeRelationship must be a boolean when present');
    }
    includeRelationship = paramsRaw.includeRelationship;
  }

  return {
    readingId,
    params: {
      depth: depth as InterpretationDepth,
      question,
      includeRelationship,
    },
  };
}

// --- Trusted server-side data contracts --------------------------------------

/** Trusted, server-loaded record for a reading. Never sourced from the request body. */
export interface TrustedReadingRecord {
  readingId: string;
  ownerId: string;
  subjectRefs: string[];
  relationshipRef?: string;
  consciousnessLevel: 1 | 2 | 3 | 4 | 5;
  defaultQuestion: string;
  current: ContextPacketV1['current'];
  selectedHistory: ContextPacketV1['selectedHistory'];
  temporalContext: ContextPacketV1['temporalContext'];
  groundedPassages: ContextPacketV1['groundedPassages'];
  policy: ContextPacketV1['policy'];
}

/** Injected repository seam for loading trusted reading data. */
export interface ReadingRepository {
  getReading(readingId: string): Promise<TrustedReadingRecord | null>;
}

/** Injected adapter seam for checking active relationship/dyad grants. */
export interface RelationshipGrantChecker {
  hasActiveGrant(params: { ownerId: string; relationshipRef: string }): Promise<boolean>;
}

/** Builds the (single) atomic task descriptor used for L1+ contextual interpretation. */
export interface TaskDescriptorFactory {
  buildTaskDescriptor(packet: ContextPacketV1): AtomicTaskDescriptorV1;
}

export interface ContextualInterpretationDeps {
  readingRepo: ReadingRepository;
  grantChecker: RelationshipGrantChecker;
  /** The existing native orchestration executor seam (ExecutorV2). Never bypassed for L1+. */
  executor: ExecutorV2;
  taskDescriptorFactory: TaskDescriptorFactory;
  now?: () => string;
  runIdFactory?: () => string;
  attemptIdFactory?: () => string;
}

// --- Errors --------------------------------------------------------------

/**
 * The single, uniform "not found or not yours" error. Cross-owner access and access
 * to a nonexistent reading id MUST both surface exactly this shape/message so an
 * attacker cannot distinguish the two cases.
 */
export const READING_NOT_FOUND_MESSAGE = 'reading not found';

export interface RejectedOutcome {
  status: 'rejected';
  code: 'invalid_request' | 'not_found' | 'relationship_grant_required';
  message: string;
}

export interface CompleteOutcome {
  status: 'complete';
  readingId: string;
  packetId: string;
  depth: InterpretationDepth;
  contextPacketHash: string;
  claims: Array<{ claimId: string; content: string; sourceIds: string[] }>;
  allowedSourceIds: string[];
}

export interface CancelledOutcome {
  status: 'cancelled';
  readingId: string;
  depth: InterpretationDepth;
  reason: string;
}

export interface TimeoutOutcome {
  status: 'timeout';
  readingId: string;
  depth: InterpretationDepth;
  reason: string;
}

export interface ErrorOutcome {
  status: 'error';
  readingId: string;
  depth: InterpretationDepth;
  reason: string;
}

export type ContextualInterpretationOutcome =
  | RejectedOutcome
  | CompleteOutcome
  | CancelledOutcome
  | TimeoutOutcome
  | ErrorOutcome;

function rejected(code: RejectedOutcome['code'], message: string): RejectedOutcome {
  return { status: 'rejected', code, message };
}

// --- Packet assembly ------------------------------------------------------

function assemblePacket(
  record: TrustedReadingRecord,
  request: ContextualInterpretationRequest,
  createdAt: string,
  packetId: string,
): ContextPacketV1 {
  const allowRelationship = request.params.includeRelationship === true;
  const candidate: ContextPacketV1 = {
    schemaVersion: 'noesis.context.v1',
    packetId,
    readingId: record.readingId,
    ownerRef: record.ownerId,
    subjectRefs: record.subjectRefs,
    relationshipRef: record.relationshipRef,
    interpretationDepth: DEPTH_TO_INT[request.params.depth],
    consciousnessLevel: record.consciousnessLevel,
    question: request.params.question ?? record.defaultQuestion,
    current: record.current,
    selectedHistory: record.selectedHistory,
    temporalContext: record.temporalContext,
    groundedPassages: record.groundedPassages,
    policy: {
      ...record.policy,
      allowRelationship,
    },
    createdAt,
  };
  // Reuse the real Task 1 validator rather than re-implementing packet invariants.
  return validateContextPacket(candidate);
}

function packetToFactLock(packet: ContextPacketV1): FactLock {
  const facts: Record<string, unknown> = {
    [packet.current.sourceId]: packet.current.payload,
  };
  for (const historyItem of packet.selectedHistory) {
    facts[`history:${historyItem.readingId}:${historyItem.sourceId}`] = historyItem.excerpt;
  }
  for (const temporalItem of packet.temporalContext) {
    facts[`temporal:${temporalItem.sourceId}:${temporalItem.kind}`] = temporalItem.value;
  }
  const sources: Record<string, string> = { [packet.current.sourceId]: packet.current.sourceId };
  for (const historyItem of packet.selectedHistory) {
    sources[`history:${historyItem.readingId}:${historyItem.sourceId}`] = historyItem.sourceId;
  }
  for (const temporalItem of packet.temporalContext) {
    sources[`temporal:${temporalItem.sourceId}:${temporalItem.kind}`] = temporalItem.sourceId;
  }
  return createFactLock({
    subjectId: packet.readingId,
    subject: packet.readingId,
    facts,
    sources,
  });
}

/** Deterministic L0 rendering, derived directly from the trusted packet — no executor call. */
function renderSourceOnly(packet: ContextPacketV1): CompleteOutcome {
  const claims: CompleteOutcome['claims'] = [
    {
      claimId: `${packet.packetId}-current`,
      content:
        typeof packet.current.payload === 'string'
          ? packet.current.payload
          : JSON.stringify(packet.current.payload),
      sourceIds: [packet.current.sourceId],
    },
  ];
  for (const passage of packet.groundedPassages) {
    claims.push({
      claimId: `${packet.packetId}-grounded-${passage.id}`,
      content: passage.excerpt,
      sourceIds: [passage.source],
    });
  }
  return {
    status: 'complete',
    readingId: packet.readingId,
    packetId: packet.packetId,
    depth: 'L0',
    contextPacketHash: '',
    claims,
    allowedSourceIds: packet.policy.allowedSourceIds,
  };
}

function assertClaimsWithinAllowedSources(
  claims: Array<{ claimId: string; sourceIds: string[] }>,
  allowedSourceIds: string[],
): void {
  const allowed = new Set(allowedSourceIds);
  for (const claim of claims) {
    for (const sourceId of claim.sourceIds) {
      if (!allowed.has(sourceId)) {
        throw new Error(`claim '${claim.claimId}' references unauthorized source id '${sourceId}'`);
      }
    }
  }
}

// --- Main handler -----------------------------------------------------------

export async function handleContextualInterpretation(
  body: unknown,
  ctx: CallContext,
  deps: ContextualInterpretationDeps,
): Promise<ContextualInterpretationOutcome> {
  let request: ContextualInterpretationRequest;
  try {
    request = validateContextualInterpretationRequest(body);
  } catch (err) {
    return rejected('invalid_request', err instanceof Error ? err.message : String(err));
  }

  const record = await deps.readingRepo.getReading(request.readingId);
  // Identical error for "does not exist" and "belongs to someone else" — no
  // distinguishing information is leaked to the caller.
  if (!record || record.ownerId !== ctx.ownerId) {
    return rejected('not_found', READING_NOT_FOUND_MESSAGE);
  }

  if (request.params.includeRelationship) {
    if (!record.relationshipRef) {
      return rejected('relationship_grant_required', 'relationship context was requested but this reading has no relationship reference');
    }
    const hasGrant = await deps.grantChecker.hasActiveGrant({
      ownerId: ctx.ownerId,
      relationshipRef: record.relationshipRef,
    });
    if (!hasGrant) {
      return rejected('relationship_grant_required', 'no active relationship grant for this reading');
    }
  }

  const now = deps.now ?? (() => new Date().toISOString());
  const createdAt = now();
  const packetId = `pkt-${request.readingId}-${createdAt}`;

  let packet: ContextPacketV1;
  try {
    packet = assemblePacket(record, request, createdAt, packetId);
  } catch (err) {
    return { status: 'error', readingId: request.readingId, depth: request.params.depth, reason: err instanceof Error ? err.message : String(err) };
  }

  if (request.params.depth === 'L0') {
    const outcome = renderSourceOnly(packet);
    try {
      assertClaimsWithinAllowedSources(outcome.claims, outcome.allowedSourceIds);
    } catch (err) {
      return { status: 'error', readingId: request.readingId, depth: 'L0', reason: err instanceof Error ? err.message : String(err) };
    }
    outcome.contextPacketHash = await hashContextPacket(packet);
    return outcome;
  }

  // L1+: route through the existing native ExecutorV2 seam. No parallel execution path.
  const factLock = packetToFactLock(packet);
  const contextPacketHash = await hashContextPacket(packet);
  const factLockHash = await hashFactLock(factLock);
  const taskDescriptor = deps.taskDescriptorFactory.buildTaskDescriptor(packet);

  const runId = deps.runIdFactory ? deps.runIdFactory() : `run-${packetId}`;
  const attemptId = deps.attemptIdFactory ? deps.attemptIdFactory() : `attempt-${packetId}`;

  const envelope: ExecutionEnvelopeV1 = {
    schemaVersion: 'noesis.execution.v1',
    runId,
    attemptId,
    idempotencyKey: `${runId}-${attemptId}`,
    contextPacketHash,
    factLock,
    factLockHash,
    task: taskDescriptor,
    priorOutputRefs: [],
    allowedTools: [],
    deadlineAt: createdAt,
  };

  const groundingForTask = packet.groundedPassages.map((passage) => ({
    id: passage.id,
    source: passage.source,
    excerpt: passage.excerpt,
    score: passage.score,
  }));

  let candidate;
  try {
    candidate = await deps.executor(envelope, {
      id: taskDescriptor.taskId,
      perspective: taskDescriptor.perspective,
      dependsOn: taskDescriptor.dependsOn,
      targetTokens: taskDescriptor.targetTokens,
      temperature: taskDescriptor.temperature,
      requiresGrounding: taskDescriptor.requiresGrounding,
      buildPrompts: () => ({ system: '', user: '' }),
      meta: taskDescriptor.meta,
    } as any, { grounding: groundingForTask as any });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/cancel|interrupt/i.test(message)) {
      return { status: 'cancelled', readingId: request.readingId, depth: request.params.depth, reason: message };
    }
    if (/timeout|timed out/i.test(message)) {
      return { status: 'timeout', readingId: request.readingId, depth: request.params.depth, reason: message };
    }
    return { status: 'error', readingId: request.readingId, depth: request.params.depth, reason: message };
  }

  const terminalReason = candidate.provenance.terminal.reason;
  if (terminalReason === 'interrupted') {
    return { status: 'cancelled', readingId: request.readingId, depth: request.params.depth, reason: 'executor reported interrupted terminal state' };
  }
  if (terminalReason === 'timeout') {
    return { status: 'timeout', readingId: request.readingId, depth: request.params.depth, reason: 'executor reported timeout terminal state' };
  }
  if (terminalReason === 'error' || terminalReason === 'invalid') {
    return { status: 'error', readingId: request.readingId, depth: request.params.depth, reason: `executor reported terminal state '${terminalReason}'` };
  }

  const validationParams: ValidationParams = {
    expectedContextPacketHash: contextPacketHash,
    expectedFactLockHash: factLockHash,
    expectedTaskIds: new Set([taskDescriptor.taskId]),
    knownAttemptIds: new Set([attemptId]),
    allowedSourceIds: new Set(packet.policy.allowedSourceIds),
  };
  const validation = validateExecutorResult(candidate, validationParams);
  if (!validation.valid) {
    return { status: 'error', readingId: request.readingId, depth: request.params.depth, reason: validation.reason };
  }

  const claims = candidate.provenance.claimRefs.map((claimRef) => ({
    claimId: claimRef.claimId,
    content: validation.result.content,
    sourceIds: claimRef.sourceIds,
  }));
  // If the executor produced no explicit claim refs, fall back to a single claim
  // scoped to the packet's current source id (still validated against allowed sources).
  const finalClaims = claims.length > 0
    ? claims
    : [{ claimId: `${packetId}-output`, content: validation.result.content, sourceIds: [packet.current.sourceId] }];

  try {
    assertClaimsWithinAllowedSources(finalClaims, packet.policy.allowedSourceIds);
  } catch (err) {
    return { status: 'error', readingId: request.readingId, depth: request.params.depth, reason: err instanceof Error ? err.message : String(err) };
  }

  return {
    status: 'complete',
    readingId: request.readingId,
    packetId,
    depth: request.params.depth,
    contextPacketHash,
    claims: finalClaims,
    allowedSourceIds: packet.policy.allowedSourceIds,
  };
}
