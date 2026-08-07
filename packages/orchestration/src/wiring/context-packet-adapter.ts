// packages/orchestration/src/wiring/context-packet-adapter.ts
// Adapter translating trusted repository payloads into the ContextPacketV1 input
// shape, delegating all invariant enforcement to the real validator in
// ../context-packet.ts (never re-implemented here).

import { validateContextPacket, type ContextPacketV1 } from '../context-packet.js';
import type { TrustedReadingRecord, ContextualInterpretationRequest, InterpretationDepth } from '../api/contextual-interpretation.js';

const DEPTH_TO_INT: Record<InterpretationDepth, 0 | 1 | 2 | 3 | 4 | 5> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5,
};

/**
 * Builds and validates a ContextPacketV1 from a trusted repository record and a
 * validated request. This is the single seam used by the contextual-interpretation
 * handler and by wiring composition/tests to keep packet assembly consistent.
 */
export function buildContextPacketFromTrustedRecord(
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
  return validateContextPacket(candidate);
}
