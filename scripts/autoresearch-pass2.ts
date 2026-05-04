// ─── Autoresearch Pass 2 — Multi-Prompt Validation ────────────────────
// Tests top candidates from Pass 1 across 3 different witness prompts.
// Goal: confirm winners aren't overfit to one query.
// Improvements over Pass 1:
//   - Lenient judge JSON extractor (strip markdown fences, multiple regex)
//   - 3 different production-realistic queries (relationship / vocation / spiritual)
//   - Score = mean across 3 prompts (variance proxy)
//
// Output:
//   ~/.claude/MEMORY/WORK/autoresearch-witness-models-2026-05-05/pass2-results.tsv
//   ~/.claude/MEMORY/WORK/autoresearch-witness-models-2026-05-05/pass2-transcripts.md

import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { NvidiaProvider } from '../src/inference/nvidia.js';

const key = process.env.NVIDIA_API_KEY;
if (!key) { console.error('NVIDIA_API_KEY required'); process.exit(1); }

const OUT = join(homedir(), '.claude/MEMORY/WORK/autoresearch-witness-models-2026-05-05');
mkdirSync(OUT, { recursive: true });
const TSV = join(OUT, 'pass2-results.tsv');
const TX  = join(OUT, 'pass2-transcripts.md');

writeFileSync(TSV, 'id\trole\tmodel\tprompt_id\tlatency_ms\ttokens\tvoice\tinsight\tconciseness\ttotal\tnotes\n');
writeFileSync(TX, `# Pass 2 Transcripts — Multi-Prompt Validation\n\nDate: 2026-05-05\n\n`);

// ════════════════════════════════════════════════════════════════════
// PROMPTS — 3 different production-realistic witness queries
// ════════════════════════════════════════════════════════════════════

const PROMPTS = [
  { id: 'P1-relationship', text: 'I keep noticing the same conflict surface in different relationships. What is the pattern asking me to see?' },
  { id: 'P2-vocation',     text: 'I have built three businesses and walked away from each before they could compound. What am I avoiding by keeping things in motion?' },
  { id: 'P3-grief',        text: 'My grandmother died last week and I felt nothing at the funeral. Today, hearing a stranger laugh in a way that sounded like her, I broke. What is happening in me?' },
];

// ════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS — production VoicePromptBuilder output, subscriber tier
// ════════════════════════════════════════════════════════════════════

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
// CANDIDATES — top performers from Pass 1 + the 3 retest items
// ════════════════════════════════════════════════════════════════════

interface Candidate { model: string; max_tokens: number; }

const ALETHEIOS_CANDIDATES: Candidate[] = [
  { model: 'mistralai/mistral-medium-3.5-128b',          max_tokens: 768  }, // Pass 1 winner
  { model: 'openai/gpt-oss-120b',                        max_tokens: 1536 }, // Pass 1 #2
  { model: 'moonshotai/kimi-k2-instruct',                max_tokens: 768  }, // Pass 1 #3 (tied)
  { model: 'moonshotai/kimi-k2-instruct-0905',           max_tokens: 768  }, // Pass 1 baseline
  { model: 'openai/gpt-oss-20b',                         max_tokens: 2048 }, // Pass 1 retest (bumped tokens)
  { model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',   max_tokens: 2048 }, // Pass 1 retest (bumped tokens)
];

const PICHET_CANDIDATES: Candidate[] = [
  { model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',   max_tokens: 2048 }, // Pass 1 winner
  { model: 'openai/gpt-oss-120b',                        max_tokens: 1536 }, // Pass 1 #2
  { model: 'moonshotai/kimi-k2-instruct',                max_tokens: 768  }, // Pass 1 #3
  { model: 'sarvamai/sarvam-m',                          max_tokens: 768  }, // Pass 1 #4
  { model: 'minimaxai/minimax-m2.7',                     max_tokens: 2048 }, // Pass 1 baseline retest (bumped)
  { model: 'z-ai/glm4.7',                                max_tokens: 2048 }, // Pass 1 #5 retest
];

// ════════════════════════════════════════════════════════════════════
// LENIENT JUDGE — strips fences, multi-regex, accepts loose JSON
// ════════════════════════════════════════════════════════════════════

const JUDGE_MODEL = 'openai/gpt-oss-120b';

function buildJudgePrompt(role: 'aletheios' | 'pichet', userQuery: string, response: string): string {
  const voiceSpec = role === 'aletheios'
    ? `Aletheios: analytical clarity + compassionate precision; cartographer who walked every road; grounded, direct, never condescending; creates conditions for user to see; NEVER prescribes.`
    : `Pichet: embodied warmth + instinctive directness; companion who walked beside user through heat and dust; lands insight in the body; somatic, present-tense.`;

  return `Score this single witness response on three axes (0-10 each). Be strict; use the full scale.

ROLE: ${role}
VOICE: ${voiceSpec}
QUERY: "${userQuery}"
TARGET LENGTH: 2-4 sentences. Plain language.

RESPONSE:
"""
${response}
"""

Return ONLY one JSON object, no prose, no fences:
{"voice": <0-10>, "insight": <0-10>, "conciseness": <0-10>, "notes": "<≤12 words>"}`;
}

function extractJson(raw: string): any | null {
  if (!raw) return null;
  // Strip markdown fences
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // Try greedy match
  const candidates = [
    text.match(/\{[\s\S]*\}/),
    text.match(/\{[^{}]*"conciseness"[^{}]*\}/),
    text.match(/\{[\s\S]*?"notes"[^"]*"[^"]*"\s*\}/),
  ];
  for (const m of candidates) {
    if (!m) continue;
    try { return JSON.parse(m[0]); } catch { /* try next */ }
  }
  // Try line-by-line key extraction as last resort
  const v = text.match(/"voice"\s*:\s*(\d+)/);
  const i = text.match(/"insight"\s*:\s*(\d+)/);
  const c = text.match(/"conciseness"\s*:\s*(\d+)/);
  const n = text.match(/"notes"\s*:\s*"([^"]*)"/);
  if (v && i && c) return { voice: +v[1], insight: +i[1], conciseness: +c[1], notes: n ? n[1] : '' };
  return null;
}

const provider = new NvidiaProvider({ api_key: key, timeout_ms: 120_000 });

interface RunResult {
  role: 'aletheios' | 'pichet';
  model: string;
  prompt_id: string;
  prompt_text: string;
  latency_ms: number;
  tokens: number;
  content: string;
  scores?: { voice: number; insight: number; conciseness: number; notes: string; total: number };
  error?: string;
}

async function runOne(role: 'aletheios' | 'pichet', cand: Candidate, prompt: typeof PROMPTS[0]): Promise<RunResult> {
  const system = role === 'aletheios' ? ALETHEIOS_SYSTEM : PICHET_SYSTEM;
  const start = Date.now();
  try {
    const res = await provider.completeWithRetry({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt.text },
      ],
      model_role: role,
      tier: 'subscriber',
      model_override: cand.model,
      max_tokens_override: cand.max_tokens,
      temperature_override: role === 'aletheios' ? 0.4 : 0.6,
    }, 1);
    return { role, model: cand.model, prompt_id: prompt.id, prompt_text: prompt.text,
             latency_ms: Date.now() - start, tokens: res.usage.completion_tokens, content: res.content };
  } catch (e: any) {
    return { role, model: cand.model, prompt_id: prompt.id, prompt_text: prompt.text,
             latency_ms: Date.now() - start, tokens: 0, content: '', error: e.message || String(e) };
  }
}

async function judge(r: RunResult): Promise<RunResult> {
  if (r.error || !r.content) return r;
  try {
    const judgeRes = await provider.completeWithRetry({
      messages: [
        { role: 'system', content: 'You are a strict scoring judge. Output ONLY one JSON object.' },
        { role: 'user', content: buildJudgePrompt(r.role, r.prompt_text, r.content) },
      ],
      model_role: 'fast',
      tier: 'enterprise',
      model_override: JUDGE_MODEL,
      max_tokens_override: 768,
      temperature_override: 0,
    }, 2);
    const parsed = extractJson(judgeRes.content);
    if (!parsed) { r.error = `judge no-json after lenient parse`; return r; }
    const v = Number(parsed.voice) || 0;
    const i = Number(parsed.insight) || 0;
    const c = Number(parsed.conciseness) || 0;
    r.scores = { voice: v, insight: i, conciseness: c, notes: String(parsed.notes || '').slice(0, 80), total: v + i + c };
  } catch (e: any) { r.error = `judge: ${e.message || e}`; }
  return r;
}

// ════════════════════════════════════════════════════════════════════
// RUN
// ════════════════════════════════════════════════════════════════════

console.log('=== Pass 2: Multi-Prompt Validation ===\n');

let id = 0;
const allResults: RunResult[] = [];

for (const role of ['aletheios', 'pichet'] as const) {
  console.log(`\n── ROLE: ${role} ──`);
  const candidates = role === 'aletheios' ? ALETHEIOS_CANDIDATES : PICHET_CANDIDATES;

  for (const cand of candidates) {
    console.log(`  ${cand.model}`);
    for (const prompt of PROMPTS) {
      id++;
      process.stdout.write(`    [${String(id).padStart(2)}] ${prompt.id}  `);
      let r = await runOne(role, cand, prompt);
      if (!r.error) r = await judge(r);
      const scoreStr = r.scores
        ? `V${r.scores.voice} I${r.scores.insight} C${r.scores.conciseness} = ${r.scores.total}/30`
        : `ERR ${r.error?.slice(0, 50) || ''}`;
      console.log(`${r.latency_ms}ms ${r.tokens}tk  ${scoreStr}`);

      appendFileSync(TSV,
        [id, r.role, r.model, r.prompt_id, r.latency_ms, r.tokens,
         r.scores?.voice ?? '', r.scores?.insight ?? '', r.scores?.conciseness ?? '',
         r.scores?.total ?? '',
         (r.scores?.notes || r.error || '').replace(/\t/g, ' ').replace(/\n/g, ' '),
        ].join('\t') + '\n');

      appendFileSync(TX,
        `\n## #${id} · ${role} · ${r.model} · ${r.prompt_id}\n\n` +
        `**Latency:** ${r.latency_ms}ms · **Tokens:** ${r.tokens}\n\n` +
        (r.scores
          ? `**Score:** V${r.scores.voice} I${r.scores.insight} C${r.scores.conciseness} → **${r.scores.total}/30**\n` +
            `**Judge notes:** ${r.scores.notes}\n\n`
          : `**Error:** ${r.error}\n\n`) +
        `---\n\n${r.content || '(empty)'}\n\n`);
      allResults.push(r);
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// AGGREGATE — mean score per (role, model) across 3 prompts
// ════════════════════════════════════════════════════════════════════

console.log('\n=== AGGREGATED (mean of 3 prompts) ===');
const summary: string[] = ['\n## Summary — Mean Score Across 3 Prompts\n'];

for (const role of ['aletheios', 'pichet'] as const) {
  const byModel = new Map<string, RunResult[]>();
  for (const r of allResults) {
    if (r.role !== role) continue;
    const arr = byModel.get(r.model) || [];
    arr.push(r);
    byModel.set(r.model, arr);
  }

  const agg: { model: string; n_scored: number; n_total: number; mean_total: number; mean_v: number; mean_i: number; mean_c: number; mean_latency: number; }[] = [];
  for (const [model, runs] of byModel) {
    const scored = runs.filter(r => r.scores);
    const n = scored.length;
    if (n === 0) {
      agg.push({ model, n_scored: 0, n_total: runs.length, mean_total: 0, mean_v: 0, mean_i: 0, mean_c: 0,
                 mean_latency: runs.reduce((a, r) => a + r.latency_ms, 0) / runs.length });
      continue;
    }
    agg.push({
      model,
      n_scored: n,
      n_total: runs.length,
      mean_total: scored.reduce((a, r) => a + r.scores!.total, 0) / n,
      mean_v:     scored.reduce((a, r) => a + r.scores!.voice, 0) / n,
      mean_i:     scored.reduce((a, r) => a + r.scores!.insight, 0) / n,
      mean_c:     scored.reduce((a, r) => a + r.scores!.conciseness, 0) / n,
      mean_latency: runs.reduce((a, r) => a + r.latency_ms, 0) / runs.length,
    });
  }
  agg.sort((a, b) => (b.mean_total - a.mean_total) || (a.mean_latency - b.mean_latency));

  console.log(`\n  ${role}:`);
  summary.push(`### ${role}\n`);
  summary.push(`| Rank | Model | Mean /30 | V | I | C | Latency | Coverage |`);
  summary.push(`|------|-------|----------|---|---|---|---------|----------|`);
  agg.forEach((a, i) => {
    const line = `    ${String(i + 1).padStart(2)}. ${a.mean_total.toFixed(1).padStart(4)}/30  V${a.mean_v.toFixed(1)} I${a.mean_i.toFixed(1)} C${a.mean_c.toFixed(1)}  ${Math.round(a.mean_latency)}ms  (${a.n_scored}/${a.n_total} scored)  ${a.model}`;
    console.log(line);
    summary.push(`| ${i + 1} | \`${a.model}\` | **${a.mean_total.toFixed(1)}** | ${a.mean_v.toFixed(1)} | ${a.mean_i.toFixed(1)} | ${a.mean_c.toFixed(1)} | ${Math.round(a.mean_latency)}ms | ${a.n_scored}/${a.n_total} |`);
  });
  summary.push('');
}

appendFileSync(TX, summary.join('\n'));
console.log(`\nLogs: ${OUT}/pass2-*`);
