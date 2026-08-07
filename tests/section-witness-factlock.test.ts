import test from 'node:test';
import assert from 'node:assert/strict';

import { createSectionWitnessGraph } from '../src/wiring/graphs/section-witness.js';

test('section prompts include authoritative FactLock facts', () => {
  const lock = {
    facts: {
      name: 'Anitha Nateshan',
      vimshottari_current_layered_position:
        'Rahu Mahadasha from 24 Oct 2015 to 24 Oct 2033; Ketu Antardasha from 24 Apr 2026 to 13 May 2027.',
    },
    sources: {
      vimshottari_current_layered_position: 'kundli-screenshot/orientation-anchors',
    },
    engineData: {
      vimshottari: '{"current_period":{}}',
    },
  } as any;

  const temporalTask = createSectionWitnessGraph(lock).find((task) => task.id === 'temporal-foundation');
  assert.ok(temporalTask);

  const prompts = temporalTask.buildPrompts(lock, {});
  assert.match(prompts.user, /Rahu Mahadasha from 24 Oct 2015 to 24 Oct 2033/);
  assert.match(prompts.user, /kundli-screenshot\/orientation-anchors/);
});
