// ─── Wave B1 Task 9 — Internal Model Gateway Tests ─────────────────────
// Verifies the host-owned internal model gateway: auth, allowlists,
// bounded validation, provider-fallback reuse, transport-envelope
// redaction, and timeout/cancel handling.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_INTERNAL_GATEWAY_POLICY,
  authenticateInternalCaller,
  constantTimeEqual,
  GATEWAY_LIMITS,
  GatewayError,
  InternalModelGateway,
  type InternalGatewayPolicy,
  validateGatewayRequest,
  type GatewayEvent,
} from '../src/api/internal-model-gateway.js';
import type { LLMProvider, InferenceRequest, InferenceResponse, ModelPreference, ModelRoutingTable } from '../src/inference/types.js';
import { createServer, INTERNAL_MODEL_GATEWAY_MAX_BODY_BYTES } from '../src/api/server.js';
import type { ServerConfig } from '../src/api/server.js';

// ════════════════════════════════════════════════════════════════════════
// Test doubles
// ════════════════════════════════════════════════════════════════════════

function makeRoutingTable(): ModelRoutingTable {
  const pref: ModelPreference = { model_id: 'fake/model', max_tokens: 512, temperature: 0.4 };
  const roleMap = { aletheios: pref, pichet: pref, synthesis: pref, fast: pref, deep: pref };
  return { free: roleMap, subscriber: roleMap, enterprise: roleMap, initiate: roleMap } as ModelRoutingTable;
}

class FakeProvider implements LLMProvider {
  readonly id = 'openrouter' as const;
  calls: InferenceRequest[] = [];
  completeWithRetryCalls = 0;
  response: InferenceResponse = {
    content: 'hello from fake',
    model_used: 'fake/model',
    provider: 'openrouter',
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    latency_ms: 5,
    finish_reason: 'stop',
  };
  errorToThrow: Error | null = null;
  delayMs = 0;

  resolveModel(): ModelPreference {
    return { model_id: 'fake/model', max_tokens: 512, temperature: 0.4 };
  }

  async complete(request: InferenceRequest): Promise<InferenceResponse> {
    this.calls.push(request);
    if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    if (this.errorToThrow) throw this.errorToThrow;
    return this.response;
  }

  async completeWithRetry(request: InferenceRequest): Promise<InferenceResponse> {
    this.completeWithRetryCalls += 1;
    return this.complete(request);
  }

  getRouting(): ModelRoutingTable {
    return makeRoutingTable();
  }

  setModelPreference(): void {
    // no-op
  }
}

function makeGateway(opts: {
  token?: string;
  provider?: FakeProvider;
  policy?: InternalGatewayPolicy;
} = {}) {
  const provider = opts.provider ?? new FakeProvider();
  const gateway = new InternalModelGateway({
    auth: { token: opts.token ?? 'super-secret-internal-token' },
    providerEnv: {},
    buildProvider: () => provider,
    policy: opts.policy,
  });
  return { gateway, provider };
}

function validRequestBody(overrides: Record<string, unknown> = {}) {
  return {
    internal_caller_role: 'agentscope-executor',
    task_class: 'fast',
    tier: 'subscriber',
    messages: [{ role: 'user', content: 'hello' }],
    ...overrides,
  };
}

async function collect(gen: AsyncGenerator<GatewayEvent, void, void>): Promise<GatewayEvent[]> {
  const out: GatewayEvent[] = [];
  for await (const evt of gen) out.push(evt);
  return out;
}

// ════════════════════════════════════════════════════════════════════════
// Auth
// ════════════════════════════════════════════════════════════════════════

describe('constantTimeEqual', () => {
  it('returns true for identical strings', () => {
    assert.equal(constantTimeEqual('abc123', 'abc123'), true);
  });

  it('returns false for different strings of the same length', () => {
    assert.equal(constantTimeEqual('abc123', 'abc124'), false);
  });

  it('returns false for different-length strings without throwing', () => {
    assert.equal(constantTimeEqual('short', 'a-much-longer-string'), false);
  });
});

describe('authenticateInternalCaller', () => {
  it('rejects when no token is configured (fail-closed)', () => {
    assert.equal(authenticateInternalCaller('anything', { token: undefined }), false);
    assert.equal(authenticateInternalCaller('anything', { token: '' }), false);
  });

  it('rejects when no token is presented', () => {
    assert.equal(authenticateInternalCaller(undefined, { token: 'secret' }), false);
  });

  it('rejects a wrong token', () => {
    assert.equal(authenticateInternalCaller('wrong', { token: 'secret' }), false);
  });

  it('accepts the correct token', () => {
    assert.equal(authenticateInternalCaller('secret', { token: 'secret' }), true);
  });
});

describe('InternalModelGateway.execute — auth', () => {
  it('emits UNAUTHORIZED error for missing token, without calling the provider', async () => {
    const { gateway, provider } = makeGateway();
    const events = await collect(gateway.execute(undefined, validRequestBody()));
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'error');
    assert.equal((events[0] as any).code, 'UNAUTHORIZED');
    assert.equal(provider.calls.length, 0);
  });

  it('emits UNAUTHORIZED error for wrong token', async () => {
    const { gateway, provider } = makeGateway();
    const events = await collect(gateway.execute('wrong-token', validRequestBody()));
    assert.equal(events[0].type, 'error');
    assert.equal((events[0] as any).code, 'UNAUTHORIZED');
    assert.equal(provider.calls.length, 0);
  });

  it('proceeds to start on correct token', async () => {
    const { gateway } = makeGateway();
    const events = await collect(gateway.execute('super-secret-internal-token', validRequestBody()));
    assert.equal(events[0].type, 'start');
  });

  it('isAvailable() is false when no token configured', () => {
    const { gateway } = makeGateway({ token: '' });
    assert.equal(gateway.isAvailable(), false);
  });

  it('isAvailable() is true when a token is configured', () => {
    const { gateway } = makeGateway();
    assert.equal(gateway.isAvailable(), true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Role / tier allowlists
// ════════════════════════════════════════════════════════════════════════

describe('validateGatewayRequest — role/tier allowlists', () => {
  it('rejects an unknown internal_caller_role', () => {
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ internal_caller_role: 'anyone' })),
      (err: unknown) => err instanceof GatewayError && err.code === 'FORBIDDEN_ROLE',
    );
  });

  it('rejects an unknown task_class', () => {
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ task_class: 'admin_backdoor' })),
      (err: unknown) => err instanceof GatewayError && err.code === 'FORBIDDEN_TASK_CLASS',
    );
  });

  it('rejects an unknown tier', () => {
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ tier: 'godmode' })),
      (err: unknown) => err instanceof GatewayError && err.code === 'MALFORMED_REQUEST',
    );
  });

  it('accepts every allowlisted task_class', () => {
    for (const task_class of ['aletheios', 'pichet', 'synthesis', 'fast', 'deep']) {
      const req = validateGatewayRequest(validRequestBody({ task_class }));
      assert.equal(req.task_class, task_class);
    }
  });
});

describe('InternalModelGateway.execute — role/tier rejection end to end', () => {
  it('rejects forbidden role before ever touching the provider', async () => {
    const { gateway, provider } = makeGateway();
    const events = await collect(
      gateway.execute('super-secret-internal-token', validRequestBody({ internal_caller_role: 'nope' })),
    );
    assert.equal(events[0].type, 'error');
    assert.equal((events[0] as any).code, 'FORBIDDEN_ROLE');
    assert.equal(provider.calls.length, 0);
  });

  it('rejects role not in host policy before touching provider', async () => {
    const { gateway, provider } = makeGateway({ policy: { ...DEFAULT_INTERNAL_GATEWAY_POLICY, allowed_task_classes: ['fast'] } });
    const events = await collect(
      gateway.execute('super-secret-internal-token', validRequestBody({ task_class: 'deep' })),
    );
    assert.equal(events[0].type, 'error');
    assert.equal((events[0] as any).code, 'FORBIDDEN_TASK_CLASS');
    assert.equal(provider.calls.length, 0);
  });

  it('rejects tier not in host policy before touching provider', async () => {
    const { gateway, provider } = makeGateway({ policy: { ...DEFAULT_INTERNAL_GATEWAY_POLICY, allowed_tiers: ['free'] } });
    const events = await collect(
      gateway.execute('super-secret-internal-token', validRequestBody({ tier: 'enterprise' })),
    );
    assert.equal(events[0].type, 'error');
    assert.equal((events[0] as any).code, 'FORBIDDEN_TIER');
    assert.equal(provider.calls.length, 0);
  });

  it('uses host default policy when explicit policy is omitted', async () => {
    const gateway = new InternalModelGateway({
      auth: { token: 'super-secret-internal-token' },
      providerEnv: {},
      buildProvider: () => new FakeProvider(),
    });
    const events = await collect(gateway.execute('super-secret-internal-token', validRequestBody({ task_class: 'deep', tier: 'initiate' })));
    assert.equal(events[0].type, 'start');
    assert.equal(events[events.length - 1].type, 'end');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Unknown fields + caps
// ════════════════════════════════════════════════════════════════════════

describe('validateGatewayRequest — unknown fields rejected', () => {
  it('rejects an unknown top-level field', () => {
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ provider: 'openai' })),
      (err: unknown) => err instanceof GatewayError && err.code === 'UNKNOWN_FIELD',
    );
  });

  it('rejects an unknown message field', () => {
    assert.throws(
      () =>
        validateGatewayRequest(
          validRequestBody({ messages: [{ role: 'user', content: 'hi', tool_calls: [] }] }),
        ),
      (err: unknown) => err instanceof GatewayError && err.code === 'UNKNOWN_FIELD',
    );
  });

  it('rejects a non-object body', () => {
    assert.throws(
      () => validateGatewayRequest('not an object'),
      (err: unknown) => err instanceof GatewayError && err.code === 'MALFORMED_REQUEST',
    );
  });
});

describe('validateGatewayRequest — caps', () => {
  it('rejects too many messages', () => {
    const messages = Array.from({ length: GATEWAY_LIMITS.MAX_MESSAGES + 1 }, () => ({
      role: 'user',
      content: 'x',
    }));
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ messages })),
      (err: unknown) => err instanceof GatewayError && err.code === 'REQUEST_TOO_LARGE',
    );
  });

  it('rejects a single message over the per-message char cap', () => {
    const messages = [{ role: 'user', content: 'x'.repeat(GATEWAY_LIMITS.MAX_MESSAGE_CHARS + 1) }];
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ messages })),
      (err: unknown) => err instanceof GatewayError && err.code === 'REQUEST_TOO_LARGE',
    );
  });

  it('rejects total prompt chars over the aggregate cap', () => {
    const perMsg = Math.floor(GATEWAY_LIMITS.MAX_MESSAGE_CHARS * 0.9);
    const count = Math.ceil(GATEWAY_LIMITS.MAX_TOTAL_PROMPT_CHARS / perMsg) + 1;
    const messages = Array.from({ length: Math.min(count, GATEWAY_LIMITS.MAX_MESSAGES) }, () => ({
      role: 'user',
      content: 'x'.repeat(perMsg),
    }));
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ messages })),
      (err: unknown) => err instanceof GatewayError && err.code === 'REQUEST_TOO_LARGE',
    );
  });

  it('rejects max_output_tokens over the cap', () => {
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ max_output_tokens: GATEWAY_LIMITS.MAX_OUTPUT_TOKENS + 1 })),
      (err: unknown) => err instanceof GatewayError && err.code === 'REQUEST_TOO_LARGE',
    );
  });

  it('rejects non-positive max_output_tokens', () => {
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ max_output_tokens: 0 })),
      (err: unknown) => err instanceof GatewayError && err.code === 'MALFORMED_REQUEST',
    );
  });

  it('rejects timeout_ms over the cap', () => {
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ timeout_ms: GATEWAY_LIMITS.MAX_TIMEOUT_MS + 1 })),
      (err: unknown) => err instanceof GatewayError && err.code === 'REQUEST_TOO_LARGE',
    );
  });

  it('rejects an empty messages array', () => {
    assert.throws(
      () => validateGatewayRequest(validRequestBody({ messages: [] })),
      (err: unknown) => err instanceof GatewayError && err.code === 'MALFORMED_REQUEST',
    );
  });

  it('accepts a request at exactly the caps', () => {
    const req = validateGatewayRequest(
      validRequestBody({
        max_output_tokens: GATEWAY_LIMITS.MAX_OUTPUT_TOKENS,
        timeout_ms: GATEWAY_LIMITS.MAX_TIMEOUT_MS,
      }),
    );
    assert.equal(req.max_output_tokens, GATEWAY_LIMITS.MAX_OUTPUT_TOKENS);
    assert.equal(req.timeout_ms, GATEWAY_LIMITS.MAX_TIMEOUT_MS);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Provider request id + event translation
// ════════════════════════════════════════════════════════════════════════

describe('InternalModelGateway.execute — event translation', () => {
  it('emits start -> delta -> end with a stable provider_request_id and redacted metadata', async () => {
    const { gateway } = makeGateway();
    const events = await collect(gateway.execute('super-secret-internal-token', validRequestBody()));

    assert.equal(events[0].type, 'start');
    const id = (events[0] as any).provider_request_id;
    assert.ok(typeof id === 'string' && id.length > 0);

    for (const evt of events) {
      assert.equal((evt as any).provider_request_id, id);
    }

    const end = events[events.length - 1];
    assert.equal(end.type, 'end');
    assert.equal((end as any).full_content, 'hello from fake');
    assert.equal((end as any).provider, 'openrouter');
    assert.equal((end as any).model, 'fake/model');
    assert.equal((end as any).finish_reason, 'stop');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Provider fallback reused, not reimplemented
// ════════════════════════════════════════════════════════════════════════

describe('InternalModelGateway.execute — reuses existing provider fallback', () => {
  it('calls provider.completeWithRetry exactly once per request (host fallback policy, not gateway-invented)', async () => {
    const { gateway, provider } = makeGateway();
    await collect(gateway.execute('super-secret-internal-token', validRequestBody()));
    assert.equal(provider.completeWithRetryCalls, 1);
  });
});

// ════════════════════════════════════════════════════════════════════════
// No raw credential/header/upstream-body disclosure
// ════════════════════════════════════════════════════════════════════════

describe('InternalModelGateway.execute — no raw disclosure on failure', () => {
  it('maps a provider error containing sensitive-looking detail to a safe generic message', async () => {
    const provider = new FakeProvider();
    provider.errorToThrow = new Error('upstream 500: Authorization: Bearer sk-live-abc123, body={"secret":"x"}');
    const { gateway } = makeGateway({ provider });

    const events = await collect(gateway.execute('super-secret-internal-token', validRequestBody()));
    const errorEvent = events.find((e) => e.type === 'error');
    assert.ok(errorEvent);
    const message = (errorEvent as any).message as string;
    assert.equal((errorEvent as any).code, 'UPSTREAM_UNAVAILABLE');
    assert.ok(!message.includes('sk-live'));
    assert.ok(!message.includes('Authorization'));
    assert.ok(!message.includes('secret'));
  });

  it('never includes the configured token anywhere in a failure event', async () => {
    const { gateway } = makeGateway();
    const events = await collect(gateway.execute('wrong', validRequestBody()));
    const serialized = JSON.stringify(events);
    assert.ok(!serialized.includes('super-secret-internal-token'));
  });
});

// ════════════════════════════════════════════════════════════════════════
// Cancel / timeout propagation
// ════════════════════════════════════════════════════════════════════════

describe('InternalModelGateway.execute — timeout propagation', () => {
  it('emits a safe terminal TIMEOUT error when the provider call exceeds timeout_ms', async () => {
    const provider = new FakeProvider();
    provider.delayMs = GATEWAY_LIMITS.MIN_TIMEOUT_MS + 500;
    const { gateway } = makeGateway({ provider });

    const events = await collect(
      gateway.execute('super-secret-internal-token', validRequestBody({ timeout_ms: GATEWAY_LIMITS.MIN_TIMEOUT_MS })),
    );

    const last = events[events.length - 1];
    assert.equal(last.type, 'error');
    assert.equal((last as any).code, 'TIMEOUT');
  });
});

describe('InternalModelGateway.execute — cancellation propagation', () => {
  it('emits a single terminal INTERRUPT event when the caller aborts execution', async () => {
    const provider = new FakeProvider();
    provider.delayMs = 30;
    const { gateway } = makeGateway({ provider });
    const ctl = new AbortController();

    const eventsPromise = collect(gateway.execute('super-secret-internal-token', validRequestBody(), { abortSignal: ctl.signal }));
    setTimeout(() => ctl.abort(), 5);
    const events = await eventsPromise;

    const terminal = events.filter((evt) => evt.type === 'error' || evt.type === 'interrupt' || evt.type === 'end');
    assert.equal(terminal.length, 1);
    assert.equal(terminal[0].type, 'interrupt');
  });
});

describe('readBody — bounded stream guard for /internal/model-gateway', () => {
  it('returns 413 for oversized route body before JSON parsing', async () => {
    const { gateway } = makeGateway();
    const serverConfig = {
      port: 0,
      internalModelGateway: gateway,
      handlers: {
        interpret: async () => ({ status: 200, body: {} as any }),
        heartbeat: async () => ({ status: 200, body: {} as any }),
        mirror: async () => ({ status: 200, body: {} as any }),
        onboard: async () => ({ status: 200, body: { agent_text: '', state: {}, ready: false } as any }),
        generateRhythmEvents: () => [],
      },
    } satisfies ServerConfig;
    const { close, port } = await createServer(serverConfig);

    try {
      const raw = {
        internal_caller_role: 'agentscope-executor',
        task_class: 'fast',
        tier: 'subscriber',
        messages: [{ role: 'user', content: 'hello' }],
        pad: 'x'.repeat(INTERNAL_MODEL_GATEWAY_MAX_BODY_BYTES + 1),
      };
      const payload = JSON.stringify(raw);

      const res = await fetch(`http://127.0.0.1:${port}/internal/model-gateway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer super-secret-internal-token',
        },
        body: payload,
      });

      assert.equal(res.status, 413);
      const body = await res.json();
      assert.equal((body as { error: string }).error, 'Request body too large');
    } finally {
      close();
    }
  });

  it('does not cancel generation for a normal completed small-body request', async () => {
    const { gateway, provider } = makeGateway();
    const serverConfig = {
      port: 0,
      internalModelGateway: gateway,
      handlers: {
        interpret: async () => ({ status: 200, body: {} as any }),
        heartbeat: async () => ({ status: 200, body: {} as any }),
        mirror: async () => ({ status: 200, body: {} as any }),
        onboard: async () => ({ status: 200, body: { agent_text: '', state: {}, ready: false } as any }),
        generateRhythmEvents: () => [],
      },
    } satisfies ServerConfig;
    const { close, port } = await createServer(serverConfig);

    try {
      const res = await fetch(`http://127.0.0.1:${port}/internal/model-gateway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer super-secret-internal-token',
        },
        body: JSON.stringify(validRequestBody()),
      });

      assert.equal(res.status, 200);
      const text = await res.text();
      const events = text
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as GatewayEvent);

      assert.equal(events[0].type, 'start');
      const terminal = events[events.length - 1];
      assert.equal(terminal.type, 'end');
      assert.equal(provider.completeWithRetryCalls, 1);
    } finally {
      close();
    }
  });
});
