// ─── Witness Agents — Context-Aware Routing Engine ───────────────────
// Issue #17: MANOMAYA-004
// Loads routing YAML rules and evaluates them against UserState
// to determine which knowledge domains to consult and how to interpret

import * as fs from 'node:fs';
import yaml from 'js-yaml';
import type { UserState, Kosha, CliffordLevel, Tier } from '../types/interpretation.js';
import type { WitnessEngineAlias, SelemeneEngineId } from '../types/engine.js';
import { ENGINE_ID_MAP } from '../types/engine.js';
import type { DomainId } from '../types/knowledge.js';

// ═══════════════════════════════════════════════════════════════════════
// ROUTING RULE — parsed from YAML
// ═══════════════════════════════════════════════════════════════════════

export type TriggerType = 'engine' | 'state' | 'temporal' | 'multi-engine' | 'pain-override';

export interface RoutingRuleYaml {
  trigger: string;
  domains: DomainId[];
  action: string;
  depth?: Record<string, string>;    // tier → depth description
  embodiment?: string;               // Pichet's delivery note
  agent_note?: string;               // Agent-specific guidance
  gate_override?: string;
  priority?: string;
}

export interface ParsedRule {
  id: string;
  agent: 'aletheios' | 'pichet';
  trigger_type: TriggerType;
  condition: RuleCondition;
  domains: DomainId[];
  action: string;
  depth_by_tier: Map<Tier, string>;
  embodiment?: string;
  agent_note?: string;
  gate_override?: GateOverride;
  priority: number;                  // Higher = checked first
}

export type GateOverride = {
  type: 'reduce_clifford';
  amount: number;
};

// Condition types that can be evaluated against state
export type RuleCondition =
  | { type: 'engine_match'; engine: WitnessEngineAlias }
  | { type: 'state_field'; field: string; operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte'; value: unknown }
  | { type: 'state_bool'; field: string; expected: boolean }
  | { type: 'temporal'; field: string; value: string }
  | { type: 'multi_engine'; engines: WitnessEngineAlias[] }
  | { type: 'pain_reported' }
  | { type: 'always' };

// ═══════════════════════════════════════════════════════════════════════
// ROUTING RESULT — what the engine returns
// ═══════════════════════════════════════════════════════════════════════

export interface RoutingDecision {
  matched_rules: ParsedRule[];
  domains_to_load: DomainId[];
  action_instructions: string[];
  depth_description?: string;
  embodiment_notes: string[];
  gate_overrides: GateOverride[];
  effective_clifford_reduction: number;
  primary_agent: 'aletheios' | 'pichet';
  pain_override_active: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// ROUTING ENGINE
// ═══════════════════════════════════════════════════════════════════════

export class RoutingEngine {
  private aletheiosRules: ParsedRule[] = [];
  private pichetRules: ParsedRule[] = [];
  private loaded = false;

  /**
   * Load routing rules from YAML files
   */
  async loadRules(
    aletheiosPath: string,
    pichetPath: string,
  ): Promise<{ aletheios: number; pichet: number }> {
    if (fs.existsSync(aletheiosPath)) {
      const raw = fs.readFileSync(aletheiosPath, 'utf-8');
      const parsed = yaml.load(raw) as { routing_rules: RoutingRuleYaml[] };
      if (parsed?.routing_rules) {
        this.aletheiosRules = parsed.routing_rules.map(
          (r, i) => this.parseRule(r, 'aletheios', i)
        );
      }
    }

    if (fs.existsSync(pichetPath)) {
      const raw = fs.readFileSync(pichetPath, 'utf-8');
      const parsed = yaml.load(raw) as { routing_rules: RoutingRuleYaml[] };
      if (parsed?.routing_rules) {
        this.pichetRules = parsed.routing_rules.map(
          (r, i) => this.parseRule(r, 'pichet', i)
        );
      }
    }

    // Sort by priority (highest first)
    this.aletheiosRules.sort((a, b) => b.priority - a.priority);
    this.pichetRules.sort((a, b) => b.priority - a.priority);
    this.loaded = true;

    return {
      aletheios: this.aletheiosRules.length,
      pichet: this.pichetRules.length,
    };
  }

  /**
   * Route: given user state and engine results, determine which
   * knowledge domains to load and how to interpret.
   */
  route(
    userState: UserState,
    enginesUsed: WitnessEngineAlias[],
    temporalContext?: {
      circadian_position?: string;
      biorhythm?: { physical: number; emotional: number; intellectual: number };
    },
    painReported = false,
  ): RoutingDecision {
    const context: EvalContext = {
      userState,
      enginesUsed,
      temporalContext,
      painReported,
    };

    const matched: ParsedRule[] = [];
    const allRules = [...this.aletheiosRules, ...this.pichetRules];

    // Evaluate all rules
    for (const rule of allRules) {
      if (this.evaluateCondition(rule.condition, context)) {
        matched.push(rule);
      }
    }

    // Sort matches by priority
    matched.sort((a, b) => b.priority - a.priority);

    // Collect unique domains
    const domainsSet = new Set<DomainId>();
    const actions: string[] = [];
    const embodimentNotes: string[] = [];
    const gateOverrides: GateOverride[] = [];
    let painOverride = false;

    for (const rule of matched) {
      for (const d of rule.domains) domainsSet.add(d);
      actions.push(rule.action);
      if (rule.embodiment) embodimentNotes.push(rule.embodiment);
      if (rule.gate_override) gateOverrides.push(rule.gate_override);
      if (rule.trigger_type === 'pain-override') painOverride = true;
    }

    // Calculate effective Clifford reduction
    let cliffordReduction = 0;
    for (const override of gateOverrides) {
      if (override.type === 'reduce_clifford') {
        cliffordReduction += override.amount;
      }
    }

    // Determine primary agent based on matched rules
    const aletheiosCount = matched.filter(r => r.agent === 'aletheios').length;
    const pichetCount = matched.filter(r => r.agent === 'pichet').length;
    const primaryAgent = pichetCount > aletheiosCount ? 'pichet' : 'aletheios';

    // Get depth description for current tier
    let depthDescription: string | undefined;
    if (matched.length > 0) {
      depthDescription = matched[0].depth_by_tier.get(userState.tier);
    }

    return {
      matched_rules: matched,
      domains_to_load: Array.from(domainsSet),
      action_instructions: actions,
      depth_description: depthDescription,
      embodiment_notes: embodimentNotes,
      gate_overrides: gateOverrides,
      effective_clifford_reduction: cliffordReduction,
      primary_agent: primaryAgent,
      pain_override_active: painOverride,
    };
  }

  /**
   * Get routing stats
   */
  getStats(): { aletheios_rules: number; pichet_rules: number; loaded: boolean } {
    return {
      aletheios_rules: this.aletheiosRules.length,
      pichet_rules: this.pichetRules.length,
      loaded: this.loaded,
    };
  }

  // ─── PRIVATE: Rule Parsing ─────────────────────────────────────────

  private parseRule(
    raw: RoutingRuleYaml,
    agent: 'aletheios' | 'pichet',
    index: number,
  ): ParsedRule {
    const condition = this.parseTrigger(raw.trigger);
    const triggerType = this.classifyTrigger(raw.trigger);

    // Parse depth by tier
    const depthByTier = new Map<Tier, string>();
    if (raw.depth) {
      for (const [tier, desc] of Object.entries(raw.depth)) {
        depthByTier.set(tier as Tier, desc);
      }
    }

    // Parse gate override
    let gateOverride: GateOverride | undefined;
    if (raw.gate_override) {
      const reduceMatch = raw.gate_override.match(/reduce.*clifford.*by\s+(\d+)/i);
      if (reduceMatch) {
        gateOverride = { type: 'reduce_clifford', amount: parseInt(reduceMatch[1]) };
      }
    }

    // Priority: pain override = 1000, state triggers = 100, engine triggers = 50, temporal = 25
    let priority = 50;
    if (raw.priority === 'highest') priority = 1000;
    else if (triggerType === 'pain-override') priority = 1000;
    else if (triggerType === 'state') priority = 100;
    else if (triggerType === 'temporal') priority = 25;
    else if (triggerType === 'multi-engine') priority = 75;

    return {
      id: `${agent}-rule-${index}`,
      agent,
      trigger_type: triggerType,
      condition,
      domains: (raw.domains || []) as DomainId[],
      action: raw.action || '',
      depth_by_tier: depthByTier,
      embodiment: raw.embodiment,
      agent_note: raw.agent_note,
      gate_override: gateOverride,
      priority,
    };
  }

  private parseTrigger(trigger: string): RuleCondition {
    // Engine match: "engine == chronofield"
    const engineMatch = trigger.match(/^engine\s*==\s*["']?(\S+?)["']?\s*$/);
    if (engineMatch) {
      return { type: 'engine_match', engine: engineMatch[1] as WitnessEngineAlias };
    }

    // State boolean: "user_state.recursion_detected == true"
    const boolMatch = trigger.match(/^user_state\.(\S+)\s*==\s*(true|false)\s*$/);
    if (boolMatch) {
      return { type: 'state_bool', field: boolMatch[1], expected: boolMatch[2] === 'true' };
    }

    // State comparison: "user_state.overwhelm_level > 0.5"
    const compMatch = trigger.match(/^user_state\.(\S+)\s*(==|>|<|>=|<=)\s*(.+)\s*$/);
    if (compMatch) {
      const opMap: Record<string, 'eq' | 'gt' | 'lt' | 'gte' | 'lte'> = {
        '==': 'eq', '>': 'gt', '<': 'lt', '>=': 'gte', '<=': 'lte',
      };
      const value = isNaN(Number(compMatch[3]))
        ? compMatch[3].replace(/["']/g, '')
        : Number(compMatch[3]);
      return { type: 'state_field', field: compMatch[1], operator: opMap[compMatch[2]] || 'eq', value };
    }

    // Temporal: "temporal_context.circadian_position == 'liver_time'"
    const temporalMatch = trigger.match(/^temporal_context\.(\S+)\s*==\s*["']?(.+?)["']?\s*$/);
    if (temporalMatch) {
      return { type: 'temporal', field: temporalMatch[1], value: temporalMatch[2] };
    }

    // Temporal comparison: "temporal_context.biorhythm.physical < 20"
    const temporalCompMatch = trigger.match(/^temporal_context\.(\S+)\s*(>|<|>=|<=)\s*(\d+)\s*$/);
    if (temporalCompMatch) {
      return {
        type: 'state_field',
        field: `temporal_${temporalCompMatch[1]}`,
        operator: ({ '>': 'gt', '<': 'lt', '>=': 'gte', '<=': 'lte' } as const)[temporalCompMatch[2]] || 'lt',
        value: Number(temporalCompMatch[3]),
      };
    }

    // Multi-engine: "engines_used contains [chronofield, nine-point-architecture]"
    const multiMatch = trigger.match(/^engines_used\s+contains\s+\[(.+)\]\s*$/);
    if (multiMatch) {
      const engines = multiMatch[1].split(',').map(e => e.trim()) as WitnessEngineAlias[];
      return { type: 'multi_engine', engines };
    }

    // Pain reported
    if (trigger.match(/^pain_reported\s*==\s*true$/)) {
      return { type: 'pain_reported' };
    }

    // Active kosha: "user_state.active_kosha == anandamaya"
    const koshaMatch = trigger.match(/^user_state\.active_kosha\s*==\s*["']?(\S+?)["']?\s*$/);
    if (koshaMatch) {
      return { type: 'state_field', field: 'active_kosha', operator: 'eq', value: koshaMatch[1] };
    }

    // HTTP status: "user_state.http_status == 404"
    const httpMatch = trigger.match(/^user_state\.http_status\s*==\s*(\d+)\s*$/);
    if (httpMatch) {
      return { type: 'state_field', field: 'http_status', operator: 'eq', value: Number(httpMatch[1]) };
    }

    // Fallback: always match (shouldn't happen with valid YAML)
    return { type: 'always' };
  }

  private classifyTrigger(trigger: string): TriggerType {
    if (trigger.startsWith('engine ==')) return 'engine';
    if (trigger.startsWith('user_state.')) return 'state';
    if (trigger.startsWith('temporal_context.')) return 'temporal';
    if (trigger.startsWith('engines_used')) return 'multi-engine';
    if (trigger.startsWith('pain_reported')) return 'pain-override';
    return 'engine';
  }

  // ─── PRIVATE: Condition Evaluation ─────────────────────────────────

  private evaluateCondition(condition: RuleCondition, ctx: EvalContext): boolean {
    switch (condition.type) {
      case 'engine_match':
        return ctx.enginesUsed.includes(condition.engine);

      case 'state_bool':
        return this.getStateField(ctx.userState, condition.field) === condition.expected;

      case 'state_field': {
        const actual = condition.field.startsWith('temporal_')
          ? this.getTemporalField(ctx.temporalContext, condition.field.replace('temporal_', ''))
          : this.getStateField(ctx.userState, condition.field);

        if (actual === undefined) return false;
        return this.compare(actual, condition.operator, condition.value);
      }

      case 'temporal': {
        const actual = this.getTemporalField(ctx.temporalContext, condition.field);
        return actual === condition.value;
      }

      case 'multi_engine':
        return condition.engines.every(e => ctx.enginesUsed.includes(e));

      case 'pain_reported':
        return ctx.painReported;

      case 'always':
        return true;
    }
  }

  private getStateField(state: UserState, field: string): unknown {
    const parts = field.split('.');
    let current: unknown = state;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private getTemporalField(
    temporal: EvalContext['temporalContext'],
    field: string,
  ): unknown {
    if (!temporal) return undefined;
    const parts = field.split('.');
    let current: unknown = temporal;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private compare(actual: unknown, operator: string, expected: unknown): boolean {
    const numActual = typeof actual === 'number' ? actual : Number(actual);
    const numExpected = typeof expected === 'number' ? expected : Number(expected);

    switch (operator) {
      case 'eq': return actual === expected || (typeof actual === 'number' && numActual === numExpected);
      case 'gt': return numActual > numExpected;
      case 'lt': return numActual < numExpected;
      case 'gte': return numActual >= numExpected;
      case 'lte': return numActual <= numExpected;
      default: return false;
    }
  }
}

// ─── Internal eval context ──────────────────────────────────────────

interface EvalContext {
  userState: UserState;
  enginesUsed: WitnessEngineAlias[];
  temporalContext?: {
    circadian_position?: string;
    biorhythm?: { physical: number; emotional: number; intellectual: number };
  };
  painReported: boolean;
}
