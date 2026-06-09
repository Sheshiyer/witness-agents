// packages/orchestration/src/fact-lock.ts
import type { FactLock, LockedFact } from './types.js';

export function createFactLock(params: {
  subjectId: string;
  subject: string;
  facts: Record<string, any>;
  sources?: Record<string, string>;
}): FactLock {
  const frozenAt = new Date().toISOString();
  const version = `fl-${Date.now()}`;

  const lockedFacts: Record<string, LockedFact> = {};
  for (const [key, value] of Object.entries(params.facts)) {
    lockedFacts[key] = {
      value,
      source: params.sources?.[key] ?? 'unknown',
    };
  }

  return {
    subjectId: params.subjectId,
    subject: params.subject,
    facts: lockedFacts,
    frozenAt,
    version,
  };
}

export function renderFactLock(lock: FactLock): string {
  const lines: string[] = [
    'FACT LOCK — IMMUTABLE SUBJECT TRUTH',
    `Subject: ${lock.subject} (${lock.subjectId})`,
    `Frozen: ${lock.frozenAt} | Version: ${lock.version}`,
    '',
    'The following facts are LOCKED. You MUST treat every value below as ground truth.',
    'You are FORBIDDEN from contradicting, softening, or "interpreting away" any locked fact.',
    'If a locked fact appears to conflict with other information, state the locked fact verbatim and note the tension.',
    '',
    'LOCKED FACTS:',
  ];

  for (const [key, fact] of Object.entries(lock.facts)) {
    const val = typeof fact.value === 'object' ? JSON.stringify(fact.value) : String(fact.value);
    lines.push(`- ${key}: ${val}   [source: ${fact.source}]`);
  }

  lines.push('');
  lines.push('END FACT LOCK');
  return lines.join('\n');
}

export function buildFactsReminder(lock: FactLock, keys?: string[]): string {
  const selectedKeys = keys ?? Object.keys(lock.facts);
  const items = selectedKeys
    .filter((k) => k in lock.facts)
    .map((k) => {
      const f = lock.facts[k];
      const val = typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value);
      return `${k}=${val}`;
    });

  return `REMEMBER LOCKED FACTS: ${items.join(' | ')}`;
}
