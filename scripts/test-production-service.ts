#!/usr/bin/env npx tsx
/**
 * Test the production section interpretation service with NVIDIA NIM.
 */

import { readFileSync } from 'fs';
import { createSectionInterpretationService } from '../src/wiring/section-interpretation-service.js';

async function main() {
  const dataPath = process.argv[2] || '/Volumes/madara/2026/twc-vault/01-Projects/723/mohan-vandana-partnership/solos/mohan/.runs/2026-06-05T21-56-45/01_selemene_mohan-kumar-m-g.json';

  console.log('🔮 Testing Production Section Interpretation Service');
  console.log(`   Data: ${dataPath}\n`);

  // Load Selemene data
  const rawData = JSON.parse(readFileSync(dataPath, 'utf-8'));

  // Convert array to object format if needed
  let engineData: Record<string, any>;
  if (Array.isArray(rawData)) {
    engineData = {};
    for (const entry of rawData) {
      const engineId = entry.engine_id || entry.engine;
      if (engineId) {
        engineData[engineId] = entry;
      }
    }
  } else {
    engineData = rawData;
  }

  console.log(`📊 Loaded ${Object.keys(engineData).length} engines`);

  // Create service
  const service = createSectionInterpretationService({
    nvidiaApiKey: process.env.NVIDIA_API_KEY!,
    vectorizeIndex: 'witness-wisdom-corpus',
    minRelevance: 0.6,
    maxParallel: 2,
    tier: 'subscriber',
    mode: 'section',
  });

  console.log('🚀 Running section-by-section interpretation...\n');

  const startTime = Date.now();

  try {
    const result = await service.interpretSubject({
      subjectId: 'mohan-test',
      subjectName: 'mohan kumar m g',
      engineData,
    });

    const elapsed = Date.now() - startTime;

    console.log(`\n✅ Interpretation complete in ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`   Tasks: ${result.taskResults.length}`);
    console.log(`   Tokens: ${result.tokensUsed}`);
    console.log(`   Repairs: ${result.repairIterations}`);
    console.log(`   Contradictions: ${result.contradictions.length}`);

    console.log('\n📄 Output:');
    console.log('─'.repeat(60));
    console.log(result.output.slice(0, 2000));
    if (result.output.length > 2000) {
      console.log('\n... (truncated, full output in result.output)');
    }

    // Save full output
    const { writeFileSync } = await import('fs');
    writeFileSync('.test-production-output.md', result.output);
    console.log('\n💾 Full output saved to .test-production-output.md');

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main().catch(console.error);
