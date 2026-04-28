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
const tier = (process.env.WITNESS_TIER || 'witness-initiate') as StandaloneTier;
const deploymentInfo = getWitnessDeploymentInfo();
const knowledgePath = process.env.WITNESS_KNOWLEDGE_PATH
  || resolve(dirname(fileURLToPath(import.meta.url)), '../knowledge');

// Initialize persistence before starting server
const store = createDecoderStore();
setDecoderStore(store);

console.log(`[WitnessAgents] Starting standalone server...`);
console.log(`[WitnessAgents] Version: ${WITNESS_VERSION}`);
console.log(`[WitnessAgents] Selemene API: ${selemeneUrl}`);
console.log(`[WitnessAgents] Port: ${port}`);
console.log(`[WitnessAgents] LLM: ${openrouterKey ? 'OpenRouter configured' : 'template-only (no LLM key)'}`);
console.log(`[WitnessAgents] Tier: ${tier}`);
console.log(`[WitnessAgents] Knowledge path: ${knowledgePath}`);
console.log(`[WitnessAgents] Deployment: ${JSON.stringify(deploymentInfo)}`);

createStandaloneServer({
  port,
  selemene_url: selemeneUrl,
  selemene_api_key: selemeneApiKey,
  openrouter_api_key: openrouterKey,
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
