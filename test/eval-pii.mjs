// Step 0 check: after cleaning, are the people's names gone, and are the technical tokens kept?
// Names come from the worlds' structured data (customer name, message authors), which the cleaner is also given,
// plus any full names the world's text mentions that the model must find on its own (not given): reported separately.
// usage: node test/eval-pii.mjs dev01 dev02 t01 t02 t03 t04
import fs from 'node:fs';
import { cleanTicket } from '../src/engine/pii.js';
import { dtokens } from '../src/engine/tokens.js';
import { cliLlm, SIM } from './claude-cli.mjs';
const llm = cliLlm();
const S = { tickets: 0, givenNames: 0, givenLeft: 0, techTokens: 0, techKept: 0, emails: 0, emailsLeft: 0 };
const leftovers = [];
for (const site of process.argv.slice(2)) {
  const W = JSON.parse(fs.readFileSync(`${SIM}/worlds/${site}.json`));
  await Promise.all(W.tickets.map(async (t) => {
    const { ticket } = await cleanTicket(t, llm, { shared: [...W.kb, ...W.sop].map((d) => `${d.id} ${d.title}\n${d.body}`).join('\n') });
    const before = [t.summary, ...t.thread.map((m) => m.body), t.resolution].join('\n');
    const after = [ticket.summary, ...ticket.thread.map((m) => `${m.author} ${m.body}`), ticket.resolution].join('\n');
    S.tickets++;
    const names = new Set([t.customer?.name, ...t.thread.map((m) => m.author)].filter(Boolean).flatMap((n) => n.split(/\s+/)).filter((w) => w.length > 2));
    for (const n of names) { if (!new RegExp(`\\b${n}\\b`).test(before + t.thread.map((m) => m.author).join(' '))) continue; S.givenNames++; if (new RegExp(`\\b${n}\\b`).test(after)) { S.givenLeft++; leftovers.push(`${site} ${t.key}: name "${n}"`); } }
    for (const e of before.match(/[\w.+-]+@[\w.-]+\.\w+/g) || []) { S.emails++; if (after.includes(e)) S.emailsLeft++; }
    const tech = [...dtokens(before)].filter((x) => !/@/.test(x) && ![...names].some((n) => x.includes(n)));
    for (const x of tech) { S.techTokens++; if (after.includes(x)) S.techKept++; }
  }));
}
const summary = { ...S, namesRemoved: +(100 * (1 - S.givenLeft / Math.max(1, S.givenNames))).toFixed(1), techKept: +(100 * S.techKept / Math.max(1, S.techTokens)).toFixed(1), leftovers };
console.log(JSON.stringify(summary, null, 1));
fs.mkdirSync(new URL('./results', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./results/eval-pii.json', import.meta.url), JSON.stringify(summary, null, 1));
