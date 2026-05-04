// End-to-end smoke test: NvidiaProvider hitting real chat/completions
// across each tier × role. Verifies content + reasoning_content fallback.
// Run with: NVIDIA_API_KEY=... node --import tsx scripts/nvidia-e2e.ts
import { NvidiaProvider } from '../src/inference/nvidia.js';
import type { Tier } from '../src/types/interpretation.js';
import type { ModelRole } from '../src/inference/types.js';

const key = process.env.NVIDIA_API_KEY;
if (!key) { console.error('NVIDIA_API_KEY required'); process.exit(1); }

const provider = new NvidiaProvider({ api_key: key, timeout_ms: 60_000 });

const tiers: Tier[] = ['free', 'subscriber', 'enterprise', 'initiate'];
const roles: ModelRole[] = ['aletheios', 'pichet', 'synthesis', 'fast', 'deep'];

const prompt = 'In one sentence: what is the witness?';

for (const tier of tiers) {
  console.log(`\n═══ TIER: ${tier} ═══`);
  for (const role of roles) {
    const pref = provider.resolveModel(tier, role);
    process.stdout.write(`  ${role.padEnd(10)} ${pref.model_id.padEnd(50)} `);
    const start = Date.now();
    try {
      const res = await provider.complete({
        messages: [{ role: 'user', content: prompt }],
        model_role: role,
        tier,
      });
      const ms = Date.now() - start;
      const preview = res.content.replace(/\n/g, ' ').slice(0, 60);
      console.log(`${ms}ms  ${res.usage.completion_tokens}tk  "${preview}..."`);
    } catch (e: any) {
      console.log(`FAIL  ${e.status || ''}  ${(e.message || String(e)).slice(0, 80)}`);
    }
  }
}
