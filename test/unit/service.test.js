import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testApp, fakeLlm } from '../helpers.js';

const LEAD = 'lead-1', TRAINEE = 'trainee-1', OTHER = 'trainee-2';

async function readyTrack(app) {
  const { id } = await app.svc.createTrack(LEAD, { source: 'demo', packId: 'it', name: 'IT basics' });
  await app.drain();
  return id;
}

test('lead builds a demo track: cases are cleaned, carded and scored', async () => {
  const app = await testApp();
  const trackId = await readyTrack(app);
  const tracks = await app.svc.listTracks(LEAD);
  assert.equal(tracks[0].status, 'ready');
  assert.equal(tracks[0].cases.total, 10);
  assert.equal(tracks[0].cases.building, 0);
  const detail = await app.svc.trackDetail(LEAD, trackId);
  const vpn = detail.cases.find((c) => c.key === 'ITSD-4102');
  assert.equal(vpn.status, 'ready');
  const c = await app.svc.caseDetail(LEAD, vpn.id);
  assert.ok(!JSON.stringify(c).includes('Priya'), 'customer name must be cleaned');
  assert.ok(c.customer.facts.length > 0);
  assert.ok(app.kv._secrets.has(`pii-${vpn.id}`), 'personal data map kept in secret storage');
  assert.equal(app.kv._secrets.get(`pii-${vpn.id}`).find(([r]) => r === 'Priya Raman')?.[0], 'Priya Raman');
});

test('trainees cannot use lead calls', async () => {
  const app = await testApp();
  await assert.rejects(app.svc.createTrack(TRAINEE, { source: 'demo', packId: 'it' }), /Only Ride-Along leads/);
  await assert.rejects(app.svc.dashboard(TRAINEE), /Only Ride-Along leads/);
  await assert.rejects(app.svc.traineeStats(TRAINEE, OTHER), /Only Ride-Along leads/);
});

test('full practice run: question earns a fact, wrong fix is graded, right fix solves, debrief shows the timeline', async () => {
  const app = await testApp();
  const trackId = await readyTrack(app);
  const caseId = (await app.svc.trackDetail(LEAD, trackId)).cases.find((c) => c.key === 'ITSD-4102').id;
  await assert.rejects(app.svc.startRun(TRAINEE, caseId), /not in a track assigned/);
  await app.svc.assign(LEAD, trackId, [TRAINEE]);

  const home = await app.svc.home(TRAINEE);
  assert.equal(home.tracks[0].cases.length, 10);
  assert.equal(home.picks.length, 3);

  const run = await app.svc.startRun(TRAINEE, caseId);
  assert.equal(run.status, 'active');
  assert.ok(run.case.opening.includes('GlobalProtect'));
  assert.ok(!JSON.stringify(run).includes('gp-portal-eu-01'), 'trainee view must not hold secrets');
  assert.ok(!('facts' in run.case) && !('resolution' in run.case));
  assert.equal((await app.svc.startRun(TRAINEE, caseId)).id, run.id, 'an open run is reused');

  // other trainees cannot read or write this run
  await assert.rejects(app.svc.runView(OTHER, run.id), /not your practice run/);
  await assert.rejects(app.svc.debrief(TRAINEE, run.id), /Finish or end/);

  const t1 = await app.svc.send(TRAINEE, run.id, 'Which network are you on right now?');
  await assert.rejects(app.svc.send(TRAINEE, run.id, 'hello?'), /still answering/);
  await app.drain();
  let turn = (await app.svc.getTurn(TRAINEE, t1.turnId)).turn;
  assert.equal(turn.status, 'done');
  assert.match(turn.reply, /hotel guest wifi/);
  assert.equal(turn.mark, 'green');
  assert.equal(turn.released, undefined, 'released fact ids are hidden from trainees');

  const t2 = await app.svc.send(TRAINEE, run.id, 'Please reinstall GlobalProtect.');
  await app.drain();
  turn = (await app.svc.getTurn(TRAINEE, t2.turnId)).turn;
  assert.equal(turn.mark, 'red');
  assert.equal(turn.grade.errors[0].type, 'wrong_fix');
  assert.equal(turn.grade.errors[0].source, 'KB-1: never reinstall first');

  const t3 = await app.svc.send(TRAINEE, run.id, 'Please switch to the Brightwater-TCP gateway and connect.');
  await app.drain();
  const r3 = await app.svc.getTurn(TRAINEE, t3.turnId);
  assert.equal(r3.turn.verdict, 'solved');
  assert.match(r3.turn.reply, /works now/);
  assert.equal(r3.runStatus, 'solved');
  await assert.rejects(app.svc.send(TRAINEE, run.id, 'thanks'), /ended/);

  const d = await app.svc.debrief(TRAINEE, run.id);
  assert.equal(d.status, 'solved');
  assert.ok(d.realThread.some((m) => !m.public), 'debrief shows internal notes labelled');
  assert.equal(d.facts.find((f) => f.id === 'h1').turn, 1);
  assert.equal(d.facts.find((f) => f.id === 'h2').turn, null);
  assert.equal(d.myRun.turns.length, 3);

  const stats = await app.svc.traineeStats(LEAD, TRAINEE);
  assert.equal(stats.solved, 1);
  assert.equal(stats.solveRate, 100);
  assert.equal(stats.turnsToSolve, 3);
  assert.equal(stats.weakSpots.byType.wrong_fix.errors, 1);
  assert.ok(stats.cost.calls > 0);
  const dash = await app.svc.dashboard(LEAD);
  assert.equal(dash.trainees.length, 1);
  assert.equal(dash.trainees[0].name, 'User trainee-1');
  await app.svc.confirmReady(LEAD, TRAINEE, trackId);
  assert.equal((await app.svc.traineeStats(LEAD, TRAINEE)).tracks[0].confirmed, true);
  await app.svc.overrideGrade(LEAD, t2.turnId, 'reinstall was fine here');
  assert.equal((await app.svc.dashboard(LEAD)).overrides, 1);
});

test('lead preview runs do not grade and do not count', async () => {
  const app = await testApp();
  const trackId = await readyTrack(app);
  const caseId = (await app.svc.trackDetail(LEAD, trackId)).cases[0].id;
  await assert.rejects(app.svc.startRun(TRAINEE, caseId, { kind: 'preview' }), /Only leads/);
  const run = await app.svc.startRun(LEAD, caseId, { kind: 'preview' });
  const { turnId } = await app.svc.send(LEAD, run.id, 'What network are you on?');
  await app.drain();
  const t = (await app.svc.getTurn(LEAD, turnId)).turn;
  assert.equal(t.grade, null);
  assert.ok(Array.isArray(t.released), 'leads see released fact ids in preview');
  assert.equal((await app.svc.traineeStats(LEAD, LEAD)).runs, 0);
});

test('turn limit ends a run; failed model calls mark the turn failed and can be retried', async () => {
  const llm = fakeLlm();
  const app = await testApp({ llm });
  await app.settings.save({ turnLimit: 3 });
  const trackId = await readyTrack(app);
  await app.svc.assign(LEAD, trackId, [TRAINEE]);
  const caseId = (await app.svc.trackDetail(LEAD, trackId)).cases[1].id;
  const run = await app.svc.startRun(TRAINEE, caseId);
  // a failing speaker
  const app2 = await testApp({ llm: fakeLlm({ speak: () => { throw new Error('model down'); } }) });
  const tr2 = await readyTrack(app2);
  await app2.svc.assign(LEAD, tr2, [TRAINEE]);
  const run2 = await app2.svc.startRun(TRAINEE, (await app2.svc.trackDetail(LEAD, tr2)).cases[0].id);
  const f = await app2.svc.send(TRAINEE, run2.id, 'hello');
  await app2.drain();
  assert.equal((await app2.svc.getTurn(TRAINEE, f.turnId)).turn.status, 'failed');
  const again = await app2.svc.send(TRAINEE, run2.id, 'hello again');
  assert.ok(again.turnId, 'a new reply can be sent after a failure');

  for (const msg of ['hi', 'what happened?', 'anything else?']) { await app.svc.send(TRAINEE, run.id, msg); await app.drain(); }
  assert.equal((await app.svc.runView(TRAINEE, run.id)).status, 'limit');
});

test('settings are clamped and retention deletes old runs', async () => {
  let t = 1_000_000_000_000;
  const app = await testApp();
  const s = await app.settings.save({ turnLimit: 999, retentionDays: 1, keepTerms: 'Okta, GlobalProtect' });
  assert.equal(s.turnLimit, 30);
  assert.equal(s.retentionDays, 7);
  assert.deepEqual(s.keepTerms, ['Okta', 'GlobalProtect']);
  const trackId = await readyTrack(app);
  await app.svc.assign(LEAD, trackId, [TRAINEE]);
  await app.svc.startRun(TRAINEE, (await app.svc.trackDetail(LEAD, trackId)).cases[0].id);
  assert.equal((await app.svc.cleanup()).deleted, 0);
  const deleted = await app.repo.deleteRunsBefore(Date.now() + 1000);
  assert.equal(deleted, 1);
  void t;
});

test('removed cases leave the trainee list; deleting a track removes its maps', async () => {
  const app = await testApp();
  const trackId = await readyTrack(app);
  await app.svc.assign(LEAD, trackId, [TRAINEE]);
  const cases = (await app.svc.trackDetail(LEAD, trackId)).cases;
  await app.svc.setCaseStatus(LEAD, cases[0].id, 'removed');
  assert.equal((await app.svc.home(TRAINEE)).tracks[0].cases.length, 9);
  await app.svc.deleteTrack(LEAD, trackId);
  assert.equal(app.kv._secrets.size, 0);
  assert.equal((await app.svc.listTracks(LEAD)).length, 0);
});

test('demo KB search works inside a run', async () => {
  const app = await testApp();
  const trackId = await readyTrack(app);
  await app.svc.assign(LEAD, trackId, [TRAINEE]);
  const run = await app.svc.startRun(TRAINEE, (await app.svc.trackDetail(LEAD, trackId)).cases[0].id);
  const hits = await app.svc.searchKb(TRAINEE, run.id, 'GlobalProtect gateway');
  assert.equal(hits[0].id, 'KB-1');
  assert.ok((await app.svc.kbArticle(TRAINEE, run.id, 'KB-1')).body.length > 100);
});

test('a demo track with prebuilt cases is ready at once, with no model calls', async () => {
  const { PREBUILT } = await import('../../src/demo/prebuilt.js');
  const app = await testApp({ prebuilt: PREBUILT });
  const r = await app.svc.createTrack(LEAD, { source: 'demo', packId: 'it', name: 'IT basics' });
  assert.equal(r.ready, r.cases);
  assert.equal(app.llm.usage.calls, 0, 'no model calls');
  const tracks = await app.svc.listTracks(LEAD);
  assert.equal(tracks[0].status, 'ready');
  assert.equal(tracks[0].cases.ready, r.cases);
  // no real customer name in any prebuilt case of the pack
  const detail = await app.svc.trackDetail(LEAD, r.id);
  for (const c of detail.cases) assert.ok(!JSON.stringify(await app.svc.caseDetail(LEAD, c.id)).includes('Priya Raman'));
});

test('the customer reply is saved before the grade, then the grade lands', async () => {
  const app = await testApp();
  const trackId = await readyTrack(app);
  await app.svc.assign(LEAD, trackId, [TRAINEE]);
  const detail = await app.svc.trackDetail(LEAD, trackId);
  const vpn = detail.cases.find((c) => c.key === 'ITSD-4102');
  const run = await app.svc.startRun(TRAINEE, vpn.id);
  const seen = [];
  const orig = app.repo.saveReply;
  app.repo.saveReply = async (id, v) => { await orig(id, v); seen.push((await app.repo.getTurn(id)).status); };
  const { turnId } = await app.svc.send(TRAINEE, run.id, 'What network are you on, and does a normal website load?');
  await app.drain();
  assert.deepEqual(seen, ['replied']);
  const t = await app.svc.getTurn(TRAINEE, turnId);
  assert.equal(t.turn.status, 'done');
  assert.ok(t.turn.reply && t.turn.grade);
});

test('lead dashboard summary: reps this week, ready trainees, reps to ready', async () => {
  const app = await testApp();
  const trackId = await readyTrack(app);
  await app.svc.assign(LEAD, trackId, [TRAINEE]);
  const caseId = (await app.svc.trackDetail(LEAD, trackId)).cases.find((c) => c.key === 'ITSD-4102').id;
  const run = await app.svc.startRun(TRAINEE, caseId);
  await app.svc.endRun(TRAINEE, run.id);
  const d = await app.svc.dashboard(LEAD);
  assert.equal(d.summary.trainees, 1);
  assert.equal(d.summary.repsWeek, 1);
  assert.equal(d.summary.readyConfirmed, 0);
  assert.equal(d.summary.repsToReady, null);
  assert.equal(d.trainees[0].tracks[0].reps, 1);
});
