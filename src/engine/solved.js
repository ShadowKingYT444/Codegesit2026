// Step 6: did the trainee's proposed fix solve it? Only this call (and the grader) sees the resolution.
import { SOLVED, SOLVED_SCHEMA, SOLVED_SYS } from './prompts.js';
import { convText } from './customer.js';
import { kbText, pickKb } from './grader.js';

export async function solvedCheck(pc, kb, state, proposal, llm) {
  try {
    const r = await llm.json(SOLVED_SYS, SOLVED({
      summary: pc.summary, resolution: pc.resolution, kb: kbText(pickKb(kb, pc.kbUsed, proposal, 1)),
      conv: convText(pc.customer.opening, state.turns, state.replies), proposal,
    }), SOLVED_SCHEMA);
    const verdict = ['solved', 'not_yet', 'made_worse'].includes(r.verdict) ? r.verdict : 'not_yet';
    return { verdict, why: r.why || '' };
  } catch (e) {
    return { verdict: 'not_yet', why: `check failed: ${e.message}` };
  }
}
