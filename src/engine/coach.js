// Coaching loop with no AI: weak spots from graded turns and the next practice tickets with the highest expected value.
import { ERROR_INFO } from './grader.js';

export const TYPES = Object.keys(ERROR_INFO);
export const smoothed = (errors, turns) => (errors + 1) / (turns + 3);

/**
 * turns: graded turns, newest first: [{errors:[type], requestType, at}]. Uses the last `window` turns.
 * Returns {turns, byType:{type:{errors, rate}}, byRequestType:{rt:{turns, errors, rate}}, top:[type]}
 */
export function weakSpots(turns, window = 20) {
  const recent = turns.slice(0, window);
  const n = recent.length;
  const byType = {};
  for (const ty of TYPES) {
    const e = recent.filter((t) => t.errors.includes(ty)).length;
    byType[ty] = { errors: e, rate: smoothed(e, n), label: ERROR_INFO[ty].label };
  }
  const byRequestType = {};
  for (const t of recent) {
    const r = byRequestType[t.requestType] ||= { turns: 0, errors: 0 };
    r.turns += 1; r.errors += t.errors.length ? 1 : 0;
  }
  for (const r of Object.values(byRequestType)) r.rate = smoothed(r.errors, r.turns);
  const base = smoothed(0, n);
  const top = TYPES.filter((ty) => byType[ty].errors > 0).sort((a, b) => byType[b].rate - byType[a].rate).filter((ty) => byType[ty].rate > base);
  return { turns: n, byType, byRequestType, top };
}

/** How much a case exercises each error type, from its customer card and real thread (0..1). */
export function exercises(pc) {
  const text = `${pc.summary} ${pc.requestType} ${pc.resolution} ${(pc.debrief || []).map((m) => m.body).join(' ')}`.toLowerCase();
  const facts = (pc.customer?.facts || []).filter((f) => f.kind !== 'reaction').length;
  return {
    missing_needed_question: Math.min(1, facts / 4),
    asked_known_info: Math.min(1, (pc.customer?.opening || '').length / 400 + facts / 8),
    wrong_fix: (pc.kbUsed || []).length ? 0.8 : 0.4,
    skipped_required_step: /password|unlock|mfa|reset|access|identity|verify|approval|recovery|bitlocker|admin/.test(text) ? 1 : 0.15,
    unauthorized_promise: /refund|credit|replace|deadline|urgent|asap|today|exception|compensat/.test(text) ? 1 : 0.2,
    leaked_internal: (pc.customer?.secret || []).length ? Math.min(1, pc.customer.secret.length / 5) : 0.2,
    tone: /!!|frustrat|angry|again|third time|unacceptable|urgent|asap/.test(`${pc.customer?.persona || ''} ${pc.customer?.opening || ''}`.toLowerCase()) ? 1 : 0.3,
  };
}

/**
 * Next practice tickets: weak request type first, then cases whose real threads needed what the trainee keeps missing.
 * cases: practice cases; done: Set of case ids the trainee solved. Returns [{caseId, value, reasons}].
 */
export function nextPicks(cases, spots, done = new Set(), n = 3) {
  const scored = cases.filter((c) => !done.has(c.id)).map((c) => {
    const ex = exercises(c);
    const rt = spots.byRequestType[c.requestType];
    const rtRate = rt ? rt.rate : 0.5; // untried request types are worth trying
    let value = 0.6 * rtRate;
    const reasons = [];
    for (const ty of TYPES) value += spots.byType[ty].rate * ex[ty];
    if (rt && rt.rate >= 0.4) reasons.push(`weak on ${c.requestType} tickets`);
    if (!rt) reasons.push(`no practice yet on ${c.requestType}`);
    for (const ty of spots.top.slice(0, 2)) if (ex[ty] >= 0.6) reasons.push(`trains "${ERROR_INFO[ty].label.toLowerCase()}"`);
    return { caseId: c.id, key: c.key, summary: c.summary, requestType: c.requestType, value: Math.round(value * 1000) / 1000, reasons };
  });
  return scored.sort((a, b) => b.value - a.value).slice(0, n);
}

/**
 * Ready for queue (suggestion only; a lead confirms): solved at least 80% of the track's cases,
 * and red marks on at most 15% of the last 20 graded turns.
 */
export function readiness(trackCaseIds, solvedIds, recentMarks) {
  const total = trackCaseIds.length;
  const solved = trackCaseIds.filter((id) => solvedIds.has(id)).length;
  const reds = recentMarks.slice(0, 20).filter((m) => m === 'red').length;
  const redRate = recentMarks.length ? reds / Math.min(20, recentMarks.length) : 1;
  const ready = total > 0 && solved / total >= 0.8 && redRate <= 0.15;
  return { ready, solved, total, redRate: Math.round(redRate * 100) / 100 };
}
