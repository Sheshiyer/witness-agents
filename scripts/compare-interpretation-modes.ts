#!/usr/bin/env npx tsx
/**
 * compare-interpretation-modes.ts
 * 
 * Compare one-shot vs section-by-section interpretation quality.
 * 
 * Usage:
 *   npx tsx scripts/compare-interpretation-modes.ts --data <path-to-selemene-output.json>
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { WitnessOrchestrator } from '../packages/orchestration/src/orchestrator.js';
import type { FactLock, TaskResult, AtomicTask } from '../packages/orchestration/src/types.js';
import { createFactLock } from '../packages/orchestration/src/fact-lock.js';
import { createSectionWitnessGraph } from '../src/wiring/graphs/section-witness.js';
import { VectorizeGroundingProvider } from '../packages/orchestration/src/vectorize-grounding.js';
import { NvidiaEmbeddingProvider } from '../src/inference/nvidia-embedding.js';
import OpenAI from 'openai';

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════

const VECTORIZE_INDEX = 'witness-wisdom-corpus';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
const MODEL = process.env.OLLAMA_MODEL || 'kimi-k2.6:cloud';  // kimi 2.6 cloud model

// ═══════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════

function parseArgs(): { dataPath: string; outputDir: string; mode: 'both' | 'section' | 'oneshot' } {
  const args = process.argv.slice(2);
  let dataPath = '';
  let outputDir = '.comparison-output';
  let mode: 'both' | 'section' | 'oneshot' = 'both';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data' && args[i + 1]) {
      dataPath = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[++i];
    } else if (args[i] === '--mode' && args[i + 1]) {
      mode = args[++i] as 'both' | 'section' | 'oneshot';
    }
  }

  if (!dataPath) {
    console.error('Usage: npx tsx scripts/compare-interpretation-modes.ts --data <path>');
    console.error('Options:');
    console.error('  --output <dir>     Output directory (default: .comparison-output)');
    console.error('  --mode <mode>      Run mode: both, section, oneshot (default: both)');
    process.exit(1);
  }

  return { dataPath, outputDir, mode };
}

// ═══════════════════════════════════════════════════════════════════════
// SELEMENE DATA LOADER
// ═══════════════════════════════════════════════════════════════════════

interface SelemeneOutput {
  engine_id: string;
  result: Record<string, unknown>;
  witness_prompt?: string;
}

function loadSelemeneData(dataPath: string): { engineData: Record<string, SelemeneOutput>; subjectId: string } {
  const rawData = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  // Convert array to object keyed by engine_id
  const engineData: Record<string, SelemeneOutput> = {};
  
  if (Array.isArray(rawData)) {
    for (const item of rawData) {
      if (item.engine_id && item.result) {
        engineData[item.engine_id] = item;
      }
    }
  } else {
    // Already object format
    Object.assign(engineData, rawData);
  }
  
  // Extract subject ID from filename or data
  const filename = dataPath.split('/').pop() || '';
  const match = filename.match(/selemene_(.+?)\.json/) || filename.match(/(.+?)\.json/);
  const subjectId = match?.[1]?.replace(/-/g, ' ') || 'unknown subject';
  
  return { engineData, subjectId };
}

// ═══════════════════════════════════════════════════════════════════════
// FACTLOCK BUILDER
// ═══════════════════════════════════════════════════════════════════════

function buildFactLock(engineData: Record<string, SelemeneOutput>, subjectId: string): FactLock {
  const facts: Record<string, unknown> = {
    name: subjectId,
  };
  
  const sources: Record<string, string> = {
    name: 'user-input',
  };
  
  // Extract key facts from each engine
  for (const [engineId, output] of Object.entries(engineData)) {
    const result = output.result;
    
    if (engineId === 'human-design' && result) {
      facts.hd_type = result.type;
      facts.hd_authority = result.authority;
      facts.hd_profile = result.profile;
      facts.hd_definition = result.definition;
      sources.hd_type = 'selemene/human-design';
      sources.hd_authority = 'selemene/human-design';
      sources.hd_profile = 'selemene/human-design';
      sources.hd_definition = 'selemene/human-design';
    }
    
    if (engineId === 'gene-keys' && result) {
      const activation = result.activation_sequence as Record<string, unknown>;
      if (activation) {
        facts.gk_life_work = (activation.life_work as Record<string, unknown>)?.gate;
        facts.gk_evolution = (activation.evolution as Record<string, unknown>)?.gate;
        facts.gk_radiance = (activation.radiance as Record<string, unknown>)?.gate;
        facts.gk_purpose = (activation.purpose as Record<string, unknown>)?.gate;
        sources.gk_life_work = 'selemene/gene-keys';
        sources.gk_evolution = 'selemene/gene-keys';
        sources.gk_radiance = 'selemene/gene-keys';
        sources.gk_purpose = 'selemene/gene-keys';
      }
    }
    
    if (engineId === 'vimshottari' && result) {
      const currentPeriod = result.current_period as Record<string, unknown>;
      if (currentPeriod) {
        const maha = currentPeriod.mahadasha as Record<string, unknown>;
        const antar = currentPeriod.antardasha as Record<string, unknown>;
        facts.vimshottari_mahadasha = maha?.planet;
        facts.vimshottari_antardasha = antar?.planet;
        sources.vimshottari_mahadasha = 'selemene/vimshottari';
        sources.vimshottari_antardasha = 'selemene/vimshottari';
      }
    }
    
    if (engineId === 'panchanga' && result) {
      facts.panchanga_tithi = result.tithi_name;
      facts.panchanga_nakshatra = result.nakshatra_name;
      sources.panchanga_tithi = 'selemene/panchanga';
      sources.panchanga_nakshatra = 'selemene/panchanga';
    }
    
    if (engineId === 'enneagram' && result) {
      facts.enneagram_type = result.type;
      facts.enneagram_wing = result.wing;
      sources.enneagram_type = 'selemene/enneagram';
      sources.enneagram_wing = 'selemene/enneagram';
    }
  }
  
  // Use createFactLock to get proper structure with LockedFact entries
  const lock = createFactLock({
    subjectId: subjectId.replace(/\s+/g, '-').toLowerCase(),
    subject: subjectId,
    facts,
    sources,
  });
  
  // Add engineData to lock (for prompt building)
  const formattedEngineData: Record<string, string> = {};
  for (const [engineId, output] of Object.entries(engineData)) {
    formattedEngineData[engineId] = JSON.stringify(output.result, null, 2);
  }
  
  // Extend lock with engineData (not part of standard FactLock but needed for prompts)
  return {
    ...lock,
    engineData: formattedEngineData,
  } as FactLock;
}

// ═══════════════════════════════════════════════════════════════════════
// ONE-SHOT INTERPRETATION GRAPH
// ═══════════════════════════════════════════════════════════════════════

function createOneShotGraph(lock: FactLock): AtomicTask[] {
  return [{
    id: 'oneshot-interpretation',
    perspective: 'unified',
    dependsOn: [],
    targetTokens: 4000,
    temperature: 0.2,
    requiresGrounding: true,
    buildPrompts: (factLock, _priorOutputs, grounding) => {
      const subjectName = factLock.facts?.name || 'the subject';
      
      const systemPrompt = `You are a consciousness witness interpreter providing a unified reading for ${subjectName}.

## Your Role
Synthesize insights from all available engine data into a cohesive interpretation.
You have access to Western systems (Human Design, Gene Keys, Numerology, I Ching, Enneagram) 
and Vedic systems (Vimshottari Dasha, Panchanga) as well as Somatic data.

## Interpretation Guidelines
1. Start with the most significant patterns across all systems
2. Reference specific data points from the engine outputs
3. Use retrieved wisdom passages to ground your interpretation
4. Avoid speculation - only interpret what's present in the data
5. Write in second person ("You have...", "Your design shows...")
6. Be specific about numbers, gates, types, periods - cite them
7. Find connections and resonances between different systems

## Output Format
Write a flowing, integrated interpretation that weaves together insights from all systems.
Organize by theme rather than by system when possible.`;

      let engineContext = '\n## Engine Outputs\n';
      for (const [engineId, data] of Object.entries(factLock.engineData || {})) {
        const truncated = data.length > 2000 ? data.slice(0, 2000) + '...' : data;
        engineContext += `\n### ${engineId}\n\`\`\`json\n${truncated}\n\`\`\`\n`;
      }

      let groundingContext = '';
      if (grounding && grounding.length > 0) {
        groundingContext = '\n## Retrieved Wisdom\n';
        for (const p of grounding) {
          groundingContext += `\n[${p.id}] (relevance: ${p.score.toFixed(2)})\n${p.text}\n`;
        }
      }

      const userPrompt = `Please provide a unified consciousness interpretation for ${subjectName}.

${engineContext}
${groundingContext}

Begin with the most significant patterns and weave together insights from all available systems.`;

      return { system: systemPrompt, user: userPrompt };
    },
  }];
}

// ═══════════════════════════════════════════════════════════════════════
// TASK EXECUTOR
// ═══════════════════════════════════════════════════════════════════════

function createOllamaExecutor(client: OpenAI, model: string) {
  return async (task: AtomicTask, lock: FactLock, priorOutputs: Record<string, string>, grounding?: unknown[]): Promise<TaskResult> => {
    const prompts = task.buildPrompts(lock, priorOutputs, grounding as any);
    
    console.log(`   Executing task: ${task.id}...`);
    
    const response = await client.chat.completions.create({
      model,
      max_tokens: task.targetTokens || 2000,
      temperature: task.temperature || 0.2,
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ],
    });

    // Handle kimi's response format: content may be in 'content' or 'reasoning' field
    const choice = response.choices[0];
    const message = choice?.message as { content?: string; reasoning?: string };
    const content = message?.content || message?.reasoning || '';
    
    console.log(`   Content extracted: ${content.length} chars`);
    
    return {
      taskId: task.id,
      content,
      tokens: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      },
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  const { dataPath, outputDir, mode } = parseArgs();
  
  console.log('\n🔮 Interpretation Mode Comparison');
  console.log(`   Data: ${dataPath}`);
  console.log(`   Mode: ${mode}`);
  console.log(`   Model: ${MODEL} via ${OLLAMA_BASE_URL}`);
  console.log(`   Output: ${outputDir}/\n`);
  
  // Check API keys
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  
  if (!nvidiaKey) {
    console.error('❌ NVIDIA_API_KEY not set (needed for embeddings)');
    process.exit(1);
  }
  
  // Load data
  const { engineData, subjectId } = loadSelemeneData(dataPath);
  console.log(`📊 Loaded ${Object.keys(engineData).length} engines for: ${subjectId}`);
  
  // Build FactLock
  const lock = buildFactLock(engineData, subjectId);
  console.log(`📋 FactLock built with ${Object.keys(lock.facts || {}).length} facts\n`);
  
  // Initialize services
  const ollama = new OpenAI({ 
    baseURL: OLLAMA_BASE_URL, 
    apiKey: 'ollama',  // Ollama doesn't require a key but OpenAI SDK needs something
  });
  const embedding = new NvidiaEmbeddingProvider({ api_key: nvidiaKey });
  const grounding = new VectorizeGroundingProvider({
    indexName: VECTORIZE_INDEX,
    embeddingProvider: embedding,
    topK: 6,
    minScore: 0.6,
  });
  
  const executor = createOllamaExecutor(ollama, MODEL);
  const orchestrator = new WitnessOrchestrator(executor, {
    maxParallel: 2,  // Ollama runs locally, be conservative
    groundingProvider: grounding,
    minRelevance: 0.6,
  });
  
  // Create output directory
  const { mkdirSync } = await import('fs');
  mkdirSync(outputDir, { recursive: true });
  
  const results: Record<string, { content: string; tokens: { input: number; output: number } }> = {};
  
  // Run section-by-section interpretation
  if (mode === 'both' || mode === 'section') {
    console.log('📐 Running SECTION-BY-SECTION interpretation...\n');
    
    const sectionTasks = createSectionWitnessGraph(lock);
    console.log(`   Created ${sectionTasks.length} tasks: ${sectionTasks.map(t => t.id).join(', ')}`);
    
    const sectionResults = await orchestrator.execute(sectionTasks, lock);
    
    // Collect section outputs
    let sectionOutput = `# Section-by-Section Interpretation\n\nSubject: ${subjectId}\n\n`;
    let totalTokens = { input: 0, output: 0 };
    
    for (const result of sectionResults) {
      sectionOutput += `## ${result.taskId}\n\n${result.content}\n\n---\n\n`;
      totalTokens.input += result.tokens?.input || 0;
      totalTokens.output += result.tokens?.output || 0;
    }
    
    results.section = { content: sectionOutput, tokens: totalTokens };
    writeFileSync(`${outputDir}/section-interpretation.md`, sectionOutput);
    console.log(`   ✅ Section interpretation complete (${totalTokens.input + totalTokens.output} tokens)\n`);
  }
  
  // Run one-shot interpretation
  if (mode === 'both' || mode === 'oneshot') {
    console.log('🎯 Running ONE-SHOT interpretation...\n');
    
    const oneshotTasks = createOneShotGraph(lock);
    const oneshotResults = await orchestrator.execute(oneshotTasks, lock);
    
    const oneshotResult = oneshotResults[0];
    const oneshotOutput = `# One-Shot Interpretation\n\nSubject: ${subjectId}\n\n${oneshotResult.content}`;
    
    results.oneshot = {
      content: oneshotOutput,
      tokens: oneshotResult.tokens || { input: 0, output: 0 },
    };
    writeFileSync(`${outputDir}/oneshot-interpretation.md`, oneshotOutput);
    console.log(`   ✅ One-shot interpretation complete (${(oneshotResult.tokens?.input || 0) + (oneshotResult.tokens?.output || 0)} tokens)\n`);
  }
  
  // Write comparison summary
  if (mode === 'both') {
    const summary = `# Interpretation Mode Comparison

Subject: ${subjectId}
Date: ${new Date().toISOString()}

## Token Usage

| Mode | Input | Output | Total |
|------|-------|--------|-------|
| Section-by-Section | ${results.section?.tokens.input} | ${results.section?.tokens.output} | ${(results.section?.tokens.input || 0) + (results.section?.tokens.output || 0)} |
| One-Shot | ${results.oneshot?.tokens.input} | ${results.oneshot?.tokens.output} | ${(results.oneshot?.tokens.input || 0) + (results.oneshot?.tokens.output || 0)} |

## Output Length

| Mode | Characters | Approximate Words |
|------|-----------|-------------------|
| Section-by-Section | ${results.section?.content.length} | ~${Math.round((results.section?.content.length || 0) / 6)} |
| One-Shot | ${results.oneshot?.content.length} | ~${Math.round((results.oneshot?.content.length || 0) / 6)} |

## Quality Notes

Review the individual outputs to compare:
1. **Accuracy** - Does each mode correctly cite engine data?
2. **Depth** - Which provides more nuanced interpretation?
3. **Coherence** - Which reads more naturally?
4. **Coverage** - Does section-by-section miss cross-system insights?

Files:
- section-interpretation.md
- oneshot-interpretation.md
`;
    
    writeFileSync(`${outputDir}/comparison-summary.md`, summary);
    console.log(`📊 Comparison summary written to ${outputDir}/comparison-summary.md`);
  }
  
  console.log('\n✅ Done!\n');
}

main().catch(console.error);
