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
 *   - video/video-brief.mp4
 *   - slide-decks/detailed.pdf
 *   - slide-decks/preview.pdf
 *   - slide-decks/vimshottari-timeline.pdf
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
  downloadOnly: boolean;
  sourcesOnly: boolean;
  generateOnly: boolean;
  notebookId?: string;
  noPdf: boolean;
  force: boolean;
}

interface QualityCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

interface GateFinding {
  code: string;
  severity: 'blocker' | 'warning';
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
    provenance: string;
  };
  quality: QualityCheck[];
  gate: {
    status: 'pass' | 'blocked';
    findings: GateFinding[];
  };
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
    downloadOnly: opts.downloadOnly === true || opts['download-only'] === true,
    sourcesOnly: opts.sourcesOnly === true || opts['sources-only'] === true,
    generateOnly: opts.generateOnly === true || opts['generate-only'] === true,
    notebookId: typeof opts.notebookId === 'string'
      ? opts.notebookId
      : (typeof opts['notebook-id'] === 'string' ? opts['notebook-id'] : undefined),
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

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
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

    if (engineId === 'biofield') {
      facts.biofield_available = true;
      facts.biofield_dominant_element = result.dominant_element || result.element || result.primary_element;
      facts.biofield_coherence = result.coherence || result.overall_coherence || result.biofield_coherence || result.metrics?.coherence;
      facts.biofield_vitality_index = result.metrics?.vitality_index;
      facts.biofield_interpretation = result.interpretation;
    }

    if (engineId === 'face-reading') {
      facts.face_reading_available = true;
      const constitution = result.analysis?.constitution || result.constitution || {};
      const balance = result.analysis?.elemental_balance || result.elemental_balance || {};
      facts.face_reading_primary_dosha = result.primary_dosha || result.dosha?.primary || constitution.primary_dosha;
      facts.face_reading_secondary_dosha = result.secondary_dosha || result.dosha?.secondary || constitution.secondary_dosha;
      facts.face_reading_dominant_element = balance.dominant || constitution.tcm_element;
    }

    if (engineId === 'numerology') {
      facts.numerology_life_path = result.life_path?.number ?? result.life_path_number;
      facts.numerology_expression = result.expression?.number ?? result.expression_number;
      facts.numerology_soul_urge = result.soul_urge?.number ?? result.soul_urge_number;
    }
  }

  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value !== undefined && value !== null));
}

function hasEngine(engineData: Record<string, any>, engineId: string): boolean {
  return !!engineData[engineId] && !engineData[engineId]._error;
}

function plainFactValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

function gateSourcePack(personId: string, reading: string, sourceText: string, facts: Record<string, unknown>, engineData: Record<string, any>): GateFinding[] {
  const findings: GateFinding[] = [];
  const isSynastry = /synastry|composite|partner/i.test(personId);
  const text = `${reading}\n\n${sourceText}`;

  if (isSynastry && Object.keys(facts).length < 6) {
    findings.push({
      code: 'synastry_missing_deterministic_facts',
      severity: 'blocker',
      detail: `Synastry pass has ${Object.keys(facts).length} extracted deterministic facts. Do not upload generated synastry prose without partner fact anchors.`,
    });
  }

  const expectedNakshatra = plainFactValue(facts.panchanga_nakshatra);
  if (expectedNakshatra) {
    const knownNakshatras = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
    const mentioned = knownNakshatras.filter(name => new RegExp(`\\b${name.replace(/ /g, '\\s+')}\\b`, 'i').test(text));
    const unexpected = mentioned.filter(name => name.toLowerCase() !== expectedNakshatra.toLowerCase());
    if (unexpected.length > 0) {
      findings.push({
        code: 'nakshatra_drift',
        severity: 'blocker',
        detail: `Expected Panchanga Nakshatra ${expectedNakshatra}, but source text also mentions: ${[...new Set(unexpected)].join(', ')}.`,
      });
    }
  }

  const hasSomaticData = hasEngine(engineData, 'biofield') || hasEngine(engineData, 'face-reading') || hasEngine(engineData, 'biofield-capture');
  if (hasSomaticData) {
    const sourceMentionsSomatic = /biofield|face reading|dosha|somatic|coherence|dominant element/i.test(sourceText);
    const deniesSomatic = /no recorded data for .*Somatic|no somatic data|not available for .*Somatic|absence of (a )?somatic map|absence of somatic data/i.test(sourceText);
    if (!sourceMentionsSomatic) {
      findings.push({
        code: 'somatic_data_omitted',
        severity: 'blocker',
        detail: 'Input contains somatic engines, but NotebookLM source pack does not include somatic anchors.',
      });
    }
    if (deniesSomatic) {
      findings.push({
        code: 'somatic_false_absence',
        severity: 'blocker',
        detail: 'Input contains somatic engines, but source text says somatic data is absent or unavailable.',
      });
    }
  }

  return findings;
}

function extractVimshottariTimeline(engineData: Record<string, any>): Array<Record<string, unknown>> {
  const output = engineData['vimshottari'];
  const result = output?.result || output;
  const timeline = result?.timeline?.mahadashas;
  if (Array.isArray(timeline)) {
    return timeline.map((period: any) => ({
      planet: period.planet,
      start: period.start_date || period.start,
      end: period.end_date || period.end,
      duration_years: period.duration_years,
    })).filter(period => period.planet);
  }

  const current = result?.current_period;
  if (!current) return [];
  return ['mahadasha', 'antardasha', 'pratyantardasha']
    .map(level => ({ level, ...(current[level] || {}) }))
    .filter(period => period.planet);
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

function extractSection(reading: string, sectionId: string): string {
  const marker = `## ${sectionId}:${sectionId}`;
  const start = reading.indexOf(marker);
  if (start === -1) return '';
  const next = reading.indexOf('\n---', start);
  return reading.slice(start + marker.length, next === -1 ? undefined : next).trim();
}

function cleanReadingForNotebook(reading: string): string {
  return reading
    .replace(/^# Interpretation:[^\n]*\n\n?/i, '')
    .replace(/^## ([a-z-]+):\1$/gm, '## $1')
    .replace(/\b(We need to|The user wants|I need to|Let's craft)\b[^\n]*(\n|$)/gi, '')
    .trim();
}

function sanitizeSomaticFalseAbsence(text: string, hasSomaticData: boolean): string {
  if (!hasSomaticData) return text;
  return text
    .replace(/the absence of a somatic map/gi, 'the deterministic somatic map')
    .replace(/absence of somatic data/gi, 'available somatic data')
    .replace(/no recorded data for the three Somatic Consciousness Systems[^\n.]*[.]/gi, 'Deterministic somatic data is available and should be used as the body-level anchor.')
    .replace(/Because there are no engine outputs to reference[^\n.]*[.]/gi, 'Because somatic engine outputs are available, use the biofield and face-reading anchors carefully.');
}

function buildNarrativeDossier(personName: string, reading: string, facts: Record<string, unknown>, engineData: Record<string, any>): string {
  const hasSomaticData = hasEngine(engineData, 'biofield') || hasEngine(engineData, 'face-reading') || hasEngine(engineData, 'biofield-capture');
  const safeReading = sanitizeSomaticFalseAbsence(reading, hasSomaticData);
  const western = extractSection(safeReading, 'western-systems');
  const vedic = extractSection(safeReading, 'vedic-systems');
  const somatic = buildSomaticNarrative(facts, engineData, extractSection(reading, 'somatic-systems'));
  const synthesis = extractSection(safeReading, 'section-synthesis');
  const factLines = Object.entries(facts).map(([key, value]) => `- ${humanizeKey(key)}: ${value}`).join('\n');

  return `# Personal Companion Dossier: ${personName}\n\nThis dossier is written for ${personName}. It is a polished companion to their reading, intended to become audio, video, study, and reflection assets they can return to.\n\n## Orientation Anchors\n\n${factLines || '- No structured anchors extracted.'}\n\n## Core Story\n\n${synthesis || cleanReadingForNotebook(safeReading)}\n\n## Decision And Identity Thread\n\n${western || 'No decision and identity narrative section is available.'}\n\n## Timing And Life-Rhythm Thread\n\n${vedic || 'No timing and life-rhythm narrative section is available.'}\n\n## Body And Integration Thread\n\n${somatic || 'No body and integration narrative section is available.'}\n\n## How This Should Feel\n\nThis should feel intimate, clear, and embodied. Do not recite system data. Turn the reading into a usable personal artifact: something ${personName} can listen to, revisit, study, and practice with.\n`;
}

function buildSomaticNarrative(facts: Record<string, unknown>, engineData: Record<string, any>, generatedSomatic: string): string {
  const hasSomaticData = hasEngine(engineData, 'biofield') || hasEngine(engineData, 'face-reading') || hasEngine(engineData, 'biofield-capture');
  if (!hasSomaticData) return generatedSomatic || 'No body and integration narrative section is available.';

  const anchors = [
    facts.biofield_interpretation ? `Biofield interpretation: ${facts.biofield_interpretation}` : '',
    facts.biofield_coherence ? `Biofield coherence: ${facts.biofield_coherence}` : '',
    facts.biofield_vitality_index ? `Biofield vitality index: ${facts.biofield_vitality_index}` : '',
    facts.face_reading_primary_dosha ? `Primary dosha: ${facts.face_reading_primary_dosha}` : '',
    facts.face_reading_secondary_dosha ? `Secondary dosha: ${facts.face_reading_secondary_dosha}` : '',
    facts.face_reading_dominant_element ? `Face-reading dominant element: ${facts.face_reading_dominant_element}` : '',
  ].filter(Boolean).map(line => `- ${line}`).join('\n');

  return `Deterministic somatic data is available and should be used as the body-level anchor. Do not say somatic data is absent.\n\n${anchors}\n\nUse this as a reflective body-awareness layer, not diagnosis or medical instruction.`;
}

function buildSomaticAnchor(facts: Record<string, unknown>, engineData: Record<string, any>): string {
  const hasBiofield = hasEngine(engineData, 'biofield');
  const hasFace = hasEngine(engineData, 'face-reading');
  const lines = [
    `Biofield data available: ${hasBiofield ? 'yes' : 'no'}`,
    `Face-reading data available: ${hasFace ? 'yes' : 'no'}`,
    facts.biofield_dominant_element ? `Biofield dominant element: ${facts.biofield_dominant_element}` : '',
    facts.biofield_coherence ? `Biofield coherence: ${facts.biofield_coherence}` : '',
    facts.face_reading_primary_dosha ? `Primary dosha: ${facts.face_reading_primary_dosha}` : '',
    facts.face_reading_secondary_dosha ? `Secondary dosha: ${facts.face_reading_secondary_dosha}` : '',
  ].filter(Boolean).map(line => `- ${line}`).join('\n');

  return `# Somatic Anchor\n\nThis source prevents false statements about missing body-level data. Use these anchors only where they are present.\n\n${lines}\n\nIf data is available, do not say it is absent. If a specific somatic field is not listed, do not invent it.\n`;
}

function buildAudioBrief(personName: string, facts: Record<string, unknown>): string {
  return `# Audio Experience Brief: ${personName}\n\nCreate a long-form audio companion, not a mechanical report. The experience should feel like two thoughtful hosts guiding ${personName} through their own premium personal reading.\n\n## Tone\n\nWarm, grounded, reflective, and specific. Avoid theatrical mysticism. Avoid diagnosis. Make the audio feel lived-in: explain what the patterns may feel like in decisions, relationships, body signals, timing, and practice.\n\n## Structure\n\n1. Opening orientation: how to listen to this reading.\n2. Core pattern: the most important repeating theme.\n3. Timing and decision rhythm.\n4. Relationship and collaboration field.\n5. Body-level integration.\n6. Practical reflection prompts.\n7. Closing integration: one small practice for the next week.\n\n## Must Anchor\n\n${Object.entries(facts).map(([key, value]) => `- ${humanizeKey(key)}: ${value}`).join('\n')}\n\n## Avoid\n\nDo not list every system. Do not sound like a database. Do not invent missing systems. Do not make deterministic predictions.\n`;
}

function buildStudyGuideBrief(personName: string): string {
  return `# Personal Study Guide Brief: ${personName}\n\nCreate a study guide that turns the reading into a practical companion. It should help ${personName} revisit the material over 7-14 days.\n\n## Required Sections\n\n1. The central pattern in plain language.\n2. Key terms explained simply, only where useful.\n3. A personal themes map.\n4. Integration practices.\n5. Reflection questions.\n6. A short weekly review template.\n7. What not to over-interpret.\n\nThe guide should be clear enough for someone new to these systems, but deep enough to feel personal.\n`;
}

function buildVideoBrief(personName: string): string {
  return `# Personal Video Brief: ${personName}\n\nCreate a short premium video overview that introduces the reading as a reflective personal artifact.\n\n## Visual Direction\n\nElegant, editorial, calm. Think parchment, soft gold, night-sky blue, subtle orbit lines, clean typography, and gentle motion. Avoid generic astrology clip art.\n\n## Narrative Shape\n\n1. Open with the central emotional or timing pattern.\n2. Show three anchor themes.\n3. Translate the pattern into everyday life.\n4. End with one reflective question.\n\nThe video should feel like an invitation to return to the PDF and audio, not like a sales reel.\n`;
}

function buildSlideDeckBrief(personName: string, kind: 'detailed' | 'preview'): string {
  const isDetailed = kind === 'detailed';
  return `# ${isDetailed ? 'Detailed' : 'Short Preview'} Slide Deck Brief: ${personName}\n\nCreate a ${isDetailed ? 'detailed premium personal slide deck' : 'short preview slide deck'} for ${personName}. This deck is for the recipient, not for system developers. It should feel like a polished, visually coherent product.\n\n## Visual Theme\n\nUse a consistent visual language: warm parchment, soft gold accents, deep indigo/night-sky fields, subtle orbit lines, refined serif headings, clean sans-serif captions, and calm spacing. Avoid raw engine tables, generic astrology clip art, neon overload, or technical diagrams that feel internal.\n\n## Deck Shape\n\n${isDetailed ? `1. Cover: ${personName}'s Premium Witness Reading.\n2. Core Pattern: the central emotional/timing signature.\n3. Decision Rhythm: how clarity forms.\n4. Timing Field: the current life-rhythm and dasha context.\n5. Relationship/Collaboration: how connection bridges the pattern.\n6. Body Integration: how the pattern may be felt and practiced.\n7. Tensions: the central paradoxes to observe.\n8. Practices: 3-5 grounded practices.\n9. Reflection Questions: a closing page for self-inquiry.\n10. Closing: one sentence the recipient can carry.` : `1. Cover.\n2. Three Key Themes.\n3. One Timing Insight.\n4. One Practice.\n5. Closing Reflection Question.`}\n\n## Output Standard\n\nMake the deck visually deliverable. It should be suitable to export as a PDF and share directly with ${personName}.\n`;
}

function buildVimshottariTimelineBrief(personName: string, timeline: Array<Record<string, unknown>>, facts: Record<string, unknown>): string {
  const current = [
    facts.vimshottari_mahadasha ? `Mahadasha: ${facts.vimshottari_mahadasha}` : '',
    facts.vimshottari_antardasha ? `Antardasha: ${facts.vimshottari_antardasha}` : '',
    facts.vimshottari_pratyantardasha ? `Pratyantardasha: ${facts.vimshottari_pratyantardasha}` : '',
  ].filter(Boolean).join(' · ');
  const rows = timeline.length
    ? timeline.map(period => `- ${period.level ? `${period.level}: ` : ''}${period.planet}: ${period.start || 'unknown start'} → ${period.end || 'unknown end'}${period.duration_years ? ` (${period.duration_years} years)` : ''}`).join('\n')
    : '- No full Vimshottari timeline was available; use only current period anchors.';

  return `# Vimshottari Timeline Slide Brief: ${personName}\n\nCreate a timeline-focused slide deck PDF for ${personName}. This should translate the Vimshottari timing field into a clear visual journey. It is for the recipient, not for engineers.\n\n## Current Period Anchor\n\n${current || 'Current period details are limited.'}\n\n## Timeline Data\n\n${rows}\n\n## Visual Theme\n\nUse a horizontal or vertical gold-thread timeline on a deep indigo/parchment background. Each planetary period should feel like a chapter, not a raw table. Use subtle icons, calm labels, and enough whitespace for the recipient to understand the life-rhythm at a glance.\n\n## Deck Shape\n\n1. Cover: ${personName}'s Vimshottari Timing Map.\n2. How to read the timeline.\n3. Current period in focus.\n4. Major timeline chapters.\n5. What this timing asks the recipient to observe.\n6. Reflection questions for the current period.\n\n## Boundaries\n\nDo not make deterministic predictions. Present timing as a reflective rhythm for inquiry.\n`;
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

function notebooklmJson(args: string[], timeoutMs = 120_000): any {
  const stdout = execFileSync('notebooklm', [...args, '--json'], {
    encoding: 'utf-8',
    timeout: timeoutMs,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(stdout);
}

function pickId(payload: any): string | undefined {
  return payload?.id
    || payload?.notebook_id
    || payload?.notebookId
    || payload?.source_id
    || payload?.sourceId
    || payload?.artifact_id
    || payload?.artifactId
    || payload?.notebook?.id
    || payload?.source?.id
    || payload?.artifact?.id;
}

function listArtifacts(notebookId: string): Array<{ id: string; type: string; status: string; title: string; createdAt: string }> {
  try {
    const payload = notebooklmJson(['artifact', 'list', '--notebook', notebookId], 120_000);
    const rows = payload?.artifacts || payload?.items || [];
    return rows.map((row: any) => ({
      id: row.id || row.artifact_id,
      type: String(row.type_id || row.type || row.kind || row.artifact_type || '').toLowerCase().replace(/-/g, '_'),
      status: String(row.status || ''),
      title: String(row.title || row.name || ''),
      createdAt: String(row.created_at || ''),
    })).filter((row: any) => row.id);
  } catch {
    return [];
  }
}

function artifactByType(notebookId: string, typeNeedle: string, titleNeedle?: string): string | undefined {
  return listArtifacts(notebookId)
    .filter(row => row.type.includes(typeNeedle.replace(/-/g, '_')) && row.status === 'completed')
    .filter(row => !titleNeedle || row.title.toLowerCase().includes(titleNeedle.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.id;
}

function downloadNotebookLMArtifacts(notebookId: string, packDir: string): Record<string, NotebookLMArtifactStatus> {
  const artifacts: Record<string, NotebookLMArtifactStatus> = {};
  const audioDir = join(packDir, 'audio');
  const videoDir = join(packDir, 'video');
  const reportDir = join(packDir, 'reports');
  const slideDeckDir = join(packDir, 'slide-decks');
  const quizDir = join(packDir, 'quiz');
  const flashcardsDir = join(packDir, 'flashcards');
  const mindMapDir = join(packDir, 'mind-map');
  for (const dir of [audioDir, videoDir, reportDir, slideDeckDir, quizDir, flashcardsDir, mindMapDir]) mkdirSync(dir, { recursive: true });

  const download = (key: string, type: string, args: (id: string) => string[], outputPath: string, titleNeedle?: string) => {
    const artifactId = artifactByType(notebookId, type, titleNeedle);
    if (!artifactId) {
      artifacts[key] = { status: 'pending', error: `No completed ${type}${titleNeedle ? ` (${titleNeedle})` : ''} artifact found` };
      return;
    }
    try {
      execFileSync('notebooklm', args(artifactId), { stdio: 'pipe', timeout: 240_000 });
      artifacts[key] = { status: existsSync(outputPath) ? 'ready' : 'pending', artifactId, outputPath };
    } catch (err: any) {
      artifacts[key] = { status: 'failed', artifactId, error: err.message };
    }
  };

  download('audio_deep_dive_long', 'audio', id => ['download', 'audio', join(audioDir, 'deep-dive-long.mp3'), '--notebook', notebookId, '--artifact', id, '--force'], join(audioDir, 'deep-dive-long.mp3'));
  download('video_brief', 'video', id => ['download', 'video', join(videoDir, 'video-brief.mp4'), '--notebook', notebookId, '--artifact', id, '--force'], join(videoDir, 'video-brief.mp4'));
  download('study_guide', 'report', id => ['download', 'report', join(reportDir, 'study-guide.md'), '--notebook', notebookId, '--artifact', id, '--force'], join(reportDir, 'study-guide.md'), 'study');
  download('briefing_doc', 'report', id => ['download', 'report', join(reportDir, 'briefing.md'), '--notebook', notebookId, '--artifact', id, '--force'], join(reportDir, 'briefing.md'), 'brief');
  download('slide_deck_detailed', 'slide_deck', id => ['download', 'slide-deck', join(slideDeckDir, 'detailed.pdf'), '--notebook', notebookId, '--artifact', id, '--force'], join(slideDeckDir, 'detailed.pdf'), 'detailed');
  download('slide_deck_preview', 'slide_deck', id => ['download', 'slide-deck', join(slideDeckDir, 'preview.pdf'), '--notebook', notebookId, '--artifact', id, '--force'], join(slideDeckDir, 'preview.pdf'), 'preview');
  download('slide_deck_vimshottari_timeline', 'slide_deck', id => ['download', 'slide-deck', join(slideDeckDir, 'vimshottari-timeline.pdf'), '--notebook', notebookId, '--artifact', id, '--force'], join(slideDeckDir, 'vimshottari-timeline.pdf'), 'vimshottari');
  download('quiz', 'quiz', id => ['download', 'quiz', '--format', 'markdown', join(quizDir, 'quiz.md'), '--notebook', notebookId, '--artifact', id], join(quizDir, 'quiz.md'));
  download('flashcards', 'flashcards', id => ['download', 'flashcards', '--format', 'markdown', join(flashcardsDir, 'flashcards.md'), '--notebook', notebookId, '--artifact', id], join(flashcardsDir, 'flashcards.md'));
  download('mind_map', 'mind_map', id => ['download', 'mind-map', '--all', mindMapDir, '--notebook', notebookId, '--force'], mindMapDir);

  return artifacts;
}

function runNotebookLM(personName: string, packDir: string, sourcePackDir: string, manifest: Manifest, args: CliArgs): Manifest['notebooklm'] {
  if (args.downloadOnly) {
    if (!args.notebookId) throw new Error('--download-only requires --notebook-id');
    return {
      enabled: true,
      notebookId: args.notebookId,
      sources: {},
      artifacts: downloadNotebookLMArtifacts(args.notebookId, packDir),
    };
  }

  if (args.generateOnly && !args.notebookId) {
    throw new Error('--generate-only requires --notebook-id');
  }

  const notebookTitle = `Witness Premium Pack - ${personName}`;
  const notebookPayload = args.notebookId ? undefined : notebooklmJson(['create', notebookTitle]);
  const notebookId = args.notebookId || pickId(notebookPayload);
  if (!notebookId) throw new Error(`NotebookLM create did not return an id: ${JSON.stringify(notebookPayload).slice(0, 300)}`);

  const sourceIds: Record<string, string> = {};
  if (!args.generateOnly) {
    for (const file of readdirSync(sourcePackDir).filter(name => name.endsWith('.md')).sort()) {
      const source = notebooklmJson(['source', 'add', join(sourcePackDir, file), '--notebook', notebookId, '--title', file.replace(/\.md$/, '')]);
      const sourceId = pickId(source);
      if (sourceId) {
        sourceIds[file] = sourceId;
        execFileSync('notebooklm', ['source', 'wait', sourceId, '--notebook', notebookId, '--timeout', '240'], { stdio: 'inherit', timeout: 300_000 });
      }
    }
  }

  if (args.sourcesOnly) {
    return {
      enabled: true,
      notebookId,
      sources: sourceIds,
      artifacts: {},
    };
  }

  const audioDir = join(packDir, 'audio');
  const videoDir = join(packDir, 'video');
  const reportDir = join(packDir, 'reports');
  const slideDeckDir = join(packDir, 'slide-decks');
  const quizDir = join(packDir, 'quiz');
  const flashcardsDir = join(packDir, 'flashcards');
  const mindMapDir = join(packDir, 'mind-map');
  for (const dir of [audioDir, videoDir, reportDir, slideDeckDir, quizDir, flashcardsDir, mindMapDir]) mkdirSync(dir, { recursive: true });
  const artifacts: Record<string, NotebookLMArtifactStatus> = {};

  const generate = (key: string, args: string[], downloadArgs: (artifactId?: string) => string[], outputPath: string, opts?: { wait?: boolean; retry?: boolean; timeoutMs?: number; artifactType?: string }) => {
    try {
      const artifactArgs = [...args, '--notebook', notebookId];
      if (opts?.wait !== false) artifactArgs.push('--wait');
      if (opts?.retry !== false) artifactArgs.push('--retry', '5');
      const artifact = notebooklmJson(artifactArgs, opts?.timeoutMs ?? 600_000);
      const artifactId = pickId(artifact) || (opts?.artifactType ? artifactByType(notebookId, opts.artifactType) : undefined);
      execFileSync('notebooklm', downloadArgs(artifactId), { stdio: 'pipe', timeout: 240_000 });
      artifacts[key] = { status: existsSync(outputPath) ? 'ready' : 'pending', artifactId, outputPath };
    } catch (err: any) {
      artifacts[key] = { status: 'failed', error: err.message };
    }
  };

  generate(
    'audio_deep_dive_long',
    ['generate', 'audio', '--format', 'deep-dive', '--length', 'long', `Create the premium long-form audio companion for ${personName}. Use the Audio Production Brief and Premium Narrative Dossier as the primary sources. Make it vivid, human, and deliverable; do not recite engine fields.`],
    (artifactId) => ['download', 'audio', join(audioDir, 'deep-dive-long.mp3'), '--notebook', notebookId, artifactId ? '--artifact' : '--latest', artifactId || '', '--force'].filter(Boolean),
    join(audioDir, 'deep-dive-long.mp3'),
    { timeoutMs: 900_000, artifactType: 'audio' },
  );

  generate(
    'video_brief',
    ['generate', 'video', '--format', 'brief', '--style', 'heritage', `Create a premium short video brief for ${personName}. Use the Video Brief and Narrative Dossier. The output should feel like a vivid personal companion, not a technical engine summary.`],
    (artifactId) => ['download', 'video', join(videoDir, 'video-brief.mp4'), '--notebook', notebookId, artifactId ? '--artifact' : '--latest', artifactId || '', '--force'].filter(Boolean),
    join(videoDir, 'video-brief.mp4'),
    { timeoutMs: 900_000, artifactType: 'video' },
  );

  generate(
    'study_guide',
    ['generate', 'report', '--format', 'study-guide', `Create a premium personal study guide for ${personName}. Use the Study Guide Brief and Narrative Dossier. Make it usable over 7-14 days; do not produce a raw system-by-system dump.`],
    (artifactId) => ['download', 'report', join(reportDir, 'study-guide.md'), '--notebook', notebookId, artifactId ? '--artifact' : '--latest', artifactId || '', '--force'].filter(Boolean),
    join(reportDir, 'study-guide.md'),
    { artifactType: 'report' },
  );

  generate(
    'briefing_doc',
    ['generate', 'report', '--format', 'briefing-doc', `Create a concise premium one-page briefing for ${personName}. Make it clear, vivid, and deliverable. Ground every claim in the source pack.`],
    (artifactId) => ['download', 'report', join(reportDir, 'briefing.md'), '--notebook', notebookId, artifactId ? '--artifact' : '--latest', artifactId || '', '--force'].filter(Boolean),
    join(reportDir, 'briefing.md'),
    { artifactType: 'report' },
  );

  generate(
    'slide_deck_detailed',
    ['generate', 'slide-deck', '--format', 'detailed', `Create the detailed premium personal slide deck for ${personName}. Use the detailed deck brief and keep a consistent parchment, soft-gold, night-indigo visual theme. This should be a recipient-ready PDF, not raw system output.`],
    (artifactId) => ['download', 'slide-deck', join(slideDeckDir, 'detailed.pdf'), '--notebook', notebookId, artifactId ? '--artifact' : '--latest', artifactId || '', '--force'].filter(Boolean),
    join(slideDeckDir, 'detailed.pdf'),
    { timeoutMs: 900_000, artifactType: 'slide_deck' },
  );

  generate(
    'slide_deck_preview',
    ['generate', 'slide-deck', '--format', 'presenter', '--length', 'short', `Create the short preview slide deck for ${personName}. Use the preview deck brief. Keep the same visual language as the detailed deck: parchment, soft gold, night indigo, refined typography, calm spacing.`],
    (artifactId) => ['download', 'slide-deck', join(slideDeckDir, 'preview.pdf'), '--notebook', notebookId, artifactId ? '--artifact' : '--latest', artifactId || '', '--force'].filter(Boolean),
    join(slideDeckDir, 'preview.pdf'),
    { timeoutMs: 900_000, artifactType: 'slide_deck' },
  );

  generate(
    'slide_deck_vimshottari_timeline',
    ['generate', 'slide-deck', '--format', 'detailed', `Create the Vimshottari timeline slide deck for ${personName}. Use the Vimshottari Timeline Slide Brief as primary source. Make the timeline visual, chaptered, and recipient-facing; do not make deterministic predictions.`],
    (artifactId) => ['download', 'slide-deck', join(slideDeckDir, 'vimshottari-timeline.pdf'), '--notebook', notebookId, artifactId ? '--artifact' : '--latest', artifactId || '', '--force'].filter(Boolean),
    join(slideDeckDir, 'vimshottari-timeline.pdf'),
    { timeoutMs: 900_000, artifactType: 'slide_deck' },
  );

  generate(
    'quiz',
    ['generate', 'quiz', '--difficulty', 'medium', '--quantity', 'standard', `Create a reflective self-knowledge quiz for ${personName}. It should help them internalize the reading, not memorize engine labels.`],
    (artifactId) => ['download', 'quiz', '--format', 'markdown', join(quizDir, 'quiz.md'), '--notebook', notebookId, ...(artifactId ? ['--artifact', artifactId] : [])],
    join(quizDir, 'quiz.md'),
    { artifactType: 'quiz' },
  );

  generate(
    'flashcards',
    ['generate', 'flashcards', '--difficulty', 'medium', '--quantity', 'standard', `Create flashcards for ${personName}'s themes, practices, and key terms. Favor usable meaning over raw facts.`],
    (artifactId) => ['download', 'flashcards', '--format', 'markdown', join(flashcardsDir, 'flashcards.md'), '--notebook', notebookId, ...(artifactId ? ['--artifact', artifactId] : [])],
    join(flashcardsDir, 'flashcards.md'),
    { artifactType: 'flashcards' },
  );

  generate(
    'mind_map',
    ['generate', 'mind-map'],
    (artifactId) => ['download', 'mind-map', '--all', mindMapDir, '--notebook', notebookId, '--force'],
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

  writeFileSync(join(sourcePackDir, '00-personal-companion-dossier.md'), buildNarrativeDossier(personName, reading, facts, engineData));
  writeFileSync(join(sourcePackDir, '01-audio-experience-brief.md'), buildAudioBrief(personName, facts));
  writeFileSync(join(sourcePackDir, '02-personal-study-guide-brief.md'), buildStudyGuideBrief(personName));
  writeFileSync(join(sourcePackDir, '03-personal-video-brief.md'), buildVideoBrief(personName));
  writeFileSync(join(sourcePackDir, '04-slide-deck-detailed-brief.md'), buildSlideDeckBrief(personName, 'detailed'));
  writeFileSync(join(sourcePackDir, '05-slide-deck-preview-brief.md'), buildSlideDeckBrief(personName, 'preview'));
  writeFileSync(join(sourcePackDir, '06-vimshottari-timeline-brief.md'), buildVimshottariTimelineBrief(personName, extractVimshottariTimeline(engineData), facts));
  writeFileSync(join(sourcePackDir, '07-orientation-anchors.md'), `# Orientation Anchors\n\nThese are anchors for accuracy, not the product. Use them to prevent drift while producing vivid personal assets.\n\n${Object.entries(facts).map(([key, value]) => `- ${humanizeKey(key)}: ${value}`).join('\n')}\n`);
  writeFileSync(join(sourcePackDir, '08-somatic-anchor.md'), buildSomaticAnchor(facts, engineData));
  writeFileSync(join(sourcePackDir, '09-boundaries-and-style.md'), `# Boundaries and Style\n\n## Make It Deliverable\n\nTurn the reading into a polished product: audio, video, slide decks, study guide, quiz, flashcards, and mind map. The audience should feel they received a personal companion, not a structured engine output.\n\n## Consistent Visual Theme\n\nUse warm parchment, soft gold, night indigo, refined typography, subtle orbit lines, calm spacing, and editorial restraint across PDFs and slide decks.\n\n## Boundaries\n\n- Do not invent missing engine data.\n- Do not make medical, financial, or deterministic life predictions.\n- Treat all content as reflective witnessing, not diagnosis or instruction.\n- If a system lacks data, name the absence rather than filling the gap.\n- Preserve the Euclidean-runtime vs non-Euclidean-Noesis distinction: outputs are mirrors for inquiry, not commands.\n\n## Voice\n\nWarm, exact, human, reflective, premium, embodied. Avoid generic mystical language. Avoid raw JSON/schema phrasing.\n`);

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
  const sourceText = readdirSync(sourcePackDir)
    .filter(file => file.endsWith('.md'))
    .sort()
    .map(file => readFileSync(join(sourcePackDir, file), 'utf-8'))
    .join('\n\n');
  const gateFindings = gateSourcePack(personId, reading, sourceText, facts, engineData);
  const provenancePath = join(localDir, 'provenance.md');
  writeFileSync(provenancePath, `# Local Provenance\n\nThis file is local-only. It is not uploaded to NotebookLM.\n\n## Engine Inventory\n\n${summarizeEngines(engineData)}\n`);
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
      provenance: provenancePath,
    },
    quality: qualityChecks(reading, facts),
    gate: {
      status: gateFindings.some(finding => finding.severity === 'blocker') ? 'blocked' : 'pass',
      findings: gateFindings,
    },
    notebooklm: {
      enabled: false,
      sources: {},
      artifacts: {},
    },
  };

  if (args.notebooklm) {
    if (manifest.gate.status === 'blocked') {
      writeFileSync(join(packDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      throw new Error(`NotebookLM blocked by deterministic source gate: ${manifest.gate.findings.map(f => f.code).join(', ')}`);
    }
    manifest.notebooklm = runNotebookLM(personName, packDir, sourcePackDir, manifest, args);
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
