// ─── /integratedreading — Mode-doc parser ─────────────────────────────
// Parses scripts/integratedreading/modes/<mode>.md into typed config +
// named body sections + structured lessons list.
//
// One mode-doc = one mode. The orchestrator consumes the parser output;
// mode-specific knowledge never lives in code. Per design doc § 2.
//
// Frontmatter spec lives in scripts/integratedreading/modes/_schema.md
// (P0.3). Required fields enforced at parse time, not at consumption time,
// so a malformed mode doc surfaces the error early.

import { readFileSync } from 'node:fs';
import { load as loadYAML } from 'js-yaml';

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export type TopologyKey = 'dyad-arc' | 'triad-triangle' | 'pentagon' | 'web-graph';
export type ArchitectureKey = 'linear' | 'hierarchical';

export interface PassSpec {
  id: string;
  title: string;
  target_words: number;
  template: string;          // anchor name (lowercase-hyphenated section header)
  model?: string;            // optional NVIDIA model override; falls back to SYNTH_MODELS.PRIMARY
}

export interface ModeConfig {
  mode: string;
  subject_count: { min: number; max: number };
  roles: string[];
  target_words: { min: number; max: number };
  architecture: ArchitectureKey;
  pass_plan: PassSpec[];
  engine_overlay_weights: Record<string, number>;
  house_overlay: number[];
  bridge_mandates: string[];
  svg_topology: TopologyKey;
}

export interface LessonsEntry {
  date: string;
  title: string;
  question?: string;
  variants?: string[];
  winner?: string;
  adopted?: string;
  reference?: string;
}

export interface ParsedModeDoc {
  frontmatter: ModeConfig;
  sections: Record<string, string>;   // key = lowercase-hyphenated header (no leading '##')
  lessons: LessonsEntry[];
  raw_path: string;
}

// ────────────────────────────────────────────────────────────────────────
// Required-field validation
// ────────────────────────────────────────────────────────────────────────

const REQUIRED_KEYS: Array<keyof ModeConfig> = [
  'mode',
  'subject_count',
  'roles',
  'target_words',
  'architecture',
  'pass_plan',
  'engine_overlay_weights',
  'house_overlay',
  'bridge_mandates',
  'svg_topology',
];

const VALID_TOPOLOGIES: ReadonlyArray<TopologyKey> = [
  'dyad-arc',
  'triad-triangle',
  'pentagon',
  'web-graph',
];

const VALID_ARCHITECTURES: ReadonlyArray<ArchitectureKey> = ['linear', 'hierarchical'];

function assertModeConfig(fm: any, path: string): asserts fm is ModeConfig {
  if (!fm || typeof fm !== 'object') {
    throw new Error(`Mode doc ${path}: frontmatter missing or not an object`);
  }
  for (const key of REQUIRED_KEYS) {
    if (!(key in fm)) {
      throw new Error(`Mode doc ${path}: missing required frontmatter key '${key}'`);
    }
  }
  if (!VALID_TOPOLOGIES.includes(fm.svg_topology)) {
    throw new Error(
      `Mode doc ${path}: invalid svg_topology '${fm.svg_topology}'. ` +
      `Valid: ${VALID_TOPOLOGIES.join(' | ')}`,
    );
  }
  if (!VALID_ARCHITECTURES.includes(fm.architecture)) {
    throw new Error(
      `Mode doc ${path}: invalid architecture '${fm.architecture}'. ` +
      `Valid: ${VALID_ARCHITECTURES.join(' | ')}`,
    );
  }
  if (!Array.isArray(fm.pass_plan) || fm.pass_plan.length === 0) {
    throw new Error(`Mode doc ${path}: pass_plan must be a non-empty array`);
  }
  for (const [i, p] of fm.pass_plan.entries()) {
    if (!p.id || !p.title || !p.template || typeof p.target_words !== 'number') {
      throw new Error(
        `Mode doc ${path}: pass_plan[${i}] missing one of {id, title, template, target_words}`,
      );
    }
  }
  if (typeof fm.subject_count?.min !== 'number' || typeof fm.subject_count?.max !== 'number') {
    throw new Error(`Mode doc ${path}: subject_count.{min,max} must be numbers`);
  }
  if (fm.subject_count.min > fm.subject_count.max) {
    throw new Error(`Mode doc ${path}: subject_count.min > subject_count.max`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// Frontmatter + body split
// ────────────────────────────────────────────────────────────────────────

const FRONTMATTER_DELIMITER = '---';

interface SplitResult {
  yaml: string;
  body: string;
}

function splitFrontmatter(raw: string, path: string): SplitResult {
  if (!raw.startsWith(FRONTMATTER_DELIMITER)) {
    throw new Error(`Mode doc ${path}: missing leading '---' frontmatter delimiter`);
  }
  const closeIdx = raw.indexOf('\n' + FRONTMATTER_DELIMITER, FRONTMATTER_DELIMITER.length);
  if (closeIdx === -1) {
    throw new Error(`Mode doc ${path}: missing closing '---' frontmatter delimiter`);
  }
  const yaml = raw.slice(FRONTMATTER_DELIMITER.length, closeIdx).trim();
  // Skip past the closing delimiter line
  const bodyStart = raw.indexOf('\n', closeIdx + FRONTMATTER_DELIMITER.length + 1);
  const body = bodyStart === -1 ? '' : raw.slice(bodyStart + 1);
  return { yaml, body };
}

// ────────────────────────────────────────────────────────────────────────
// Body section splitter
// ────────────────────────────────────────────────────────────────────────

/** Split body by `## <header>` lines. Returns map keyed by slug. */
function splitSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headerRe = /^## (.+?)\s*$/gm;
  const matches: Array<{ slug: string; index: number; headerEnd: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(body)) !== null) {
    const slug = m[1]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    matches.push({ slug, index: m.index, headerEnd: m.index + m[0].length });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].headerEnd;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    sections[matches[i].slug] = body.slice(start, end).trim();
  }
  return sections;
}

// ────────────────────────────────────────────────────────────────────────
// Lessons section parser
// ────────────────────────────────────────────────────────────────────────

/**
 * Parses the `## lessons` section into structured entries.
 *
 * Entry shape (per design doc § 4):
 *
 *   ### YYYY-MM-DD — <title>
 *   **Question:** <question>
 *   **Variants:** <variants>
 *   **Winner:** <winner>
 *   **Adopted:** <adopted>
 *   **Reference:** <reference>
 *
 * Empty section returns []. Malformed entries return whatever bold fields
 * parse cleanly — lessons are advisory, not contractual.
 */
function parseLessons(lessonsBody: string | undefined): LessonsEntry[] {
  if (!lessonsBody || !lessonsBody.trim()) return [];
  const entries: LessonsEntry[] = [];
  const entryRe = /^### (\d{4}-\d{2}-\d{2})\s*[—–-]\s*(.+?)$/gm;
  const headers: Array<{ date: string; title: string; index: number; headerEnd: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(lessonsBody)) !== null) {
    headers.push({
      date: m[1],
      title: m[2].trim(),
      index: m.index,
      headerEnd: m.index + m[0].length,
    });
  }
  for (let i = 0; i < headers.length; i++) {
    const body = lessonsBody.slice(
      headers[i].headerEnd,
      i + 1 < headers.length ? headers[i + 1].index : lessonsBody.length,
    );
    const fields: Partial<LessonsEntry> = {};
    for (const fieldName of ['Question', 'Variants', 'Winner', 'Adopted', 'Reference'] as const) {
      const re = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+?)(?=\\n\\*\\*|\\n\\n|$)`, 's');
      const fm = body.match(re);
      if (fm) {
        const value = fm[1].trim();
        if (fieldName === 'Variants') {
          fields.variants = value.split(/[,\/]\s*/).map((v) => v.trim()).filter(Boolean);
        } else {
          (fields as any)[fieldName.toLowerCase()] = value;
        }
      }
    }
    entries.push({ date: headers[i].date, title: headers[i].title, ...fields });
  }
  return entries;
}

// ────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────

/** Parse a mode-doc Markdown file at `path`. Throws on missing required fields. */
export function parseModeDoc(path: string): ParsedModeDoc {
  const raw = readFileSync(path, 'utf-8');
  const { yaml, body } = splitFrontmatter(raw, path);

  let frontmatter: any;
  try {
    frontmatter = loadYAML(yaml);
  } catch (err: any) {
    throw new Error(`Mode doc ${path}: malformed YAML frontmatter — ${err.message}`);
  }

  assertModeConfig(frontmatter, path);

  const sections = splitSections(body);
  const lessons = parseLessons(sections.lessons);

  // pass_plan templates must resolve to actual sections in the body
  for (const pass of frontmatter.pass_plan) {
    if (!sections[pass.template]) {
      throw new Error(
        `Mode doc ${path}: pass_plan[${pass.id}].template '${pass.template}' has no matching '## ${pass.template}' section`,
      );
    }
  }

  return {
    frontmatter,
    sections,
    lessons,
    raw_path: path,
  };
}

/** Render a compressed summary of the lessons section for system-prompt injection. */
export function summarizeLessons(lessons: LessonsEntry[], maxEntries = 5): string {
  if (lessons.length === 0) return '';
  const recent = lessons.slice(-maxEntries);
  const lines = recent.map((l) => {
    const adopted = l.adopted ? ` — Adopted: ${l.adopted}` : '';
    return `• ${l.date} ${l.title}${adopted}`;
  });
  return `## Prior Autoresearch Findings\n\n${lines.join('\n')}`;
}
