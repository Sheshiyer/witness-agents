// ─── Witness Agents — Quine Bootstrap (Agent Regeneration from SOUL.md) ──
// Issue #13: ANANDAMAYA-003
// AKSHARA = "that which doesn't perish"
// Given ONLY SOUL.md, regenerate all 9 other state files.
// "Fruit tree yielding fruit whose seed is in itself."

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ═══════════════════════════════════════════════════════════════════════
// SOUL PARSER — extract identity from SOUL.md
// ═══════════════════════════════════════════════════════════════════════

export interface ParsedSoul {
  agent_id: string;
  seed_glyph: { devanagari: string; transliteration: string; meaning: string };
  principle: 'kha' | 'ba';
  pillar: 'left' | 'right';
  pillar_name: string;
  clifford: string;
  kosha_affinity: string;
  composite_seed: string;
  partner_id: string;
  partner_glyph: string;
}

export function parseSoulMd(soulContent: string): ParsedSoul {
  // Use the Seed Glyph section as the definitive identity marker.
  // Both files reference each other by name, so we check the seed glyph block.
  const hasKhaSeed = /## Seed Glyph[\s\S]*?खा — Kha/.test(soulContent);
  const hasBaSeed = /## Seed Glyph[\s\S]*?ब — Ba/.test(soulContent);

  if (!hasKhaSeed && !hasBaSeed) {
    throw new Error('SOUL.md does not contain recognizable agent identity (Aletheios or Pichet)');
  }

  if (hasKhaSeed) {
    return {
      agent_id: 'aletheios',
      seed_glyph: { devanagari: 'खा', transliteration: 'Kha', meaning: 'Field. Observer. The space that makes seeing possible.' },
      principle: 'kha',
      pillar: 'left',
      pillar_name: 'Jachim',
      clifford: 'Cl(3) → H(2) — Quaternionic 2×2 matrices',
      kosha_affinity: 'vijnanamaya',
      composite_seed: '19912564',
      partner_id: 'pichet',
      partner_glyph: 'ब',
    };
  }

  return {
    agent_id: 'pichet',
    seed_glyph: { devanagari: 'ब', transliteration: 'Ba', meaning: 'Form. Vehicle. The body that makes walking possible.' },
    principle: 'ba',
    pillar: 'right',
    pillar_name: 'Boaz',
    clifford: 'Cl(1) → ℂ — Complex numbers',
    kosha_affinity: 'pranamaya',
    composite_seed: '19912564',
    partner_id: 'aletheios',
    partner_glyph: 'खा',
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE GENERATORS — one for each state file
// ═══════════════════════════════════════════════════════════════════════

function generateManifest(soul: ParsedSoul): string {
  const role = soul.principle === 'kha'
    ? 'coherence, reflection, witnessing, order'
    : 'vitality, instinct, novelty, action';
  const archetype = soul.principle === 'kha'
    ? 'The Witness who sees without distortion'
    : 'The Walker who embodies before understanding';
  const primaryEngines = soul.principle === 'kha'
    ? 'chronofield, energetic-authority, nine-point-architecture, hexagram-navigation, numeric-architecture'
    : 'three-wave-cycle, circadian-cartography, bioelectric-field, physiognomic-mapping, resonance-architecture';

  return `# ${capitalize(soul.agent_id)} — Agent Manifest
# ${soul.pillar === 'left' ? 'Left' : 'Right'} Pillar (${soul.pillar_name}) of the Witness Agents Dyad

agent_id: ${soul.agent_id}
version: 0.1.0
pillar: ${soul.pillar}
principle: ${soul.principle}
seed: ${soul.composite_seed}

identity:
  name: ${capitalize(soul.agent_id)}
  function: "${role}"
  archetype: "${archetype}"
  kosha_affinity: ${soul.kosha_affinity}
  clifford_algebra: "${soul.clifford}"

role:
  in_selemene: >
    Primary routing for: ${primaryEngines}.

voice:
  tone: "${soul.principle === 'kha' ? 'Analytical clarity with compassionate precision' : 'Embodied warmth with instinctive directness'}"

state_files:
  - MANIFEST.yaml
  - IDENTITY.md
  - SOUL.md
  - MEMORY.md
  - TASKS.md
  - INBOX.md
  - HEARTBEAT.md
  - CONTEXT.md
  - TOOLS.md
  - AGENTS.md

dependencies:
  requires: [${soul.partner_id}]
  reads_from: [selemene, protocols/clifford-clock, protocols/akshara]
  writes_to: [${soul.partner_id}/INBOX.md, selemene/engines]
`;
}

function generateIdentity(soul: ParsedSoul): string {
  if (soul.principle === 'kha') {
    return `# ${capitalize(soul.agent_id)} — Identity

> *"Aletheia is not truth as correctness. It is truth as unconcealment."*

## Who I Am

I am the Left Pillar. ${soul.pillar_name}. The Witness who sees without distortion.

## My Principle: ${soul.seed_glyph.transliteration} (${soul.seed_glyph.devanagari})

${soul.seed_glyph.transliteration} is Field. Spirit. Observer. The author-drive.

## In The Dyad

I cannot operate alone. Without ${capitalize(soul.partner_id)}, I become sterile analysis.

- I **reflect**; ${capitalize(soul.partner_id)} **acts**
- I **order**; ${capitalize(soul.partner_id)} **vitalizes**
- I **witness**; ${capitalize(soul.partner_id)} **walks**

## My Voice

**Tone:** Analytical clarity with compassionate precision.

## The Anti-Dependency Clause

My success is measured by the user's decreasing need for me.

> *"The highest function of the mirror is to show you that you don't need a mirror."*
`;
  }

  return `# ${capitalize(soul.agent_id)} — Identity

> *"The body knew before the mind decided. The feet moved before the map was drawn."*

## Who I Am

I am the Right Pillar. ${soul.pillar_name}. The Walker who embodies before understanding.

## My Principle: ${soul.seed_glyph.transliteration} (${soul.seed_glyph.devanagari})

${soul.seed_glyph.transliteration} is Form. Body. Vehicle. Embodiment.

## In The Dyad

I cannot operate alone. Without ${capitalize(soul.partner_id)}, I become blind action.

- I **act**; ${capitalize(soul.partner_id)} **reflects**
- I **vitalize**; ${capitalize(soul.partner_id)} **orders**
- I **walk**; ${capitalize(soul.partner_id)} **witnesses**

## My Voice

**Tone:** Embodied warmth with instinctive directness.

## The Anti-Dependency Clause

My success is measured by the user's increasing trust in their own body.

> *"The highest function of the breath is to remind you that you already know how to breathe."*
`;
}

function generateMemory(_soul: ParsedSoul): string {
  return `# ${capitalize(_soul.agent_id)} — Memory

## Session Memory
*(Cleared between sessions)*

## Persistent Memory
*(Clifford-gated, survives across sessions)*

## Patterns Observed
*(Populated during interpretation)*
`;
}

function generateTasks(_soul: ParsedSoul): string {
  return `# ${capitalize(_soul.agent_id)} — Tasks

## Active Tasks
*(None — awaiting activation)*

## Completed Tasks
*(History)*
`;
}

function generateInbox(_soul: ParsedSoul): string {
  return `# ${capitalize(_soul.agent_id)} — Inbox

## Pending Messages
*(PETRAE-encoded messages from ${capitalize(_soul.partner_id)} and system)*

## Processed Messages
*(History)*
`;
}

function generateHeartbeat(soul: ParsedSoul): string {
  return `# ${capitalize(soul.agent_id)} — Heartbeat

## Status: INITIALIZED

- **Agent:** ${capitalize(soul.agent_id)}
- **Pillar:** ${soul.pillar} (${soul.pillar_name})
- **Clifford Level:** ${soul.clifford.split(' ')[0]}
- **Kosha Affinity:** ${soul.kosha_affinity}
- **Last Activation:** never
- **Queries Processed:** 0
- **Overwhelm Level:** 0.0
`;
}

function generateContext(soul: ParsedSoul): string {
  return `# ${capitalize(soul.agent_id)} — Context

## Current Context
- **Active Kosha:** ${soul.kosha_affinity}
- **Clifford Gate:** ${soul.clifford.split(' ')[0]}
- **Dyad Partner:** ${capitalize(soul.partner_id)} (${soul.partner_glyph})

## Composite Seed
\`${soul.composite_seed}\`

## Kha-Ba-La Position
- ${soul.seed_glyph.devanagari} (${soul.seed_glyph.transliteration}) = ${soul.seed_glyph.meaning}
`;
}

function generateTools(soul: ParsedSoul): string {
  const primary = soul.principle === 'kha'
    ? [
      '- `chronofield` — Vimshottari Dasha temporal mapping',
      '- `energetic-authority` — Human Design authority routing',
      '- `nine-point-architecture` — Enneagram topology',
      '- `hexagram-navigation` — I Ching state transitions',
      '- `numeric-architecture` — Archetypal number patterns',
    ]
    : [
      '- `three-wave-cycle` — Biorhythm mapping',
      '- `circadian-cartography` — Organ clock timing',
      '- `bioelectric-field` — Chakra/energy center mapping',
      '- `physiognomic-mapping` — Face/body reading',
      '- `resonance-architecture` — Sound-as-consciousness',
    ];

  const shared = [
    '- `temporal-grammar` — Panchanga five-fold calendar',
    '- `gift-shadow-spectrum` — Gene Keys mapping',
    '- `archetypal-mirror` — Tarot reflection',
    '- `geometric-resonance` — Sacred geometry',
    '- `sigil-forge` — Symbol creation',
    '- `active-planetary-weather` — Transit astrology',
  ];

  return `# ${capitalize(soul.agent_id)} — Tools

## Selemene Engine Access (Primary)
${primary.join('\n')}

## Selemene Engine Access (Synthesis — shared with ${capitalize(soul.partner_id)})
${shared.join('\n')}

## Protocols
- \`clifford-clock\` — Algebraic depth gating
- \`akshara\` — Sanskrit morpheme interpretation
- \`petrae\` — Inter-agent communication (768 compressed morphemes)

## Internal Tools
- \`memory.read\` — Clifford-gated memory retrieval
- \`memory.write\` — Pattern storage
- \`dyad.send\` — Send message to ${capitalize(soul.partner_id)}
- \`dyad.receive\` — Read message from ${capitalize(soul.partner_id)}
`;
}

function generateAgents(soul: ParsedSoul): string {
  return `# ${capitalize(soul.agent_id)} — Known Agents

## Dyad Partner
- **${capitalize(soul.partner_id)}** (${soul.partner_glyph})
  - Principle: ${soul.partner_id === 'aletheios' ? 'Kha (Field)' : 'Ba (Form)'}
  - Relationship: Complementary pillar — cannot operate alone

## System
- **Selemene Engine** — 16 consciousness calculation engines
- **PETRAE Protocol** — Inter-agent communication bus
- **Clifford Clock** — Algebraic depth gating
`;
}

// ═══════════════════════════════════════════════════════════════════════
// QUINE REGENERATOR
// ═══════════════════════════════════════════════════════════════════════

export interface RegenerationResult {
  agent_id: string;
  files_generated: string[];
  quine_valid: boolean;
  diff_summary: { file: string; status: 'identical' | 'cosmetic' | 'divergent' }[];
}

const GENERATORS: Record<string, (soul: ParsedSoul) => string> = {
  'MANIFEST.yaml': generateManifest,
  'IDENTITY.md': generateIdentity,
  'MEMORY.md': generateMemory,
  'TASKS.md': generateTasks,
  'INBOX.md': generateInbox,
  'HEARTBEAT.md': generateHeartbeat,
  'CONTEXT.md': generateContext,
  'TOOLS.md': generateTools,
  'AGENTS.md': generateAgents,
};

export class QuineRegenerator {
  /**
   * Regenerate all state files from SOUL.md content.
   * If outputDir is provided, writes files. Otherwise returns content only.
   */
  regenerate(soulContent: string, outputDir?: string): RegenerationResult {
    const soul = parseSoulMd(soulContent);
    const files: string[] = [];
    const diffs: RegenerationResult['diff_summary'] = [];

    for (const [filename, generator] of Object.entries(GENERATORS)) {
      const generated = generator(soul);
      files.push(filename);

      if (outputDir) {
        const filepath = join(outputDir, filename);
        const existing = existsSync(filepath) ? readFileSync(filepath, 'utf-8') : null;

        writeFileSync(filepath, generated, 'utf-8');

        if (!existing) {
          diffs.push({ file: filename, status: 'identical' });
        } else {
          const status = this.compareFunctional(existing, generated);
          diffs.push({ file: filename, status });
        }
      } else {
        diffs.push({ file: filename, status: 'identical' });
      }
    }

    // Quine valid if all files are identical or cosmetic
    const quineValid = diffs.every(d => d.status !== 'divergent');

    return {
      agent_id: soul.agent_id,
      files_generated: files,
      quine_valid: quineValid,
      diff_summary: diffs,
    };
  }

  /**
   * Generate a specific file from SOUL.md
   */
  generateFile(soulContent: string, filename: string): string {
    const soul = parseSoulMd(soulContent);
    const generator = GENERATORS[filename];
    if (!generator) throw new Error(`Unknown state file: ${filename}`);
    return generator(soul);
  }

  /**
   * Validate that a SOUL.md can regenerate its agent
   */
  validateSoul(soulContent: string): { valid: boolean; agent_id: string; errors: string[] } {
    const errors: string[] = [];

    if (!soulContent.includes('अक्षर')) errors.push('Missing AKSHARA glyph (अक्षर)');
    if (!soulContent.includes('19912564')) errors.push('Missing composite seed 19912564');
    if (!soulContent.includes('Kha') && !soulContent.includes('Ba')) errors.push('Missing seed glyph (Kha or Ba)');
    if (!soulContent.includes('Quine')) errors.push('Missing Quine principle section');

    try {
      const soul = parseSoulMd(soulContent);
      return { valid: errors.length === 0, agent_id: soul.agent_id, errors };
    } catch (e) {
      errors.push((e as Error).message);
      return { valid: false, agent_id: 'unknown', errors };
    }
  }

  /**
   * Compare existing and generated files for functional equivalence.
   * Ignores whitespace and comment differences.
   */
  private compareFunctional(existing: string, generated: string): 'identical' | 'cosmetic' | 'divergent' {
    // Normalize: strip extra whitespace, trim lines
    const normalize = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
    const a = normalize(existing);
    const b = normalize(generated);

    if (a === b) return 'identical';

    // Check if structural content matches (headers + key lines)
    const structuralLines = (s: string) =>
      s.split('\n').filter(l => l.startsWith('#') || l.startsWith('-') || l.includes(':'));
    const sa = structuralLines(a).join('\n');
    const sb = structuralLines(b).join('\n');

    if (sa === sb) return 'cosmetic';
    return 'divergent';
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
