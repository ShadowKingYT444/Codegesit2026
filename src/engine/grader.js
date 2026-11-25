// Grading: one grounded call per trainee reply (the design that won the grading test, F1 73.0 vs 61.1 for 7 checks).
import { GRADE, GRADE_SCHEMA, GRADE_SYS, GRADE_LABELS } from './prompts.js';
import { BM25 } from './bm25.js';

export const ERROR_INFO = {
  wrong_fix: { label: 'Wrong fix', severe: true },
  skipped_required_step: { label: 'Skipped required step', severe: true },
  asked_known_info: { label: 'Asked for known information', severe: false },
  unauthorized_promise: { label: 'Promise above the limit', severe: true },
  missing_needed_question: { label: 'Missing needed question', severe: false },
  leaked_internal: { label: 'Internal leak', severe: true },
  tone: { label: 'Tone', severe: false },
};

/** KB for the grading call: the articles linked to the ticket plus the 2 best text matches for the reply. */
export function pickKb(kb, kbUsed, reply, extra = 2) {
  const linked = kb.filter((k) => (kbUsed || []).includes(k.id));
  const rest = kb.filter((k) => !(kbUsed || []).includes(k.id));
  const idx = new BM25(Object.fromEntries(rest.map((k) => [k.id, `${k.title} ${k.body}`])));
  const hits = idx.search(reply, extra).map((id) => rest.find((k) => k.id === id));
  return [...linked, ...hits];
}

export const kbText = (kb) => kb.map((k) => `[${k.id}] ${k.title}\n${k.body}`).join('\n\n') || '(no KB articles)';
export const sopText = (sop) => sop.map((s) => `[${s.id}] ${s.title}\n${s.body}`).join('\n\n') || '(no SOPs)';

/** Practice conversation as the grader sees it. */
export function practiceThread(opening, turns, replies) {
  let s = `[customer] ${opening}`;
  turns.forEach((t, i) => { s += `\n[agent, public] ${t}`; if (i < replies.length) s += `\n[customer] ${replies[i]}`; });
  return s;
}

export function mark(errors) {
  if (!errors.length) return 'green';
  if (errors.length >= 2 || errors.some((e) => ERROR_INFO[e.type]?.severe)) return 'red';
  return 'amber';
}

/** Normalize model output: keep known labels only, one entry per label, map "label: text" strings too. */
export function normalizeErrors(raw) {
  const out = [];
  for (const e of raw || []) {
    const s = typeof e === 'string' ? e : String(e?.type || '');
    const type = GRADE_LABELS.find((l) => s.trim().toLowerCase().startsWith(l));
    if (!type || out.some((o) => o.type === type)) continue;
    out.push({ type, label: ERROR_INFO[type].label, quote: typeof e === 'object' ? (e.quote || '') : '', source: typeof e === 'object' ? (e.source || '') : '' });
  }
  return out;
}

/**
 * Grade one trainee reply.
 * pc: practice case {key, requestType, summary, resolution, kbUsed, customer:{opening}}, kb: all KB, sop: all SOPs
 * history: {turns, replies} BEFORE this reply. Returns {mark, errors, good, why}.
 */
export async function gradeReply(pc, kb, sop, history, reply, llm) {
  const prompt = GRADE({
    kb: kbText(pickKb(kb, pc.kbUsed, reply)), sop: sopText(sop), key: pc.key, requestType: pc.requestType, summary: pc.summary,
    thread: practiceThread(pc.customer.opening, history.turns, history.replies), resolution: pc.resolution, kbUsed: JSON.stringify(pc.kbUsed || []), reply,
  });
  let r;
  try { r = await llm.json(GRADE_SYS, prompt, GRADE_SCHEMA); } catch (e) { return { mark: 'none', errors: [], good: '', why: `Grading failed: ${e.message}`, failed: true }; }
  const errors = normalizeErrors(r.errors);
  return { mark: mark(errors), errors, good: r.good || '', why: r.why || '' };
}
