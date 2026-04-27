// ─── Witness Agents — Dyad Pipeline Audit Spike ──────────────────────
// Confirms the orphaned DyadInferenceEngine + VoicePromptBuilder + voice prompts
// still produce rich Aletheios/Pichet/Synthesis output against a real Selemene
// engine response. Standalone — does NOT touch the running server.
//
// Run:
//   export OPENROUTER_API_KEY=...
//   export SELEMENE_API_KEY=...      # optional; if absent, fixture is used
//   node --import tsx scripts/audit-dyad.ts
//
// Output: audit-output/dyad-audit-<timestamp>.md

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { OpenRouterProvider } from '../src/inference/openrouter.js';
import { DyadInferenceEngine } from '../src/inference/dyad-engine.js';
import { VoicePromptBuilder } from '../src/agents/voice-prompts.js';
import { SelemeneClient } from '../src/pipeline/interpreter.js';

import type {
  Tier,
  UserState,
  WitnessInterpretation,
  Kosha,
  CliffordLevel,
} from '../src/types/interpretation.js';
import type {
  BirthData,
  BiorhythmResult,
  SelemeneEngineOutput,
} from '../src/types/engine.js';

// ─── Config ─────────────────────────────────────────────────────────────

const SELEMENE_API_URL = process.env.SELEMENE_API_URL || 'https://selemene.tryambakam.space';
const SELEMENE_API_KEY = process.env.SELEMENE_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const TIER: Tier = (process.env.AUDIT_TIER as Tier) || 'enterprise';
const USE_FIXTURE = process.env.USE_FIXTURE === '1' || !SELEMENE_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('FATAL: OPENROUTER_API_KEY env var is not set. Cannot run LLM calls.');
  process.exit(1);
}

const KOSHA_FOR_TIER: Record<Tier, Kosha> = {
  free: 'annamaya',
  subscriber: 'manomaya',
  enterprise: 'vijnanamaya',
  initiate: 'anandamaya',
};
const CLIFFORD_FOR_TIER: Record<Tier, CliffordLevel> = {
  free: 0, subscriber: 2, enterprise: 3, initiate: 7,
};

// ─── 1. Selemene input (live or fixture) ────────────────────────────────

const birthData: BirthData = {
  date: '1991-08-13',
  time: '13:31',
  latitude: 12.97,
  longitude: 77.59,
  timezone: 'Asia/Kolkata',
};

const fixtureBiorhythm: BiorhythmResult = {
  days_alive: 12678,
  target_date: new Date().toISOString().split('T')[0],
  physical:     { value: -0.81, percentage: -81, phase: 'Recovery', days_until_peak: 14, days_until_critical: 4,  is_critical: false, cycle_day: 17 },
  emotional:    { value:  0.43, percentage:  43, phase: 'Active',   days_until_peak:  7, days_until_critical: 12, is_critical: false, cycle_day: 22 },
  intellectual: { value:  0.92, percentage:  92, phase: 'Peak',     days_until_peak:  0, days_until_critical: 17, is_critical: false, cycle_day:  9 },
  intuitive:    { value:  0.15, percentage:  15, phase: 'Active',   days_until_peak:  9, days_until_critical: 19, is_critical: false, cycle_day: 31 },
  mastery: 0.50,
  passion: 0.60,
  wisdom:  0.70,
  critical_days: [],
  overall_energy: 17,
};

const fixtureOutput: SelemeneEngineOutput = {
  engine_id: 'biorhythm',
  result: fixtureBiorhythm,
  witness_prompt: 'Your physical energy is recovering while intellectual peaks. The body is asking for rest as the mind reaches for clarity. What might it look like to honor both?',
  consciousness_level: 1,
  metadata: {
    calculation_time_ms: 12,
    backend: 'fixture',
    precision_achieved: 'Standard',
    cached: false,
    timestamp: new Date().toISOString(),
    engine_version: '0.1.0',
  },
  envelope_version: '1',
};

console.log('=== Dyad Pipeline Audit ===');
console.log(`Tier:       ${TIER}`);
console.log(`Selemene:   ${USE_FIXTURE ? 'fixture (no API call)' : SELEMENE_API_URL}`);
console.log(`OpenRouter: configured (key length ${OPENROUTER_API_KEY.length})`);

let biorhythmOutput: SelemeneEngineOutput;
let selemeneError: string | undefined;
if (USE_FIXTURE) {
  biorhythmOutput = fixtureOutput;
  console.log('→ Using synthetic biorhythm fixture');
} else {
  const client = new SelemeneClient({
    base_url: SELEMENE_API_URL,
    api_key: SELEMENE_API_KEY,
  });
  console.log('→ Calling Selemene biorhythm engine...');
  try {
    biorhythmOutput = await client.calculateEngine('biorhythm', { birth_data: birthData });
    console.log(`✓ Selemene returned (engine_id=${biorhythmOutput.engine_id}, witness_prompt: ${biorhythmOutput.witness_prompt?.length ?? 0} chars)`);
  } catch (err) {
    selemeneError = (err as Error).message;
    console.error(`✗ Selemene call failed: ${selemeneError}`);
    console.error('  → falling back to fixture so the audit can still run');
    biorhythmOutput = fixtureOutput;
  }
}

// ─── 2. UserState + WitnessInterpretation seeds ────────────────────────

const userState: UserState = {
  tier: TIER,
  http_status: 200,
  overwhelm_level: 0.2,
  active_kosha: KOSHA_FOR_TIER[TIER],
  dominant_center: 'heart',
  recursion_detected: false,
  anti_dependency_score: 0.5,
  biorhythm: {
    physical:     fixtureBiorhythm.physical.value,
    emotional:    fixtureBiorhythm.emotional.value,
    intellectual: fixtureBiorhythm.intellectual.value,
  },
  session_query_count: 1,
};

// dyad-engine.ts:71 — runAletheios = tier !== 'free' && !!interpretation.aletheios
// We must seed both agent slots so the LLM calls fire.
const interpretation: WitnessInterpretation = {
  id: `audit-${Date.now()}`,
  timestamp: new Date().toISOString(),
  query: "What does today's biorhythm reading suggest for how I should approach my work today?",
  engines_invoked: ['biorhythm'],
  engine_outputs: [biorhythmOutput],
  routing_mode: 'dyad-synthesis',
  aletheios: {
    agent: 'aletheios',
    perspective: 'Three-cycle divergence: physical recovery, intellectual peak, emotional mid-active.',
    domains_consulted: ['biorhythm-circadian'],
    confidence: 0.7,
    pattern_note: 'Cognitive work fits; somatic exertion does not.',
  },
  pichet: {
    agent: 'pichet',
    perspective: 'Body asks for rest. Mind reaches forward. Honour both rather than override.',
    domains_consulted: ['somatic-wisdom'],
    confidence: 0.8,
    somatic_note: 'Likely shoulder/neck tension if pushing through.',
  },
  tier: TIER,
  kosha_depth: KOSHA_FOR_TIER[TIER],
  clifford_level: CLIFFORD_FOR_TIER[TIER],
  response: '',
  response_cadence: 'measured',
  overwhelm_flag: false,
  recursion_flag: false,
};

// ─── 3. Voice prompt previews (for the report) ─────────────────────────

const voiceBuilder = new VoicePromptBuilder();
const aletheiosPrompt = voiceBuilder.buildAgentPrompt({
  agent: 'aletheios', tier: TIER, userState, engineOutputs: [biorhythmOutput],
});
const pichetPrompt = voiceBuilder.buildAgentPrompt({
  agent: 'pichet', tier: TIER, userState, engineOutputs: [biorhythmOutput],
});

// ─── 4. Run the Dyad ────────────────────────────────────────────────────

const provider = new OpenRouterProvider({
  api_key: OPENROUTER_API_KEY,
  site_name: 'WitnessAgents-Audit',
});

const dyad = new DyadInferenceEngine(provider, {
  parallel_agents: true,
  include_synthesis: true,
});

console.log('\n→ Running DyadInferenceEngine.infer() …');
const start = Date.now();
let result: Awaited<ReturnType<typeof dyad.infer>>;
let dyadError: string | undefined;
try {
  result = await dyad.infer(interpretation, userState, [biorhythmOutput]);
  const elapsed = Date.now() - start;
  console.log(`✓ Dyad complete in ${elapsed}ms (cost: $${result.total_cost_usd.toFixed(5)})`);
  console.log(`  aletheios: ${result.aletheios?.content.length ?? 0} chars`);
  console.log(`  pichet:    ${result.pichet?.content.length ?? 0} chars`);
  console.log(`  synthesis: ${result.synthesis?.content.length ?? 0} chars`);
} catch (err) {
  dyadError = (err as Error).message || JSON.stringify(err);
  console.error(`✗ Dyad inference failed: ${dyadError}`);
  result = {
    aletheios: undefined, pichet: undefined, synthesis: undefined,
    total_cost_usd: 0, total_latency_ms: Date.now() - start,
  };
}

// ─── 5. Voice consistency scoring ───────────────────────────────────────

const aletheiosScore = result.aletheios
  ? voiceBuilder.evaluateVoiceConsistency(result.aletheios.content, 'aletheios')
  : null;
const pichetScore = result.pichet
  ? voiceBuilder.evaluateVoiceConsistency(result.pichet.content, 'pichet')
  : null;

// ─── 6. Comparison: what standalone currently produces ─────────────────

const standaloneEquivalent = (() => {
  const physical = (biorhythmOutput.result as BiorhythmResult).physical;
  if (physical.percentage < 30) return 'What is your body protecting by slowing down today?';
  if (physical.percentage > 80) return 'What action wants to happen through you today?';
  return "What is the body's wisdom for this day?";
})();

// ─── 7. Pass/Fail evaluation ────────────────────────────────────────────

const aletheiosOk = !!result.aletheios && result.aletheios.content.length > 50;
const pichetOk = !!result.pichet && result.pichet.content.length > 50;
const synthOk = !!result.synthesis && result.synthesis.content.length > 50;
const voiceDiff = aletheiosScore && pichetScore
  ? aletheiosScore.analytical_precision >= pichetScore.analytical_precision
    && pichetScore.embodied_warmth >= aletheiosScore.embodied_warmth
  : false;

const allPassed = !dyadError && aletheiosOk && pichetOk && synthOk;

// ─── 8. Write report ────────────────────────────────────────────────────

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = join(process.cwd(), 'audit-output');
const outPath = join(outDir, `dyad-audit-${ts}.md`);
await mkdir(outDir, { recursive: true });

function blockquote(s: string | undefined): string {
  if (!s) return '_(empty)_';
  return s.split('\n').map(l => '> ' + l).join('\n');
}

const report = `# Dyad Pipeline Audit — ${ts}

## Configuration
- **Tier:** \`${TIER}\` (kosha: ${KOSHA_FOR_TIER[TIER]}, clifford: ${CLIFFORD_FOR_TIER[TIER]})
- **Selemene source:** ${USE_FIXTURE ? 'fixture (synthetic biorhythm)' : SELEMENE_API_URL}${selemeneError ? ` _(live call failed: ${selemeneError} — fell back to fixture)_` : ''}
- **OpenRouter:** configured
- **Birth data:** \`${JSON.stringify(birthData)}\`
- **Total LLM latency:** ${result.total_latency_ms}ms
- **Total cost:** $${result.total_cost_usd.toFixed(5)}
${dyadError ? `\n> ⚠️ **DyadInferenceEngine.infer() threw:** \`${dyadError}\`` : ''}

---

## 1. Selemene input (biorhythm engine output)

\`\`\`json
${JSON.stringify(biorhythmOutput, null, 2)}
\`\`\`

---

## 2. Voice system prompts (LLM input)

### Aletheios (≈${aletheiosPrompt.token_estimate} tokens)

\`\`\`
${aletheiosPrompt.system}
\`\`\`

### Pichet (≈${pichetPrompt.token_estimate} tokens)

\`\`\`
${pichetPrompt.system}
\`\`\`

---

## 3. Dyad output (LLM responses)

### Aletheios

- **Model:** \`${result.aletheios?.model_used || 'N/A'}\`
- **Latency:** ${result.aletheios?.latency_ms ?? 0}ms
- **Tokens:** ${result.aletheios?.usage.total_tokens ?? 0} (prompt ${result.aletheios?.usage.prompt_tokens ?? 0} + completion ${result.aletheios?.usage.completion_tokens ?? 0})
- **Cost:** $${result.aletheios?.cost_estimate_usd?.toFixed(5) ?? '0.00000'}
- **Length:** ${result.aletheios?.content.length ?? 0} chars

${blockquote(result.aletheios?.content)}

**Voice consistency score (Aletheios):**
${aletheiosScore ? `
| metric | value |
|---|---|
| analytical_precision | ${aletheiosScore.analytical_precision.toFixed(2)} |
| embodied_warmth | ${aletheiosScore.embodied_warmth.toFixed(2)} |
| anti_dependency | ${aletheiosScore.anti_dependency.toFixed(2)} |
| appropriate_depth | ${aletheiosScore.appropriate_depth.toFixed(2)} |
| **overall** | **${aletheiosScore.overall.toFixed(2)}** |` : '_(not run)_'}

### Pichet

- **Model:** \`${result.pichet?.model_used || 'N/A'}\`
- **Latency:** ${result.pichet?.latency_ms ?? 0}ms
- **Tokens:** ${result.pichet?.usage.total_tokens ?? 0} (prompt ${result.pichet?.usage.prompt_tokens ?? 0} + completion ${result.pichet?.usage.completion_tokens ?? 0})
- **Cost:** $${result.pichet?.cost_estimate_usd?.toFixed(5) ?? '0.00000'}
- **Length:** ${result.pichet?.content.length ?? 0} chars

${blockquote(result.pichet?.content)}

**Voice consistency score (Pichet):**
${pichetScore ? `
| metric | value |
|---|---|
| analytical_precision | ${pichetScore.analytical_precision.toFixed(2)} |
| embodied_warmth | ${pichetScore.embodied_warmth.toFixed(2)} |
| anti_dependency | ${pichetScore.anti_dependency.toFixed(2)} |
| appropriate_depth | ${pichetScore.appropriate_depth.toFixed(2)} |
| **overall** | **${pichetScore.overall.toFixed(2)}** |` : '_(not run)_'}

### Synthesis

- **Model:** \`${result.synthesis?.model_used || 'N/A'}\`
- **Latency:** ${result.synthesis?.latency_ms ?? 0}ms
- **Tokens:** ${result.synthesis?.usage.total_tokens ?? 0}
- **Cost:** $${result.synthesis?.cost_estimate_usd?.toFixed(5) ?? '0.00000'}
- **Length:** ${result.synthesis?.content.length ?? 0} chars

${blockquote(result.synthesis?.content)}

---

## 4. Comparison: what the running standalone currently produces

The deployed \`POST /reading\` and Selemene proxy paths produce a **single** witness question. For the same biorhythm input, the templated equivalent is:

> ${standaloneEquivalent}

That is the entire Layer-2 output today (≤140 chars, no Aletheios voice, no Pichet voice, no synthesis).

---

## 5. Pass / fail verification

| # | Criterion | Result |
|---|---|---|
| 1 | Imports resolve / no type errors | ${dyadError ? '⚠️ runtime error (see above)' : '✅ script ran'} |
| 2 | Selemene call succeeds | ${USE_FIXTURE ? '⏭️ fixture used' : selemeneError ? `❌ ${selemeneError}` : '✅'} |
| 3a | Aletheios content > 50 chars | ${aletheiosOk ? '✅' : '❌'} (${result.aletheios?.content.length ?? 0} chars) |
| 3b | Pichet content > 50 chars | ${pichetOk ? '✅' : '❌'} (${result.pichet?.content.length ?? 0} chars) |
| 4 | Synthesis non-empty third voice | ${synthOk ? '✅' : '❌'} (${result.synthesis?.content.length ?? 0} chars) |
| 5 | Voice differentiation visible | ${voiceDiff ? '✅ analytical-bias for Aletheios; somatic-bias for Pichet' : '⚠️ markers do not separate cleanly — manual review needed'} |

**Verdict:** ${allPassed ? '**PASS** — all three voices produced non-trivial output. The orphaned Dyad pipeline is functionally intact. Greenlight to plan Option 1 (wire into standalone-api.ts).' : '**INCOMPLETE / FAIL** — see per-criterion results above.'}

---

## 6. Cost & latency summary

| call | model | tokens | latency | cost |
|---|---|---|---|---|
| aletheios | \`${result.aletheios?.model_used || 'N/A'}\` | ${result.aletheios?.usage.total_tokens ?? 0} | ${result.aletheios?.latency_ms ?? 0}ms | $${result.aletheios?.cost_estimate_usd?.toFixed(5) ?? '0.00000'} |
| pichet | \`${result.pichet?.model_used || 'N/A'}\` | ${result.pichet?.usage.total_tokens ?? 0} | ${result.pichet?.latency_ms ?? 0}ms | $${result.pichet?.cost_estimate_usd?.toFixed(5) ?? '0.00000'} |
| synthesis | \`${result.synthesis?.model_used || 'N/A'}\` | ${result.synthesis?.usage.total_tokens ?? 0} | ${result.synthesis?.latency_ms ?? 0}ms | $${result.synthesis?.cost_estimate_usd?.toFixed(5) ?? '0.00000'} |
| **total** | | **${(result.aletheios?.usage.total_tokens ?? 0) + (result.pichet?.usage.total_tokens ?? 0) + (result.synthesis?.usage.total_tokens ?? 0)}** | **${result.total_latency_ms}ms** | **$${result.total_cost_usd.toFixed(5)}** |
`;

await writeFile(outPath, report, 'utf-8');
console.log(`\n✓ Report written: ${outPath}`);
console.log(`\n=== Verdict: ${allPassed ? 'PASS' : 'INCOMPLETE / FAIL'} ===`);

if (!allPassed) {
  process.exitCode = 1;
}
