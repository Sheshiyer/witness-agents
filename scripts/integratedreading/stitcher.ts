// ─── /integratedreading — Final Stitcher (V2: 11-Part structure) ────
// Mirrors the source DOCX section structure: Opening + Parts I–XI.

export interface ReadingChunks {
  opening?: string;
  part1?: string;
  part2?: string;
  part3?: string;
  part4?: string;
  part5?: string;
  part6?: string;
  part7?: string;
  part8?: string;
  part9?: string;
  part10?: string;
  part11?: string;
  // legacy keys (V1) tolerated for back-compat
  frame?: string;
  identity_eigenwelt?: string;
  identity_mitwelt?: string;
  identity_umwelt?: string;
  mahadasha_transition?: string;
  engine_routing_audit?: string;
  anti_dependency?: string;
  closing?: string;
  [key: string]: string | undefined;
}

export interface StitchOptions {
  subject_name: string;
  birth_data: { date: string; time: string; timezone: string };
  generated_at: string;
  models_used: string[];
  is_composite?: boolean;
  composite_subject_a?: string;
  composite_subject_b?: string;
}

const PART_KEYS_V2 = ['opening', 'part1', 'part2', 'part3', 'part4', 'part5', 'part6', 'part7', 'part8', 'part9', 'part10', 'part11'];
const PART_KEYS_V1 = ['frame', 'identity_eigenwelt', 'identity_mitwelt', 'identity_umwelt', 'mahadasha_transition', 'engine_routing_audit', 'anti_dependency', 'closing'];

function isV2(chunks: ReadingChunks): boolean {
  return PART_KEYS_V2.some((k) => chunks[k] && (chunks[k] as string).length > 100);
}

export function stitchSoloReading(chunks: ReadingChunks, opts: StitchOptions): string {
  const frontmatter = `---
subject: "${opts.subject_name}"
birth_data: "${opts.birth_data.date} ${opts.birth_data.time} ${opts.birth_data.timezone}"
generated_at: "${opts.generated_at}"
generator: "/integratedreading workflow (multi-model NVIDIA)"
models: [${opts.models_used.map((m) => `"${m}"`).join(', ')}]
brand: "Tryambakam Noesis"
brand_voice: "The Anatomist Who Sees Fractals"
layered_grammar: ["Eigenwelt", "Mitwelt", "Umwelt"]
lineage_anchor: "Tsarion (astro-theology, sidereal mythology, Tarot as encoded knowledge)"
structure: "11-Part source-DOCX register"
---

`;

  const closing = `

---

*Tryambakam Noesis · 1331.tryambakam.space · @witnessalchemst*

*Self-Consciousness as Technology. Body as Medium. Breath as Interface.*

*This document is documentation of an instrument. The instrument is what you already are. The Quine principle: the system succeeds when you no longer need it.*
`;

  if (isV2(chunks)) {
    const sections = PART_KEYS_V2.map((k) => chunks[k]).filter(Boolean) as string[];
    return frontmatter + sections.join('\n\n') + closing;
  }

  // V1 fallback (legacy)
  const v1Sections = [
    `# Integrated Reading — ${opts.subject_name}\n`,
    chunks.frame,
    `## Identity Stack at Three Resolutions\n\n### Eigenwelt — Inner-Personal\n\n${chunks.identity_eigenwelt || ''}\n\n### Mitwelt — Cultural-Archetypal\n\n${chunks.identity_mitwelt || ''}\n\n### Umwelt — Celestial-Environmental\n\n${chunks.identity_umwelt || ''}`,
    chunks.mahadasha_transition,
    chunks.engine_routing_audit,
    chunks.anti_dependency,
    chunks.closing,
  ].filter(Boolean);
  return frontmatter + v1Sections.join('\n\n---\n\n') + closing;
}

export function stitchCompositeReading(body: string, opts: StitchOptions): string {
  const frontmatter = `---
mode: "composite"
subject_a: "${opts.composite_subject_a}"
subject_b: "${opts.composite_subject_b}"
generated_at: "${opts.generated_at}"
generator: "/integratedreading workflow (multi-model NVIDIA, dyadic mode)"
models: [${opts.models_used.map((m) => `"${m}"`).join(', ')}]
brand: "Tryambakam Noesis"
brand_voice: "The Anatomist Who Sees Fractals"
structure: "10-Part composite (source-DOCX register)"
lineage_anchor: "Tsarion (astro-theology, sidereal mythology, Tarot as encoded knowledge)"
---

`;
  const closing = `

---

*Tryambakam Noesis · 1331.tryambakam.space*

*The dyad is a single coherence matrix operating across two bodies. This document is one node in its mature-form authorship arc.*
`;
  return frontmatter + body + closing;
}
