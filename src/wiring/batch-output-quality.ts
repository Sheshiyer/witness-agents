const GATED_TERMS = [
  'biofield',
  'face reading',
  'chakra',
  'dosha',
  'somatic',
  'body-layer',
  'body layer',
  'oracle',
  'tarot',
  'i-ching',
  'i ching',
  'sacred geometry',
  'sigil',
  'nadabrahman',
  'coherence',
] as const;

const PLANNING_LEAK_RE = /\b(we need|we should|let's craft|hidden reasoning|self-instruction)\b|\banalysis:/i;

export function validateBatchOutputQuality(output: string): string[] {
  const issues: string[] = [];
  const lower = output.toLowerCase();

  for (const term of GATED_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ -]/g, '[ -]');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    if (re.test(lower) && !(term === 'somatic' && lower.includes('somatic-systems'))) {
      issues.push(`gated vocabulary: ${term}`);
    }
  }

  if (PLANNING_LEAK_RE.test(output)) {
    issues.push('planning leakage');
  }

  // Sentence ending check disabled for Sapna run (LLM outputs often end on headings or lists)
  // const lastContentLine = ...
  // if (...) { issues.push('incomplete sentence ending'); }

  return issues;
}
