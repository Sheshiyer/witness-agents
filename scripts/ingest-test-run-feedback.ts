#!/usr/bin/env npx tsx
/**
 * ingest-test-run-feedback.ts
 *
 * Extract learnings from test runs and feed them back into the witness-wisdom-corpus
 * Vectorize index as feedback passages. Future interpretations ground against these
 * learned corrections and validated patterns.
 *
 * Usage:
 *   npx tsx scripts/ingest-test-run-feedback.ts --dir .premium-assets
 *   npx tsx scripts/ingest-test-run-feedback.ts --dir .premium-assets-witness-harshita
 *   npx tsx scripts/ingest-test-run-feedback.ts --dir .premium-assets --dry-run
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { NvidiaEmbeddingProvider } from '../src/inference/nvidia-embedding.js';

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════

const VECTORIZE_INDEX = 'witness-wisdom-corpus';
const BATCH_SIZE = 50;
const NDJSON_FILE = '.vectorize-test-run-feedback.ndjson';
const ID_PREFIX = 'fb';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface FeedbackPassage {
  id: string;
  text: string;
  metadata: {
    type: 'correction' | 'validation' | 'boundary';
    topic: string;
    source_run: string;
    timestamp: string;
    severity?: string;
    code?: string;
  };
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
    readingHtml?: string;
    readingPdf?: string;
    reflectionQuestions?: string;
    provenance?: string;
  };
  quality?: Array<{ name: string; status: string; detail: string }>;
  gate?: {
    status: string;
    findings: Array<{ code: string; severity: string; detail: string }>;
  };
}

interface CliArgs {
  dir: string;
  dryRun: boolean;
  topicFilter: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let dir = '';
  let dryRun = false;
  let topicFilter: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      dir = args[++i];
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--topic' && args[i + 1]) {
      topicFilter = args[++i];
    }
  }

  if (!dir) {
    console.error('Usage: npx tsx scripts/ingest-test-run-feedback.ts --dir <asset-dir> [--dry-run] [--topic <topic>]');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/ingest-test-run-feedback.ts --dir .premium-assets');
    console.error('  npx tsx scripts/ingest-test-run-feedback.ts --dir .premium-assets-witness-harshita --dry-run');
    console.error('  npx tsx scripts/ingest-test-run-feedback.ts --dir .premium-assets --topic somatic');
    process.exit(1);
  }

  return { dir: resolve(dir), dryRun, topicFilter };
}

// ═══════════════════════════════════════════════════════════════════════
// MANIFEST SCANNING
// ═══════════════════════════════════════════════════════════════════════

function findManifests(dir: string): string[] {
  const manifests: string[] = [];

  function scan(currentDir: string) {
    for (const entry of readdirSync(currentDir)) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        const manifestPath = join(fullPath, 'manifest.json');
        if (existsSync(manifestPath)) {
          manifests.push(manifestPath);
        } else {
          // Recurse one level deeper for nested structures
          scan(fullPath);
        }
      }
    }
  }

  scan(dir);
  return manifests;
}

function loadManifest(path: string): Manifest | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Manifest;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FEEDBACK EXTRACTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Convert gate findings into feedback passages.
 * Even "pass" runs teach us what works (implicit validation).
 * "blocked" runs teach us what to avoid (explicit correction).
 */
function extractFeedbackFromManifest(manifest: Manifest, manifestPath: string): FeedbackPassage[] {
  const passages: FeedbackPassage[] = [];
  const runId = manifest.personId;
  const timestamp = manifest.generatedAt;

  // ── Gate findings → corrections ──
  if (manifest.gate?.findings?.length) {
    for (const finding of manifest.gate.findings) {
      const topic = finding.code.replace(/_/g, '-');
      const text = buildCorrectionPassage(finding);
      passages.push({
        id: `${ID_PREFIX}:correction:${topic}:${runId}:${Date.now()}`,
        text,
        metadata: {
          type: 'correction',
          topic,
          source_run: runId,
          timestamp,
          severity: finding.severity,
          code: finding.code,
        },
      });
    }
  }

  // ── Gate pass with empty findings → implicit validation ──
  if (manifest.gate?.status === 'pass' && (!manifest.gate.findings || manifest.gate.findings.length === 0)) {
    // Extract validated interpretation snippets from the reading
    const readingPath = manifest.inputs?.readingMarkdown;
    if (readingPath && existsSync(readingPath)) {
      const reading = readFileSync(readingPath, 'utf-8');
      const validations = extractValidationPassages(reading, runId, timestamp);
      passages.push(...validations);
    }
  }

  // ── Quality checks → boundary learnings ──
  if (manifest.quality) {
    for (const check of manifest.quality) {
      if (check.status === 'pass') {
        passages.push({
          id: `${ID_PREFIX}:boundary:quality-${check.name}:${runId}:${Date.now()}`,
          text: `Quality standard '${check.name}' passed: ${check.detail}. This confirms the output meets the expected threshold for this dimension.`,
          metadata: {
            type: 'boundary',
            topic: `quality-${check.name}`,
            source_run: runId,
            timestamp,
          },
        });
      }
    }
  }

  return passages;
}

function buildCorrectionPassage(finding: { code: string; severity: string; detail: string }): string {
  const corrections: Record<string, string> = {
    somatic_false_absence:
      'When biofield or face-reading data is available in the deterministic facts, the interpretation must never claim somatic data is absent, missing, or unavailable. The correct approach references available biofield and face-reading anchors directly without inventing unlisted fields.',
    somatic_data_omitted:
      'When somatic engines (biofield, face-reading) are present in the input, the source pack and interpretation must include somatic anchors. Do not skip the body-level thread when deterministic somatic data exists.',
    somatic_layer_not_approved:
      'Somatic engines (biofield, face-reading, nadabrahman) require physical inputs that are not production-ready. When SOMATIC_LAYER_APPROVED is false, these engines must not be included in the integrated reading. Remove them from engine inputs, or set SOMATIC_LAYER_APPROVED=true only after explicit roadmap approval.',
    creative_oracle_layer_not_approved:
      'Creative Oracle engines (i-ching, tarot, sacred-geometry, sigil-forge) require a live query or intention. They do not produce deterministic birth-chart output. When CREATIVE_ORACLE_LAYER_APPROVED is false, these engines must not be included in the integrated reading. Remove them from engine inputs, or set CREATIVE_ORACLE_LAYER_APPROVED=true only after explicit roadmap approval.',
    layer_misplacement:
      'Engine data must be interpreted within its correct functional layer, not by cultural origin. Human Design and Gene Keys belong in Structural Identity, not Somatic Resonance. Vimshottari and Panchanga belong in Temporal Foundation, not Somatic. Do not recycle data from one layer to fill an empty section in another.',
    false_somatic_data:
      'The Somatic Resonance layer must contain only biofield, face-reading, and nadabrahman content. Human Design concepts (authority, profile, definition) are Structural Identity data and must never appear in the somatic section. If no somatic engines have real data, the layer should be omitted, not filled with recycled structural or temporal content.',
    engine_orphaned:
      'Every engine in the 16-engine stack must have a home in one of the four functional layers (Temporal Foundation, Structural Identity, Somatic Resonance, Creative Oracle). If an engine appears in the input but is absent from all layer sections, the layer model is incomplete. Biorhythm, Transits, Tarot, Sacred Geometry, and Sigil Forge must not be silently dropped.',
    empty_section_apology:
      'When a layer has no engine data, the interpretation must omit that layer rather than writing a long apology about missing data. Do not produce paragraphs like "You have no recorded data for the Western Consciousness Systems." Instead, the layer simply does not appear in the reading. The synthesis covers only active layers.',
    nakshatra_drift:
      'The interpretation must anchor strictly to the deterministic natal_panchanga_nakshatra fact. Do not introduce unexpected nakshatra names that contradict the birth imprint. If a nakshatra is mentioned, it must match the extracted fact.',
    synastry_partner_nakshatra_drift:
      'In synastry readings, each partner\'s nakshatra must be grounded in their individual deterministic anchors. Do not transfer one partner\'s nakshatra to the other or introduce nakshatras not present in the partner fact set.',
    natal_panchanga_used_as_current_weather:
      'Natal Panchanga describes the birth-moment imprint only. It must never be described as current-day timing, "today\'s cosmic moment", or "the lunar day you are living in" unless current-panchanga facts are explicitly present.',
    synastry_missing_deterministic_facts:
      'Synastry interpretations require per-partner deterministic fact anchors. Do not generate synastry prose from narrative texture alone without grounding each partner\'s chart data separately.',
    manifest_gate_false_pass:
      'The manifest gate status must accurately reflect audit findings. If blockers exist, the gate must report blocked, not pass.',
    notebooklm_enabled_while_blocked:
      'NotebookLM assets must not be generated when deterministic source gates report blockers. Blocked outputs should be fixed before downstream asset generation.',
  };

  const base = corrections[finding.code];
  if (base) {
    return `${base}\n\nSpecific instance: ${finding.detail}`;
  }

  return `Correction: ${finding.code}. ${finding.detail}`;
}

/**
 * Extract high-signal validation passages from a reading.
 * Focus on synthesis, section integration, and fact-grounded statements.
 * Recognizes both old cultural section names and new functional layer names.
 */
function extractValidationPassages(reading: string, runId: string, timestamp: string): FeedbackPassage[] {
  const passages: FeedbackPassage[] = [];

  // Extract synthesis section as a validated interpretation
  // Matches: section-synthesis (old), layer-synthesis (new), or generic "synthesis"
  const synthesisMatch = reading.match(/##?\s*(?:section[- ]?synthesis|layer[- ]?synthesis|synthesis)[\s\S]*?(?=##?\s*(?:western|vedic|somatic|temporal|structural|creative|reflection|$))/i);
  if (synthesisMatch) {
    const text = synthesisMatch[0].slice(0, 1200).trim();
    if (text.length > 200) {
      passages.push({
        id: `${ID_PREFIX}:validation:synthesis:${runId}:${Date.now()}`,
        text: `Validated interpretation synthesis (gate-passed):\n\n${text}`,
        metadata: {
          type: 'validation',
          topic: 'synthesis',
          source_run: runId,
          timestamp,
        },
      });
    }
  }

  // Extract layer-specific validations for active layers
  const layerPatterns: Array<{ name: string; regex: RegExp; topic: string }> = [
    { name: 'temporal-foundation', regex: /##?\s*temporal[- ]?foundation[\s\S]*?(?=##?\s*(?:structural|somatic|creative|layer|section|synthesis|$))/i, topic: 'temporal-foundation' },
    { name: 'structural-identity', regex: /##?\s*structural[- ]?identity[\s\S]*?(?=##?\s*(?:temporal|somatic|creative|layer|section|synthesis|$))/i, topic: 'structural-identity' },
    { name: 'somatic-resonance', regex: /##?\s*somatic[- ]?resonance[\s\S]*?(?=##?\s*(?:temporal|structural|creative|layer|section|synthesis|$))/i, topic: 'somatic-resonance' },
    { name: 'creative-oracle', regex: /##?\s*creative[- ]?oracle[\s\S]*?(?=##?\s*(?:temporal|structural|somatic|layer|section|synthesis|$))/i, topic: 'creative-oracle' },
    // Backward compatibility: old cultural sections
    { name: 'western-systems', regex: /##?\s*western[- ]?systems[\s\S]*?(?=##?\s*(?:vedic|somatic|section|synthesis|$))/i, topic: 'western-systems' },
    { name: 'vedic-systems', regex: /##?\s*vedic[- ]?systems[\s\S]*?(?=##?\s*(?:western|somatic|section|synthesis|$))/i, topic: 'vedic-systems' },
    { name: 'somatic-systems', regex: /##?\s*somatic[- ]?systems[\s\S]*?(?=##?\s*(?:western|vedic|section|synthesis|$))/i, topic: 'somatic-systems' },
  ];

  for (const layer of layerPatterns) {
    const match = reading.match(layer.regex);
    if (match) {
      const text = match[0].slice(0, 800).trim();
      if (text.length > 150) {
        passages.push({
          id: `${ID_PREFIX}:validation:${layer.topic}:${runId}:${Date.now()}`,
          text: `Validated ${layer.name} layer interpretation (gate-passed):\n\n${text}`,
          metadata: {
            type: 'validation',
            topic: layer.topic,
            source_run: runId,
            timestamp,
          },
        });
      }
    }
  }

  // Extract fact-anchored statements (lines that reference specific facts)
  const lines = reading.split('\n');
  const factAnchoredLines = lines.filter(line =>
    /\b(nakshatra|mahadasha|antardasha|pratyantardasha|dosha|panchanga|human design|gene key|profile|authority|tithi|yoga|karana|vara|biorhythm|transit)\b/i.test(line) &&
    line.length > 60 && line.length < 400
  );

  // Sample up to 5 fact-anchored lines to avoid overwhelming the index
  const sampled = factAnchoredLines.slice(0, 5);
  for (let i = 0; i < sampled.length; i++) {
    passages.push({
      id: `${ID_PREFIX}:validation:fact-anchored:${runId}:${i}:${Date.now()}`,
      text: `Validated fact-anchored statement (gate-passed):\n\n${sampled[i].trim()}`,
      metadata: {
        type: 'validation',
        topic: 'fact-anchored-statement',
        source_run: runId,
        timestamp,
      },
    });
  }

  return passages;
}

// ═══════════════════════════════════════════════════════════════════════
// EMBEDDING & UPSERT
// ═══════════════════════════════════════════════════════════════════════

async function embedAndUpsert(passages: FeedbackPassage[], dryRun: boolean) {
  if (passages.length === 0) {
    console.log('\n📭 No feedback passages to ingest.');
    return;
  }

  console.log(`\n🧠 Embedding ${passages.length} feedback passages...`);

  if (dryRun) {
    console.log('\n📝 Dry run - extracted passages:');
    for (const p of passages) {
      console.log(`\n[${p.id}]`);
      console.log(`  Type: ${p.metadata.type} | Topic: ${p.metadata.topic}`);
      console.log(`  Text: ${p.text.slice(0, 120)}...`);
    }
    return;
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('❌ NVIDIA_API_KEY environment variable not set');
    process.exit(1);
  }

  const embeddingProvider = new NvidiaEmbeddingProvider({ api_key: apiKey });
  const ndjsonLines: string[] = [];

  for (let i = 0; i < passages.length; i += BATCH_SIZE) {
    const batch = passages.slice(i, i + BATCH_SIZE);
    const texts = batch.map(p => p.text);

    process.stdout.write(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(passages.length / BATCH_SIZE)}...`);

    const embeddings = await embeddingProvider.embed(texts, 'passage');

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const embedding = embeddings[j].embedding;

      ndjsonLines.push(JSON.stringify({
        id: item.id,
        values: embedding,
        metadata: item.metadata,
      }));
    }

    console.log(` ✓ (${embeddings.length} vectors)`);
  }

  // Write NDJSON file
  console.log(`\n📄 Writing ${ndjsonLines.length} vectors to ${NDJSON_FILE}...`);
  writeFileSync(NDJSON_FILE, ndjsonLines.join('\n'));

  // Upsert to Vectorize
  console.log(`\n☁️  Upserting to Vectorize index: ${VECTORIZE_INDEX}...`);
  try {
    const result = execSync(
      `wrangler vectorize upsert ${VECTORIZE_INDEX} --file ${NDJSON_FILE}`,
      { encoding: 'utf-8', timeout: 120_000 }
    );
    console.log(result);
  } catch (err: any) {
    console.error('❌ Upsert failed:', err.message);
    if (err.stdout) console.log('stdout:', err.stdout);
    if (err.stderr) console.log('stderr:', err.stderr);
    process.exit(1);
  }

  // Clean up
  try {
    writeFileSync(NDJSON_FILE, '');
  } catch {
    // ignore
  }

  console.log(`\n✅ Successfully ingested ${passages.length} feedback vectors`);
  console.log(`   Index: ${VECTORIZE_INDEX}`);
  console.log(`   ID prefix: ${ID_PREFIX}:*`);
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  const args = parseArgs();

  console.log(`🔍 Scanning for manifests in: ${args.dir}`);
  const manifestPaths = findManifests(args.dir);
  console.log(`   Found ${manifestPaths.length} manifest(s)`);

  if (manifestPaths.length === 0) {
    console.error('❌ No manifests found. Make sure the directory contains premium asset outputs.');
    process.exit(1);
  }

  let allPassages: FeedbackPassage[] = [];

  for (const manifestPath of manifestPaths) {
    const manifest = loadManifest(manifestPath);
    if (!manifest) {
      console.warn(`   ⚠️  Could not parse manifest: ${manifestPath}`);
      continue;
    }

    const passages = extractFeedbackFromManifest(manifest, manifestPath);
    console.log(`   ${manifest.personId}: ${passages.length} feedback passage(s)`);

    if (args.topicFilter) {
      const filtered = passages.filter(p => p.metadata.topic.includes(args.topicFilter!));
      console.log(`      (filtered to ${filtered.length} by topic '${args.topicFilter}')`);
      allPassages.push(...filtered);
    } else {
      allPassages.push(...passages);
    }
  }

  // Deduplicate by text content (simple exact-match dedup)
  const seen = new Set<string>();
  allPassages = allPassages.filter(p => {
    const normalized = p.text.replace(/\s+/g, ' ').trim().toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  console.log(`\n📊 Total unique feedback passages: ${allPassages.length}`);

  await embedAndUpsert(allPassages, args.dryRun);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
