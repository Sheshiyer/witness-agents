import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { selectCompletedArtifact } from '../scripts/notebooklm-artifacts.js';

const repoRoot = resolve('.');

function engine(id: string, result: Record<string, unknown>) {
  return { engine_id: id, result };
}

function partner(id: string, name: string) {
  return {
    id,
    name,
    engines: [
      engine('panchanga', {
        vara_name: 'Monday',
        tithi_name: 'Dvitiya',
        nakshatra_name: id === 'one' ? 'Uttara Phalguni' : 'Pushya',
        yoga_name: 'Siddhi',
        karana_name: 'Bava',
      }),
      engine('vimshottari', {
        current_period: {
          mahadasha: { planet: 'Moon' },
          antardasha: { planet: 'Venus' },
          pratyantardasha: { planet: 'Mars' },
        },
      }),
      engine('human-design', {
        type: 'Generator',
        authority: 'Sacral',
        profile: '2/4',
        definition: 'Single',
      }),
      engine('numerology', {
        life_path_number: 7,
        expression_number: 3,
        soul_urge_number: 9,
      }),
      engine('tarot', { spread: 'three-card', cards: ['Six of Cups'] }),
    ],
  };
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'premium-asset-factory-'));
  const inputDir = join(root, 'inputs');
  const readingDir = join(root, 'readings');
  const outputDir = join(root, 'assets');
  mkdirSync(inputDir, { recursive: true });
  mkdirSync(readingDir, { recursive: true });

  writeFileSync(join(inputDir, 'test-synastry.json'), JSON.stringify({
    kind: 'synastry_partners',
    relationship_id: 'test-synastry',
    relationship_name: 'Test Synastry',
    synastry_partners: [partner('one', 'One'), partner('two', 'Two')],
  }, null, 2));

  writeFileSync(join(readingDir, 'test-synastry.md'), [
    '# Test Synastry Reading',
    '',
    '## layer-synthesis',
    '',
    'A grounded relationship texture that should never override partner anchors.',
  ].join('\n'));

  const contextPath = join(root, 'context.json');
  writeFileSync(contextPath, JSON.stringify({
    relationship_status: 'long-term romantic relationship, not assumed married',
    commitment_status: 'partnership context supplied; marriage should not be assumed',
    primary_question: 'understand rhythm without prediction',
  }, null, 2));

  return { inputDir, readingDir, outputDir, contextPath };
}

function runFactory(paths: ReturnType<typeof makeFixture>) {
  execFileSync(process.execPath, [
    '--import', 'tsx',
    'scripts/premium-asset-factory.ts',
    '--person', 'test-synastry',
    '--inputDir', paths.inputDir,
    '--readingDir', paths.readingDir,
    '--outputDir', paths.outputDir,
    '--mode', 'partner-relationship',
    '--level', '3',
    '--context', paths.contextPath,
    '--noPdf',
  ], { cwd: repoRoot, stdio: 'pipe' });
}

function readManifest(outputDir: string) {
  return JSON.parse(readFileSync(join(outputDir, 'test-synastry', 'manifest.json'), 'utf-8'));
}

describe('premium asset factory gate truth', () => {
  it('blocks creative oracle engines while the creative oracle layer is unapproved', () => {
    const paths = makeFixture();
    runFactory(paths);

    const manifest = readManifest(paths.outputDir);

    assert.equal(manifest.gate.status, 'blocked');
    assert.ok(
      manifest.gate.findings.some((finding: { code: string }) => finding.code === 'creative_oracle_layer_not_approved'),
      'expected creative_oracle_layer_not_approved finding',
    );
  });
});

describe('premium asset factory synastry source pack', () => {
  it('writes synastry-specific dossier and partner deterministic anchor source', () => {
    const paths = makeFixture();
    runFactory(paths);

    const sourcePackDir = join(paths.outputDir, 'test-synastry', 'source-pack');
    const dossier = readFileSync(join(sourcePackDir, '00-personal-companion-dossier.md'), 'utf-8');

    assert.match(dossier, /^# Synastry Companion Dossier:/);
    assert.ok(existsSync(join(sourcePackDir, '00a-partner-deterministic-anchors.md')));
  });

  it('removes stale markdown files before writing a fresh source pack', () => {
    const paths = makeFixture();
    const sourcePackDir = join(paths.outputDir, 'test-synastry', 'source-pack');
    mkdirSync(sourcePackDir, { recursive: true });
    writeFileSync(join(sourcePackDir, 'stale-source.md'), '# Stale source\n');

    runFactory(paths);

    assert.equal(existsSync(join(sourcePackDir, 'stale-source.md')), false);
  });
});

describe('NotebookLM artifact recovery selection', () => {
  it('falls back to distinct completed artifacts when title needles do not match', () => {
    const rows = [
      { id: 'newest', type: 'slide_deck', status: 'completed', title: 'Celestial Architecture', createdAt: '2026-06-13T21:08:19' },
      { id: 'middle', type: 'slide_deck', status: 'completed', title: 'Celestial Blueprint', createdAt: '2026-06-13T21:08:18' },
      { id: 'oldest', type: 'slide_deck', status: 'completed', title: 'The Celestial Manuscript', createdAt: '2026-06-11T04:11:42' },
    ];
    const used = new Set<string>();

    const first = selectCompletedArtifact(rows, 'slide_deck', 'detailed', used);
    if (first) used.add(first.id);
    const second = selectCompletedArtifact(rows, 'slide_deck', 'preview', used);
    if (second) used.add(second.id);
    const third = selectCompletedArtifact(rows, 'slide_deck', 'vimshottari', used);

    assert.deepEqual([first?.id, second?.id, third?.id], ['newest', 'middle', 'oldest']);
  });
});
