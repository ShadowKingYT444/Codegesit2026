import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTicket, regexFinds, buildMap, applyMap } from '../../src/engine/pii.js';
import { PACKS } from '../../src/demo/packs.js';
import { fakeLlm } from '../helpers.js';

test('regex finds emails, phones, IPs and other ticket keys but not KB ids or versions', () => {
  const f = regexFinds('mail a.b@corp.com or +44 7700 900123, host 10.1.2.3, see ITSD-9 not KB-4 or 6.1.3', { ownKey: 'ITSD-1' });
  assert.deepEqual(f.map((x) => x.type).sort(), ['email', 'ip', 'phone', 'ticket']);
});

test('names are replaced consistently, first names too, case-sensitively', () => {
  const map = buildMap([{ value: 'Priya Raman', type: 'person' }, { value: 'Mark', type: 'person' }]);
  const out = applyMap('Hi Priya. Priya Raman wrote. Mark will mark it done.', map);
  assert.ok(!/Priya|Raman/.test(out));
  assert.match(out, /will mark it done/);
  assert.ok(!out.startsWith('Hi Priya'));
  const first = map.get('Priya');
  assert.ok(out.includes(`Hi ${first}.`));
});

test('cleanTicket removes people and model-found places, keeps technical tokens', async () => {
  const t = PACKS.find((p) => p.id === 'it').tickets.find((x) => x.key === 'ITSD-4102');
  const llm = fakeLlm({ pii: () => JSON.stringify({ items: [{ value: 'Hotel Lindenhof', type: 'place' }, { value: 'NotInText', type: 'person' }] }) });
  const { ticket, map } = await cleanTicket(t, llm);
  const all = JSON.stringify(ticket);
  for (const gone of ['Priya', 'Raman', 'Marta', 'Lindenhof']) assert.ok(!all.includes(gone), gone);
  for (const kept of ['6.1.3', 'GlobalProtect', 'gp-portal-eu-01', 'Brightwater-TCP', 'KB-1']) assert.ok(all.includes(kept), kept);
  assert.ok(!map.some(([real]) => real === 'NotInText'), 'values not in the text are ignored');
  assert.equal(ticket.thread.length, t.thread.length);
});

test('keep terms are never replaced', () => {
  const map = buildMap([{ value: 'Okta', type: 'company' }, { value: 'Acme Ltd', type: 'company' }], { keep: ['Okta'] });
  assert.ok(!map.has('Okta'));
  assert.ok(map.has('Acme Ltd'));
});
