// ─── Witness Agents — Standalone Server Entry Point ─────────────────
// Production entry for Railway / Docker deployment.
// Reads configuration from environment variables.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createStandaloneServer } from './standalone/standalone-api.js';
import { setDecoderStore } from './standalone/decoder-ring.js';
import { createDecoderStore } from './standalone/decoder-store.js';
import { getWitnessDeploymentInfo, WITNESS_VERSION } from './standalone/deployment-info.js';

import type { StandaloneTier } from './standalone/types.js';

const port = parseInt(process.env.PORT || '3333', 10);
const selemeneUrl = process.env.SELEMENE_API_URL || 'https://selemene.tryambakam.space';
const selemeneApiKey = process.env.SELEMENE_API_KEY || '';
const openrouterKey = process.env.OPENROUTER_API_KEY || '';
const nvidiaKey = process.env.NVIDIA_API_KEY || '';
const llmProviderEnv = (process.env.LLM_PROVIDER || '').toLowerCase();
const llmProviderForced =
  llmProviderEnv === 'nvidia' || llmProviderEnv === 'openrouter'
    ? (llmProviderEnv as 'nvidia' | 'openrouter')
    : undefined;
const llmTimeoutMs = parseInt(process.env.WITNESS_LLM_TIMEOUT_MS || '', 10);
const tier = (process.env.WITNESS_TIER || 'witness-initiate') as StandaloneTier;
const deploymentInfo = getWitnessDeploymentInfo();
const knowledgePath = process.env.WITNESS_KNOWLEDGE_PATH
  || resolve(dirname(fileURLToPath(import.meta.url)), '../knowledge');

// Initialize persistence before starting server
const store = createDecoderStore();
setDecoderStore(store);

const llmStatus = (() => {
  if (llmProviderForced === 'nvidia' && nvidiaKey) return 'NVIDIA NIM (forced)';
  if (llmProviderForced === 'openrouter' && openrouterKey) return 'OpenRouter (forced)';
  if (nvidiaKey && !openrouterKey) return 'NVIDIA NIM (auto)';
  if (openrouterKey && !nvidiaKey) return 'OpenRouter (auto)';
  if (openrouterKey && nvidiaKey) return 'OpenRouter (default — both keys present, set LLM_PROVIDER=nvidia to switch)';
  return 'template-only (no LLM key)';
})();

console.log(`[WitnessAgents] Starting standalone server...`);
console.log(`[WitnessAgents] Version: ${WITNESS_VERSION}`);
console.log(`[WitnessAgents] Selemene API: ${selemeneUrl}`);
console.log(`[WitnessAgents] Port: ${port}`);
console.log(`[WitnessAgents] LLM: ${llmStatus}`);
if (Number.isFinite(llmTimeoutMs) && llmTimeoutMs > 0) {
  console.log(`[WitnessAgents] LLM timeout: ${llmTimeoutMs}ms`);
}
console.log(`[WitnessAgents] Tier: ${tier}`);
console.log(`[WitnessAgents] Knowledge path: ${knowledgePath}`);
console.log(`[WitnessAgents] Deployment: ${JSON.stringify(deploymentInfo)}`);

createStandaloneServer({
  port,
  selemene_url: selemeneUrl,
  selemene_api_key: selemeneApiKey,
  openrouter_api_key: openrouterKey,
  nvidia_api_key: nvidiaKey,
  llm_provider: llmProviderForced,
  llm_timeout_ms: Number.isFinite(llmTimeoutMs) && llmTimeoutMs > 0 ? llmTimeoutMs : undefined,
  tier,
  knowledge_path: knowledgePath,
  rhythm: {
    poll_interval_ms: 120_000,
    max_connections: 100,
  },
}).then(({ port: actualPort }) => {
  console.log(`[WitnessAgents] ✦ Daily Witness live on port ${actualPort}`);
}).catch((err) => {
  console.error('[WitnessAgents] Fatal startup error:', err);
  process.exit(1);
});
