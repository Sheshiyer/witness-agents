// ─── Witness Agents — OpenAI Direct Provider ───────────────────────────
// Direct OpenAI API provider for GPT-4o, GPT-4o-mini, o1, o3, etc.
// Endpoint: https://api.openai.com/v1
//
// Uses the official openai npm package (v4+) for type-safe API calls.

import OpenAI from 'openai';
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

const OPENAI_BASE = 'https://api.openai.com/v1';

export interface OpenAIConfig {
  api_key: string;
  base_url?: string;          // Override (e.g., Azure OpenAI, proxy)
  timeout_ms?: number;
  organization?: string;      // OpenAI organization ID
  project?: string;           // OpenAI project ID
  routing_table?: Partial<ModelRoutingTable>;
}

// Default routing for OpenAI models
const DEFAULT_OPENAI_ROUTING: ModelRoutingTable = {
  free: {
    fast: { model_id: 'gpt-4o-mini', max_tokens: 1024, temperature: 0.5 },
    synthesis: { model_id: 'gpt-4o-mini', max_tokens: 2048, temperature: 0.3 },
    aletheios: { model_id: 'gpt-4o-mini', max_tokens: 2048, temperature: 0.25 },
    pichet: { model_id: 'gpt-4o-mini', max_tokens: 2048, temperature: 0.25 },
    deep: { model_id: 'gpt-4o-mini', max_tokens: 4096, temperature: 0.2 },
  },
  subscriber: {
    fast: { model_id: 'gpt-4o-mini', max_tokens: 1024, temperature: 0.5 },
    synthesis: { model_id: 'gpt-4o', max_tokens: 4096, temperature: 0.2 },
    aletheios: { model_id: 'gpt-4o', max_tokens: 4096, temperature: 0.18 },
    pichet: { model_id: 'gpt-4o', max_tokens: 4096, temperature: 0.18 },
    deep: { model_id: 'gpt-4o', max_tokens: 8192, temperature: 0.16 },
  },
  initiate: {
    fast: { model_id: 'gpt-4o-mini', max_tokens: 1024, temperature: 0.5 },
    synthesis: { model_id: 'gpt-4o', max_tokens: 4096, temperature: 0.15 },
    aletheios: { model_id: 'gpt-4o', max_tokens: 4096, temperature: 0.15 },
    pichet: { model_id: 'gpt-4o', max_tokens: 4096, temperature: 0.15 },
    deep: { model_id: 'gpt-4o', max_tokens: 8192, temperature: 0.12 },
  },
  enterprise: {
    fast: { model_id: 'gpt-4o-mini', max_tokens: 1024, temperature: 0.5 },
    synthesis: { model_id: 'gpt-4o', max_tokens: 8192, temperature: 0.12 },
    aletheios: { model_id: 'gpt-4o', max_tokens: 8192, temperature: 0.12 },
    pichet: { model_id: 'gpt-4o', max_tokens: 8192, temperature: 0.12 },
    deep: { model_id: 'gpt-4o', max_tokens: 8192, temperature: 0.1 },
  },
};

function estimateOpenAICost(model: string, inputTokens: number, outputTokens: number): number {
  // Pricing per 1M tokens (as of 2024-06)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'o1-preview': { input: 15.00, output: 60.00 },
    'o1-mini': { input: 3.00, output: 12.00 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
  };

  const p = pricing[model] || pricing['gpt-4o'];
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private config: ProviderConfig;
  private routing: ModelRoutingTable;
  private timeout: number;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.api_key,
      baseURL: config.base_url || OPENAI_BASE,
      organization: config.organization,
      project: config.project,
      timeout: config.timeout_ms || 60_000,
      maxRetries: 2,
    });

    this.config = {
      id: 'openai',
      api_key: config.api_key,
      base_url: config.base_url || OPENAI_BASE,
      default_model: 'gpt-4o',
    };
    this.timeout = config.timeout_ms || 60_000;

    // Deep copy routing
    this.routing = {} as ModelRoutingTable;
    for (const [tier, roles] of Object.entries(DEFAULT_OPENAI_ROUTING)) {
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

  get id(): ProviderId { return 'openai'; }

  resolveModel(tier: Tier, role: ModelRole): ModelPreference {
    return this.routing[tier]?.[role] || this.routing.subscriber.synthesis;
  }

  async complete(request: InferenceRequest): Promise<InferenceResponse> {
    const pref = request.model_override
      ? { model_id: request.model_override, max_tokens: request.max_tokens_override || 1024, temperature: request.temperature_override || 0.5 }
      : this.resolveModel(request.tier, request.model_role);

    const start = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
        model: pref.model_id,
        messages: request.messages.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        max_tokens: request.max_tokens_override || pref.max_tokens,
        temperature: request.temperature_override ?? pref.temperature,
        top_p: pref.top_p,
      }, {
        timeout: this.timeout,
      });

      const latency = Date.now() - start;
      const choice = completion.choices?.[0];
      const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      const message = choice?.message || {};
      const content = (message.content || '').trim();

      return {
        content,
        model_used: completion.model || pref.model_id,
        provider: 'openai',
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens),
        },
        latency_ms: latency,
        finish_reason: choice?.finish_reason || 'unknown',
        cost_estimate_usd: estimateOpenAICost(pref.model_id, usage.prompt_tokens, usage.completion_tokens),
      };
    } catch (err: any) {
      const inferenceErr: InferenceError = {
        provider: 'openai',
        model: pref.model_id,
        status: err.status || 500,
        message: err.message || String(err),
        retryable: err.status === 429 || err.status >= 500 || err.code === 'ECONNRESET',
      };
      throw inferenceErr;
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

    const stream = await this.client.chat.completions.create({
      model: pref.model_id,
      messages: request.messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      max_tokens: request.max_tokens_override || pref.max_tokens,
      temperature: request.temperature_override ?? pref.temperature,
      top_p: pref.top_p,
      stream: true,
    }, {
      timeout: this.timeout,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  getRouting(): ModelRoutingTable {
    return { ...this.routing };
  }

  setModelPreference(tier: Tier, role: ModelRole, pref: ModelPreference): void {
    this.routing[tier][role] = pref;
  }
}
