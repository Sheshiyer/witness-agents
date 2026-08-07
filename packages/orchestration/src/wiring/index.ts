// packages/orchestration/src/wiring/index.ts
// In-process composition root for the contextual interpretation capability.
// Wires together injected repositories/adapters + the existing native executor
// seam + the endpoint handler, for use by tests and (later) a real server.ts.

import {
  handleContextualInterpretation,
  type CallContext,
  type ContextualInterpretationDeps,
  type ContextualInterpretationOutcome,
  type ReadingRepository,
  type RelationshipGrantChecker,
  type TaskDescriptorFactory,
} from '../api/contextual-interpretation.js';
import type { ExecutorV2 } from '../executor-v2.js';

export {
  handleContextualInterpretation,
  validateContextualInterpretationRequest,
  READING_NOT_FOUND_MESSAGE,
  INTERPRETATION_DEPTHS,
  type CallContext,
  type ContextualInterpretationDeps,
  type ContextualInterpretationOutcome,
  type ContextualInterpretationRequest,
  type ContextualInterpretationParams,
  type InterpretationDepth,
  type TrustedReadingRecord,
  type ReadingRepository,
  type RelationshipGrantChecker,
  type TaskDescriptorFactory,
  type CompleteOutcome,
  type RejectedOutcome,
  type CancelledOutcome,
  type TimeoutOutcome,
  type ErrorOutcome,
} from '../api/contextual-interpretation.js';

export interface ContextualInterpretationWiringOptions {
  readingRepo: ReadingRepository;
  grantChecker: RelationshipGrantChecker;
  executor: ExecutorV2;
  taskDescriptorFactory: TaskDescriptorFactory;
  now?: () => string;
  runIdFactory?: () => string;
  attemptIdFactory?: () => string;
}

/**
 * Composes the injected dependencies into a single callable endpoint function:
 * (requestBody, callContext) => outcome. This is the in-process wiring consumed
 * by tests and, later, by an actual HTTP-facing server.ts.
 */
export function createContextualInterpretationEndpoint(
  options: ContextualInterpretationWiringOptions,
): (body: unknown, ctx: CallContext) => Promise<ContextualInterpretationOutcome> {
  const deps: ContextualInterpretationDeps = {
    readingRepo: options.readingRepo,
    grantChecker: options.grantChecker,
    executor: options.executor,
    taskDescriptorFactory: options.taskDescriptorFactory,
    now: options.now,
    runIdFactory: options.runIdFactory,
    attemptIdFactory: options.attemptIdFactory,
  };
  return (body: unknown, ctx: CallContext) => handleContextualInterpretation(body, ctx, deps);
}
