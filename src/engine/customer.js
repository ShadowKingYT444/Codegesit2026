// The AI customer. Port of the design that scored 96.9% clean turns in the frozen blind test.
// The key rule: the speaking call never receives agent replies, internal notes or the resolution.
// It sees only the persona, the opening message, the facts already earned and the conversation.
import { CARD, CARD_SCHEMA, SELECT, SELECT_SCHEMA, SPEAK, SPEAK_WITH_OUTCOME, SIM_SYS } from './prompts.js';
import { dtokens, hasTok, customerMessages, secretTokens } from './tokens.js';

/**
 * Steps 1 and 2: build the customer side of a practice case, once per ticket.
 * t: a cleaned ticket {key, thread:[{from, body, public}], resolution, customer}
 * Returns the customer card: {opening, persona, facts:[{id, detail, asked_by, kind}], secret:[tokens]}
 */
export async function buildCustomerCard(t, llm) {
  const cust = customerMessages(t);
  if (!cust.length) throw new Error(`${t.key}: no customer messages`);
  const msgs = cust.map((m, i) => `[message ${i + 1}]\n${m.body}`).join('\n\n');
  let card;
  try { card = await llm.json(SIM_SYS, CARD(msgs), CARD_SCHEMA); } catch { card = { persona: t.customer?.role || '', facts: [] }; }
  const facts = (card.facts || []).filter((f) => f && f.detail).map((f, i) => ({ id: `h${i + 1}`, detail: String(f.detail), asked_by: String(f.asked_by || ''), kind: f.kind === 'reaction' ? 'reaction' : 'fact' }));
  const opening = cust[0].body;
  const secret = [...secretTokens(t)].filter((x) => !dtokens(opening).has(x));
  return { opening, persona: card.persona || '', facts, secret };
}

export const convText = (opening, turns, replies) => {
  let s = `CUSTOMER: ${opening}`;
  turns.forEach((tr, n) => { s += `\nTRAINEE: ${tr}`; if (n < replies.length) s += `\nCUSTOMER: ${replies[n]}`; });
  return s;
};

export const emptyState = () => ({ given: [], turns: [], replies: [] });

/** Step 3: decide which facts the trainee's message earns, read literally. Returns {release:[ids], kind}. */
export async function reveal(c, state, traineeMsg, llm) {
  const F = Object.fromEntries(c.facts.map((f) => [f.id, f]));
  const rest = c.facts.filter((f) => !state.given.includes(f.id));
  let release = [], kind = 'other';
  try {
    const r = await llm.json(SIM_SYS, SELECT(rest.map((f) => `${f.id}: ${f.detail} (given when asked: ${f.asked_by})`).join('\n') || '(none)', traineeMsg), SELECT_SCHEMA);
    release = (r.release || []).filter((x) => F[x] && !state.given.includes(x));
    kind = r.kind || 'other';
  } catch { release = []; }
  return { release, kind };
}

/** Steps 4 and 5: speak, then guard with no AI. verdict (optional) is the step 6 result for a fix proposal. */
export async function speak(c, state, traineeMsg, release, llm, verdict) {
  const F = Object.fromEntries(c.facts.map((f) => [f.id, f]));
  const allowed = new Set([...dtokens(c.opening), ...[...state.given, ...release].flatMap((k) => [...dtokens(F[k].detail)])]);
  const hold = c.facts.filter((f) => !state.given.includes(f.id) && !release.includes(f.id)).flatMap((f) => [...dtokens(f.detail)]).filter((x) => !allowed.has(x));
  const bad = new Set([...c.secret, ...hold]);
  const turns = [...state.turns, traineeMsg];
  let p = SPEAK(c.persona, JSON.stringify(state.given.map((k) => F[k].detail)) || '[]',
    release.length ? JSON.stringify(release.map((k) => F[k].detail)) : '[] (none)', convText(c.opening, turns, state.replies));
  if (verdict) p = SPEAK_WITH_OUTCOME(p, verdict);
  const clean = (s) => String(s).trim().replace(/^CUSTOMER:\s*/, '').trim();
  let txt = clean(await llm.text(SIM_SYS, p));
  let hits = [...bad].filter((b) => hasTok(txt, b)).sort();
  let guarded = 'clean';
  if (hits.length) {
    guarded = 'regenerated';
    txt = clean(await llm.text(SIM_SYS, `${p}\n\nDo NOT mention any of these, the customer has not said them: ${JSON.stringify(hits)}`));
    hits = [...bad].filter((b) => hasTok(txt, b));
    if (hits.length) { guarded = 'trimmed'; txt = txt.split(/(?<=[.!?])\s+/).filter((s) => !hits.some((b) => hasTok(s, b))).join(' ') || "Sorry, I'm not sure."; }
  }
  return { reply: txt, guarded, state: { given: [...state.given, ...release], turns, replies: [...state.replies, txt] } };
}

/** One turn exactly as in the frozen blind test (no solved check). Used by `npm run sim`. */
export async function practiceTurn(c, state, traineeMsg, llm) {
  const { release } = await reveal(c, state, traineeMsg, llm);
  const r = await speak(c, state, traineeMsg, release, llm);
  return { reply: r.reply, released: release, state: r.state };
}
