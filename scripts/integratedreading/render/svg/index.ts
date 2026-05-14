// ─── /integratedreading — SVG Renderer Dispatcher ─────────────────────
// Single source of truth mapping `svg_topology` keys (declared in mode-doc
// frontmatter) to their renderer functions. The unified orchestrator
// (integratedreading-mode.ts, P1.1) and the HTML templates layer route
// through this dispatcher rather than importing renderers directly.
//
// Adding a new topology = adding one entry to TOPOLOGY_RENDERERS. The
// orchestrator + interaction modules + tests pick it up automatically.
//
// Per design doc § 5 (svg_topology → renderer map) and § 6 phase 0.2.

import type { TopologyKey } from '../../modes/parser.js';
import { renderCompositeResonance, type CompositeResonanceData } from './composite-resonance.js';
import { renderCompositeTriad, type CompositeTriadData } from './composite-triad.js';
import { renderCompositePenta, type CompositePentaData } from './composite-penta.js';
import { renderTeamWeb, type TeamWebData } from './team-web.js';

// ────────────────────────────────────────────────────────────────────────
// Renderer function shape
// ────────────────────────────────────────────────────────────────────────

export interface RendererOpts {
  width?: number;
  /** Reserved for P2 — when true, renderer emits SVG with class hooks for
   *  the interaction layer to target. Renderers may ignore until P2.2. */
  interactive?: boolean;
}

export interface RendererFn<TData = any> {
  (data: TData, opts?: RendererOpts): string;
}

// ────────────────────────────────────────────────────────────────────────
// NotImplementedError — thrown by stub topologies until their renderer
// lands in P4.2 / P5.2.
// ────────────────────────────────────────────────────────────────────────

class NotImplementedError extends Error {
  constructor(topology: TopologyKey, landing_issue: string) {
    super(
      `SVG topology '${topology}' is not yet implemented. ` +
      `It lands in ${landing_issue}. ` +
      `See docs/plans/2026-05-14-reading-modes-design.md § Section 5 for the design.`,
    );
    this.name = 'NotImplementedError';
  }
}

// ────────────────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────────────────

export const TOPOLOGY_RENDERERS: Record<TopologyKey, RendererFn<any>> = {
  'dyad-arc': renderCompositeResonance as RendererFn<CompositeResonanceData>,
  'triad-triangle': renderCompositeTriad as RendererFn<CompositeTriadData>,
  'pentagon': renderCompositePenta as RendererFn<CompositePentaData>,
  'web-graph': renderTeamWeb as RendererFn<TeamWebData>,
};

// ────────────────────────────────────────────────────────────────────────
// Public dispatcher
// ────────────────────────────────────────────────────────────────────────

/**
 * Look up a renderer by topology key.
 *
 * Throws a clear error (with the list of valid keys) on unknown topology
 * — this catches typos in mode-doc frontmatter at run time instead of
 * silently emitting a blank SVG.
 */
export function getRenderer(topology: string): RendererFn<any> {
  const fn = TOPOLOGY_RENDERERS[topology as TopologyKey];
  if (!fn) {
    throw new Error(
      `Unknown svg_topology '${topology}'. ` +
      `Valid topologies: ${Object.keys(TOPOLOGY_RENDERERS).join(' | ')}`,
    );
  }
  return fn;
}

/** Convenience: dispatch + render in one call. */
export function renderByTopology(
  topology: string,
  data: any,
  opts?: RendererOpts,
): string {
  return getRenderer(topology)(data, opts);
}

// ────────────────────────────────────────────────────────────────────────
// Re-exports — keeps the rest of the codebase importing from one place.
// ────────────────────────────────────────────────────────────────────────

export type { TopologyKey } from '../../modes/parser.js';
export { renderCompositeResonance, type CompositeResonanceData } from './composite-resonance.js';
export { renderCompositeTriad, type CompositeTriadData, type TriadSubject } from './composite-triad.js';
export { renderCompositePenta, type CompositePentaData, type PentaSubject } from './composite-penta.js';
export { renderTeamWeb, type TeamWebData, type TeamMember, type CriticalPathEdge, type RoleCluster } from './team-web.js';
