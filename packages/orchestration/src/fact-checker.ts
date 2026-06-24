// packages/orchestration/src/fact-checker.ts
import type { Contradiction, FactLock } from './types.js';
import { renderFactLock } from './fact-lock.js';
import type { GroundingProvider, RetrievalQuery, GroundedPassage } from './grounding.js';

export interface FactClaim {
  key: string;
  statedValue: string;
}

export function createSimpleLLMFactChecker(
  callModel: (system: string, user: string, opts?: { temperature?: number; maxTokens?: number }) => Promise<{ content: string }>
) {
  return async function simpleFactChecker(fullOutput: string, lock: FactLock): Promise<Contradiction[]> {
    const system = [
      renderFactLock(lock),
      '',
      'You are a strict fact auditor.',
      'Extract any claims in the TEXT below that touch the LOCKED FACT keys.',
      'Return ONLY a JSON array of objects with shape: [{"key": "...", "statedValue": "..."}]',
      'If nothing relevant is stated, return [].',
    ].join('\n');

    const user = `TEXT:\n${fullOutput.slice(0, 8000)}\n\nExtract claims now.`;

    try {
      const res = await callModel(system, user, { temperature: 0.1, maxTokens: 600 });
      const json = res.content.trim().replace(/```json|```/g, '').trim();
      const claims: FactClaim[] = JSON.parse(json);

      const contradictions: Contradiction[] = [];

      for (const claim of claims) {
        const locked = lock.facts[claim.key];
        if (!locked) continue;

        const lockedVal = String(locked.value).toLowerCase();
        const stated = claim.statedValue.toLowerCase();

        if (!stated.includes(lockedVal) && !lockedVal.includes(stated)) {
          contradictions.push({
            type: 'fact-violation',
            description: `Structured check: "${claim.key}" stated as "${claim.statedValue}" but locked value is "${locked.value}"`,
            excerpt: `${claim.key}: ${claim.statedValue}`,
          });
        }
      }

      return contradictions;
    } catch {
      return [];
    }
  };
}

/**
 * P3: Retrieval-augmented fact-checker.
 * When a groundingProvider is supplied, retrieves supporting passages to help
 * the LLM make better judgments about whether claims match locked facts.
 *
 * The retrieved context provides:
 * - Historical precedents (how this fact appeared in prior analysis)
 * - Canonical references (external sources that corroborate)
 * - Domain nuance (e.g. "Kanya" = "Virgo" synonymy)
 *
 * FactLock still takes precedence over retrieved material ("resonance, not override").
 */
export function createGroundedLLMFactChecker(
  callModel: (system: string, user: string, opts?: { temperature?: number; maxTokens?: number }) => Promise<{ content: string }>,
  groundingProvider: GroundingProvider,
  options: { minRelevance?: number; maxPassages?: number } = {}
) {
  const minRelevance = options.minRelevance ?? 0.65;
  const maxPassages = options.maxPassages ?? 4;

  return async function groundedFactChecker(fullOutput: string, lock: FactLock): Promise<Contradiction[]> {
    // Retrieve supporting passages for fact-checking context
    const query: RetrievalQuery = {
      subjectId: lock.subjectId,
      facts: lock.facts,
      perspective: 'fact-check',
      taskId: 'fact-checker',
      maxPassages,
    };

    let passages: GroundedPassage[] = [];
    try {
      passages = await groundingProvider.retrieve(query);
      passages = passages.filter(p => p.score >= minRelevance);
    } catch {
      // On retrieval failure, fall back to no grounding (graceful degradation)
      passages = [];
    }

    // Build grounded context block
    let groundedContext = '';
    if (passages.length > 0) {
      const passageLines = passages.map(
        p => `• ${p.excerpt} [${p.source || 'unknown'}] (relevance ${p.score.toFixed(2)})`
      );
      groundedContext = [
        '',
        'SUPPORTING CONTEXT (use for nuance/synonymy, but locked facts always take precedence):',
        ...passageLines,
        '',
      ].join('\n');
    }

    const system = [
      renderFactLock(lock),
      groundedContext,
      'You are a strict fact auditor.',
      'Extract any claims in the TEXT below that touch the LOCKED FACT keys.',
      'Use the supporting context to understand synonyms/nuances (e.g. "Kanya" = "Virgo").',
      'But if a claim contradicts a LOCKED FACT, mark it regardless of supporting context.',
      'Return ONLY a JSON array of objects with shape: [{"key": "...", "statedValue": "..."}]',
      'If nothing relevant is stated, return [].',
    ].join('\n');

    const user = `TEXT:\n${fullOutput.slice(0, 8000)}\n\nExtract claims now.`;

    try {
      const res = await callModel(system, user, { temperature: 0.1, maxTokens: 600 });
      const json = res.content.trim().replace(/```json|```/g, '').trim();
      const claims: FactClaim[] = JSON.parse(json);

      const contradictions: Contradiction[] = [];

      for (const claim of claims) {
        const locked = lock.facts[claim.key];
        if (!locked) continue;

        const lockedVal = String(locked.value).toLowerCase();
        const stated = claim.statedValue.toLowerCase();

        if (!stated.includes(lockedVal) && !lockedVal.includes(stated)) {
          contradictions.push({
            type: 'fact-violation',
            description: `Grounded check: "${claim.key}" stated as "${claim.statedValue}" but locked value is "${locked.value}"`,
            excerpt: `${claim.key}: ${claim.statedValue}`,
          });
        }
      }

      return contradictions;
    } catch {
      return [];
    }
  };
}
