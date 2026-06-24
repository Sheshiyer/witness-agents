/**
 * P3-W3 — Actor / streaming GroundingProvider skeleton.
 *
 * This file provides the full actor model skeleton for supervised concurrent grounding
 * (Elixir/OTP style, Durable Objects, etc.) without changing any current InProcess behavior.
 *
 * The real implementation will live behind the same GroundingProvider port
 * (or the StreamingGroundingProvider extension) so callers and graphs are unaffected.
 *
 * See ADR-003-grounding-actor.md for the full rationale and migration plan.
 */

import type {
  GroundingProvider,
  GroundedPassage,
  RetrievalQuery,
  StreamingGroundingProvider,
  PrivateIndexManager,
  IndexScope,
} from './grounding.js';
import { NoopPrivateIndexManager } from './grounding.js';

// ---------------------------------------------------------------------------
// Actor Message Types (Erlang/OTP style, TS approximation)
// ---------------------------------------------------------------------------

export type ActorRef = { id: string };

export type RetrievalMessage =
  | { tag: 'retrieve'; query: RetrievalQuery; replyTo: ActorRef }
  | { tag: 'retrieve-stream'; query: RetrievalQuery; replyTo: ActorRef }
  | { tag: 'cancel'; queryId: string }
  | { tag: 'shutdown' };

export type RetrievalReply =
  | { tag: 'passages'; passages: GroundedPassage[] }
  | { tag: 'passage'; passage: GroundedPassage } // For streaming
  | { tag: 'stream-end' }
  | { tag: 'error'; reason: string }
  | { tag: 'timeout' }
  | { tag: 'cancelled' };

export type SupervisionSignal =
  | { tag: 'restart'; reason: string }
  | { tag: 'escalate'; error: Error }
  | { tag: 'resume' };

// ---------------------------------------------------------------------------
// Actor State & Lifecycle
// ---------------------------------------------------------------------------

export interface ActorState {
  id: string;
  status: 'idle' | 'busy' | 'crashed' | 'stopped';
  restartCount: number;
  lastError?: string;
  pendingQueries: Map<string, { query: RetrievalQuery; startTime: number }>;
}

export interface ActorConfig {
  maxRestarts: number;
  restartWindowMs: number;
  timeoutMs: number;
  maxConcurrentQueries: number;
}

const DEFAULT_ACTOR_CONFIG: ActorConfig = {
  maxRestarts: 3,
  restartWindowMs: 60_000,
  timeoutMs: 10_000,
  maxConcurrentQueries: 5,
};

// ---------------------------------------------------------------------------
// Retrieval Worker Actor (simulated)
// ---------------------------------------------------------------------------

/**
 * Simulated retrieval worker actor.
 * In a real implementation, this would be a separate process/isolate with message passing.
 */
export class RetrievalWorkerActor {
  private state: ActorState;
  private config: ActorConfig;
  private indexManager: PrivateIndexManager;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(
    id: string,
    indexManager: PrivateIndexManager = NoopPrivateIndexManager,
    config: Partial<ActorConfig> = {}
  ) {
    this.state = {
      id,
      status: 'idle',
      restartCount: 0,
      pendingQueries: new Map(),
    };
    this.config = { ...DEFAULT_ACTOR_CONFIG, ...config };
    this.indexManager = indexManager;
  }

  get id(): string {
    return this.state.id;
  }

  get status(): ActorState['status'] {
    return this.state.status;
  }

  /**
   * Handle incoming message (actor receive loop simulation).
   */
  async receive(msg: RetrievalMessage): Promise<RetrievalReply> {
    switch (msg.tag) {
      case 'retrieve':
        return this.handleRetrieve(msg.query);

      case 'cancel':
        return this.handleCancel(msg.queryId);

      case 'shutdown':
        this.state.status = 'stopped';
        return { tag: 'cancelled' };

      default:
        return { tag: 'error', reason: `Unknown message tag` };
    }
  }

  /**
   * Handle streaming retrieval (yields passages as async iterable).
   */
  async *receiveStream(query: RetrievalQuery): AsyncIterable<GroundedPassage> {
    const queryId = `${this.state.id}-${Date.now()}`;
    const abortController = new AbortController();
    this.abortControllers.set(queryId, abortController);
    this.state.pendingQueries.set(queryId, { query, startTime: Date.now() });
    this.state.status = 'busy';

    try {
      // Retrieve all passages first (in real impl, this would be streaming from vector DB)
      const passages = await this.indexManager.retrieve({
        ...query,
        scope: { subjectId: query.subjectId, includeGlobalCorpus: true },
      });

      // Yield passages one by one (simulating stream)
      for (const passage of passages) {
        if (abortController.signal.aborted) {
          break;
        }
        // Simulate async delay (in real impl, this is natural from network/DB)
        await new Promise(resolve => setTimeout(resolve, 10));
        yield passage;
      }
    } finally {
      this.state.pendingQueries.delete(queryId);
      this.abortControllers.delete(queryId);
      if (this.state.pendingQueries.size === 0) {
        this.state.status = 'idle';
      }
    }
  }

  private async handleRetrieve(query: RetrievalQuery): Promise<RetrievalReply> {
    const queryId = `${this.state.id}-${Date.now()}`;
    this.state.pendingQueries.set(queryId, { query, startTime: Date.now() });
    this.state.status = 'busy';

    try {
      // Check concurrency limit
      if (this.state.pendingQueries.size > this.config.maxConcurrentQueries) {
        return { tag: 'error', reason: 'Too many concurrent queries (back-pressure)' };
      }

      // Retrieve with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), this.config.timeoutMs)
      );

      const retrievePromise = this.indexManager.retrieve({
        ...query,
        scope: { subjectId: query.subjectId, includeGlobalCorpus: true },
      });

      const passages = await Promise.race([retrievePromise, timeoutPromise]);
      return { tag: 'passages', passages };
    } catch (error) {
      this.state.lastError = String(error);
      if (String(error).includes('Timeout')) {
        return { tag: 'timeout' };
      }
      return { tag: 'error', reason: String(error) };
    } finally {
      this.state.pendingQueries.delete(queryId);
      if (this.state.pendingQueries.size === 0) {
        this.state.status = 'idle';
      }
    }
  }

  private handleCancel(queryId: string): RetrievalReply {
    const controller = this.abortControllers.get(queryId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(queryId);
      this.state.pendingQueries.delete(queryId);
      return { tag: 'cancelled' };
    }
    return { tag: 'error', reason: 'Query not found' };
  }

  /**
   * Supervision: handle restart signal.
   */
  handleSupervision(signal: SupervisionSignal): void {
    switch (signal.tag) {
      case 'restart':
        this.state.restartCount++;
        this.state.status = 'idle';
        this.state.pendingQueries.clear();
        this.abortControllers.forEach(c => c.abort());
        this.abortControllers.clear();
        break;

      case 'escalate':
        this.state.status = 'crashed';
        this.state.lastError = signal.error.message;
        break;

      case 'resume':
        if (this.state.status === 'crashed') {
          this.state.status = 'idle';
        }
        break;
    }
  }

  /**
   * Get actor state for observability.
   */
  getState(): Readonly<ActorState> {
    return { ...this.state, pendingQueries: new Map(this.state.pendingQueries) };
  }
}

// ---------------------------------------------------------------------------
// Actor Pool Supervisor
// ---------------------------------------------------------------------------

/**
 * Supervisor for a pool of retrieval worker actors.
 * Manages lifecycle, restarts, and work distribution.
 */
export class RetrievalActorPool {
  private workers: Map<string, RetrievalWorkerActor> = new Map();
  private config: ActorConfig;
  private indexManager: PrivateIndexManager;

  constructor(
    indexManager: PrivateIndexManager = NoopPrivateIndexManager,
    config: Partial<ActorConfig> = {}
  ) {
    this.config = { ...DEFAULT_ACTOR_CONFIG, ...config };
    this.indexManager = indexManager;
  }

  /**
   * Get or create a worker for the given perspective.
   */
  getWorker(perspective: string): RetrievalWorkerActor {
    let worker = this.workers.get(perspective);
    if (!worker || worker.status === 'crashed' || worker.status === 'stopped') {
      worker = new RetrievalWorkerActor(
        `worker-${perspective}`,
        this.indexManager,
        this.config
      );
      this.workers.set(perspective, worker);
    }
    return worker;
  }

  /**
   * Shutdown all workers gracefully.
   */
  async shutdown(): Promise<void> {
    for (const worker of this.workers.values()) {
      await worker.receive({ tag: 'shutdown' });
    }
    this.workers.clear();
  }

  /**
   * Get pool status for observability.
   */
  getPoolStatus(): { workers: Array<{ id: string; status: string; restartCount: number }> } {
    return {
      workers: Array.from(this.workers.values()).map(w => ({
        id: w.id,
        status: w.status,
        restartCount: w.getState().restartCount,
      })),
    };
  }
}

// ---------------------------------------------------------------------------
// Actor-backed StreamingGroundingProvider
// ---------------------------------------------------------------------------

/**
 * Full actor-backed streaming grounding provider.
 * Uses RetrievalActorPool for supervised concurrent retrieval.
 */
export class ActorGroundingProvider implements StreamingGroundingProvider {
  private pool: RetrievalActorPool;
  private minRelevance: number;

  constructor(
    indexManager: PrivateIndexManager = NoopPrivateIndexManager,
    options: { minRelevance?: number; actorConfig?: Partial<ActorConfig> } = {}
  ) {
    this.pool = new RetrievalActorPool(indexManager, options.actorConfig);
    this.minRelevance = options.minRelevance ?? 0.65;
  }

  async retrieve(query: RetrievalQuery): Promise<GroundedPassage[]> {
    const worker = this.pool.getWorker(query.perspective);
    const reply = await worker.receive({ tag: 'retrieve', query, replyTo: { id: 'caller' } });

    if (reply.tag === 'passages') {
      return reply.passages.filter(p => p.score >= this.minRelevance);
    }

    // On error/timeout, return empty (graceful degradation)
    return [];
  }

  async *retrieveStream(query: RetrievalQuery): AsyncIterable<GroundedPassage> {
    const worker = this.pool.getWorker(query.perspective);

    for await (const passage of worker.receiveStream(query)) {
      if (passage.score >= this.minRelevance) {
        yield passage;
      }
    }
  }

  async estimateCost(query: RetrievalQuery): Promise<{ latencyMs: number; tokens?: number; costUsd?: number }> {
    // In real impl, this would query the index manager's metadata
    const estimatedPassages = query.maxPassages ?? 5;
    return {
      latencyMs: estimatedPassages * 50, // ~50ms per passage
      tokens: estimatedPassages * 100, // ~100 tokens per passage
      costUsd: estimatedPassages * 0.0001, // ~$0.0001 per passage
    };
  }

  /**
   * Get pool status for observability.
   */
  getPoolStatus() {
    return this.pool.getPoolStatus();
  }

  /**
   * Shutdown the provider and all workers.
   */
  async shutdown(): Promise<void> {
    await this.pool.shutdown();
  }
}

// ---------------------------------------------------------------------------
// Legacy stub (for backwards compatibility)
// ---------------------------------------------------------------------------

/**
 * Simple stub that satisfies the streaming interface (original P3 skeleton).
 * @deprecated Use ActorGroundingProvider for full actor semantics.
 */
export class ActorGroundingProviderStub implements StreamingGroundingProvider {
  async retrieve(_query: RetrievalQuery): Promise<GroundedPassage[]> {
    return [];
  }

  async *retrieveStream(_query: RetrievalQuery): AsyncIterable<GroundedPassage> {
    // Empty stream
  }

  async estimateCost(_query: RetrievalQuery) {
    return { latencyMs: 0, tokens: 0, costUsd: 0 };
  }
}

// Re-export types for consumers
export type { StreamingGroundingProvider };
