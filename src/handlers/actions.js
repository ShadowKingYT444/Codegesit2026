// Rovo actions for the Ride-Along Coach agent. Each returns plain text the agent can read back.
import { forgeService } from '../forge.js';
import { AppError } from '../service.js';
import { ERROR_INFO } from '../engine/grader.js';

const who = (payload, context) => context?.principal?.accountId || payload?.context?.accountId;
const safe = (fn) => async (payload, context) => {
  try { return await fn(await forgeService({ userContext: true }), who(payload, context), payload || {}); }
  catch (e) { return e instanceof AppError ? e.message : `Ride-Along could not do that: ${e.message}`; }
};
const pct = (x) => (x == null ? 'no data yet' : `${x}%`);

/** start-practice: pick the best next case for the caller (optionally for one request type) and open a run. */
export const startPractice = safe(async (s, me, p) => {
  const home = await s.home(me);
  const cases = home.tracks.flatMap((t) => t.cases);
  if (!cases.length) return 'You have no practice track yet. Ask your team lead to assign one in Ride-Along.';
  const want = String(p.requestType || '').toLowerCase();
  let pick = home.picks.find((x) => !want || x.requestType.toLowerCase().includes(want));
  if (!pick) pick = cases.find((c) => !c.solved && (!want || c.requestType.toLowerCase().includes(want)));
  if (!pick) return `No unsolved practice ticket matches "${p.requestType}".`;
  const caseId = pick.caseId || pick.id;
  const run = await s.startRun(me, caseId);
  const why = pick.reasons?.length ? ` Picked because: ${pick.reasons.join('; ')}.` : '';
  return `Practice run ready: ${run.case.requestType}, "${run.case.summary}".${why}\nThe customer wrote: "${run.case.opening}"\nOpen Ride-Along in your service project to reply. The run is waiting under "Continue".`;
});

/** weak-spots: error rates by type and request type for the caller, or for a trainee if the caller is a lead. */
export const weakSpots = safe(async (s, me, p) => {
  const target = p.accountId || me;
  const st = await s.traineeStats(me, target);
  if (!st.weakSpots.turns) return 'No graded practice replies yet.';
  const types = Object.entries(st.weakSpots.byType).filter(([, v]) => v.errors).sort((a, b) => b[1].rate - a[1].rate)
    .map(([k, v]) => `${ERROR_INFO[k].label}: ${v.errors} of the last ${st.weakSpots.turns} replies`);
  const rts = Object.entries(st.weakSpots.byRequestType).sort((a, b) => b[1].rate - a[1].rate).map(([k, v]) => `${k}: errors in ${v.errors} of ${v.turns} replies`);
  return [
    `Solve rate ${pct(st.solveRate)}, clean replies ${pct(st.greenRate)}, average turns to solve ${st.turnsToSolve ?? 'n/a'}.`,
    types.length ? `Most common errors: ${types.join('; ')}.` : 'No errors in recent replies.',
    `By request type: ${rts.join('; ')}.`,
    st.picks.length ? `Suggested next tickets: ${st.picks.map((x) => `${x.key} (${x.reasons.join(', ') || x.requestType})`).join('; ')}.` : '',
  ].filter(Boolean).join('\n');
});

/** queue-readiness (leads): who looks ready for the live queue, per track. */
export const queueReadiness = safe(async (s, me) => {
  const d = await s.dashboard(me);
  if (!d.trainees.length) return 'No trainees are assigned to a practice track yet.';
  return d.trainees.map((t) => {
    const tr = t.tracks.map((x) => `${x.name}: solved ${x.solved}/${x.total}, red replies ${Math.round(x.redRate * 100)}%${x.confirmed ? ', confirmed ready by a lead' : x.ready ? ', looks READY (needs lead confirmation)' : ', not ready yet'}`).join('; ');
    return `${t.name}: ${tr || 'no track'}.`;
  }).join('\n');
});

/** build-track (leads): build a practice track from a JQL filter of solved tickets. */
export const buildTrack = safe(async (s, me, p) => {
  if (!p.jql) return 'Give me a JQL filter of solved tickets, for example: project = ITSD AND resolution = Done AND created > -180d';
  const r = await s.createTrack(me, { name: p.name || 'Practice track', source: 'jsm', jql: p.jql });
  return `Building track "${p.name || 'Practice track'}" from ${r.cases} tickets (${r.sops} SOP pages found). Cases appear in Ride-Along as they finish; preview them before assigning trainees.`;
});
