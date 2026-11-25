// Custom UI resolver: every call the practice screen and the lead pages make.
import Resolver from '@forge/resolver';
import { forgeService } from '../forge.js';
import { AppError } from '../service.js';

const resolver = new Resolver();

// name -> (service, accountId, payload) => result
const CALLS = {
  context: (s, a) => s.context(a),
  home: (s, a) => s.home(a),
  startRun: (s, a, p) => s.startRun(a, p.caseId),
  previewCase: (s, a, p) => s.startRun(a, p.caseId, { kind: 'preview' }),
  getRun: (s, a, p) => s.runView(a, p.runId),
  send: (s, a, p) => s.send(a, p.runId, p.text),
  getTurn: (s, a, p) => s.getTurn(a, p.turnId),
  endRun: (s, a, p) => s.endRun(a, p.runId),
  debrief: (s, a, p) => s.debrief(a, p.runId),
  searchKb: (s, a, p) => s.searchKb(a, p.runId, p.q),
  kbArticle: (s, a, p) => s.kbArticle(a, p.runId, p.id),
  myStats: (s, a) => s.traineeStats(a, a),
  listTracks: (s, a) => s.listTracks(a),
  previewJql: (s, a, p) => s.previewJql(a, p.jql),
  createTrack: (s, a, p) => s.createTrack(a, p),
  deleteTrack: (s, a, p) => s.deleteTrack(a, p.trackId),
  trackDetail: (s, a, p) => s.trackDetail(a, p.trackId),
  caseDetail: (s, a, p) => s.caseDetail(a, p.caseId),
  setCaseStatus: (s, a, p) => s.setCaseStatus(a, p.caseId, p.status),
  retryCase: (s, a, p) => s.retryCase(a, p.caseId),
  searchUsers: (s, a, p) => s.searchUsers(a, p.q),
  assign: (s, a, p) => s.assign(a, p.trackId, p.accountIds),
  unassign: (s, a, p) => s.unassign(a, p.trackId, p.accountId),
  dashboard: (s, a) => s.dashboard(a),
  traineeStats: (s, a, p) => s.traineeStats(a, p.accountId),
  confirmReady: (s, a, p) => s.confirmReady(a, p.accountId, p.trackId),
  overrideGrade: (s, a, p) => s.overrideGrade(a, p.turnId, p.note),
  getSettings: (s, a) => s.getSettings(a),
  saveSettings: (s, a, p) => s.saveSettings(a, p.settings),
};

for (const [name, fn] of Object.entries(CALLS)) {
  resolver.define(name, async ({ payload, context }) => {
    try {
      const s = await forgeService({ userContext: true });
      return { ok: true, data: await fn(s, context.accountId, payload || {}) };
    } catch (e) {
      if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message } };
      console.error(`resolver ${name} failed`, e);
      return { ok: false, error: { code: 'internal', message: 'Something went wrong. Try again.' } };
    }
  });
}

export const handler = resolver.getDefinitions();
