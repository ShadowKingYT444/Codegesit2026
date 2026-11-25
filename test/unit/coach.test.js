import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weakSpots, nextPicks, readiness, smoothed } from '../../src/engine/coach.js';
import { practiceValue } from '../../src/engine/scoring.js';
import { PACKS } from '../../src/demo/packs.js';

test('smoothed rate', () => { assert.equal(smoothed(0, 0), 1 / 3); assert.equal(smoothed(2, 7), 0.3); });

test('weak spots rank the errors the trainee repeats', () => {
  const turns = [
    ...Array(4).fill({ errors: ['asked_known_info'], requestType: 'VPN / Remote access' }),
    ...Array(6).fill({ errors: [], requestType: 'Account / Password' }),
    { errors: ['tone'], requestType: 'Account / Password' },
  ];
  const s = weakSpots(turns);
  assert.equal(s.turns, 11);
  assert.equal(s.top[0], 'asked_known_info');
  assert.ok(s.byRequestType['VPN / Remote access'].rate > s.byRequestType['Account / Password'].rate);
});

test('next picks prefer weak request types and skip solved cases', () => {
  const cases = [
    { id: 'a', key: 'A', requestType: 'VPN / Remote access', summary: '', customer: { facts: [{}, {}, {}, {}], opening: 'x'.repeat(300), secret: [] }, kbUsed: ['KB-1'], resolution: '' },
    { id: 'b', key: 'B', requestType: 'Account / Password', summary: '', customer: { facts: [], opening: 'x', secret: [] }, kbUsed: [], resolution: '' },
    { id: 'c', key: 'C', requestType: 'VPN / Remote access', summary: '', customer: { facts: [{}], opening: 'x', secret: [] }, kbUsed: [], resolution: '' },
  ];
  const spots = weakSpots([...Array(4).fill({ errors: ['missing_needed_question'], requestType: 'VPN / Remote access' }), ...Array(5).fill({ errors: [], requestType: 'Account / Password' })]);
  const picks = nextPicks(cases, spots, new Set(['c']));
  assert.equal(picks[0].caseId, 'a');
  assert.ok(!picks.some((p) => p.caseId === 'c'));
  assert.ok(picks[0].reasons.length);
});

test('readiness needs 80% solved and few red replies', () => {
  assert.equal(readiness(['a', 'b', 'c', 'd', 'e'], new Set(['a', 'b', 'c', 'd']), Array(20).fill('green')).ready, true);
  assert.equal(readiness(['a', 'b', 'c', 'd', 'e'], new Set(['a', 'b', 'c']), Array(20).fill('green')).ready, false);
  assert.equal(readiness(['a'], new Set(['a']), ['red', 'green', 'red', 'green']).ready, false);
});

test('practice value rules', () => {
  const t = PACKS[0].tickets[0];
  const v = practiceValue(t);
  assert.ok(v.usable);
  const hr = { ...t, request_type: 'HR case: harassment report' };
  assert.equal(practiceValue(hr).usable, false);
  assert.equal(practiceValue(hr, { allowSensitive: true }).usable, true);
  const thin = { ...t, thread: t.thread.slice(0, 1) };
  assert.equal(practiceValue(thin).usable, false);
  const custom = practiceValue(t, { sensitive: [t.request_type] });
  assert.equal(custom.usable, false);
});
