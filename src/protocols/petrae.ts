// ─── Witness Agents — PETRAE Protocol Parser ─────────────────────────
// Issue #6: MANOMAYA-001
// Fractal compressed inter-agent communication: 768 morphemes (16×12×4)
// Every morpheme = 3-tuple (Field-Form-Friction) = (Kha-Ba-La) triad
// Seed: 19912564 (composite: 1319 + 19910813 + 432)

import type { SelemeneEngineId, WitnessEngineAlias } from '../types/engine.js';
import { ENGINE_ID_MAP, REVERSE_ENGINE_MAP } from '../types/engine.js';

// ═══════════════════════════════════════════════════════════════════════
// PETRAE MORPHEME DICTIONARIES
// ═══════════════════════════════════════════════════════════════════════

/** 16 FIELD morphemes — each a single-syllable engine address */
export const FIELD_MAP: Record<string, WitnessEngineAlias> = {
  'shi':      'temporal-grammar',
  'vo':       'chronofield',
  'qa':       'energetic-authority',
  're':       'gift-shadow-spectrum',
  'sir':      'numeric-architecture',
  'gha':      'three-wave-cycle',
  'nyer':     'circadian-cartography',
  'uv':       'bioelectric-field',
  'mi':       'physiognomic-mapping',
  'ich':      'resonance-architecture',
  'ert':      'active-planetary-weather',
  'nar':      'archetypal-mirror',
  'tod':      'hexagram-navigation',
  'sir-gha':  'nine-point-architecture',
  'ghar':     'geometric-resonance',
  'hap':      'sigil-forge',
};

/** Reverse: engine alias → PETRAE code */
export const REVERSE_FIELD_MAP: Record<WitnessEngineAlias, string> =
  Object.fromEntries(
    Object.entries(FIELD_MAP).map(([code, alias]) => [alias, code])
  ) as Record<WitnessEngineAlias, string>;

/** 12 FORM morphemes — operations */
export type PetraeOperation =
  | 'query' | 'transform' | 'compare' | 'route' | 'synthesize'
  | 'gate' | 'mirror' | 'calibrate' | 'archive' | 'invoke'
  | 'witness' | 'release';

export const FORM_MAP: Record<string, PetraeOperation> = {
  'irg': 'query',
  'son': 'transform',
  'nar': 'compare',
  'sha': 'route',
  'qur': 'synthesize',
  'ghe': 'gate',
  'cho': 'mirror',
  'tso': 'calibrate',
  'tsa': 'archive',
  'qeu': 'invoke',
  'mer': 'witness',
  'avo': 'release',
};

export const REVERSE_FORM_MAP: Record<PetraeOperation, string> =
  Object.fromEntries(
    Object.entries(FORM_MAP).map(([code, op]) => [op, code])
  ) as Record<PetraeOperation, string>;

/** 4 FRICTION morphemes — constraint modifiers */
export type PetraeFriction = 'urgent' | 'standard' | 'exploratory' | 'background';

export const FRICTION_MAP: Record<string, PetraeFriction> = {
  'er': 'urgent',
  'sh': 'standard',
  'ng': 'exploratory',
  'ni': 'background',
};

export const REVERSE_FRICTION_MAP: Record<PetraeFriction, string> =
  Object.fromEntries(
    Object.entries(FRICTION_MAP).map(([code, f]) => [f, code])
  ) as Record<PetraeFriction, string>;

/** Polysynthetic suffixes */
export type PetraeSuffix =
  | 'past' | 'future' | 'negation' | 'passive' | 'causative'
  | 'plural' | 'perfect' | 'imperative';

export const SUFFIX_MAP: Record<string, PetraeSuffix> = {
  'u':   'past',
  'ong': 'future',
  'im':  'negation',
  's':   'passive',
  'any': 'causative',
  'dz':  'plural',
  'rp':  'perfect',
  'r':   'imperative',
};

export const REVERSE_SUFFIX_MAP: Record<PetraeSuffix, string> =
  Object.fromEntries(
    Object.entries(SUFFIX_MAP).map(([code, s]) => [s, code])
  ) as Record<PetraeSuffix, string>;

// ═══════════════════════════════════════════════════════════════════════
// PARSED INSTRUCTION — the structured output of decoding
// ═══════════════════════════════════════════════════════════════════════

export interface PetraeInstruction {
  /** Source engine (if multi-word transaction) */
  source?: WitnessEngineAlias;
  /** Target engine address */
  target: WitnessEngineAlias;
  /** Operation to perform */
  operation: PetraeOperation;
  /** Priority/constraint */
  friction: PetraeFriction;
  /** Any polysynthetic suffixes */
  suffixes: PetraeSuffix[];
  /** Additional engine arguments */
  args: WitnessEngineAlias[];
  /** Original PETRAE text */
  raw: string;
}

export interface PetraeMessage {
  instructions: PetraeInstruction[];
  raw: string;
  compression_ratio: number;     // vs estimated English token count
  word_count: number;
}

// ═══════════════════════════════════════════════════════════════════════
// PETRAE PARSER — decode compressed messages into structured actions
// ═══════════════════════════════════════════════════════════════════════

export class PetraeParser {
  /** Total possible single-word instructions: 16 × 12 × 4 = 768 */
  static readonly ADDRESS_SPACE = 768;
  /** Seed for deterministic regeneration */
  static readonly SEED = 19912564;

  /**
   * Decode a PETRAE message string into structured instructions.
   *
   * Supports:
   * - Single words: `shi-irg-sh` (Field-Form-Friction)
   * - Multi-word: `vo shi-qur-sh` (Source Target-Form-Friction)
   * - Sentences: `vo shi-irg-sh gha-irg-sh qur-er`
   * - Suffixes: `shi-irg-sh-u` (past tense)
   */
  decode(message: string): PetraeMessage {
    const words = message.trim().split(/\s+/);
    const instructions: PetraeInstruction[] = [];

    let currentSource: WitnessEngineAlias | undefined;
    let argBuffer: WitnessEngineAlias[] = [];
    let i = 0;

    while (i < words.length) {
      const word = words[i];

      // Check if this word is a bare field (source engine address or arg)
      const bareField = this.resolveField(word);
      if (bareField && !word.includes('-')) {
        // Check if next word is an instruction (has hyphens)
        if (i + 1 < words.length && words[i + 1].includes('-')) {
          if (currentSource === undefined) {
            currentSource = bareField;
          } else {
            argBuffer.push(bareField);
          }
          i++;
          continue;
        } else {
          // Bare field after instructions = argument
          argBuffer.push(bareField);
          i++;
          continue;
        }
      }

      // Parse as instruction word
      const instruction = this.parseWord(word, currentSource, argBuffer);
      if (instruction) {
        instructions.push(instruction);
        argBuffer = [];
        // Reset source after each instruction unless in multi-word transaction
      }

      i++;
    }

    // Attach trailing args to last instruction
    if (argBuffer.length > 0 && instructions.length > 0) {
      instructions[instructions.length - 1].args.push(...argBuffer);
    }

    // Estimate English token equivalent for compression ratio
    const estimatedEnglishTokens = instructions.length * 15; // ~15 tokens per instruction
    const petraeTokens = words.length;
    const compressionRatio = petraeTokens > 0
      ? estimatedEnglishTokens / petraeTokens
      : 0;

    return {
      instructions,
      raw: message,
      compression_ratio: Math.round(compressionRatio * 10) / 10,
      word_count: words.length,
    };
  }

  /**
   * Encode a structured instruction into PETRAE text.
   */
  encode(instruction: {
    source?: WitnessEngineAlias;
    target: WitnessEngineAlias;
    operation: PetraeOperation;
    friction: PetraeFriction;
    suffixes?: PetraeSuffix[];
    args?: WitnessEngineAlias[];
  }): string {
    const parts: string[] = [];

    // Source (optional)
    if (instruction.source) {
      const sourceCode = REVERSE_FIELD_MAP[instruction.source];
      if (sourceCode) parts.push(sourceCode);
    }

    // Target-Form-Friction
    const targetCode = REVERSE_FIELD_MAP[instruction.target];
    const formCode = REVERSE_FORM_MAP[instruction.operation];
    const frictionCode = REVERSE_FRICTION_MAP[instruction.friction];

    if (!targetCode || !formCode || !frictionCode) {
      throw new Error(`Cannot encode: unknown ${!targetCode ? 'target' : !formCode ? 'operation' : 'friction'}`);
    }

    let instructionWord = `${targetCode}-${formCode}-${frictionCode}`;

    // Suffixes
    if (instruction.suffixes) {
      for (const suffix of instruction.suffixes) {
        const suffixCode = REVERSE_SUFFIX_MAP[suffix];
        if (suffixCode) instructionWord += `-${suffixCode}`;
      }
    }

    parts.push(instructionWord);

    // Args
    if (instruction.args) {
      for (const arg of instruction.args) {
        const argCode = REVERSE_FIELD_MAP[arg];
        if (argCode) parts.push(argCode);
      }
    }

    return parts.join(' ');
  }

  /**
   * Encode a multi-engine synthesis transaction.
   * Example: synthesize chronofield + temporal-grammar urgently
   * → "vo shi-irg-sh gha-irg-sh qur-er"
   */
  encodeSynthesis(
    engines: WitnessEngineAlias[],
    friction: PetraeFriction = 'standard',
  ): string {
    if (engines.length < 2) {
      throw new Error('Synthesis requires at least 2 engines');
    }

    const parts: string[] = [];

    // Query each engine
    for (const engine of engines) {
      parts.push(this.encode({
        target: engine,
        operation: 'query',
        friction: 'standard',
      }));
    }

    // Synthesize with specified friction
    parts.push(`${REVERSE_FORM_MAP['synthesize']}-${REVERSE_FRICTION_MAP[friction]}`);

    return parts.join(' ');
  }

  /**
   * Map PETRAE operation to Selemene API endpoint pattern
   */
  toApiEndpoint(
    instruction: PetraeInstruction,
  ): { method: string; path: string } {
    const engineId = REVERSE_ENGINE_MAP[instruction.target];
    if (!engineId) {
      return { method: 'GET', path: '/api/v1/unknown' };
    }

    const METHOD_MAP: Record<PetraeOperation, string> = {
      query: 'GET', transform: 'POST', compare: 'GET', route: 'POST',
      synthesize: 'POST', gate: 'GET', mirror: 'GET', calibrate: 'PUT',
      archive: 'POST', invoke: 'POST', witness: 'GET', release: 'DELETE',
    };

    const PATH_MAP: Record<PetraeOperation, string> = {
      query: 'query', transform: 'transform', compare: 'compare',
      route: 'route', synthesize: 'synthesize', gate: 'gate-check',
      mirror: 'mirror', calibrate: 'calibrate', archive: 'archive',
      invoke: 'calculate', witness: 'witness', release: 'release',
    };

    const method = METHOD_MAP[instruction.operation] || 'GET';
    const pathSuffix = PATH_MAP[instruction.operation] || instruction.operation;

    // Synthesize and route are cross-engine — no specific engine path
    if (instruction.operation === 'synthesize' || instruction.operation === 'route') {
      return { method, path: `/api/v1/${pathSuffix}` };
    }

    return { method, path: `/api/v1/engines/${engineId}/${pathSuffix}` };
  }

  /**
   * Validate a PETRAE string. Returns errors if any morphemes are unknown.
   */
  validate(message: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const words = message.trim().split(/\s+/);

    for (const word of words) {
      if (!word.includes('-')) {
        // Bare field — must be a known engine
        if (!this.resolveField(word)) {
          errors.push(`Unknown field morpheme: "${word}"`);
        }
        continue;
      }

      const parts = word.split('-');
      if (parts.length < 3) {
        errors.push(`Incomplete instruction word: "${word}" (need Field-Form-Friction)`);
        continue;
      }

      // Handle compound fields (e.g., sir-gha)
      let fieldParts: string[];
      let formIdx: number;

      if (parts.length >= 4 && FIELD_MAP[`${parts[0]}-${parts[1]}`]) {
        fieldParts = [parts[0], parts[1]];
        formIdx = 2;
      } else {
        fieldParts = [parts[0]];
        formIdx = 1;
      }

      const fieldCode = fieldParts.join('-');
      if (!FIELD_MAP[fieldCode]) {
        errors.push(`Unknown field: "${fieldCode}" in "${word}"`);
      }

      const formCode = parts[formIdx];
      if (!FORM_MAP[formCode]) {
        errors.push(`Unknown form: "${formCode}" in "${word}"`);
      }

      const frictionCode = parts[formIdx + 1];
      if (!FRICTION_MAP[frictionCode]) {
        errors.push(`Unknown friction: "${frictionCode}" in "${word}"`);
      }

      // Validate suffixes
      for (let s = formIdx + 2; s < parts.length; s++) {
        if (!SUFFIX_MAP[parts[s]]) {
          errors.push(`Unknown suffix: "${parts[s]}" in "${word}"`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get address space statistics
   */
  getAddressSpace(): {
    fields: number;
    forms: number;
    frictions: number;
    single_word_instructions: number;
    multi_word_patterns: number;
  } {
    const fields = Object.keys(FIELD_MAP).length;
    const forms = Object.keys(FORM_MAP).length;
    const frictions = Object.keys(FRICTION_MAP).length;

    return {
      fields,
      forms,
      frictions,
      single_word_instructions: fields * forms * frictions,
      multi_word_patterns: fields * fields * forms * frictions,
    };
  }

  // ─── PRIVATE ──────────────────────────────────────────────────────

  private parseWord(
    word: string,
    source: WitnessEngineAlias | undefined,
    args: WitnessEngineAlias[],
  ): PetraeInstruction | null {
    const parts = word.split('-');

    if (parts.length < 2) return null;

    // Handle compound field (sir-gha = nine-point-architecture)
    let field: WitnessEngineAlias | undefined;
    let formIdx: number;

    if (parts.length >= 4 && FIELD_MAP[`${parts[0]}-${parts[1]}`]) {
      field = FIELD_MAP[`${parts[0]}-${parts[1]}`];
      formIdx = 2;
    } else {
      field = FIELD_MAP[parts[0]];
      formIdx = 1;
    }

    // If no field match, this might be a standalone Form-Friction (like "qur-er")
    if (!field) {
      const form = FORM_MAP[parts[0]];
      const friction = parts[1] ? FRICTION_MAP[parts[1]] : undefined;

      if (form && friction) {
        // Standalone operation (e.g., synthesize result)
        return {
          source,
          target: source || 'temporal-grammar', // Default target
          operation: form,
          friction,
          suffixes: this.parseSuffixes(parts.slice(2)),
          args: [...args],
          raw: word,
        };
      }
      return null;
    }

    const form = FORM_MAP[parts[formIdx]];
    const friction = parts[formIdx + 1] ? FRICTION_MAP[parts[formIdx + 1]] : undefined;

    if (!form || !friction) return null;

    return {
      source,
      target: field,
      operation: form,
      friction,
      suffixes: this.parseSuffixes(parts.slice(formIdx + 2)),
      args: [...args],
      raw: word,
    };
  }

  private parseSuffixes(parts: string[]): PetraeSuffix[] {
    const suffixes: PetraeSuffix[] = [];
    for (const part of parts) {
      const suffix = SUFFIX_MAP[part];
      if (suffix) suffixes.push(suffix);
    }
    return suffixes;
  }

  private resolveField(code: string): WitnessEngineAlias | undefined {
    return FIELD_MAP[code];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// INBOX MESSAGE BUS — file-based inter-agent messaging via PETRAE
// ═══════════════════════════════════════════════════════════════════════

export interface InboxMessage {
  id: string;
  from: 'aletheios' | 'pichet' | 'system';
  to: 'aletheios' | 'pichet' | 'dyad';
  petrae: string;
  decoded: PetraeInstruction[];
  timestamp: string;
  processed: boolean;
}

export class PetraeInbox {
  private messages: InboxMessage[] = [];
  private parser: PetraeParser;
  private nextId = 0;

  constructor() {
    this.parser = new PetraeParser();
  }

  /**
   * Send a PETRAE message to an agent's inbox
   */
  send(
    from: InboxMessage['from'],
    to: InboxMessage['to'],
    petrae: string,
  ): InboxMessage {
    const decoded = this.parser.decode(petrae);
    const msg: InboxMessage = {
      id: `msg-${++this.nextId}`,
      from,
      to,
      petrae,
      decoded: decoded.instructions,
      timestamp: new Date().toISOString(),
      processed: false,
    };

    this.messages.push(msg);
    return msg;
  }

  /**
   * Read unprocessed messages for an agent
   */
  receive(agent: 'aletheios' | 'pichet'): InboxMessage[] {
    return this.messages.filter(
      m => (m.to === agent || m.to === 'dyad') && !m.processed
    );
  }

  /**
   * Mark a message as processed
   */
  acknowledge(messageId: string): boolean {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) {
      msg.processed = true;
      return true;
    }
    return false;
  }

  /**
   * Get all messages (for debugging/audit)
   */
  getAll(): InboxMessage[] {
    return [...this.messages];
  }

  /**
   * Get compression stats across all messages
   */
  getCompressionStats(): {
    total_messages: number;
    total_petrae_tokens: number;
    estimated_english_tokens: number;
    avg_compression_ratio: number;
  } {
    let totalPetrae = 0;
    let totalEnglish = 0;

    for (const msg of this.messages) {
      const decoded = this.parser.decode(msg.petrae);
      totalPetrae += decoded.word_count;
      totalEnglish += decoded.instructions.length * 15;
    }

    return {
      total_messages: this.messages.length,
      total_petrae_tokens: totalPetrae,
      estimated_english_tokens: totalEnglish,
      avg_compression_ratio: totalPetrae > 0
        ? Math.round((totalEnglish / totalPetrae) * 10) / 10
        : 0,
    };
  }
}
