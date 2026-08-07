// packages/orchestration/src/context-packet.ts
// Executor-neutral ContextPacketV1 schema and canonical hashing (Task 1).

import type { FactLock } from './types.js';

export interface ContextPacketV1 {
  schemaVersion: 'noesis.context.v1';
  packetId: string;
  readingId: string;
  ownerRef: string;
  subjectRefs: string[];
  relationshipRef?: string;
  interpretationDepth: 0 | 1 | 2 | 3 | 4 | 5;
  consciousnessLevel: 1 | 2 | 3 | 4 | 5;
  question: string;
  current: {
    sourceId: string;
    engineId: string;
    engineVersion: string;
    inputHash: string;
    resultHash: string;
    calculatedAt: string;
    method?: string;
    seed?: string;
    payload: unknown;
  };
  selectedHistory: Array<{
    readingId: string;
    sourceId: string;
    excerpt: string;
    excerptHash: string;
  }>;
  temporalContext: Array<{
    sourceId: string;
    kind: string;
    value: unknown;
    valueHash: string;
  }>;
  groundedPassages: Array<{
    id: string;
    source: string;
    excerpt: string;
    score: number;
    provenance: 'sourced-fact';
  }>;
  policy: {
    allowedSourceIds: string[];
    maxHistory: number;
    maxBytes: number;
    allowRelationship: boolean;
    allowResearch: boolean;
  };
  createdAt: string;
}

// --- Canonical serialization ---

function serializeCanonical(value: unknown, ancestors: Set<object>): string {
  if (value === null) {
    return 'null';
  }
  const t = typeof value;
  if (t === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new Error('canonicalize: non-finite numbers are not supported');
    }
    return JSON.stringify(value);
  }
  if (t === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new Error('canonicalize: cyclic value detected');
    }
    ancestors.add(value);
    const items = value.map((item) => serializeCanonical(item, ancestors));
    ancestors.delete(value);
    return `[${items.join(',')}]`;
  }
  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    if (ancestors.has(obj)) {
      throw new Error('canonicalize: cyclic value detected');
    }
    ancestors.add(obj);
    const keys = Object.keys(obj)
      .filter((key) => obj[key] !== undefined)
      .sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${serializeCanonical(obj[key], ancestors)}`);
    ancestors.delete(obj);
    return `{${entries.join(',')}}`;
  }
  throw new Error(`canonicalize: unsupported value type '${t}'`);
}

export function canonicalize(value: unknown): string {
  return serializeCanonical(value, new Set<object>());
}

async function sha256Hex(input: string): Promise<string> {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (!subtle) {
    throw new Error('sha256Hex: crypto.subtle is not available in this runtime');
  }
  const bytes = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', bytes);
  const view = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < view.length; i += 1) {
    hex += view[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function hashCanonical(canonical: string): Promise<string> {
  return sha256Hex(canonical);
}

export function hashString(input: string): Promise<string> {
  return sha256Hex(input);
}

// --- Validation helpers ---

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

function requireIntInRange(obj: Record<string, unknown>, key: string, label: string, min: number, max: number): number {
  const value = obj[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label}.${key} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function validateCurrent(value: unknown): ContextPacketV1['current'] {
  const c = requireObject(value, 'ContextPacketV1.current');
  const sourceId = requireNonEmptyString(c, 'sourceId', 'ContextPacketV1.current');
  const engineId = requireNonEmptyString(c, 'engineId', 'ContextPacketV1.current');
  const engineVersion = requireNonEmptyString(c, 'engineVersion', 'ContextPacketV1.current');
  const inputHash = requireNonEmptyString(c, 'inputHash', 'ContextPacketV1.current');
  const resultHash = requireNonEmptyString(c, 'resultHash', 'ContextPacketV1.current');
  const calculatedAt = requireNonEmptyString(c, 'calculatedAt', 'ContextPacketV1.current');
  if (c.method !== undefined && typeof c.method !== 'string') {
    throw new Error('ContextPacketV1.current.method must be a string when present');
  }
  if (c.seed !== undefined && typeof c.seed !== 'string') {
    throw new Error('ContextPacketV1.current.seed must be a string when present');
  }
  return {
    sourceId,
    engineId,
    engineVersion,
    inputHash,
    resultHash,
    calculatedAt,
    method: c.method as string | undefined,
    seed: c.seed as string | undefined,
    payload: c.payload,
  };
}

function validateSelectedHistory(value: unknown): ContextPacketV1['selectedHistory'] {
  if (!Array.isArray(value)) {
    throw new Error('ContextPacketV1.selectedHistory must be an array');
  }
  return value.map((item, index) => {
    const label = `ContextPacketV1.selectedHistory[${index}]`;
    const h = requireObject(item, label);
    return {
      readingId: requireNonEmptyString(h, 'readingId', label),
      sourceId: requireNonEmptyString(h, 'sourceId', label),
      excerpt: requireNonEmptyString(h, 'excerpt', label),
      excerptHash: requireNonEmptyString(h, 'excerptHash', label),
    };
  });
}

function validateTemporalContext(value: unknown): ContextPacketV1['temporalContext'] {
  if (!Array.isArray(value)) {
    throw new Error('ContextPacketV1.temporalContext must be an array');
  }
  return value.map((item, index) => {
    const label = `ContextPacketV1.temporalContext[${index}]`;
    const t = requireObject(item, label);
    return {
      sourceId: requireNonEmptyString(t, 'sourceId', label),
      kind: requireNonEmptyString(t, 'kind', label),
      value: t.value,
      valueHash: requireNonEmptyString(t, 'valueHash', label),
    };
  });
}

function validateGroundedPassages(value: unknown): ContextPacketV1['groundedPassages'] {
  if (!Array.isArray(value)) {
    throw new Error('ContextPacketV1.groundedPassages must be an array');
  }
  return value.map((item, index) => {
    const label = `ContextPacketV1.groundedPassages[${index}]`;
    const g = requireObject(item, label);
    const id = requireNonEmptyString(g, 'id', label);
    const source = requireNonEmptyString(g, 'source', label);
    const excerpt = requireNonEmptyString(g, 'excerpt', label);
    if (typeof g.score !== 'number' || !Number.isFinite(g.score)) {
      throw new Error(`${label}.score must be a finite number`);
    }
    if (g.provenance !== 'sourced-fact') {
      throw new Error(`${label}.provenance must be 'sourced-fact'`);
    }
    return { id, source, excerpt, score: g.score, provenance: 'sourced-fact' as const };
  });
}

function validatePolicy(value: unknown): ContextPacketV1['policy'] {
  const p = requireObject(value, 'ContextPacketV1.policy');
  const allowedSourceIds = requireStringArray(p, 'allowedSourceIds', 'ContextPacketV1.policy');
  if (typeof p.maxHistory !== 'number' || !Number.isInteger(p.maxHistory) || p.maxHistory < 0) {
    throw new Error('ContextPacketV1.policy.maxHistory must be a non-negative integer');
  }
  if (typeof p.maxBytes !== 'number' || !Number.isInteger(p.maxBytes) || p.maxBytes < 0) {
    throw new Error('ContextPacketV1.policy.maxBytes must be a non-negative integer');
  }
  if (typeof p.allowRelationship !== 'boolean') {
    throw new Error('ContextPacketV1.policy.allowRelationship must be a boolean');
  }
  if (typeof p.allowResearch !== 'boolean') {
    throw new Error('ContextPacketV1.policy.allowResearch must be a boolean');
  }
  return {
    allowedSourceIds,
    maxHistory: p.maxHistory,
    maxBytes: p.maxBytes,
    allowRelationship: p.allowRelationship,
    allowResearch: p.allowResearch,
  };
}

// --- Validation ---

export function validateContextPacket(packet: unknown): ContextPacketV1 {
  const p = requireObject(packet, 'ContextPacketV1');
  if (p.schemaVersion !== 'noesis.context.v1') {
    throw new Error("ContextPacketV1.schemaVersion must be 'noesis.context.v1'");
  }
  const packetId = requireNonEmptyString(p, 'packetId', 'ContextPacketV1');
  const readingId = requireNonEmptyString(p, 'readingId', 'ContextPacketV1');
  const ownerRef = requireNonEmptyString(p, 'ownerRef', 'ContextPacketV1');
  const question = requireNonEmptyString(p, 'question', 'ContextPacketV1');
  const createdAt = requireNonEmptyString(p, 'createdAt', 'ContextPacketV1');
  const subjectRefs = requireStringArray(p, 'subjectRefs', 'ContextPacketV1');
  if (p.relationshipRef !== undefined && typeof p.relationshipRef !== 'string') {
    throw new Error('ContextPacketV1.relationshipRef must be a string when present');
  }
  const interpretationDepth = requireIntInRange(p, 'interpretationDepth', 'ContextPacketV1', 0, 5) as 0 | 1 | 2 | 3 | 4 | 5;
  const consciousnessLevel = requireIntInRange(p, 'consciousnessLevel', 'ContextPacketV1', 1, 5) as 1 | 2 | 3 | 4 | 5;
  const current = validateCurrent(p.current);
  const selectedHistory = validateSelectedHistory(p.selectedHistory);
  const temporalContext = validateTemporalContext(p.temporalContext);
  const groundedPassages = validateGroundedPassages(p.groundedPassages);
  const policy = validatePolicy(p.policy);

  return {
    schemaVersion: 'noesis.context.v1',
    packetId,
    readingId,
    ownerRef,
    subjectRefs,
    relationshipRef: p.relationshipRef as string | undefined,
    interpretationDepth,
    consciousnessLevel,
    question,
    current,
    selectedHistory,
    temporalContext,
    groundedPassages,
    policy,
    createdAt,
  };
}

// --- Adapters ---

export function contextPacketToFactLock(packet: ContextPacketV1): FactLock {
  const validated = validateContextPacket(packet);
  return {
    subjectId: validated.readingId,
    subject: validated.readingId,
    facts: {
      [validated.current.sourceId]: {
        value: validated.current.payload as import('./types.js').FactValue,
        source: validated.current.sourceId,
      },
    },
    frozenAt: validated.createdAt,
    version: validated.packetId,
    retrievedContext: validated.groundedPassages.length > 0 ? validated.groundedPassages : undefined,
  };
}

export async function hashContextPacket(packet: ContextPacketV1): Promise<string> {
  const validated = validateContextPacket(packet);
  return hashCanonical(canonicalize(validated));
}

export async function hashFactLock(lock: FactLock): Promise<string> {
  return hashCanonical(canonicalize(lock));
}
