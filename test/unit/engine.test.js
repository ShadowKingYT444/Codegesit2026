import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dtokens, hasTok, parseJson, secretTokens } from '../../src/engine/tokens.js';
import { buildCustomerCard, practiceTurn, speak, emptyState } from '../../src/engine/customer.js';
import { forgeLlm, textLlm } from '../../src/engine/llm.js';
import { normalizeErrors, mark, pickKb } from '../../src/engine/grader.js';
import { BM25 } from '../../src/engine/bm25.js';
import { PACKS } from '../../src/demo/packs.js';
import { fakeLlm } from '../helpers.js';

const vpn = PACKS.find((p) => p.id === 'it').tickets.find((t) => t.key === 'ITSD-4102');

test('dtokens keeps codes and drops plain words and common acronyms', () => {
  const t = dtokens('GlobalProtect 6.1.3 says gp-portal-eu-01 timed out on UDP 4501, VPN and KB-1, at 3pm on 2026-10-06');
  for (const k of ['GlobalProtect', '6.1.3', 'gp-portal-eu-01', 'UDP', '4501', 'KB-1', '3pm']) assert.ok(t.has(k), k);
  for (const k of ['VPN', 'says', 'timed', '2026-10-06']) assert.ok(!t.has(k), k);
});

test('hasTok ignores case and spaces', () => {
  assert.ok(hasTok('Gateway GP-Portal-EU-01 down', 'gp-portal-eu-01'));
  assert.ok(hasTok('udp 4501', 'UDP4501'));
  assert.ok(!hasTok('nothing here', '4501'));
});

test('parseJson reads fenced and bare JSON', () => {
  assert.deepEqual(parseJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJson('Sure! {"a": {"b": 2}} done'), { a: { b: 2 } });
  assert.throws(() => parseJson('no json'));
});

test('secret tokens come from the agent side only', () => {
  const s = secretTokens(vpn);
  assert.ok(s.has('gp-portal-eu-01'));
  assert.ok(s.has('4501'));
  assert.ok(!s.has('6.1.3'), 'the customer said the version, so it is not secret');
});

test('customer card never sees agent messages', async () => {
  const llm = fakeLlm();
  const card = await buildCustomerCard(vpn, llm);
  const cardPrompt = llm.calls.find((c) => c.k === 'card').prompt;
  assert.ok(!cardPrompt.includes('gp-portal-eu-01'), 'internal note leaked into the card prompt');
  assert.ok(!cardPrompt.includes('Brightwater-TCP'), 'agent reply leaked into the card prompt');
  assert.equal(card.facts[0].id, 'h1');
  assert.ok(card.secret.includes('gp-portal-eu-01'));
});

test('reveal releases only asked facts and speaker gets only those', async () => {
  const llm = fakeLlm();
  const card = await buildCustomerCard(vpn, llm);
  let r = await practiceTurn(card, emptyState(), 'Anything else I should know?', llm);
  assert.deepEqual(r.released, []);
  r = await practiceTurn(card, r.state, 'Which network are you on right now?', llm);
  assert.deepEqual(r.released, ['h1']);
  assert.match(r.reply, /hotel guest wifi/);
  const speakPrompts = llm.calls.filter((c) => c.k === 'speak').map((c) => c.prompt).join('\n');
  assert.ok(!speakPrompts.includes('gp-portal-eu-01') && !speakPrompts.includes('UDP 4501'), 'speaker saw the internal note');
});

test('guard regenerates, then trims sentences with secret tokens', async () => {
  const card = { opening: 'VPN is broken.', persona: 'x', facts: [{ id: 'h1', detail: 'error 0x8007045D', asked_by: 'error', kind: 'fact' }], secret: ['gp-portal-eu-01'] };
  let n = 0;
  const leaky = fakeLlm({ speak: () => (++n === 1 ? 'Is it gp-portal-eu-01? No idea.' : 'Maybe gp-portal-eu-01 again. I really do not know.') });
  const r = await speak(card, emptyState(), 'what is wrong?', [], leaky);
  assert.equal(r.guarded, 'trimmed');
  assert.equal(r.reply, 'I really do not know.');
  // an unearned fact token is held back too
  let m = 0;
  const early = fakeLlm({ speak: () => (++m === 1 ? 'The code is 0x8007045D.' : 'Not sure what you need.') });
  const r2 = await speak(card, emptyState(), 'hello', [], early);
  assert.equal(r2.guarded, 'regenerated');
  assert.equal(r2.reply, 'Not sure what you need.');
});

test('forgeLlm forces a tool call and reads object or string arguments, or falls back to text', async () => {
  const seen = [];
  const chat = async (req) => { seen.push(req); return { choices: [{ message: { content: '', tool_calls: [{ id: '1', type: 'function', index: 0, function: { name: 'answer', arguments: { ok: true } } }] } }], usage: { input_tokens: 10, output_tokens: 2 } }; };
  const llm = forgeLlm(chat, { model: 'claude-sonnet-4-6' });
  assert.deepEqual(await llm.json('sys', 'p', { type: 'object' }), { ok: true });
  assert.equal(seen[0].tool_choice.function.name, 'answer');
  assert.equal(seen[0].model, 'claude-sonnet-4-6');
  assert.equal(seen[0].messages[0].role, 'system');
  const llm2 = forgeLlm(async () => ({ choices: [{ message: { content: [{ type: 'text', text: 'x {"a":"b"}' }] } }] }));
  assert.deepEqual(await llm2.json('s', 'p', {}), { a: 'b' });
  const llm3 = forgeLlm(async () => ({ choices: [{ message: { tool_calls: [{ function: { arguments: '{"n":3}' } }] } }] }));
  assert.deepEqual(await llm3.json('s', 'p', {}), { n: 3 });
  assert.equal(await forgeLlm(async () => ({ choices: [{ message: { content: 'hi' } }] })).text('s', 'p'), 'hi');
  assert.equal(llm.usage.input, 10);
  assert.equal((await textLlm(async (p) => `{"p":"${p}"}`).json('s', 'q')).p, 'q');
});

test('grade normalization and marks', () => {
  const e = normalizeErrors(['asked_known_info: asked version again', { type: 'wrong_fix', quote: 'q' }, { type: 'wrong_fix' }, 'nonsense']);
  assert.deepEqual(e.map((x) => x.type), ['asked_known_info', 'wrong_fix']);
  assert.equal(mark([]), 'green');
  assert.equal(mark([{ type: 'tone' }]), 'amber');
  assert.equal(mark([{ type: 'leaked_internal' }]), 'red');
  assert.equal(mark([{ type: 'tone' }, { type: 'asked_known_info' }]), 'red');
});

test('pickKb puts linked articles first, then best text matches', () => {
  const kb = PACKS[0].kb;
  const got = pickKb(kb, ['KB-1'], 'reset the Okta Verify MFA factor', 2).map((k) => k.id);
  assert.equal(got[0], 'KB-1');
  assert.equal(got.length, 3);
  const idx = new BM25({ a: 'vpn gateway hotel', b: 'printer toner' });
  assert.deepEqual(idx.search('hotel vpn'), ['a']);
});
