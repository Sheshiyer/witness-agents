// ─── /integratedreading — Drift Report ─────────────────────────────
// Compares hardened DOCX values against Selemene Rust-engine computed values.
// The DOCX is authoritative; Selemene is the system under test. Drift is
// reported as calibration signal — it does NOT modify the rendered reading.

import type { SelemeneEngineOutput } from './fetcher.js';

export interface HardenedReference {
  subject: string;
  lagna?: string;
  atmakaraka?: string;
  birth_nakshatra?: string;
  mahadasha?: {
    current_lord: string;
    current_ends_iso?: string;        // hardened docx timestamp
    next_lord: string;
    next_starts_iso?: string;
    next_duration_years?: number;
  };
}

export interface DriftRow {
  field: string;
  docx_value: string;
  selemene_value: string;
  delta?: string;
  severity: 'aligned' | 'minor' | 'major' | 'critical';
}

export interface DriftReport {
  subject: string;
  generated_at: string;
  rows: DriftRow[];
  summary: {
    aligned: number;
    minor: number;
    major: number;
    critical: number;
  };
  rust_engine_version?: string;
  ayanamsa_note: string;
}

function classifyTimeDelta(deltaMs: number): 'aligned' | 'minor' | 'major' | 'critical' {
  const days = Math.abs(deltaMs) / (1000 * 60 * 60 * 24);
  if (days < 0.1) return 'aligned';      // < 2.4 hours
  if (days < 7) return 'minor';          // < 1 week
  if (days < 60) return 'major';         // < 2 months
  return 'critical';
}

function formatDelta(deltaMs: number): string {
  if (Math.abs(deltaMs) < 60_000) return `${(deltaMs / 1000).toFixed(0)}s`;
  const days = deltaMs / (1000 * 60 * 60 * 24);
  if (Math.abs(days) < 1) {
    const hours = days * 24;
    return `${hours >= 0 ? '+' : ''}${hours.toFixed(1)}h`;
  }
  return `${days >= 0 ? '+' : ''}${days.toFixed(1)}d`;
}

function normalizePlanet(s: string): string {
  return (s || '').trim().toLowerCase().split(/[\s_]/)[0];
}

export function computeDriftReport(
  reference: HardenedReference,
  selemene: SelemeneEngineOutput[],
): DriftReport {
  const rows: DriftRow[] = [];

  // Vimshottari engine — authoritative Selemene source for MD comparison
  const vim = selemene.find((o) => o.engine_id === 'vimshottari' && !o._error);
  const vimResult = vim?.result;

  // Birth nakshatra
  if (reference.birth_nakshatra && vimResult?.birth_nakshatra?.name) {
    const docxBN = reference.birth_nakshatra.trim();
    const selBN = vimResult.birth_nakshatra.name.trim();
    rows.push({
      field: 'birth_nakshatra',
      docx_value: docxBN,
      selemene_value: selBN,
      severity: docxBN.toLowerCase() === selBN.toLowerCase() ? 'aligned' : 'major',
    });
  }

  // Mahadasha current lord
  if (reference.mahadasha && vimResult?.current_period?.mahadasha) {
    const docxLord = normalizePlanet(reference.mahadasha.current_lord);
    const selLord = normalizePlanet(vimResult.current_period.mahadasha.planet);
    rows.push({
      field: 'mahadasha_current_lord',
      docx_value: docxLord,
      selemene_value: selLord,
      severity: docxLord === selLord ? 'aligned' : 'critical',
    });
  }

  // Mahadasha current ends (TIME DRIFT — this is the calibration signal)
  if (reference.mahadasha?.current_ends_iso && vimResult?.current_period?.mahadasha?.end) {
    const docxT = new Date(reference.mahadasha.current_ends_iso);
    const selT = new Date(vimResult.current_period.mahadasha.end);
    if (!isNaN(docxT.getTime()) && !isNaN(selT.getTime())) {
      const deltaMs = selT.getTime() - docxT.getTime();
      rows.push({
        field: 'mahadasha_current_ends',
        docx_value: docxT.toISOString(),
        selemene_value: selT.toISOString(),
        delta: formatDelta(deltaMs),
        severity: classifyTimeDelta(deltaMs),
      });
    }
  }

  // Next mahadasha lord
  if (reference.mahadasha?.next_lord && vimResult?.timeline?.mahadashas) {
    const docxLord = normalizePlanet(reference.mahadasha.next_lord);
    // Find the next MD in Selemene's timeline after current.
    // Use the index-of-current + 1 approach (more robust than start_date > end_date,
    // which fails when the next-MD start equals current-MD end exactly).
    const currentPlanet = vimResult.current_period.mahadasha.planet;
    const currentStart = vimResult.current_period.mahadasha.start;
    const timeline: any[] = vimResult.timeline.mahadashas;
    const idx = timeline.findIndex((m) => m.planet === currentPlanet && m.start_date === currentStart);
    const nextMd = idx >= 0 && idx + 1 < timeline.length
      ? timeline[idx + 1]
      : timeline.find((m: any) => new Date(m.start_date) >= new Date(vimResult.current_period.mahadasha.end));
    if (nextMd) {
      const selLord = normalizePlanet(nextMd.planet);
      rows.push({
        field: 'mahadasha_next_lord',
        docx_value: docxLord,
        selemene_value: selLord,
        severity: docxLord === selLord ? 'aligned' : 'critical',
      });

      // Next MD start (= current MD end timing, redundant but explicit)
      if (reference.mahadasha.next_starts_iso) {
        const docxStart = new Date(reference.mahadasha.next_starts_iso);
        const selStart = new Date(nextMd.start_date);
        if (!isNaN(docxStart.getTime()) && !isNaN(selStart.getTime())) {
          const deltaMs = selStart.getTime() - docxStart.getTime();
          rows.push({
            field: 'mahadasha_next_starts',
            docx_value: docxStart.toISOString(),
            selemene_value: selStart.toISOString(),
            delta: formatDelta(deltaMs),
            severity: classifyTimeDelta(deltaMs),
          });
        }
      }

      // Next MD duration
      if (reference.mahadasha.next_duration_years) {
        rows.push({
          field: 'mahadasha_next_duration_years',
          docx_value: String(reference.mahadasha.next_duration_years),
          selemene_value: String(nextMd.duration_years),
          severity: Math.abs(reference.mahadasha.next_duration_years - nextMd.duration_years) < 0.1 ? 'aligned' : 'minor',
        });
      }
    }
  }

  const summary = {
    aligned: rows.filter((r) => r.severity === 'aligned').length,
    minor: rows.filter((r) => r.severity === 'minor').length,
    major: rows.filter((r) => r.severity === 'major').length,
    critical: rows.filter((r) => r.severity === 'critical').length,
  };

  return {
    subject: reference.subject,
    generated_at: new Date().toISOString(),
    rows,
    summary,
    rust_engine_version: vim?.metadata?.engine_version,
    ayanamsa_note: 'Lahiri ayanamsa expected per docx. Selemene backend reports: ' + (vim?.metadata?.backend || 'unknown'),
  };
}

export function formatDriftReportMarkdown(report: DriftReport): string {
  const SEVERITY_GLYPH: Record<string, string> = {
    aligned: '✓',
    minor: '⚠',
    major: '⚠⚠',
    critical: '✗',
  };
  let md = `# Drift Report · ${report.subject}\n\n`;
  md += `**Generated:** ${report.generated_at}\n`;
  md += `**Rust engine version:** ${report.rust_engine_version || 'unknown'}\n`;
  md += `**Note:** ${report.ayanamsa_note}\n\n`;
  md += `## Summary\n\n`;
  md += `| Severity | Count |\n|---|---|\n`;
  md += `| ✓ aligned | ${report.summary.aligned} |\n`;
  md += `| ⚠ minor (< 1 week) | ${report.summary.minor} |\n`;
  md += `| ⚠⚠ major (< 2 months) | ${report.summary.major} |\n`;
  md += `| ✗ critical (≥ 2 months OR mismatch) | ${report.summary.critical} |\n\n`;
  md += `## Field Comparison\n\n`;
  md += `| Field | DOCX (truth) | Selemene (under test) | Delta | Severity |\n`;
  md += `|---|---|---|---|---|\n`;
  for (const r of report.rows) {
    md += `| \`${r.field}\` | ${r.docx_value} | ${r.selemene_value} | ${r.delta || '—'} | ${SEVERITY_GLYPH[r.severity]} ${r.severity} |\n`;
  }
  md += `\n## Interpretation\n\n`;
  if (report.summary.critical > 0) {
    md += `⚠ **${report.summary.critical} critical drift(s)** — these indicate Selemene returning a different mahadasha lord OR a date drift exceeding 2 months. This needs Rust-engine attention before Selemene can be trusted as a primary source for this subject.\n\n`;
  }
  if (report.summary.major > 0) {
    md += `⚠ **${report.summary.major} major drift(s)** — date precision is off by weeks. Likely cause: ayanamsa-precision or sandhi-rounding logic in the Rust engine.\n\n`;
  }
  if (report.summary.minor > 0) {
    md += `⚠ **${report.summary.minor} minor drift(s)** — within tolerance for production but worth tracking for trend analysis.\n\n`;
  }
  if (report.summary.aligned > 0 && report.summary.major + report.summary.critical === 0) {
    md += `✓ Engine is well-calibrated against this subject's hardened reference data.\n\n`;
  }
  md += `## Rule\n\nWhen drift is present, the **DOCX value wins** in the rendered reading. This report exists to feed back to the Rust engine team for calibration, not to alter the user-facing reading.\n`;
  return md;
}
