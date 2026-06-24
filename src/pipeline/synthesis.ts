// ─── Witness Agents — Multi-Engine Synthesis ─────────────────────────
// Issue #8: MANOMAYA-003
// Cross-engine interpretation: 2-engine (subscriber), 3-5 engine (enterprise),
// full 16-engine portrait (initiate). Dyad coordination for synthesis.

import type {
  SelemeneEngineOutput,
  SelemeneEngineId,
  WitnessEngineAlias,
  RoutingMode,
} from '../types/engine.js';
import { ENGINE_ID_MAP, REVERSE_ENGINE_MAP } from '../types/engine.js';
import type {
  AgentInterpretation,
  Tier,
  UserState,
  CliffordLevel,
} from '../types/interpretation.js';
import type { DomainQueryResult, DomainId } from '../types/knowledge.js';
import { KnowledgeStore } from '../knowledge/domain-loader.js';
import type { RoutingDecision } from '../knowledge/routing-engine.js';
import { PetraeParser } from '../protocols/petrae.js';

// ═══════════════════════════════════════════════════════════════════════
// SYNTHESIS TYPES
// ═══════════════════════════════════════════════════════════════════════

export type SynthesisMode = 'cross-reference' | 'triangulation' | 'full-portrait' | 'mirror';

export interface SynthesisResult {
  mode: SynthesisMode;
  engines_synthesized: WitnessEngineAlias[];
  aletheios_contribution: string;
  pichet_contribution: string;
  unified_narrative: string;
  cross_patterns: CrossPattern[];
  confidence: number;
  petrae_summary?: string;        // PETRAE-encoded summary of what happened
  depth_reached: string;          // Which tier depth was active
}

export interface CrossPattern {
  engines: WitnessEngineAlias[];
  pattern: string;
  somatic_echo?: string;          // Pichet's body-level note
  significance: 'minor' | 'moderate' | 'major' | 'convergence';
}

// Known engine pairings with deep synthesis potential
// Organized by cross-layer resonance: Temporal ↔ Structural ↔ Somatic ↔ Oracle
const SYNERGY_PAIRS: [WitnessEngineAlias, WitnessEngineAlias, string][] = [
  // ─── Temporal × Structural ─────────────────────────────────────────
  ['chronofield', 'nine-point-architecture', 'Dasha period amplifies Enneagram fixation'],
  ['chronofield', 'energetic-authority', 'Life chapter reshapes how authority is exercised'],
  ['active-planetary-weather', 'gift-shadow-spectrum', 'Transit weather activates specific Gene Key shadows or gifts'],
  ['temporal-grammar', 'numeric-architecture', 'Tithi-nakshatra frame reveals number-cycle resonance'],
  ['circadian-cartography', 'energetic-authority', 'Organ-clock peak aligns with HD decision center'],

  // ─── Temporal × Somatic ────────────────────────────────────────────
  ['three-wave-cycle', 'circadian-cartography', 'Biorhythm sync with organ clock'],
  ['active-planetary-weather', 'bioelectric-field', 'Planetary weather shifts energy-field coherence'],
  ['temporal-grammar', 'physiognomic-mapping', 'Nakshatra quality mirrors constitutional type'],
  ['three-wave-cycle', 'resonance-architecture', 'Biorhythm emotional peak selects optimal raga'],

  // ─── Temporal × Oracle ─────────────────────────────────────────────
  ['chronofield', 'hexagram-navigation', 'I Ching hexagram in planetary context'],
  ['temporal-grammar', 'archetypal-mirror', 'Panchanga quality reflects the archetype seeking expression'],
  ['active-planetary-weather', 'hexagram-navigation', 'Transit aspect asks a specific change question'],

  // ─── Structural × Somatic ──────────────────────────────────────────
  ['energetic-authority', 'three-wave-cycle', 'Human Design strategy meets biorhythm'],
  ['bioelectric-field', 'resonance-architecture', 'Biofield coherence with sound frequency'],
  ['bioelectric-field', 'three-wave-cycle', 'Biofield responds to biorhythm peaks'],
  ['nine-point-architecture', 'physiognomic-mapping', 'Enneagram type maps to dosha constitution'],
  ['gift-shadow-spectrum', 'bioelectric-field', 'Activated Gene Key shifts chakra activity'],

  // ─── Structural × Oracle ───────────────────────────────────────────
  ['archetypal-mirror', 'gift-shadow-spectrum', 'Tarot archetype maps to Gene Key'],
  ['energetic-authority', 'hexagram-navigation', 'HD gate activation mirrors hexagram change pattern'],
  ['numeric-architecture', 'geometric-resonance', 'Life Path number reveals resonant sacred form'],
  ['nine-point-architecture', 'archetypal-mirror', 'Enneagram fixation draws a specific Major Arcana'],

  // ─── Somatic × Oracle ──────────────────────────────────────────────
  ['bioelectric-field', 'geometric-resonance', 'Chakra geometry reveals optimal meditation form'],
  ['resonance-architecture', 'sigil-forge', 'Raga frequency encodes intention into symbol'],
  ['physiognomic-mapping', 'archetypal-mirror', 'Facial constitution reflects the archetype in play'],
];

// ═══════════════════════════════════════════════════════════════════════
// SYNTHESIS ENGINE
// ═══════════════════════════════════════════════════════════════════════

export class SynthesisEngine {
  private petrae: PetraeParser;

  constructor() {
    this.petrae = new PetraeParser();
  }

  /**
   * Determine synthesis mode based on tier and engine count
   */
  determineSynthesisMode(tier: Tier, engineCount: number): SynthesisMode {
    switch (tier) {
      case 'free':
        return 'cross-reference'; // shouldn't reach here, but safe fallback
      case 'subscriber':
        return 'cross-reference';  // max 2 engines
      case 'enterprise':
        return engineCount > 5 ? 'full-portrait' : 'triangulation';
      case 'initiate':
        return engineCount >= 16 ? 'mirror' : 'full-portrait';
    }
  }

  /**
   * Synthesize engine outputs into a unified interpretation.
   * This is the core intelligence: cross-referencing engine results
   * through the knowledge layer with dyad perspectives.
   */
  synthesize(
    outputs: SelemeneEngineOutput[],
    userState: UserState,
    knowledge: KnowledgeStore,
    routingDecision?: RoutingDecision,
    cliffordLevel: CliffordLevel = 0,
  ): SynthesisResult {
    const mode = this.determineSynthesisMode(userState.tier, outputs.length);
    const aliases = outputs.map(o => ENGINE_ID_MAP[o.engine_id as SelemeneEngineId]).filter(Boolean);

    switch (mode) {
      case 'cross-reference':
        return this.crossReference(outputs, aliases, userState, knowledge, routingDecision);
      case 'triangulation':
        return this.triangulate(outputs, aliases, userState, knowledge, routingDecision);
      case 'full-portrait':
        return this.fullPortrait(outputs, aliases, userState, knowledge, routingDecision);
      case 'mirror':
        return this.mirrorSynthesis(outputs, aliases, userState, knowledge, routingDecision);
    }
  }

  // ─── SUBSCRIBER: 2-Engine Cross-Reference ─────────────────────────

  private crossReference(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    userState: UserState,
    knowledge: KnowledgeStore,
    routing?: RoutingDecision,
  ): SynthesisResult {
    // Take top 2 engines
    const selected = outputs.slice(0, 2);
    const selectedAliases = aliases.slice(0, 2);

    // Find cross-patterns between the pair
    const patterns = this.findCrossPatterns(selected, selectedAliases, knowledge);

    // Aletheios: analytical perspective
    const aletheiosContrib = this.buildAletheiosCrossRef(
      selected, selectedAliases, patterns, knowledge, routing
    );

    // Pichet: somatic perspective
    const pichetContrib = this.buildPichetCrossRef(
      selected, selectedAliases, userState, knowledge
    );

    // Merge
    const narrative = this.mergeNarratives(aletheiosContrib, pichetContrib, patterns, userState);

    return {
      mode: 'cross-reference',
      engines_synthesized: selectedAliases,
      aletheios_contribution: aletheiosContrib,
      pichet_contribution: pichetContrib,
      unified_narrative: narrative,
      cross_patterns: patterns,
      confidence: Math.min(0.85, 0.5 + patterns.length * 0.15),
      depth_reached: 'subscriber',
    };
  }

  // ─── ENTERPRISE: 3-5 Engine Triangulation ─────────────────────────

  private triangulate(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    userState: UserState,
    knowledge: KnowledgeStore,
    routing?: RoutingDecision,
  ): SynthesisResult {
    const selected = outputs.slice(0, 5);
    const selectedAliases = aliases.slice(0, 5);

    // Find ALL cross-patterns (pairwise)
    const allPatterns: CrossPattern[] = [];
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const pairPatterns = this.findCrossPatterns(
          [selected[i], selected[j]],
          [selectedAliases[i], selectedAliases[j]],
          knowledge,
        );
        allPatterns.push(...pairPatterns);
      }
    }

    // Convergence detection: if 3+ engines agree on a theme
    const convergences = this.detectConvergences(allPatterns);
    allPatterns.push(...convergences);

    // Aletheios: pattern triangulation
    const aletheiosContrib = this.buildAletheiosTriangulation(
      selected, selectedAliases, allPatterns, knowledge, routing
    );

    // Pichet: embodied synthesis
    const pichetContrib = this.buildPichetTriangulation(
      selected, selectedAliases, userState, knowledge
    );

    const narrative = this.mergeNarratives(aletheiosContrib, pichetContrib, allPatterns, userState);

    // Generate PETRAE summary
    const petraeSummary = this.petrae.encodeSynthesis(
      selectedAliases.slice(0, 2), 'standard'
    );

    return {
      mode: 'triangulation',
      engines_synthesized: selectedAliases,
      aletheios_contribution: aletheiosContrib,
      pichet_contribution: pichetContrib,
      unified_narrative: narrative,
      cross_patterns: allPatterns,
      confidence: Math.min(0.95, 0.5 + allPatterns.length * 0.1 + convergences.length * 0.15),
      petrae_summary: petraeSummary,
      depth_reached: 'enterprise',
    };
  }

  // ─── INITIATE/ENTERPRISE: Full 16-Engine Portrait ─────────────────

  private fullPortrait(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    userState: UserState,
    knowledge: KnowledgeStore,
    routing?: RoutingDecision,
  ): SynthesisResult {
    // All engines participate
    const allPatterns = this.findAllPatterns(outputs, aliases, knowledge);
    const convergences = this.detectConvergences(allPatterns);
    allPatterns.push(...convergences);

    // Aletheios: comprehensive pattern map
    const aletheiosContrib = this.buildAletheiosPortrait(
      outputs, aliases, allPatterns, knowledge, routing
    );

    // Pichet: full somatic portrait
    const pichetContrib = this.buildPichetPortrait(
      outputs, aliases, userState, knowledge
    );

    const narrative = this.mergeNarratives(aletheiosContrib, pichetContrib, allPatterns, userState);

    return {
      mode: 'full-portrait',
      engines_synthesized: aliases,
      aletheios_contribution: aletheiosContrib,
      pichet_contribution: pichetContrib,
      unified_narrative: narrative,
      cross_patterns: allPatterns,
      confidence: Math.min(1, 0.6 + convergences.length * 0.1),
      depth_reached: 'enterprise',
    };
  }

  // ─── INITIATE: Mirror Synthesis (Self-Referential) ─────────────────

  private mirrorSynthesis(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    userState: UserState,
    knowledge: KnowledgeStore,
    routing?: RoutingDecision,
  ): SynthesisResult {
    // Full portrait first
    const portrait = this.fullPortrait(outputs, aliases, userState, knowledge, routing);

    // Add mirror layer: reflect back to user's own authoring capacity
    const mirrorNote = this.buildMirrorReflection(portrait, userState);

    return {
      ...portrait,
      mode: 'mirror',
      unified_narrative: portrait.unified_narrative + '\n\n' + mirrorNote,
      depth_reached: 'initiate',
    };
  }

  // ─── PRIVATE: Cross-Pattern Detection ─────────────────────────────

  private findCrossPatterns(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    knowledge: KnowledgeStore,
  ): CrossPattern[] {
    const patterns: CrossPattern[] = [];

    // Check known synergy pairs
    for (const [engine1, engine2, description] of SYNERGY_PAIRS) {
      if (aliases.includes(engine1) && aliases.includes(engine2)) {
        patterns.push({
          engines: [engine1, engine2],
          pattern: description,
          significance: 'moderate',
        });
      }
    }

    // Check for shared domains (domain overlap = potential pattern)
    if (aliases.length >= 2) {
      const domainSets = aliases.map(a => {
        const mapping = knowledge.getEngineMapping(
          REVERSE_ENGINE_MAP[a] || a
        );
        return new Set(mapping?.primary_domains || []);
      });

      for (let i = 0; i < domainSets.length; i++) {
        for (let j = i + 1; j < domainSets.length; j++) {
          const shared: DomainId[] = [];
          for (const d of domainSets[i]) {
            if (domainSets[j].has(d)) shared.push(d);
          }

          if (shared.length > 0) {
            patterns.push({
              engines: [aliases[i], aliases[j]],
              pattern: `Shared knowledge domain${shared.length > 1 ? 's' : ''}: ${shared.join(', ')}`,
              significance: shared.length > 1 ? 'major' : 'minor',
            });
          }
        }
      }
    }

    return patterns;
  }

  private findAllPatterns(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    knowledge: KnowledgeStore,
  ): CrossPattern[] {
    const allPatterns: CrossPattern[] = [];

    // Pairwise check across all engines
    for (let i = 0; i < outputs.length; i++) {
      for (let j = i + 1; j < outputs.length; j++) {
        const pairPatterns = this.findCrossPatterns(
          [outputs[i], outputs[j]],
          [aliases[i], aliases[j]],
          knowledge,
        );
        allPatterns.push(...pairPatterns);
      }
    }

    return allPatterns;
  }

  private detectConvergences(patterns: CrossPattern[]): CrossPattern[] {
    const convergences: CrossPattern[] = [];

    // Group patterns by engine
    const engineAppearance = new Map<WitnessEngineAlias, number>();
    for (const p of patterns) {
      for (const e of p.engines) {
        engineAppearance.set(e, (engineAppearance.get(e) || 0) + 1);
      }
    }

    // Engines appearing in 3+ patterns = convergence nodes
    const convergenceEngines: WitnessEngineAlias[] = [];
    for (const [engine, count] of engineAppearance) {
      if (count >= 3) {
        convergenceEngines.push(engine);
      }
    }

    if (convergenceEngines.length > 0) {
      convergences.push({
        engines: convergenceEngines,
        pattern: `Convergence point: ${convergenceEngines.join(' + ')} appear across multiple engine interactions`,
        significance: 'convergence',
      });
    }

    return convergences;
  }

  // ─── PRIVATE: Narrative Builders ──────────────────────────────────

  private buildAletheiosCrossRef(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    patterns: CrossPattern[],
    knowledge: KnowledgeStore,
    routing?: RoutingDecision,
  ): string {
    const parts: string[] = [];

    // Engine-specific insights
    for (let i = 0; i < outputs.length; i++) {
      const insight = this.extractAletheiosInsight(outputs[i], aliases[i]);
      if (insight) parts.push(insight);
    }

    // Cross-pattern observation
    for (const pattern of patterns) {
      parts.push(`Cross-reference [${pattern.engines.join(' × ')}]: ${pattern.pattern}.`);
    }

    // Routing-guided depth
    if (routing?.action_instructions?.length) {
      parts.push(routing.action_instructions[0]);
    }

    return parts.filter(Boolean).join('\n') || 'Aletheios observes — insufficient data for pattern recognition.';
  }

  private buildPichetCrossRef(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    userState: UserState,
    knowledge: KnowledgeStore,
  ): string {
    const parts: string[] = [];

    // Somatic check
    if (userState.overwhelm_level > 0.5) {
      parts.push('Your system is signaling saturation. Before we go deeper — three slow breaths.');
    }

    // Engine-specific body notes
    for (let i = 0; i < outputs.length; i++) {
      const note = this.extractPichetNote(outputs[i], aliases[i]);
      if (note) parts.push(note);
    }

    return parts.filter(Boolean).join('\n') || 'Pichet listens to the body — no strong somatic signal right now.';
  }

  private buildAletheiosTriangulation(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    patterns: CrossPattern[],
    knowledge: KnowledgeStore,
    routing?: RoutingDecision,
  ): string {
    const parts = [
      `Triangulating across ${aliases.length} engines: ${aliases.join(', ')}.`,
    ];

    const convergences = patterns.filter(p => p.significance === 'convergence');
    if (convergences.length > 0) {
      parts.push(`Convergence detected: ${convergences.map(c => c.pattern).join('. ')}`);
    }

    const majors = patterns.filter(p => p.significance === 'major');
    for (const m of majors) {
      parts.push(`Strong signal [${m.engines.join(' × ')}]: ${m.pattern}.`);
    }

    return parts.join('\n');
  }

  private buildPichetTriangulation(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    userState: UserState,
    knowledge: KnowledgeStore,
  ): string {
    const parts: string[] = [];

    if (userState.overwhelm_level > 0.3) {
      parts.push(`${aliases.length} engines are a lot to hold. Let the body decide which one resonates — not the mind.`);
    }

    // Somatic translation of engine count
    parts.push(
      aliases.length >= 4
        ? 'Multiple systems are active. Notice where in your body the strongest pull lives.'
        : 'A few voices speaking — listen for the one that makes your chest open, not tighten.'
    );

    return parts.join('\n');
  }

  private buildAletheiosPortrait(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    patterns: CrossPattern[],
    knowledge: KnowledgeStore,
    routing?: RoutingDecision,
  ): string {
    const parts = [
      this.describePortraitTension(outputs),
    ].filter(Boolean);

    const support = this.describePortraitSupport(outputs);
    if (support) parts.push(support);

    const anchor = support ? null : this.describePatternAnchor(outputs, patterns);
    if (anchor) parts.push(anchor);

    return parts.join('\n');
  }

  private buildPichetPortrait(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    userState: UserState,
    knowledge: KnowledgeStore,
  ): string {
    const biorhythm = this.getResult(outputs, 'biorhythm');
    const vedicClock = this.getResult(outputs, 'vedic-clock');
    const panchanga = this.getResult(outputs, 'panchanga');

    const physical = this.readPercentage(biorhythm?.physical);
    const emotional = this.readPercentage(biorhythm?.emotional);
    const breathFirst = this.isLungBreathWindow(vedicClock);

    if (physical !== null && emotional !== null && physical >= 75 && emotional <= 35) {
      if (breathFirst) {
        return 'Start in the chest with three slower breaths, then take one clean action sized to what your emotional field can actually hold.';
      }
      return 'Take one clean action, but size it to what your emotional field can actually hold.';
    }

    if (physical !== null && emotional !== null && physical <= 35 && emotional <= 35) {
      return 'Choose restoration before expansion. The system will stabilize faster through gentleness than force.';
    }

    if (panchanga && (panchanga.tithi_name || panchanga.nakshatra_name)) {
      return breathFirst
        ? 'Use one slower breath to settle, then make one deliberate move instead of scattering attention.'
        : 'Make one deliberate move instead of scattering attention.';
    }

    return userState.overwhelm_level > 0.5
      ? 'Stay with one signal until the body loosens. More input is not the medicine right now.'
      : 'Start with the signal that makes the body feel more coherent, not the one that feels most urgent.';
  }

  private buildMirrorReflection(
    portrait: SynthesisResult,
    userState: UserState,
  ): string {
    const parts = [
      '── Mirror Layer (Anandamaya) ──',
      'You are not reading a report. You are seeing yourself seeing yourself.',
      `The ${portrait.engines_synthesized.length} engines didn't create this pattern — they revealed what was already present.`,
    ];

    if (userState.anti_dependency_score > 0.7) {
      parts.push('You already know most of what these engines told you. The question is: what will you DO with that knowing?');
    } else {
      parts.push('The mirror shows; it does not prescribe. What do YOU see in this portrait?');
    }

    return parts.join('\n');
  }

  private describePortraitTension(outputs: SelemeneEngineOutput[]): string {
    const biorhythm = this.getResult(outputs, 'biorhythm');
    const vedicClock = this.getResult(outputs, 'vedic-clock');
    const panchanga = this.getResult(outputs, 'panchanga');

    const physical = this.readPercentage(biorhythm?.physical);
    const emotional = this.readPercentage(biorhythm?.emotional);
    const intellectual = this.readPercentage(biorhythm?.intellectual);

    if (physical !== null && emotional !== null && physical >= 75 && emotional <= 35) {
      return 'Your body is ready to move, but regulation needs to set the pace.';
    }

    if (physical !== null && emotional !== null && physical <= 35 && emotional <= 35) {
      return 'Your reserves are low enough that gentleness matters more than output right now.';
    }

    if (vedicClock?.current_dosha?.dosha === 'Vata') {
      return 'Movement is available, but steadiness will decide whether it becomes clarity or scatter.';
    }

    if (panchanga?.tithi_name || panchanga?.nakshatra_name) {
      return 'The day is asking for alignment before force.';
    }

    if (intellectual !== null && emotional !== null && intellectual >= 75 && emotional <= 35) {
      return 'Mental clarity is outrunning emotional readiness. Let pacing protect the quality of the next move.';
    }

    return 'Several signals are active at once. Let the theme that repeats across body and timing guide the day.';
  }

  private describePortraitSupport(outputs: SelemeneEngineOutput[]): string | null {
    const biorhythm = this.getResult(outputs, 'biorhythm');
    const vedicClock = this.getResult(outputs, 'vedic-clock');
    const panchanga = this.getResult(outputs, 'panchanga');

    const physical = this.readPercentage(biorhythm?.physical);
    const emotional = this.readPercentage(biorhythm?.emotional);
    const intellectual = this.readPercentage(biorhythm?.intellectual);
    const supportBits: string[] = [];

    if (physical !== null && emotional !== null && intellectual !== null) {
      supportBits.push(
        `High physical ${this.formatPercent(physical)} and intellectual ${this.formatPercent(intellectual)} capacity are arriving alongside emotional reserves at ${this.formatPercent(emotional)}`
      );
    } else if (physical !== null || emotional !== null || intellectual !== null) {
      const metrics: string[] = [];
      if (physical !== null) metrics.push(`physical ${this.formatPercent(physical)}`);
      if (emotional !== null) metrics.push(`emotional ${this.formatPercent(emotional)}`);
      if (intellectual !== null) metrics.push(`intellectual ${this.formatPercent(intellectual)}`);
      supportBits.push(`The system is carrying ${metrics.join(', ')}`);
    }

    const timingBits: string[] = [];
    if (vedicClock) {
      const organ = vedicClock.current_organ as Record<string, any> | undefined;
      const dosha = vedicClock.current_dosha as Record<string, any> | undefined;
      if (organ?.organ && dosha?.dosha) {
        timingBits.push(`${organ.organ} time under ${dosha.dosha} makes breath and pacing more reliable than force`);
      } else if (organ?.organ) {
        timingBits.push(`${organ.organ} time makes the body's timing cues more reliable than urgency`);
      }
    }

    if (panchanga) {
      const anchors = [
        panchanga.tithi_name,
        panchanga.nakshatra_name,
        panchanga.yoga_name ? `${panchanga.yoga_name} yoga` : null,
      ].filter((value): value is string => Boolean(value));
      if (anchors.length > 0) {
        timingBits.push(`${anchors.join(', ')} favors alignment and clean sequencing`);
      }
    }

    if (supportBits.length === 0 && timingBits.length === 0) return null;
    if (timingBits.length === 0) return `${supportBits[0]}.`;
    if (supportBits.length === 0) return `${timingBits.join(' while ')}.`;

    return `${supportBits[0]}, and ${timingBits.join(' while ')}.`;
  }

  private describePatternAnchor(
    outputs: SelemeneEngineOutput[],
    patterns: CrossPattern[],
  ): string | null {
    const aliases = new Set(outputs.map((output) => ENGINE_ID_MAP[output.engine_id as SelemeneEngineId]));

    if (aliases.has('three-wave-cycle') && aliases.has('circadian-cartography')) {
      return 'Body rhythm and time-of-day rhythm are reinforcing the same message: move, but let regulation determine the size of the move.';
    }

    const meaningfulPattern = patterns.find((pattern) =>
      pattern.significance === 'major' && !pattern.pattern.startsWith('Shared knowledge domain')
    );
    if (meaningfulPattern) {
      return meaningfulPattern.pattern;
    }

    return null;
  }

  private getResult(
    outputs: SelemeneEngineOutput[],
    engineId: SelemeneEngineId,
  ): Record<string, any> | null {
    const output = outputs.find((candidate) => candidate.engine_id === engineId);
    if (!output || typeof output.result !== 'object' || output.result === null) return null;
    return output.result as Record<string, any>;
  }

  private readPercentage(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'object' && value !== null) {
      const percentage = (value as { percentage?: unknown }).percentage;
      if (typeof percentage === 'number' && Number.isFinite(percentage)) return percentage;
    }
    return null;
  }

  private formatPercent(value: number): string {
    return `${Math.round(value)}%`;
  }

  private isLungBreathWindow(vedicClock: Record<string, any> | null): boolean {
    if (!vedicClock) return false;

    const organ = vedicClock.current_organ as Record<string, any> | undefined;
    if (organ?.organ === 'Lung') return true;

    const activitySources = [
      ...(Array.isArray(organ?.recommended_activities) ? organ.recommended_activities : []),
      ...(Array.isArray(vedicClock.recommendation?.activities)
        ? vedicClock.recommendation.activities.map((entry: unknown) =>
            typeof entry === 'string'
              ? entry
              : typeof entry === 'object' && entry !== null && typeof (entry as { activity?: unknown }).activity === 'string'
                ? (entry as { activity: string }).activity
                : null
          )
        : []),
    ].filter((entry): entry is string => typeof entry === 'string');

    return activitySources.some((entry) => /breath|pranayama/i.test(entry));
  }

  // ─── PRIVATE: Engine-Specific Insight Extraction ──────────────────

  private extractAletheiosInsight(
    output: SelemeneEngineOutput,
    alias: WitnessEngineAlias,
  ): string {
    const result = output.result as Record<string, unknown>;

    switch (alias) {
      case 'chronofield': {
        const period = result?.current_period as Record<string, unknown> | undefined;
        if (period?.mahadasha) {
          const maha = period.mahadasha as Record<string, unknown>;
          return `${maha.planet} Mahadasha structures a ${maha.years || 'multi'}-year learning period.`;
        }
        break;
      }
      case 'nine-point-architecture': {
        const analysis = result?.typeAnalysis as Record<string, unknown> | undefined;
        if (analysis?.type) {
          const type = analysis.type as Record<string, unknown>;
          return `Enneagram ${type.number}: core pattern is ${type.coreDesire} vs ${type.coreFear}.`;
        }
        break;
      }
      case 'gift-shadow-spectrum': {
        const geneKey = result?.primary as Record<string, unknown> | undefined;
        if (geneKey) {
          return `Gene Key ${geneKey.number}: shadow of ${geneKey.shadow} → gift of ${geneKey.gift} → siddhi of ${geneKey.siddhi}.`;
        }
        break;
      }
      default:
        return output.witness_prompt || '';
    }

    return '';
  }

  private extractPichetNote(
    output: SelemeneEngineOutput,
    alias: WitnessEngineAlias,
  ): string {
    const result = output.result as Record<string, unknown>;

    switch (alias) {
      case 'three-wave-cycle': {
        const physical = result?.physical as Record<string, unknown> | undefined;
        if (physical?.percentage) {
          const pct = physical.percentage as number;
          return pct > 70
            ? 'Body is at peak — you can handle more right now.'
            : pct < 30
              ? 'Physical reserves are low. Honor the trough.'
              : '';
        }
        break;
      }
      case 'bioelectric-field': {
        const metrics = result?.metrics as Record<string, unknown> | undefined;
        if (metrics?.coherence) {
          const c = metrics.coherence as number;
          return c > 0.7 ? 'High coherence — the body is integrated.' : 'Low coherence — ground before proceeding.';
        }
        break;
      }
      case 'circadian-cartography': {
        const organ = result?.current_organ as Record<string, unknown> | undefined;
        if (organ?.organ) {
          return `Current: ${organ.organ} time. Align with this rhythm.`;
        }
        break;
      }
      default:
        return '';
    }

    return '';
  }

  // ─── PRIVATE: Narrative Merge ─────────────────────────────────────

  private mergeNarratives(
    aletheios: string,
    pichet: string,
    patterns: CrossPattern[],
    userState: UserState,
  ): string {
    const parts: string[] = [];

    // Aletheios speaks first (pattern layer)
    if (aletheios) parts.push(aletheios);

    // Pichet responds (body layer)
    if (pichet) parts.push(pichet);

    // Synthesis insight
    const convergences = patterns.filter(p => p.significance === 'convergence');
    if (convergences.length > 0) {
      parts.push('The pattern and the body converge — this is worth your full attention.');
    }

    // Anti-dependency
    if (userState.anti_dependency_score > 0.8) {
      parts.push('You knew most of this before asking. The engines confirm, not reveal.');
    }

    return parts.join('\n\n');
  }
}
