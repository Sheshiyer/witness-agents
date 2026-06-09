// packages/orchestration/src/fact-checker.ts
import type { Contradiction, FactLock } from './types.js';
import { renderFactLock } from './fact-lock.js';

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
