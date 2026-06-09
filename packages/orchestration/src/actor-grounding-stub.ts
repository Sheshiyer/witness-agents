/**
 * P3 skeleton — Actor / streaming GroundingProvider stub.
 *
 * This file demonstrates the direction for supervised concurrent grounding
 * (Elixir/OTP style, Durable Objects, etc.) without changing any current behavior.
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
} from './grounding.js';

/**
 * Placeholder for a future actor-backed provider.
 * Today it is just a no-op that satisfies the streaming interface.
 */
export class ActorGroundingProviderStub implements StreamingGroundingProvider {
  async retrieve(_query: RetrievalQuery): Promise<GroundedPassage[]> {
    // In a real actor implementation this would message a supervised retrieval actor
    // (per-subject index, global corpus, extraction pipeline, etc.) and await the reply.
    return [];
  }

  async *retrieveStream(_query: RetrievalQuery): AsyncIterable<GroundedPassage> {
    // Future: yield passages as they arrive from concurrent workers,
    // support cancellation tokens, supervision restarts, back-pressure, etc.
    // For now: empty stream.
  }

  async estimateCost(_query: RetrievalQuery) {
    return { latencyMs: 0, tokens: 0, costUsd: 0 };
  }
}

// Re-export the interface for consumers who want to type against the future
export type { StreamingGroundingProvider };
