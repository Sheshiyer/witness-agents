// ─── /integratedreading — Engine Lexicons Parser ──────────────────────
// Reads engine-lexicons.md and returns per-engine + per-register vocab
// and voice rules. The orchestrator injects the matching section into
// the system prompt based on the request's resolved consciousness level.
//
// Per design doc 2026-05-15-consciousness-level-register-design.md § 1.3.
// Closes #72 (P1.3 — schema + parser, content filled in #76 P2.3).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { RegisterBand } from './modes/parser.js';

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

/** Selemene engine IDs. Mirror what the Selemene API exposes. */
export const KNOWN_ENGINE_IDS = [
  'vimshottari',
  'panchanga',
  'ashtakavarga',
  'vedic-clock',
  'human-design',
  'gene-keys',
  'tarot',
  'i-ching',
  'numerology',
  'biorhythm',
  'nadabrahman',
  'biofield',
  'face-reading',
  'sacred-geometry',
  'enneagram',
  'sigil-forge',
] as const;

export type EngineId = (typeof KNOWN_ENGINE_IDS)[number];

export interface EngineLexicon {
  vocab: string;        // raw markdown of the vocabulary block
  voice_rules: string;  // raw markdown of the voice-rules block
}

// ────────────────────────────────────────────────────────────────────────
// Path resolution
// ────────────────────────────────────────────────────────────────────────

/** Default location of engine-lexicons.md (next to the orchestrator). */
function defaultLexiconsPath(): string {
  return join(new URL('.', import.meta.url).pathname, 'engine-lexicons.md');
}

// ────────────────────────────────────────────────────────────────────────
// Cache
// ────────────────────────────────────────────────────────────────────────

interface ParsedLexicons {
  /** Map: engine_id → register → { vocab, voice_rules } */
  engines: Record<string, Record<RegisterBand, EngineLexicon>>;
}

let _cache: { path: string; parsed: ParsedLexicons } | null = null;

// ────────────────────────────────────────────────────────────────────────
// Parser
// ────────────────────────────────────────────────────────────────────────

/**
 * Parse the engine-lexicons.md file into a structured map.
 *
 * Section structure expected:
 *   ## <engine-id>
 *   ### L1-L3 register
 *   **Vocabulary**
 *   ... vocab markdown ...
 *   **Voice rules**
 *   ... voice rules ...
 *   ### L4-L5 register
 *   **Vocabulary**
 *   ...
 *
 * Section delimiters tolerate the "L1-L3 register" and "L1-L3 Register"
 * casing variants and any heading-trailing whitespace.
 */
export function parseLexicons(path?: string): ParsedLexicons {
  const filePath = path ?? defaultLexiconsPath();
  if (_cache && _cache.path === filePath) return _cache.parsed;

  if (!existsSync(filePath)) {
    throw new Error(`engine-lexicons.md not found at ${filePath}`);
  }
  const raw = readFileSync(filePath, 'utf-8');

  const engines: Record<string, Record<RegisterBand, EngineLexicon>> = {};

  // Split body by `## <name>` headers (level-2)
  const engineSections = raw.split(/^## /m).slice(1);
  for (const section of engineSections) {
    const firstNewline = section.indexOf('\n');
    if (firstNewline === -1) continue;
    const heading = section.slice(0, firstNewline).trim().toLowerCase();
    const body = section.slice(firstNewline + 1);

    // Skip non-engine sections (e.g., "Lessons (autoresearch-appended)")
    if (!(KNOWN_ENGINE_IDS as ReadonlyArray<string>).includes(heading)) continue;

    const l1l3 = extractRegisterBlock(body, 'l1-l3');
    const l4l5 = extractRegisterBlock(body, 'l4-l5');
    engines[heading] = {
      l1_l3: l1l3,
      l4_l5: l4l5,
    };
  }

  const parsed = { engines };
  _cache = { path: filePath, parsed };
  return parsed;
}

/**
 * Extract the vocabulary + voice-rules sub-blocks for a register band
 * from an engine's body. Returns empty strings if the band is absent.
 */
function extractRegisterBlock(
  engineBody: string,
  band: 'l1-l3' | 'l4-l5',
): EngineLexicon {
  // Match `### L1-L3 register` (case-insensitive, trailing whitespace OK)
  const headingRe = new RegExp(`^### ${band} register\\s*$`, 'im');
  const m = engineBody.match(headingRe);
  if (!m || m.index === undefined) return { vocab: '', voice_rules: '' };

  // Slice from heading to next ### or ## or end of body
  const start = m.index + m[0].length;
  const after = engineBody.slice(start);
  const nextSectionRe = /^(### |## )/m;
  const next = after.match(nextSectionRe);
  const end = next && next.index !== undefined ? next.index : after.length;
  const block = after.slice(0, end).trim();

  // Extract **Vocabulary** ... **Voice rules** ... sub-blocks
  const vocabMatch = block.match(/\*\*Vocabulary\*\*\s*\n([\s\S]*?)(?=\*\*Voice rules\*\*|$)/i);
  const voiceMatch = block.match(/\*\*Voice rules\*\*\s*\n([\s\S]*?)$/i);

  return {
    vocab: vocabMatch ? vocabMatch[1].trim() : '',
    voice_rules: voiceMatch ? voiceMatch[1].trim() : '',
  };
}

// ────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────

/**
 * Look up the lexicon for a specific engine + register band.
 *
 * @throws when engine_id is not a recognized Selemene engine ID
 */
export function getEngineLexicon(
  engine_id: string,
  register: RegisterBand,
  path?: string,
): EngineLexicon {
  if (!(KNOWN_ENGINE_IDS as ReadonlyArray<string>).includes(engine_id)) {
    throw new Error(
      `Unknown engine_id '${engine_id}'. Known: ${KNOWN_ENGINE_IDS.join(' | ')}`,
    );
  }
  const parsed = parseLexicons(path);
  const engine = parsed.engines[engine_id];
  if (!engine) {
    // Skeleton may legitimately not have content yet (P2.3 fills it)
    return { vocab: '', voice_rules: '' };
  }
  return engine[register];
}

/**
 * Compose a system-prompt-ready block from multiple engines at one register.
 * Used by the orchestrator when injecting lexicons for the engines a mode
 * foregrounds (per its engine_overlay_weights).
 */
export function composeLexiconBlock(
  engine_ids: string[],
  register: RegisterBand,
  path?: string,
): string {
  const sections: string[] = [];
  for (const id of engine_ids) {
    const lex = getEngineLexicon(id, register, path);
    if (!lex.vocab && !lex.voice_rules) continue;
    sections.push(
      `### ${id} (${register})\n` +
      (lex.vocab ? `\n**Vocabulary**\n${lex.vocab}\n` : '') +
      (lex.voice_rules ? `\n**Voice rules**\n${lex.voice_rules}\n` : ''),
    );
  }
  if (sections.length === 0) return '';
  return `## Engine Lexicons (${register})\n\n` + sections.join('\n');
}

/** Clear the in-memory cache. Useful for tests that swap fixture files. */
export function clearLexiconCache(): void {
  _cache = null;
}
