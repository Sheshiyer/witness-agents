#!/usr/bin/env npx tsx
/**
 * Batch processor for section interpretation with NVIDIA NIM rate limiting.
 *
 * Respects 40 RPM limit, retries on 429, saves progress, supports resume.
 *
 * Usage:
 *   # Process single subject
 *   npx tsx scripts/batch-interpret.ts --subject mohan --data path/to/selemene.json
 *
 *   # Process multiple subjects from directory
 *   npx tsx scripts/batch-interpret.ts --dir path/to/subjects/ --output ./interpretations/
 *
 *   # Resume interrupted batch
 *   npx tsx scripts/batch-interpret.ts --dir path/to/subjects/ --output ./interpretations/ --resume
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

// Import rate-limited provider
import { RateLimitedNvidiaProvider } from '../src/inference/rate-limited-nvidia.js';
import { VectorizeGroundingProvider } from '../packages/orchestration/src/vectorize-grounding.js';
import { NvidiaEmbeddingProvider } from '../src/inference/nvidia-embedding.js';
import { InProcessWitnessOrchestrationService } from '../packages/orchestration/src/in-process-service.js';
import { createFactLock } from '../packages/orchestration/src/fact-lock.js';
import { createSectionWitnessGraph } from '../src/wiring/graphs/section-witness.js';
import type { FactLock, AtomicTask, TaskResult } from '../packages/orchestration/src/types.js';

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════

const NVIDIA_RPM = 40;
const PROGRESS_FILE = '.batch-progress.json';
const VECTORIZE_INDEX = 'witness-wisdom-corpus';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface SubjectEntry {
  id: string;
  name: string;
  dataPath: string;
}

interface ProgressState {
  completed: string[];    // subject IDs done
  failed: string[];       // subject IDs failed
  inProgress: string | null;
  startedAt: string;
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════════
// ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  let i = 0;
  while (i < args.length) {
    const key = args[i].replace(/^--/, '');
    const val = args[i + 1];
    if (val && !val.startsWith('--')) {
      opts[key] = val;
      i += 2;
    } else {
      opts[key] = 'true';
      i += 1;
    }
  }

  const mode = opts['dir'] ? 'directory' : 'single';
  const dataDir = opts['dir'];
  const dataPath = opts['data'] || opts['subject'];
  const outputDir = opts['output'] || './interpretations';
  const resume = opts['resume'] === 'true';
  const rpm = parseInt(opts['rpm'] || String(NVIDIA_RPM), 10);

  return { mode, dataDir, dataPath, outputDir, resume, rpm, subject: opts['subject'] };
}

// ═══════════════════════════════════════════════════════════════════════
// SUBJECT LOADING
// ═══════════════════════════════════════════════════════════════════════

function loadSubjects(args: ReturnType<typeof parseArgs>): SubjectEntry[] {
  if (args.mode === 'single') {
    if (!args.dataPath) {
      console.error('❌ Usage: --subject NAME --data PATH');
      process.exit(1);
    }
    return [{
      id: args.subject || 'unknown',
      name: args.subject || 'Unknown Subject',
      dataPath: args.dataPath,
    }];
  }

  // Directory mode
  if (!args.dataDir || !existsSync(args.dataDir)) {
    console.error(`❌ Directory not found: ${args.dataDir}`);
    process.exit(1);
  }

  const files = require('fs').readdirSync(args.dataDir)
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => ({
      id: f.replace(/\.json$/, '').replace(/^\d+_selemene_/, ''),
      name: f.replace(/\.json$/, '').replace(/-/g, ' '),
      dataPath: join(args.dataDir, f),
    }));

  console.log(`📁 Found ${files.length} subjects in ${args.dataDir}`);
  return files;
}

// ═══════════════════════════════════════════════════════════════════════
// PROGRESS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

function loadProgress(): ProgressState {
  if (!existsSync(PROGRESS_FILE)) {
    return {
      completed: [],
      failed: [],
      inProgress: null,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  }
  return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
}

function saveProgress(state: ProgressState) {
  state.lastUpdated = new Date().toISOString();
  writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE DATA LOADING
// ═══════════════════════════════════════════════════════════════════════

function loadEngineData(path: string): Record<string, any> {
  const raw = JSON.parse(readFileSync(path, 'utf-8'));

  // Convert array format to object format
  if (Array.isArray(raw)) {
    const obj: Record<string, any> = {};
    for (const entry of raw) {
      const id = entry.engine_id || entry.engine;
      if (id) obj[id] = entry;
    }
    return obj;
  }

  return raw;
}

// ═══════════════════════════════════════════════════════════════════════
// FACTLOCK BUILDER
// ═══════════════════════════════════════════════════════════════════════

function buildFactLock(subject: SubjectEntry, engineData: Record<string, any>): FactLock {
  const facts: Record<string, any> = { name: subject.name };
  const sources: Record<string, string> = { name: 'user-input' };

  for (const [engineId, output] of Object.entries(engineData)) {
    const result = output.result || output;

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
      const activation = result.activation_sequence;
      if (activation) {
        facts.gk_life_work = activation.life_work?.gate;
        facts.gk_evolution = activation.evolution?.gate;
        facts.gk_radiance = activation.radiance?.gate;
        facts.gk_purpose = activation.purpose?.gate;
        sources.gk_life_work = 'selemene/gene-keys';
        sources.gk_evolution = 'selemene/gene-keys';
        sources.gk_radiance = 'selemene/gene-keys';
        sources.gk_purpose = 'selemene/gene-keys';
      }
    }

    if (engineId === 'vimshottari' && result) {
      const cp = result.current_period;
      if (cp) {
        if (cp.mahadasha?.planet) {
          facts.vimshottari_mahadasha = cp.mahadasha.planet;
          sources.vimshottari_mahadasha = 'selemene/vimshottari';
        }
        if (cp.antardasha?.planet) {
          facts.vimshottari_antardasha = cp.antardasha.planet;
          sources.vimshottari_antardasha = 'selemene/vimshottari';
        }
      }
    }

    if (engineId === 'panchanga' && result) {
      facts.panchanga_tithi = result.tithi_name;
      facts.panchanga_nakshatra = result.nakshatra_name;
      facts.panchanga_vara = result.vara_name;
      facts.panchanga_yoga = result.yoga_name;
      facts.panchanga_karana = result.karana_name;
      sources.panchanga_tithi = 'selemene/panchanga';
      sources.panchanga_nakshatra = 'selemene/panchanga';
      sources.panchanga_vara = 'selemene/panchanga';
    }
  }

  const lock = createFactLock({
    subjectId: subject.id,
    subject: subject.name,
    facts,
    sources,
  });

  // Add engine data
  const formatted: Record<string, string> = {};
  for (const [k, v] of Object.entries(engineData)) {
    formatted[k] = JSON.stringify(v.result || v, null, 2);
  }

  return { ...lock, engineData: formatted } as FactLock;
}

// ═══════════════════════════════════════════════════════════════════════
// RATE-LIMITED EXECUTOR
// ═══════════════════════════════════════════════════════════════════════

function createRateLimitedExecutor(
  provider: RateLimitedNvidiaProvider
) {
  return async (
    task: AtomicTask,
    lock: FactLock,
    prior: Record<string, string>,
    grounding?: any[]
  ): Promise<TaskResult> => {
    const { system, user } = task.buildPrompts(lock, prior, grounding);

    const response = await provider.complete({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model_role: 'synthesis',
      tier: 'subscriber',
      temperature_override: task.temperature ?? 0.2,
      max_tokens_override: task.targetTokens || 2000,
    });

    return {
      taskId: task.id,
      perspective: task.perspective,
      content: response.content,
      tokensUsed: response.usage?.total_tokens,
      latencyMs: response.latency_ms,
      model: response.model_used,
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════
// INTERPRETATION
// ═══════════════════════════════════════════════════════════════════════

async function interpretSubject(
  subject: SubjectEntry,
  service: InProcessWitnessOrchestrationService,
  outputDir: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    console.log(`\n🔮 [${subject.id}] Starting interpretation...`);

    const engineData = loadEngineData(subject.dataPath);
    const lock = buildFactLock(subject, engineData);
    const tasks = createSectionWitnessGraph(lock);

    console.log(`   [${subject.id}] ${Object.keys(engineData).length} engines, ${tasks.length} tasks`);

    const start = Date.now();
    const response = await service.orchestrate({
      factLock: lock,
      tasks,
      options: { maxParallel: 2 }, // conservative
    });
    const elapsed = (Date.now() - start) / 1000;

    // Save output
    const outputPath = join(outputDir, `${subject.id}.md`);
    writeFileSync(outputPath, `# Interpretation: ${subject.name}\n\n${response.output}`);

    console.log(`   [${subject.id}] ✅ Complete in ${elapsed.toFixed(1)}s | ${response.taskResults.length} tasks | ${response.output.length} chars`);

    return { success: true, output: response.output };
  } catch (err: any) {
    console.error(`   [${subject.id}] ❌ Failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  const args = parseArgs();
  const subjects = loadSubjects(args);

  if (subjects.length === 0) {
    console.error('❌ No subjects found');
    process.exit(1);
  }

  // Setup output directory
  mkdirSync(args.outputDir, { recursive: true });

  // Load or init progress
  const progress = loadProgress();

  if (args.resume) {
    console.log(`🔄 Resuming batch...`);
    console.log(`   Completed: ${progress.completed.length}`);
    console.log(`   Failed: ${progress.failed.length}`);
  } else {
    // Fresh start
    progress.completed = [];
    progress.failed = [];
    progress.startedAt = new Date().toISOString();
  }

  // Filter out already-done subjects
  const remaining = subjects.filter(
    s => !progress.completed.includes(s.id) && !progress.failed.includes(s.id)
  );

  console.log(`\n📊 Batch plan:`);
  console.log(`   Total subjects: ${subjects.length}`);
  console.log(`   Already done: ${progress.completed.length}`);
  console.log(`   Remaining: ${remaining.length}`);
  console.log(`   Rate limit: ${args.rpm} RPM`);
  console.log(`   Output: ${args.outputDir}`);

  if (remaining.length === 0) {
    console.log('\n✅ All subjects already processed!');
    return;
  }

  // Initialize providers
  console.log('\n🔌 Initializing providers...');

  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) {
    console.error('❌ NVIDIA_API_KEY not set');
    process.exit(1);
  }

  const llmProvider = new RateLimitedNvidiaProvider({
    api_key: nvidiaKey,
    rpm_limit: args.rpm,
    retry_max: 5,
    verbose: true,
  });

  const embeddingProvider = new NvidiaEmbeddingProvider({ api_key: nvidiaKey });
  const groundingProvider = new VectorizeGroundingProvider({
    indexName: VECTORIZE_INDEX,
    embeddingProvider,
    topK: 6,
    minScore: 0.6,
  });

  const executor = createRateLimitedExecutor(llmProvider);
  const service = new InProcessWitnessOrchestrationService(executor, {
    defaultMaxParallel: 2,
    defaultMaxRepairIterations: 1,
    groundingProvider,
    defaultMinRelevance: 0.6,
  });

  // Process subjects
  console.log(`\n🚀 Starting batch processing...\n`);
  const batchStart = Date.now();

  for (let i = 0; i < remaining.length; i++) {
    const subject = remaining[i];
    const num = i + 1;
    const total = remaining.length;

    console.log(`\n[${num}/${total}] Processing ${subject.id}...`);
    progress.inProgress = subject.id;
    saveProgress(progress);

    const result = await interpretSubject(subject, service, args.outputDir);

    if (result.success) {
      progress.completed.push(subject.id);
    } else {
      progress.failed.push(subject.id);
    }
    progress.inProgress = null;
    saveProgress(progress);

    // Progress stats
    const elapsed = (Date.now() - batchStart) / 1000;
    const rate = num / (elapsed / 60);
    console.log(`   Progress: ${num}/${total} | Rate: ${rate.toFixed(1)} subjects/min`);

    // Estimate time remaining
    if (num < total) {
      const avgTime = elapsed / num;
      const remaining = (total - num) * avgTime;
      console.log(`   ETA: ${formatDuration(remaining)}`);
    }
  }

  // Final summary
  const totalElapsed = (Date.now() - batchStart) / 1000;
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Batch complete!');
  console.log(`   Total: ${subjects.length}`);
  console.log(`   Success: ${progress.completed.length}`);
  console.log(`   Failed: ${progress.failed.length}`);
  console.log(`   Duration: ${formatDuration(totalElapsed)}`);
  console.log(`   Output: ${args.outputDir}`);
  console.log('='.repeat(60));
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 60) {
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

// Handle graceful shutdown
let shuttingDown = false;
process.on('SIGINT', () => {
  if (shuttingDown) {
    console.log('\n\n⚠️ Force exit');
    process.exit(1);
  }
  shuttingDown = true;
  console.log('\n\n🛑 Graceful shutdown... (press Ctrl+C again to force)');
  saveProgress(loadProgress());
  console.log('💾 Progress saved');
  setTimeout(() => process.exit(0), 500);
});

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
