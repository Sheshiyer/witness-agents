// ─── Shared mutator helpers for per-mode variant generation ───────────
// Mode configs use these to produce variant mode docs by appending
// targeted instructions to a named template section in the canonical
// mode doc — preserving frontmatter + all other sections.

/**
 * Append an instruction block to the body of a named `## <section>` in
 * the mode doc. Returns the mutated raw markdown. Throws if the section
 * isn't present in the input.
 */
export function appendToSection(
  rawMd: string,
  sectionName: string,
  appendix: string,
): string {
  const headerRe = new RegExp(`^## ${escapeRegex(sectionName)}\\s*$`, 'm');
  const m = rawMd.match(headerRe);
  if (!m || m.index === undefined) {
    throw new Error(`Section '## ${sectionName}' not found in mode doc`);
  }
  // Find the next `## ` header (or end of doc)
  const headerEnd = m.index + m[0].length;
  const nextHeaderRe = /\n## /;
  const after = rawMd.slice(headerEnd);
  const nextMatch = after.match(nextHeaderRe);
  const nextIdx = nextMatch && nextMatch.index !== undefined ? nextMatch.index : after.length;

  const before = rawMd.slice(0, headerEnd + nextIdx);
  const tail = rawMd.slice(headerEnd + nextIdx);
  return before + '\n\n' + appendix.trim() + '\n\n' + tail;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
