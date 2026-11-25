// Dev-only fixture backend for `npm run dev` outside Jira. It replays demo-pack tickets with simple rules,
// so the screens can be designed without a Forge site. It is never used inside Forge.
import { PACKS } from '../../../src/demo/packs.js';

export function mockBackend() {
  if (!import.meta.env.DEV) return async () => ({ ok: false, error: { message: 'Mock backend is for local development only.' } });
  const pack = PACKS[0];
  const isLead = () => new URLSearchParams(location.search).get('role') !== 'trainee';
  const cases = pack.tickets.map((t, i) => ({ id: `c${i}`, key: t.key, requestType: t.request_type, summary: t.summary, t }));
  const runs = {};
  const turns = {};
  let n = 0;
  const ok = (data) => ({ ok: true, data });
  const caseView = (c) => ({ id: c.id, key: c.key, requestType: c.requestType, summary: c.summary, opening: c.t.thread[0].body, customerName: 'Dana Ortiz' });
  const runView = (r) => ({ id: r.id, kind: r.kind, status: r.status, startedAt: r.startedAt, endedAt: r.endedAt, turnLimit: 12, case: caseView(r.c), turns: r.turns.map((id) => turns[id]) });
  const spots = { turns: 9, top: ['asked_known_info'], byType: { asked_known_info: { errors: 3, rate: 0.33 }, wrong_fix: { errors: 1, rate: 0.17 }, tone: { errors: 0, rate: 0.08 }, skipped_required_step: { errors: 0, rate: 0.08 }, unauthorized_promise: { errors: 0, rate: 0.08 }, missing_needed_question: { errors: 1, rate: 0.17 }, leaked_internal: { errors: 0, rate: 0.08 } }, byRequestType: { 'VPN / Remote access': { turns: 5, errors: 3, rate: 0.5 }, 'Account / Password': { turns: 4, errors: 1, rate: 0.29 } } };
  const picks = cases.slice(1, 4).map((c) => ({ caseId: c.id, key: c.key, summary: c.summary, requestType: c.requestType, reasons: ['trains "asked for known information"'] }));
  const H = {
    context: () => ok({ accountId: 'me', isLead: isLead(), turnLimit: 12, packs: PACKS.map((p) => ({ id: p.id, title: p.title, tickets: p.tickets.length })) }),
    home: () => ok({ tracks: [{ id: 't1', name: 'IT desk: first two weeks', cases: cases.map((c) => ({ id: c.id, key: c.key, requestType: c.requestType, summary: c.summary, solved: c.id === 'c2' })) }], runs: Object.values(runs).map((r) => ({ id: r.id, status: r.status, turns: r.turns.length, startedAt: r.startedAt, key: r.c.key, summary: r.c.summary })), picks, weakSpots: spots }),
    startRun: ({ caseId }, kind = 'practice') => { const id = `r${++n}`; runs[id] = { id, kind, c: cases.find((c) => c.id === caseId), status: 'active', startedAt: Date.now() - 95000, turns: [], step: 1 }; return ok(runView(runs[id])); },
    previewCase: (p) => H.startRun(p, 'preview'),
    getRun: ({ runId }) => ok(runView(runs[runId])),
    send: ({ runId, text }) => {
      const r = runs[runId]; const id = `u${++n}`;
      const custMsgs = r.c.t.thread.filter((m) => m.from === 'customer');
      const fix = /tcp|gateway/i.test(text);
      const errors = /reinstall/i.test(text) ? [{ type: 'wrong_fix', quote: text.slice(0, 60), source: 'KB-1: Do not reinstall GlobalProtect 6.1+ as a first step.' }] : /version/i.test(text) && r.turns.length > 1 ? [{ type: 'asked_known_info', quote: 'Which version…', source: 'Customer, reply 1: "Version says 6.1.3."' }] : [];
      turns[id] = { id, n: r.turns.length + 1, trainee: text, status: 'done', mark: errors.length ? (errors[0].type === 'wrong_fix' ? 'red' : 'amber') : 'green', grade: { errors, good: errors.length ? '' : 'Clear, specific question.' }, verdict: fix ? 'solved' : null, reply: fix ? 'Connected!! Thank you. It is a bit slow but I have what I need.' : (custMsgs[r.step++]?.body || "I'm not sure, sorry. I'm not very technical."), released: [] };
      r.turns.push(id);
      if (fix) { r.status = 'solved'; r.endedAt = Date.now(); }
      return ok({ turnId: id });
    },
    getTurn: ({ turnId }) => ok({ turn: turns[turnId], runStatus: Object.values(runs).find((r) => r.turns.includes(turnId)).status }),
    endRun: ({ runId }) => { runs[runId].status = 'ended'; runs[runId].endedAt = Date.now(); return ok(runView(runs[runId])); },
    debrief: ({ runId }) => { const r = runs[runId]; return ok({ case: caseView(r.c), status: r.status, realThread: r.c.t.thread, resolution: r.c.t.resolution, myRun: { opening: r.c.t.thread[0].body, turns: r.turns.map((id) => turns[id]) }, facts: [{ id: 'h1', detail: 'On the hotel guest wifi', asked_by: 'the network', turn: 1 }, { id: 'h2', detail: 'GlobalProtect 6.1.3', asked_by: 'the version', turn: null }] }); },
    searchKb: ({ q }) => ok(pack.kb.filter((k) => !q || `${k.title} ${k.body}`.toLowerCase().includes(String(q).toLowerCase().split(' ')[0])).map((k) => ({ id: k.id, title: k.title, excerpt: k.body.slice(0, 160) }))),
    kbArticle: ({ id }) => ok(pack.kb.find((k) => k.id === id)),
    listTracks: () => ok([{ id: 't1', name: 'IT desk: first two weeks', source: 'demo', status: 'ready', createdAt: Date.now() - 86400000, cases: { total: 10, ready: 9, building: 0, failed: 0, skipped: 1, removed: 0 }, assignees: 2 }]),
    previewJql: () => ok({ sample: cases.slice(0, 5).map((c) => ({ key: c.key, summary: c.summary })) }),
    createTrack: () => ok({ id: 't1', cases: 10 }),
    trackDetail: () => ok({ id: 't1', name: 'IT desk: first two weeks', source: 'demo', status: 'ready', sops: pack.sop.length, cases: cases.map((c, i) => ({ id: c.id, key: c.key, requestType: c.requestType, summary: c.summary, status: i === 9 ? 'skipped' : 'ready', score: 85 - i * 3, reasons: ['3 customer messages', 'clear resolution'], facts: 3 + (i % 3) })), assignees: [{ accountId: 'a1', name: 'Jordan Lee' }, { accountId: 'a2', name: 'Sam Patel' }] }),
    caseDetail: ({ caseId }) => { const c = cases.find((x) => x.id === caseId); return ok({ id: c.id, key: c.key, requestType: c.requestType, summary: c.summary, value: { score: 85 }, customer: { persona: 'Busy account manager, polite but stressed, not technical, writes short messages.', opening: c.t.thread[0].body, facts: [{ id: 'h1', detail: 'At a hotel, on the guest wifi', asked_by: 'which network', kind: 'fact' }, { id: 'h2', detail: 'GlobalProtect version 6.1.3', asked_by: 'the app version', kind: 'fact' }], secretCount: 4 }, resolution: c.t.resolution, debrief: c.t.thread, kbUsed: c.t.kb_used }); },
    setCaseStatus: () => ok({ ok: true }), retryCase: () => ok({ ok: true }), deleteTrack: () => ok({ ok: true }),
    searchUsers: () => ok([{ accountId: 'a3', displayName: 'Robin Chen' }]),
    assign: () => H.trackDetail(), unassign: () => H.trackDetail(),
    dashboard: () => ok({ overrides: 1, gradedTurns: 31, trainees: [
      { accountId: 'a1', name: 'Jordan Lee', runs: 7, solveRate: 86, turnsToSolve: 4.2, greenRate: 74, weakSpots: spots, tracks: [{ id: 't1', name: 'IT desk', solved: 8, total: 9, ready: true, redRate: 0.1, confirmed: false }] },
      { accountId: 'a2', name: 'Sam Patel', runs: 3, solveRate: 50, turnsToSolve: 6, greenRate: 52, weakSpots: { ...spots, top: ['wrong_fix', 'asked_known_info'] }, tracks: [{ id: 't1', name: 'IT desk', solved: 2, total: 9, ready: false, redRate: 0.3, confirmed: false }] },
    ] }),
    traineeStats: () => ok({ accountId: 'a1', runs: 7, ended: 7, solved: 6, solveRate: 86, turnsToSolve: 4.2, greenRate: 74, weakSpots: spots, tracks: [], picks, recentRuns: [], cost: { calls: 140, input: 310000, output: 42000 } }),
    myStats: () => H.traineeStats(),
    confirmReady: () => ok({ ok: true }), overrideGrade: () => ok({ ok: true }),
    getSettings: () => ok({ leadGroup: 'ride-along-leads', kbSpaceKey: 'KB', sopLabel: 'sop', sopSpaceKey: '', model: 'claude-sonnet-4-6', turnLimit: 12, retentionDays: 180, sensitiveTypes: [], keepTerms: ['GlobalProtect'], maxCasesPerTrack: 30 }),
    saveSettings: ({ settings }) => ok(settings),
  };
  return async (name, payload) => { await new Promise((r) => setTimeout(r, name === 'getTurn' ? 600 : 120)); return H[name] ? H[name](payload || {}) : { ok: false, error: { message: `mock: no handler for ${name}` } }; };
}
