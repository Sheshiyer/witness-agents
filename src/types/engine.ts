// ─── Witness Agents — Selemene Engine SDK Types ───────────────────────
// Issue #1: ANNAMAYA-001
// Typed schemas matching REAL Selemene Engine output (Rust crates + TS bridges)
// Source: Selemene-engine/crates/*/src/models.rs + ts-engines/src/engines/*/engine.ts

// ═══════════════════════════════════════════════════════════════════════
// ENGINE IDENTIFIERS — Selemene API IDs ↔ WitnessOS Names
// ═══════════════════════════════════════════════════════════════════════

/** Actual engine_id values returned by Selemene API */
export const SELEMENE_ENGINE_IDS = [
  'panchanga', 'vimshottari', 'human-design', 'gene-keys', 'numerology',
  'biorhythm', 'vedic-clock', 'biofield', 'face-reading', 'nadabrahman',
  'transits', 'tarot', 'i-ching', 'enneagram', 'sacred-geometry', 'sigil-forge',
] as const;

export type SelemeneEngineId = typeof SELEMENE_ENGINE_IDS[number];

/** Symbolic names used in witness-agents architecture */
export type WitnessEngineAlias =
  | 'temporal-grammar' | 'chronofield' | 'energetic-authority' | 'gift-shadow-spectrum'
  | 'numeric-architecture' | 'three-wave-cycle' | 'circadian-cartography' | 'bioelectric-field'
  | 'physiognomic-mapping' | 'resonance-architecture' | 'active-planetary-weather'
  | 'archetypal-mirror' | 'hexagram-navigation' | 'nine-point-architecture'
  | 'geometric-resonance' | 'sigil-forge';

/** Bidirectional mapping: Selemene API ID ↔ WitnessOS symbolic name */
export const ENGINE_ID_MAP: Record<SelemeneEngineId, WitnessEngineAlias> = {
  'panchanga':        'temporal-grammar',
  'vimshottari':      'chronofield',
  'human-design':     'energetic-authority',
  'gene-keys':        'gift-shadow-spectrum',
  'numerology':       'numeric-architecture',
  'biorhythm':        'three-wave-cycle',
  'vedic-clock':      'circadian-cartography',
  'biofield':         'bioelectric-field',
  'face-reading':     'physiognomic-mapping',
  'nadabrahman':      'resonance-architecture',
  'transits':         'active-planetary-weather',
  'tarot':            'archetypal-mirror',
  'i-ching':          'hexagram-navigation',
  'enneagram':        'nine-point-architecture',
  'sacred-geometry':  'geometric-resonance',
  'sigil-forge':      'sigil-forge',
};

export const REVERSE_ENGINE_MAP: Record<WitnessEngineAlias, SelemeneEngineId> =
  Object.fromEntries(
    Object.entries(ENGINE_ID_MAP).map(([k, v]) => [v, k])
  ) as Record<WitnessEngineAlias, SelemeneEngineId>;

// ═══════════════════════════════════════════════════════════════════════
// ENGINE ROUTING — who interprets what
// ═══════════════════════════════════════════════════════════════════════

export type RoutingMode = 'aletheios-primary' | 'pichet-primary' | 'dyad-synthesis';

export const ENGINE_ROUTING: Record<SelemeneEngineId, RoutingMode> = {
  // Aletheios-primary (analytical)
  'vimshottari':      'aletheios-primary',
  'human-design':     'aletheios-primary',
  'enneagram':        'aletheios-primary',
  'i-ching':          'aletheios-primary',
  'numerology':       'aletheios-primary',
  // Pichet-primary (somatic)
  'biorhythm':        'pichet-primary',
  'vedic-clock':      'pichet-primary',
  'biofield':         'pichet-primary',
  'face-reading':     'pichet-primary',
  'nadabrahman':      'pichet-primary',
  // Dyad synthesis (co-interpretation)
  'panchanga':        'dyad-synthesis',
  'gene-keys':        'dyad-synthesis',
  'tarot':            'dyad-synthesis',
  'sacred-geometry':  'dyad-synthesis',
  'sigil-forge':      'dyad-synthesis',
  'transits':         'dyad-synthesis',
};

// ═══════════════════════════════════════════════════════════════════════
// SELEMENE UNIVERSAL ENVELOPE — wraps every engine result
// ═══════════════════════════════════════════════════════════════════════

export interface CalculationMetadata {
  calculation_time_ms: number;
  backend: string;              // "native", "swiss_ephemeris"
  precision_achieved: string;
  cached: boolean;
  timestamp: string;            // ISO
  engine_version: string;
}

/** Direct match to Rust EngineOutput + API envelope */
export interface SelemeneEngineOutput {
  engine_id: SelemeneEngineId;
  result: unknown;                // Engine-specific JSON — typed below
  witness_prompt: string;
  consciousness_level: number;    // 0-5
  metadata: CalculationMetadata;
  envelope_version: string;       // "1"
}

export interface SelemeneWorkflowResult {
  workflow_id: string;
  engine_results: Record<SelemeneEngineId, SelemeneEngineOutput>;
  synthesis?: SynthesisResult;
}

export interface SynthesisResult {
  themes: Array<{ name: string; description: string; sources: string[]; strength: number }>;
  alignments: Array<{ aspect: string; description: string; engines: string[]; confidence: number }>;
  tensions: Array<{
    aspect: string; description: string;
    perspective_a: { engine: string; view: string };
    perspective_b: { engine: string; view: string };
    integration_hint: string;
  }>;
  summary: string;
}

/** The 6 canonical workflows */
export type WorkflowId =
  | 'birth-blueprint' | 'daily-practice' | 'decision-support'
  | 'self-inquiry' | 'creative-expression' | 'full-spectrum';

export const WORKFLOW_ENGINES: Record<WorkflowId, SelemeneEngineId[]> = {
  'birth-blueprint':     ['numerology', 'human-design', 'vimshottari', 'biofield', 'face-reading'],
  'daily-practice':      ['panchanga', 'vedic-clock', 'biorhythm', 'transits', 'nadabrahman'],
  'decision-support':    ['tarot', 'i-ching', 'human-design', 'enneagram', 'gene-keys'],
  'self-inquiry':        ['gene-keys', 'enneagram', 'face-reading', 'biofield'],
  'creative-expression': ['sigil-forge', 'sacred-geometry', 'nadabrahman', 'numerology'],
  'full-spectrum':       [...SELEMENE_ENGINE_IDS],
};

// ═══════════════════════════════════════════════════════════════════════
// SELEMENE INPUT TYPES — what we send to the API
// ═══════════════════════════════════════════════════════════════════════

export interface BirthData {
  name?: string;
  date: string;             // "YYYY-MM-DD"
  time?: string;            // "HH:MM"
  latitude: number;
  longitude: number;
  timezone: string;         // IANA e.g. "Asia/Kolkata"
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export type Precision = 'Standard' | 'High' | 'Extreme';

export interface EngineInput {
  birth_data?: BirthData;
  current_time?: string;        // ISO, defaults to now
  location?: Coordinates;
  precision?: Precision;        // defaults to Standard
  options?: Record<string, unknown>;  // engine-specific
}

// ═══════════════════════════════════════════════════════════════════════
// PER-ENGINE RESULT TYPES — matches actual Rust structs & TS outputs
// ═══════════════════════════════════════════════════════════════════════

// ─── Engine 1: Panchanga (temporal-grammar) ──────────────────────────
export interface PanchangaResult {
  tithi_index: number;          // 0..30
  tithi_name: string;
  tithi_value: number;
  nakshatra_index: number;      // 0..27
  nakshatra_name: string;
  nakshatra_value: number;
  yoga_index: number;           // 0..27
  yoga_name: string;
  yoga_value: number;
  karana_index: number;         // 0..11
  karana_name: string;
  karana_value: number;
  vara_index: number;           // 0=Sunday
  vara_name: string;
  solar_longitude: number;      // 0..360
  lunar_longitude: number;      // 0..360
  julian_day: number;
}

// ─── Engine 2: Numerology (numeric-architecture) ────────────────────
export interface NumerologyNumber {
  value: number;
  is_master: boolean;           // 11, 22, 33
  reduction_chain: number[];
  meaning: string;
}

export interface NumerologyResult {
  life_path: NumerologyNumber;
  expression: NumerologyNumber;
  soul_urge: NumerologyNumber;
  personality: NumerologyNumber;
  birthday: NumerologyNumber;
  chaldean_name: NumerologyNumber;
}

// ─── Engine 3: Biorhythm (three-wave-cycle) ─────────────────────────
export interface CycleResult {
  value: number;
  percentage: number;
  phase: string;
  days_until_peak: number;
  days_until_critical: number;
  is_critical: boolean;
  cycle_day: number;
}

export interface ForecastDay {
  date: string;
  days_alive: number;
  physical: number;
  emotional: number;
  intellectual: number;
  intuitive: number;
  overall_energy: number;
}

export interface BiorhythmResult {
  days_alive: number;
  target_date: string;
  physical: CycleResult;
  emotional: CycleResult;
  intellectual: CycleResult;
  intuitive: CycleResult;
  mastery: number;
  passion: number;
  wisdom: number;
  critical_days: string[];
  overall_energy: number;
  forecast?: ForecastDay[];
}

// ─── Engine 4: Human Design (energetic-authority) ───────────────────
export type HDType = 'Generator' | 'ManifestingGenerator' | 'Projector' | 'Manifestor' | 'Reflector';
export type HDAuthority = 'Sacral' | 'Emotional' | 'Splenic' | 'Heart' | 'GCenter' | 'Mental' | 'Lunar';
export type HDCenter = 'Head' | 'Ajna' | 'Throat' | 'G' | 'Heart' | 'Spleen' | 'SolarPlexus' | 'Sacral' | 'Root';
export type HDDefinition = 'Single' | 'Split' | 'TripleSplit' | 'QuadrupleSplit' | 'NoDefinition';

export interface HDActivation {
  planet: string;
  gate: number;
  line: number;
  longitude: number;
}

export interface HDChannel {
  gate1: number;
  gate2: number;
  name: string;
  circuitry: string;
}

export interface HDChart {
  personality_activations: HDActivation[];
  design_activations: HDActivation[];
  centers: Record<string, { defined: boolean; gates: number[] }>;
  channels: HDChannel[];
  hd_type: HDType;
  authority: HDAuthority;
  profile: { conscious_line: number; unconscious_line: number };
  definition: HDDefinition;
}

// ─── Engine 5: Vimshottari Dasha (chronofield) ─────────────────────
export type VedicPlanet = 'Sun' | 'Moon' | 'Mars' | 'Rahu' | 'Jupiter' | 'Saturn' | 'Mercury' | 'Ketu' | 'Venus';

export interface PlanetaryQualities {
  themes: string[];
  qualities: string[];
  element: string;
  description: string;
  consciousness_lessons: string[];
  optimal_practices: string[];
  challenges: string[];
}

export interface VimshottariChart {
  birth_date: string;
  mahadashas: Array<{
    planet: VedicPlanet;
    start_date: string;
    end_date: string;
    duration_years: number;
    antardashas: Array<{ planet: VedicPlanet; start_date: string; end_date: string; duration_years: number }>;
    qualities: PlanetaryQualities;
  }>;
  current_period: {
    mahadasha: { planet: VedicPlanet; start: string; end: string; years: number };
    antardasha: { planet: VedicPlanet; start: string; end: string; years: number };
    pratyantardasha: { planet: VedicPlanet; start: string; end: string; days: number };
    current_time: string;
  };
  upcoming_transitions: Array<{ planet: VedicPlanet; date: string; level: string }>;
}

// ─── Engine 6: Gene Keys (gift-shadow-spectrum) ─────────────────────
export interface GeneKey {
  number: number;
  name: string;
  shadow: string;
  gift: string;
  siddhi: string;
  shadow_description: string;
  gift_description: string;
  siddhi_description: string;
  programming_partner?: number;
  codon?: string;
  amino_acid?: string;
  physiology?: string;
  keywords: string[];
  life_theme?: string;
}

export interface GeneKeysChart {
  activation_sequence: {
    lifes_work: [number, number];
    evolution: [number, number];
    radiance: [number, number];
    purpose: [number, number];
  };
  active_keys: Array<{
    key_number: number;
    line: number;
    source: string;
    gene_key_data?: GeneKey;
  }>;
}

// ─── Engine 7: Vedic Clock (circadian-cartography) ──────────────────
export type Dosha = 'Vata' | 'Pitta' | 'Kapha';
export type TCMElement = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

export interface VedicClockResult {
  current_organ: {
    organ: string;
    element: TCMElement;
    start_hour: number;
    end_hour: number;
    peak_energy: string;
    associated_emotion: string;
    recommended_activities: string[];
  };
  current_dosha: {
    dosha: Dosha;
    start_hour: number;
    end_hour: number;
    qualities: string[];
  };
  recommendation: {
    time_window: string;
    organ: string;
    dosha: Dosha;
    activities: Array<{ activity: string; quality: string; reason: string }>;
    panchanga_quality?: string;
  };
  upcoming?: Array<{ organ: string; start_hour: number; end_hour: number }>;
  calculated_for: string;
}

// ─── Engine 8: Biofield (bioelectric-field) ─────────────────────────
export type Chakra = 'Root' | 'Sacral' | 'SolarPlexus' | 'Heart' | 'Throat' | 'ThirdEye' | 'Crown';

export interface ChakraReading {
  chakra: Chakra;
  activity_level: number;       // 0.0-1.0
  balance: number;              // -1.0 to 1.0
  color_intensity: string;
}

export interface BiofieldAnalysis {
  metrics: {
    fractal_dimension: number;  // 1.0-2.0
    entropy: number;            // 0.0-1.0
    coherence: number;          // 0.0-1.0
    symmetry: number;           // 0.0-1.0
    vitality_index: number;
    chakra_readings: ChakraReading[];
    timestamp: string;
  };
  interpretation: string;
  areas_of_attention: string[];
  is_mock_data: boolean;
}

// ─── Engine 9: Face Reading (physiognomic-mapping) ──────────────────
export type FaceZone = 'Forehead' | 'Eyebrows' | 'Eyes' | 'Nose' | 'Cheeks' | 'Mouth' | 'Chin' | 'Ears' | 'Jawline' | 'Temples';

export interface FaceAnalysis {
  constitution: {
    primary_dosha: Dosha;
    secondary_dosha?: Dosha;
    tcm_element: TCMElement;
    body_type: 'Ectomorph' | 'Mesomorph' | 'Endomorph';
  };
  personality_indicators: Array<{ trait_name: string; facial_indicator: string; description: string }>;
  elemental_balance: { wood: number; fire: number; earth: number; metal: number; water: number };
  health_indicators: Array<{ zone: FaceZone; associated_organ: string; observation: string }>;
  is_mock_data: boolean;
}

// ─── Engine 10: NadaBrahman (resonance-architecture) ────────────────
export interface NadaBrahmanAnalysis {
  time_recommendation: {
    prahar_name: string;
    prahar_number: number;
    time_range: string;
    primary_raga: { raga_number: number; raga_name: string; reason: string; score: number };
    secondary_ragas: Array<{ raga_number: number; raga_name: string; reason: string; score: number }>;
    dosha_dominance: string;
    energy_quality: string;
  };
  recommendations: Array<{ raga_number: number; raga_name: string; reason: string; score: number }>;
  chakra_frequency?: { chakra_name: string; solfeggio_hz: number; binaural_target_hz: number };
  dosha_recommendation?: string;
  rasa_mapping?: string;
}

// ─── Engine 11: Transits (active-planetary-weather) ─────────────────
export type AspectType = 'Conjunction' | 'Opposition' | 'Trine' | 'Square' | 'Sextile';
export type PeriodQuality = 'HighlyFavorable' | 'Favorable' | 'Mixed' | 'Challenging' | 'Difficult';

export interface TransitAspect {
  transiting_planet: string;
  natal_planet: string;
  aspect_type: AspectType;
  orb: number;
  is_applying: boolean;
  nature: string;
}

export interface TransitAnalysisResult {
  natal_positions: Array<{
    planet: string; longitude: number; latitude: number;
    speed: number; sign: string; degree_in_sign: number; is_retrograde: boolean;
  }>;
  transit_positions: Array<{
    planet: string; longitude: number; latitude: number;
    speed: number; sign: string; degree_in_sign: number; is_retrograde: boolean;
  }>;
  aspects: TransitAspect[];
  sade_sati: { is_active: boolean; phase?: string; saturn_sign: string; moon_sign: string };
  period_quality: PeriodQuality;
  retrograde_planets: string[];
}

// ─── Engine 12: Tarot (archetypal-mirror) — TypeScript Bridge ───────
export interface TarotResult {
  spread: { type: string; name: string; description: string; card_count: number; available_types: string[] };
  question: string | null;
  positions: Array<{
    position: number;
    name: string;
    meaning: string;
    card: {
      id: string;
      name: string;
      arcana: string;
      suit: string | null;
      number: number;
      element: string;
      isReversed: boolean;
      interpretation: { meaning: string; keywords: string[] };
    };
  }>;
  cards: unknown[];
  decision?: { answer: 'yes' | 'no'; confidence: number; rationale: string };
  seed: number;
}

// ─── Engine 13: I-Ching (hexagram-navigation) — TypeScript Bridge ───
export interface IChingResult {
  primary_hexagram: {
    number: number; name: string; chinese_name: string;
    meaning: string; judgment: string; image: string;
  };
  changing_lines: number[] | null;
  relating_hexagram: {
    number: number; name: string; chinese_name: string;
    meaning: string; judgment: string; image: string;
  } | null;
  casting: { method: 'three_coins' | 'yarrow_stalks'; line_values: number[] };
  seed: number;
}

// ─── Engine 14: Enneagram (nine-point-architecture) — TS Bridge ─────
export interface EnneagramResult {
  mode: 'assessment' | 'lookup' | 'questions';
  assessment?: {
    scores: Array<{ type: number; normalizedScore: number }>;
    primaryType: { number: number; name: string; description: string };
    wing: { number: number; name: string; description: string };
    confidence: number;
    tritype?: number[];
    note: string;
  };
  typeAnalysis?: {
    type: {
      number: number; name: string;
      coreFear: string; coreDesire: string; coreWeakness: string;
      description: string; keyMotivations: string[];
      healthyTraits: string[]; averageTraits: string[]; unhealthyTraits: string[];
    };
    wings: Array<{ number: number; name: string }>;
    integration: { type: number; name: string; description: string };
    disintegration: { type: number; name: string; description: string };
    center: string;
    hornevianGroup: string;
    harmonicGroup: string;
  };
  questions?: Array<{ id: string; text: string; scale: string }>;
}

// ─── Engine 15: Sacred Geometry (geometric-resonance) — TS Bridge ───
export interface SacredGeometryResult {
  form: {
    id: string; name: string; description: string;
    symbolism: string; elements: string[]; numerology: number;
  };
  meditation: { prompt: string; duration_suggestion: string };
  intention: string | null;
  svg_preview: { status: 'absent' | 'accepted' | 'rejected'; reason?: string };
  seed: number;
}

// ─── Engine 16: Sigil Forge — TypeScript Bridge ─────────────────────
export interface SigilForgeResult {
  intention: string;
  method: { id: string; name: string; description: string; steps: string[] };
  processing: {
    type: 'word_elimination';
    original: string;
    remaining_letters: string;
    letter_count: number;
  } | null;
  charging_suggestions: Array<{ name: string; description: string }>;
  guidance: { note: string; next_steps: string[] };
  svg_preview: { status: string; reason?: string };
  seed: number;
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE RESULT TYPE MAP — typed lookup by engine_id
// ═══════════════════════════════════════════════════════════════════════

export interface EngineResultMap {
  'panchanga': PanchangaResult;
  'numerology': NumerologyResult;
  'biorhythm': BiorhythmResult;
  'human-design': HDChart;
  'vimshottari': VimshottariChart;
  'gene-keys': GeneKeysChart;
  'vedic-clock': VedicClockResult;
  'biofield': BiofieldAnalysis;
  'face-reading': FaceAnalysis;
  'nadabrahman': NadaBrahmanAnalysis;
  'transits': TransitAnalysisResult;
  'tarot': TarotResult;
  'i-ching': IChingResult;
  'enneagram': EnneagramResult;
  'sacred-geometry': SacredGeometryResult;
  'sigil-forge': SigilForgeResult;
}

/** Type-safe engine result extraction */
export type EngineResultFor<E extends SelemeneEngineId> = EngineResultMap[E];

/** Union of all engine results */
export type AnyEngineResult = EngineResultMap[SelemeneEngineId];

// ═══════════════════════════════════════════════════════════════════════
// SUPABASE SCHEMA TYPES — matches real database tables
// ═══════════════════════════════════════════════════════════════════════

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'enterprise';
export type ConsciousnessLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Maps Supabase plan_catalog.code → WitnessOS tier names */
export const SUPABASE_TIER_MAP: Record<SubscriptionTier, import('./interpretation.js').Tier> = {
  'free': 'free',
  'basic': 'subscriber',
  'premium': 'enterprise',
  'enterprise': 'initiate',
};

export interface SupabaseUser {
  id: string;
  email: string;
  full_name?: string;
  tier: SubscriptionTier;
  consciousness_level: ConsciousnessLevel;
  experience_points: number;
}

export interface SupabaseUserProfile {
  user_id: string;
  birth_date?: string;
  birth_time?: string;
  birth_location_lat?: number;
  birth_location_lng?: number;
  birth_location_name?: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
}

export interface SupabaseReading {
  id: string;
  user_id: string;
  engine_id: string;
  workflow_id?: string;
  input_hash: string;
  input_data: EngineInput;
  result_data: SelemeneEngineOutput;
  witness_prompt?: string;
  consciousness_level: number;
  calculation_time_ms: number;
  created_at: string;
}

export interface SupabaseApiKey {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  permissions: Record<string, unknown>;
  consciousness_level: number;
  rate_limit: number;
  is_active: boolean;
}
