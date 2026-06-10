// Asset Mode Policy Registry
//
// Single source for how relationship modes and L1-L5 registers shape
// recipient-facing source packs and NotebookLM asset prompts.

export type ConsciousnessLevel = 1 | 2 | 3 | 4 | 5;

export type RegisterBand = 'l1_l3' | 'l4_l5';

export type RelationshipMode =
  | 'solo'
  | 'married'
  | 'partner-relationship'
  | 'general-synastry'
  | 'family'
  | 'business';

export interface ModePolicy {
  mode: RelationshipMode;
  register: RegisterBand;
  title: string;
  relationshipFrame: string;
  requiredAnchors: string[];
  forbiddenFrames: string[];
  notebookVoice: string;
  deckFrame: string;
  audioFrame: string;
  sourceRules: string[];
}

export function levelToRegisterBand(level: ConsciousnessLevel): RegisterBand {
  return level >= 4 ? 'l4_l5' : 'l1_l3';
}

export function normalizeRelationshipMode(raw?: string): RelationshipMode {
  const value = (raw || 'solo').toLowerCase().replace(/_/g, '-');
  if (['solo', 'individual', 'person'].includes(value)) return 'solo';
  if (['married', 'marriage', 'spouse', 'vivaha'].includes(value)) return 'married';
  if (['partner', 'romantic', 'partner-synastry', 'relationship', 'partner-relationship'].includes(value)) return 'partner-relationship';
  if (['synastry', 'general-synastry', 'non-romantic-synastry', 'connected-people'].includes(value)) return 'general-synastry';
  if (['family', 'family-triad', 'family-penta', 'kinship'].includes(value)) return 'family';
  if (['business', 'business-partners', 'team', 'team-synergy', 'cofounder'].includes(value)) return 'business';
  return 'solo';
}

const MODE_BASE: Record<RelationshipMode, Omit<ModePolicy, 'register' | 'notebookVoice' | 'deckFrame' | 'audioFrame'>> = {
  solo: {
    mode: 'solo',
    title: 'Solo Personal Reading',
    relationshipFrame: 'A single-person reflective companion. The person is not defined through another person.',
    requiredAnchors: ['subject deterministic facts', 'natal panchanga scope', 'somatic availability scope'],
    forbiddenFrames: ['compatibility scoring', 'relationship prediction', 'medical diagnosis', 'deterministic fate claims'],
    sourceRules: ['Treat engine facts as anchors.', 'Use generated prose as narrative texture only when it agrees with anchors.'],
  },
  married: {
    mode: 'married',
    title: 'Married Partnership Reading',
    relationshipFrame: 'A committed marriage/household reading. The shared structure is already real and should be treated as a living institution.',
    requiredAnchors: ['partner A deterministic facts', 'partner B deterministic facts', 'relationship status: married', 'household context if supplied'],
    forbiddenFrames: ['whether this will work as a yes/no verdict', 'dating advice framing', 'treating vows as hypothetical'],
    sourceRules: ['Honor existing commitment.', 'Focus on maintenance, repair, dharma, shared rhythm, and anti-dependency.'],
  },
  'partner-relationship': {
    mode: 'partner-relationship',
    title: 'Romantic Partner Reading',
    relationshipFrame: 'A romantic relationship reading. The field may be current and serious without being settled as marriage.',
    requiredAnchors: ['partner A deterministic facts', 'partner B deterministic facts', 'relationship status', 'commitment context if supplied'],
    forbiddenFrames: ['assuming marriage', 'declaring inevitable breakup/marriage', 'turning attraction into destiny'],
    sourceRules: ['Separate current relational field from marital vow field.', 'Name tests and timing without prediction.'],
  },
  'general-synastry': {
    mode: 'general-synastry',
    title: 'General Synastry Reading',
    relationshipFrame: 'A two-person field comparison that may be non-romantic: friends, collaborators, relatives, teacher/student, or unknown connection.',
    requiredAnchors: ['person A deterministic facts', 'person B deterministic facts', 'connection type if supplied'],
    forbiddenFrames: ['romantic assumptions', 'sexual compatibility framing', 'marriage framing', 'household predictions'],
    sourceRules: ['Use neutral language: connection, field, collaboration, resonance.', 'Do not imply romance unless explicitly declared.'],
  },
  family: {
    mode: 'family',
    title: 'Family System Reading',
    relationshipFrame: 'A kinship system reading. Roles, generations, inheritance, repair, and care ethics matter more than pair compatibility.',
    requiredAnchors: ['each member deterministic facts', 'role map', 'kinship edges'],
    forbiddenFrames: ['romantic/sexual framing', 'compatibility score', 'blame assignment', 'parental diagnosis'],
    sourceRules: ['Respect roles and generations.', 'Track lineage patterns without fatalism or blame.'],
  },
  business: {
    mode: 'business',
    title: 'Business / Team Reading',
    relationshipFrame: 'A collaboration and execution-system reading. Focus on decision rights, operational rhythm, trust, risk, communication, and role clarity.',
    requiredAnchors: ['each member deterministic facts', 'business roles if supplied', 'decision/ownership context if supplied'],
    forbiddenFrames: ['romantic framing', 'family karma framing unless explicitly relevant', 'investment advice', 'guaranteed success/failure'],
    sourceRules: ['Translate patterns into working agreements.', 'Keep claims operational and observable.'],
  },
};

const REGISTER_TEXT: Record<RegisterBand, Pick<ModePolicy, 'notebookVoice' | 'deckFrame' | 'audioFrame'>> = {
  l1_l3: {
    notebookVoice: 'Plain, traditional, practical, accessible. Prefer clear Vedic/Human Design explanations and concrete self-inquiry. Avoid advanced internal framework jargon.',
    deckFrame: 'Use clear titles, simple definitions, practical takeaways, and accessible visuals. Keep the recipient oriented.',
    audioFrame: 'Warm explainer tone. Define terms before using them. Give practical reflection prompts and avoid dense metaphysics.',
  },
  l4_l5: {
    notebookVoice: 'Architectural, pattern-native, precise, contemplative. You may use field, layer, anti-dependency, kosha, and structural language when grounded in anchors.',
    deckFrame: 'Use architectural diagrams, field maps, layered timelines, and elegant pattern language. Still keep it recipient-facing.',
    audioFrame: 'Deep companion tone. Emphasize architecture, integration, somatic tests, and anti-dependency milestones without becoming abstract jargon.',
  },
};

export function getModePolicy(mode: string | undefined, level: ConsciousnessLevel = 3): ModePolicy {
  const normalized = normalizeRelationshipMode(mode);
  const register = levelToRegisterBand(level);
  return {
    ...MODE_BASE[normalized],
    ...REGISTER_TEXT[register],
    register,
  };
}

export function formatModePolicy(policy: ModePolicy): string {
  return `# Mode and Register Policy\n\nMode: ${policy.title}\nRegister: ${policy.register.toUpperCase()}\n\n## Relationship Frame\n\n${policy.relationshipFrame}\n\n## Notebook Voice\n\n${policy.notebookVoice}\n\n## Deck Frame\n\n${policy.deckFrame}\n\n## Audio Frame\n\n${policy.audioFrame}\n\n## Required Anchors\n\n${policy.requiredAnchors.map(item => `- ${item}`).join('\n')}\n\n## Forbidden Frames\n\n${policy.forbiddenFrames.map(item => `- ${item}`).join('\n')}\n\n## Source Rules\n\n${policy.sourceRules.map(item => `- ${item}`).join('\n')}\n`;
}
