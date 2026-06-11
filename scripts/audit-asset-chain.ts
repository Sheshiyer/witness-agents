#!/usr/bin/env npx tsx
/**
 * Audit the chain from deterministic engine data -> interpretation -> source pack -> manifest.
 *
 * This is read-only: it never calls NotebookLM and never mutates packs.
 *
 * Usage:
 *   npx tsx scripts/audit-asset-chain.ts --inputDir .batch-inputs --readingDir .batch-outputs --assetDir .premium-assets
 *   npx tsx scripts/audit-asset-chain.ts --inputDir .asset-run-inputs --readingDir .asset-run-readings --assetDir .premium-assets-witness-harshita
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SOMATIC_LAYER_APPROVED, CREATIVE_ORACLE_LAYER_APPROVED } from '../src/wiring/graphs/section-witness.js';

type Severity = 'blocker' | 'warning';

interface Finding {
  personId: string;
  layer: 'engine' | 'interpretation' | 'source-pack' | 'manifest' | 'notebooklm';
  code: string;
  severity: Severity;
  detail: string;
}

interface Args {
  inputDir: string;
  readingDir: string;
  assetDir: string;
  out?: string;
  person?: string;
}

const KNOWN_NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];

function parseArgs(): Args {
  const raw = process.argv.slice(2);
  const opts: Record<string, string> = {};
  for (let i = 0; i < raw.length; i++) {
    if (!raw[i].startsWith('--')) continue;
    const key = raw[i].slice(2);
    const val = raw[i + 1];
    if (val && !val.startsWith('--')) {
      opts[key] = val;
      i++;
    }
  }
  return {
    inputDir: opts.inputDir || '.batch-inputs',
    readingDir: opts.readingDir || '.batch-outputs',
    assetDir: opts.assetDir || '.premium-assets',
    out: opts.out,
    person: opts.person,
  };
}

function loadJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function loadEngineData(path: string): Record<string, any> {
  const raw = loadJson(path);
  if (raw?.synastry_partners && Array.isArray(raw.synastry_partners)) return raw;
  if (!Array.isArray(raw)) return raw;
  return loadEngineDataFromArray(raw);
}

function loadEngineDataFromArray(raw: any[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const entry of raw) {
    const id = entry.engine_id || entry.engine;
    if (id) out[id] = entry;
  }
  return out;
}

function isSynastryEngineData(engineData: Record<string, any>): boolean {
  return Array.isArray((engineData as any).synastry_partners);
}

function partnerEngineData(engineData: Record<string, any>): Array<{ id: string; name: string; engines: Record<string, any>; facts: Record<string, unknown> }> {
  if (!isSynastryEngineData(engineData)) return [];
  return (engineData as any).synastry_partners.map((partner: any) => {
    const engines = Array.isArray(partner.engines) ? loadEngineDataFromArray(partner.engines) : (partner.engines || {});
    return { id: partner.id || partner.name || 'partner', name: partner.name || partner.id || 'Partner', engines, facts: extractFacts(engines) };
  });
}

function hasEngine(engineData: Record<string, any>, engineId: string): boolean {
  if (isSynastryEngineData(engineData)) return partnerEngineData(engineData).some(partner => hasEngine(partner.engines, engineId));
  return !!engineData[engineId] && !engineData[engineId]._error;
}

function extractFacts(engineData: Record<string, any>): Record<string, unknown> {
  if (isSynastryEngineData(engineData)) {
    const facts: Record<string, unknown> = {};
    for (const partner of partnerEngineData(engineData)) {
      const prefix = `partner_${partner.id}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      facts[`${prefix}_name`] = partner.name;
      for (const [key, value] of Object.entries(partner.facts)) facts[`${prefix}_${key}`] = value;
    }
    return Object.fromEntries(Object.entries(facts).filter(([, value]) => value !== undefined && value !== null));
  }

  const facts: Record<string, unknown> = {};
  for (const [engineId, output] of Object.entries(engineData)) {
    const result = output?.result || output;
    if (engineId === 'panchanga') {
      facts.natal_panchanga_nakshatra = result.nakshatra_name;
      facts.natal_panchanga_tithi = result.tithi_name;
      facts.natal_panchanga_vara = result.vara_name;
      facts.natal_panchanga_yoga = result.yoga_name;
      facts.natal_panchanga_karana = result.karana_name;
    }
    if (engineId === 'current-panchanga') {
      facts.current_panchanga_nakshatra = result.nakshatra_name;
      facts.current_panchanga_tithi = result.tithi_name;
      facts.current_panchanga_vara = result.vara_name;
    }
    if (engineId === 'vimshottari') {
      facts.vimshottari_mahadasha = result.current_period?.mahadasha?.planet;
      facts.vimshottari_antardasha = result.current_period?.antardasha?.planet;
      facts.vimshottari_pratyantardasha = result.current_period?.pratyantardasha?.planet;
    }
    if (engineId === 'human-design') {
      facts.human_design_type = result.type;
      facts.human_design_authority = result.authority;
      facts.human_design_profile = result.profile;
      facts.human_design_definition = result.definition;
    }
    if (engineId === 'biofield') {
      facts.biofield_available = true;
      facts.biofield_coherence = result.coherence || result.metrics?.coherence;
      facts.biofield_interpretation = result.interpretation;
    }
    if (engineId === 'face-reading') {
      const constitution = result.analysis?.constitution || result.constitution || {};
      facts.face_reading_available = true;
      facts.face_reading_primary_dosha = constitution.primary_dosha;
      facts.face_reading_secondary_dosha = constitution.secondary_dosha;
    }
  }
  return Object.fromEntries(Object.entries(facts).filter(([, value]) => value !== undefined && value !== null));
}

function readSourcePack(assetDir: string, personId: string): string {
  const dir = join(assetDir, personId, 'source-pack');
  if (!existsSync(dir)) return '';
  return readdirSync(dir)
    .filter(file => file.endsWith('.md'))
    .sort()
    .map(file => `\n<!-- ${file} -->\n${readFileSync(join(dir, file), 'utf-8')}`)
    .join('\n\n');
}

function mentionedNakshatras(text: string): string[] {
  return KNOWN_NAKSHATRAS.filter(name => new RegExp(`\\b${name.replace(/ /g, '\\s+')}\\b`, 'i').test(text));
}

function auditPerson(personId: string, args: Args): Finding[] {
  const findings: Finding[] = [];
  const inputPath = join(args.inputDir, `${personId}.json`);
  const readingPath = join(args.readingDir, `${personId}.md`);
  const manifestPath = join(args.assetDir, personId, 'manifest.json');

  if (!existsSync(inputPath)) {
    findings.push({ personId, layer: 'engine', code: 'missing_input', severity: 'blocker', detail: inputPath });
    return findings;
  }
  if (!existsSync(readingPath)) {
    findings.push({ personId, layer: 'interpretation', code: 'missing_reading', severity: 'blocker', detail: readingPath });
  }

  const engineData = loadEngineData(inputPath);
  const facts = extractFacts(engineData);
  const reading = existsSync(readingPath) ? readFileSync(readingPath, 'utf-8') : '';
  const sourcePack = readSourcePack(args.assetDir, personId);
  const combined = `${reading}\n\n${sourcePack}`;
  const isSynastry = /synastry|composite|partner/i.test(personId);

  if (isSynastry && (!isSynastryEngineData(engineData) || Object.keys(facts).length < 12)) {
    findings.push({
      personId,
      layer: 'engine',
      code: 'synastry_missing_deterministic_facts',
      severity: 'blocker',
      detail: `Only ${Object.keys(facts).length} deterministic facts extracted; generated prose should not be primary source.`,
    });
  }

  const expectedNakshatra = !isSynastry && facts.natal_panchanga_nakshatra ? String(facts.natal_panchanga_nakshatra) : undefined;
  if (expectedNakshatra) {
    const unexpected = mentionedNakshatras(combined).filter(name => name.toLowerCase() !== expectedNakshatra.toLowerCase());
    if (unexpected.length > 0) {
      findings.push({
        personId,
        layer: 'interpretation',
        code: 'nakshatra_drift',
        severity: 'blocker',
        detail: `Expected ${expectedNakshatra}; also found ${[...new Set(unexpected)].join(', ')}.`,
      });
    }
  }

  if (isSynastry && isSynastryEngineData(engineData)) {
    const expected = partnerEngineData(engineData)
      .map(partner => String(partner.facts.natal_panchanga_nakshatra || ''))
      .filter(Boolean)
      .map(name => name.toLowerCase());
    const unexpected = mentionedNakshatras(sourcePack).filter(name => !expected.includes(name.toLowerCase()));
    if (unexpected.length > 0) {
      findings.push({
        personId,
        layer: 'source-pack',
        code: 'synastry_partner_nakshatra_drift',
        severity: 'blocker',
        detail: `Expected partner nakshatras ${expected.join(', ')}; unexpected source mentions ${[...new Set(unexpected)].join(', ')}.`,
      });
    }
  }

  const hasSomaticData = hasEngine(engineData, 'biofield') || hasEngine(engineData, 'face-reading') || hasEngine(engineData, 'biofield-capture');
  if (hasSomaticData) {
    if (!SOMATIC_LAYER_APPROVED) {
      findings.push({ personId, layer: 'engine', code: 'somatic_layer_not_approved', severity: 'blocker', detail: 'Somatic engine data is present but SOMATIC_LAYER_APPROVED is false. Remove biofield, face-reading, and nadabrahman from inputs, or set SOMATIC_LAYER_APPROVED=true only after explicit roadmap approval.' });
    } else {
      if (!/biofield|face-reading|face reading|dosha|somatic|coherence/i.test(sourcePack)) {
        findings.push({ personId, layer: 'source-pack', code: 'somatic_data_omitted', severity: 'blocker', detail: 'Somatic engines exist but source pack lacks somatic anchors.' });
      }
      if (/no recorded data for .*Somatic|no somatic data|absence of (a )?somatic map|absence of somatic data/i.test(sourcePack)) {
        findings.push({ personId, layer: 'source-pack', code: 'somatic_false_absence', severity: 'blocker', detail: 'Somatic engines exist but source pack claims absence.' });
      }
    }
  }

  const hasOracleData = hasEngine(engineData, 'i-ching') || hasEngine(engineData, 'tarot') || hasEngine(engineData, 'sacred-geometry') || hasEngine(engineData, 'sigil-forge');
  if (hasOracleData && !CREATIVE_ORACLE_LAYER_APPROVED) {
    findings.push({ personId, layer: 'engine', code: 'creative_oracle_layer_not_approved', severity: 'blocker', detail: 'Creative Oracle engine data is present but CREATIVE_ORACLE_LAYER_APPROVED is false. Remove i-ching, tarot, sacred-geometry, and sigil-forge from inputs, or set CREATIVE_ORACLE_LAYER_APPROVED=true only after explicit roadmap approval.' });
  }

  const hasCurrentPanchanga = !!facts.current_panchanga_tithi || !!facts.current_panchanga_nakshatra;
  if (!hasCurrentPanchanga && /today'?s?\s+(vedic|cosmic|panchanga)|today'?s?\s+nakshatra|lunar day you are living in/i.test(sourcePack)) {
    findings.push({ personId, layer: 'source-pack', code: 'natal_panchanga_used_as_current_weather', severity: 'blocker', detail: 'Source pack describes natal Panchanga as current-day timing.' });
  }

  if (existsSync(manifestPath)) {
    const manifest = loadJson(manifestPath);
    if (manifest.gate?.status === 'pass' && findings.some(f => f.severity === 'blocker')) {
      findings.push({ personId, layer: 'manifest', code: 'manifest_gate_false_pass', severity: 'blocker', detail: 'Manifest gate passes despite audit blockers.' });
    }
    if (manifest.notebooklm?.enabled && manifest.gate?.status === 'blocked') {
      findings.push({ personId, layer: 'notebooklm', code: 'notebooklm_enabled_while_blocked', severity: 'blocker', detail: 'NotebookLM enabled while deterministic gate is blocked.' });
    }
  } else if (sourcePack) {
    findings.push({ personId, layer: 'manifest', code: 'missing_manifest', severity: 'warning', detail: manifestPath });
  }

  return findings;
}

function main() {
  const args = parseArgs();
  const people = args.person
    ? [args.person]
    : readdirSync(args.inputDir).filter(file => file.endsWith('.json')).map(file => file.replace(/\.json$/, '')).sort();
  const findings = people.flatMap(person => auditPerson(person, args));
  const summary = {
    generatedAt: new Date().toISOString(),
    inputDir: resolve(args.inputDir),
    readingDir: resolve(args.readingDir),
    assetDir: resolve(args.assetDir),
    people: people.length,
    blockers: findings.filter(f => f.severity === 'blocker').length,
    warnings: findings.filter(f => f.severity === 'warning').length,
    findings,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (args.out) writeFileSync(args.out, JSON.stringify(summary, null, 2));
  process.exit(summary.blockers > 0 ? 2 : 0);
}

main();
