// ─── /integratedreading — Re-render from cache ─────────────────────────
// Fast iteration tool for the render layer. Takes an existing run
// directory (with pass_<id>.md cached files + the subjects directory)
// and re-runs ONLY the template/styles/interactions render layer.
//
// No LLM calls. No solo regeneration. No synthesis. Just template +
// CSS + JS re-assembly so the artifact-quality work can iterate cheaply.
//
// Usage:
//   node --import tsx scripts/integratedreading-rerender.ts \
//     --run-dir <path>           # contains pass_<id>.md files
//     --subjects-dir <path>      # 01_*.json, 02_*.json subject configs
//     --mode <mode-key>          # which mode doc to use for context

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';

import { parseModeDoc } from './integratedreading/modes/parser.js';
import { renderByTopology } from './integratedreading/render/svg/index.js';
import {
  renderInteractiveHTMLPage,
  renderFigIndex,
  createFigureRegistry,
  renderVizPlate,
  type PartBlock,
} from './integratedreading/render/templates.js';
import { countCrossRefs } from './autoresearch-integratedreading/defaults.js';

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx > 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return undefined;
}

const runDir = getArg('run-dir');
const subjectsDir = getArg('subjects-dir');
const modeKey = getArg('mode');

if (!runDir || !subjectsDir || !modeKey) {
  console.error('Usage: integratedreading-rerender.ts --run-dir <path> --subjects-dir <path> --mode <mode-key>');
  process.exit(1);
}

function toRoman(n: number): string {
  const map: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'],
    [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'],
    [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let s = ''; let r = n;
  for (const [v, sym] of map) { while (r >= v) { s += sym; r -= v; } }
  return s;
}

function mdToHtmlBlock(md: string): string {
  if (!md.trim()) return '';
  try {
    return execSync('pandoc -f markdown -t html5 --syntax-highlighting=none', {
      input: md,
      encoding: 'utf-8',
    });
  } catch {
    return md.split(/\n\n+/).map((p) => p.startsWith('<') ? p : `<p>${p}</p>`).join('\n');
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ─── Load subjects ────────────────────────────────────────────────────
const subjectFiles = readdirSync(resolve(subjectsDir))
  .filter((f) => /^\d+_.+\.json$/.test(f))
  .sort();
const subjects = subjectFiles.map((f) => JSON.parse(readFileSync(join(resolve(subjectsDir), f), 'utf-8')));
console.log(`✓ Loaded ${subjects.length} subjects: ${subjects.map((s) => s.subject).join(' × ')}`);

// ─── Load mode doc ───────────────────────────────────────────────────
const modeDocPath = resolve(
  new URL(import.meta.url).pathname,
  '..',
  'integratedreading/modes',
  `${modeKey}.md`,
);
const doc = parseModeDoc(modeDocPath);
console.log(`✓ Mode doc: ${modeKey} · ${doc.frontmatter.pass_plan.length} passes · topology ${doc.frontmatter.svg_topology}`);

// ─── Load cached pass outputs ────────────────────────────────────────
const runDirAbs = resolve(runDir);
const passContents: Record<string, string> = {};
const passMetrics: Array<{ id: string; title: string; words: number; xrefs: number; target_words: number }> = [];
for (const pass of doc.frontmatter.pass_plan) {
  const path = join(runDirAbs, `pass_${pass.id}.md`);
  if (!existsSync(path)) {
    console.error(`Missing cached pass: ${path}`);
    process.exit(1);
  }
  const content = readFileSync(path, 'utf-8');
  passContents[pass.id] = content;
  const words = content.split(/\s+/).filter(Boolean).length;
  const xrefs = countCrossRefs(content).total;
  passMetrics.push({ id: pass.id, title: pass.title, words, xrefs, target_words: pass.target_words });
  console.log(`  ✓ pass_${pass.id}: ${words}w · ${xrefs} xrefs`);
}

// ─── Build SVG ───────────────────────────────────────────────────────
let svgString = '';
const topology = doc.frontmatter.svg_topology;
try {
  if (topology === 'pentagon' && subjects.length === 3) {
    // Pentagon+3 fallback to triad-triangle
    const colors = ['#10B5A7', '#0B50FB', '#C5A017'];
    const triadData = {
      subjects: subjects.map((s: any, i: number) => ({
        name: s.subject,
        arc_color: colors[i % colors.length],
        current_mahadasha_lord: s.mahadasha?.current_lord,
        next_mahadasha_lord: s.mahadasha?.next_lord,
        next_mahadasha_iso: s.mahadasha?.current_ends_iso,
      })),
      shared_keys: [],
    };
    svgString = renderByTopology('triad-triangle', triadData, { width: 720 });
    console.log(`✓ SVG: triad-triangle (pentagon→triad fallback for N=3)`);
  } else if (topology === 'dyad-arc' && subjects.length === 2) {
    const [a, b] = subjects as any[];
    svgString = renderByTopology('dyad-arc', {
      subject_a: a.subject, subject_b: b.subject,
      a_mahadasha: a.mahadasha,
      b_mahadasha: b.mahadasha,
    }, { width: 640 });
    console.log(`✓ SVG: dyad-arc`);
  } else if (topology === 'triad-triangle' && subjects.length === 3) {
    const colors = ['#10B5A7', '#0B50FB', '#C5A017'];
    svgString = renderByTopology('triad-triangle', {
      subjects: subjects.map((s: any, i: number) => ({
        name: s.subject, arc_color: colors[i],
        current_mahadasha_lord: s.mahadasha?.current_lord,
        next_mahadasha_lord: s.mahadasha?.next_lord,
        next_mahadasha_iso: s.mahadasha?.current_ends_iso,
      })),
      shared_keys: [],
    }, { width: 720 });
    console.log(`✓ SVG: triad-triangle`);
  }
} catch (err: any) {
  console.warn(`  ⚠ SVG render skipped: ${err.message}`);
}

// ─── Build PartBlocks ────────────────────────────────────────────────
const figs = createFigureRegistry();
const partBlocks: PartBlock[] = passMetrics.map((m, i) => ({
  partNum: i + 1,
  romanNumeral: toRoman(i + 1),
  title: m.title,
  subtitle: `~${m.words.toLocaleString()} words · ${m.xrefs} cross-references`,
  contentHtml: mdToHtmlBlock(passContents[m.id]),
  vizHtml: i === 0 && svgString ? renderVizPlate({
    figNo: figs.next(`${doc.frontmatter.mode} field`),
    title: `${doc.frontmatter.mode === 'family-penta' ? 'Lineage Field' : 'Composite Field'}`,
    svg: svgString,
    caption: doc.frontmatter.bridge_mandates[0],
  }) : undefined,
}));

// ─── Render HTML ─────────────────────────────────────────────────────
const html = renderInteractiveHTMLPage({
  title: `${doc.frontmatter.mode} — ${subjects.map((s: any) => s.subject).join(' × ')}`,
  cover: {
    subject: subjects.map((s: any) => s.subject).join(' × '),
    birth_date: subjects[0]?.birth_date || '',
    cover_mandala_svg: svgString,
  },
  topology,
  mode: doc.frontmatter.mode,
  bridge_mandate: doc.frontmatter.bridge_mandates[0],
  parts: partBlocks,
  fig_index_html: renderFigIndex(figs.list()),
  is_composite: subjects.length >= 2,
  composite_subject_a: subjects[0]?.subject,
  composite_subject_b: subjects.slice(1).map((s: any) => s.subject).join(' × '),
});

const slug = slugify(`${doc.frontmatter.mode}-${subjects.map((s: any) => slugify(s.subject)).join('-x-')}`);
const outputPath = join(runDirAbs, `${slug}.html`);
await writeFile(outputPath, html);
console.log(`\n✓ Re-rendered HTML: ${outputPath} (${(html.length / 1024).toFixed(1)} KB)`);
