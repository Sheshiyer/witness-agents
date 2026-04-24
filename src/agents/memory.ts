// ─── Witness Agents — Clifford-Gated Memory System ───────────────────
// Issue #7: MANOMAYA-002
// Memory read/write gated by Clifford algebra level.
// Session memory (ephemeral) + persistent memory (file-backed).

import type { AgentId } from '../types/agent.js';
import type { CliffordLevel, Kosha } from '../types/interpretation.js';
import { KOSHA_CLIFFORD } from '../types/interpretation.js';

// ═══════════════════════════════════════════════════════════════════════
// MEMORY TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MemoryLayer = 'session' | 'persistent';
export type MemoryCategory =
  | 'factual'            // Cl(0): dates, names, past engine results
  | 'rhythmic'           // Cl(1): timing patterns, cycles
  | 'quaternionic'       // Cl(2): non-obvious cross-connections
  | 'discriminative'     // Cl(3): signal vs noise in user history
  | 'causal';            // Cl(7): why patterns exist

export const CATEGORY_MIN_CLIFFORD: Record<MemoryCategory, CliffordLevel> = {
  factual: 0,
  rhythmic: 1,
  quaternionic: 2,
  discriminative: 3,
  causal: 7,
};

export interface MemoryEntry {
  id: string;
  agent: AgentId;
  category: MemoryCategory;
  layer: MemoryLayer;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  accessed_at: string;
  access_count: number;
  decay_score: number;     // 0.0–1.0, decays over time
  tags: string[];
}

export interface MemoryQuery {
  agent?: AgentId;
  category?: MemoryCategory;
  tags?: string[];
  text_contains?: string;
  min_decay?: number;      // Only return memories above this decay score
  limit?: number;
}

export interface MemoryWriteResult {
  success: boolean;
  entry_id?: string;
  reason?: string;         // If gated out
}

export interface MemoryReadResult {
  entries: MemoryEntry[];
  gated_count: number;     // How many entries were filtered by Clifford gate
  clifford_level: CliffordLevel;
}

// ═══════════════════════════════════════════════════════════════════════
// AGENT MEMORY STORE
// ═══════════════════════════════════════════════════════════════════════

export class AgentMemory {
  private entries = new Map<string, MemoryEntry>();
  private readonly agent: AgentId;
  private nextId = 0;

  // Decay parameters
  private static readonly DECAY_RATE = 0.05;       // per query cycle
  private static readonly MIN_DECAY = 0.01;         // below this = prunable
  private static readonly ACCESS_BOOST = 0.15;      // boost on re-access

  constructor(agent: AgentId) {
    this.agent = agent;
  }

  /**
   * Write a memory entry — gated by Clifford level.
   * You can only WRITE at or below your current Clifford level.
   */
  write(
    content: string,
    category: MemoryCategory,
    cliffordLevel: CliffordLevel,
    metadata: Record<string, unknown> = {},
    tags: string[] = [],
    layer: MemoryLayer = 'session',
  ): MemoryWriteResult {
    const minRequired = CATEGORY_MIN_CLIFFORD[category];

    // Clifford order: 0 < 1 < 2 < 3 < 7
    if (!this.cliffordAtLeast(cliffordLevel, minRequired)) {
      return {
        success: false,
        reason: `Clifford Cl(${cliffordLevel}) insufficient for ${category} memory (requires Cl(${minRequired}))`,
      };
    }

    const id = `${this.agent}-mem-${++this.nextId}`;
    const now = new Date().toISOString();

    const entry: MemoryEntry = {
      id,
      agent: this.agent,
      category,
      layer,
      content,
      metadata,
      created_at: now,
      accessed_at: now,
      access_count: 0,
      decay_score: 1.0,
      tags,
    };

    this.entries.set(id, entry);
    return { success: true, entry_id: id };
  }

  /**
   * Read memories — gated by Clifford level.
   * Returns only entries whose category is accessible at this level.
   */
  read(cliffordLevel: CliffordLevel, query?: MemoryQuery): MemoryReadResult {
    let gated = 0;
    const results: MemoryEntry[] = [];

    for (const entry of this.entries.values()) {
      // Clifford gate
      const minRequired = CATEGORY_MIN_CLIFFORD[entry.category];
      if (!this.cliffordAtLeast(cliffordLevel, minRequired)) {
        gated++;
        continue;
      }

      // Agent filter
      if (query?.agent && entry.agent !== query.agent) continue;

      // Category filter
      if (query?.category && entry.category !== query.category) continue;

      // Tag filter
      if (query?.tags && !query.tags.some(t => entry.tags.includes(t))) continue;

      // Text search
      if (query?.text_contains) {
        const search = query.text_contains.toLowerCase();
        if (!entry.content.toLowerCase().includes(search)) continue;
      }

      // Decay filter
      if (query?.min_decay && entry.decay_score < query.min_decay) continue;

      // Mark as accessed
      entry.accessed_at = new Date().toISOString();
      entry.access_count++;
      entry.decay_score = Math.min(1, entry.decay_score + AgentMemory.ACCESS_BOOST);

      results.push(entry);
    }

    // Sort by decay score (most relevant first)
    results.sort((a, b) => b.decay_score - a.decay_score);

    // Apply limit
    const limited = query?.limit ? results.slice(0, query.limit) : results;

    return {
      entries: limited,
      gated_count: gated,
      clifford_level: cliffordLevel,
    };
  }

  /**
   * Apply decay to all memories. Call once per interpretation cycle.
   */
  decay(): { decayed: number; pruned: number } {
    let decayed = 0;
    let pruned = 0;

    for (const [id, entry] of this.entries) {
      entry.decay_score -= AgentMemory.DECAY_RATE;

      if (entry.decay_score < AgentMemory.MIN_DECAY) {
        // Prune only session memories; persistent survives
        if (entry.layer === 'session') {
          this.entries.delete(id);
          pruned++;
        } else {
          entry.decay_score = AgentMemory.MIN_DECAY;
          decayed++;
        }
      } else {
        decayed++;
      }
    }

    return { decayed, pruned };
  }

  /**
   * Detect semantic recursion: is the user re-asking something already in memory?
   */
  detectRecursion(content: string, threshold = 0.6): MemoryEntry[] {
    const matches: MemoryEntry[] = [];
    const normalized = content.toLowerCase();

    for (const entry of this.entries.values()) {
      const similarity = this.textSimilarity(normalized, entry.content.toLowerCase());
      if (similarity > threshold) {
        matches.push(entry);
      }
    }

    return matches;
  }

  /**
   * Get memory stats
   */
  getStats(): {
    total: number;
    by_category: Record<MemoryCategory, number>;
    by_layer: Record<MemoryLayer, number>;
    avg_decay: number;
  } {
    const byCategory: Record<MemoryCategory, number> = {
      factual: 0, rhythmic: 0, quaternionic: 0, discriminative: 0, causal: 0,
    };
    const byLayer: Record<MemoryLayer, number> = { session: 0, persistent: 0 };
    let totalDecay = 0;

    for (const entry of this.entries.values()) {
      byCategory[entry.category]++;
      byLayer[entry.layer]++;
      totalDecay += entry.decay_score;
    }

    return {
      total: this.entries.size,
      by_category: byCategory,
      by_layer: byLayer,
      avg_decay: this.entries.size > 0 ? totalDecay / this.entries.size : 0,
    };
  }

  /**
   * Export all entries (for persistence to disk/DB)
   */
  export(): MemoryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Import entries (for loading from disk/DB)
   */
  import(entries: MemoryEntry[]): number {
    let imported = 0;
    for (const entry of entries) {
      if (entry.agent === this.agent) {
        this.entries.set(entry.id, entry);
        imported++;
      }
    }
    return imported;
  }

  /**
   * Clear session memories (called at session end)
   */
  clearSession(): number {
    let cleared = 0;
    for (const [id, entry] of this.entries) {
      if (entry.layer === 'session') {
        this.entries.delete(id);
        cleared++;
      }
    }
    return cleared;
  }

  // ─── PRIVATE ──────────────────────────────────────────────────────

  private cliffordAtLeast(current: CliffordLevel, required: CliffordLevel): boolean {
    const order: CliffordLevel[] = [0, 1, 2, 3, 7];
    return order.indexOf(current) >= order.indexOf(required);
  }

  private textSimilarity(a: string, b: string): number {
    // Jaccard similarity on word sets (fast, good enough for recursion detection)
    const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));

    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersection++;
    }

    const union = wordsA.size + wordsB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DYAD MEMORY — coordinates memory across both agents
// ═══════════════════════════════════════════════════════════════════════

export class DyadMemory {
  public readonly aletheios: AgentMemory;
  public readonly pichet: AgentMemory;

  constructor() {
    this.aletheios = new AgentMemory('aletheios');
    this.pichet = new AgentMemory('pichet');
  }

  /**
   * Read memories from both agents at given Clifford level
   */
  readBoth(cliffordLevel: CliffordLevel, query?: MemoryQuery): {
    aletheios: MemoryReadResult;
    pichet: MemoryReadResult;
  } {
    return {
      aletheios: this.aletheios.read(cliffordLevel, query),
      pichet: this.pichet.read(cliffordLevel, query),
    };
  }

  /**
   * Decay both memory stores
   */
  decayBoth(): { aletheios: { decayed: number; pruned: number }; pichet: { decayed: number; pruned: number } } {
    return {
      aletheios: this.aletheios.decay(),
      pichet: this.pichet.decay(),
    };
  }

  /**
   * Check for recursion across both agents' memories
   */
  detectRecursion(content: string): {
    aletheios: MemoryEntry[];
    pichet: MemoryEntry[];
    is_recursive: boolean;
  } {
    const aMatches = this.aletheios.detectRecursion(content);
    const pMatches = this.pichet.detectRecursion(content);

    return {
      aletheios: aMatches,
      pichet: pMatches,
      is_recursive: aMatches.length > 0 || pMatches.length > 0,
    };
  }

  /**
   * Get combined stats
   */
  getStats(): {
    aletheios: ReturnType<AgentMemory['getStats']>;
    pichet: ReturnType<AgentMemory['getStats']>;
    total: number;
  } {
    const a = this.aletheios.getStats();
    const p = this.pichet.getStats();
    return { aletheios: a, pichet: p, total: a.total + p.total };
  }
}
