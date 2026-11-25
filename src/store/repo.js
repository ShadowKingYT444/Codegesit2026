// Data access. Every function takes the driver from db.js, so tests run the same SQL on node:sqlite.
import { MIGRATIONS } from './db.js';

const J = (v) => (v == null ? null : JSON.stringify(v));
const P = (s, d = null) => { if (s == null) return d; try { return JSON.parse(s); } catch { return d; } };
export const newId = (p) => `${p}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

export function makeRepo(d, now = () => Date.now()) {
  const one = async (q, p) => (await d.query(q, p))[0] || null;
  const track = (r) => r && ({ id: r.id, name: r.name, source: r.source, projectKey: r.project_key, jql: r.jql, settings: P(r.settings_json, {}), sop: P(r.sop_json, []), kb: P(r.kb_json, []), status: r.status, createdBy: r.created_by, createdAt: Number(r.created_at) });
  const kase = (r, full = true) => r && ({ id: r.id, trackId: r.track_id, key: r.ticket_key, requestType: r.request_type, summary: r.summary, status: r.status, score: r.score, error: r.error, createdAt: Number(r.created_at), ...(full ? P(r.case_json, {}) : {}), id: r.id });
  const run = (r) => r && ({ id: r.id, caseId: r.case_id, trackId: r.track_id, accountId: r.account_id, kind: r.kind, status: r.status, state: P(r.state_json, { given: [], turns: [], replies: [] }), usage: P(r.usage_json, { calls: 0, input: 0, output: 0 }), startedAt: Number(r.started_at), endedAt: r.ended_at == null ? null : Number(r.ended_at) });
  const turn = (r) => r && ({ id: r.id, runId: r.run_id, n: r.n, accountId: r.account_id, requestType: r.request_type, trainee: r.trainee_msg, reply: r.customer_reply, released: P(r.released_json, []), kind: r.kind, verdict: r.verdict, grade: P(r.grade_json, null), mark: r.mark, status: r.status, error: r.error, createdAt: Number(r.created_at) });

  return {
    migrate: () => d.migrate(MIGRATIONS),

    // tracks
    async createTrack({ name, source, projectKey = null, jql = null, settings = {}, sop = [], kb = [], createdBy }) {
      const id = newId('trk');
      await d.exec('INSERT INTO tracks (id, name, source, project_key, jql, settings_json, sop_json, kb_json, status, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [id, name, source, projectKey, jql, J(settings), J(sop), J(kb), 'building', createdBy, now()]);
      return id;
    },
    getTrack: async (id) => track(await one('SELECT * FROM tracks WHERE id = ?', [id])),
    listTracks: async () => (await d.query('SELECT * FROM tracks ORDER BY created_at DESC')).map(track),
    setTrackStatus: (id, status) => d.exec('UPDATE tracks SET status = ? WHERE id = ?', [status, id]),
    setTrackContent: (id, { sop, kb }) => d.exec('UPDATE tracks SET sop_json = ?, kb_json = ? WHERE id = ?', [J(sop), J(kb), id]),
    async deleteTrack(id) {
      const runs = await d.query('SELECT id FROM runs WHERE track_id = ?', [id]);
      for (const r of runs) await d.exec('DELETE FROM turns WHERE run_id = ?', [r.id]);
      for (const q of ['DELETE FROM runs WHERE track_id = ?', 'DELETE FROM cases WHERE track_id = ?', 'DELETE FROM assignments WHERE track_id = ?', 'DELETE FROM readiness WHERE track_id = ?', 'DELETE FROM tracks WHERE id = ?']) await d.exec(q, [id]);
    },

    // cases
    async addCase({ trackId, key, requestType, summary }) {
      const id = newId('cas');
      await d.exec('INSERT INTO cases (id, track_id, ticket_key, request_type, summary, status, created_at) VALUES (?,?,?,?,?,?,?)', [id, trackId, key, requestType, summary, 'queued', now()]);
      return id;
    },
    saveCase: (id, pc, status = 'ready') => d.exec('UPDATE cases SET case_json = ?, status = ?, score = ?, request_type = ?, summary = ?, error = NULL WHERE id = ?',
      [J(pc), status, pc.value?.score ?? null, pc.requestType, String(pc.summary || '').slice(0, 500), id]),
    failCase: (id, error) => d.exec('UPDATE cases SET status = ?, error = ? WHERE id = ?', ['failed', String(error).slice(0, 2000), id]),
    setCaseStatus: (id, status) => d.exec('UPDATE cases SET status = ? WHERE id = ?', [status, id]),
    getCase: async (id) => kase(await one('SELECT * FROM cases WHERE id = ?', [id])),
    listCases: async (trackId, { full = false } = {}) => (await d.query(`SELECT id, track_id, ticket_key, request_type, summary, status, score, error, created_at${full ? ', case_json' : ''} FROM cases WHERE track_id = ? ORDER BY created_at`, [trackId])).map((r) => kase(r, full)),

    // assignments
    async assign(trackId, accountId, by) {
      await d.exec('DELETE FROM assignments WHERE track_id = ? AND account_id = ?', [trackId, accountId]);
      await d.exec('INSERT INTO assignments (track_id, account_id, assigned_by, assigned_at) VALUES (?,?,?,?)', [trackId, accountId, by, now()]);
    },
    unassign: (trackId, accountId) => d.exec('DELETE FROM assignments WHERE track_id = ? AND account_id = ?', [trackId, accountId]),
    trackAssignees: async (trackId) => (await d.query('SELECT account_id FROM assignments WHERE track_id = ?', [trackId])).map((r) => r.account_id),
    myTracks: async (accountId) => (await d.query('SELECT track_id FROM assignments WHERE account_id = ?', [accountId])).map((r) => r.track_id),
    allAssignments: async () => (await d.query('SELECT track_id, account_id FROM assignments')).map((r) => ({ trackId: r.track_id, accountId: r.account_id })),

    // runs
    async createRun({ caseId, trackId, accountId, kind = 'practice' }) {
      const id = newId('run');
      await d.exec('INSERT INTO runs (id, case_id, track_id, account_id, kind, status, state_json, usage_json, started_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, caseId, trackId, accountId, kind, 'active', J({ given: [], turns: [], replies: [] }), J({ calls: 0, input: 0, output: 0 }), now()]);
      return id;
    },
    getRun: async (id) => run(await one('SELECT * FROM runs WHERE id = ?', [id])),
    saveRunState: (id, state, usage) => d.exec('UPDATE runs SET state_json = ?, usage_json = ? WHERE id = ?', [J(state), J(usage), id]),
    endRun: (id, status) => d.exec('UPDATE runs SET status = ?, ended_at = ? WHERE id = ?', [status, now(), id]),
    runsFor: async (accountId, kind = 'practice') => (await d.query('SELECT * FROM runs WHERE account_id = ? AND kind = ? ORDER BY started_at DESC', [accountId, kind])).map(run),
    allRuns: async (kind = 'practice') => (await d.query('SELECT * FROM runs WHERE kind = ? ORDER BY started_at DESC', [kind])).map(run),

    // turns
    async addTurn({ runId, n, accountId, requestType, trainee }) {
      const id = newId('trn');
      await d.exec('INSERT INTO turns (id, run_id, n, account_id, request_type, trainee_msg, status, created_at) VALUES (?,?,?,?,?,?,?,?)', [id, runId, n, accountId, requestType, trainee, 'pending', now()]);
      return id;
    },
    finishTurn: (id, { reply, released, kind, verdict, grade, mark }) => d.exec('UPDATE turns SET customer_reply = ?, released_json = ?, kind = ?, verdict = ?, grade_json = ?, mark = ?, status = ? WHERE id = ?',
      [reply, J(released), kind, verdict, J(grade), mark, 'done', id]),
    failTurn: (id, error) => d.exec('UPDATE turns SET status = ?, error = ? WHERE id = ?', ['failed', String(error).slice(0, 2000), id]),
    getTurn: async (id) => turn(await one('SELECT * FROM turns WHERE id = ?', [id])),
    turnsForRun: async (runId) => (await d.query('SELECT * FROM turns WHERE run_id = ? ORDER BY n', [runId])).map(turn),
    gradedTurns: async (accountId, limit = 200) => (await d.query("SELECT t.* FROM turns t JOIN runs r ON r.id = t.run_id WHERE t.account_id = ? AND t.status = 'done' AND r.kind = 'practice' ORDER BY t.created_at DESC LIMIT ?", [accountId, limit])).map(turn),

    // lead actions
    async overrideGrade(turnId, leadId, note) {
      await d.exec('DELETE FROM overrides WHERE turn_id = ?', [turnId]);
      await d.exec('INSERT INTO overrides (turn_id, lead_id, note, created_at) VALUES (?,?,?,?)', [turnId, leadId, note || '', now()]);
    },
    overriddenTurnIds: async () => new Set((await d.query('SELECT turn_id FROM overrides')).map((r) => r.turn_id)),
    overrideCount: async () => Number((await one('SELECT COUNT(*) AS n FROM overrides'))?.n || 0),
    async confirmReady(accountId, trackId, by) {
      await d.exec('DELETE FROM readiness WHERE account_id = ? AND track_id = ?', [accountId, trackId]);
      await d.exec('INSERT INTO readiness (account_id, track_id, confirmed_by, confirmed_at) VALUES (?,?,?,?)', [accountId, trackId, by, now()]);
    },
    readyMarks: async () => (await d.query('SELECT * FROM readiness')).map((r) => ({ accountId: r.account_id, trackId: r.track_id, confirmedBy: r.confirmed_by, confirmedAt: Number(r.confirmed_at) })),

    // retention
    async deleteRunsBefore(cutoff) {
      const old = await d.query('SELECT id FROM runs WHERE started_at < ?', [cutoff]);
      for (const r of old) { await d.exec('DELETE FROM turns WHERE run_id = ?', [r.id]); await d.exec('DELETE FROM runs WHERE id = ?', [r.id]); }
      return old.length;
    },
  };
}
