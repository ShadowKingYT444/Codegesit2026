// Local model adapter for offline evals: runs prompts through the `claude` CLI (Sonnet) with a disk cache.
// Not used by the Forge app. The blind test used the same adapter, so cached prompts replay exactly.
import fs from 'node:fs'; import { spawn } from 'node:child_process'; import crypto from 'node:crypto';
import { textLlm } from '../src/engine/llm.js';
const CACHE = process.env.RIDE_ALONG_CACHE || new URL('./.cache/llm', import.meta.url).pathname;
fs.mkdirSync(CACHE, { recursive: true });
let running = 0; const waiters = []; const MAX = Number(process.env.LLM_PARALLEL || 8);
const slot = () => new Promise((r) => { if (running < MAX) { running++; r(); } else waiters.push(r); });
const release = () => { const w = waiters.shift(); if (w) w(); else running--; };
export const cliChat = async (prompt, system) => {
  const fp = `${CACHE}/${crypto.createHash('sha256').update(system + '\0' + prompt).digest('hex').slice(0, 24)}.txt`;
  if (fs.existsSync(fp)) return fs.readFileSync(fp, 'utf8');
  await slot();
  try {
    return await new Promise((res, rej) => {
      const p = spawn('claude', ['-p', '--model', 'sonnet', '--output-format', 'json', '--system-prompt', system, '--tools', ''], { cwd: '/tmp' });
      let out = ''; p.stdout.on('data', (d) => (out += d));
      p.on('close', () => { try { const t = JSON.parse(out).result; fs.writeFileSync(fp, t); res(t); } catch { rej(new Error('llm: ' + out.slice(-300))); } });
      p.stdin.end(prompt);
    });
  } finally { release(); }
};
export const cliLlm = () => textLlm(cliChat);
export const SIM = process.env.SIM_DIR || '/mnt/project-files/codegeist/validation/sim';
