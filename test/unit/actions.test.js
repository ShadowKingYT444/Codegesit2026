// The Rovo actions are also the MCP tools: a chat or MCP client can run a whole practice run with them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testApp } from '../helpers.js';
import * as A from '../../src/actions.js';

const LEAD = 'lead-1', TRAINEE = 'trainee-1';

async function setup() {
  const app = await testApp();
  const { id } = await app.svc.createTrack(LEAD, { source: 'demo', packId: 'it', name: 'IT desk' });
  await app.drain();
  return { app, trackId: id };
}

test('MCP flow: list, start, reply (customer answer and grade come back in one call), debrief', async () => {
  const { app, trackId } = await setup();
  assert.match(await A.listPracticeTickets(app.svc, TRAINEE, {}), /no practice track yet/);
  await app.svc.assign(LEAD, trackId, [TRAINEE]);

  const list = await A.listPracticeTickets(app.svc, TRAINEE, {});
  assert.match(list, /IT desk:/);
  assert.match(list, /ITSD-4102/);
  assert.match(await A.listPracticeTickets(app.svc, TRAINEE, { track: 'nothing' }), /No practice track matches/);

  assert.match(await A.sendPracticeReply(app.svc, TRAINEE, { message: 'hi' }), /no active practice run/);
  const start = await A.startPractice(app.svc, TRAINEE, { requestType: 'VPN' });
  assert.match(start, /Practice run run_\w+ ready: VPN/);
  assert.match(start, /send-practice-reply/);
  assert.ok(!start.includes('gp-portal-eu-01'), 'no agent-only words in the start text');

  const r1 = await A.sendPracticeReply(app.svc, TRAINEE, { message: 'Which network are you on right now?' });
  assert.match(r1, /Customer: ".*hotel guest wifi/);
  assert.match(r1, /Grade: good reply/);
  assert.equal(app.jobs.length, 0, 'inline turn: nothing left in the queue');

  const r2 = await A.sendPracticeReply(app.svc, TRAINEE, { message: 'Please reinstall GlobalProtect.' });
  assert.match(r2, /Grade: needs work/);
  assert.match(r2, /Wrong fix: you wrote "/);
  assert.match(r2, /Rule: KB-1/);

  const r3 = await A.sendPracticeReply(app.svc, TRAINEE, { message: 'Please switch to the Brightwater-TCP gateway and connect.' });
  assert.match(r3, /Run solved/);

  const d = await A.practiceDebrief(app.svc, TRAINEE, {});
  assert.match(d, /Debrief for ITSD-4102/);
  assert.match(d, /Result: solved/);
  assert.match(d, /What really fixed it:/);
});

test('debrief with an active run ends it first', async () => {
  const { app, trackId } = await setup();
  await app.svc.assign(LEAD, trackId, [TRAINEE]);
  await A.startPractice(app.svc, TRAINEE, {});
  const d = await A.practiceDebrief(app.svc, TRAINEE, {});
  assert.match(d, /Result: ended/);
  assert.match(d, /never asked for/);
});
