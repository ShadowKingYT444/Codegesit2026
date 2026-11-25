// Regression check: run this repo's engine on the frozen blind-test worlds and score with the frozen scorer.
// usage: SIM_DIR=<validation/sim> node test/run-sim.mjs t01 t02 t03 t04
// then:  python3 $SIM_DIR/harness/score.py t1 forgejs_v1 t01 t02 t03 t04
import fs from 'node:fs';
import { buildCustomerCard, practiceTurn, emptyState } from '../src/engine/customer.js';
import { cliLlm, SIM } from './claude-cli.mjs';
const OUT = process.env.SIM_OUT || 'forgejs_v1';
const llm = cliLlm();
for (const site of process.argv.slice(2)) {
  const W = JSON.parse(fs.readFileSync(`${SIM}/worlds/${site}.json`)); const T = JSON.parse(fs.readFileSync(`${SIM}/worlds/${site}.truth.json`));
  const tk = Object.fromEntries(W.tickets.map((t) => [t.key, t]));
  const res = {};
  await Promise.all(T.t1_scripts.map(async (s) => {
    try {
      const c = await buildCustomerCard(tk[s.ticket], llm); let st = emptyState();
      for (const turn of s.turns) st = (await practiceTurn(c, st, turn.trainee, llm)).state; // only trainee text is read from the truth file
      res[s.id] = st.replies;
    } catch (e) { res[s.id] = s.turns.map(() => 'CRASH ' + e.message); }
  }));
  fs.mkdirSync(`${SIM}/results/t1_${OUT}`, { recursive: true });
  fs.writeFileSync(`${SIM}/results/t1_${OUT}/${site}.json`, JSON.stringify(res, null, 1)); console.log('done', site);
}
