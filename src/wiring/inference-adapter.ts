// src/wiring/inference-adapter.ts
// Real executor adapter that wires the atomic orchestrator to the project's
// actual inference providers and perspective-aware model routing.

import type { TaskExecutor, AtomicTask, FactLock } from '@witness/orchestration';
import { createLLMProvider, resolveProviderChoice } from '../inference/provider-factory.js';
import type { LLMProvider, InferenceMessage, ModelRole } from '../inference/types.js';
import { WITNESS_NVIDIA_ROUTING } from '../config/witness-capabilities.js';
import type { Tier } from '../types/interpretation.js';

/**
 * Creates a TaskExecutor that uses the real LLM providers + perspective routing.
 *
 * This is the bridge between the generic atomic wiring system and the
 * existing witness-agents inference stack.
 */
export function createWitnessInferenceExecutor(opts: {
  tier?: Tier;
  provider?: 'openrouter' | 'nvidia';
  openrouter_api_key?: string;
  nvidia_api_key?: string;
  timeout_ms?: number;
} = {}): TaskExecutor {
  const tier: Tier = opts.tier ?? (process.env.WITNESS_TIER as Tier) ?? 'subscriber';

  const choice = resolveProviderChoice({
    provider: opts.provider,
    openrouter_api_key: opts.openrouter_api_key,
    nvidia_api_key: opts.nvidia_api_key,
  });

  if (!choice) {
    throw new Error('createWitnessInferenceExecutor: no LLM provider keys available');
  }

  const provider: LLMProvider = createLLMProvider({
    provider: choice,
    openrouter_api_key: opts.openrouter_api_key,
    nvidia_api_key: opts.nvidia_api_key,
    timeout_ms: opts.timeout_ms,
  });

  const routing = WITNESS_NVIDIA_ROUTING[tier];

  return async (task: AtomicTask, lock: FactLock, prior: Record<string, string>) => {
    const { system, user } = task.buildPrompts(lock, prior);

    // Map perspective to routing role
    const role: ModelRole =
      task.perspective === 'aletheios' ? 'aletheios' :
      task.perspective === 'pichet' ? 'pichet' :
      'synthesis';

    const pref = routing[role] ?? routing.synthesis;

    const messages: InferenceMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];

    const start = Date.now();

    const response = await provider.complete({
      messages,
      model_role: role,
      tier,
      model_override: pref.model_id,
      temperature_override: task.temperature ?? pref.temperature,
      max_tokens_override: Math.min(task.targetTokens, pref.max_tokens),
    });

    return {
      taskId: task.id,
      perspective: task.perspective,
      content: response.content?.trim() ?? '',
      tokensUsed: response.usage?.total_tokens,
      latencyMs: response.latency_ms,
      model: response.model_used,
    };
  };
}

/**
 * Creates a cheap, narrow repair executor.
 * 
 * Forces the "fast" role (lowest cost / latency model) + tiny token budget (300-400 tokens).
 * This is the recommended production cheap repair path.
 */
export function createCheapRepairExecutor(opts: {
  tier?: Tier;
  provider?: 'openrouter' | 'nvidia';
  openrouter_api_key?: string;
  nvidia_api_key?: string;
  timeout_ms?: number;
} = {}) {
  const tier: Tier = opts.tier ?? (process.env.WITNESS_TIER as Tier) ?? 'subscriber';

  const choice = resolveProviderChoice({
    provider: opts.provider,
    openrouter_api_key: opts.openrouter_api_key,
    nvidia_api_key: opts.nvidia_api_key,
  });

  if (!choice) {
    throw new Error('createCheapRepairExecutor: no LLM provider keys available');
  }

  const provider: LLMProvider = createLLMProvider({
    provider: choice,
    openrouter_api_key: opts.openrouter_api_key,
    nvidia_api_key: opts.nvidia_api_key,
    timeout_ms: opts.timeout_ms,
  });

  const routing = WITNESS_NVIDIA_ROUTING[tier];
  const fastPref = routing.fast ?? routing.synthesis; // "fast" is the cheap role

  return async (repairPrompt: string, lock: FactLock): Promise<string> => {
    const messages: InferenceMessage[] = [
      { role: 'system', content: 'You are a precise, minimal repair specialist. Output ONLY the corrected paragraph(s). No introductions, no meta-commentary, no explanations. Strictly respect the FACT LOCK.' },
      { role: 'user', content: repairPrompt },
    ];

    const start = Date.now();

    const response = await provider.complete({
      messages,
      model_role: 'fast',
      tier,
      model_override: fastPref.model_id,
      temperature_override: 0.05,
      max_tokens_override: 380, // deliberately tiny + cheap
    });

    return response.content?.trim() ?? '';
  };
}
