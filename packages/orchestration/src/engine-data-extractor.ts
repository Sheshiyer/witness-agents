/**
 * engine-data-extractor.ts
 * 
 * Extracts atomic data points from Selemene engine outputs for vectorization.
 * Each extraction produces embeddable text + metadata for Vectorize storage.
 * 
 * Per backend-architecture-core: pure functions, no side effects.
 * Per research-knowledge-core: sourced-fact provenance on all extractions.
 */

import type { Value } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface AtomicEngineData {
  /** Unique ID for Vectorize (max 64 bytes): ed:{subject}:{engine}:{path} */
  id: string;
  /** Embeddable text describing this data point */
  text: string;
  /** Metadata for filtering and retrieval */
  metadata: {
    system: 'western' | 'vedic' | 'somatic';
    engine: string;
    field: string;
    subjectId: string;
    /** Stringified value for exact matching */
    value: string;
    /** Category for filtering (e.g., 'activation', 'authority', 'dasha') */
    category: string;
  };
}

export interface EngineOutputs {
  [engineId: string]: {
    result: Record<string, unknown>;
    witness_prompt?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE CLASSIFIERS
// ═══════════════════════════════════════════════════════════════════════

const WESTERN_ENGINES = ['human-design', 'gene-keys', 'numerology', 'biorhythm', 'i-ching', 'enneagram', 'tarot'];
const VEDIC_ENGINES = ['vimshottari', 'panchanga', 'vedic-clock', 'nadabrahman', 'transits'];
const SOMATIC_ENGINES = ['biofield', 'face-reading', 'biofield-capture'];

function classifyEngine(engineId: string): 'western' | 'vedic' | 'somatic' {
  if (WESTERN_ENGINES.includes(engineId)) return 'western';
  if (VEDIC_ENGINES.includes(engineId)) return 'vedic';
  if (SOMATIC_ENGINES.includes(engineId)) return 'somatic';
  return 'western'; // default
}

// ═══════════════════════════════════════════════════════════════════════
// ID GENERATION (max 64 bytes for Vectorize)
// ═══════════════════════════════════════════════════════════════════════

function truncateId(id: string, maxLen = 64): string {
  if (id.length <= maxLen) return id;
  // Hash the overflow portion
  const hash = simpleHash(id).toString(36).slice(0, 8);
  return id.slice(0, maxLen - 9) + '_' + hash;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function makeId(subjectId: string, engine: string, field: string): string {
  // Shorten subject ID if needed
  const shortSubject = subjectId.length > 16 ? subjectId.slice(0, 16) : subjectId;
  const shortEngine = engine.replace('engine-', '').replace('-', '');
  const raw = `ed:${shortSubject}:${shortEngine}:${field}`;
  return truncateId(raw);
}

// ═══════════════════════════════════════════════════════════════════════
// GENE KEYS EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

function extractGeneKeys(subjectId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const engine = 'gene-keys';
  const system = 'western';
  
  // Extract activation sequence (Life's Work, Evolution, Radiance, Purpose)
  const seq = result.activation_sequence as Record<string, number[]> | undefined;
  if (seq) {
    for (const [seqName, gates] of Object.entries(seq)) {
      if (Array.isArray(gates) && gates.length === 2) {
        const [primary, grounding] = gates;
        items.push({
          id: makeId(subjectId, engine, `seq_${seqName}`),
          text: `Gene Keys ${seqName.replace('_', ' ')}: Primary Gate ${primary}, Grounding Gate ${grounding}. This activation defines the ${seqName.replace('_', ' ')} in the subject's hologenetic profile.`,
          metadata: {
            system, engine,
            field: `activation_sequence.${seqName}`,
            subjectId,
            value: JSON.stringify(gates),
            category: 'sequence',
          },
        });
      }
    }
  }
  
  // Extract active keys with Shadow/Gift/Siddhi
  const activeKeys = result.active_keys as Array<Record<string, unknown>> | undefined;
  if (activeKeys) {
    for (const key of activeKeys) {
      const keyNum = key.key_number as number;
      const source = key.source as string;
      const shadow = key.shadow as string;
      const gift = key.gift as string;
      const siddhi = key.siddhi as string;
      const name = key.name as string;
      
      if (keyNum) {
        const sourceShort = source?.replace('Personality', 'P').replace('Design', 'D').replace('Sun', 'S').replace('Earth', 'E') || 'unknown';
        
        // Full key activation
        items.push({
          id: makeId(subjectId, engine, `key_${keyNum}_${sourceShort}`),
          text: `Gene Key ${keyNum} (${name || ''}) activated at ${source || 'unknown'}. Shadow: ${shadow || 'unknown'}. Gift: ${gift || 'unknown'}. Siddhi: ${siddhi || 'unknown'}. This key represents a fundamental frequency in the subject's design.`,
          metadata: {
            system, engine,
            field: `active_key.${keyNum}`,
            subjectId,
            value: JSON.stringify({ keyNum, source, shadow, gift, siddhi }),
            category: 'activation',
          },
        });
      }
    }
  }
  
  // Extract frequency assessments
  const freqAssessments = result.frequency_assessments as Array<Record<string, unknown>> | undefined;
  if (freqAssessments) {
    for (const assessment of freqAssessments) {
      const keyNum = assessment.key_number as number;
      const currentFreq = assessment.current_frequency as string;
      const dominant = assessment.dominant_frequency as string;
      
      if (keyNum && currentFreq) {
        items.push({
          id: makeId(subjectId, engine, `freq_${keyNum}`),
          text: `Gene Key ${keyNum} frequency assessment: Current frequency is ${currentFreq}, dominant pattern is ${dominant || 'unassessed'}. This indicates where the subject currently operates on the Shadow-Gift-Siddhi spectrum.`,
          metadata: {
            system, engine,
            field: `frequency.${keyNum}`,
            subjectId,
            value: JSON.stringify({ currentFreq, dominant }),
            category: 'frequency',
          },
        });
      }
    }
  }
  
  return items;
}

// ═══════════════════════════════════════════════════════════════════════
// HUMAN DESIGN EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

function extractHumanDesign(subjectId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const engine = 'human-design';
  const system = 'western';
  
  // Type (Generator, Projector, Manifestor, Reflector, Manifesting Generator)
  const hdType = result.hd_type as string;
  if (hdType) {
    items.push({
      id: makeId(subjectId, engine, 'type'),
      text: `Human Design Type: ${hdType}. This is the subject's fundamental energy type, determining their aura and how they interact with the world. ${getTypeDescription(hdType)}`,
      metadata: {
        system, engine,
        field: 'hd_type',
        subjectId,
        value: hdType,
        category: 'type',
      },
    });
  }
  
  // Authority (Sacral, Splenic, Emotional, etc.)
  const authority = result.authority as string;
  if (authority) {
    items.push({
      id: makeId(subjectId, engine, 'authority'),
      text: `Human Design Authority: ${authority}. This is the subject's decision-making mechanism. ${getAuthorityDescription(authority)}`,
      metadata: {
        system, engine,
        field: 'authority',
        subjectId,
        value: authority,
        category: 'authority',
      },
    });
  }
  
  // Profile (e.g., "1/3", "4/6")
  const profile = result.profile as string;
  if (profile) {
    items.push({
      id: makeId(subjectId, engine, 'profile'),
      text: `Human Design Profile: ${profile}. This profile represents the subject's costume in life and how they learn and interact. ${getProfileDescription(profile)}`,
      metadata: {
        system, engine,
        field: 'profile',
        subjectId,
        value: profile,
        category: 'profile',
      },
    });
  }
  
  // Definition (Single, Split, Triple Split, Quadruple Split, No Definition)
  const definition = result.definition as string;
  if (definition) {
    items.push({
      id: makeId(subjectId, engine, 'definition'),
      text: `Human Design Definition: ${definition}. This indicates how energy flows within the subject's design and their need for others to bridge gaps.`,
      metadata: {
        system, engine,
        field: 'definition',
        subjectId,
        value: definition,
        category: 'definition',
      },
    });
  }
  
  // Defined Centers
  const definedCenters = result.defined_centers as string[];
  if (definedCenters && definedCenters.length > 0) {
    items.push({
      id: makeId(subjectId, engine, 'centers'),
      text: `Human Design Defined Centers: ${definedCenters.join(', ')}. These centers are consistently defined and represent reliable, fixed energy in the subject's design.`,
      metadata: {
        system, engine,
        field: 'defined_centers',
        subjectId,
        value: JSON.stringify(definedCenters),
        category: 'centers',
      },
    });
  }
  
  // Active Channels
  const activeChannels = result.active_channels as string[];
  if (activeChannels && activeChannels.length > 0) {
    items.push({
      id: makeId(subjectId, engine, 'channels'),
      text: `Human Design Active Channels: ${activeChannels.join(', ')}. These channels create the definition in the design, connecting centers and creating consistent life themes.`,
      metadata: {
        system, engine,
        field: 'active_channels',
        subjectId,
        value: JSON.stringify(activeChannels),
        category: 'channels',
      },
    });
  }
  
  // Key planetary activations (Sun, Moon, etc.)
  const personalityActs = result.personality_activations as Record<string, { gate: number; line: number }>;
  const designActs = result.design_activations as Record<string, { gate: number; line: number }>;
  
  if (personalityActs) {
    for (const [planet, act] of Object.entries(personalityActs)) {
      if (act && act.gate) {
        items.push({
          id: makeId(subjectId, engine, `p_${planet}`),
          text: `Personality ${planet}: Gate ${act.gate}.${act.line}. This is the conscious ${planet} placement, representing what the subject is aware of in their design.`,
          metadata: {
            system, engine,
            field: `personality.${planet}`,
            subjectId,
            value: JSON.stringify(act),
            category: 'activation',
          },
        });
      }
    }
  }
  
  if (designActs) {
    for (const [planet, act] of Object.entries(designActs)) {
      if (act && act.gate) {
        items.push({
          id: makeId(subjectId, engine, `d_${planet}`),
          text: `Design ${planet}: Gate ${act.gate}.${act.line}. This is the unconscious ${planet} placement, representing the body's wisdom in the subject's design.`,
          metadata: {
            system, engine,
            field: `design.${planet}`,
            subjectId,
            value: JSON.stringify(act),
            category: 'activation',
          },
        });
      }
    }
  }
  
  return items;
}

// HD Type descriptions
function getTypeDescription(hdType: string): string {
  const descriptions: Record<string, string> = {
    'Generator': 'Generators have sustainable life force energy and are here to respond to life. Their strategy is to wait to respond.',
    'ManifestingGenerator': 'Manifesting Generators combine the sustainability of Generators with the initiating power of Manifestors. Multi-passionate and quick.',
    'Projector': 'Projectors are here to guide and direct energy. Their strategy is to wait for recognition and invitation.',
    'Manifestor': 'Manifestors are here to initiate and make things happen. Their strategy is to inform before acting.',
    'Reflector': 'Reflectors are lunar beings who sample and reflect the environment. Their strategy is to wait a full lunar cycle for major decisions.',
  };
  return descriptions[hdType] || '';
}

// HD Authority descriptions
function getAuthorityDescription(authority: string): string {
  const descriptions: Record<string, string> = {
    'Sacral': 'Sacral authority operates through gut responses - sounds and sensations that indicate yes or no.',
    'Splenic': 'Splenic authority is intuitive and in-the-moment, based on survival instincts.',
    'Emotional': 'Emotional authority requires waiting through the emotional wave before making decisions.',
    'Ego': 'Ego authority speaks through willpower and what the heart truly wants.',
    'Self': 'Self-projected authority speaks through the voice and identity center.',
    'Mental': 'Mental authority (Outer Authority) requires sounding board and environment.',
    'Lunar': 'Lunar authority requires waiting a full moon cycle to gain clarity.',
  };
  return descriptions[authority] || '';
}

// HD Profile descriptions  
function getProfileDescription(profile: string): string {
  const descriptions: Record<string, string> = {
    '1/3': 'Investigator/Martyr - Foundation through investigation and learning through trial and error.',
    '1/4': 'Investigator/Opportunist - Foundation through study and sharing with network.',
    '2/4': 'Hermit/Opportunist - Natural talents that emerge through being called out by network.',
    '2/5': 'Hermit/Heretic - Natural talents projected upon to save and transform.',
    '3/5': 'Martyr/Heretic - Learning through experience and being seen as transformer.',
    '3/6': 'Martyr/Role Model - Learning through experience, becoming wise observer.',
    '4/6': 'Opportunist/Role Model - Network-oriented becoming role model over time.',
    '4/1': 'Opportunist/Investigator - Network foundation built on deep research.',
    '5/1': 'Heretic/Investigator - Projected savior with deep foundational knowledge.',
    '5/2': 'Heretic/Hermit - Projected upon while having natural hermit talents.',
    '6/2': 'Role Model/Hermit - Three-part life process with natural talents.',
    '6/3': 'Role Model/Martyr - Three-part life process with learning through experience.',
  };
  return descriptions[profile] || '';
}

// ═══════════════════════════════════════════════════════════════════════
// VIMSHOTTARI DASHA EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

function extractVimshottari(subjectId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const engine = 'vimshottari';
  const system = 'vedic';
  
  // Handle Selemene's nested current_period structure
  const currentPeriod = result.current_period as Record<string, unknown> | undefined;
  const periodEnrich = result.period_enrichment as Record<string, unknown> | undefined;
  
  // Current Mahadasha - handle both old format and Selemene format
  let currentMaha = result.current_mahadasha as string;
  if (!currentMaha && currentPeriod?.mahadasha) {
    const maha = currentPeriod.mahadasha as Record<string, unknown>;
    currentMaha = maha.planet as string;
  }
  
  if (currentMaha) {
    items.push({
      id: makeId(subjectId, engine, 'mahadasha'),
      text: `Current Vimshottari Mahadasha: ${currentMaha}. This is the major planetary period the subject is currently experiencing, lasting several years. ${getDashaDescription(currentMaha)}`,
      metadata: {
        system, engine,
        field: 'current_mahadasha',
        subjectId,
        value: currentMaha,
        category: 'dasha',
      },
    });
  }
  
  // Current Antardasha (sub-period)
  let currentAntar = result.current_antardasha as string;
  if (!currentAntar && currentPeriod?.antardasha) {
    const antar = currentPeriod.antardasha as Record<string, unknown>;
    currentAntar = antar.planet as string;
  }
  
  if (currentAntar) {
    items.push({
      id: makeId(subjectId, engine, 'antardasha'),
      text: `Current Vimshottari Antardasha: ${currentAntar} within ${currentMaha || 'unknown'} Mahadasha. This sub-period colors the major period with ${currentAntar}'s energy.`,
      metadata: {
        system, engine,
        field: 'current_antardasha',
        subjectId,
        value: currentAntar,
        category: 'dasha',
      },
    });
  }
  
  // Current Pratyantardasha (sub-sub-period) - Selemene format
  if (currentPeriod?.pratyantardasha) {
    const pratyantar = currentPeriod.pratyantardasha as Record<string, unknown>;
    const pratyPlanet = pratyantar.planet as string;
    const pratyDays = pratyantar.days as number;
    if (pratyPlanet) {
      items.push({
        id: makeId(subjectId, engine, 'pratyantar'),
        text: `Current Vimshottari Pratyantardasha: ${pratyPlanet} within ${currentAntar || 'unknown'} Antardasha. This is the finest timing layer, with approximately ${Math.round(pratyDays || 0)} days remaining.`,
        metadata: {
          system, engine,
          field: 'pratyantardasha',
          subjectId,
          value: pratyPlanet,
          category: 'dasha',
        },
      });
    }
  }
  
  // Combined period description from Selemene enrichment
  if (periodEnrich?.combined_description) {
    items.push({
      id: makeId(subjectId, engine, 'desc'),
      text: `Vimshottari Period Context: ${periodEnrich.combined_description}`,
      metadata: {
        system, engine,
        field: 'period_description',
        subjectId,
        value: String(periodEnrich.combined_description).slice(0, 200),
        category: 'context',
      },
    });
  }
  
  // Days remaining in current period
  let daysRemaining = result.days_remaining as number;
  if (daysRemaining === undefined && currentPeriod?.pratyantardasha) {
    const pratyantar = currentPeriod.pratyantardasha as Record<string, unknown>;
    daysRemaining = pratyantar.days as number;
  }
  
  if (daysRemaining !== undefined) {
    items.push({
      id: makeId(subjectId, engine, 'days_rem'),
      text: `Days remaining in current Pratyantardasha: ${Math.round(daysRemaining)}. The subject has approximately ${Math.floor(daysRemaining / 30)} months left in this sub-sub-period.`,
      metadata: {
        system, engine,
        field: 'days_remaining',
        subjectId,
        value: String(Math.round(daysRemaining)),
        category: 'timing',
      },
    });
  }
  
  // Upcoming transitions from Selemene
  const transitions = result.upcoming_transitions as Array<Record<string, unknown>>;
  if (transitions && transitions.length > 0) {
    const upcoming = transitions.slice(0, 3).map(t => 
      `${t.type}: ${t.from_planet} → ${t.to_planet} (${t.days_until} days)`
    ).join('; ');
    items.push({
      id: makeId(subjectId, engine, 'transitions'),
      text: `Upcoming Vimshottari Transitions: ${upcoming}. These mark the next significant shifts in planetary influence.`,
      metadata: {
        system, engine,
        field: 'upcoming_transitions',
        subjectId,
        value: JSON.stringify(transitions.slice(0, 3)),
        category: 'sequence',
      },
    });
  }
  
  // Dasha sequence (legacy format)
  const dashaSeq = result.dasha_sequence as Array<Record<string, unknown>>;
  if (dashaSeq && dashaSeq.length > 0) {
    const upcoming = dashaSeq.slice(0, 3).map(d => d.planet).join(' → ');
    items.push({
      id: makeId(subjectId, engine, 'sequence'),
      text: `Upcoming Vimshottari Dasha sequence: ${upcoming}. These are the next major planetary periods the subject will experience.`,
      metadata: {
        system, engine,
        field: 'dasha_sequence',
        subjectId,
        value: JSON.stringify(dashaSeq.slice(0, 3)),
        category: 'sequence',
      },
    });
  }
  
  return items;
}

function getDashaDescription(planet: string): string {
  const descriptions: Record<string, string> = {
    'Sun': 'Solar period emphasizing self-expression, authority, and vitality.',
    'Moon': 'Lunar period emphasizing emotions, nurturing, and public connection.',
    'Mars': 'Martial period emphasizing action, courage, and transformation.',
    'Mercury': 'Mercurial period emphasizing communication, learning, and adaptability.',
    'Jupiter': 'Jupiterian period emphasizing wisdom, expansion, and spiritual growth.',
    'Venus': 'Venusian period emphasizing relationships, creativity, and pleasure.',
    'Saturn': 'Saturnian period emphasizing discipline, karma, and maturation.',
    'Rahu': 'Rahu period emphasizing worldly desires, unconventional paths, and intensity.',
    'Ketu': 'Ketu period emphasizing spirituality, detachment, and liberation.',
  };
  return descriptions[planet] || '';
}

// ═══════════════════════════════════════════════════════════════════════
// VEDIC CLOCK EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

function extractVedicClock(subjectId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const engine = 'vedic-clock';
  const system = 'vedic';
  
  const currentSegment = result.current_segment as string;
  if (currentSegment) {
    items.push({
      id: makeId(subjectId, engine, 'segment'),
      text: `Current Vedic Time Segment: ${currentSegment}. This muhurta carries specific qualities for different activities.`,
      metadata: {
        system, engine,
        field: 'current_segment',
        subjectId,
        value: currentSegment,
        category: 'timing',
      },
    });
  }
  
  const gunaBias = result.guna_bias as string;
  if (gunaBias) {
    items.push({
      id: makeId(subjectId, engine, 'guna'),
      text: `Current Guna Bias: ${gunaBias}. This indicates the predominant quality (Sattva/Rajas/Tamas) of the current time.`,
      metadata: {
        system, engine,
        field: 'guna_bias',
        subjectId,
        value: gunaBias,
        category: 'quality',
      },
    });
  }
  
  return items;
}

// ═══════════════════════════════════════════════════════════════════════
// PANCHANGA EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

function extractPanchanga(subjectId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const engine = 'panchanga';
  const system = 'vedic';
  
  // Handle both legacy format (vara) and Selemene format (vara_name)
  const vara = (result.vara || result.vara_name) as string;
  const tithi = (result.tithi || result.tithi_name) as string;
  const nakshatra = (result.nakshatra || result.nakshatra_name) as string;
  const yoga = (result.yoga || result.yoga_name) as string;
  const karana = (result.karana || result.karana_name) as string;
  
  if (vara) {
    items.push({
      id: makeId(subjectId, engine, 'vara'),
      text: `Vara (Weekday): ${vara}. Each day is ruled by a specific planet influencing daily activities.`,
      metadata: { system, engine, field: 'vara', subjectId, value: vara, category: 'limb' },
    });
  }
  
  if (tithi) {
    items.push({
      id: makeId(subjectId, engine, 'tithi'),
      text: `Tithi (Lunar Day): ${tithi}. The tithi indicates the phase of the moon and its influence on consciousness.`,
      metadata: { system, engine, field: 'tithi', subjectId, value: tithi, category: 'limb' },
    });
  }
  
  if (nakshatra) {
    items.push({
      id: makeId(subjectId, engine, 'nakshatra'),
      text: `Nakshatra (Lunar Mansion): ${nakshatra}. The nakshatra of birth or current moment shapes fundamental patterns.`,
      metadata: { system, engine, field: 'nakshatra', subjectId, value: nakshatra, category: 'limb' },
    });
  }
  
  if (yoga) {
    items.push({
      id: makeId(subjectId, engine, 'yoga'),
      text: `Yoga (Sun-Moon Angle): ${yoga}. This yoga indicates the quality of the day for various undertakings.`,
      metadata: { system, engine, field: 'yoga', subjectId, value: yoga, category: 'limb' },
    });
  }
  
  if (karana) {
    items.push({
      id: makeId(subjectId, engine, 'karana'),
      text: `Karana (Half-Tithi): ${karana}. The karana refines the tithi's influence on short-term activities.`,
      metadata: { system, engine, field: 'karana', subjectId, value: karana, category: 'limb' },
    });
  }
  
  return items;
}

// ═══════════════════════════════════════════════════════════════════════
// I CHING EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

function extractIChing(subjectId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const engine = 'i-ching';
  const system = 'western';
  
  const hexagram = result.hexagram as number;
  const hexName = result.hexagram_name as string;
  const guidance = result.guidance as string;
  
  if (hexagram) {
    items.push({
      id: makeId(subjectId, engine, 'hexagram'),
      text: `I Ching Hexagram ${hexagram}: ${hexName || ''}. ${guidance || ''} This hexagram represents the current energetic configuration.`,
      metadata: {
        system, engine,
        field: 'hexagram',
        subjectId,
        value: JSON.stringify({ hexagram, hexName }),
        category: 'reading',
      },
    });
  }
  
  return items;
}

// ═══════════════════════════════════════════════════════════════════════
// NUMEROLOGY EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

function extractNumerology(subjectId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const engine = 'numerology';
  const system = 'western';
  
  const lifePathNumber = result.life_path_number as number;
  const expressionNumber = result.expression_number as number;
  const soulUrge = result.soul_urge_number as number;
  const coreTheme = result.core_theme as string;
  
  if (lifePathNumber) {
    items.push({
      id: makeId(subjectId, engine, 'life_path'),
      text: `Life Path Number: ${lifePathNumber}. This number reveals the subject's life purpose and the lessons they're here to learn.`,
      metadata: { system, engine, field: 'life_path_number', subjectId, value: String(lifePathNumber), category: 'core' },
    });
  }
  
  if (expressionNumber) {
    items.push({
      id: makeId(subjectId, engine, 'expression'),
      text: `Expression Number: ${expressionNumber}. This number shows the subject's natural talents and abilities.`,
      metadata: { system, engine, field: 'expression_number', subjectId, value: String(expressionNumber), category: 'core' },
    });
  }
  
  if (soulUrge) {
    items.push({
      id: makeId(subjectId, engine, 'soul_urge'),
      text: `Soul Urge Number: ${soulUrge}. This number reveals the subject's inner desires and what truly motivates them.`,
      metadata: { system, engine, field: 'soul_urge_number', subjectId, value: String(soulUrge), category: 'core' },
    });
  }
  
  if (coreTheme) {
    items.push({
      id: makeId(subjectId, engine, 'theme'),
      text: `Core Numerological Theme: ${coreTheme}. This synthesizes the subject's numerological profile.`,
      metadata: { system, engine, field: 'core_theme', subjectId, value: coreTheme, category: 'synthesis' },
    });
  }
  
  return items;
}

// ═══════════════════════════════════════════════════════════════════════
// ENNEAGRAM EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

function extractEnneagram(subjectId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const engine = 'enneagram';
  const system = 'western';
  
  const coreType = result.core_type as number;
  const wing = result.wing as string;
  const archetype = result.archetype as string;
  
  if (coreType) {
    items.push({
      id: makeId(subjectId, engine, 'type'),
      text: `Enneagram Type ${coreType}: ${archetype || ''}. Wing: ${wing || 'undetermined'}. This type reveals the subject's core motivation, fear, and growth path.`,
      metadata: {
        system, engine,
        field: 'core_type',
        subjectId,
        value: JSON.stringify({ coreType, wing, archetype }),
        category: 'type',
      },
    });
  }
  
  return items;
}

// ═══════════════════════════════════════════════════════════════════════
// BIOFIELD EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

function extractBiofield(subjectId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const engine = 'biofield';
  const system = 'somatic';
  
  const dominantElement = result.dominant_element as string;
  const coherenceScore = result.coherence_score as number;
  const practice = result.recommended_practice as string;
  
  if (dominantElement) {
    items.push({
      id: makeId(subjectId, engine, 'element'),
      text: `Dominant Biofield Element: ${dominantElement}. This indicates the elemental quality most present in the subject's energy field.`,
      metadata: { system, engine, field: 'dominant_element', subjectId, value: dominantElement, category: 'quality' },
    });
  }
  
  if (coherenceScore !== undefined) {
    items.push({
      id: makeId(subjectId, engine, 'coherence'),
      text: `Biofield Coherence Score: ${coherenceScore.toFixed(2)}. This measures the harmony and organization of the subject's energy field.`,
      metadata: { system, engine, field: 'coherence_score', subjectId, value: String(coherenceScore), category: 'measurement' },
    });
  }
  
  if (practice) {
    items.push({
      id: makeId(subjectId, engine, 'practice'),
      text: `Recommended Practice: ${practice}. This practice is suggested to enhance biofield coherence.`,
      metadata: { system, engine, field: 'recommended_practice', subjectId, value: practice, category: 'guidance' },
    });
  }
  
  return items;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════

/**
 * Extract atomic data points from all engine outputs for a subject.
 * 
 * @param subjectId - Unique identifier for the subject
 * @param engineOutputs - Map of engine ID to output result
 * @returns Array of atomic data points ready for vectorization
 */
export function extractAtomicEngineData(
  subjectId: string,
  engineOutputs: EngineOutputs
): AtomicEngineData[] {
  const allItems: AtomicEngineData[] = [];
  
  for (const [engineId, output] of Object.entries(engineOutputs)) {
    const result = output.result as Record<string, unknown>;
    if (!result) continue;
    
    let items: AtomicEngineData[] = [];
    
    switch (engineId) {
      case 'gene-keys':
        items = extractGeneKeys(subjectId, result);
        break;
      case 'human-design':
        items = extractHumanDesign(subjectId, result);
        break;
      case 'vimshottari':
        items = extractVimshottari(subjectId, result);
        break;
      case 'vedic-clock':
        items = extractVedicClock(subjectId, result);
        break;
      case 'panchanga':
        items = extractPanchanga(subjectId, result);
        break;
      case 'i-ching':
        items = extractIChing(subjectId, result);
        break;
      case 'numerology':
        items = extractNumerology(subjectId, result);
        break;
      case 'enneagram':
        items = extractEnneagram(subjectId, result);
        break;
      case 'biofield':
        items = extractBiofield(subjectId, result);
        break;
      default:
        // Generic extraction for unknown engines
        items = extractGeneric(subjectId, engineId, result);
    }
    
    allItems.push(...items);
  }
  
  return allItems;
}

/**
 * Generic extractor for engines without specific handlers.
 */
function extractGeneric(subjectId: string, engineId: string, result: Record<string, unknown>): AtomicEngineData[] {
  const items: AtomicEngineData[] = [];
  const system = classifyEngine(engineId);
  
  // Extract top-level string/number fields
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' || typeof value === 'number') {
      items.push({
        id: makeId(subjectId, engineId, key),
        text: `${engineId} ${key}: ${value}`,
        metadata: {
          system,
          engine: engineId,
          field: key,
          subjectId,
          value: String(value),
          category: 'data',
        },
      });
    }
  }
  
  return items;
}

/**
 * Get engines by system type for filtering.
 */
export function getEnginesBySystem(systemType: 'western' | 'vedic' | 'somatic'): string[] {
  switch (systemType) {
    case 'western':
      return WESTERN_ENGINES;
    case 'vedic':
      return VEDIC_ENGINES;
    case 'somatic':
      return SOMATIC_ENGINES;
    default:
      return [];
  }
}
