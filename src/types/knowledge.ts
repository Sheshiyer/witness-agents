// ─── Witness Agents — Knowledge Types ─────────────────────────────────
// Types for the knowledge domain runtime loader

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN — a queryable knowledge base
// ═══════════════════════════════════════════════════════════════════════

export type DomainId =
  | 'endocrine-muse'
  | 'bioelectric'
  | 'consciousness-states'
  | 'lorenz-kundli'
  | 'pain-architecture'
  | 'sacred-geometry'
  | 'morphic-resonance'
  | 'noetic-aether'
  | 'social-programming'
  | 'process-cosmology';

export interface DomainRecord {
  [key: string]: unknown;
}

export interface DomainIndex {
  id: DomainId;
  records: Map<string, DomainRecord>;
  metadata: {
    source_file: string;
    record_count: number;
    loaded_at: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// CROSS-REFERENCE — links between domains
// ═══════════════════════════════════════════════════════════════════════

export interface CrossReferenceLink {
  from_domain: DomainId;
  from_key: string;
  to_domain: DomainId;
  to_key: string;
  relationship: string;
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE-KNOWLEDGE MAP — which domains an engine needs
// ═══════════════════════════════════════════════════════════════════════

export interface EngineKnowledgeMapping {
  engine: string;
  primary_domains: DomainId[];
  secondary_domains: DomainId[];
  interpretation_template: string;
  required_variables: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// ROUTING RULE — conditional knowledge selection
// ═══════════════════════════════════════════════════════════════════════

export interface RoutingCondition {
  field: string;          // user_state field path
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

export interface RoutingRule {
  name: string;
  agent: 'aletheios' | 'pichet' | 'dyad';
  trigger: 'engine' | 'state' | 'temporal' | 'override';
  conditions: RoutingCondition[];
  domains_to_load: DomainId[];
  priority: number;       // Higher = checked first
}

// ═══════════════════════════════════════════════════════════════════════
// VAULT SOURCE — deep retrieval paths
// ═══════════════════════════════════════════════════════════════════════

export interface VaultSource {
  domain: DomainId;
  vault_files: string[];     // Relative paths in 03-Resources/
  blog_urls: string[];       // URLs to research blog posts
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════
// QUERY INTERFACE
// ═══════════════════════════════════════════════════════════════════════

export interface DomainQuery {
  domain: DomainId;
  key?: string;              // Specific record key (e.g., position number)
  filter?: Record<string, unknown>;   // Filter by field values
}

export interface DomainQueryResult {
  domain: DomainId;
  records: DomainRecord[];
  source: 'cache' | 'loaded' | 'vault-deep';
  query_time_ms: number;
}
