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
  requiredContextFields: string[];
  intakeQuestions: string[];
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
    requiredContextFields: ['recipient_intent'],
    intakeQuestions: [
      'What does the recipient want this reading to help them reflect on?',
      'Is this for private integration, sharing with someone else, or archival self-study?',
    ],
  },
  married: {
    mode: 'married',
    title: 'Married Partnership Reading',
    relationshipFrame: 'A committed marriage/household reading. The shared structure is already real and should be treated as a living institution.',
    requiredAnchors: ['partner A deterministic facts', 'partner B deterministic facts', 'relationship status: married', 'household context if supplied'],
    forbiddenFrames: ['whether this will work as a yes/no verdict', 'dating advice framing', 'treating vows as hypothetical'],
    sourceRules: ['Honor existing commitment.', 'Focus on maintenance, repair, dharma, shared rhythm, and anti-dependency.'],
    requiredContextFields: ['relationship_status', 'shared_household_status', 'primary_question'],
    intakeQuestions: [
      'Are the two people married, legally partnered, ritually committed, or otherwise explicitly in a committed household structure?',
      'Do they share a household, finances, children, family duties, or long-term care obligations?',
      'What is the primary question for the marriage/household reading: repair, timing, communication, family, money, dharma, or something else?',
    ],
  },
  'partner-relationship': {
    mode: 'partner-relationship',
    title: 'Romantic Partner Reading',
    relationshipFrame: 'A romantic relationship reading. The field may be current and serious without being settled as marriage.',
    requiredAnchors: ['partner A deterministic facts', 'partner B deterministic facts', 'relationship status', 'commitment context if supplied'],
    forbiddenFrames: ['assuming marriage', 'declaring inevitable breakup/marriage', 'turning attraction into destiny'],
    sourceRules: ['Separate current relational field from marital vow field.', 'Name tests and timing without prediction.'],
    requiredContextFields: ['relationship_status', 'commitment_status', 'primary_question'],
    intakeQuestions: [
      'What is the actual relationship status: dating, long-term relationship, engaged, on/off, separated, unclear, or other?',
      'Are marriage, commitment, shared home, children, or business entanglement currently being considered, or should those not be assumed?',
      'What is the primary question for the relationship reading: compatibility, timing, conflict, commitment, communication, repair, or clarity?',
    ],
  },
  'general-synastry': {
    mode: 'general-synastry',
    title: 'General Synastry Reading',
    relationshipFrame: 'A two-person field comparison that may be non-romantic: friends, collaborators, relatives, teacher/student, or unknown connection.',
    requiredAnchors: ['person A deterministic facts', 'person B deterministic facts', 'connection type if supplied'],
    forbiddenFrames: ['romantic assumptions', 'sexual compatibility framing', 'marriage framing', 'household predictions'],
    sourceRules: ['Use neutral language: connection, field, collaboration, resonance.', 'Do not imply romance unless explicitly declared.'],
    requiredContextFields: ['connection_type', 'primary_question'],
    intakeQuestions: [
      'What is the connection type: friends, relatives, collaborators, teacher/student, client/practitioner, two public figures, unknown, or other?',
      'Should the reading avoid romance/marriage language entirely?',
      'What should the comparison illuminate: communication, creative resonance, conflict, learning, timing, or role clarity?',
    ],
  },
  family: {
    mode: 'family',
    title: 'Family System Reading',
    relationshipFrame: 'A kinship system reading. Roles, generations, inheritance, repair, and care ethics matter more than pair compatibility.',
    requiredAnchors: ['each member deterministic facts', 'role map', 'kinship edges'],
    forbiddenFrames: ['romantic/sexual framing', 'compatibility score', 'blame assignment', 'parental diagnosis'],
    sourceRules: ['Respect roles and generations.', 'Track lineage patterns without fatalism or blame.'],
    requiredContextFields: ['family_roles', 'primary_question'],
    intakeQuestions: [
      'What are the exact family roles for each person: mother, father, child, sibling, spouse, grandparent, in-law, etc.?',
      'What is the family question: lineage, repair, caregiving, inheritance, communication, estrangement, support, or pattern understanding?',
      'Are any relationships sensitive or estranged such that the tone should avoid reconciliation assumptions?',
    ],
  },
  business: {
    mode: 'business',
    title: 'Business / Team Reading',
    relationshipFrame: 'A collaboration and execution-system reading. Focus on decision rights, operational rhythm, trust, risk, communication, and role clarity.',
    requiredAnchors: ['each member deterministic facts', 'business roles if supplied', 'decision/ownership context if supplied'],
    forbiddenFrames: ['romantic framing', 'family karma framing unless explicitly relevant', 'investment advice', 'guaranteed success/failure'],
    sourceRules: ['Translate patterns into working agreements.', 'Keep claims operational and observable.'],
    requiredContextFields: ['business_roles', 'decision_context', 'primary_question'],
    intakeQuestions: [
      'What are the exact business roles: founder, cofounder, investor, operator, advisor, client, vendor, employee, etc.?',
      'What decision context should the reading serve: hiring, cofounder fit, conflict, operating rhythm, strategic planning, or role design?',
      'Are there legal, equity, money, reporting, or authority boundaries that must be named or avoided?',
    ],
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
  return `# Mode and Register Policy\n\nMode: ${policy.title}\nRegister: ${policy.register.toUpperCase()}\n\n## Relationship Frame\n\n${policy.relationshipFrame}\n\n## Notebook Voice\n\n${policy.notebookVoice}\n\n## Deck Frame\n\n${policy.deckFrame}\n\n## Audio Frame\n\n${policy.audioFrame}\n\n## Required Intake Fields\n\n${policy.requiredContextFields.map(item => `- ${item}`).join('\n')}\n\n## Intake Questions\n\n${policy.intakeQuestions.map(item => `- ${item}`).join('\n')}\n\n## Required Anchors\n\n${policy.requiredAnchors.map(item => `- ${item}`).join('\n')}\n\n## Forbidden Frames\n\n${policy.forbiddenFrames.map(item => `- ${item}`).join('\n')}\n\n## Source Rules\n\n${policy.sourceRules.map(item => `- ${item}`).join('\n')}\n`;
}

export interface IntakeValidationResult {
  ok: boolean;
  missing: string[];
  questions: string[];
}

export function validateModeContext(policy: ModePolicy, context: Record<string, unknown> | undefined): IntakeValidationResult {
  const ctx = context || {};
  const missing = policy.requiredContextFields.filter(field => {
    const value = ctx[field];
    if (Array.isArray(value)) return value.length === 0;
    return value === undefined || value === null || value === '';
  });
  return {
    ok: missing.length === 0,
    missing,
    questions: policy.intakeQuestions,
  };
}

export function formatModeContext(context: Record<string, unknown> | undefined): string {
  const entries = Object.entries(context || {});
  if (entries.length === 0) return '# Answered Mode Context\n\nNo intake context was supplied.\n';
  return `# Answered Mode Context\n\nThese answers are user/operator supplied and define what the asset pack may assume. If a topic is not answered here, do not assume it.\n\n${entries.map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') : JSON.stringify(value)}`).join('\n')}\n`;
}
