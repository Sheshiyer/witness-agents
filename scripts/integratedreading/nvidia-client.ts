// ─── /integratedreading — Direct NVIDIA NIM API Client ─────────────
// Bypasses witness-agents internal routing. Per-phase explicit model selection.
// OpenAI-compatible chat completions endpoint at integrate.api.nvidia.com/v1.

const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallOptions {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;       // default: 2048
  temperature?: number;      // default: 0.4
  top_p?: number;
  stream?: false;
  timeout_ms?: number;       // default: 120_000 (2 min)
}

export interface CallResult {
  content: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  raw: any;
}

export class NvidiaClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('NvidiaClient: NVIDIA_API_KEY required');
    this.apiKey = apiKey;
  }

  async call(opts: CallOptions): Promise<CallResult> {
    const start = Date.now();
    const ctrl = new AbortController();
    const timeoutMs = opts.timeout_ms ?? 120_000;
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: opts.model,
          messages: opts.messages,
          max_tokens: opts.max_tokens ?? 2048,
          temperature: opts.temperature ?? 0.4,
          top_p: opts.top_p ?? 0.9,
          stream: false,
        }),
      });

      clearTimeout(timer);

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`NVIDIA ${opts.model} ${res.status}: ${txt.slice(0, 300)}`);
      }

      const data: any = await res.json();
      const choice = data.choices?.[0];
      if (!choice) throw new Error(`NVIDIA ${opts.model}: no choice in response`);

      // Some reasoning models return reasoning_content; fallback chain:
      const content =
        choice.message?.content?.trim() ||
        choice.message?.reasoning_content?.trim() ||
        '';

      if (!content) {
        throw new Error(`NVIDIA ${opts.model}: empty content (finish=${choice.finish_reason})`);
      }

      return {
        content,
        model: opts.model,
        prompt_tokens: data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.usage?.completion_tokens ?? 0,
        latency_ms: Date.now() - start,
        raw: data,
      };
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`NVIDIA ${opts.model}: timeout after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  /** Call with retries on transient failures (5xx, network, timeout). */
  async callWithRetry(opts: CallOptions, maxRetries = 2): Promise<CallResult> {
    let lastErr: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.call(opts);
      } catch (err: any) {
        lastErr = err;
        const msg = err.message || '';
        const transient =
          msg.includes('timeout') ||
          msg.includes(' 5') ||  // 5xx
          msg.includes('network') ||
          msg.includes('ECONNRESET') ||
          msg.includes('fetch failed');
        if (!transient || attempt === maxRetries) throw err;
        const backoff = 1000 * Math.pow(2, attempt);  // 1s, 2s, 4s
        console.error(`  ↻ retry ${attempt + 1}/${maxRetries} for ${opts.model} after ${backoff}ms (${msg.slice(0, 80)})`);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    throw lastErr;
  }
}

/** Model IDs as constants — verified live via 2026-05-10 probe. */
export const MODELS = {
  GPT_OSS_120B:   'openai/gpt-oss-120b',         // verified ✓ ~30s
  GPT_OSS_20B:    'openai/gpt-oss-20b',          // verified ✓ ~400ms
  KIMI_K2:        'moonshotai/kimi-k2-instruct', // verified ✓ ~600ms (synthesis)
  KIMI_K2_0905:   'moonshotai/kimi-k2-instruct', // alias to verified k2 (0905 returns 410 Gone)
  GLM_47:         'z-ai/glm4.7',                 // verified ✓ ~50s (math/astro)
  GLM_47_ALT:     'z-ai/glm4.7',                 // same as primary now
  MINIMAX:        'minimaxai/minimax-m2.7',      // probe timed out at 60s — needs ≥180s; falls back to regex chunker
  NEMOTRON_120B:  'nvidia/nemotron-3-super-120b-a12b', // verified ✓ ~3s (adversarial)
} as const;
