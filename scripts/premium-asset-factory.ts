#!/usr/bin/env npx tsx
/**
 * Premium Asset Factory
 *
 * Hybrid deterministic + NotebookLM asset generation for personalized readings.
 *
 * Local, deterministic outputs:
 *   - source-pack/*.md curated sources for NotebookLM
 *   - reading.html + reading.pdf
 *   - reflection-questions.md
 *   - manifest.json with provenance and quality status
 *
 * Optional NotebookLM outputs (--notebooklm):
 *   - audio/deep-dive.mp3
 *   - reports/study-guide.md
 *   - reports/briefing.md
 *   - flashcards/
 *   - quiz/
 *   - mind-map/
 *
 * Usage:
 *   npx tsx scripts/premium-asset-factory.ts --person mohan-kumar-m-g
 *   npx tsx scripts/premium-asset-factory.ts --all
 *   npx tsx scripts/premium-asset-factory.ts --person mohan-kumar-m-g --notebooklm
 */

import { execFileSync, execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

const DEFAULT_INPUT_DIR = '.batch-inputs';
const DEFAULT_READING_DIR = '.batch-outputs';
const DEFAULT_OUTPUT_DIR = '.premium-assets';
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

type AssetStatus = 'ready' | 'pending' | 'failed' | 'skipped';

interface CliArgs {
  person?: string;
  all: boolean;
  inputDir: string;
  readingDir: string;
  outputDir: string;
  notebooklm: boolean;
  noPdf: boolean;
  force: boolean;
}

interface QualityCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

interface NotebookLMArtifactStatus {
  status: AssetStatus;
  artifactId?: string;
  outputPath?: string;
  error?: string;
}

interface Manifest {
  personId: string;
  personName: string;
  generatedAt: string;
  inputs: {
    selemeneJson: string;
    readingMarkdown: string;
  };
  outputs: {
    sourcePackDir: string;
    readingHtml: string;
    readingPdf?: string;
    reflectionQuestions: string;
  };
  quality: QualityCheck[];
  notebooklm: {
    enabled: boolean;
    notebookId?: string;
    sources: Record<string, string>;
    artifacts: Record<string, NotebookLMArtifactStatus>;
  };
}

function parseArgs(): CliArgs {
  const raw = process.argv.slice(2);
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = raw[i + 1];
    if (next && !next.startsWith('--')) {
      opts[key] = next;
      i++;
    } else {
      opts[key] = true;
    }
  }

  return {
    person: typeof opts.person === 'string' ? opts.person : undefined,
    all: opts.all === true,
    inputDir: String(opts.inputDir || DEFAULT_INPUT_DIR),
    readingDir: String(opts.readingDir || DEFAULT_READING_DIR),
    outputDir: String(opts.outputDir || opts.output || DEFAULT_OUTPUT_DIR),
    notebooklm: opts.notebooklm === true,
    noPdf: opts.noPdf === true,
    force: opts.force === true,
  };
}

function slugToName(slug: string): string {
  return slug
    .replace(/\.json$|\.md$/g, '')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function loadEngineData(path: string): Record<string, any> {
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  if (!Array.isArray(raw)) return raw;

  const out: Record<string, any> = {};
  for (const entry of raw) {
    const id = entry.engine_id || entry.engine;
    if (id) out[id] = entry;
  }
  return out;
}

function personIds(inputDir: string): string[] {
  return readdirSync(inputDir)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace(/\.json$/, ''))
    .sort();
}

function extractFacts(engineData: Record<string, any>): Record<string, unknown> {
  const facts: Record<string, unknown> = {};
  for (const [engineId, output] of Object.entries(engineData)) {
    const result = (output as any).result || output;

    if (engineId === 'human-design') {
      facts.human_design_type = result.type;
      facts.human_design_authority = result.authority;
      facts.human_design_profile = result.profile;
      facts.human_design_definition = result.definition;
    }

    if (engineId === 'gene-keys') {
      const activation = result.activation_sequence;
      facts.gene_keys_life_work = activation?.life_work?.gate;
      facts.gene_keys_evolution = activation?.evolution?.gate;
      facts.gene_keys_radiance = activation?.radiance?.gate;
      facts.gene_keys_purpose = activation?.purpose?.gate;
    }

    if (engineId === 'vimshottari') {
      const period = result.current_period;
      facts.vimshottari_mahadasha = period?.mahadasha?.planet;
      facts.vimshottari_antardasha = period?.antardasha?.planet;
      facts.vimshottari_pratyantardasha = period?.pratyantardasha?.planet;
    }

    if (engineId === 'panchanga') {
      facts.panchanga_vara = result.vara_name;
      facts.panchanga_tithi = result.tithi_name;
      facts.panchanga_nakshatra = result.nakshatra_name;
      facts.panchanga_yoga = result.yoga_name;
      facts.panchanga_karana = result.karana_name;
    }

    if (engineId === 'numerology') {
      facts.numerology_life_path = result.life_path?.number ?? result.life_path_number;
      facts.numerology_expression = result.expression?.number ?? result.expression_number;
      facts.numerology_soul_urge = result.soul_urge?.number ?? result.soul_urge_number;
    }
  }

  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value !== undefined && value !== null));
}

function summarizeEngines(engineData: Record<string, any>): string {
  const rows = Object.entries(engineData).map(([engineId, output]) => {
    const result = (output as any).result || output;
    const keys = result && typeof result === 'object' ? Object.keys(result).slice(0, 8).join(', ') : 'no structured result';
    const prompt = (output as any).witness_prompt ? `\n  Witness prompt: ${(output as any).witness_prompt}` : '';
    return `## ${engineId}\n\nAvailable fields: ${keys}.${prompt}`;
  });
  return rows.join('\n\n');
}

function markdownToHtml(md: string): string {
  try {
    return execSync('pandoc -f markdown -t html5 --syntax-highlighting=none', {
      input: md,
      encoding: 'utf-8',
      timeout: 30_000,
    });
  } catch {
    return md
      .split(/\n\n+/)
      .map(block => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPremiumHtml(personName: string, readingMd: string, reflectionMd: string, facts: Record<string, unknown>): string {
  const readingHtml = markdownToHtml(readingMd);
  const reflectionHtml = markdownToHtml(reflectionMd);
  const factsHtml = Object.entries(facts)
    .map(([key, value]) => `<tr><th>${escapeHtml(key.replace(/_/g, ' '))}</th><td>${escapeHtml(String(value))}</td></tr>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(personName)} - Premium Witness Pack</title>
  <style>
    @page { margin: 18mm; }
    :root { color-scheme: light; --ink:#15120f; --muted:#665d52; --gold:#9a6b18; --paper:#fffaf1; --line:#e6d8c0; }
    body { margin:0; background:#f3eee5; color:var(--ink); font: 16px/1.65 Georgia, 'Times New Roman', serif; }
    main { max-width: 860px; margin: 0 auto; background: var(--paper); padding: 56px 64px 80px; box-shadow: 0 18px 50px rgba(44,31,16,.12); }
    .cover { border-bottom: 1px solid var(--line); margin-bottom: 40px; padding-bottom: 32px; }
    .eyebrow { color: var(--gold); text-transform: uppercase; letter-spacing: .16em; font: 700 12px/1.2 system-ui, sans-serif; }
    h1 { font-size: 44px; line-height: 1.05; margin: 16px 0 12px; font-weight: 500; }
    h2 { font-size: 28px; margin-top: 44px; border-top: 1px solid var(--line); padding-top: 24px; }
    h3 { font-size: 20px; margin-top: 28px; }
    p, li { color: var(--ink); }
    .subtitle { color: var(--muted); font-size: 18px; max-width: 620px; }
    table { width:100%; border-collapse: collapse; margin: 20px 0 34px; font: 14px/1.45 system-ui, sans-serif; }
    th,td { border-bottom: 1px solid var(--line); padding: 9px 10px; vertical-align: top; text-align:left; }
    th { width: 32%; color: var(--gold); font-weight: 650; text-transform: capitalize; }
    .reading { margin-top: 28px; }
    .reflection { break-before: page; }
    code { background:#efe4d1; padding:1px 4px; border-radius:4px; }
    @media print { body { background:white; } main { box-shadow:none; padding:0; } }
  </style>
</head>
<body>
  <main>
    <section class="cover">
      <div class="eyebrow">Premium Personal Witness Pack</div>
      <h1>${escapeHtml(personName)}</h1>
      <p class="subtitle">A deterministic reading PDF paired with NotebookLM-ready sources for audio, study-guide, and reflective practice assets.</p>
    </section>
    <section>
      <h2>Locked Fact Snapshot</h2>
      <table>${factsHtml || '<tr><td>No structured facts extracted.</td></tr>'}</table>
    </section>
    <section class="reading">${readingHtml}</section>
    <section class="reflection">
      <h2>Reflection Questions</h2>
      ${reflectionHtml}
    </section>
  </main>
</body>
</html>`;
}

function exportPdf(htmlPath: string, pdfPath: string): AssetStatus {
  if (!existsSync(CHROME_BIN)) return 'skipped';
  try {
    execFileSync(CHROME_BIN, [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--print-to-pdf-no-header',
      `--print-to-pdf=${pdfPath}`,
      '--virtual-time-budget=8000',
      `file://${htmlPath}`,
    ], { stdio: 'pipe', timeout: 60_000 });
    return existsSync(pdfPath) ? 'ready' : 'failed';
  } catch {
    return 'failed';
  }
}

function reflectionQuestions(personName: string, facts: Record<string, unknown>): string {
  const authority = facts.human_design_authority ? `Your Human Design authority is ${facts.human_design_authority}.` : '';
  const dasha = facts.vimshottari_mahadasha ? `Your current Vimshottari mahadasha is ${facts.vimshottari_mahadasha}.` : '';
  const nakshatra = facts.panchanga_nakshatra ? `Your Panchanga nakshatra signal is ${facts.panchanga_nakshatra}.` : '';

  return `# Reflection Questions for ${personName}\n\nThese questions are generated from the locked facts and reading outputs. They are prompts for self-observation, not prescriptions.\n\n${[authority, dasha, nakshatra].filter(Boolean).join(' ')}\n\n## Decision\n\n1. What decision currently asks for more time before action?\n2. What changes when you wait for the emotional signal to stabilize?\n3. Which choice feels clear in the body after a full day of distance?\n\n## Relationship\n\n4. Where are you seeking completion through another person instead of noticing your own pattern?\n5. Which collaborations genuinely bridge your split, and which ones only distract from it?\n6. What kind of support helps you become more honest rather than more dependent?\n\n## Body\n\n7. Where does urgency show up first: throat, chest, gut, jaw, breath, or posture?\n8. What physical cue tells you a yes is becoming clear?\n9. What physical cue tells you a no is being overridden?\n\n## Timing\n\n10. What cycle is asking to complete before the next commitment begins?\n11. What is the difference between pressure from timing and clarity from timing?\n12. What would become easier if you treated this period as observation rather than verdict?\n\n## Practice\n\n13. What is one small experiment you can run this week without over-identifying with the result?\n14. What lesson from a recent mistake is now mature enough to share?\n15. What daily ritual would help you remember the reading without becoming dependent on it?\n`;
}

function qualityChecks(reading: string, facts: Record<string, unknown>): QualityCheck[] {
  const checks: QualityCheck[] = [];
  checks.push({
    name: 'reading_length',
    status: reading.length >= 5000 ? 'pass' : 'warn',
    detail: `${reading.length} characters`,
  });
  checks.push({
    name: 'has_section_synthesis',
    status: reading.includes('section-synthesis') ? 'pass' : 'warn',
    detail: reading.includes('section-synthesis') ? 'Synthesis section present' : 'No synthesis section marker found',
  });
  checks.push({
    name: 'structured_facts',
    status: Object.keys(facts).length >= 6 ? 'pass' : 'warn',
    detail: `${Object.keys(facts).length} extracted facts`,
  });
  checks.push({
    name: 'reasoning_leak_markers',
    status: /\b(We need to|Let's craft|The user wants|I need to)\b/i.test(reading) ? 'warn' : 'pass',
    detail: /\b(We need to|Let's craft|The user wants|I need to)\b/i.test(reading)
      ? 'Possible model planning text detected'
      : 'No obvious planning-text markers found',
  });
  return checks;
}

function notebooklmJson(args: string[]): any {
  const stdout = execFileSync('notebooklm', [...args, '--json'], {
    encoding: 'utf-8',
    timeout: 120_000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(stdout);
}

function pickId(payload: any): string | undefined {
  return payload?.id || payload?.notebook_id || payload?.notebookId || payload?.source_id || payload?.sourceId || payload?.artifact_id || payload?.artifactId;
}

function runNotebookLM(personName: string, packDir: string, sourcePackDir: string, manifest: Manifest): Manifest['notebooklm'] {
  const notebookTitle = `Witness Premium Pack - ${personName}`;
  const notebook = notebooklmJson(['create', notebookTitle]);
  const notebookId = pickId(notebook);
  if (!notebookId) throw new Error(`NotebookLM create did not return an id: ${JSON.stringify(notebook).slice(0, 300)}`);

  const sourceIds: Record<string, string> = {};
  for (const file of readdirSync(sourcePackDir).filter(name => name.endsWith('.md')).sort()) {
    const source = notebooklmJson(['source', 'add', join(sourcePackDir, file), '--notebook', notebookId, '--title', file.replace(/\.md$/, '')]);
    const sourceId = pickId(source);
    if (sourceId) {
      sourceIds[file] = sourceId;
      execFileSync('notebooklm', ['source', 'wait', sourceId, '--notebook', notebookId, '--timeout', '240'], { stdio: 'inherit', timeout: 300_000 });
    }
  }

  const artifacts: Record<string, NotebookLMArtifactStatus> = {};
  const audioDir = join(packDir, 'audio');
  const reportDir = join(packDir, 'reports');
  const quizDir = join(packDir, 'quiz');
  const flashcardsDir = join(packDir, 'flashcards');
  const mindMapDir = join(packDir, 'mind-map');
  for (const dir of [audioDir, reportDir, quizDir, flashcardsDir, mindMapDir]) mkdirSync(dir, { recursive: true });

  const generate = (key: string, args: string[], downloadArgs: string[], outputPath: string, opts?: { wait?: boolean; retry?: boolean }) => {
    try {
      const artifactArgs = [...args, '--notebook', notebookId];
      if (opts?.wait !== false) artifactArgs.push('--wait');
      if (opts?.retry !== false) artifactArgs.push('--retry', '5');
      const artifact = notebooklmJson(artifactArgs);
      const artifactId = pickId(artifact);
      execFileSync('notebooklm', downloadArgs, { stdio: 'pipe', timeout: 180_000 });
      artifacts[key] = { status: existsSync(outputPath) ? 'ready' : 'pending', artifactId, outputPath };
    } catch (err: any) {
      artifacts[key] = { status: 'failed', error: err.message };
    }
  };

  generate(
    'audio_deep_dive_long',
    ['generate', 'audio', '--format', 'deep-dive', '--length', 'long', `Create a warm, premium long-form audio companion for ${personName}. Emphasize grounded reflection, timing, body awareness, and practical integration.`],
    ['download', 'audio', join(audioDir, 'deep-dive-long.mp3'), '--notebook', notebookId, '--latest', '--force'],
    join(audioDir, 'deep-dive-long.mp3'),
  );

  generate(
    'study_guide',
    ['generate', 'report', '--format', 'study-guide', `Create a premium personal study guide for ${personName}. Include key themes, definitions, reflective prompts, and practices. Do not invent facts beyond the sources.`],
    ['download', 'report', join(reportDir, 'study-guide.md'), '--notebook', notebookId, '--latest', '--force'],
    join(reportDir, 'study-guide.md'),
  );

  generate(
    'briefing_doc',
    ['generate', 'report', '--format', 'briefing-doc', `Create a concise one-page briefing for ${personName}'s premium witness pack. Ground every claim in source material.`],
    ['download', 'report', join(reportDir, 'briefing.md'), '--notebook', notebookId, '--latest', '--force'],
    join(reportDir, 'briefing.md'),
  );

  generate(
    'quiz',
    ['generate', 'quiz', '--difficulty', 'medium', `Create a reflective self-knowledge quiz for ${personName} based only on the source pack.`],
    ['download', 'quiz', '--all', quizDir, '--notebook', notebookId, '--force'],
    quizDir,
  );

  generate(
    'flashcards',
    ['generate', 'flashcards', `Create flashcards for ${personName}'s key systems, facts, themes, and practices.`],
    ['download', 'flashcards', '--all', flashcardsDir, '--notebook', notebookId, '--force'],
    flashcardsDir,
  );

  generate(
    'mind_map',
    ['generate', 'mind-map'],
    ['download', 'mind-map', '--all', mindMapDir, '--notebook', notebookId, '--force'],
    mindMapDir,
    { wait: false, retry: false },
  );

  return {
    enabled: true,
    notebookId,
    sources: sourceIds,
    artifacts,
  };
}

function writeSourcePack(personName: string, personId: string, packDir: string, reading: string, facts: Record<string, unknown>, engineData: Record<string, any>) {
  const sourcePackDir = join(packDir, 'source-pack');
  mkdirSync(sourcePackDir, { recursive: true });

  writeFileSync(join(sourcePackDir, '00-profile-brief.md'), `# Profile Brief: ${personName}\n\nPerson ID: ${personId}\n\nThis source pack supports premium personal assets: a deterministic reading PDF, long-form audio companion, study guide, and reflection questions. Treat the locked facts as source authority.\n`);
  writeFileSync(join(sourcePackDir, '01-fact-locked-reading.md'), reading);
  writeFileSync(join(sourcePackDir, '02-locked-facts.md'), `# Locked Facts\n\n${Object.entries(facts).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n`);
  writeFileSync(join(sourcePackDir, '03-engine-data-summary.md'), `# Engine Data Summary\n\n${summarizeEngines(engineData)}\n`);
  writeFileSync(join(sourcePackDir, '04-asset-directions.md'), `# Asset Directions\n\nGenerate premium, grounded, second-person companion assets. The tone should be clear, warm, mature, and non-prescriptive. Prioritize self-inquiry over advice.\n\nRequired outputs: long audio overview, study guide, briefing doc, quiz, flashcards, and mind map.\n`);
  writeFileSync(join(sourcePackDir, '05-do-not-infer.md'), `# Boundaries\n\n- Do not invent missing engine data.\n- Do not make medical, financial, or deterministic life predictions.\n- Treat all content as reflective witnessing, not diagnosis or instruction.\n- If a system lacks data, name the absence rather than filling the gap.\n- Preserve the Euclidean-runtime vs non-Euclidean-Noesis distinction: outputs are mirrors for inquiry, not commands.\n`);

  return sourcePackDir;
}

function processPerson(personId: string, args: CliArgs): Manifest {
  const personName = slugToName(personId);
  const inputPath = resolve(args.inputDir, `${personId}.json`);
  const readingPath = resolve(args.readingDir, `${personId}.md`);
  if (!existsSync(inputPath)) throw new Error(`Missing Selemene input: ${inputPath}`);
  if (!existsSync(readingPath)) throw new Error(`Missing reading output: ${readingPath}`);

  const packDir = resolve(args.outputDir, personId);
  const localDir = join(packDir, 'local');
  mkdirSync(localDir, { recursive: true });

  const engineData = loadEngineData(inputPath);
  const facts = extractFacts(engineData);
  const reading = readFileSync(readingPath, 'utf-8');
  const sourcePackDir = writeSourcePack(personName, personId, packDir, reading, facts, engineData);
  const reflectionMd = reflectionQuestions(personName, facts);
  const reflectionPath = join(localDir, 'reflection-questions.md');
  writeFileSync(reflectionPath, reflectionMd);

  const htmlPath = join(localDir, 'reading.html');
  const pdfPath = join(localDir, 'reading.pdf');
  writeFileSync(htmlPath, renderPremiumHtml(personName, reading, reflectionMd, facts));
  const pdfStatus = args.noPdf ? 'skipped' : exportPdf(htmlPath, pdfPath);

  const manifest: Manifest = {
    personId,
    personName,
    generatedAt: new Date().toISOString(),
    inputs: {
      selemeneJson: inputPath,
      readingMarkdown: readingPath,
    },
    outputs: {
      sourcePackDir,
      readingHtml: htmlPath,
      readingPdf: pdfStatus === 'ready' ? pdfPath : undefined,
      reflectionQuestions: reflectionPath,
    },
    quality: qualityChecks(reading, facts),
    notebooklm: {
      enabled: false,
      sources: {},
      artifacts: {},
    },
  };

  if (args.notebooklm) {
    manifest.notebooklm = runNotebookLM(personName, packDir, sourcePackDir, manifest);
  }

  writeFileSync(join(packDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function main() {
  const args = parseArgs();
  if (!args.all && !args.person) {
    console.error('Usage: premium-asset-factory.ts --person <id> | --all [--notebooklm]');
    process.exit(1);
  }

  if (!existsSync(args.inputDir)) throw new Error(`Input dir not found: ${args.inputDir}`);
  if (!existsSync(args.readingDir)) throw new Error(`Reading dir not found: ${args.readingDir}`);
  mkdirSync(args.outputDir, { recursive: true });

  const people = args.all ? personIds(args.inputDir) : [args.person!];
  console.log('═══ premium-asset-factory ═══');
  console.log(`People: ${people.length}`);
  console.log(`Output: ${resolve(args.outputDir)}`);
  console.log(`NotebookLM: ${args.notebooklm ? 'enabled' : 'disabled'}`);

  const manifests: Manifest[] = [];
  for (const person of people) {
    console.log(`\n▸ ${person}`);
    try {
      const manifest = processPerson(person, args);
      manifests.push(manifest);
      const fails = manifest.quality.filter(check => check.status === 'fail').length;
      const warns = manifest.quality.filter(check => check.status === 'warn').length;
      console.log(`  ✓ local pack ready (${warns} warnings, ${fails} failures)`);
      if (manifest.outputs.readingPdf) console.log(`  ✓ PDF ${basename(manifest.outputs.readingPdf)}`);
      if (manifest.notebooklm.enabled) console.log(`  ✓ Notebook ${manifest.notebooklm.notebookId}`);
    } catch (err: any) {
      console.error(`  ✗ ${err.message}`);
    }
  }

  writeFileSync(join(args.outputDir, 'index.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: manifests.length,
    packs: manifests.map(m => ({ personId: m.personId, personName: m.personName, manifest: join(resolve(args.outputDir), m.personId, 'manifest.json') })),
  }, null, 2));
  console.log('\n═══ COMPLETE ═══');
}

main();
