// packages/orchestration/src/api/server.ts
// Additive, in-process-facing endpoint registration for the contextual
// interpretation capability. This package has no real HTTP server of its own —
// consistent with the rest of @witness/orchestration (see ../service.ts /
// ../in-process-service.ts), this module just exposes a route-registration-shaped
// function that a real HTTP layer (outside this package) can call into.
//
// Nothing here changes any existing export's signature or behavior; this file is
// new and purely additive.

import {
  createContextualInterpretationEndpoint,
  type ContextualInterpretationWiringOptions,
  type CallContext,
  type ContextualInterpretationOutcome,
} from '../wiring/index.js';

export type ContextualInterpretationHandler = (
  body: unknown,
  ctx: CallContext,
) => Promise<ContextualInterpretationOutcome>;

export interface RouteRegistrar {
  /** Register an in-process route for the given path with the given handler. */
  register(path: string, handler: ContextualInterpretationHandler): void;
}

export const CONTEXTUAL_INTERPRETATION_ROUTE = '/api/contextual-interpretation';

/**
 * Builds the contextual interpretation handler and registers it against the
 * given route registrar (if provided) under CONTEXTUAL_INTERPRETATION_ROUTE.
 * Returns the handler either way so callers/tests can invoke it directly
 * in-process without needing any registrar at all.
 */
export function registerContextualInterpretationRoute(
  options: ContextualInterpretationWiringOptions,
  registrar?: RouteRegistrar,
): ContextualInterpretationHandler {
  const handler = createContextualInterpretationEndpoint(options);
  if (registrar) {
    registrar.register(CONTEXTUAL_INTERPRETATION_ROUTE, handler);
  }
  return handler;
}

export { createContextualInterpretationEndpoint } from '../wiring/index.js';
