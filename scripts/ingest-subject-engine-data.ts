#!/usr/bin/env npx tsx
/**
 * ingest-subject-engine-data.ts
 * 
 * Vectorize a subject's computed engine data for retrieval during interpretation.
 * 
 * Usage:
 *   npx tsx scripts/ingest-subject-engine-data.ts --subject <subject-id> --data <path-to-engine-outputs.json>
 *   npx tsx scripts/ingest-subject-engine-data.ts --subject mohan --data ./subjects/mohan/engine-outputs.json
 * 
 * The engine-outputs.json should have the structure:
 * {
 *   "human-design": { "result": { ... } },
 *   "gene-keys": { "result": { ... } },
 *   ...
 * }
 * 
 * This creates vectors in the witness-wisdom-corpus index with IDs prefixed "ed:"
 * (engine data) to distinguish from "sw:" (selemene wisdom corpus).
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { NvidiaEmbeddingProvider } from '../src/inference/nvidia-embedding.js';
import { extractAtomicEngineData, type EngineOutputs } from '../packages/orchestration/src/engine-data-extractor.js';

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════

const VECTORIZE_INDEX = 'witness-wisdom-corpus';
const BATCH_SIZE = 50;
const NDJSON_FILE = '.vectorize-subject-data.ndjson';

// ═══════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════

function parseArgs(): { subjectId: string; dataPath: string; dryRun: boolean; deleteExisting: boolean } {
  const args = process.argv.slice(2);
  let subjectId = '';
  let dataPath = '';
  let dryRun = false;
  let deleteExisting = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--subject' && args[i + 1]) {
      subjectId = args[++i];
    } else if (args[i] === '--data' && args[i + 1]) {
      dataPath = args[++i];
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--delete-existing') {
      deleteExisting = true;
    }
  }

  if (!subjectId || !dataPath) {
    console.error('Usage: npx tsx scripts/ingest-subject-engine-data.ts --subject <id> --data <path>');
    console.error('Options:');
    console.error('  --dry-run         Print extracted data without vectorizing');
    console.error('  --delete-existing Delete existing vectors for this subject first');
    process.exit(1);
  }

  return { subjectId, dataPath, dryRun, deleteExisting };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  const { subjectId, dataPath, dryRun, deleteExisting } = parseArgs();
  
  console.log(`\n🔮 Ingesting engine data for subject: ${subjectId}`);
  console.log(`   Data file: ${dataPath}`);
  
  // Load engine outputs
  if (!existsSync(dataPath)) {
    console.error(`❌ Data file not found: ${dataPath}`);
    process.exit(1);
  }
  
  const engineOutputs: EngineOutputs = JSON.parse(readFileSync(dataPath, 'utf-8'));
  const engineCount = Object.keys(engineOutputs).length;
  console.log(`   Found ${engineCount} engine outputs`);
  
  // Extract atomic data points
  console.log('\n📊 Extracting atomic data points...');
  const atomicData = extractAtomicEngineData(subjectId, engineOutputs);
  console.log(`   Extracted ${atomicData.length} atomic data points`);
  
  // Group by system for display
  const bySystem = {
    western: atomicData.filter(d => d.metadata.system === 'western'),
    vedic: atomicData.filter(d => d.metadata.system === 'vedic'),
    somatic: atomicData.filter(d => d.metadata.system === 'somatic'),
  };
  console.log(`   - Western: ${bySystem.western.length} points`);
  console.log(`   - Vedic: ${bySystem.vedic.length} points`);
  console.log(`   - Somatic: ${bySystem.somatic.length} points`);
  
  if (dryRun) {
    console.log('\n📝 Dry run - extracted data:');
    for (const item of atomicData) {
      console.log(`\n[${item.id}]`);
      console.log(`  System: ${item.metadata.system} | Engine: ${item.metadata.engine}`);
      console.log(`  Field: ${item.metadata.field} | Category: ${item.metadata.category}`);
      console.log(`  Text: ${item.text.slice(0, 100)}...`);
    }
    return;
  }
  
  // Check for NVIDIA API key
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('❌ NVIDIA_API_KEY environment variable not set');
    process.exit(1);
  }
  
  // Delete existing vectors for this subject if requested
  if (deleteExisting) {
    console.log(`\n🗑️  Deleting existing vectors for subject: ${subjectId}...`);
    try {
      // We can't easily query by metadata, so we'd need to track IDs separately
      // For now, just warn that old data might still exist
      console.log('   (Note: Vectorize does not support bulk delete by metadata)');
      console.log('   Old vectors with same IDs will be overwritten');
    } catch (err) {
      console.warn('   Could not delete existing vectors:', err);
    }
  }
  
  // Create embedding provider
  const embeddingProvider = new NvidiaEmbeddingProvider({ api_key: apiKey });
  
  // Embed and prepare NDJSON
  console.log('\n🧠 Generating embeddings...');
  const ndjsonLines: string[] = [];
  
  for (let i = 0; i < atomicData.length; i += BATCH_SIZE) {
    const batch = atomicData.slice(i, i + BATCH_SIZE);
    const texts = batch.map(d => d.text);
    
    process.stdout.write(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(atomicData.length / BATCH_SIZE)}...`);
    
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
  
  // Clean up NDJSON file
  try {
    unlinkSync(NDJSON_FILE);
  } catch (e) {
    // ignore
  }
  
  console.log(`\n✅ Successfully ingested ${atomicData.length} vectors for subject: ${subjectId}`);
  console.log(`   Index: ${VECTORIZE_INDEX}`);
  console.log(`   ID prefix: ed:${subjectId.slice(0, 16)}:*`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
