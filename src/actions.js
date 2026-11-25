// Ride-Along actions as plain functions: (service, accountId, payload) -> text. Forge-free, so the tests run them.
// handlers/actions.js wraps them for Forge. They serve the Rovo coach agent and the MCP server (rovo:mcp).
import { ERROR_INFO } from './engine/grader.js';

const pct = (x) => (x == null ? 'no data yet' : `${x}%`);

/** start-practice: pick the best next case for the caller (optionally for one request type) and open a run. */
export const startPractice = async (s, me, p) => {
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
  return `Practice run ${run.id} ready: ${run.case.requestType}, "${run.case.summary}".${why}\n${run.case.customerName} (the customer) wrote: "${run.case.opening}"\nReply to the customer with send-practice-reply, or open Ride-Along in your service project. The run also waits there under "Continue".`;
};

/** weak-spots: error rates by type and request type for the caller, or for a trainee if the caller is a lead. */
export const weakSpots = async (s, me, p) => {
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
};

/** queue-readiness (leads): who looks ready for the live queue, per track. */
export const queueReadiness = async (s, me) => {
  const d = await s.dashboard(me);
  if (!d.trainees.length) return 'No trainees are assigned to a practice track yet.';
  return d.trainees.map((t) => {
    const tr = t.tracks.map((x) => `${x.name}: solved ${x.solved}/${x.total}, red replies ${Math.round(x.redRate * 100)}%${x.confirmed ? ', confirmed ready by a lead' : x.ready ? ', looks READY (needs lead confirmation)' : ', not ready yet'}`).join('; ');
    return `${t.name}: ${tr || 'no track'}.`;
  }).join('\n');
};

/** build-track (leads): build a practice track from a JQL filter of solved tickets. */
export const buildTrack = async (s, me, p) => {
  if (!p.jql) return 'Give me a JQL filter of solved tickets, for example: project = ITSD AND resolution = Done AND created > -180d';
  const r = await s.createTrack(me, { name: p.name || 'Practice track', source: 'jsm', jql: p.jql });
  return `Building track "${p.name || 'Practice track'}" from ${r.cases} tickets (${r.sops} SOP pages found). Cases appear in Ride-Along as they finish; preview them before assigning trainees.`;
};

const gradeText = (t) => {
  if (!t.grade) return 'Grade: not available for this reply.';
  const label = { green: 'good reply', amber: 'one minor issue', red: 'needs work' }[t.mark] || t.mark;
  const errs = (t.grade.errors || []).map((e) => `- ${ERROR_INFO[e.type]?.label || e.type}: you wrote "${e.quote}". Rule: ${e.source}`);
  return [`Grade: ${label}.`, ...errs, t.grade.errors?.length ? '' : (t.grade.good || '')].filter(Boolean).join('\n');
};

/** list-practice-tickets: the caller's practice tickets, solved or not, and the suggested next ones. */
export const listPracticeTickets = async (s, me, p) => {
  const home = await s.home(me);
  if (!home.tracks.length) return 'You have no practice track yet. Ask your team lead to assign one in Ride-Along.';
  const want = String(p.track || '').toLowerCase();
  const tracks = home.tracks.filter((t) => !want || t.name.toLowerCase().includes(want));
  if (!tracks.length) return `No practice track matches "${p.track}".`;
  const lines = tracks.map((t) => `${t.name}:\n${t.cases.map((c) => `- ${c.key} [${c.requestType}] ${c.summary}${c.solved ? ' (solved)' : ''}`).join('\n')}`);
  const picks = home.picks.length ? `\nSuggested next: ${home.picks.map((x) => x.key).join(', ')}.` : '';
  return lines.join('\n') + picks;
};

/** send-practice-reply: send the trainee's reply in their active practice run and return the customer's answer and the grade. */
export const sendPracticeReply = async (s, me, p) => {
  if (!String(p.message || '').trim()) return 'Give me the reply to send to the customer.';
  const run = p.runId ? await s.runView(me, p.runId) : await s.latestRun(me, { active: true });
  if (!run) return 'You have no active practice run. Start one with start-practice.';
  const { turnId } = await s.send(me, run.id, p.message, { inline: true });
  const { turn, runStatus } = await s.getTurn(me, turnId);
  if (turn.status === 'failed') return 'The customer could not answer just now. Send the reply again.';
  const outcome = runStatus === 'solved' ? '\nThe customer confirmed the fix worked. Run solved. Use practice-debrief to compare with the real ticket.'
    : runStatus === 'limit' ? '\nTurn limit reached. Use practice-debrief to see the real ticket.' : '';
  return `Customer: "${turn.reply}"\n${gradeText(turn)}${outcome}`;
};

/** practice-debrief: after a run ends, what the customer knew, which details were never asked for, and the real fix. */
export const practiceDebrief = async (s, me, p) => {
  let runId = p.runId;
  if (!runId) {
    const active = await s.latestRun(me, { active: true });
    if (active && p.endActive !== false) await s.endRun(me, active.id);
    runId = active?.id || (await s.latestRun(me, { active: false }))?.id;
  }
  if (!runId) return 'You have no practice run to debrief yet.';
  const d = await s.debrief(me, runId);
  const asked = d.facts.filter((f) => f.turn != null).map((f) => `- ${f.detail} (you got it at reply ${f.turn})`);
  const missed = d.facts.filter((f) => f.turn == null).map((f) => `- ${f.detail} (ask about ${f.asked_by})`);
  return [
    `Debrief for ${d.case.key}, "${d.case.summary}". Result: ${d.status}.`,
    asked.length ? `Details you drew out:\n${asked.join('\n')}` : 'You drew out no details from the customer.',
    missed.length ? `Details you never asked for:\n${missed.join('\n')}` : 'You found every detail the customer knew.',
    `What really fixed it: ${d.resolution}`,
  ].join('\n');
};
