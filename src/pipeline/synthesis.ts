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
const SYNERGY_PAIRS: [WitnessEngineAlias, WitnessEngineAlias, string][] = [
  ['chronofield', 'nine-point-architecture', 'Dasha period amplifies Enneagram fixation'],
  ['three-wave-cycle', 'circadian-cartography', 'Biorhythm sync with organ clock'],
  ['gift-shadow-spectrum', 'nine-point-architecture', 'Gene Key shadow maps to Enneagram stress line'],
  ['chronofield', 'active-planetary-weather', 'Current Dasha within transit context'],
  ['bioelectric-field', 'resonance-architecture', 'Biofield coherence with sound frequency'],
  ['numeric-architecture', 'temporal-grammar', 'Number cycle within temporal frame'],
  ['energetic-authority', 'three-wave-cycle', 'Human Design strategy meets biorhythm'],
  ['hexagram-navigation', 'chronofield', 'I Ching hexagram in planetary context'],
  ['archetypal-mirror', 'gift-shadow-spectrum', 'Tarot archetype maps to Gene Key'],
  ['bioelectric-field', 'three-wave-cycle', 'Biofield responds to biorhythm peaks'],
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
      `Full symbolic portrait across ${aliases.length} engines.`,
    ];

    const convergences = patterns.filter(p => p.significance === 'convergence');
    if (convergences.length > 0) {
      parts.push(`Architecture nodes: ${convergences.map(c => c.engines.join('+')).join(', ')}`);
    }

    parts.push(`${patterns.length} cross-patterns identified across the full spectrum.`);

    return parts.join('\n');
  }

  private buildPichetPortrait(
    outputs: SelemeneEngineOutput[],
    aliases: WitnessEngineAlias[],
    userState: UserState,
    knowledge: KnowledgeStore,
  ): string {
    return [
      'The full portrait is a mirror, not a map.',
      'You don\'t need to understand every engine. You need to feel which pattern your body already knows.',
      userState.overwhelm_level > 0.5
        ? 'And right now, your body says: less. Sit with one insight before reaching for the next.'
        : 'What part of this portrait makes you breathe differently? Start there.',
    ].join('\n');
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
