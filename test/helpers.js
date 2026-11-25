// Test helpers: a scripted model, an in-process queue and a full service on node:sqlite.
import { DatabaseSync } from 'node:sqlite';
import { sqliteDriver } from '../src/store/db.js';
import { makeRepo } from '../src/store/repo.js';
import { makeSettings, memoryKv } from '../src/store/settings.js';
import { makeService } from '../src/service.js';
import { textLlm } from '../src/engine/llm.js';

/**
 * Scripted model. handlers: {card, select, speak, grade, solved, pii} -> functions(prompt) returning a string.
 * Defaults behave like a sensible model for the Brightwater VPN ticket.
 */
export function fakeLlm(over = {}) {
  const calls = [];
  const h = {
    card: () => JSON.stringify({ persona: 'busy sales manager, polite, not technical', facts: [{ detail: 'on the hotel guest wifi at the hotel', asked_by: 'network', kind: 'fact' }, { detail: 'version 6.1.3', asked_by: 'version', kind: 'fact' }] }),
    select: (p) => {
      const msg = (p.match(/Trainee's new message: "([\s\S]*?)"\n/) || [])[1] || '';
      const rel = [];
      if (/network|wifi|where/i.test(msg) && p.includes('h1:')) rel.push('h1');
      if (/version/i.test(msg) && p.includes('h2:')) rel.push('h2');
      return JSON.stringify({ release: rel, kind: /gateway|try|click|switch/i.test(msg) ? 'fix_proposal' : 'question' });
    },
    speak: (p) => {
      if (p.includes('RESULT OF THE STEP') && p.includes('WORKED')) return 'It works now, thank you!';
      if (p.includes('RESULT OF THE STEP') && p.includes('STILL THERE')) return 'Still the same error, sorry.';
      const fresh = (p.match(/NEW facts you must now give in this reply, with their exact details \(codes, numbers, names copied exactly\): (.*)/) || [])[1] || '';
      return fresh.startsWith('[]') ? "I'm not sure, sorry." : `Sure: ${JSON.parse(fresh).join(', ')}.`;
    },
    grade: (p) => JSON.stringify({ errors: /reinstall/i.test(p.split("TRAINEE'S DRAFT NEXT REPLY:")[1] || '') ? [{ type: 'wrong_fix', quote: 'reinstall', source: 'KB-1: never reinstall first' }] : [], good: 'clear question', why: 'ok' }),
    solved: (p) => JSON.stringify({ verdict: /TCP/i.test(p.split("TRAINEE'S NEW MESSAGE")[1] || '') ? 'solved' : 'not_yet', why: 'test' }),
    pii: () => JSON.stringify({ items: [] }),
    ...over,
  };
  const route = (prompt, system) => {
    let k = 'speak';
    if (prompt.startsWith('Build a knowledge card')) k = 'card';
    else if (prompt.startsWith('You run a customer simulation')) k = 'select';
    else if (prompt.startsWith("Grade a support trainee's")) k = 'grade';
    else if (system.startsWith('You are a strict senior support engineer')) k = 'solved';
    else if (prompt.startsWith('Find personal data')) k = 'pii';
    calls.push({ k, prompt });
    return h[k](prompt);
  };
  const llm = textLlm(async (prompt, system) => route(prompt, system));
  llm.calls = calls;
  return llm;
}

/** A whole app: service + repo on in-memory sqlite. Queued jobs run when drain() is called. */
export async function testApp({ leads = ['lead-1'], llm = fakeLlm(), names = {} } = {}) {
  const repo = makeRepo(sqliteDriver(DatabaseSync));
  await repo.migrate();
  const kv = memoryKv();
  const settings = makeSettings(kv);
  const jobs = [];
  const svc = makeService({
    repo, settings, llmFor: () => llm,
    jsmApp: null, jsmUser: null, confluence: null,
    users: { isLead: async (a) => leads.includes(a), names: async (ids) => Object.fromEntries(ids.map((i) => [i, names[i] || `User ${i}`])), search: async () => [] },
    enqueue: { buildCase: async (ids) => { for (const id of ids) jobs.push(['case', id]); }, runTurn: async (id) => { jobs.push(['turn', id]); } },
  });
  const drain = async () => { while (jobs.length) { const [k, id] = jobs.shift(); if (k === 'case') await svc.buildCase(id); else await svc.processTurn(id); } };
  return { svc, repo, kv, settings, llm, drain, jobs };
}
