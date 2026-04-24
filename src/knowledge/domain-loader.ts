// ─── Witness Agents — Knowledge Domain Runtime Loader ─────────────────
// Issue #16: PRANAMAYA-004
// Loads YAML knowledge domains into queryable in-memory structures

import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type {
  DomainId,
  DomainRecord,
  DomainIndex,
  DomainQuery,
  DomainQueryResult,
  CrossReferenceLink,
  EngineKnowledgeMapping,
  VaultSource,
} from '../types/knowledge.js';
import type { SelemeneEngineId } from '../types/engine.js';

// ═══════════════════════════════════════════════════════════════════════
// KNOWLEDGE STORE — in-memory domain cache
// ═══════════════════════════════════════════════════════════════════════

export class KnowledgeStore {
  private domains = new Map<DomainId, DomainIndex>();
  private crossRefs: CrossReferenceLink[] = [];
  private engineMap = new Map<string, EngineKnowledgeMapping>();
  private vaultSources = new Map<DomainId, VaultSource>();
  private knowledgePath: string;

  constructor(knowledgePath: string) {
    this.knowledgePath = knowledgePath;
  }

  // ─── LOADING ─────────────────────────────────────────────────────

  /**
   * Load all knowledge from the knowledge/ directory
   */
  async loadAll(): Promise<{ domains: number; crossRefs: number; engines: number }> {
    const domainsDir = path.join(this.knowledgePath, 'domains');
    const crossRefDir = path.join(this.knowledgePath, 'cross-references');
    const vaultDir = path.join(this.knowledgePath, 'vault-index');

    // Load domains
    let domainCount = 0;
    if (fs.existsSync(domainsDir)) {
      const files = fs.readdirSync(domainsDir).filter(f => f.endsWith('.yaml'));
      for (const file of files) {
        const domainId = file.replace('.yaml', '') as DomainId;
        this.loadDomain(domainId, path.join(domainsDir, file));
        domainCount++;
      }
    }

    // Load cross-references
    let crossRefCount = 0;
    if (fs.existsSync(crossRefDir)) {
      const files = fs.readdirSync(crossRefDir).filter(f => f.endsWith('.yaml'));
      for (const file of files) {
        const filePath = path.join(crossRefDir, file);
        if (file === 'engine-knowledge-map.yaml') {
          this.loadEngineMap(filePath);
        } else if (file === 'hormone-interaction.yaml') {
          crossRefCount += this.loadCrossReferences(filePath);
        }
      }
    }

    // Load vault sources
    if (fs.existsSync(vaultDir)) {
      const sourceMapPath = path.join(vaultDir, 'source-map.yaml');
      if (fs.existsSync(sourceMapPath)) {
        this.loadVaultSources(sourceMapPath);
      }
    }

    return { domains: domainCount, crossRefs: crossRefCount, engines: this.engineMap.size };
  }

  private loadDomain(domainId: DomainId, filePath: string): void {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(raw) as Record<string, unknown>;
    const records = new Map<string, DomainRecord>();

    // Strategy: find the primary data structure in the YAML
    // Most domains have a top-level key containing records (nine_point_matrix, vortexes, etc.)
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Nested object — could be a record collection or metadata
        const obj = value as Record<string, unknown>;
        // If it has numbered keys (1-9) or named sub-objects with structured data, treat as records
        const subKeys = Object.keys(obj);
        if (subKeys.length > 0 && subKeys.every(k => typeof obj[k] === 'object')) {
          for (const [subKey, subVal] of Object.entries(obj)) {
            records.set(`${key}.${subKey}`, subVal as DomainRecord);
          }
        } else {
          records.set(key, obj as DomainRecord);
        }
      } else if (Array.isArray(value)) {
        // Array of records
        value.forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            records.set(`${key}[${i}]`, item as DomainRecord);
          }
        });
      } else {
        // Scalar metadata
        records.set(key, { value } as DomainRecord);
      }
    }

    this.domains.set(domainId, {
      id: domainId,
      records,
      metadata: {
        source_file: filePath,
        record_count: records.size,
        loaded_at: new Date().toISOString(),
      },
    });
  }

  private loadEngineMap(filePath: string): void {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(raw) as Record<string, unknown>;

    // The engine-knowledge-map has engine entries with domains
    const extractMappings = (data: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const entry = value as Record<string, unknown>;
          if (entry.primary_domains || entry.domains) {
            this.engineMap.set(key, {
              engine: key,
              primary_domains: (entry.primary_domains || entry.domains || []) as DomainId[],
              secondary_domains: (entry.secondary_domains || []) as DomainId[],
              interpretation_template: (entry.interpretation_template || entry.template || '') as string,
              required_variables: (entry.required_variables || []) as string[],
            });
          } else {
            // Might be a nested section (e.g., aletheios_primary, pichet_primary)
            extractMappings(entry as Record<string, unknown>);
          }
        }
      }
    };
    extractMappings(parsed);
  }

  private loadCrossReferences(filePath: string): number {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(raw) as Record<string, unknown>;
    let count = 0;

    const extractLinks = (data: Record<string, unknown>, prefix = '') => {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'object' && value !== null) {
          const entry = value as Record<string, unknown>;
          if (entry.from_domain && entry.to_domain) {
            this.crossRefs.push({
              from_domain: entry.from_domain as DomainId,
              from_key: (entry.from_key || key) as string,
              to_domain: entry.to_domain as DomainId,
              to_key: (entry.to_key || '') as string,
              relationship: (entry.relationship || 'related') as string,
            });
            count++;
          } else {
            extractLinks(entry as Record<string, unknown>, `${prefix}${key}.`);
          }
        }
      }
    };
    extractLinks(parsed);
    return count;
  }

  private loadVaultSources(filePath: string): void {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(raw) as Record<string, unknown>;

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'object' && value !== null) {
        const entry = value as Record<string, unknown>;
        this.vaultSources.set(key as DomainId, {
          domain: key as DomainId,
          vault_files: (entry.vault_files || entry.files || []) as string[],
          blog_urls: (entry.blog_urls || entry.urls || []) as string[],
          description: (entry.description || '') as string,
        });
      }
    }
  }

  // ─── QUERYING ────────────────────────────────────────────────────

  /**
   * Query a knowledge domain
   * Examples:
   *   query({ domain: 'endocrine-muse', key: 'nine_point_matrix.5' })
   *   query({ domain: 'bioelectric', filter: { center: 'heart' } })
   */
  query(q: DomainQuery): DomainQueryResult {
    const start = performance.now();
    const domain = this.domains.get(q.domain);

    if (!domain) {
      return {
        domain: q.domain,
        records: [],
        source: 'cache',
        query_time_ms: performance.now() - start,
      };
    }

    let results: DomainRecord[];

    if (q.key) {
      // Direct key lookup
      const record = domain.records.get(q.key);
      results = record ? [record] : [];

      // Try partial key match if exact fails
      if (results.length === 0) {
        results = [];
        for (const [k, v] of domain.records) {
          if (k.includes(q.key)) {
            results.push(v);
          }
        }
      }
    } else if (q.filter) {
      // Filter-based query
      results = [];
      for (const record of domain.records.values()) {
        if (matchesFilter(record, q.filter)) {
          results.push(record);
        }
      }
    } else {
      // Return all records
      results = Array.from(domain.records.values());
    }

    return {
      domain: q.domain,
      records: results,
      source: 'cache',
      query_time_ms: performance.now() - start,
    };
  }

  /**
   * Query by Selemene engine — returns all relevant knowledge domains
   */
  queryForEngine(engineId: SelemeneEngineId | string): DomainQueryResult[] {
    const mapping = this.engineMap.get(engineId);
    if (!mapping) return [];

    const allDomains = [...mapping.primary_domains, ...mapping.secondary_domains];
    return allDomains.map(domainId =>
      this.query({ domain: domainId })
    );
  }

  /**
   * Follow cross-references from a domain record
   */
  getCrossReferences(domainId: DomainId, key?: string): CrossReferenceLink[] {
    return this.crossRefs.filter(ref =>
      ref.from_domain === domainId && (!key || ref.from_key === key)
    );
  }

  /**
   * Get vault source paths for deep retrieval
   */
  getVaultSources(domainId: DomainId): VaultSource | undefined {
    return this.vaultSources.get(domainId);
  }

  /**
   * Get engine → knowledge mapping
   */
  getEngineMapping(engineId: string): EngineKnowledgeMapping | undefined {
    return this.engineMap.get(engineId);
  }

  /**
   * Check if a domain is loaded
   */
  hasDomain(domainId: DomainId): boolean {
    return this.domains.has(domainId);
  }

  /**
   * Get all loaded domain IDs
   */
  getLoadedDomains(): DomainId[] {
    return Array.from(this.domains.keys());
  }

  /**
   * Stats
   */
  getStats(): { domains: number; totalRecords: number; crossRefs: number; engineMappings: number } {
    let totalRecords = 0;
    for (const domain of this.domains.values()) {
      totalRecords += domain.records.size;
    }
    return {
      domains: this.domains.size,
      totalRecords,
      crossRefs: this.crossRefs.length,
      engineMappings: this.engineMap.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FILTER MATCHING
// ═══════════════════════════════════════════════════════════════════════

function matchesFilter(record: DomainRecord, filter: Record<string, unknown>): boolean {
  for (const [key, expectedValue] of Object.entries(filter)) {
    const actualValue = getNestedValue(record, key);
    if (actualValue === undefined) return false;
    if (typeof expectedValue === 'string' && typeof actualValue === 'string') {
      if (!actualValue.toLowerCase().includes(expectedValue.toLowerCase())) return false;
    } else if (actualValue !== expectedValue) {
      return false;
    }
  }
  return true;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
