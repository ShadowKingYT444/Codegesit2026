// Token tools with no AI. Same rules as the blind test harness (validation/sim/harness/common.py).
// A "distinctive token" is a word that a customer could not guess: it has digits, inner punctuation,
// mixed case, or it is an all-caps code that is not a common acronym.
const STOP_CAPS = new Set(['KB', 'SOP', 'IT', 'HR', 'OK', 'PM', 'AM', 'US', 'UK', 'EU', 'VPN', 'PDF', 'API', 'SSO', 'MFA', 'ID', 'FAQ', 'ETA', 'ASAP', 'USB', 'PC', 'IP', 'URL', 'CEO', 'CFO']);

export function dtokens(text) {
  const out = new Set();
  for (let w of (text || '').match(/[A-Za-z0-9][A-Za-z0-9\-_./:#@]*[A-Za-z0-9]/g) || []) {
    w = w.replace(/^[.:/#@\-_]+|[.:/#@\-_]+$/g, '');
    if (w.length < 3) continue;
    const distinct = /\d/.test(w)
      || /[a-z][\-_./:][a-z0-9]|[a-z0-9][\-_./:][a-z]/i.test(w)
      || /[a-z][A-Z]/.test(w)
      || (w === w.toUpperCase() && /[A-Z]{3,}/.test(w) && !STOP_CAPS.has(w));
    if (!distinct) continue;
    if (/^\d{1,2}(:\d\d)?$/.test(w) || /^\d{4}-\d\d-\d\d/.test(w) || /^\d{1,3}$/.test(w)) continue;
    out.add(w);
  }
  return out;
}

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ');

/** True when text contains the token, ignoring case and spaces. */
export function hasTok(text, tok) {
  const t = norm(text), k = norm(tok);
  return t.includes(k) || t.replace(/ /g, '').includes(k.replace(/ /g, ''));
}

/** Read the first JSON object in a model reply (a fenced block or bare braces). */
export function parseJson(text) {
  const m = String(text).match(/```(?:json)?\s*([\s\S]*?)```/);
  const t = m ? m[1] : String(text);
  const i = t.indexOf('{');
  if (i < 0) throw new Error('no JSON object in model output');
  try {
    return JSON.parse(t.slice(i, t.lastIndexOf('}') + 1));
  } catch (e) {
    // Fallback: the first balanced object (the model added text or a second object after it).
    let depth = 0, str = false, esc = false;
    for (let j = i; j < t.length; j++) {
      const ch = t[j];
      if (str) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') str = false; continue; }
      if (ch === '"') str = true;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) return JSON.parse(t.slice(i, j + 1));
    }
    throw e;
  }
}

export const customerMessages = (t) => t.thread.filter((m) => m.from === 'customer');

/** Tokens that only the agent side knows: agent replies, internal notes and the resolution, minus anything the customer wrote. */
export function secretTokens(t) {
  const cust = customerMessages(t).map((m) => m.body).join(' ').toLowerCase();
  const agent = t.thread.filter((m) => m.from === 'agent').map((m) => m.body).join(' ') + ' ' + (t.resolution || '');
  return new Set([...dtokens(agent)].filter((x) => !cust.includes(x.toLowerCase())));
}
