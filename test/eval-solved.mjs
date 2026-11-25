// Step 6 check: does the solved check accept the real fix and reject other messages?
// For each ticket in the blind-test worlds:
//   positive  = the real agent's customer-facing fix message (the public agent message closest to the resolution)
//   negative1 = the first public agent message of the same ticket when it has no fix in it (usually questions)
//   negative2 = the fix message of another ticket in the same world (a plausible but wrong fix)
// The positive and negative2 see the real public thread before the fix message as the practice conversation,
// because in a practice run the check sees the earlier turns (identity checks, approvals) too.
// negative1 sees an empty conversation, as a first reply does.
// usage: node test/eval-solved.mjs dev01 dev02 t01 t02 t03 t04
import fs from 'node:fs';
import { solvedCheck } from '../src/engine/solved.js';
import { BM25 } from '../src/engine/bm25.js';
import { cliLlm, SIM } from './claude-cli.mjs';
const llm = cliLlm();
const rows = [];
// The real public thread up to (not including) the fix message, in the practice-state shape.
const priorState = (t, fixBody) => {
  const st = { given: [], turns: [], replies: [] };
  for (const m of t.thread.slice(1)) {
    if (m.public === false) continue;
    if (m.from === 'agent' && m.body === fixBody) break;
    if (m.from === 'agent') { if (st.turns.length > st.replies.length) st.turns[st.turns.length - 1] += `\n${m.body}`; else st.turns.push(m.body); }
    else if (st.turns.length > st.replies.length) st.replies.push(m.body);
    else if (st.replies.length) st.replies[st.replies.length - 1] += `\n${m.body}`;
  }
  return st;
};
for (const site of process.argv.slice(2)) {
  const W = JSON.parse(fs.readFileSync(`${SIM}/worlds/${site}.json`));
  const fixOf = (t) => {
    const pub = t.thread.filter((m) => m.from === 'agent' && m.public !== false);
    const idx = new BM25(Object.fromEntries(pub.map((m, i) => [String(i), m.body])));
    const best = idx.search(t.resolution, 1)[0];
    return best == null ? null : { i: Number(best), body: pub[Number(best)].body, pub };
  };
  W.tickets.forEach((t, k) => {
    const pc = { key: t.key, summary: t.summary, resolution: t.resolution, kbUsed: t.kb_used || [], customer: { opening: t.thread[0].body } };
    const fx = fixOf(t); if (!fx) return;
    const prior = priorState(t, fx.body);
    rows.push({ site, key: t.key, kind: 'real fix', want: 'solved', pc, kb: W.kb, msg: fx.body, st: prior });
    if (fx.i > 0) rows.push({ site, key: t.key, kind: 'first question', want: 'not_solved', pc, kb: W.kb, msg: fx.pub[0].body, st: { given: [], turns: [], replies: [] } });
    const other = W.tickets[(k + 3) % W.tickets.length]; const ofx = fixOf(other);
    if (ofx && other.request_type !== t.request_type) rows.push({ site, key: t.key, kind: 'other ticket fix', want: 'not_solved', pc, kb: W.kb, msg: ofx.body, st: prior });
  });
}
await Promise.all(rows.map(async (r) => { const c = await solvedCheck(r.pc, r.kb, r.st, r.msg, llm); r.got = c.verdict; r.why = c.why; }));
const ok = (r) => (r.want === 'solved' ? r.got === 'solved' : r.got !== 'solved');
const by = {};
for (const r of rows) { const b = by[r.kind] ||= { n: 0, ok: 0 }; b.n++; b.ok += ok(r); }
const all = rows.filter(ok).length;
const summary = { items: rows.length, accuracy: +(100 * all / rows.length).toFixed(1), byKind: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, `${v.ok}/${v.n}`])), wrong: rows.filter((r) => !ok(r)).map((r) => `${r.site} ${r.key} ${r.kind}: got ${r.got} (${r.why})`) };
console.log(JSON.stringify(summary, null, 1));
fs.mkdirSync(new URL('./results', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./results/eval-solved.json', import.meta.url), JSON.stringify(summary, null, 1));
