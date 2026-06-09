// packages/orchestration/src/task-graph.ts
import type { AtomicTask } from './types.js';

export interface ExecutionWave {
  wave: number;
  tasks: AtomicTask[];
}

export function buildExecutionPlan(tasks: AtomicTask[]): ExecutionWave[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const t of tasks) {
    indegree.set(t.id, t.dependsOn.length);
    for (const dep of t.dependsOn) {
      if (!adj.has(dep)) adj.set(dep, []);
      adj.get(dep)!.push(t.id);
    }
  }

  const waves: ExecutionWave[] = [];
  let current = tasks.filter((t) => t.dependsOn.length === 0);
  let waveNum = 0;

  while (current.length > 0) {
    waves.push({ wave: waveNum++, tasks: [...current] });

    const next: AtomicTask[] = [];
    for (const t of current) {
      const children = adj.get(t.id) ?? [];
      for (const childId of children) {
        const deg = (indegree.get(childId) ?? 0) - 1;
        indegree.set(childId, deg);
        if (deg === 0) {
          const child = taskMap.get(childId);
          if (child) next.push(child);
        }
      }
    }
    current = next;
  }

  const processed = waves.flatMap((w) => w.tasks.map((t) => t.id));
  if (processed.length !== tasks.length) {
    const remaining = tasks.filter((t) => !processed.includes(t.id)).map((t) => t.id);
    throw new Error(`Cyclic dependency detected in task graph. Unresolved: ${remaining.join(', ')}`);
  }

  return waves;
}
