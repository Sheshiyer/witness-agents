// ─── Autoresearch Pass 3 — Cross-Judge Audit ──────────────────────────
// Re-scores Pass 2 responses with an ALTERNATE judge model.
// Goal: confirm Pass 2 winners aren't an artifact of gpt-oss-120b's scoring style.
//
// Reads:  pass2-transcripts.md (the actual responses generated in Pass 2)
// Writes: pass3-results.tsv  + agreement table
//
// Alternate judge: nvidia/nemotron-3-super-120b-a12b (different family, reasoning model)

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { NvidiaProvider } from '../src/inference/nvidia.js';

const key = process.env.NVIDIA_API_KEY;
if (!key) { console.error('NVIDIA_API_KEY required'); process.exit(1); }

const OUT = join(homedir(), '.claude/MEMORY/WORK/autoresearch-witness-models-2026-05-05');
mkdirSync(OUT, { recursive: true });
const TSV = join(OUT, 'pass3-results.tsv');

writeFileSync(TSV, 'id\trole\tmodel\tprompt_id\tjudge\tvoice\tinsight\tconciseness\ttotal\tnotes\n');

const PROMPTS_TEXT: Record<string, string> = {
  'P1-relationship': 'I keep noticing the same conflict surface in different relationships. What is the pattern asking me to see?',
  'P2-vocation':     'I have built three businesses and walked away from each before they could compound. What am I avoiding by keeping things in motion?',
  'P3-grief':        'My grandmother died last week and I felt nothing at the funeral. Today, hearing a stranger laugh in a way that sounded like her, I broke. What is happening in me?',
};

// ════════════════════════════════════════════════════════════════════
// PARSE PASS 2 TRANSCRIPTS
// ════════════════════════════════════════════════════════════════════

interface ParsedRun {
  id: string;
  role: 'aletheios' | 'pichet';
  model: string;
  prompt_id: string;
  content: string;
}

function parsePass2(): ParsedRun[] {
  const text = readFileSync(join(OUT, 'pass2-transcripts.md'), 'utf-8');
  // Sections: ## #N · role · model · prompt_id\n...---\n\n<content>\n\n
  const re = /## #(\d+) · (aletheios|pichet) · ([^·]+) · (P\d-\w+)\n[\s\S]*?---\n\n([\s\S]*?)(?=\n## #|\n## Summary|$)/g;
  const out: ParsedRun[] = [];
  let m;
  while ((m = re.exec(text))) {
    const content = m[5].trim();
    if (content && content !== '(empty)') {
      out.push({ id: m[1], role: m[2] as any, model: m[3].trim(), prompt_id: m[4], content });
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════
// JUDGES
// ════════════════════════════════════════════════════════════════════

const PRIMARY_JUDGE   = 'openai/gpt-oss-120b';
const ALTERNATE_JUDGE = 'nvidia/nemotron-3-super-120b-a12b';

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
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  for (const m of [text.match(/\{[\s\S]*\}/), text.match(/\{[^{}]*"conciseness"[^{}]*\}/)]) {
    if (!m) continue;
    try { return JSON.parse(m[0]); } catch { /* try next */ }
  }
  const v = text.match(/"voice"\s*:\s*(\d+)/);
  const i = text.match(/"insight"\s*:\s*(\d+)/);
  const c = text.match(/"conciseness"\s*:\s*(\d+)/);
  const n = text.match(/"notes"\s*:\s*"([^"]*)"/);
  if (v && i && c) return { voice: +v[1], insight: +i[1], conciseness: +c[1], notes: n ? n[1] : '' };
  return null;
}

const provider = new NvidiaProvider({ api_key: key, timeout_ms: 180_000 });

async function score(judgeModel: string, run: ParsedRun): Promise<{voice:number;insight:number;conciseness:number;total:number;notes:string} | string> {
  try {
    const userQuery = PROMPTS_TEXT[run.prompt_id];
    const res = await provider.completeWithRetry({
      messages: [
        { role: 'system', content: 'You are a strict scoring judge. Output ONLY one JSON object.' },
        { role: 'user', content: buildJudgePrompt(run.role, userQuery, run.content) },
      ],
      model_role: 'fast',
      tier: 'enterprise',
      model_override: judgeModel,
      max_tokens_override: 1024,
      temperature_override: 0,
    }, 2);
    const parsed = extractJson(res.content);
    if (!parsed) return 'no-json';
    const v = Number(parsed.voice) || 0;
    const i = Number(parsed.insight) || 0;
    const c = Number(parsed.conciseness) || 0;
    return { voice: v, insight: i, conciseness: c, total: v + i + c, notes: String(parsed.notes || '').slice(0, 80) };
  } catch (e: any) {
    return `err: ${e.message || e}`;
  }
}

// ════════════════════════════════════════════════════════════════════
// FILTER TO TOP CANDIDATES (top 4 per role from Pass 2)
// ════════════════════════════════════════════════════════════════════

const TOP_ALETHEIOS = new Set([
  'openai/gpt-oss-120b',
  'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  'openai/gpt-oss-20b',
  'mistralai/mistral-medium-3.5-128b',
]);
const TOP_PICHET = new Set([
  'openai/gpt-oss-120b',
  'moonshotai/kimi-k2-instruct',
  'sarvamai/sarvam-m',
  'z-ai/glm4.7',
]);

const allRuns = parsePass2();
const filtered = allRuns.filter(r =>
  (r.role === 'aletheios' && TOP_ALETHEIOS.has(r.model)) ||
  (r.role === 'pichet'    && TOP_PICHET.has(r.model)),
);
console.log(`Parsed ${allRuns.length} responses from Pass 2; scoring top ${filtered.length} with both judges.\n`);

interface AggregateRow {
  role: string;
  model: string;
  primary_mean: number;
  alt_mean: number;
  combined_mean: number;
  n_p: number;
  n_a: number;
}
const perRunRows: Array<{ role: string; model: string; prompt_id: string; primary?: number; alternate?: number }> = [];

let id = 0;
for (const run of filtered) {
  id++;
  process.stdout.write(`  [${String(id).padStart(2)}/${filtered.length}] ${run.role.padEnd(10)} ${run.model.padEnd(48)} ${run.prompt_id}  `);
  const [primary, alternate] = await Promise.all([
    score(PRIMARY_JUDGE, run),
    score(ALTERNATE_JUDGE, run),
  ]);

  const pStr = typeof primary === 'string' ? `P:${primary}`     : `P:${primary.total}`;
  const aStr = typeof alternate === 'string' ? `A:${alternate}` : `A:${alternate.total}`;
  console.log(`${pStr}  ${aStr}`);

  if (typeof primary !== 'string') {
    appendFileSync(TSV, [id, run.role, run.model, run.prompt_id, 'gpt-oss-120b',
      primary.voice, primary.insight, primary.conciseness, primary.total, primary.notes.replace(/\t/g,' ')].join('\t')+'\n');
  }
  if (typeof alternate !== 'string') {
    appendFileSync(TSV, [id, run.role, run.model, run.prompt_id, 'nemotron-3-super-120b',
      alternate.voice, alternate.insight, alternate.conciseness, alternate.total, alternate.notes.replace(/\t/g,' ')].join('\t')+'\n');
  }
  perRunRows.push({
    role: run.role, model: run.model, prompt_id: run.prompt_id,
    primary:   typeof primary   === 'string' ? undefined : primary.total,
    alternate: typeof alternate === 'string' ? undefined : alternate.total,
  });
}

// ════════════════════════════════════════════════════════════════════
// AGGREGATE BY MODEL × JUDGE
// ════════════════════════════════════════════════════════════════════

console.log('\n=== CROSS-JUDGE AGREEMENT ===\n');
const summary: string[] = ['\n## Pass 3 — Cross-Judge Agreement\n'];

for (const role of ['aletheios', 'pichet'] as const) {
  const byModel = new Map<string, typeof perRunRows>();
  for (const r of perRunRows) {
    if (r.role !== role) continue;
    if (!byModel.has(r.model)) byModel.set(r.model, []);
    byModel.get(r.model)!.push(r);
  }

  const agg: AggregateRow[] = [];
  for (const [model, runs] of byModel) {
    const pVals = runs.filter(r => r.primary   !== undefined).map(r => r.primary!);
    const aVals = runs.filter(r => r.alternate !== undefined).map(r => r.alternate!);
    const pm = pVals.length ? pVals.reduce((a,b)=>a+b,0)/pVals.length : 0;
    const am = aVals.length ? aVals.reduce((a,b)=>a+b,0)/aVals.length : 0;
    agg.push({ role, model, primary_mean: pm, alt_mean: am, combined_mean: (pm+am)/2, n_p: pVals.length, n_a: aVals.length });
  }
  agg.sort((a,b)=> b.combined_mean - a.combined_mean);

  console.log(`  ${role}:`);
  console.log(`    rank  combined  primary  alt    Δ     n_p/n_a  model`);
  summary.push(`### ${role}\n`);
  summary.push(`| Rank | Model | Primary judge (gpt-oss-120b) | Alt judge (nemotron-120b) | Combined | Δ |`);
  summary.push(`|------|-------|------------------------------|---------------------------|----------|---|`);
  agg.forEach((a,i) => {
    const d = (a.alt_mean - a.primary_mean);
    console.log(`    ${String(i+1).padStart(2)}.   ${a.combined_mean.toFixed(1).padStart(4)}   ${a.primary_mean.toFixed(1).padStart(4)}    ${a.alt_mean.toFixed(1).padStart(4)}   ${(d>=0?'+':'')+d.toFixed(1).padStart(4)}  ${a.n_p}/${a.n_a}    ${a.model}`);
    summary.push(`| ${i+1} | \`${a.model}\` | ${a.primary_mean.toFixed(1)} | ${a.alt_mean.toFixed(1)} | **${a.combined_mean.toFixed(1)}** | ${(d>=0?'+':'')+d.toFixed(1)} |`);
  });
  summary.push('');
}

appendFileSync(TSV, summary.join('\n').replace(/\|/g,'\t'));
console.log(`\nLog: ${OUT}/pass3-results.tsv`);
console.log('\nSummary table appended to pass3-results.tsv (markdown).');
console.log(summary.join('\n'));
