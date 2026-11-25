// Ride-Along application logic. Forge-free: every outside dependency is injected, so the whole app runs in
// unit tests with node:sqlite, an in-memory KVS and a scripted model.
//
// deps = {
//   repo,                      // store/repo.js
//   settings,                  // store/settings.js
//   llmFor(model),             // -> llm (engine/llm.js)
//   jsmApp, jsmUser,           // jira/jsm.js as the app (case building) and as the user (JQL preview, track build)
//   confluence,                // jira/confluence.js (as the app)
//   users: { isLead(accountId), names(accountIds) -> {id: name}, search(q) -> [{accountId, displayName}] },
//   enqueue: { buildCase(caseIds[]), runTurn(turnId) },
//   prebuilt,                  // optional: demo cases keyed 'packId:ticketKey' (default: src/demo/prebuilt.js)
//   now()
// }
import { reveal, speak } from './engine/customer.js';
import { gradeReply } from './engine/grader.js';
import { solvedCheck } from './engine/solved.js';
import { buildPracticeCase, factTimeline } from './engine/case.js';
import { practiceValue } from './engine/scoring.js';
import { weakSpots, nextPicks, readiness } from './engine/coach.js';
import { BM25 } from './engine/bm25.js';
import { packById, PACKS } from './demo/packs.js';
import { PREBUILT } from './demo/prebuilt.js';

export class AppError extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, msg) => { throw new AppError(code, msg); };
const MAX_MSG = 4000;
const answered = (t) => t.status === 'done' || t.status === 'replied';

export function makeService(deps) {
  const { repo, settings, llmFor, users, enqueue } = deps;
  const prebuilt = deps.prebuilt || PREBUILT;
  const now = deps.now || (() => Date.now());

  const requireLead = async (accountId) => { if (!(await users.isLead(accountId))) fail('forbidden', 'Only Ride-Along leads can do this.'); };
  const loadRunFor = async (accountId, runId) => {
    const run = await repo.getRun(runId);
    if (!run) fail('not_found', 'Practice run not found.');
    if (run.accountId !== accountId && !(await users.isLead(accountId))) fail('forbidden', 'This is not your practice run.');
    return run;
  };
  const kbPoolFor = async (track, pc, text) => {
    if (track.source === 'demo') return track.kb;
    const own = pc.kbArticles || [];
    const s = await settings.get();
    let extra = [];
    try {
      const hits = await deps.confluence.search(text, { spaceKey: s.kbSpaceKey, limit: 3 });
      extra = await deps.confluence.pages(hits.map((h) => h.id).filter((id) => !own.some((k) => k.id === id)).slice(0, 2));
    } catch { /* KB search is a help, not a must */ }
    return [...own, ...extra];
  };

  // ------------------------------------------------------------------ views (what the UI may see)
  const traineeCaseView = (pc) => ({ id: pc.id, key: pc.key, requestType: pc.requestType, summary: pc.summary, opening: pc.customer?.opening || '', customerName: pc.debrief?.[0]?.author || 'Customer' });
  const turnView = (t, { lead = false } = {}) => ({
    id: t.id, n: t.n, trainee: t.trainee, reply: t.reply, status: t.status, verdict: t.verdict, mark: t.mark, kind: t.kind,
    grade: t.grade ? { errors: t.grade.errors, good: t.grade.good, why: t.grade.why } : null,
    error: t.status === 'failed' ? 'The model call failed. Send the reply again.' : null,
    ...(lead ? { released: t.released } : {}),
  });

  const service = {
    // ---------------------------------------------------------------- context
    async context(accountId) {
      const s = await settings.get();
      return { accountId, isLead: await users.isLead(accountId), turnLimit: s.turnLimit, packs: PACKS.map((p) => ({ id: p.id, title: p.title, tickets: p.tickets.length })) };
    },

    // ---------------------------------------------------------------- trainee
    async home(accountId) {
      const trackIds = await repo.myTracks(accountId);
      const runs = await repo.runsFor(accountId);
      const solved = new Set(runs.filter((r) => r.status === 'solved').map((r) => r.caseId));
      const tracks = [];
      const allCases = [];
      for (const id of trackIds) {
        const tr = await repo.getTrack(id); if (!tr) continue;
        const cases = (await repo.listCases(id, { full: true })).filter((c) => c.status === 'ready');
        allCases.push(...cases);
        tracks.push({ id, name: tr.name, cases: cases.map((c) => ({ id: c.id, key: c.key, requestType: c.requestType, summary: c.summary, solved: solved.has(c.id) })) });
      }
      const graded = await repo.gradedTurns(accountId);
      const spots = weakSpots(graded.map((t) => ({ errors: (t.grade?.errors || []).map((e) => e.type), requestType: t.requestType })));
      const caseById = Object.fromEntries(allCases.map((c) => [c.id, c]));
      return {
        tracks,
        runs: runs.slice(0, 30).map((r) => ({ id: r.id, caseId: r.caseId, status: r.status, turns: r.state.turns.length, startedAt: r.startedAt, endedAt: r.endedAt, key: caseById[r.caseId]?.key, summary: caseById[r.caseId]?.summary })),
        weakSpots: spots,
        picks: nextPicks(allCases, spots, solved),
      };
    },

    async startRun(accountId, caseId, { kind = 'practice' } = {}) {
      const c = await repo.getCase(caseId);
      if (!c || c.status !== 'ready') fail('not_found', 'This practice case is not ready.');
      const lead = await users.isLead(accountId);
      if (kind === 'preview' && !lead) fail('forbidden', 'Only leads can preview cases.');
      if (!lead && !(await repo.myTracks(accountId)).includes(c.trackId)) fail('forbidden', 'This case is not in a track assigned to you.');
      if (kind === 'practice') {
        const open = (await repo.runsFor(accountId)).find((r) => r.caseId === caseId && r.status === 'active');
        if (open) return service.runView(accountId, open.id);
      }
      const id = await repo.createRun({ caseId, trackId: c.trackId, accountId, kind });
      return service.runView(accountId, id);
    },

    async runView(accountId, runId) {
      const run = await loadRunFor(accountId, runId);
      const c = await repo.getCase(run.caseId);
      const s = await settings.get();
      const lead = await users.isLead(accountId);
      return { id: run.id, kind: run.kind, status: run.status, startedAt: run.startedAt, endedAt: run.endedAt, turnLimit: s.turnLimit, case: traineeCaseView(c), turns: (await repo.turnsForRun(runId)).map((t) => turnView(t, { lead: lead && run.kind === 'preview' })) };
    },

    async send(accountId, runId, text) {
      const run = await loadRunFor(accountId, runId);
      if (run.accountId !== accountId) fail('forbidden', 'Only the trainee can reply in this run.');
      if (run.status !== 'active') fail('closed', 'This run has ended.');
      const msg = String(text || '').trim().slice(0, MAX_MSG);
      if (!msg) fail('bad_request', 'Write a reply first.');
      const turns = await repo.turnsForRun(runId);
      if (turns.some((t) => t.status === 'pending')) fail('busy', 'The customer is still answering your last reply.');
      const s = await settings.get();
      const done = turns.filter(answered).length;
      if (done >= s.turnLimit) fail('closed', 'Turn limit reached.');
      // a failed turn is replaced by the new one
      const n = done + 1;
      const c = await repo.getCase(run.caseId);
      const id = await repo.addTurn({ runId, n, accountId, requestType: c.requestType, trainee: msg });
      await enqueue.runTurn(id);
      return { turnId: id };
    },

    async getTurn(accountId, turnId) {
      const t = await repo.getTurn(turnId);
      if (!t) fail('not_found', 'Turn not found.');
      const run = await loadRunFor(accountId, t.runId);
      return { turn: turnView(t, { lead: run.kind === 'preview' }), runStatus: run.status };
    },

    async endRun(accountId, runId) {
      const run = await loadRunFor(accountId, runId);
      if (run.status === 'active') await repo.endRun(runId, 'ended');
      return service.runView(accountId, runId);
    },

    async debrief(accountId, runId) {
      const run = await loadRunFor(accountId, runId);
      if (run.status === 'active') fail('closed', 'Finish or end the run to see the real ticket.');
      const c = await repo.getCase(run.caseId);
      const turns = (await repo.turnsForRun(runId)).filter(answered);
      return {
        case: traineeCaseView(c), status: run.status,
        realThread: c.debrief, resolution: c.resolution,
        myRun: { opening: c.customer.opening, turns: turns.map((t) => turnView(t)) },
        facts: factTimeline(c, turns.map((t) => t.released)),
      };
    },

    async searchKb(accountId, runId, q) {
      const run = await loadRunFor(accountId, runId);
      const tr = await repo.getTrack(run.trackId);
      if (tr.source === 'demo') {
        const idx = new BM25(Object.fromEntries(tr.kb.map((k) => [k.id, `${k.title} ${k.body}`])));
        const ids = String(q || '').trim() ? idx.search(q, 6) : tr.kb.map((k) => k.id);
        return ids.map((id) => tr.kb.find((k) => k.id === id)).map((k) => ({ id: k.id, title: k.title, excerpt: k.body.slice(0, 180) }));
      }
      const s = await settings.get();
      return deps.confluence.search(q, { spaceKey: s.kbSpaceKey, limit: 6 });
    },

    async kbArticle(accountId, runId, id) {
      const run = await loadRunFor(accountId, runId);
      const tr = await repo.getTrack(run.trackId);
      if (tr.source === 'demo') return tr.kb.find((k) => k.id === id) || fail('not_found', 'Article not found.');
      return deps.confluence.page(String(id).replace(/^PAGE-/, ''));
    },

    // ---------------------------------------------------------------- background: one practice turn
    async processTurn(turnId) {
      const t = await repo.getTurn(turnId);
      if (!t || t.status !== 'pending') return { skipped: true };
      try {
        const run = await repo.getRun(t.runId);
        const pc = await repo.getCase(run.caseId);
        const track = await repo.getTrack(run.trackId);
        const s = await settings.get();
        const llm = llmFor(s.model);
        const state = run.state;
        const kbPool = await kbPoolFor(track, pc, t.trainee);
        const customerPart = (async () => {
          const { release, kind } = await reveal(pc.customer, state, t.trainee, llm);
          let verdict = null, why = '';
          if (kind === 'fix_proposal') ({ verdict, why } = await solvedCheck(pc, kbPool, state, t.trainee, llm));
          const r = await speak(pc.customer, state, t.trainee, release, llm, verdict);
          return { ...r, release, kind, verdict, why };
        })();
        // the grade starts at the same time, but the customer reply is saved (and shown) as soon as it is ready
        const gradePart = (run.kind === 'preview' ? Promise.resolve(null) : gradeReply(pc, kbPool, track.sop, { turns: state.turns, replies: state.replies }, t.trainee, llm))
          .catch((e) => ({ failed: e.message || String(e) }));
        const cust = await customerPart;
        await repo.saveReply(turnId, { reply: cust.reply, released: cust.release, kind: cust.kind, verdict: cust.verdict });
        await repo.saveRunState(run.id, cust.state, run.usage);
        if (cust.verdict === 'solved') await repo.endRun(run.id, 'solved');
        else if (cust.state.turns.length >= s.turnLimit) await repo.endRun(run.id, 'limit');
        const grade = await gradePart;
        const ok = grade && !grade.failed ? grade : null;
        await repo.saveGrade(turnId, { grade: ok, mark: ok?.mark || null });
        const usage = { calls: run.usage.calls + llm.usage.calls, input: run.usage.input + llm.usage.input, output: run.usage.output + llm.usage.output };
        await repo.saveRunState(run.id, cust.state, usage);
        return { done: true, verdict: cust.verdict };
      } catch (e) {
        await repo.failTurn(turnId, e.message || String(e));
        return { failed: true, error: e.message };
      }
    },

    // ---------------------------------------------------------------- lead: tracks and cases
    async listTracks(accountId) {
      await requireLead(accountId);
      const out = [];
      for (const tr of await repo.listTracks()) {
        const cases = await repo.listCases(tr.id);
        const count = (st) => cases.filter((c) => c.status === st).length;
        out.push({ id: tr.id, name: tr.name, source: tr.source, jql: tr.jql, status: tr.status, createdAt: tr.createdAt, cases: { total: cases.length, ready: count('ready'), building: count('queued') + count('building'), failed: count('failed'), skipped: count('skipped'), removed: count('removed') }, assignees: (await repo.trackAssignees(tr.id)).length });
      }
      return out;
    },

    async previewJql(accountId, jql) {
      await requireLead(accountId);
      const keys = await deps.jsmUser.searchKeys(jql, 10);
      return { sample: keys };
    },

    async createTrack(accountId, { name, source, packId, jql, projectKey, allowSensitive = false }) {
      await requireLead(accountId);
      const s = await settings.get();
      const trackSettings = { allowSensitive: !!allowSensitive, packId: packId || null };
      if (source === 'demo') {
        const pack = packById(packId) || fail('bad_request', 'Unknown demo pack.');
        const id = await repo.createTrack({ name: name || pack.title, source, settings: trackSettings, sop: pack.sop, kb: pack.kb, createdBy: accountId });
        // demo cases are prebuilt (scripts/prebuild-demo.mjs), so a demo track is ready at once with no model calls
        const toBuild = [];
        let ready = 0;
        for (const t of pack.tickets.slice(0, s.maxCasesPerTrack)) {
          const cid = await repo.addCase({ trackId: id, key: t.key, requestType: t.request_type, summary: t.summary });
          const pre = prebuilt[`${pack.id}:${t.key}`];
          if (pre) { await repo.saveCase(cid, structuredClone(pre), 'ready'); ready++; } else toBuild.push(cid);
        }
        if (toBuild.length) await enqueue.buildCase(toBuild);
        else await repo.setTrackStatus(id, 'ready');
        return { id, cases: ready + toBuild.length, ready };
      }
      if (source !== 'jsm') fail('bad_request', 'Pick a source.');
      if (!String(jql || '').trim()) fail('bad_request', 'Enter a JQL filter of solved tickets.');
      const keys = await deps.jsmUser.searchKeys(jql, s.maxCasesPerTrack);
      if (!keys.length) fail('bad_request', 'The JQL filter found no tickets.');
      let sop = [];
      try { sop = await deps.confluence.sops({ label: s.sopLabel, spaceKey: s.sopSpaceKey || s.kbSpaceKey }); } catch { sop = []; }
      const id = await repo.createTrack({ name: name || 'Practice track', source, projectKey, jql, settings: trackSettings, sop, kb: [], createdBy: accountId });
      const caseIds = [];
      for (const k of keys) caseIds.push(await repo.addCase({ trackId: id, key: k.key, requestType: '', summary: k.summary }));
      await enqueue.buildCase(caseIds);
      return { id, cases: caseIds.length, sops: sop.length };
    },

    async deleteTrack(accountId, trackId) {
      await requireLead(accountId);
      for (const c of await repo.listCases(trackId)) await settings.deletePiiMap(c.id).catch(() => {});
      await repo.deleteTrack(trackId);
      return { ok: true };
    },

    async trackDetail(accountId, trackId) {
      await requireLead(accountId);
      const tr = await repo.getTrack(trackId) || fail('not_found', 'Track not found.');
      const cases = await repo.listCases(trackId, { full: true });
      const assignees = await repo.trackAssignees(trackId);
      const names = await users.names(assignees);
      return {
        id: tr.id, name: tr.name, source: tr.source, jql: tr.jql, status: tr.status, sops: tr.sop.length,
        cases: cases.map((c) => ({ id: c.id, key: c.key, requestType: c.requestType, summary: c.summary, status: c.status, score: c.score, error: c.error, reasons: c.value?.reasons || [], facts: c.customer?.facts?.length || 0 })),
        assignees: assignees.map((a) => ({ accountId: a, name: names[a] || a })),
      };
    },

    async caseDetail(accountId, caseId) {
      await requireLead(accountId);
      const c = await repo.getCase(caseId) || fail('not_found', 'Case not found.');
      return { id: c.id, key: c.key, requestType: c.requestType, summary: c.summary, status: c.status, value: c.value, customer: c.customer ? { persona: c.customer.persona, opening: c.customer.opening, facts: c.customer.facts, secretCount: c.customer.secret.length } : null, resolution: c.resolution, debrief: c.debrief, kbUsed: c.kbUsed };
    },

    async setCaseStatus(accountId, caseId, status) {
      await requireLead(accountId);
      if (!['ready', 'removed'].includes(status)) fail('bad_request', 'Bad status.');
      const c = await repo.getCase(caseId) || fail('not_found', 'Case not found.');
      if (status === 'ready' && !c.customer) fail('bad_request', 'This case was not built.');
      await repo.setCaseStatus(caseId, status);
      return { ok: true };
    },

    async retryCase(accountId, caseId) {
      await requireLead(accountId);
      await repo.setCaseStatus(caseId, 'queued');
      await enqueue.buildCase([caseId]);
      return { ok: true };
    },

    // ---------------------------------------------------------------- background: build one case
    async buildCase(caseId) {
      const row = await repo.getCase(caseId);
      if (!row || !['queued', 'building'].includes(row.status)) return { skipped: true };
      await repo.setCaseStatus(caseId, 'building');
      const track = await repo.getTrack(row.trackId);
      const s = await settings.get();
      try {
        let ticket, kbArticles = [];
        if (track.source === 'demo') {
          ticket = packById(track.settings.packId).tickets.find((t) => t.key === row.key);
        } else {
          ticket = await deps.jsmApp.loadTicket(row.key);
          if (ticket.kb_used.length) kbArticles = await deps.confluence.pages(ticket.kb_used);
        }
        const value = practiceValue(ticket, { allowSensitive: track.settings.allowSensitive, sensitive: s.sensitiveTypes });
        if (!value.usable) {
          await repo.saveCase(caseId, { key: ticket.key, requestType: ticket.request_type, summary: ticket.summary, value }, 'skipped');
        } else {
          const llm = llmFor(s.model);
          const shared = [...track.kb, ...track.sop].map((d) => `${d.id} ${d.title || ''}\n${d.body || ''}`).join('\n');
          const { pc, piiMap } = await buildPracticeCase(ticket, llm, { keep: s.keepTerms, shared, allowSensitive: track.settings.allowSensitive, sensitive: s.sensitiveTypes });
          if (kbArticles.length) pc.kbArticles = kbArticles;
          await settings.savePiiMap(caseId, piiMap);
          await repo.saveCase(caseId, pc, 'ready');
        }
      } catch (e) {
        await repo.failCase(caseId, e.message || String(e));
      }
      const left = (await repo.listCases(row.trackId)).filter((c) => ['queued', 'building'].includes(c.status)).length;
      if (!left) await repo.setTrackStatus(row.trackId, 'ready');
      return { done: true };
    },

    // ---------------------------------------------------------------- lead: people
    async searchUsers(accountId, q) { await requireLead(accountId); return users.search(q); },

    async assign(accountId, trackId, accountIds) {
      await requireLead(accountId);
      for (const a of accountIds || []) await repo.assign(trackId, a, accountId);
      return service.trackDetail(accountId, trackId);
    },
    async unassign(accountId, trackId, traineeId) {
      await requireLead(accountId);
      await repo.unassign(trackId, traineeId);
      return service.trackDetail(accountId, trackId);
    },

    /** Stats for one trainee (lead or the trainee themselves). */
    async traineeStats(viewerId, traineeId) {
      if (viewerId !== traineeId) await requireLead(viewerId);
      const runs = await repo.runsFor(traineeId);
      const ended = runs.filter((r) => r.status !== 'active');
      const solvedRuns = runs.filter((r) => r.status === 'solved');
      const graded = await repo.gradedTurns(traineeId);
      const spots = weakSpots(graded.map((t) => ({ errors: (t.grade?.errors || []).map((e) => e.type), requestType: t.requestType })));
      const marks = graded.map((t) => t.mark);
      const solvedCases = new Set(solvedRuns.map((r) => r.caseId));
      const tracks = [];
      const marksConfirmed = (await repo.readyMarks()).filter((m) => m.accountId === traineeId);
      const pool = [];
      for (const tid of await repo.myTracks(traineeId)) {
        const tr = await repo.getTrack(tid); if (!tr) continue;
        const cases = (await repo.listCases(tid, { full: true })).filter((c) => c.status === 'ready');
        pool.push(...cases);
        tracks.push({ id: tid, name: tr.name, ...readiness(cases.map((c) => c.id), solvedCases, marks), confirmed: marksConfirmed.some((m) => m.trackId === tid) });
      }
      const avg = (xs) => (xs.length ? Math.round((xs.reduce((a, c) => a + c, 0) / xs.length) * 10) / 10 : null);
      return {
        accountId: traineeId, runs: runs.length, ended: ended.length, solved: solvedRuns.length,
        solveRate: ended.length ? Math.round((solvedRuns.length / ended.length) * 100) : null,
        turnsToSolve: avg(solvedRuns.map((r) => r.state.turns.length)),
        greenRate: marks.length ? Math.round((marks.filter((m) => m === 'green').length / marks.length) * 100) : null,
        weakSpots: spots, tracks, picks: nextPicks(pool, spots, solvedCases),
        recentRuns: runs.slice(0, 10).map((r) => ({ id: r.id, caseId: r.caseId, status: r.status, turns: r.state.turns.length, startedAt: r.startedAt })),
        cost: runs.reduce((a, r) => ({ calls: a.calls + r.usage.calls, input: a.input + r.usage.input, output: a.output + r.usage.output }), { calls: 0, input: 0, output: 0 }),
      };
    },

    async dashboard(accountId) {
      await requireLead(accountId);
      const ids = [...new Set((await repo.allAssignments()).map((a) => a.accountId))];
      const names = await users.names(ids);
      const trainees = [];
      for (const id of ids) trainees.push({ name: names[id] || id, ...(await service.traineeStats(accountId, id)) });
      const graded = trainees.reduce((a, t) => a + t.weakSpots.turns, 0);
      return { trainees, overrides: await repo.overrideCount(), gradedTurns: graded };
    },

    async confirmReady(accountId, traineeId, trackId) {
      await requireLead(accountId);
      await repo.confirmReady(traineeId, trackId, accountId);
      return { ok: true };
    },

    async overrideGrade(accountId, turnId, note) {
      await requireLead(accountId);
      await repo.overrideGrade(turnId, accountId, note);
      return { ok: true };
    },

    async getSettings(accountId) { await requireLead(accountId); return settings.get(); },
    async saveSettings(accountId, patch) { await requireLead(accountId); return settings.save(patch || {}); },

    // ---------------------------------------------------------------- scheduled
    async cleanup() {
      const s = await settings.get();
      return { deleted: await repo.deleteRunsBefore(now() - s.retentionDays * 86400000) };
    },
  };
  return service;
}
