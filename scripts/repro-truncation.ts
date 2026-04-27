// ─── Truncation Repro — buildLayer2WithLLM ─────────────────────────
// Calls the same OpenRouter request that production buildLayer2WithLLM builds,
// using the EXACT biorhythm payload that 48.tryambakam.space just truncated.
// Logs the RAW response.content + finish_reason + usage so we can see whether
// the LLM is truncating or our code is.
//
// Run:
//   export OPENROUTER_API_KEY=sk-or-v1-...
//   node --import tsx scripts/repro-truncation.ts

import { OpenRouterProvider } from '../src/inference/openrouter.js';
import type { InferenceMessage, InferenceRequest } from '../src/inference/types.js';
import type { Tier } from '../src/types/interpretation.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
if (!OPENROUTER_API_KEY) {
  console.error('FATAL: OPENROUTER_API_KEY not set');
  process.exit(1);
}

// Production tier on 48.tryambakam.space (per recent commit c3c1702)
const STANDALONE_TIER = 'witness-initiate';
const CORE_TIER: Tier = 'initiate';

// EXACT result block from 48.tryambakam.space biorhythm response
const productionBiorhythmResult = {
  critical_days: [],
  days_alive: 12676,
  emotional: { cycle_day: 20, days_until_critical: 8, days_until_peak: 15, is_critical: false, percentage: 1.2536, phase: 'Low', value: -0.97 },
  intellectual: { cycle_day: 4, days_until_critical: 13, days_until_peak: 5, is_critical: false, percentage: 84.5, phase: 'Rising', value: 0.69 },
  intuitive: { cycle_day: 22, days_until_critical: 16, days_until_peak: 26, is_critical: false, percentage: 26.2, phase: 'Falling', value: -0.48 },
  physical: { cycle_day: 3, days_until_critical: 9, days_until_peak: 3, is_critical: false, percentage: 86.5, phase: 'Rising', value: 0.73 },
  mastery: 85.5,
  overall_energy: 57.4,
  passion: 43.9,
  wisdom: 42.9,
  target_date: '2026-04-27',
};

const ENGINE_ID = 'biorhythm';
const ENGINE_WITNESS_ROLE_VALUE = 'somatic-pulse';

// Decoder state matching what 48.* returned (fresh user)
const decoderState = { total_visits: 0, consecutive_days: 0, max_layer_reached: 1 };

// Replicate buildLayer2WithLLM system+user messages verbatim from daily-mirror.ts:487-512
const systemPrompt = [
  'You are Pichet, the somatic witness. You speak through the body, not about it.',
  'You ask ONE question that turns the person\'s attention inward.',
  '',
  'Rules:',
  '- Reference the SPECIFIC data provided (numbers, organ names, cycle phases)',
  '- Point INWARD, not outward. The question creates space, not explanation.',
  '- 1-2 sentences maximum. No preamble.',
  '- Never use: journey, path, healing, manifesting, abundance, vibration, authentic self',
  '- Voice: felt, somatic, body-aware. Like a skilled bodyworker asking one precise question.',
  '',
  `Engine: ${ENGINE_ID} (${ENGINE_WITNESS_ROLE_VALUE})`,
  `Days of practice: ${decoderState.total_visits}`,
  `Consecutive days: ${decoderState.consecutive_days}`,
  '',
].filter(Boolean).join('\n');

const dataSnippet = JSON.stringify(productionBiorhythmResult, null, 0).slice(0, 1200);

const messages: InferenceMessage[] = [
  { role: 'system', content: systemPrompt },
  {
    role: 'user',
    content: `Here is today's ${ENGINE_ID} reading data:\n\n${dataSnippet}\n\nGenerate one witness question.`,
  },
];

console.log('=== Truncation Repro ===');
console.log(`Tier:           ${STANDALONE_TIER} → core: ${CORE_TIER}`);
console.log(`System prompt:  ${systemPrompt.length} chars`);
console.log(`User message:   ${messages[1]!.content.length} chars`);
console.log(`Data snippet:   ${dataSnippet.length} chars`);

const provider = new OpenRouterProvider({
  api_key: OPENROUTER_API_KEY,
  site_url: 'https://tryambakam.space/daily-witness',
  site_name: 'The Daily Witness',
  timeout_ms: 15_000,
});

const resolved = provider.resolveModel(CORE_TIER, 'pichet');
console.log(`Resolved model: ${resolved.model_id} (default max_tokens=${resolved.max_tokens}, temp=${resolved.temperature})`);

const baseRequest: InferenceRequest = {
  messages,
  model_role: 'pichet',
  tier: CORE_TIER,
  max_tokens_override: 200,    // matches daily-mirror.ts:545
  temperature_override: 0.8,    // matches daily-mirror.ts:546
  metadata: { engine: ENGINE_ID, source: 'truncation-repro' },
};

console.log(`\n--- Running 3 iterations with max_tokens_override=200 ---\n`);

for (let i = 1; i <= 3; i++) {
  console.log(`### Iteration ${i}`);
  try {
    const start = Date.now();
    const response = await provider.complete(baseRequest);
    const elapsed = Date.now() - start;
    console.log(`  model_used:     ${response.model_used}`);
    console.log(`  finish_reason:  ${response.finish_reason}`);
    console.log(`  usage:          prompt=${response.usage.prompt_tokens} completion=${response.usage.completion_tokens} total=${response.usage.total_tokens}`);
    console.log(`  latency:        ${elapsed}ms (provider reports ${response.latency_ms}ms)`);
    console.log(`  content length: ${response.content.length} chars`);
    console.log(`  raw content:    ${JSON.stringify(response.content)}`);

    // Apply the same cleanup buildLayer2WithLLM does (line 552 in daily-mirror.ts)
    const cleaned = response.content.trim().replace(/^["']|["']$/g, '');
    console.log(`  after cleanup:  ${JSON.stringify(cleaned)} (${cleaned.length} chars)`);
    console.log('');
  } catch (err) {
    console.error(`  ERROR: ${(err as Error).message}`);
    console.error(`  full:`, err);
    console.log('');
  }
}

// ─── Also probe with a much larger max_tokens to see if that changes things ──
console.log(`--- Probe: same prompt with max_tokens_override=2048 ---\n`);
try {
  const probe = await provider.complete({
    ...baseRequest,
    max_tokens_override: 2048,
  });
  console.log(`  finish_reason: ${probe.finish_reason}`);
  console.log(`  completion_tokens: ${probe.usage.completion_tokens}`);
  console.log(`  content length: ${probe.content.length} chars`);
  console.log(`  raw content: ${JSON.stringify(probe.content)}`);
} catch (err) {
  console.error(`  ERROR: ${(err as Error).message}`);
}

// ─── Also probe with a different model that's known stable ───────────────
console.log(`\n--- Probe: same prompt forced to anthropic/claude-sonnet-4.6 ---\n`);
try {
  const probe = await provider.complete({
    ...baseRequest,
    model_override: 'anthropic/claude-sonnet-4.6',
    max_tokens_override: 200,
  });
  console.log(`  model_used:    ${probe.model_used}`);
  console.log(`  finish_reason: ${probe.finish_reason}`);
  console.log(`  completion_tokens: ${probe.usage.completion_tokens}`);
  console.log(`  content length: ${probe.content.length} chars`);
  console.log(`  raw content: ${JSON.stringify(probe.content)}`);
} catch (err) {
  console.error(`  ERROR: ${(err as Error).message}`);
}
