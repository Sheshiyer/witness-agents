// packages/orchestration/src/assembler.ts
import type { TaskResult, AssemblyResult, Contradiction, FactLock } from './types.js';
import { renderFactLock } from './fact-lock.js';
import type { OrchestrationObserver } from './observability.js';
import { NoopObserver } from './observability.js';
import type { GroundingProvider, GroundedPassage, RetrievalQuery } from './grounding.js';

// P3 note: groundingProvider is already accepted in AssemblerOptions from P2.
// We now use it (when present) to pull supporting passages for disputed locked keys during repair.
// This is the first retrieval-augmented repair skeleton. Full fact-checker augmentation follows in later waves.

export interface AssemblerOptions {
  maxRepairIterations?: number;
  repairExecutor?: (repairPrompt: string, lock: FactLock) => Promise<string>;
  factChecker?: (fullOutput: string, lock: FactLock) => Promise<Contradiction[]>;
  observer?: OrchestrationObserver;
  groundingProvider?: GroundingProvider;
  minRepairRelevance?: number;
  maxRetrievalLatencyMs?: number;
}

export function detectContradictions(output: string, lock: FactLock): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const lower = output.toLowerCase();

  for (const [key, fact] of Object.entries(lock.facts)) {
    const expected = String(fact.value).toLowerCase();
    // 1. Explicit negation / contrast of the correct locked value (original narrow intent)
    const negationPattern = new RegExp(
      `\\b${key}\\b[^.]{0,120}(?:(?:not|never|instead|opposite|different from)\\s+${expected}|${expected}\\s+(?:but|however|yet))`,
      'i'
    );

    // 2. Broadened: direct assignment of a *different* value to a locked key (preserves "direct assignment" spirit)
    //    e.g. "moonRashi is Karka" or "lagna: Leo" when locked value is different
    const assignmentPattern = new RegExp(
      `\\b${key}\\b[^.]{0,80}?(?:is|in|was|equals?|:|→)\\s*([a-zA-Z0-9_\\- ]{2,40})`,
      'i'
    );

    let hit = false;
    let excerptStart = 0;

    if (negationPattern.test(lower)) {
      hit = true;
      excerptStart = Math.max(0, lower.indexOf(key) - 40);
    } else {
      const m = assignmentPattern.exec(lower);
      if (m) {
        const stated = (m[1] || '').trim().toLowerCase();
        if (stated && stated !== expected && !stated.includes(expected)) {
          hit = true;
          excerptStart = Math.max(0, (m.index || 0) - 40);
        }
      }
    }

    if (hit) {
      contradictions.push({
        type: 'fact-violation',
        description: `Mechanical detection: possible violation of locked fact "${key}" (expected "${fact.value}")`,
        excerpt: output.slice(excerptStart, excerptStart + 220).trim(),
      });
    }
  }

  return contradictions;
}

export async function assemble(
  taskResults: TaskResult[],
  lock: FactLock,
  options: AssemblerOptions = {},
): Promise<AssemblyResult> {
  const observer = options.observer ?? NoopObserver;
  const maxIterations = options.maxRepairIterations ?? 2;

  let current = taskResults
    .map((r) => `## ${r.perspective}:${r.taskId}\n\n${r.content}`)
    .join('\n\n---\n\n');

  const allContradictions: Contradiction[] = [];
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;

    let issues = detectContradictions(current, lock);

    if (options.factChecker) {
      const structuredIssues = await options.factChecker(current, lock);
      issues = [...issues, ...structuredIssues];
    }

    if (issues.length === 0) break;

    issues.forEach(issue => observer.onContradiction?.(issue));
    allContradictions.push(...issues);

    if (!options.repairExecutor) {
      break;
    }

    for (const issue of issues) {
      let repairPrompt = [
        renderFactLock(lock),
        '',
        'The following text contains a potential violation of the locked facts above.',
        'Rewrite ONLY the problematic section so it respects the locked facts verbatim.',
        'Do not add meta commentary. Return only the corrected text.',
        '',
        'PROBLEMATIC EXCERPT:',
        issue.excerpt,
      ].join('\n');

      // P3 skeleton: retrieval-augmented repair (when groundingProvider is wired)
      if (options.groundingProvider) {
        const query: RetrievalQuery = {
          subjectId: lock.subjectId,
          facts: lock.facts,
          perspective: 'repair',
          taskId: 'assembler-repair',
          maxPassages: 4,
        };
        const passages: GroundedPassage[] = await retrieveWithinLatency(
          options.groundingProvider,
          query,
          options.maxRetrievalLatencyMs,
        );
        const relevant = passages.filter(p => p.score >= (options.minRepairRelevance ?? 0.65));
        if (relevant.length > 0) {
          const context = relevant
            .map(p => `• ${p.excerpt} [${p.source || 'unknown'}] (relevance ${p.score.toFixed(2)})`)
            .join('\n');
          repairPrompt += `\n\nSupporting mirrors from corpus (use only as resonance, never override locked facts):\n${context}`;
        }
      }

      const repaired = await options.repairExecutor(repairPrompt, lock);
      if (repaired && repaired.length > 10) {
        current = current.replace(issue.excerpt, repaired.trim());
        observer.onRepair?.({ iterations });
      }
    }
  }

  observer.onAssemblyComplete?.({
    totalTasks: taskResults.length,
    contradictions: allContradictions.length,
    repairIterations: iterations,
  });

  return {
    output: current,
    taskResults,
    contradictions: allContradictions,
    repairIterations: iterations,
  };
}

async function retrieveWithinLatency(
  provider: GroundingProvider,
  query: RetrievalQuery,
  maxRetrievalLatencyMs?: number,
): Promise<GroundedPassage[]> {
  if (!maxRetrievalLatencyMs || maxRetrievalLatencyMs <= 0) {
    return provider.retrieve(query);
  }

  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      provider.retrieve(query),
      new Promise<GroundedPassage[]>((resolve) => {
        timeout = setTimeout(() => resolve([]), maxRetrievalLatencyMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
