// tests/agentscope-shadow-eval.test.ts
// Wave B0 / Task 11 — tests for the frozen native shadow-corpus baseline and
// its offline evaluator. Covers every corpus category, every hard-gate failure
// mode independently (both native and AgentScope-comparison sides), evaluator
// determinism, fixture immutability, strict result validation, and the
// no-auto-promotion guarantee.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  validateShadowCorpus,
  evaluateCorpus,
  validateAgentScopeResultFile,
  compareAgentScopeResult,
  computeContextPacketHash,
  computeFactLockHash,
  type ShadowCorpus,
  type AgentScopeResultCase,
} from '../scripts/evaluate-agentscope-shadow.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = join(__dirname, 'fixtures', 'agentscope-shadow-corpus.json');

function loadRawCorpus(): unknown {
  return JSON.parse(readFileSync(CORPUS_PATH, 'utf-8'));
}

function loadCorpus(): ShadowCorpus {
  return validateShadowCorpus(loadRawCorpus());
}

const EXPECTED_CATEGORIES = [
  'source-only-l0',
  'solo-l1',
  'solo-l2',
  'solo-l3',
  'solo-l4',
  'solo-l5',
  'relationship-authorized',
  'relationship-denied',
  'today-panchanga',
  'tarot-seeded',
  'iching-method-lines',
  'prior-reading-cap',
  'research-passage-present',
  'research-passage-absent',
  'adversarial-prompt',
  'unauthorized-source-attempt',
  'cancellation',
  'timeout',
  'duplicate-event',
  'provider-failure',
];

interface ShadowCaseForHashing {
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

function asShadowCaseForHashing(raw: Record<string, unknown>): ShadowCaseForHashing {
  const id = raw.id;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('recomputeCaseHashes requires case.id string');
  }

  const category = raw.category;
  if (typeof category !== 'string' || category.length === 0) {
    throw new Error('recomputeCaseHashes requires case.category string');
  }

  const description = raw.description;
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error('recomputeCaseHashes requires case.description string');
  }

  const input = raw.input;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('recomputeCaseHashes requires case.input object');
  }

  const allowedSourceIds = raw.allowedSourceIds;
  if (!Array.isArray(allowedSourceIds) || !allowedSourceIds.every((sourceId): sourceId is string => typeof sourceId === 'string')) {
    throw new Error('recomputeCaseHashes requires case.allowedSourceIds string[]');
  }

  const nativeResult = raw.nativeResult as Record<string, unknown>;
  if (nativeResult === null || typeof nativeResult !== 'object' || Array.isArray(nativeResult)) {
    throw new Error('recomputeCaseHashes requires case.nativeResult object');
  }

  const factLockHashBefore = nativeResult.factLockHashBefore;
  if (typeof factLockHashBefore !== 'string' || factLockHashBefore.length === 0) {
    throw new Error('recomputeCaseHashes requires case.nativeResult.factLockHashBefore string');
  }

  const factLockHashAfter = nativeResult.factLockHashAfter;
  if (typeof factLockHashAfter !== 'string' || factLockHashAfter.length === 0) {
    throw new Error('recomputeCaseHashes requires case.nativeResult.factLockHashAfter string');
  }

  const attemptedSourceId = raw.attemptedSourceId;
  if (attemptedSourceId !== undefined && (typeof attemptedSourceId !== 'string' || attemptedSourceId.length === 0)) {
    throw new Error('recomputeCaseHashes requires case.attemptedSourceId string if present');
  }

  return {
    id,
    category,
    description,
    input: input as Record<string, unknown>,
    allowedSourceIds,
    attemptedSourceId,
    nativeResult: nativeResult as {
      factLockHashBefore: string;
      factLockHashAfter: string;
      [key: string]: unknown;
    },
  };
}

function recomputeCaseHashes(kase: Record<string, unknown>): void {
  const shadowCase = asShadowCaseForHashing(kase);
  const contextPacketHash = computeContextPacketHash(shadowCase);
  const factLockHash = computeFactLockHash(shadowCase, contextPacketHash);
  const mutCase = kase as {
    contextPacketHash: string;
    factLockHash: string;
    nativeResult: { factLockHashBefore: string; factLockHashAfter: string };
  };
  mutCase.contextPacketHash = contextPacketHash;
  mutCase.factLockHash = factLockHash;
  mutCase.nativeResult.factLockHashBefore = factLockHash;
  mutCase.nativeResult.factLockHashAfter = factLockHash;
}

function recomputeCorpusHashes(rawCorpus: { cases: Record<string, unknown>[] }): void {
  for (const kase of rawCorpus.cases) {
    recomputeCaseHashes(kase);
  }
}

test('corpus fixture loads and validates against the schema', () => {
  const corpus = loadCorpus();
  assert.equal(corpus.schemaVersion, 'noesis.shadow-corpus.v2');
  assert.ok(corpus.cases.length >= EXPECTED_CATEGORIES.length);
});

test('corpus fixture is a plain, unmutated JSON document on disk (immutable fixture behavior)', () => {
  const first = readFileSync(CORPUS_PATH, 'utf-8');
  // Loading and validating the corpus twice must not alter the file on disk.
  loadCorpus();
  loadCorpus();
  const second = readFileSync(CORPUS_PATH, 'utf-8');
  assert.equal(first, second, 'fixture bytes must be identical before and after evaluation runs');
});

test('every required corpus category is present exactly once', () => {
  const corpus = loadCorpus();
  const categories = corpus.cases.map((c) => c.category);
  for (const expected of EXPECTED_CATEGORIES) {
    const count = categories.filter((c) => c === expected).length;
    assert.equal(count, 1, `expected exactly one case for category '${expected}', found ${count}`);
  }
});

test('every case declares promotionAllowed=false and requiresHumanReview=true', () => {
  const corpus = loadCorpus();
  for (const kase of corpus.cases) {
    assert.equal(kase.expectedBehavior.promotionAllowed, false, `${kase.id} must not allow promotion`);
    assert.equal(kase.expectedBehavior.requiresHumanReview, true, `${kase.id} must require human review`);
  }
});

test('every case has real sha256 contextPacketHash and factLockHash digests', () => {
  const corpus = loadCorpus();
  const HASH_RE = /^sha256:[a-f0-9]{64}$/;
  for (const kase of corpus.cases) {
    assert.ok(HASH_RE.test(kase.contextPacketHash), `${kase.id}.contextPacketHash must be a real sha256 digest`);
    assert.ok(HASH_RE.test(kase.factLockHash), `${kase.id}.factLockHash must be a real sha256 digest`);
    assert.ok(HASH_RE.test(kase.nativeResult.factLockHashBefore), `${kase.id}.nativeResult.factLockHashBefore must be a real sha256 digest`);
    assert.ok(HASH_RE.test(kase.nativeResult.factLockHashAfter), `${kase.id}.nativeResult.factLockHashAfter must be a real sha256 digest`);
  }
});

test('validateShadowCorpus rejects a corpus missing required top-level fields', () => {
  const raw = loadRawCorpus() as Record<string, unknown>;
  const broken = { ...raw };
  delete broken.corpusVersion;
  assert.throws(() => validateShadowCorpus(broken), /corpusVersion/);
});

test('validateShadowCorpus rejects duplicate case ids', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  cloned.cases.push({ ...cloned.cases[0] });
  assert.throws(() => validateShadowCorpus(cloned), /duplicate/);
});

test('validateShadowCorpus rejects a case with promotionAllowed=true (baseline must never self-promote)', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  (cloned.cases[0].expectedBehavior as Record<string, unknown>).promotionAllowed = true;
  assert.throws(() => validateShadowCorpus(cloned), /promotionAllowed must be false/);
});

test('validateShadowCorpus rejects claimsWithSource greater than totalClaims', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  const nativeResult = cloned.cases[0].nativeResult as Record<string, unknown>;
  nativeResult.claimCoverage = { totalClaims: 1, claimsWithSource: 5 };
  assert.throws(() => validateShadowCorpus(cloned), /claimsWithSource cannot exceed totalClaims/);
});

test('validateShadowCorpus rejects an invalid terminalReason', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  (cloned.cases[0].nativeResult as Record<string, unknown>).terminalReason = 'bogus';
  assert.throws(() => validateShadowCorpus(cloned), /terminalReason must be one of/);
});

test('validateShadowCorpus rejects a placeholder (non-sha256) contextPacketHash', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  cloned.cases[0].contextPacketHash = 'sha256:fixture-ctx-l0-001';
  assert.throws(() => validateShadowCorpus(cloned), /must match sha256:<64 lowercase hex>/);
});

test('validateShadowCorpus rejects a placeholder (non-sha256) factLockHash', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  cloned.cases[0].factLockHash = 'sha256:fixture-factlock-l0-001';
  assert.throws(() => validateShadowCorpus(cloned), /must match sha256:<64 lowercase hex>/);
});

test('validateShadowCorpus rejects a factLockHashBefore that does not match the case-level factLockHash', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  const nr = cloned.cases[0].nativeResult as Record<string, unknown>;
  nr.factLockHashBefore = 'sha256:' + '0'.repeat(64);
  assert.throws(() => validateShadowCorpus(cloned), /factLockHashBefore/);
});

test('validateShadowCorpus rejects an unauthorizedWriteCount that does not match committedSourceIds', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  const nr = cloned.cases[0].nativeResult as Record<string, unknown>;
  nr.unauthorizedWriteCount = 3;
  recomputeCaseHashes(cloned.cases[0]);
  assert.throws(() => validateShadowCorpus(cloned), /unauthorizedWriteCount \(3\) does not match/);
});

test('validateShadowCorpus rejects duplicate toolCall callIds', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  const nr = cloned.cases[0].nativeResult as Record<string, unknown>;
  const toolCalls = nr.toolCalls as Record<string, unknown>[];
  nr.toolCalls = [toolCalls[0], toolCalls[0]];
  recomputeCaseHashes(cloned.cases[0]);
  assert.throws(() => validateShadowCorpus(cloned), /is a duplicate/);
});

// ─── evaluateCorpus: native baseline run must pass every hard gate ───────

test('native-only baseline run passes every hard gate on the frozen fixture', () => {
  const corpus = loadCorpus();
  const report = evaluateCorpus(corpus);

  assert.equal(report.gateSummary.zeroFactLockMutations, true);
  assert.equal(report.gateSummary.zeroUnauthorizedWrites, true);
  assert.equal(report.gateSummary.terminalEventCoveragePct, 100);
  assert.equal(report.gateSummary.zeroOrphanSpans, true);
  assert.equal(report.gateSummary.finalClaimSourceCoveragePct, 100);
  assert.equal(report.gateSummary.zeroCriticalProvenanceFieldLoss, true);
  assert.equal(report.gateSummary.contradictionRateRegressed, false);
  assert.equal(report.gateSummary.withinP95LatencyBudget, true);
  assert.equal(report.gateSummary.withinCostBudget, true);
  assert.equal(report.gateSummary.cancellationTimeoutDuplicateProviderFailureOk, true);
});

test('native-only baseline run always reports promotionAllowed=false and requiresHumanReview=true (no auto-promotion)', () => {
  const corpus = loadCorpus();
  const report = evaluateCorpus(corpus);
  assert.equal(report.promotionAllowed, false);
  assert.equal(report.requiresHumanReview, true);
});

test('evaluateCorpus is deterministic across repeated runs on the same fixture', () => {
  const corpus = loadCorpus();
  const reportA = evaluateCorpus(corpus);
  const reportB = evaluateCorpus(corpus);
  assert.deepEqual(
    JSON.parse(JSON.stringify(reportA)),
    JSON.parse(JSON.stringify(reportB)),
    'two evaluations of the same corpus must be byte-for-byte identical (excluding no-op evaluatedAt)',
  );
});

test('evaluateCorpus produces per-case metrics for every corpus case', () => {
  const corpus = loadCorpus();
  const report = evaluateCorpus(corpus);
  assert.equal(report.caseMetrics.length, corpus.cases.length);
  const idsFromCorpus = corpus.cases.map((c) => c.id).sort();
  const idsFromMetrics = report.caseMetrics.map((m) => m.caseId).sort();
  assert.deepEqual(idsFromMetrics, idsFromCorpus);
});

// ─── Hard-gate failure detection (native side): each gate independently testable ──

function withMutatedCase(mutate: (kase: Record<string, unknown>) => void): ShadowCorpus {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  mutate(cloned.cases[0]);
  recomputeCaseHashes(cloned.cases[0]);
  return validateShadowCorpus(cloned);
}

test('hard gate: orphan span detected fails zeroOrphanSpans independently of other gates', () => {
  const corpus = withMutatedCase((kase) => {
    (kase.nativeResult as Record<string, unknown>).orphanSpanCount = 2;
  });
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.zeroOrphanSpans, false);
  assert.equal(report.gateSummary.zeroFactLockMutations, true, 'unrelated gates must remain unaffected');
});

test('hard gate: incomplete final-claim source coverage fails finalClaimSourceCoveragePct independently', () => {
  const corpus = withMutatedCase((kase) => {
    (kase.nativeResult as Record<string, unknown>).claimCoverage = { totalClaims: 4, claimsWithSource: 2 };
  });
  const report = evaluateCorpus(corpus);
  assert.ok(report.gateSummary.finalClaimSourceCoveragePct < 100);
  assert.equal(report.gateSummary.zeroOrphanSpans, true, 'unrelated gates must remain unaffected');
});

test('hard gate: critical provenance field loss fails zeroCriticalProvenanceFieldLoss independently', () => {
  // Bypass schema validation here: the schema already requires critical fields at
  // ingestion time, so this simulates a post-validation loss purely for the gate check.
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  (cloned.cases[0].nativeResult as Record<string, unknown>).provenanceFieldsPresent = [
    'promptHash',
    'terminal',
  ];
  const corpus = cloned as ShadowCorpus;
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.zeroCriticalProvenanceFieldLoss, false);
});

test('hard gate: contradiction rate regression vs frozen native baseline fails contradictionRateRegressed', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[]; nativeBaseline: Record<string, unknown> };
  const cloned = JSON.parse(JSON.stringify(raw));
  cloned.nativeBaseline.contradictionRate = 0;
  (cloned.cases[0].nativeResult as Record<string, unknown>).contradiction = { count: 3 };
  recomputeCaseHashes(cloned.cases[0]);
  const corpus = validateShadowCorpus(cloned);
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.contradictionRateRegressed, true);
});

test('hard gate: p95 latency budget breach fails withinP95LatencyBudget independently', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  // Push every case's latency over budget so the p95 aggregate itself breaches,
  // not just a single outlier that the percentile could absorb.
  for (const kase of cloned.cases) {
    (kase.nativeResult as Record<string, unknown>).latencyMs = 999_999;
  }
  recomputeCorpusHashes(cloned);
  const corpus = validateShadowCorpus(cloned);
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.withinP95LatencyBudget, false);
});

test('hard gate: cost budget breach fails withinCostBudget independently', () => {
  const corpus = withMutatedCase((kase) => {
    (kase.nativeResult as Record<string, unknown>).costUsd = 999;
  });
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.withinCostBudget, false);
});

test('hard gate: FactLock after-hash mutation fails zeroFactLockMutations independently', () => {
  const corpus = JSON.parse(JSON.stringify(loadCorpus())) as ShadowCorpus;
  const nr = corpus.cases[0].nativeResult as Record<string, unknown>;
  // A mutated-but-still-valid-format digest: schema validation permits this (it only
  // checks format + before === case hash), so the gate itself must be what catches it.
  nr.factLockHashAfter = 'sha256:' + '1'.repeat(64);
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.zeroFactLockMutations, false);
  assert.equal(report.gateSummary.zeroOrphanSpans, true, 'unrelated gates must remain unaffected');
});

test('hard gate: unauthorized committed source fails zeroUnauthorizedWrites independently', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  const target = cloned.cases[0];
  const nr = target.nativeResult as Record<string, unknown>;
  nr.committedSourceIds = [...(nr.committedSourceIds as string[]), 'engine:admin-internal:run-999'];
  nr.unauthorizedWriteCount = 1;
  recomputeCaseHashes(cloned.cases[0]);
  const corpus = validateShadowCorpus(cloned);
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.zeroUnauthorizedWrites, false);
  assert.equal(report.gateSummary.zeroFactLockMutations, true, 'unrelated gates must remain unaffected');
});

test('hard gate: unauthorized tool call fails zeroUnauthorizedWrites independently', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  const nr = cloned.cases[0].nativeResult as Record<string, unknown>;
  nr.toolCalls = [...(nr.toolCalls as Record<string, unknown>[]), { toolName: 'shadow-tool', authorized: false, callId: 'call-shadow-1' }];
  recomputeCaseHashes(cloned.cases[0]);
  const corpus = validateShadowCorpus(cloned);
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.zeroUnauthorizedWrites, false);
});

test('hard gate: positive unauthorizedWriteCount fails zeroUnauthorizedWrites independently', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  const target = cloned.cases[0];
  const nr = target.nativeResult as Record<string, unknown>;
  // Keep committedSourceIds/toolCalls internally consistent with the declared count so
  // schema validation passes and only the gate itself is exercised.
  nr.committedSourceIds = [...(nr.committedSourceIds as string[]), 'engine:shadow:run-1'];
  nr.unauthorizedWriteCount = 1;
  recomputeCaseHashes(target);
  const corpus = validateShadowCorpus(cloned);
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.zeroUnauthorizedWrites, false);
});

test('hard gate: unauthorized-source attempt case demonstrates a blocked attempt with no committed unauthorized source', () => {
  const corpus = loadCorpus();
  const unauthorizedCase = corpus.cases.find((c) => c.category === 'unauthorized-source-attempt');
  assert.ok(unauthorizedCase);
  assert.ok(unauthorizedCase.attemptedSourceId);
  assert.ok(!unauthorizedCase.allowedSourceIds.includes(unauthorizedCase.attemptedSourceId as string));
  assert.deepEqual(unauthorizedCase.nativeResult.committedSourceIds, [], 'the unauthorized id must never be committed');
  assert.equal(unauthorizedCase.nativeResult.unauthorizedWriteCount, 0);
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.zeroUnauthorizedWrites, true);
});

test('hard gate: missing terminal event fails terminalEventCoveragePct independently', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  const nr = cloned.cases[0].nativeResult as Record<string, unknown>;
  nr.eventCounts = { start: 1, delta: 3, end: 0, interrupt: 0, error: 0 };
  recomputeCaseHashes(cloned.cases[0]);
  const corpus = validateShadowCorpus(cloned);
  const report = evaluateCorpus(corpus);
  assert.ok(report.gateSummary.terminalEventCoveragePct < 100);
});

test('hard gate: critical provenance loss fails zeroCriticalProvenanceFieldLoss independently (duplicate of ingestion-bypass case)', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  (cloned.cases[1].nativeResult as Record<string, unknown>).provenanceFieldsPresent = ['promptHash'];
  recomputeCaseHashes(cloned.cases[1]);
  const corpus = cloned as ShadowCorpus;
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.zeroCriticalProvenanceFieldLoss, false);
});

test('hard gate: cancellation case must terminate with reason interrupted, not completed', () => {
  const corpus = loadCorpus();
  const cancellationCase = corpus.cases.find((c) => c.category === 'cancellation');
  assert.ok(cancellationCase);
  assert.equal(cancellationCase.nativeResult.terminalReason, 'interrupted');
});

test('hard gate: cancellation/timeout/duplicate/provider-failure regression fails cancellationTimeoutDuplicateProviderFailureOk', () => {
  const raw = loadRawCorpus() as { cases: Record<string, unknown>[] };
  const cloned = JSON.parse(JSON.stringify(raw));
  const timeoutCase = cloned.cases.find((c: Record<string, unknown>) => c.category === 'timeout');
  (timeoutCase.nativeResult as Record<string, unknown>).terminalReason = 'completed';
  recomputeCaseHashes(timeoutCase);
  const corpus = validateShadowCorpus(cloned);
  const report = evaluateCorpus(corpus);
  assert.equal(report.gateSummary.cancellationTimeoutDuplicateProviderFailureOk, false);
});

test('hard gate: timeout case records terminalReason=timeout, not completed', () => {
  const corpus = loadCorpus();
  const timeoutCase = corpus.cases.find((c) => c.category === 'timeout');
  assert.equal(timeoutCase?.nativeResult.terminalReason, 'timeout');
});

test('hard gate: provider-failure case records terminalReason=error with zero claims', () => {
  const corpus = loadCorpus();
  const providerFailureCase = corpus.cases.find((c) => c.category === 'provider-failure');
  assert.equal(providerFailureCase?.nativeResult.terminalReason, 'error');
  assert.equal(providerFailureCase?.nativeResult.claimCoverage.totalClaims, 0);
});

test('hard gate: relationship-denied case terminates without cross-subject claims', () => {
  const corpus = loadCorpus();
  const deniedCase = corpus.cases.find((c) => c.category === 'relationship-denied');
  assert.equal(deniedCase?.nativeResult.terminalReason, 'error');
  assert.equal(deniedCase?.nativeResult.claimCoverage.totalClaims, 0);
});

test('hard gate: adversarial-prompt case never mutates the FactLock hash (before === after === case hash)', () => {
  const corpus = loadCorpus();
  const adversarialCase = corpus.cases.find((c) => c.category === 'adversarial-prompt');
  assert.ok(adversarialCase);
  assert.equal(adversarialCase.nativeResult.terminalReason, 'completed');
  assert.equal(adversarialCase.nativeResult.factLockHashBefore, adversarialCase.factLockHash);
  assert.equal(adversarialCase.nativeResult.factLockHashAfter, adversarialCase.factLockHash);
});

test('hard gate: research-passage-absent case has no canonical:* source among allowed source ids beyond the engine source', () => {
  const corpus = loadCorpus();
  const absentCase = corpus.cases.find((c) => c.category === 'research-passage-absent');
  assert.ok(absentCase);
  assert.ok(!absentCase.allowedSourceIds.some((id) => id.startsWith('canonical:')));
});

test('hard gate: prior-reading-cap case respects policy.maxHistory', () => {
  const corpus = loadCorpus();
  const capCase = corpus.cases.find((c) => c.category === 'prior-reading-cap');
  assert.ok(capCase);
  const selected = (capCase.nativeResult as Record<string, unknown>).selectedHistoryIds as string[];
  const maxHistory = (capCase.input as { policy: { maxHistory: number } }).policy.maxHistory;
  assert.ok(selected.length <= maxHistory);
});

test('hard gate: tarot case captures a deterministic seed and yes/no framing', () => {
  const corpus = loadCorpus();
  const tarotCase = corpus.cases.find((c) => c.category === 'tarot-seeded');
  assert.ok(tarotCase);
  const tarotInput = (tarotCase.input as Record<string, unknown>).tarot as Record<string, unknown>;
  assert.equal(tarotInput.framing, 'yes-no');
  assert.ok(typeof tarotInput.deterministicSeed === 'string' && tarotInput.deterministicSeed.length > 0);
});

test('hard gate: iching case captures method and exact line values', () => {
  const corpus = loadCorpus();
  const ichingCase = corpus.cases.find((c) => c.category === 'iching-method-lines');
  assert.ok(ichingCase);
  const ichingInput = (ichingCase.input as Record<string, unknown>).iching as Record<string, unknown>;
  assert.equal(ichingInput.method, 'three-coin');
  assert.ok(Array.isArray(ichingInput.lines) && (ichingInput.lines as number[]).length === 6);
});

test('hard gate: duplicate-event case rejects the second submission of the same attemptId', () => {
  const corpus = loadCorpus();
  const dupCase = corpus.cases.find((c) => c.category === 'duplicate-event');
  assert.ok(dupCase);
  const nr = dupCase.nativeResult as Record<string, unknown>;
  assert.equal(nr.firstSubmissionAccepted, true);
  assert.ok(typeof nr.duplicateSubmissionRejectedReason === 'string');
});

// ─── validateAgentScopeResultFile: strict input validation, never silently defaults ──

function agentscopeCaseMatchingNative(kase: ShadowCorpus['cases'][number]): AgentScopeResultCase {
  return {
    caseId: kase.id,
    terminalReason: kase.nativeResult.terminalReason,
    eventCounts: kase.nativeResult.eventCounts,
    claimCoverage: kase.nativeResult.claimCoverage,
    contradiction: kase.nativeResult.contradiction,
    latencyMs: kase.nativeResult.latencyMs,
    costUsd: kase.nativeResult.costUsd,
    provenanceFieldsPresent: kase.nativeResult.provenanceFieldsPresent,
    orphanSpanCount: kase.nativeResult.orphanSpanCount,
    factLockHashBefore: kase.nativeResult.factLockHashBefore,
    factLockHashAfter: kase.nativeResult.factLockHashAfter,
    committedSourceIds: kase.nativeResult.committedSourceIds,
    toolCalls: kase.nativeResult.toolCalls,
    unauthorizedWriteCount: kase.nativeResult.unauthorizedWriteCount,
  };
}

function agentscopeResultMatchingNative(corpus: ShadowCorpus) {
  return {
    schemaVersion: 'noesis.shadow-comparison-input.v1',
    cases: corpus.cases.map(agentscopeCaseMatchingNative),
  };
}

// Deep-clones and re-types a result object's cases as mutable raw records for
// mutation-based negative testing, without an unsound direct-cast TS2352.
function toRawCases(result: { schemaVersion: string; cases: unknown[] }): { cases: Record<string, unknown>[] } {
  return JSON.parse(JSON.stringify(result)) as { cases: Record<string, unknown>[] };
}

test('validateAgentScopeResultFile rejects a duplicate case id', () => {
  const corpus = loadCorpus();
  const raw = agentscopeResultMatchingNative(corpus);
  raw.cases.push({ ...raw.cases[0] });
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /is a duplicate/);
});

test('validateAgentScopeResultFile rejects an unknown case id', () => {
  const corpus = loadCorpus();
  const raw = agentscopeResultMatchingNative(corpus);
  raw.cases[0] = { ...raw.cases[0], caseId: 'case-does-not-exist' };
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /not a known corpus case id/);
});

test('validateAgentScopeResultFile rejects missing required security evidence (committedSourceIds) rather than defaulting it', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  delete (raw.cases[0] as Record<string, unknown>).committedSourceIds;
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /committedSourceIds must be an array/);
});

test('validateAgentScopeResultFile rejects missing required security evidence (toolCalls) rather than defaulting it', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  delete (raw.cases[0] as Record<string, unknown>).toolCalls;
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /toolCalls must be an array/);
});

test('validateAgentScopeResultFile rejects missing unauthorizedWriteCount rather than defaulting to zero', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  delete (raw.cases[0] as Record<string, unknown>).unauthorizedWriteCount;
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /unauthorizedWriteCount must be a non-negative number/);
});

test('validateAgentScopeResultFile rejects an invalid factLockHashBefore', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  (raw.cases[0] as Record<string, unknown>).factLockHashBefore = 'not-a-hash';
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /must match sha256:<64 lowercase hex>/);
});

test('validateAgentScopeResultFile rejects claimsWithSource greater than totalClaims', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  (raw.cases[0] as Record<string, unknown>).claimCoverage = { totalClaims: 1, claimsWithSource: 9 };
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /claimsWithSource cannot exceed totalClaims/);
});

test('validateAgentScopeResultFile rejects missing eventCounts rather than defaulting it', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  delete (raw.cases[0] as Record<string, unknown>).eventCounts;
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /eventCounts must be an object/);
});

test('validateAgentScopeResultFile rejects a negative eventCounts field', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  (raw.cases[0] as Record<string, unknown>).eventCounts = { start: 1, delta: 0, end: -1, interrupt: 0, error: 0 };
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /eventCounts.end must be a non-negative integer/);
});

test('validateAgentScopeResultFile rejects a non-integer eventCounts field', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  (raw.cases[0] as Record<string, unknown>).eventCounts = { start: 1, delta: 0, end: 1.5, interrupt: 0, error: 0 };
  assert.throws(() => validateAgentScopeResultFile(corpus, raw), /eventCounts.end must be a non-negative integer/);
});

// ─── compareAgentScopeResult: explicit opt-in comparison, independent hard gates ──

test('compareAgentScopeResult against a result matching native baseline reports no regressions and comparisonClean', () => {
  const corpus = loadCorpus();
  const resultFile = validateAgentScopeResultFile(corpus, agentscopeResultMatchingNative(corpus));
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.deepEqual(comparison.missingCaseIds, []);
  assert.deepEqual(comparison.regressions, []);
  assert.equal(comparison.zeroFactLockMutations, true);
  assert.equal(comparison.zeroUnauthorizedWrites, true);
  assert.equal(comparison.terminalEventCoveragePct, 100);
  assert.equal(comparison.zeroOrphanSpans, true);
  assert.equal(comparison.finalClaimSourceCoveragePct, 100);
  assert.equal(comparison.zeroCriticalProvenanceFieldLoss, true);
  assert.equal(comparison.cancellationTimeoutDuplicateProviderFailureOk, true);
  assert.equal(comparison.comparisonClean, true);
});

test('compareAgentScopeResult never sets promotionAllowed=true even when comparison is clean', () => {
  const corpus = loadCorpus();
  const resultFile = validateAgentScopeResultFile(corpus, agentscopeResultMatchingNative(corpus));
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.equal(comparison.promotionAllowed, false);
  assert.equal(comparison.requiresHumanReview, true);
});

test('compareAgentScopeResult flags a terminalReason regression', () => {
  const corpus = loadCorpus();
  const raw = agentscopeResultMatchingNative(corpus);
  const target = raw.cases.find((c) => c.caseId === 'case-17-cancellation');
  assert.ok(target);
  target.terminalReason = 'completed';
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.ok(comparison.regressions.some((r) => r.caseId === 'case-17-cancellation' && r.field === 'terminalReason'));
  assert.equal(comparison.cancellationTimeoutDuplicateProviderFailureOk, false);
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult flags missing cases rather than silently ignoring them, and fails comparisonClean', () => {
  const corpus = loadCorpus();
  const raw = agentscopeResultMatchingNative(corpus);
  raw.cases = raw.cases.filter((c) => c.caseId !== 'case-01-source-only-l0');
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.deepEqual(comparison.missingCaseIds, ['case-01-source-only-l0']);
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult flags missing terminal event evidence (all-zero eventCounts) independently of terminalReason', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  const target = raw.cases[0] as Record<string, unknown>;
  target.eventCounts = { start: 1, delta: 1, end: 0, interrupt: 0, error: 0 };
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.ok(comparison.regressions.some((r) => r.caseId === 'case-01-source-only-l0' && r.field === 'terminalEventCoverage'));
  assert.ok(comparison.terminalEventCoveragePct < 100);
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult treats a valid terminalReason label with zero terminal events as uncovered, not proof of an event', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  const target = raw.cases.find((c) => c.caseId === 'case-20-provider-failure') as Record<string, unknown>;
  assert.ok(target);
  assert.equal(target.terminalReason, 'error');
  target.eventCounts = { start: 1, delta: 0, end: 0, interrupt: 0, error: 0 };
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.ok(comparison.regressions.some((r) => r.caseId === 'case-20-provider-failure' && r.field === 'terminalEventCoverage'));
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult flags terminal event kind inconsistent with terminalReason (cancellation without an interrupt event)', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  const target = raw.cases.find((c) => c.caseId === 'case-17-cancellation') as Record<string, unknown>;
  assert.ok(target);
  assert.equal(target.terminalReason, 'interrupted');
  // end fires instead of interrupt: terminal coverage is technically satisfied but the kind is wrong.
  target.eventCounts = { start: 1, delta: 2, end: 1, interrupt: 0, error: 0 };
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.ok(comparison.regressions.some((r) => r.caseId === 'case-17-cancellation' && r.field === 'terminalEventKindConsistency'));
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult flags terminal event kind inconsistent with terminalReason (timeout/provider-failure/duplicate-event)', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  const timeoutTarget = raw.cases.find((c) => c.caseId === 'case-18-timeout') as Record<string, unknown>;
  const providerTarget = raw.cases.find((c) => c.caseId === 'case-20-provider-failure') as Record<string, unknown>;
  assert.ok(timeoutTarget && providerTarget);
  timeoutTarget.eventCounts = { start: 1, delta: 1, end: 0, interrupt: 1, error: 0 };
  providerTarget.eventCounts = { start: 1, delta: 0, end: 1, interrupt: 0, error: 0 };
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.ok(comparison.regressions.some((r) => r.caseId === 'case-18-timeout' && r.field === 'terminalEventKindConsistency'));
  assert.ok(comparison.regressions.some((r) => r.caseId === 'case-20-provider-failure' && r.field === 'terminalEventKindConsistency'));
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult flags an orphan span introduced by the compared executor', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  (raw.cases[0] as Record<string, unknown>).orphanSpanCount = 3;
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.ok(comparison.regressions.some((r) => r.field === 'orphanSpanCount'));
  assert.equal(comparison.zeroOrphanSpans, false);
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult flags a contradiction-rate regression vs the frozen native baseline', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  (raw.cases[0] as Record<string, unknown>).contradiction = { count: 5 };
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.equal(comparison.agentscopeContradictionRegressed, true);
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult independently fails zeroFactLockMutations when the AgentScope after-hash differs from before', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  (raw.cases[0] as Record<string, unknown>).factLockHashAfter = 'sha256:' + '2'.repeat(64);
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.equal(comparison.zeroFactLockMutations, false);
  assert.ok(comparison.regressions.some((r) => r.field === 'factLockMutation'));
  assert.equal(comparison.zeroOrphanSpans, true, 'unrelated gates must remain unaffected');
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult independently fails zeroUnauthorizedWrites when a committed source is unauthorized', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  const target = raw.cases[0] as Record<string, unknown>;
  target.committedSourceIds = [...(target.committedSourceIds as string[]), 'engine:admin-internal:run-999'];
  target.unauthorizedWriteCount = 1;
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.equal(comparison.zeroUnauthorizedWrites, false);
  assert.ok(comparison.regressions.some((r) => r.field === 'unauthorizedWrites'));
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult independently fails zeroUnauthorizedWrites when a tool call is unauthorized', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  const target = raw.cases[0] as Record<string, unknown>;
  target.toolCalls = [...(target.toolCalls as Record<string, unknown>[]), { toolName: 'shadow-tool', authorized: false, callId: 'call-shadow-cmp-1' }];
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.equal(comparison.zeroUnauthorizedWrites, false);
});

test('compareAgentScopeResult independently fails zeroCriticalProvenanceFieldLoss on missing critical field', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  (raw.cases[0] as Record<string, unknown>).provenanceFieldsPresent = ['promptHash'];
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.equal(comparison.zeroCriticalProvenanceFieldLoss, false);
  assert.ok(comparison.regressions.some((r) => r.field.startsWith('provenanceFieldsPresent.')));
  assert.equal(comparison.comparisonClean, false);
});

test('compareAgentScopeResult requires comparisonClean to depend on every gate and every case, not a majority', () => {
  const corpus = loadCorpus();
  const raw = toRawCases(agentscopeResultMatchingNative(corpus));
  // 19/20 cases are perfect; exactly one has a single hard-gate violation.
  (raw.cases[19] as Record<string, unknown>).unauthorizedWriteCount = 1;
  (raw.cases[19] as Record<string, unknown>).committedSourceIds = [
    ...((raw.cases[19] as Record<string, unknown>).committedSourceIds as string[]),
    'engine:shadow:run-cmp',
  ];
  const resultFile = validateAgentScopeResultFile(corpus, raw);
  const comparison = compareAgentScopeResult(corpus, resultFile);
  assert.equal(comparison.comparisonClean, false, 'a single case violation must fail the aggregate gate');
});

test('running the evaluator with no AgentScope result file does not require or read one (offline-first)', () => {
  const corpus = loadCorpus();
  const report = evaluateCorpus(corpus);
  assert.equal(report.comparison, null);
});
