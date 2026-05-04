// ─── Witness Agents — NVIDIA NIM Provider ─────────────────────────────
// OpenAI-compatible LLM inference via NVIDIA's hosted build platform.
// Endpoint: https://integrate.api.nvidia.com/v1
// Free tier when logged in at build.nvidia.com (subject to NVIDIA quotas).

import type {
  ProviderConfig,
  InferenceRequest,
  InferenceResponse,
  InferenceError,
  ModelPreference,
  ModelRole,
  ProviderId,
  LLMProvider,
  ModelRoutingTable,
} from './types.js';
import type { Tier } from '../types/interpretation.js';
import { DEFAULT_NVIDIA_ROUTING, estimateNvidiaCost } from './nvidia-routing.js';

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

export interface NvidiaConfig {
  api_key: string;
  base_url?: string;          // Override (e.g. self-hosted NIM)
  timeout_ms?: number;
  routing_table?: Partial<ModelRoutingTable>;
}

export class NvidiaProvider implements LLMProvider {
  private config: ProviderConfig;
  private routing: ModelRoutingTable;
  private timeout: number;

  constructor(config: NvidiaConfig) {
    this.config = {
      id: 'nvidia',
      api_key: config.api_key,
      base_url: config.base_url || NVIDIA_BASE,
      default_model: 'meta/llama-3.1-8b-instruct',
    };
    this.timeout = config.timeout_ms || 30_000;

    // Deep copy routing to prevent cross-instance mutation
    this.routing = {} as ModelRoutingTable;
    for (const [tier, roles] of Object.entries(DEFAULT_NVIDIA_ROUTING)) {
      this.routing[tier as Tier] = { ...roles };
    }
    if (config.routing_table) {
      for (const [tier, roles] of Object.entries(config.routing_table)) {
        if (roles) {
          this.routing[tier as Tier] = { ...this.routing[tier as Tier], ...roles };
        }
      }
    }
  }

  get id(): ProviderId { return 'nvidia'; }

  resolveModel(tier: Tier, role: ModelRole): ModelPreference {
    return this.routing[tier]?.[role] || this.routing.free.fast;
  }

  async complete(request: InferenceRequest): Promise<InferenceResponse> {
    const pref = request.model_override
      ? { model_id: request.model_override, max_tokens: request.max_tokens_override || 1024, temperature: request.temperature_override || 0.5 }
      : this.resolveModel(request.tier, request.model_role);

    const body = {
      model: pref.model_id,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: request.max_tokens_override || pref.max_tokens,
      temperature: request.temperature_override ?? pref.temperature,
      top_p: pref.top_p,
    };

    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.config.base_url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        const err: InferenceError = {
          provider: 'nvidia',
          model: pref.model_id,
          status: res.status,
          message: errBody || res.statusText,
          retryable: res.status === 429 || res.status >= 500,
        };
        throw err;
      }

      const data = await res.json() as any;
      const latency = Date.now() - start;
      const choice = data.choices?.[0];
      const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      // Reasoning models (gpt-oss, minimax m2.7, glm4.7, nemotron-super-*, kimi-k2-thinking)
      // emit answer in `message.reasoning_content` if they ran out of tokens before
      // producing `message.content`, OR alongside it. Prefer `content`, fall back to
      // `reasoning_content` so we never return an empty string.
      const msg = choice?.message || {};
      const primary = (msg.content || '').trim();
      const reasoning = (msg.reasoning_content || '').trim();
      const finalContent = primary || reasoning;

      return {
        content: finalContent,
        model_used: data.model || pref.model_id,
        provider: 'nvidia',
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens),
        },
        latency_ms: latency,
        finish_reason: choice?.finish_reason || 'unknown',
        cost_estimate_usd: estimateNvidiaCost(pref.model_id, usage.prompt_tokens, usage.completion_tokens),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async completeWithRetry(request: InferenceRequest, maxRetries = 2): Promise<InferenceResponse> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.complete(request);
      } catch (err: any) {
        lastError = err;
        if (!err.retryable || attempt === maxRetries) throw err;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  async *completeStream(request: InferenceRequest): AsyncGenerator<string, void, unknown> {
    const pref = request.model_override
      ? { model_id: request.model_override, max_tokens: request.max_tokens_override || 1024, temperature: request.temperature_override || 0.5 }
      : this.resolveModel(request.tier, request.model_role);

    const body = {
      model: pref.model_id,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: request.max_tokens_override || pref.max_tokens,
      temperature: request.temperature_override ?? pref.temperature,
      top_p: pref.top_p,
      stream: true,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.config.base_url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        const err: InferenceError = {
          provider: 'nvidia',
          model: pref.model_id,
          status: res.status,
          message: errBody || res.statusText,
          retryable: res.status === 429 || res.status >= 500,
        };
        throw err;
      }

      if (!res.body) throw new Error('No response body for streaming');

      const decoder = new TextDecoder();
      let buffer = '';

      for await (const chunk of res.body as any) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // Skip malformed SSE chunks
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  getRouting(): ModelRoutingTable {
    return { ...this.routing };
  }

  setModelPreference(tier: Tier, role: ModelRole, pref: ModelPreference): void {
    this.routing[tier][role] = pref;
  }
}
