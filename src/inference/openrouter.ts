// ─── Witness Agents — OpenRouter Provider ─────────────────────────────
// OpenAI-compatible LLM inference via OpenRouter.
// Handles: model routing, retries, cost tracking, streaming (future).

import type {
  ProviderConfig,
  InferenceRequest,
  InferenceResponse,
  InferenceMessage,
  InferenceError,
  ModelPreference,
  ModelRole,
  ProviderId,
} from './types.js';
import type { Tier } from '../types/interpretation.js';
import { DEFAULT_MODEL_ROUTING, estimateCost } from './model-routing.js';
import type { ModelRoutingTable } from './types.js';

// ═══════════════════════════════════════════════════════════════════════
// OPENROUTER PROVIDER
// ═══════════════════════════════════════════════════════════════════════

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export interface OpenRouterConfig {
  api_key: string;
  site_url?: string;       // HTTP-Referer header
  site_name?: string;      // X-Title header
  timeout_ms?: number;
  routing_table?: Partial<ModelRoutingTable>;
}

export class OpenRouterProvider {
  private config: ProviderConfig;
  private routing: ModelRoutingTable;
  private siteUrl: string;
  private siteName: string;
  private timeout: number;

  constructor(config: OpenRouterConfig) {
    this.config = {
      id: 'openrouter',
      api_key: config.api_key,
      base_url: OPENROUTER_BASE,
      default_model: 'meta-llama/llama-4-scout',
    };
    this.siteUrl = config.site_url || 'https://tryambakam.space';
    this.siteName = config.site_name || 'WitnessOS';
    this.timeout = config.timeout_ms || 30_000;

    // Deep copy routing to prevent cross-instance mutation
    this.routing = {} as ModelRoutingTable;
    for (const [tier, roles] of Object.entries(DEFAULT_MODEL_ROUTING)) {
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

  get id(): ProviderId { return 'openrouter'; }

  /**
   * Resolve which model to use for a given tier + role.
   */
  resolveModel(tier: Tier, role: ModelRole): ModelPreference {
    return this.routing[tier]?.[role] || this.routing.free.fast;
  }

  /**
   * Execute a chat completion request via OpenRouter.
   */
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
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        const err: InferenceError = {
          provider: 'openrouter',
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

      return {
        content: choice?.message?.content || '',
        model_used: data.model || pref.model_id,
        provider: 'openrouter',
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens),
        },
        latency_ms: latency,
        finish_reason: choice?.finish_reason || 'unknown',
        cost_estimate_usd: estimateCost(pref.model_id, usage.prompt_tokens, usage.completion_tokens),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Complete with retry (for transient errors / rate limits).
   */
  async completeWithRetry(request: InferenceRequest, maxRetries = 2): Promise<InferenceResponse> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.complete(request);
      } catch (err: any) {
        lastError = err;
        if (!err.retryable || attempt === maxRetries) throw err;
        // Exponential backoff: 1s, 2s
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  /**
   * Streaming chat completion — yields text chunks as they arrive.
   * OpenRouter supports `stream: true` returning SSE `data: {...}` events.
   */
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
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        const err: InferenceError = {
          provider: 'openrouter',
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

  /**
   * Get the current routing table (for inspection/debugging).
   */
  getRouting(): ModelRoutingTable {
    return { ...this.routing };
  }

  /**
   * Update model routing at runtime (e.g., A/B testing, model migration).
   */
  setModelPreference(tier: Tier, role: ModelRole, pref: ModelPreference): void {
    this.routing[tier][role] = pref;
  }
}
