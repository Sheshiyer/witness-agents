import test from 'node:test';
import assert from 'node:assert/strict';

import { validateBatchOutputQuality } from '../src/wiring/batch-output-quality.js';

test('rejects generated readings with gated vocabulary variants', () => {
  const issues = validateBatchOutputQuality('A coherent path toward illumination.');

  assert.deepEqual(issues, ['gated vocabulary: coherent']);
});

test('rejects generated readings that end on an incomplete list item', () => {
  const issues = validateBatchOutputQuality('1. **Detachment and Relational Abundance** - Ketu and Venus');

  assert.deepEqual(issues, ['incomplete sentence ending']);
});

test('accepts complete generated readings without gated vocabulary', () => {
  const issues = validateBatchOutputQuality('This section closes with an integrated path toward illumination.');

  assert.deepEqual(issues, []);
});
