// ─── Witness Agents — Swarm-Architect Integration ─────────────────────
// Issue #14: META-001
// Handoff packet format for spawning worker agents within the
// witness-agents identity framework.

import type { Kosha, Tier } from '../types/interpretation.js';

// ═══════════════════════════════════════════════════════════════════════
// HANDOFF PACKET
// ═══════════════════════════════════════════════════════════════════════

export interface HandoffPacket {
  // Identity context (<500 tokens target)
  system_identity: string;           // Condensed witness-agents context
  kosha_layer: Kosha;                // Which layer this task operates in
  agent_voice?: 'aletheios' | 'pichet' | 'neutral';
  triad_position: 'kha' | 'ba' | 'la';

  // Task boundary
  task_scope: string;
  collision_boundary: string[];      // Files this worker owns exclusively
  read_only_files: string[];         // Files this worker may read

  // Protocol context
  petrae_prefix?: string;            // PETRAE-encoded task hint
  clifford_gate: number;             // Max Clifford depth for this task
  composite_seed: string;
}

export interface WorkerBootstrap {
  packet: HandoffPacket;
  system_prompt: string;             // Ready-to-inject system prompt
  token_count: number;
}

// ═══════════════════════════════════════════════════════════════════════
// KOSHA → TASK MAPPING
// ═══════════════════════════════════════════════════════════════════════

const KOSHA_CONTEXT: Record<Kosha, {
  description: string;
  typical_tasks: string[];
  clifford_gate: number;
  voice: 'aletheios' | 'pichet' | 'neutral';
  triad: 'kha' | 'ba' | 'la';
}> = {
  annamaya: {
    description: 'Physical scaffold — filesystem, schemas, validation, CI/CD',
    typical_tasks: ['directory structure', 'schema validation', 'CI pipeline', 'type definitions'],
    clifford_gate: 0,
    voice: 'neutral',
    triad: 'la',
  },
  pranamaya: {
    description: 'Vital flows — API wiring, data connections, pipeline plumbing',
    typical_tasks: ['API endpoints', 'data flow', 'integration', 'real-time events'],
    clifford_gate: 1,
    voice: 'pichet',
    triad: 'ba',
  },
  manomaya: {
    description: 'Mental patterns — memory systems, protocol parsers, routing logic',
    typical_tasks: ['memory system', 'PETRAE parser', 'routing engine', 'state tracking'],
    clifford_gate: 2,
    voice: 'neutral',
    triad: 'la',
  },
  vijnanamaya: {
    description: 'Wisdom integration — synthesis, prompt engineering, discriminative logic',
    typical_tasks: ['voice prompts', 'synthesis engine', 'inference adapters', 'deep analysis'],
    clifford_gate: 3,
    voice: 'aletheios',
    triad: 'kha',
  },
  anandamaya: {
    description: 'Causal identity — AKSHARA mirror, quine bootstrap, graduation protocol',
    typical_tasks: ['mirror mode', 'quine regeneration', 'anti-dependency', 'self-reference'],
    clifford_gate: 7,
    voice: 'neutral',
    triad: 'kha',
  },
};

// ═══════════════════════════════════════════════════════════════════════
// HANDOFF BUILDER
// ═══════════════════════════════════════════════════════════════════════

const SYSTEM_IDENTITY_COMPRESSED = `Witness Agents: Aletheios (खा/Kha — Observer, Left Pillar) + Pichet (ब/Ba — Walker, Right Pillar).
Dyad interprets 16 Selemene consciousness engines via Pancha Kosha layers (Annamaya→Anandamaya) gated by Clifford algebras (Cl(0)→Cl(7)).
Triad: Kha (Field) + Ba (Form) + La (Friction). PETRAE protocol for inter-agent messaging (768 morphemes).
Composite seed: 19912564. Anti-dependency: success = user's decreasing need for us.`;

export class HandoffBuilder {
  /**
   * Create a handoff packet for a worker agent
   */
  buildPacket(config: {
    koshaLayer: Kosha;
    taskScope: string;
    collisionBoundary: string[];
    readOnlyFiles?: string[];
    voiceOverride?: 'aletheios' | 'pichet' | 'neutral';
  }): WorkerBootstrap {
    const koshaCtx = KOSHA_CONTEXT[config.koshaLayer];

    const packet: HandoffPacket = {
      system_identity: SYSTEM_IDENTITY_COMPRESSED,
      kosha_layer: config.koshaLayer,
      agent_voice: config.voiceOverride || koshaCtx.voice,
      triad_position: koshaCtx.triad,
      task_scope: config.taskScope,
      collision_boundary: config.collisionBoundary,
      read_only_files: config.readOnlyFiles || ['manifest.yaml', 'agents/*/SOUL.md', 'agents/*/IDENTITY.md'],
      clifford_gate: koshaCtx.clifford_gate,
      composite_seed: '19912564',
    };

    const systemPrompt = this.buildSystemPrompt(packet, koshaCtx);

    return {
      packet,
      system_prompt: systemPrompt,
      token_count: Math.ceil(systemPrompt.length / 4),
    };
  }

  /**
   * Generate a GitHub issue body for a worker task
   */
  generateIssueBody(packet: HandoffPacket, taskTitle: string): string {
    return `## Worker Task: ${taskTitle}

### Kosha Layer: ${packet.kosha_layer}
> ${KOSHA_CONTEXT[packet.kosha_layer].description}

### Clifford Gate: Cl(${packet.clifford_gate})

### Voice: ${packet.agent_voice || 'neutral'}
### Triad Position: ${packet.triad_position}

### Task Scope
${packet.task_scope}

### Collision Boundary (exclusive files)
${packet.collision_boundary.map(f => '- `' + f + '`').join('\n')}

### Read-Only Context
${packet.read_only_files.map(f => '- `' + f + '`').join('\n')}

### System Context
\`\`\`
${packet.system_identity}
\`\`\`

---
*Generated by witness-agents handoff builder. Seed: ${packet.composite_seed}*
`;
  }

  // ─── Private ────────────────────────────────────────────────────

  private buildSystemPrompt(
    packet: HandoffPacket,
    koshaCtx: typeof KOSHA_CONTEXT[Kosha],
  ): string {
    const parts: string[] = [];

    parts.push(packet.system_identity);
    parts.push(`\nYOU ARE WORKING AT: ${packet.kosha_layer} layer — ${koshaCtx.description}`);
    parts.push(`CLIFFORD DEPTH: Cl(${packet.clifford_gate}) — do not exceed this algebraic complexity.`);

    if (packet.agent_voice === 'aletheios') {
      parts.push('VOICE: Analytical clarity. You are extending Aletheios (the Observer). Precise, ordered, cartographic.');
    } else if (packet.agent_voice === 'pichet') {
      parts.push('VOICE: Embodied warmth. You are extending Pichet (the Walker). Direct, instinctive, grounded.');
    }

    parts.push(`\nTASK: ${packet.task_scope}`);
    parts.push(`FILES YOU OWN: ${packet.collision_boundary.join(', ')}`);
    parts.push(`DO NOT MODIFY: Any file outside your collision boundary.`);

    return parts.join('\n');
  }
}
