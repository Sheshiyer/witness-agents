#!/usr/bin/env -S node --import tsx
// scripts/evaluate-agentscope-shadow.ts
//
// Wave B0 / Task 11 — offline evaluator for the frozen native shadow-corpus baseline.
// Validates corpus schema, recomputes structural quality/gate metrics against the
// frozen native results in the fixture, and — when explicitly given a later
// AgentScope result file — produces a deterministic JSON comparison report.
//
// This script never mutates the fixture and never auto-promotes anything: it only
// ever prints/returns promotionAllowed=false, requiresHumanReview=true.
//
// Usage:
//   node --import tsx scripts/evaluate-agentscope-shadow.ts
//   node --import tsx scripts/evaluate-agentscope-shadow.ts --agentscope-result path/to/result.json
//   node --import tsx scripts/evaluate-agentscope-shadow.ts --corpus path/to/corpus.json --out path/to/report.json

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CORPUS_PATH = join(__dirname, '..', 'tests', 'fixtures', 'agentscope-shadow-corpus.json');

export type TerminalReason = 'completed' | 'interrupted' | 'timeout' | 'error' | 'invalid';

const SHA256_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

export interface ToolCallRecord {
  toolName: string;
  authorized: boolean;
  callId: string;
}

export interface ShadowCorpusCase {
  id: string;
  category: string;
  description: string;
  input: Record<string, unknown>;
  contextPacketHash: string;
  factLockHash: string;
  allowedSourceIds: string[];
  attemptedSourceId?: string;
  nativeResult: {
    terminalReason: TerminalReason;
    eventCounts: { start: number; delta: number; end: number; interrupt: number; error: number };
    orphanSpanCount: number;
    claimCoverage: { totalClaims: number; claimsWithSource: number };
    provenanceFieldsPresent: string[];
    contradiction: { count: number };
    latencyMs: number;
    costUsd: number;
    factLockHashBefore: string;
    factLockHashAfter: string;
    committedSourceIds: string[];
    toolCalls: ToolCallRecord[];
    unauthorizedWriteCount: number;
    [key: string]: unknown;
  };
  expectedBehavior: {
    promotionAllowed: boolean;
    requiresHumanReview: boolean;
    notes?: string;
  };
}

export interface ShadowCorpus {
  schemaVersion: string;
  corpusVersion: string;
  generatedAt: string;
  description: string;
  budgets: { p95LatencyMsBudget: number; maxCostUsdBudget: number; note?: string };
  nativeBaseline: { contradictionRate: number; note?: string };
  cases: ShadowCorpusCase[];
}

const REQUIRED_PROVENANCE_FIELDS = ['contextPacketHash', 'factLockHash', 'promptHash', 'terminal'];
const CRITICAL_PROVENANCE_FIELDS = ['contextPacketHash', 'factLockHash', 'terminal'];
const TERMINAL_REASONS: TerminalReason[] = ['completed', 'interrupted', 'timeout', 'error', 'invalid'];

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
interface JsonArray extends Array<JsonValue> {}

function canonicalSerialize(value: JsonValue): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalSerialize(entry as JsonValue)).join(',')}]`;
  }

  const objectEntries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalSerialize((value as JsonObject)[key])}`);
  return `{${objectEntries.join(',')}}`;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export interface ShadowCorpusCaseHashInput {
  id: string;
  category: string;
  description: string;
  input: Record<string, unknown>;
  allowedSourceIds: string[];
  attemptedSourceId?: string;
  nativeResult: {
    factLockHashBefore: string;
    factLockHashAfter: string;
    [key: string]: unknown;
  };
}

export function computeContextPacketHash(kase: ShadowCorpusCaseHashInput): string {
  const material: {
    caseId: string;
    category: string;
    description: string;
    input: Record<string, unknown>;
    allowedSourceIds: string[];
    attemptedSourceId?: string;
  } = {
    caseId: kase.id,
    category: kase.category,
    description: kase.description,
    input: kase.input,
    allowedSourceIds: kase.allowedSourceIds,
  };
  if (kase.attemptedSourceId !== undefined) {
    material.attemptedSourceId = kase.attemptedSourceId;
  }
  return `sha256:${sha256Hex(canonicalSerialize(material as JsonValue))}`;
}

export function computeFactLockHash(kase: ShadowCorpusCaseHashInput, contextPacketHash: string): string {
  const { factLockHashBefore: _skipBefore, factLockHashAfter: _skipAfter, ...nativeWithoutFactLock } = kase.nativeResult;
  const material = {
    caseId: kase.id,
    category: kase.category,
    contextPacketHash,
    nativeResult: nativeWithoutFactLock,
  };
  return `sha256:${sha256Hex(canonicalSerialize(material as JsonValue))}`;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireValidHash(value: unknown, label: string): string {
  const str = requireNonEmptyString(value, label);
  if (!SHA256_HASH_PATTERN.test(str)) {
    throw new Error(`${label} must match sha256:<64 lowercase hex> ('${str}' is not a valid digest)`);
  }
  return str;
}

function requireStringArray(value: unknown, label: string): string[] {
  const arr = requireArray(value, label);
  for (const [i, entry] of arr.entries()) {
    if (typeof entry !== 'string') {
      throw new Error(`${label}[${i}] must be a string`);
    }
  }
  return arr as string[];
}

function requireEventCounts(
  value: unknown,
  label: string,
): { start: number; delta: number; end: number; interrupt: number; error: number } {
  if (value === null || typeof value !== 'object') {
    throw new Error(`${label} must be an object`);
  }
  const v = value as Record<string, unknown>;
  const fields = ['start', 'delta', 'end', 'interrupt', 'error'] as const;
  for (const field of fields) {
    const n = v[field];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
      throw new Error(`${label}.${field} must be a non-negative integer`);
    }
  }
  return {
    start: v.start as number,
    delta: v.delta as number,
    end: v.end as number,
    interrupt: v.interrupt as number,
    error: v.error as number,
  };
}

function requireToolCalls(value: unknown, label: string): ToolCallRecord[] {
  const arr = requireArray(value, label);
  const seenCallIds = new Set<string>();
  return arr.map((entry, i) => {
    if (entry === null || typeof entry !== 'object') {
      throw new Error(`${label}[${i}] must be an object`);
    }
    const t = entry as Record<string, unknown>;
    const toolName = requireNonEmptyString(t.toolName, `${label}[${i}].toolName`);
    const callId = requireNonEmptyString(t.callId, `${label}[${i}].callId`);
    if (typeof t.authorized !== 'boolean') {
      throw new Error(`${label}[${i}].authorized must be a boolean`);
    }
    if (seenCallIds.has(callId)) {
      throw new Error(`${label}[${i}].callId '${callId}' is a duplicate`);
    }
    seenCallIds.add(callId);
    return { toolName, authorized: t.authorized, callId };
  });
}

export function parseShadowCorpusCase(raw: unknown, label: string): ShadowCorpusCase {
  const kase = requireObject(raw, label);

  const id = requireNonEmptyString(kase.id, `${label}.id`);
  const category = requireNonEmptyString(kase.category, `${label}.category`);
  const description = requireNonEmptyString(kase.description, `${label}.description`);
  const input = requireObject(kase.input, `${label}.input`);
  const contextPacketHash = requireValidHash(kase.contextPacketHash, `${label}.contextPacketHash`);
  const factLockHash = requireValidHash(kase.factLockHash, `${label}.factLockHash`);
  const allowedSourceIds = requireStringArray(kase.allowedSourceIds, `${label}.allowedSourceIds`);

  const attemptedSourceId =
    kase.attemptedSourceId === undefined
      ? undefined
      : requireNonEmptyString(kase.attemptedSourceId, `${label}.attemptedSourceId`);

  const rawNativeResult = requireObject(kase.nativeResult, `${label}.nativeResult`);
  const terminalReason = rawNativeResult.terminalReason as TerminalReason;
  if (!TERMINAL_REASONS.includes(terminalReason)) {
    throw new Error(`${label}.nativeResult.terminalReason must be one of ${TERMINAL_REASONS.join(', ')}`);
  }

  const provenanceFields = requireStringArray(
    rawNativeResult.provenanceFieldsPresent,
    `${label}.nativeResult.provenanceFieldsPresent`,
  );
  for (const required of REQUIRED_PROVENANCE_FIELDS) {
    if (!provenanceFields.includes(required)) {
      throw new Error(`${label}.nativeResult.provenanceFieldsPresent missing required field '${required}'`);
    }
  }

  const claimCoverage = requireObject(rawNativeResult.claimCoverage, `${label}.nativeResult.claimCoverage`);
  const totalClaims = claimCoverage.totalClaims;
  const claimsWithSource = claimCoverage.claimsWithSource;
  if (typeof totalClaims !== 'number' || typeof claimsWithSource !== 'number') {
    throw new Error(`${label}.nativeResult.claimCoverage must have numeric totalClaims and claimsWithSource`);
  }
  if (totalClaims < 0 || claimsWithSource < 0) {
    throw new Error(`${label}.nativeResult.claimCoverage values must be non-negative`);
  }
  if (claimsWithSource > totalClaims) {
    throw new Error(`${label}.nativeResult.claimCoverage.claimsWithSource cannot exceed totalClaims`);
  }

  const orphanSpanCount = rawNativeResult.orphanSpanCount;
  if (typeof orphanSpanCount !== 'number' || orphanSpanCount < 0) {
    throw new Error(`${label}.nativeResult.orphanSpanCount must be a non-negative number`);
  }

  const latencyMs = rawNativeResult.latencyMs;
  const costUsd = rawNativeResult.costUsd;
  if (typeof latencyMs !== 'number' || typeof costUsd !== 'number') {
    throw new Error(`${label}.nativeResult.latencyMs and costUsd must be numbers`);
  }

  const factLockHashBefore = requireValidHash(rawNativeResult.factLockHashBefore, `${label}.nativeResult.factLockHashBefore`);
  const factLockHashAfter = requireValidHash(rawNativeResult.factLockHashAfter, `${label}.nativeResult.factLockHashAfter`);
  const committedSourceIds = requireStringArray(rawNativeResult.committedSourceIds, `${label}.nativeResult.committedSourceIds`);
  const toolCalls = requireToolCalls(rawNativeResult.toolCalls, `${label}.nativeResult.toolCalls`);
  const unauthorizedWriteCount = rawNativeResult.unauthorizedWriteCount;
  if (typeof unauthorizedWriteCount !== 'number' || unauthorizedWriteCount < 0) {
    throw new Error(`${label}.nativeResult.unauthorizedWriteCount must be a non-negative number`);
  }

  const contradiction = requireObject(rawNativeResult.contradiction, `${label}.nativeResult.contradiction`);
  const contradictionCount = contradiction.count;
  if (typeof contradictionCount !== 'number' || contradictionCount < 0) {
    throw new Error(`${label}.nativeResult.contradiction.count must be a non-negative number`);
  }

  const expectedBehavior = requireObject(kase.expectedBehavior, `${label}.expectedBehavior`);
  const promotionAllowed = expectedBehavior.promotionAllowed;
  const requiresHumanReview = expectedBehavior.requiresHumanReview;
  if (typeof promotionAllowed !== 'boolean' || typeof requiresHumanReview !== 'boolean') {
    throw new Error(`${label}.expectedBehavior.promotionAllowed and requiresHumanReview must be booleans`);
  }

  return {
    id,
    category,
    description,
    input,
    contextPacketHash,
    factLockHash,
    allowedSourceIds,
    attemptedSourceId,
    nativeResult: {
      ...rawNativeResult,
      terminalReason,
      eventCounts: requireEventCounts(rawNativeResult.eventCounts, `${label}.nativeResult.eventCounts`),
      claimCoverage: {
        totalClaims,
        claimsWithSource,
      },
      contradiction: {
        count: contradictionCount,
      },
      orphanSpanCount,
      latencyMs,
      costUsd,
      provenanceFieldsPresent: provenanceFields as string[],
      factLockHashBefore,
      factLockHashAfter,
      committedSourceIds,
      toolCalls,
      unauthorizedWriteCount,
    },
    expectedBehavior: {
      ...expectedBehavior,
      promotionAllowed,
      requiresHumanReview,
    },
  };
}

export function validateShadowCorpus(raw: unknown): ShadowCorpus {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('ShadowCorpus must be an object');
  }
  const c = raw as Record<string, unknown>;
  const schemaVersion = requireNonEmptyString(c.schemaVersion, 'ShadowCorpus.schemaVersion');
  const corpusVersion = requireNonEmptyString(c.corpusVersion, 'ShadowCorpus.corpusVersion');
  const generatedAt = requireNonEmptyString(c.generatedAt, 'ShadowCorpus.generatedAt');
  const description = requireNonEmptyString(c.description, 'ShadowCorpus.description');
  const budgets = requireObject(c.budgets, 'ShadowCorpus.budgets');
  const p95LatencyMsBudget = budgets.p95LatencyMsBudget;
  const maxCostUsdBudget = budgets.maxCostUsdBudget;
  if (typeof p95LatencyMsBudget !== 'number' || p95LatencyMsBudget < 0) {
    throw new Error('ShadowCorpus.budgets.p95LatencyMsBudget must be a non-negative number');
  }
  if (typeof maxCostUsdBudget !== 'number' || maxCostUsdBudget < 0) {
    throw new Error('ShadowCorpus.budgets.maxCostUsdBudget must be a non-negative number');
  }
  const nativeBaseline = requireObject(c.nativeBaseline, 'ShadowCorpus.nativeBaseline');
  const contradictionRate = nativeBaseline.contradictionRate;
  if (typeof contradictionRate !== 'number' || contradictionRate < 0) {
    throw new Error('ShadowCorpus.nativeBaseline.contradictionRate must be a non-negative number');
  }
  const cases = requireArray(c.cases, 'ShadowCorpus.cases').map((kase, index) =>
    parseShadowCorpusCase(kase, `ShadowCorpus.cases[${index}]`),
  );
  if (cases.length === 0) {
    throw new Error('ShadowCorpus.cases must be non-empty');
  }

  const seenIds = new Set<string>();
  for (const [index, kase] of cases.entries()) {
    const label = `ShadowCorpus.cases[${index}]`;
    const id = kase.id;
    if (seenIds.has(id)) {
      throw new Error(`${label}.id '${id}' is a duplicate`);
    }
    seenIds.add(id);
    const contextPacketHash = kase.contextPacketHash;
    const factLockHash = kase.factLockHash;
    const allowedSourceIds = kase.allowedSourceIds;
    const nativeResult = kase.nativeResult;

    const expectedContextPacketHash = computeContextPacketHash(kase);
    if (contextPacketHash !== expectedContextPacketHash) {
      throw new Error(
        `${label}.contextPacketHash does not match deterministic material ` +
          `('${contextPacketHash}' !== '${expectedContextPacketHash}')`,
      );
    }

    // --- Evidentiary FactLock immutability: explicit before/after hashes, required and validated. ---
    const factLockHashBefore = nativeResult.factLockHashBefore;
    const factLockHashAfter = nativeResult.factLockHashAfter;
    if (factLockHashBefore !== factLockHashAfter) {
      throw new Error(
        `${label}.nativeResult.factLockHashBefore ('${factLockHashBefore}') must equal factLockHashAfter ` +
          `('${factLockHashAfter}')`,
      );
    }
    const expectedFactLockHash = computeFactLockHash(kase, contextPacketHash);
    if (factLockHash !== expectedFactLockHash) {
      throw new Error(
        `${label}.factLockHash does not match deterministic material ` +
          `('${factLockHash}' !== '${expectedFactLockHash}')`,
      );
    }
    if (factLockHashBefore !== factLockHash) {
      throw new Error(
        `${label}.nativeResult.factLockHashBefore must equal ${label}.factLockHash ` +
          `('${factLockHashBefore}' !== '${factLockHash}')`,
      );
    }

    // --- Evidentiary unauthorized writes/tool calls: explicit committedSourceIds + toolCalls + count. ---
    const committedSourceIds = requireStringArray(
      nativeResult.committedSourceIds,
      `${label}.nativeResult.committedSourceIds`,
    );
    const toolCalls = requireToolCalls(nativeResult.toolCalls, `${label}.nativeResult.toolCalls`);
    if (typeof nativeResult.unauthorizedWriteCount !== 'number' || nativeResult.unauthorizedWriteCount < 0) {
      throw new Error(`${label}.nativeResult.unauthorizedWriteCount must be a non-negative number`);
    }
    const actualUnauthorizedWrites = committedSourceIds.filter((id) => !allowedSourceIds.includes(id)).length;
    if (actualUnauthorizedWrites !== nativeResult.unauthorizedWriteCount) {
      throw new Error(
        `${label}.nativeResult.unauthorizedWriteCount (${nativeResult.unauthorizedWriteCount}) does not match ` +
          `committedSourceIds outside allowedSourceIds (${actualUnauthorizedWrites})`,
      );
    }
    void factLockHashAfter;
    void toolCalls;

    const expected = kase.expectedBehavior as Record<string, unknown> | undefined;
    if (!expected || typeof expected.promotionAllowed !== 'boolean' || typeof expected.requiresHumanReview !== 'boolean') {
      throw new Error(`${label}.expectedBehavior.promotionAllowed and requiresHumanReview must be booleans`);
    }
    if (expected.promotionAllowed !== false) {
      throw new Error(`${label}.expectedBehavior.promotionAllowed must be false for a native-only baseline corpus`);
    }
    if (expected.requiresHumanReview !== true) {
      throw new Error(`${label}.expectedBehavior.requiresHumanReview must be true for a native-only baseline corpus`);
    }
  }

  return {
    schemaVersion,
    corpusVersion,
    generatedAt,
    description,
    budgets: {
      p95LatencyMsBudget,
      maxCostUsdBudget,
      ...(typeof budgets.note === 'string' ? { note: budgets.note } : {}),
    },
    nativeBaseline: {
      contradictionRate,
      ...(typeof nativeBaseline.note === 'string' ? { note: nativeBaseline.note } : {}),
    },
    cases,
  };
}

export interface CaseGateMetrics {
  caseId: string;
  category: string;
  terminalEventCoverage: boolean;
  orphanSpanCount: number;
  finalClaimSourceCoverageRatio: number;
  criticalProvenanceFieldsPresent: boolean;
  contradictionCount: number;
  latencyMs: number;
  costUsd: number;
  withinLatencyBudget: boolean;
  withinCostBudget: boolean;
  factLockImmutable: boolean;
  noUnauthorizedWrites: boolean;
}

export interface GateSummary {
  totalCases: number;
  zeroFactLockMutations: boolean;
  zeroUnauthorizedWrites: boolean;
  terminalEventCoveragePct: number;
  zeroOrphanSpans: boolean;
  finalClaimSourceCoveragePct: number;
  zeroCriticalProvenanceFieldLoss: boolean;
  contradictionRate: number;
  contradictionRateRegressed: boolean;
  p95LatencyMs: number;
  withinP95LatencyBudget: boolean;
  totalCostUsd: number;
  withinCostBudget: boolean;
  cancellationTimeoutDuplicateProviderFailureOk: boolean;
}

export interface EvaluationReport {
  schemaVersion: 'noesis.shadow-eval-report.v1';
  corpusVersion: string;
  evaluatedAt: string | null;
  caseMetrics: CaseGateMetrics[];
  gateSummary: GateSummary;
  promotionAllowed: boolean;
  requiresHumanReview: boolean;
  comparison: AgentScopeComparison | null;
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

// --- Evidentiary FactLock check: both hashes must exist, be valid digests, and exactly match
// each other plus the case-level FactLock hash. Any drift here is a mutation, full stop. ---
function isFactLockImmutable(kase: ShadowCorpusCase): boolean {
  const { factLockHashBefore, factLockHashAfter } = kase.nativeResult;
  if (!SHA256_HASH_PATTERN.test(factLockHashBefore) || !SHA256_HASH_PATTERN.test(factLockHashAfter)) {
    return false;
  }
  return factLockHashBefore === factLockHashAfter && factLockHashBefore === kase.factLockHash;
}

// --- Evidentiary unauthorized-write/tool-call check: every committed source must be allowed,
// every tool call must be authorized, and the declared count must be exactly zero. ---
function hasNoUnauthorizedWrites(kase: ShadowCorpusCase): boolean {
  const { committedSourceIds, toolCalls, unauthorizedWriteCount } = kase.nativeResult;
  const allCommittedAllowed = committedSourceIds.every((id) => kase.allowedSourceIds.includes(id));
  const allToolCallsAuthorized = toolCalls.every((t) => t.authorized === true);
  return allCommittedAllowed && allToolCallsAuthorized && unauthorizedWriteCount === 0;
}

function computeCaseMetrics(kase: ShadowCorpusCase): CaseGateMetrics {
  const nr = kase.nativeResult;
  const totalClaims = nr.claimCoverage.totalClaims;
  const claimsWithSource = nr.claimCoverage.claimsWithSource;
  const coverageRatio = totalClaims === 0 ? 1 : claimsWithSource / totalClaims;
  const criticalPresent = CRITICAL_PROVENANCE_FIELDS.every((f) => nr.provenanceFieldsPresent.includes(f));
  const terminalCovered =
    nr.eventCounts.end + nr.eventCounts.interrupt + nr.eventCounts.error > 0 || nr.terminalReason === 'invalid';

  return {
    caseId: kase.id,
    category: kase.category,
    terminalEventCoverage: terminalCovered,
    orphanSpanCount: nr.orphanSpanCount,
    finalClaimSourceCoverageRatio: coverageRatio,
    criticalProvenanceFieldsPresent: criticalPresent,
    contradictionCount: nr.contradiction.count,
    latencyMs: nr.latencyMs,
    costUsd: nr.costUsd,
    withinLatencyBudget: true,
    withinCostBudget: true,
    factLockImmutable: isFactLockImmutable(kase),
    noUnauthorizedWrites: hasNoUnauthorizedWrites(kase),
  };
}

export function evaluateCorpus(corpus: ShadowCorpus): EvaluationReport {
  const caseMetrics = corpus.cases.map(computeCaseMetrics);

  const latencies = caseMetrics.map((m) => m.latencyMs);
  const p95 = percentile95(latencies);
  const totalCost = caseMetrics.reduce((sum, m) => sum + m.costUsd, 0);
  const totalContradictions = caseMetrics.reduce((sum, m) => sum + m.contradictionCount, 0);
  const contradictionRate = corpus.cases.length === 0 ? 0 : totalContradictions / corpus.cases.length;

  caseMetrics.forEach((m) => {
    m.withinLatencyBudget = m.latencyMs <= corpus.budgets.p95LatencyMsBudget;
    m.withinCostBudget = m.costUsd <= corpus.budgets.maxCostUsdBudget;
  });

  const behaviorCategories = ['cancellation', 'timeout', 'duplicate-event', 'provider-failure'];
  const behaviorCasesOk = corpus.cases
    .filter((kase) => behaviorCategories.includes(kase.category))
    .every((kase) => {
      if (kase.category === 'cancellation') return kase.nativeResult.terminalReason === 'interrupted';
      if (kase.category === 'timeout') return kase.nativeResult.terminalReason === 'timeout';
      if (kase.category === 'provider-failure') return kase.nativeResult.terminalReason === 'error';
      if (kase.category === 'duplicate-event') return kase.nativeResult.terminalReason === 'completed';
      return true;
    });

  const gateSummary: GateSummary = {
    totalCases: corpus.cases.length,
    zeroFactLockMutations: caseMetrics.every((m) => m.factLockImmutable),
    zeroUnauthorizedWrites: caseMetrics.every((m) => m.noUnauthorizedWrites),
    terminalEventCoveragePct: (caseMetrics.filter((m) => m.terminalEventCoverage).length / caseMetrics.length) * 100,
    zeroOrphanSpans: caseMetrics.every((m) => m.orphanSpanCount === 0),
    finalClaimSourceCoveragePct:
      (caseMetrics.filter((m) => m.finalClaimSourceCoverageRatio === 1).length / caseMetrics.length) * 100,
    zeroCriticalProvenanceFieldLoss: caseMetrics.every((m) => m.criticalProvenanceFieldsPresent),
    contradictionRate,
    contradictionRateRegressed: contradictionRate > corpus.nativeBaseline.contradictionRate,
    p95LatencyMs: p95,
    withinP95LatencyBudget: p95 <= corpus.budgets.p95LatencyMsBudget,
    totalCostUsd: totalCost,
    withinCostBudget: totalCost <= corpus.budgets.maxCostUsdBudget * corpus.cases.length,
    cancellationTimeoutDuplicateProviderFailureOk: behaviorCasesOk,
  };

  const allGatesPass =
    gateSummary.zeroFactLockMutations &&
    gateSummary.zeroUnauthorizedWrites &&
    gateSummary.terminalEventCoveragePct === 100 &&
    gateSummary.zeroOrphanSpans &&
    gateSummary.finalClaimSourceCoveragePct === 100 &&
    gateSummary.zeroCriticalProvenanceFieldLoss &&
    !gateSummary.contradictionRateRegressed &&
    gateSummary.withinP95LatencyBudget &&
    gateSummary.withinCostBudget &&
    gateSummary.cancellationTimeoutDuplicateProviderFailureOk;
  void allGatesPass;

  return {
    schemaVersion: 'noesis.shadow-eval-report.v1',
    corpusVersion: corpus.corpusVersion,
    evaluatedAt: null,
    caseMetrics,
    gateSummary,
    // This is a native-only baseline evaluator. Even when every gate passes, promotion
    // is never automatic — a human must review before any AgentScope executor is promoted.
    promotionAllowed: false,
    requiresHumanReview: true,
    comparison: null,
  };
}

export interface AgentScopeResultCase {
  caseId: string;
  terminalReason: TerminalReason;
  eventCounts: { start: number; delta: number; end: number; interrupt: number; error: number };
  claimCoverage: { totalClaims: number; claimsWithSource: number };
  contradiction: { count: number };
  latencyMs: number;
  costUsd: number;
  provenanceFieldsPresent: string[];
  orphanSpanCount: number;
  factLockHashBefore: string;
  factLockHashAfter: string;
  committedSourceIds: string[];
  toolCalls: ToolCallRecord[];
  unauthorizedWriteCount: number;
}

export interface AgentScopeResultFile {
  schemaVersion: string;
  cases: AgentScopeResultCase[];
}

export interface AgentScopeComparison {
  schemaVersion: 'noesis.shadow-comparison.v1';
  matchedCaseCount: number;
  missingCaseIds: string[];
  regressions: Array<{ caseId: string; field: string; nativeValue: unknown; agentscopeValue: unknown }>;
  agentscopeP95LatencyMs: number;
  agentscopeWithinLatencyBudget: boolean;
  agentscopeTotalCostUsd: number;
  agentscopeWithinCostBudget: boolean;
  agentscopeContradictionRate: number;
  agentscopeContradictionRegressed: boolean;
  zeroFactLockMutations: boolean;
  zeroUnauthorizedWrites: boolean;
  terminalEventCoveragePct: number;
  zeroOrphanSpans: boolean;
  finalClaimSourceCoveragePct: number;
  zeroCriticalProvenanceFieldLoss: boolean;
  cancellationTimeoutDuplicateProviderFailureOk: boolean;
  comparisonClean: boolean;
  promotionAllowed: boolean;
  requiresHumanReview: boolean;
}

// --- Strict validation of an untrusted AgentScope result file. Never defaults missing
// security evidence to zero/authorized — a missing field is a validation error. ---
export function validateAgentScopeResultFile(corpus: ShadowCorpus, raw: unknown): AgentScopeResultFile {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('AgentScopeResultFile must be an object');
  }
  const r = raw as Record<string, unknown>;
  requireNonEmptyString(r.schemaVersion, 'AgentScopeResultFile.schemaVersion');
  const rawCases = requireArray(r.cases, 'AgentScopeResultFile.cases') as Record<string, unknown>[];

  const knownCaseIds = new Set(corpus.cases.map((k) => k.id));
  const seenCaseIds = new Set<string>();
  const cases: AgentScopeResultCase[] = rawCases.map((kase, index) => {
    const label = `AgentScopeResultFile.cases[${index}]`;
    const caseId = requireNonEmptyString(kase.caseId, `${label}.caseId`);
    if (seenCaseIds.has(caseId)) {
      throw new Error(`${label}.caseId '${caseId}' is a duplicate`);
    }
    seenCaseIds.add(caseId);
    if (!knownCaseIds.has(caseId)) {
      throw new Error(`${label}.caseId '${caseId}' is not a known corpus case id`);
    }
    if (!TERMINAL_REASONS.includes(kase.terminalReason as TerminalReason)) {
      throw new Error(`${label}.terminalReason must be one of ${TERMINAL_REASONS.join(', ')}`);
    }
    const eventCounts = requireEventCounts(kase.eventCounts, `${label}.eventCounts`);
    const claimCoverage = kase.claimCoverage as Record<string, unknown> | undefined;
    if (!claimCoverage || typeof claimCoverage.totalClaims !== 'number' || typeof claimCoverage.claimsWithSource !== 'number') {
      throw new Error(`${label}.claimCoverage must have numeric totalClaims and claimsWithSource`);
    }
    if (claimCoverage.totalClaims < 0 || claimCoverage.claimsWithSource < 0) {
      throw new Error(`${label}.claimCoverage values must be non-negative`);
    }
    if (claimCoverage.claimsWithSource > claimCoverage.totalClaims) {
      throw new Error(`${label}.claimCoverage.claimsWithSource cannot exceed totalClaims`);
    }
    const contradiction = kase.contradiction as Record<string, unknown> | undefined;
    if (!contradiction || typeof contradiction.count !== 'number' || contradiction.count < 0) {
      throw new Error(`${label}.contradiction.count must be a non-negative number`);
    }
    if (typeof kase.latencyMs !== 'number' || typeof kase.costUsd !== 'number') {
      throw new Error(`${label}.latencyMs and costUsd must be numbers`);
    }
    const provenanceFieldsPresent = requireStringArray(kase.provenanceFieldsPresent, `${label}.provenanceFieldsPresent`);
    if (typeof kase.orphanSpanCount !== 'number' || kase.orphanSpanCount < 0) {
      throw new Error(`${label}.orphanSpanCount must be a non-negative number`);
    }
    const factLockHashBefore = requireValidHash(kase.factLockHashBefore, `${label}.factLockHashBefore`);
    const factLockHashAfter = requireValidHash(kase.factLockHashAfter, `${label}.factLockHashAfter`);
    const committedSourceIds = requireStringArray(kase.committedSourceIds, `${label}.committedSourceIds`);
    const toolCalls = requireToolCalls(kase.toolCalls, `${label}.toolCalls`);
    if (typeof kase.unauthorizedWriteCount !== 'number' || kase.unauthorizedWriteCount < 0) {
      throw new Error(`${label}.unauthorizedWriteCount must be a non-negative number`);
    }

    return {
      caseId,
      terminalReason: kase.terminalReason as TerminalReason,
      eventCounts,
      claimCoverage: claimCoverage as { totalClaims: number; claimsWithSource: number },
      contradiction: contradiction as { count: number },
      latencyMs: kase.latencyMs,
      costUsd: kase.costUsd,
      provenanceFieldsPresent,
      orphanSpanCount: kase.orphanSpanCount,
      factLockHashBefore,
      factLockHashAfter,
      committedSourceIds,
      toolCalls,
      unauthorizedWriteCount: kase.unauthorizedWriteCount,
    };
  });

  return { schemaVersion: requireNonEmptyString(r.schemaVersion, 'AgentScopeResultFile.schemaVersion'), cases };
}

function agentscopeFactLockImmutable(agentscopeCase: AgentScopeResultCase, kase: ShadowCorpusCase): boolean {
  const { factLockHashBefore, factLockHashAfter } = agentscopeCase;
  if (!SHA256_HASH_PATTERN.test(factLockHashBefore) || !SHA256_HASH_PATTERN.test(factLockHashAfter)) {
    return false;
  }
  return factLockHashBefore === factLockHashAfter && factLockHashBefore === kase.factLockHash;
}

function agentscopeNoUnauthorizedWrites(agentscopeCase: AgentScopeResultCase, kase: ShadowCorpusCase): boolean {
  const allCommittedAllowed = agentscopeCase.committedSourceIds.every((id) => kase.allowedSourceIds.includes(id));
  const allToolCallsAuthorized = agentscopeCase.toolCalls.every((t) => t.authorized === true);
  return allCommittedAllowed && allToolCallsAuthorized && agentscopeCase.unauthorizedWriteCount === 0;
}

export function compareAgentScopeResult(corpus: ShadowCorpus, resultFile: AgentScopeResultFile): AgentScopeComparison {
  const byId = new Map(resultFile.cases.map((c) => [c.caseId, c]));
  const missingCaseIds: string[] = [];
  const regressions: AgentScopeComparison['regressions'] = [];
  let matchedCaseCount = 0;
  const latencies: number[] = [];
  let totalCost = 0;
  let totalContradictions = 0;

  let terminalCoveredCount = 0;
  let claimCoverageCompleteCount = 0;
  let orphanSpanFreeCount = 0;
  let criticalProvenancePresentCount = 0;
  let factLockImmutableCount = 0;
  let noUnauthorizedWritesCount = 0;

  for (const kase of corpus.cases) {
    const agentscopeCase = byId.get(kase.id);
    if (!agentscopeCase) {
      missingCaseIds.push(kase.id);
      continue;
    }
    matchedCaseCount += 1;
    latencies.push(agentscopeCase.latencyMs);
    totalCost += agentscopeCase.costUsd;
    totalContradictions += agentscopeCase.contradiction.count;

    if (agentscopeCase.terminalReason !== kase.nativeResult.terminalReason) {
      regressions.push({
        caseId: kase.id,
        field: 'terminalReason',
        nativeValue: kase.nativeResult.terminalReason,
        agentscopeValue: agentscopeCase.terminalReason,
      });
    }

    const nativeCoverageComplete = kase.nativeResult.claimCoverage.claimsWithSource === kase.nativeResult.claimCoverage.totalClaims;
    const agentscopeCoverageComplete = agentscopeCase.claimCoverage.claimsWithSource === agentscopeCase.claimCoverage.totalClaims;
    if (nativeCoverageComplete && !agentscopeCoverageComplete) {
      regressions.push({
        caseId: kase.id,
        field: 'claimCoverage',
        nativeValue: kase.nativeResult.claimCoverage,
        agentscopeValue: agentscopeCase.claimCoverage,
      });
    }
    if (agentscopeCoverageComplete) claimCoverageCompleteCount += 1;

    if (agentscopeCase.orphanSpanCount > 0) {
      regressions.push({
        caseId: kase.id,
        field: 'orphanSpanCount',
        nativeValue: 0,
        agentscopeValue: agentscopeCase.orphanSpanCount,
      });
    } else {
      orphanSpanFreeCount += 1;
    }

    const criticalPresent = CRITICAL_PROVENANCE_FIELDS.every((f) => agentscopeCase.provenanceFieldsPresent.includes(f));
    if (!criticalPresent) {
      for (const required of CRITICAL_PROVENANCE_FIELDS) {
        if (!agentscopeCase.provenanceFieldsPresent.includes(required)) {
          regressions.push({
            caseId: kase.id,
            field: `provenanceFieldsPresent.${required}`,
            nativeValue: true,
            agentscopeValue: false,
          });
        }
      }
    } else {
      criticalProvenancePresentCount += 1;
    }

    // Terminal event coverage is derived strictly from explicit eventCounts evidence
    // (end + interrupt + error > 0), not from the declared terminalReason label — a
    // valid label with zero terminal events must NOT count as covered.
    const terminalCovered = agentscopeCase.eventCounts.end + agentscopeCase.eventCounts.interrupt + agentscopeCase.eventCounts.error > 0;
    if (terminalCovered) terminalCoveredCount += 1;
    else {
      regressions.push({
        caseId: kase.id,
        field: 'terminalEventCoverage',
        nativeValue: true,
        agentscopeValue: false,
      });
    }

    const terminalKindByReason: Partial<Record<TerminalReason, 'end' | 'interrupt' | 'error'>> = {
      completed: 'end',
      interrupted: 'interrupt',
      timeout: 'end',
      error: 'error',
    };
    const expectedKind = terminalKindByReason[agentscopeCase.terminalReason];
    if (expectedKind && agentscopeCase.eventCounts[expectedKind] <= 0) {
      regressions.push({
        caseId: kase.id,
        field: 'terminalEventKindConsistency',
        nativeValue: `${agentscopeCase.terminalReason} -> ${expectedKind}`,
        agentscopeValue: agentscopeCase.eventCounts,
      });
    }

    const factLockOk = agentscopeFactLockImmutable(agentscopeCase, kase);
    if (factLockOk) {
      factLockImmutableCount += 1;
    } else {
      regressions.push({
        caseId: kase.id,
        field: 'factLockMutation',
        nativeValue: { before: kase.factLockHash, after: kase.factLockHash },
        agentscopeValue: { before: agentscopeCase.factLockHashBefore, after: agentscopeCase.factLockHashAfter },
      });
    }

    const unauthorizedOk = agentscopeNoUnauthorizedWrites(agentscopeCase, kase);
    if (unauthorizedOk) {
      noUnauthorizedWritesCount += 1;
    } else {
      regressions.push({
        caseId: kase.id,
        field: 'unauthorizedWrites',
        nativeValue: 0,
        agentscopeValue: agentscopeCase.unauthorizedWriteCount,
      });
    }
  }

  const agentscopeP95 = percentile95(latencies);
  const agentscopeContradictionRate = corpus.cases.length === 0 ? 0 : totalContradictions / corpus.cases.length;
  const totalCases = corpus.cases.length;

  const zeroFactLockMutations = missingCaseIds.length === 0 && factLockImmutableCount === totalCases;
  const zeroUnauthorizedWrites = missingCaseIds.length === 0 && noUnauthorizedWritesCount === totalCases;
  const terminalEventCoveragePct = totalCases === 0 ? 0 : (terminalCoveredCount / totalCases) * 100;
  const zeroOrphanSpans = missingCaseIds.length === 0 && orphanSpanFreeCount === totalCases;
  const finalClaimSourceCoveragePct = totalCases === 0 ? 0 : (claimCoverageCompleteCount / totalCases) * 100;
  const zeroCriticalProvenanceFieldLoss = missingCaseIds.length === 0 && criticalProvenancePresentCount === totalCases;
  const agentscopeWithinLatencyBudget = agentscopeP95 <= corpus.budgets.p95LatencyMsBudget;
  const agentscopeWithinCostBudget = totalCost <= corpus.budgets.maxCostUsdBudget * corpus.cases.length;
  const agentscopeContradictionRegressed = agentscopeContradictionRate > corpus.nativeBaseline.contradictionRate;

  const behaviorCategories = ['cancellation', 'timeout', 'duplicate-event', 'provider-failure'];
  const cancellationTimeoutDuplicateProviderFailureOk = corpus.cases
    .filter((kase) => behaviorCategories.includes(kase.category))
    .every((kase) => {
      const agentscopeCase = byId.get(kase.id);
      if (!agentscopeCase) return false;
      if (kase.category === 'cancellation') return agentscopeCase.terminalReason === 'interrupted';
      if (kase.category === 'timeout') return agentscopeCase.terminalReason === 'timeout';
      if (kase.category === 'provider-failure') return agentscopeCase.terminalReason === 'error';
      if (kase.category === 'duplicate-event') return agentscopeCase.terminalReason === 'completed';
      return true;
    });

  const comparisonClean =
    missingCaseIds.length === 0 &&
    regressions.length === 0 &&
    matchedCaseCount === corpus.cases.length &&
    zeroFactLockMutations &&
    zeroUnauthorizedWrites &&
    terminalEventCoveragePct === 100 &&
    zeroOrphanSpans &&
    finalClaimSourceCoveragePct === 100 &&
    zeroCriticalProvenanceFieldLoss &&
    !agentscopeContradictionRegressed &&
    agentscopeWithinLatencyBudget &&
    agentscopeWithinCostBudget &&
    cancellationTimeoutDuplicateProviderFailureOk;

  return {
    schemaVersion: 'noesis.shadow-comparison.v1',
    matchedCaseCount,
    missingCaseIds,
    regressions,
    agentscopeP95LatencyMs: agentscopeP95,
    agentscopeWithinLatencyBudget,
    agentscopeTotalCostUsd: totalCost,
    agentscopeWithinCostBudget,
    agentscopeContradictionRate,
    agentscopeContradictionRegressed,
    zeroFactLockMutations,
    zeroUnauthorizedWrites,
    terminalEventCoveragePct,
    zeroOrphanSpans,
    finalClaimSourceCoveragePct,
    zeroCriticalProvenanceFieldLoss,
    cancellationTimeoutDuplicateProviderFailureOk,
    // Comparison output never flips these to true — promotion is a separate,
    // explicit human decision outside this evaluator's scope, even when comparisonClean.
    comparisonClean,
    promotionAllowed: false,
    requiresHumanReview: true,
  };
}

function parseArgs(argv: string[]): { corpusPath: string; agentscopeResultPath?: string; outPath?: string } {
  let corpusPath = DEFAULT_CORPUS_PATH;
  let agentscopeResultPath: string | undefined;
  let outPath: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--corpus' && argv[i + 1]) {
      corpusPath = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--agentscope-result' && argv[i + 1]) {
      agentscopeResultPath = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--out' && argv[i + 1]) {
      outPath = argv[i + 1];
      i += 1;
    }
  }
  return { corpusPath, agentscopeResultPath, outPath };
}

async function main(): Promise<void> {
  const { corpusPath, agentscopeResultPath, outPath } = parseArgs(process.argv.slice(2));
  const corpus = validateShadowCorpus(JSON.parse(readFileSync(corpusPath, 'utf-8')));
  const report = evaluateCorpus(corpus);

  if (agentscopeResultPath) {
    const resultFile = validateAgentScopeResultFile(corpus, JSON.parse(readFileSync(agentscopeResultPath, 'utf-8')));
    report.comparison = compareAgentScopeResult(corpus, resultFile);
  }

  const output = JSON.stringify(report, null, 2);
  if (outPath) {
    writeFileSync(outPath, output + '\n', 'utf-8');
  }
  process.stdout.write(output + '\n');
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  main().catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exitCode = 1;
  });
}
