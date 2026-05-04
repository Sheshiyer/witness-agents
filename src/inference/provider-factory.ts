// ─── Witness Agents — LLM Provider Factory ────────────────────────────
// Selects an LLM provider based on environment variables / config.
//
// Selection rules (highest precedence first):
//   1. Explicit `provider` arg
//   2. LLM_PROVIDER env var ('nvidia' | 'openrouter')
//   3. NVIDIA_API_KEY set + OPENROUTER_API_KEY unset → nvidia
//   4. OPENROUTER_API_KEY set + NVIDIA_API_KEY unset → openrouter
//   5. Both keys set → openrouter (preserves existing default behavior)
//   6. No key set → throws
//
// NOTE: throwing here surfaces config gaps fast. Callers should guard
// with a key-presence check (see DailyMirror.constructor for the optional
// LLM-disabled path that just returns null).

import type { LLMProvider } from './types.js';
import { OpenRouterProvider } from './openrouter.js';
import { NvidiaProvider } from './nvidia.js';

export type ProviderChoice = 'openrouter' | 'nvidia';

export interface FactoryOptions {
  provider?: ProviderChoice;       // Explicit override
  openrouter_api_key?: string;
  nvidia_api_key?: string;
  site_url?: string;               // OpenRouter only
  site_name?: string;              // OpenRouter only
  timeout_ms?: number;
}

export function resolveProviderChoice(opts: {
  provider?: ProviderChoice;
  openrouter_api_key?: string;
  nvidia_api_key?: string;
}): ProviderChoice | null {
  if (opts.provider) return opts.provider;

  const envChoice = (process.env.LLM_PROVIDER || '').toLowerCase();
  if (envChoice === 'nvidia' || envChoice === 'openrouter') {
    return envChoice as ProviderChoice;
  }

  const hasNvidia = !!opts.nvidia_api_key;
  const hasOpenrouter = !!opts.openrouter_api_key;

  if (hasNvidia && !hasOpenrouter) return 'nvidia';
  if (hasOpenrouter && !hasNvidia) return 'openrouter';
  if (hasOpenrouter && hasNvidia) return 'openrouter';   // backward-compat default
  return null;
}

export function createLLMProvider(opts: FactoryOptions): LLMProvider {
  const choice = resolveProviderChoice(opts);
  if (!choice) {
    throw new Error(
      'createLLMProvider: no API key provided. Set NVIDIA_API_KEY or OPENROUTER_API_KEY.',
    );
  }

  if (choice === 'nvidia') {
    if (!opts.nvidia_api_key) {
      throw new Error('createLLMProvider: provider=nvidia but nvidia_api_key not provided.');
    }
    return new NvidiaProvider({
      api_key: opts.nvidia_api_key,
      timeout_ms: opts.timeout_ms,
    });
  }

  if (!opts.openrouter_api_key) {
    throw new Error('createLLMProvider: provider=openrouter but openrouter_api_key not provided.');
  }
  return new OpenRouterProvider({
    api_key: opts.openrouter_api_key,
    site_url: opts.site_url,
    site_name: opts.site_name,
    timeout_ms: opts.timeout_ms,
  });
}
