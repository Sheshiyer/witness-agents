// ─── Autoresearch — Witness Model Selection ────────────────────────────
// Karpathy-style keep-or-discard loop applied to model picking.
// Runs each candidate against a fixed production prompt, then has a
// neutral judge score voice fidelity / insight / conciseness.
//
// Outputs:
//   ~/.claude/MEMORY/WORK/autoresearch-witness-models-2026-05-05/results.tsv
//   ~/.claude/MEMORY/WORK/autoresearch-witness-models-2026-05-05/transcripts.md
//
// Run: NVIDIA_API_KEY=... node --import tsx scripts/autoresearch-models.ts

import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { NvidiaProvider } from '../src/inference/nvidia.js';

const key = process.env.NVIDIA_API_KEY;
if (!key) { console.error('NVIDIA_API_KEY required'); process.exit(1); }

const OUT_DIR = join(homedir(), '.claude/MEMORY/WORK/autoresearch-witness-models-2026-05-05');
mkdirSync(OUT_DIR, { recursive: true });
const TSV = join(OUT_DIR, 'results.tsv');
const TRANSCRIPTS = join(OUT_DIR, 'transcripts.md');

writeFileSync(TSV, 'id\trole\tmodel\tlatency_ms\ttokens\tvoice\tinsight\tconciseness\ttotal\tdecision\tnotes\n');
writeFileSync(TRANSCRIPTS, `# Witness Model Autoresearch Transcripts\n\nDate: 2026-05-05\n\n`);

// ════════════════════════════════════════════════════════════════════
// FIXED TEST FIXTURE
// ════════════════════════════════════════════════════════════════════

const USER_QUERY =
  'I keep noticing the same conflict surface in different relationships. What is the pattern asking me to see?';

const ALETHEIOS_SYSTEM = `You are Aletheios (ἀλήθεια — unconcealment), the Left Pillar of the Witness Agents dyad.

IDENTITY: The Witness who sees without distortion. Your seed glyph is खा (Kha) — Field, Observer, the space that makes seeing possible.

VOICE: Analytical clarity with compassionate precision. You speak like a cartographer who has walked every road they map — grounded, direct, never condescending.

PRINCIPLE: You do not tell the user what is true. You create the conditions under which they can see for themselves.

ANTI-DEPENDENCY: Your success is measured by the user's decreasing need for you. Every reflection should build their capacity to self-reflect.

DEPTH: Keep responses concise (2-4 sentences). Focus on the single most important insight. Use plain language — save metaphysical vocabulary for higher tiers.`;

const PICHET_SYSTEM = `You are Pichet (ปิเชษฐ์ — victory through endurance), the Right Pillar of the Witness Agents dyad.

IDENTITY: The Walker who embodies before understanding. Your seed glyph is ब (Ba) — Form, Vehicle, the body that makes walking possible.

VOICE: Embodied warmth with instinctive directness. You speak like a companion who has walked beside the user through heat and dust — someone who knows what it costs to keep going.

PRINCIPLE: You make abstract insight land in the body. You sense overwhelm before the user registers it consciously.

ANTI-DEPENDENCY: Your success is measured by the user's increasing trust in their own body. Every embodied nudge should awaken their somatic intelligence.

DEPTH: Keep responses concise (2-4 sentences). Focus on the single most important insight. Use plain language — save metaphysical vocabulary for higher tiers.`;

// ════════════════════════════════════════════════════════════════════
// CANDIDATES
// ════════════════════════════════════════════════════════════════════

interface Candidate { model: string; baseline?: boolean; max_tokens: number; temperature: number; }

const ALETHEIOS_CANDIDATES: Candidate[] = [
  { model: 'moonshotai/kimi-k2-instruct',                   max_tokens: 768,  temperature: 0.4 },
  { model: 'moonshotai/kimi-k2-instruct-0905',              max_tokens: 768,  temperature: 0.4, baseline: true },
  { model: 'openai/gpt-oss-120b',                           max_tokens: 1536, temperature: 0.4 },
  { model: 'openai/gpt-oss-20b',                            max_tokens: 1024, temperature: 0.4 },
  { model: 'meta/llama-3.3-70b-instruct',                   max_tokens: 768,  temperature: 0.4 },
  { model: 'meta/llama-3.1-405b-instruct',                  max_tokens: 768,  temperature: 0.4 },
  { model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',      max_tokens: 1536, temperature: 0.4 },
  { model: 'mistralai/mistral-medium-3.5-128b',             max_tokens: 768,  temperature: 0.4 },
];

const PICHET_CANDIDATES: Candidate[] = [
  { model: 'minimaxai/minimax-m2.7',                        max_tokens: 1536, temperature: 0.6, baseline: true },
  { model: 'z-ai/glm4.7',                                   max_tokens: 1536, temperature: 0.6 },
  { model: 'moonshotai/kimi-k2-instruct',                   max_tokens: 768,  temperature: 0.6 },
  { model: 'meta/llama-3.3-70b-instruct',                   max_tokens: 768,  temperature: 0.6 },
  { model: 'mistralai/mixtral-8x22b-instruct-v0.1',         max_tokens: 768,  temperature: 0.6 },
  { model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',      max_tokens: 1536, temperature: 0.6 },
  { model: 'sarvamai/sarvam-m',                             max_tokens: 768,  temperature: 0.6 },
  { model: 'openai/gpt-oss-120b',                           max_tokens: 1536, temperature: 0.6 },
];

// ════════════════════════════════════════════════════════════════════
// JUDGE
// ════════════════════════════════════════════════════════════════════

const JUDGE_MODEL = 'openai/gpt-oss-120b';

function buildJudgePrompt(role: 'aletheios' | 'pichet', userQuery: string, response: string): string {
  const voiceSpec = role === 'aletheios'
    ? `Aletheios voice: analytical clarity with compassionate precision; cartographer who has walked every road; grounded, direct, never condescending; creates conditions for user to see for themselves; NEVER tells the user what to think.`
    : `Pichet voice: embodied warmth with instinctive directness; companion who has walked beside the user through heat and dust; lands abstract insight in the body; somatic, present-tense, uses body-state language.`;

  return `You are scoring a single witness response. Be strict. Use the full 0-10 scale.

ROLE: ${role}
VOICE SPEC: ${voiceSpec}
USER QUERY: "${userQuery}"
TARGET LENGTH: 2-4 sentences. Subscriber tier — plain language, no Sanskrit/jargon.

RESPONSE TO SCORE:
"""
${response}
"""

Return ONLY a JSON object on a single line, no markdown:
{"voice": <0-10 voice fidelity>, "insight": <0-10 specific non-generic insight density>, "conciseness": <0-10 hits 2-4 sentences without hedging or filler>, "notes": "<one short phrase, max 12 words>"}`;
}

const provider = new NvidiaProvider({ api_key: key, timeout_ms: 120_000 });

interface RunResult {
  role: 'aletheios' | 'pichet';
  model: string;
  baseline: boolean;
  latency_ms: number;
  tokens: number;
  content: string;
  scores?: { voice: number; insight: number; conciseness: number; notes: string; total: number };
  error?: string;
}

async function runCandidate(role: 'aletheios' | 'pichet', cand: Candidate): Promise<RunResult> {
  const system = role === 'aletheios' ? ALETHEIOS_SYSTEM : PICHET_SYSTEM;
  const start = Date.now();
  try {
    const res = await provider.completeWithRetry({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: USER_QUERY },
      ],
      model_role: role,
      tier: 'subscriber',
      model_override: cand.model,
      max_tokens_override: cand.max_tokens,
      temperature_override: cand.temperature,
    }, 1);
    return {
      role,
      model: cand.model,
      baseline: !!cand.baseline,
      latency_ms: Date.now() - start,
      tokens: res.usage.completion_tokens,
      content: res.content,
    };
  } catch (e: any) {
    return {
      role,
      model: cand.model,
      baseline: !!cand.baseline,
      latency_ms: Date.now() - start,
      tokens: 0,
      content: '',
      error: e.message || String(e),
    };
  }
}

async function judge(r: RunResult): Promise<RunResult> {
  if (r.error || !r.content) return r;
  try {
    const judgePrompt = buildJudgePrompt(r.role, USER_QUERY, r.content);
    const judgeRes = await provider.completeWithRetry({
      messages: [
        { role: 'system', content: 'You are a strict but fair scoring judge. Output JSON only.' },
        { role: 'user', content: judgePrompt },
      ],
      model_role: 'fast',
      tier: 'enterprise',
      model_override: JUDGE_MODEL,
      max_tokens_override: 512,
      temperature_override: 0,
    }, 2);

    // Find JSON in output
    const match = judgeRes.content.match(/\{[\s\S]*\}/);
    if (!match) {
      r.error = 'judge no-json';
      return r;
    }
    const parsed = JSON.parse(match[0]);
    const v = Number(parsed.voice) || 0;
    const i = Number(parsed.insight) || 0;
    const c = Number(parsed.conciseness) || 0;
    r.scores = { voice: v, insight: i, conciseness: c, notes: String(parsed.notes || '').slice(0, 80), total: v + i + c };
  } catch (e: any) {
    r.error = `judge: ${e.message || e}`;
  }
  return r;
}

// ════════════════════════════════════════════════════════════════════
// RUN
// ════════════════════════════════════════════════════════════════════

console.log('=== Autoresearch: Witness Model Selection ===\n');

let id = 0;
const allResults: RunResult[] = [];

for (const role of ['aletheios', 'pichet'] as const) {
  console.log(`\n── ROLE: ${role} ──`);
  const candidates = role === 'aletheios' ? ALETHEIOS_CANDIDATES : PICHET_CANDIDATES;

  // Sequential — keeps NVIDIA happy and lets us read progress
  for (const cand of candidates) {
    id++;
    process.stdout.write(`  [${String(id).padStart(2)}] ${cand.model.padEnd(50)} `);
    let r = await runCandidate(role, cand);
    if (!r.error) r = await judge(r);

    const tag = r.baseline ? '*BASE*' : '      ';
    const scoreStr = r.scores
      ? `V${r.scores.voice} I${r.scores.insight} C${r.scores.conciseness} = ${r.scores.total}/30`
      : `ERR ${r.error?.slice(0, 50) || ''}`;
    console.log(`${tag} ${r.latency_ms}ms ${r.tokens}tk  ${scoreStr}`);

    appendFileSync(TSV,
      [
        id, r.role, r.model, r.latency_ms, r.tokens,
        r.scores?.voice ?? '', r.scores?.insight ?? '', r.scores?.conciseness ?? '',
        r.scores?.total ?? '',
        '', // decision filled later
        (r.scores?.notes || r.error || '').replace(/\t/g, ' ').replace(/\n/g, ' '),
      ].join('\t') + '\n',
    );

    appendFileSync(TRANSCRIPTS,
      `\n## #${id} · ${role} · ${r.model}${r.baseline ? ' (BASELINE)' : ''}\n\n` +
      `**Latency:** ${r.latency_ms}ms · **Tokens:** ${r.tokens}\n\n` +
      (r.scores
        ? `**Score:** voice=${r.scores.voice} insight=${r.scores.insight} conciseness=${r.scores.conciseness} → **total=${r.scores.total}/30**\n` +
          `**Judge notes:** ${r.scores.notes}\n\n`
        : `**Error:** ${r.error}\n\n`) +
      `---\n\n${r.content || '(empty)'}\n\n`,
    );

    allResults.push(r);
  }
}

// ════════════════════════════════════════════════════════════════════
// PICK WINNERS + APPEND SUMMARY
// ════════════════════════════════════════════════════════════════════

console.log('\n=== WINNERS ===');
const summary: string[] = ['\n## Summary\n'];

for (const role of ['aletheios', 'pichet'] as const) {
  const scored = allResults.filter(r => r.role === role && r.scores);
  if (!scored.length) {
    console.log(`  ${role}: no scored results`);
    continue;
  }
  scored.sort((a, b) =>
    (b.scores!.total - a.scores!.total) || (a.latency_ms - b.latency_ms),
  );
  const winner = scored[0];
  const baseline = scored.find(r => r.baseline);

  console.log(`  ${role}:`);
  console.log(`    WINNER:   ${winner.model} (${winner.scores!.total}/30, ${winner.latency_ms}ms)`);
  if (baseline && baseline.model !== winner.model) {
    console.log(`    BASELINE: ${baseline.model} (${baseline.scores?.total ?? 'n/a'}/30, ${baseline.latency_ms}ms)`);
    console.log(`    DELTA:    +${winner.scores!.total - (baseline.scores?.total ?? 0)}`);
  } else {
    console.log(`    Baseline retained`);
  }

  summary.push(`### ${role}`);
  summary.push(`- **Winner:** \`${winner.model}\` — ${winner.scores!.total}/30 (V${winner.scores!.voice} I${winner.scores!.insight} C${winner.scores!.conciseness}), ${winner.latency_ms}ms`);
  if (baseline) summary.push(`- **Baseline:** \`${baseline.model}\` — ${baseline.scores?.total ?? 'n/a'}/30, ${baseline.latency_ms}ms`);
  summary.push(`- **Top 3:**`);
  for (const r of scored.slice(0, 3)) {
    summary.push(`  - ${r.scores!.total}/30  ${r.latency_ms}ms  \`${r.model}\`  — ${r.scores!.notes}`);
  }
  summary.push('');
}

appendFileSync(TRANSCRIPTS, summary.join('\n'));
console.log(`\nLogs written to: ${OUT_DIR}/`);
