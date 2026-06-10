#!/usr/bin/env tsx
// ─── Witness Agents — Wisdom Corpus Ingestion Script ────────────────────
// Embeds ALL Selemene-engine wisdom data into Cloudflare Vectorize.
// Usage: npx tsx scripts/ingest-wisdom-corpus.ts [--dry-run] [--system gene-keys,human-design]

import { readFile, readdir, writeFile, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { NvidiaEmbeddingProvider, type BatchEmbeddingItem } from '../src/inference/nvidia-embedding.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Passage {
  id: string;
  text: string;
  metadata: PassageMetadata;
}

interface PassageMetadata {
  system: string;
  category: string;
  number?: number;
  field: string;
  name: string;
  text: string;
}

interface VectorizeEntry {
  id: string;
  values: number[];
  metadata: PassageMetadata;
}

interface CLIOptions {
  dryRun: boolean;
  systems: string[] | null;
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const __dirname = dirname(fileURLToPath(import.meta.url));
const SELEMENE_DATA_DIR = join(__dirname, '../../Selemene-engine/data');
const OUTPUT_FILE = join(__dirname, '../.vectorize-wisdom-corpus.ndjson');
const VECTORIZE_INDEX = 'witness-wisdom-corpus';
const BATCH_SIZE = 50;

// ═══════════════════════════════════════════════════════════════════════
// PASSAGE EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Extract passages from Gene Keys archetypes.
 * Each key has shadow_description, gift_description, siddhi_description.
 */
async function extractGeneKeys(): Promise<Passage[]> {
  const filePath = join(SELEMENE_DATA_DIR, 'gene-keys/archetypes.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));
  const passages: Passage[] = [];

  const geneKeys = data.gene_keys || {};
  for (const [num, key] of Object.entries(geneKeys)) {
    const gk = key as {
      number: number;
      name: string;
      shadow_description?: string;
      gift_description?: string;
      siddhi_description?: string;
      shadow?: string;
      gift?: string;
      siddhi?: string;
      life_theme?: string;
    };

    const number = parseInt(num);
    const name = gk.name || `Gene Key ${number}`;

    // Shadow description
    if (gk.shadow_description) {
      passages.push({
        id: `selemene:gene-keys:${number}:shadow_description`,
        text: `Gene Key ${number} - ${name} - Shadow (${gk.shadow || 'Shadow'}): ${gk.shadow_description}`,
        metadata: {
          system: 'gene-keys',
          category: 'archetype',
          number,
          field: 'shadow_description',
          name,
          text: gk.shadow_description,
        },
      });
    }

    // Gift description
    if (gk.gift_description) {
      passages.push({
        id: `selemene:gene-keys:${number}:gift_description`,
        text: `Gene Key ${number} - ${name} - Gift (${gk.gift || 'Gift'}): ${gk.gift_description}`,
        metadata: {
          system: 'gene-keys',
          category: 'archetype',
          number,
          field: 'gift_description',
          name,
          text: gk.gift_description,
        },
      });
    }

    // Siddhi description
    if (gk.siddhi_description) {
      passages.push({
        id: `selemene:gene-keys:${number}:siddhi_description`,
        text: `Gene Key ${number} - ${name} - Siddhi (${gk.siddhi || 'Siddhi'}): ${gk.siddhi_description}`,
        metadata: {
          system: 'gene-keys',
          category: 'archetype',
          number,
          field: 'siddhi_description',
          name,
          text: gk.siddhi_description,
        },
      });
    }

    // Life theme
    if (gk.life_theme) {
      passages.push({
        id: `selemene:gene-keys:${number}:life_theme`,
        text: `Gene Key ${number} - ${name} - Life Theme: ${gk.life_theme}`,
        metadata: {
          system: 'gene-keys',
          category: 'archetype',
          number,
          field: 'life_theme',
          name,
          text: gk.life_theme,
        },
      });
    }
  }

  return passages;
}

/**
 * Extract passages from Human Design gates.
 */
async function extractHDGates(): Promise<Passage[]> {
  const filePath = join(SELEMENE_DATA_DIR, 'human-design/gates.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));
  const passages: Passage[] = [];

  const gates = data.gates || {};
  for (const [num, gate] of Object.entries(gates)) {
    const g = gate as {
      number: number;
      name: string;
      description?: string;
      keynote?: string;
      center?: string;
      gift?: string;
      shadow?: string;
    };

    const number = parseInt(num);
    const name = g.name || `Gate ${number}`;

    if (g.description) {
      passages.push({
        id: `selemene:human-design:gate:${number}:description`,
        text: `Human Design Gate ${number} - ${name} (${g.keynote || 'Keynote'}): ${g.description}`,
        metadata: {
          system: 'human-design',
          category: 'gate',
          number,
          field: 'description',
          name,
          text: g.description,
        },
      });
    }
  }

  return passages;
}

/**
 * Extract passages from Human Design types.
 */
async function extractHDTypes(): Promise<Passage[]> {
  const filePath = join(SELEMENE_DATA_DIR, 'human-design/types.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));
  const passages: Passage[] = [];

  const types = data.types || {};
  for (const [key, type] of Object.entries(types)) {
    const t = type as {
      name: string;
      description?: string;
      strategy?: string;
      signature?: string;
      not_self_theme?: string;
      characteristics?: string[];
      strategy_details?: { [key: string]: string };
    };

    const name = t.name || key;
    const typeKey = key.toLowerCase().replace(/_/g, '-');

    // Main description
    if (t.description) {
      passages.push({
        id: `selemene:human-design:type:${typeKey}:description`,
        text: `Human Design Type: ${name} - ${t.description}`,
        metadata: {
          system: 'human-design',
          category: 'type',
          field: 'description',
          name,
          text: t.description,
        },
      });
    }

    // Strategy
    if (t.strategy) {
      const strategyText = `${name}'s strategy is "${t.strategy}". Signature when aligned: ${t.signature || 'alignment'}. Not-self theme when misaligned: ${t.not_self_theme || 'resistance'}.`;
      passages.push({
        id: `selemene:human-design:type:${typeKey}:strategy`,
        text: `Human Design Type Strategy: ${strategyText}`,
        metadata: {
          system: 'human-design',
          category: 'type',
          field: 'strategy',
          name,
          text: strategyText,
        },
      });
    }

    // Characteristics
    if (t.characteristics && t.characteristics.length > 0) {
      const charText = t.characteristics.join('. ');
      passages.push({
        id: `selemene:human-design:type:${typeKey}:characteristics`,
        text: `Human Design ${name} Characteristics: ${charText}`,
        metadata: {
          system: 'human-design',
          category: 'type',
          field: 'characteristics',
          name,
          text: charText,
        },
      });
    }
  }

  return passages;
}

/**
 * Extract passages from Human Design profiles.
 */
async function extractHDProfiles(): Promise<Passage[]> {
  const filePath = join(SELEMENE_DATA_DIR, 'human-design/profiles.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));
  const passages: Passage[] = [];

  // Extract line descriptions
  const lines = data.lines || {};
  for (const [num, line] of Object.entries(lines)) {
    const l = line as {
      name: string;
      theme?: string;
      description?: string;
      shadow?: string;
      gift?: string;
    };

    const number = parseInt(num);
    const name = l.name || `Line ${number}`;

    if (l.description) {
      passages.push({
        id: `selemene:human-design:profile-line:${number}:description`,
        text: `Human Design Profile Line ${number} - ${name} (${l.theme || 'Theme'}): ${l.description}`,
        metadata: {
          system: 'human-design',
          category: 'profile-line',
          number,
          field: 'description',
          name,
          text: l.description,
        },
      });
    }
  }

  // Extract profile combinations
  const profiles = data.profiles || {};
  for (const [key, profile] of Object.entries(profiles)) {
    const p = profile as {
      name: string;
      description?: string;
      life_theme?: string;
      conscious_line?: number;
      unconscious_line?: number;
    };

    const name = p.name || key;
    const profileKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (p.description) {
      passages.push({
        id: `selemene:human-design:profile:${profileKey}:description`,
        text: `Human Design Profile ${name}: ${p.description}`,
        metadata: {
          system: 'human-design',
          category: 'profile',
          field: 'description',
          name,
          text: p.description,
        },
      });
    }

    if (p.life_theme) {
      passages.push({
        id: `selemene:human-design:profile:${profileKey}:life_theme`,
        text: `Human Design Profile ${name} Life Theme: ${p.life_theme}`,
        metadata: {
          system: 'human-design',
          category: 'profile',
          field: 'life_theme',
          name,
          text: p.life_theme,
        },
      });
    }
  }

  return passages;
}

/**
 * Extract passages from Human Design authorities.
 */
async function extractHDAuthorities(): Promise<Passage[]> {
  const filePath = join(SELEMENE_DATA_DIR, 'human-design/authorities.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));
  const passages: Passage[] = [];

  const authorities = data.authorities || {};
  for (const [key, auth] of Object.entries(authorities)) {
    const a = auth as {
      name: string;
      description?: string;
      how_it_works?: { mechanism?: string; timing?: string };
      decision_process?: string[];
    };

    const name = a.name || key;
    const authKey = key.toLowerCase().replace(/_/g, '-');

    if (a.description) {
      passages.push({
        id: `selemene:human-design:authority:${authKey}:description`,
        text: `Human Design Authority: ${name} - ${a.description}`,
        metadata: {
          system: 'human-design',
          category: 'authority',
          field: 'description',
          name,
          text: a.description,
        },
      });
    }

    if (a.how_it_works?.mechanism) {
      const mechanismText = `${a.how_it_works.mechanism}${a.how_it_works.timing ? `. Timing: ${a.how_it_works.timing}` : ''}`;
      passages.push({
        id: `selemene:human-design:authority:${authKey}:mechanism`,
        text: `Human Design ${name} Mechanism: ${mechanismText}`,
        metadata: {
          system: 'human-design',
          category: 'authority',
          field: 'mechanism',
          name,
          text: mechanismText,
        },
      });
    }

    if (a.decision_process && a.decision_process.length > 0) {
      const processText = a.decision_process.join('. ');
      passages.push({
        id: `selemene:human-design:authority:${authKey}:decision_process`,
        text: `Human Design ${name} Decision Process: ${processText}`,
        metadata: {
          system: 'human-design',
          category: 'authority',
          field: 'decision_process',
          name,
          text: processText,
        },
      });
    }
  }

  return passages;
}

/**
 * Extract passages from Human Design centers.
 */
async function extractHDCenters(): Promise<Passage[]> {
  const filePath = join(SELEMENE_DATA_DIR, 'human-design/centers.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));
  const passages: Passage[] = [];

  const centers = data.centers || {};
  for (const [key, center] of Object.entries(centers)) {
    const c = center as {
      name: string;
      type?: string;
      function?: string;
      when_defined?: string;
      when_undefined?: string;
    };

    const name = c.name || key;
    const centerKey = key.toLowerCase().replace(/_/g, '-');

    const definedText = `${name} (${c.type || 'Center'}): Function - ${c.function || 'Energy center'}. When Defined: ${c.when_defined || 'Consistent energy'}. When Undefined: ${c.when_undefined || 'Open to conditioning'}.`;
    passages.push({
      id: `selemene:human-design:center:${centerKey}:description`,
      text: `Human Design Center: ${definedText}`,
      metadata: {
        system: 'human-design',
        category: 'center',
        field: 'description',
        name,
        text: definedText,
      },
    });
  }

  return passages;
}

/**
 * Extract passages from Human Design channels.
 */
async function extractHDChannels(): Promise<Passage[]> {
  const filePath = join(SELEMENE_DATA_DIR, 'human-design/channels.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));
  const passages: Passage[] = [];

  const channels = data.channels || {};
  for (const [key, channel] of Object.entries(channels)) {
    const ch = channel as {
      name?: string;
      gates?: number[];
      description?: string;
      theme?: string;
      circuitry?: string;
    };

    const name = ch.name || key;
    const channelKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (ch.description) {
      const gatesStr = ch.gates ? `Gates ${ch.gates.join('-')}` : '';
      passages.push({
        id: `selemene:human-design:channel:${channelKey}:description`,
        text: `Human Design Channel ${name} (${gatesStr}): ${ch.description}`,
        metadata: {
          system: 'human-design',
          category: 'channel',
          field: 'description',
          name,
          text: ch.description,
        },
      });
    }
  }

  return passages;
}

/**
 * Extract passages from I-Ching hexagrams.
 */
async function extractIChing(): Promise<Passage[]> {
  const hexagramsPath = join(SELEMENE_DATA_DIR, 'i-ching/hexagrams.json');
  const data = JSON.parse(await readFile(hexagramsPath, 'utf-8'));
  const passages: Passage[] = [];

  const hexagrams = data.hexagrams || {};
  for (const [num, hex] of Object.entries(hexagrams)) {
    const h = hex as {
      number: number;
      name: string;
      chinese?: string;
      meaning?: string;
      judgment?: string;
      image?: string;
      divination?: string;
    };

    const number = parseInt(num);
    const name = h.name || `Hexagram ${number}`;
    const chineseName = h.chinese ? ` (${h.chinese})` : '';

    // Meaning
    if (h.meaning) {
      passages.push({
        id: `selemene:i-ching:hexagram:${number}:meaning`,
        text: `I-Ching Hexagram ${number} - ${name}${chineseName}: ${h.meaning}`,
        metadata: {
          system: 'i-ching',
          category: 'hexagram',
          number,
          field: 'meaning',
          name,
          text: h.meaning,
        },
      });
    }

    // Judgment
    if (h.judgment) {
      passages.push({
        id: `selemene:i-ching:hexagram:${number}:judgment`,
        text: `I-Ching Hexagram ${number} - ${name} - Judgment: ${h.judgment}`,
        metadata: {
          system: 'i-ching',
          category: 'hexagram',
          number,
          field: 'judgment',
          name,
          text: h.judgment,
        },
      });
    }

    // Image
    if (h.image) {
      passages.push({
        id: `selemene:i-ching:hexagram:${number}:image`,
        text: `I-Ching Hexagram ${number} - ${name} - Image: ${h.image}`,
        metadata: {
          system: 'i-ching',
          category: 'hexagram',
          number,
          field: 'image',
          name,
          text: h.image,
        },
      });
    }

    // Divination
    if (h.divination) {
      passages.push({
        id: `selemene:i-ching:hexagram:${number}:divination`,
        text: `I-Ching Hexagram ${number} - ${name} - Divination: ${h.divination}`,
        metadata: {
          system: 'i-ching',
          category: 'hexagram',
          number,
          field: 'divination',
          name,
          text: h.divination,
        },
      });
    }
  }

  return passages;
}

/**
 * Extract passages from Enneagram types.
 */
async function extractEnneagram(): Promise<Passage[]> {
  const filePath = join(SELEMENE_DATA_DIR, 'enneagram/types.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));
  const passages: Passage[] = [];

  const types = data.types || {};
  for (const [num, type] of Object.entries(types)) {
    const t = type as {
      number: number;
      name: string;
      core_motivation?: string;
      core_fear?: string;
      core_desire?: string;
      vice?: string;
      virtue?: string;
      wings?: { [key: string]: { name?: string; description?: string } };
      arrows?: {
        integration?: { direction?: number; description?: string };
        disintegration?: { direction?: number; description?: string };
      };
    };

    const number = parseInt(num);
    const name = t.name || `Type ${number}`;

    // Core description (motivation, fear, desire)
    if (t.core_motivation) {
      const coreText = `Core Motivation: ${t.core_motivation}. Core Fear: ${t.core_fear || 'Unknown'}. Core Desire: ${t.core_desire || 'Unknown'}.`;
      passages.push({
        id: `selemene:enneagram:type:${number}:core`,
        text: `Enneagram Type ${number} - ${name}: ${coreText}`,
        metadata: {
          system: 'enneagram',
          category: 'type',
          number,
          field: 'core',
          name,
          text: coreText,
        },
      });
    }

    // Vice and Virtue
    if (t.vice && t.virtue) {
      const vvText = `Vice (passion): ${t.vice}. Virtue (when healthy): ${t.virtue}.`;
      passages.push({
        id: `selemene:enneagram:type:${number}:vice_virtue`,
        text: `Enneagram Type ${number} - ${name} - ${vvText}`,
        metadata: {
          system: 'enneagram',
          category: 'type',
          number,
          field: 'vice_virtue',
          name,
          text: vvText,
        },
      });
    }

    // Wings
    if (t.wings) {
      for (const [wingNum, wing] of Object.entries(t.wings)) {
        if (wing.description) {
          passages.push({
            id: `selemene:enneagram:type:${number}:wing_${wingNum}`,
            text: `Enneagram Type ${number} Wing ${wingNum} (${wing.name || `${number}w${wingNum}`}): ${wing.description}`,
            metadata: {
              system: 'enneagram',
              category: 'wing',
              number,
              field: `wing_${wingNum}`,
              name: wing.name || `${number}w${wingNum}`,
              text: wing.description,
            },
          });
        }
      }
    }

    // Integration/Disintegration arrows
    if (t.arrows?.integration?.description) {
      passages.push({
        id: `selemene:enneagram:type:${number}:integration`,
        text: `Enneagram Type ${number} - ${name} Integration (to ${t.arrows.integration.direction}): ${t.arrows.integration.description}`,
        metadata: {
          system: 'enneagram',
          category: 'type',
          number,
          field: 'integration',
          name,
          text: t.arrows.integration.description,
        },
      });
    }

    if (t.arrows?.disintegration?.description) {
      passages.push({
        id: `selemene:enneagram:type:${number}:disintegration`,
        text: `Enneagram Type ${number} - ${name} Disintegration (to ${t.arrows.disintegration.direction}): ${t.arrows.disintegration.description}`,
        metadata: {
          system: 'enneagram',
          category: 'type',
          number,
          field: 'disintegration',
          name,
          text: t.arrows.disintegration.description,
        },
      });
    }
  }

  return passages;
}

/**
 * Extract passages from Tarot Major Arcana.
 */
async function extractTarot(): Promise<Passage[]> {
  const majorPath = join(SELEMENE_DATA_DIR, 'tarot/major_arcana.json');
  const data = JSON.parse(await readFile(majorPath, 'utf-8'));
  const passages: Passage[] = [];

  const cards = data.cards || {};
  for (const [num, card] of Object.entries(cards)) {
    const c = card as {
      number: number;
      name: string;
      description?: string;
      upright_meaning?: string;
      reversed_meaning?: string;
      spiritual_lesson?: string;
      archetypal_energy?: string;
    };

    const number = parseInt(num);
    const name = c.name || `Card ${number}`;

    // Main description
    if (c.description) {
      passages.push({
        id: `selemene:tarot:major:${number}:description`,
        text: `Tarot Major Arcana ${number} - ${name}: ${c.description}`,
        metadata: {
          system: 'tarot',
          category: 'major-arcana',
          number,
          field: 'description',
          name,
          text: c.description,
        },
      });
    }

    // Upright meaning
    if (c.upright_meaning) {
      passages.push({
        id: `selemene:tarot:major:${number}:upright`,
        text: `Tarot ${name} Upright: ${c.upright_meaning}`,
        metadata: {
          system: 'tarot',
          category: 'major-arcana',
          number,
          field: 'upright',
          name,
          text: c.upright_meaning,
        },
      });
    }

    // Reversed meaning
    if (c.reversed_meaning) {
      passages.push({
        id: `selemene:tarot:major:${number}:reversed`,
        text: `Tarot ${name} Reversed: ${c.reversed_meaning}`,
        metadata: {
          system: 'tarot',
          category: 'major-arcana',
          number,
          field: 'reversed',
          name,
          text: c.reversed_meaning,
        },
      });
    }

    // Spiritual lesson
    if (c.spiritual_lesson) {
      passages.push({
        id: `selemene:tarot:major:${number}:spiritual_lesson`,
        text: `Tarot ${name} Spiritual Lesson: ${c.spiritual_lesson}`,
        metadata: {
          system: 'tarot',
          category: 'major-arcana',
          number,
          field: 'spiritual_lesson',
          name,
          text: c.spiritual_lesson,
        },
      });
    }
  }

  return passages;
}

/**
 * Extract passages from Vimshottari nakshatras.
 */
async function extractVimshottari(): Promise<Passage[]> {
  const nakshatrasPath = join(SELEMENE_DATA_DIR, 'vimshottari/nakshatras.json');
  const data = JSON.parse(await readFile(nakshatrasPath, 'utf-8'));
  const passages: Passage[] = [];

  const nakshatras = data.nakshatras || {};
  for (const [num, nakshatra] of Object.entries(nakshatras)) {
    const n = nakshatra as {
      number: number;
      name: string;
      description?: string;
      ruling_planet?: string;
      deity?: string;
      symbol?: string;
      qualities?: string[];
    };

    const number = parseInt(num);
    const name = n.name || `Nakshatra ${number}`;

    if (n.description) {
      const qualitiesStr = n.qualities ? ` Qualities: ${n.qualities.join(', ')}.` : '';
      const fullText = `${n.description}${qualitiesStr}`;
      passages.push({
        id: `selemene:vimshottari:nakshatra:${number}:description`,
        text: `Nakshatra ${number} - ${name} (Ruler: ${n.ruling_planet || 'Unknown'}, Deity: ${n.deity || 'Unknown'}): ${fullText}`,
        metadata: {
          system: 'vimshottari',
          category: 'nakshatra',
          number,
          field: 'description',
          name,
          text: fullText,
        },
      });
    }
  }

  // Also extract planet descriptions
  const planetsPath = join(SELEMENE_DATA_DIR, 'vimshottari/planets.json');
  try {
    const planetsData = JSON.parse(await readFile(planetsPath, 'utf-8'));
    const planets = planetsData.planets || {};

    for (const [key, planet] of Object.entries(planets)) {
      const p = planet as {
        name: string;
        represents?: string;
        psychological_function?: string;
        keywords?: string[];
      };

      const name = p.name || key;
      const planetKey = key.toLowerCase();

      if (p.represents) {
        const fullText = `${p.represents}${p.psychological_function ? ` Psychological function: ${p.psychological_function}` : ''}`;
        passages.push({
          id: `selemene:vimshottari:planet:${planetKey}:description`,
          text: `Vedic Astrology Planet ${name}: ${fullText}`,
          metadata: {
            system: 'vimshottari',
            category: 'planet',
            field: 'description',
            name,
            text: fullText,
          },
        });
      }
    }
  } catch {
    // planets.json might not exist or have different structure
  }

  return passages;
}

/**
 * Extract passages from Vedic Clock / timing systems.
 */
async function extractVedicClock(): Promise<Passage[]> {
  const passages: Passage[] = [];

  // Five Elements Constitution
  const elementsPath = join(SELEMENE_DATA_DIR, 'vedic-clock/five_elements_constitution.json');
  try {
    const data = JSON.parse(await readFile(elementsPath, 'utf-8'));
    const elements = data.elements || data.elemental_constitutions || {};

    for (const [key, element] of Object.entries(elements)) {
      const e = element as {
        name?: string;
        description?: string;
        characteristics?: string[];
        vedic_practices?: string[];
      };

      const name = e.name || key;
      const elementKey = key.toLowerCase();

      if (e.description) {
        passages.push({
          id: `selemene:vedic-clock:element:${elementKey}:description`,
          text: `Five Elements - ${name}: ${e.description}`,
          metadata: {
            system: 'vedic-clock',
            category: 'element',
            field: 'description',
            name,
            text: e.description,
          },
        });
      }

      if (e.characteristics && e.characteristics.length > 0) {
        const charText = e.characteristics.join('. ');
        passages.push({
          id: `selemene:vedic-clock:element:${elementKey}:characteristics`,
          text: `Five Elements - ${name} Characteristics: ${charText}`,
          metadata: {
            system: 'vedic-clock',
            category: 'element',
            field: 'characteristics',
            name,
            text: charText,
          },
        });
      }
    }
  } catch {
    // File might not exist
  }

  // TCM Organ Clock
  const tcmPath = join(SELEMENE_DATA_DIR, 'vedic-clock/tcm_organ_clock.json');
  try {
    const data = JSON.parse(await readFile(tcmPath, 'utf-8'));
    const organs = data.organs || data.organ_hours || {};

    for (const [key, organ] of Object.entries(organs)) {
      const o = organ as {
        name?: string;
        organ?: string;
        time_range?: string;
        description?: string;
        activities?: string[];
      };

      const name = o.name || o.organ || key;
      const organKey = key.toLowerCase().replace(/[^a-z0-9]/g, '-');

      if (o.description) {
        const timeStr = o.time_range ? ` (${o.time_range})` : '';
        passages.push({
          id: `selemene:vedic-clock:organ:${organKey}:description`,
          text: `TCM Organ Clock - ${name}${timeStr}: ${o.description}`,
          metadata: {
            system: 'vedic-clock',
            category: 'organ',
            field: 'description',
            name,
            text: o.description,
          },
        });
      }
    }
  } catch {
    // File might not exist
  }

  // Consciousness Practices
  const practicesPath = join(SELEMENE_DATA_DIR, 'vedic-clock/consciousness_practices.json');
  try {
    const data = JSON.parse(await readFile(practicesPath, 'utf-8'));
    const practices = data.elemental_practices || data.practices || {};

    for (const [key, practice] of Object.entries(practices)) {
      const p = practice as {
        vedic_practices?: string[];
        integrated_practices?: string[];
      };

      const name = key;
      const practiceKey = key.toLowerCase();

      if (p.integrated_practices && p.integrated_practices.length > 0) {
        const practiceText = p.integrated_practices.join('. ');
        passages.push({
          id: `selemene:vedic-clock:practice:${practiceKey}:integrated`,
          text: `${name} Element Integrated Practices: ${practiceText}`,
          metadata: {
            system: 'vedic-clock',
            category: 'practice',
            field: 'integrated',
            name,
            text: practiceText,
          },
        });
      }
    }
  } catch {
    // File might not exist
  }

  return passages;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXTRACTION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════

type SystemExtractor = () => Promise<Passage[]>;

const SYSTEM_EXTRACTORS: Record<string, SystemExtractor[]> = {
  'gene-keys': [extractGeneKeys],
  'human-design': [
    extractHDGates,
    extractHDTypes,
    extractHDProfiles,
    extractHDAuthorities,
    extractHDCenters,
    extractHDChannels,
  ],
  'i-ching': [extractIChing],
  'enneagram': [extractEnneagram],
  'tarot': [extractTarot],
  'vimshottari': [extractVimshottari],
  'vedic-clock': [extractVedicClock],
};

async function extractAllPassages(systems: string[] | null): Promise<Passage[]> {
  const allPassages: Passage[] = [];
  const systemsToProcess = systems || Object.keys(SYSTEM_EXTRACTORS);

  for (const system of systemsToProcess) {
    const extractors = SYSTEM_EXTRACTORS[system];
    if (!extractors) {
      console.log(`[WARN] Unknown system: ${system}, skipping...`);
      continue;
    }

    console.log(`[INFO] Extracting passages from: ${system}...`);
    let systemCount = 0;

    for (const extractor of extractors) {
      try {
        const passages = await extractor();
        allPassages.push(...passages);
        systemCount += passages.length;
      } catch (err) {
        console.log(`[WARN] Error in ${system} extractor: ${err instanceof Error ? err.message : err}`);
      }
    }

    console.log(`       -> Extracted ${systemCount} passages`);
  }

  return allPassages;
}

// ═══════════════════════════════════════════════════════════════════════
// EMBEDDING AND VECTORIZE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

async function embedPassages(passages: Passage[]): Promise<VectorizeEntry[]> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY environment variable is required');
  }

  const provider = new NvidiaEmbeddingProvider({ api_key: apiKey });
  const entries: VectorizeEntry[] = [];
  const totalBatches = Math.ceil(passages.length / BATCH_SIZE);

  console.log(`[INFO] Embedding ${passages.length} passages in ${totalBatches} batches...`);

  for (let i = 0; i < passages.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = passages.slice(i, i + BATCH_SIZE);

    console.log(`       -> Embedding batch ${batchNum}/${totalBatches}...`);

    const items: BatchEmbeddingItem[] = batch.map((p) => ({
      id: p.id,
      text: p.text,
    }));

    const results = await provider.embedBatch(items, 'passage');

    for (const result of results) {
      const passage = batch.find((p) => p.id === result.id);
      if (passage) {
        entries.push({
          id: result.id,
          values: result.embedding,
          metadata: passage.metadata,
        });
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < passages.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return entries;
}

async function writeNDJSON(entries: VectorizeEntry[]): Promise<string> {
  const lines = entries.map((entry) => JSON.stringify(entry));
  const content = lines.join('\n');
  await writeFile(OUTPUT_FILE, content, 'utf-8');
  return OUTPUT_FILE;
}

function upsertToVectorize(ndjsonPath: string): void {
  console.log(`[INFO] Upserting to Vectorize index: ${VECTORIZE_INDEX}...`);
  try {
    execSync(`wrangler vectorize upsert ${VECTORIZE_INDEX} --file "${ndjsonPath}"`, {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
    });
    console.log(`[INFO] Upsert complete!`);
  } catch (err) {
    console.error(`[ERROR] Wrangler upsert failed: ${err instanceof Error ? err.message : err}`);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════════

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    dryRun: false,
    systems: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--system' && args[i + 1]) {
      options.systems = args[i + 1].split(',').map((s) => s.trim());
      i++;
    } else if (arg.startsWith('--system=')) {
      options.systems = arg.slice('--system='.length).split(',').map((s) => s.trim());
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Usage: npx tsx scripts/ingest-wisdom-corpus.ts [options]

Options:
  --dry-run              Extract passages and count, don't embed or upsert
  --system <systems>     Filter to specific systems (comma-separated)
                         Available: gene-keys, human-design, i-ching, enneagram,
                                    tarot, vimshottari, vedic-clock
  -h, --help             Show this help message

Examples:
  npx tsx scripts/ingest-wisdom-corpus.ts --dry-run
  npx tsx scripts/ingest-wisdom-corpus.ts --system gene-keys,human-design
  npx tsx scripts/ingest-wisdom-corpus.ts
`);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const startTime = Date.now();
  const options = parseArgs();

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  Witness Agents — Wisdom Corpus Ingestion');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  if (options.dryRun) {
    console.log('[MODE] DRY RUN - Will extract and count passages only');
    console.log('');
  }

  if (options.systems) {
    console.log(`[FILTER] Processing systems: ${options.systems.join(', ')}`);
    console.log('');
  }

  // Step 1: Extract passages
  console.log('[STEP 1] Extracting passages from Selemene-engine data...');
  console.log('');
  const passages = await extractAllPassages(options.systems);
  console.log('');
  console.log(`[INFO] Total passages extracted: ${passages.length}`);
  console.log('');

  // Count by system
  const systemCounts: Record<string, number> = {};
  for (const p of passages) {
    systemCounts[p.metadata.system] = (systemCounts[p.metadata.system] || 0) + 1;
  }
  console.log('[STATS] Passages by system:');
  for (const [system, count] of Object.entries(systemCounts).sort()) {
    console.log(`        - ${system}: ${count}`);
  }
  console.log('');

  if (options.dryRun) {
    console.log('[DRY RUN] Skipping embedding and upsert.');
    console.log('');
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[DONE] Dry run completed in ${elapsed}s`);
    return;
  }

  // Step 2: Embed passages
  console.log('[STEP 2] Embedding passages with NVIDIA NIM (baai/bge-m3)...');
  console.log('');
  const entries = await embedPassages(passages);
  console.log('');
  console.log(`[INFO] Embedded ${entries.length} vectors`);
  console.log('');

  // Step 3: Write NDJSON
  console.log('[STEP 3] Writing NDJSON file...');
  const ndjsonPath = await writeNDJSON(entries);
  console.log(`[INFO] Written to: ${ndjsonPath}`);
  console.log('');

  // Step 4: Upsert to Vectorize
  console.log('[STEP 4] Upserting to Cloudflare Vectorize...');
  upsertToVectorize(ndjsonPath);
  console.log('');

  // Step 5: Cleanup
  try {
    await unlink(ndjsonPath);
    console.log('[INFO] Cleaned up temporary NDJSON file');
  } catch {
    // Ignore cleanup errors
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Ingestion complete! ${passages.length} passages embedded in ${elapsed}s`);
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
