import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  createFactLock,
  createInMemoryPrivateIndexManager,
  createNemoExtractionProvider,
  ingestWitnessCorpus,
  type ExtractionProvider,
  type GroundedPassage,
} from '../src/index.js';

test('createNemoExtractionProvider normalizes extraction endpoint passages (P3 T20)', async () => {
  const server = http.createServer((req, res) => {
    assert.equal(req.method, 'POST');
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      passages: [{
        id: 'table-1',
        source: 'sample.pdf',
        excerpt: 'Table row: Rahu period begins after Moon period.',
        score: 0.93,
        metadata: { kind: 'table', page: 2 },
      }],
    }));
  });
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    const provider = createNemoExtractionProvider({
      endpoint: `http://127.0.0.1:${address.port}/extract`,
      apiKey: 'test-key',
      timeoutMs: 500,
    });

    const passages = await provider.extract({ source: 'sample.pdf', kind: 'pdf', subjectId: 's1' });
    assert.equal(passages.length, 1);
    assert.equal(passages[0].id, 'table-1');
    assert.equal(passages[0].provenance, 'sourced-fact');
    assert.equal(passages[0].metadata?.subjectId, 's1');
    assert.equal(passages[0].metadata?.kind, 'table');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('in-memory private index scopes retrieval by subject and optional global corpus (P3 T21/T22)', async () => {
  const index = createInMemoryPrivateIndexManager();
  const subjectAPassages: GroundedPassage[] = [{
    id: 'a-private',
    source: 'user:a',
    excerpt: 'Kanya moon private passage for subject A.',
    score: 0.7,
    provenance: 'sourced-fact',
  }];
  const subjectBPassages: GroundedPassage[] = [{
    id: 'b-private',
    source: 'user:b',
    excerpt: 'Kanya moon private passage for subject B.',
    score: 0.7,
    provenance: 'sourced-fact',
  }];
  const globalPassages: GroundedPassage[] = [{
    id: 'global',
    source: 'canonical',
    excerpt: 'Kanya is a Mercury-ruled earth sign.',
    score: 0.8,
    provenance: 'sourced-fact',
  }];

  await index.addPassages('subject-a', subjectAPassages);
  await index.addPassages('subject-b', subjectBPassages);
  await index.addPassages('global-seed', globalPassages, { includeGlobalCorpus: true });

  const lock = createFactLock({ subjectId: 'subject-a', subject: 'A', facts: { moon: 'Kanya' } });
  const privateOnly = await index.retrieve({
    subjectId: lock.subjectId,
    facts: lock.facts,
    perspective: 'aletheios',
    taskId: 'privacy-test',
    maxPassages: 10,
  });
  assert.deepEqual(privateOnly.map(p => p.id), ['a-private']);

  const withGlobal = await index.retrieve({
    subjectId: lock.subjectId,
    facts: lock.facts,
    perspective: 'aletheios',
    taskId: 'privacy-test',
    maxPassages: 10,
    scope: { includeGlobalCorpus: true },
  });
  assert.ok(withGlobal.some(p => p.id === 'a-private'));
  assert.ok(withGlobal.some(p => p.id === 'global'));
  assert.ok(!withGlobal.some(p => p.id === 'b-private'));

  const mismatchedScope = await index.retrieve({
    subjectId: lock.subjectId,
    facts: lock.facts,
    perspective: 'aletheios',
    taskId: 'privacy-test',
    maxPassages: 10,
    scope: { subjectId: 'subject-b', includeGlobalCorpus: true },
  });
  assert.ok(mismatchedScope.some(p => p.id === 'a-private'));
  assert.ok(mismatchedScope.some(p => p.id === 'global'));
  assert.ok(!mismatchedScope.some(p => p.id === 'b-private'));
});

test('ingestWitnessCorpus writes extracted passages into private index (P3 T21)', async () => {
  const index = createInMemoryPrivateIndexManager();
  const extractor: ExtractionProvider = {
    async extract(params) {
      return [{
        id: `${params.source}:1`,
        source: params.source,
        excerpt: params.content ?? 'Prior daily mirror names the heart field.',
        score: 0.88,
        provenance: 'sourced-fact',
      }];
    },
  };

  const passages = await ingestWitnessCorpus(
    [{ source: 'daily-2026-06-25.md', kind: 'text' }],
    'subject-c',
    extractor,
    index,
  );
  assert.equal(passages.length, 1);

  const retrieved = await index.retrieve({
    subjectId: 'subject-c',
    facts: { center: { value: 'heart', source: 'test' } },
    perspective: 'pichet',
    taskId: 'roundtrip',
  });
  assert.equal(retrieved[0].id, 'daily-2026-06-25.md:1');
});
