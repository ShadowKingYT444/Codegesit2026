// Step 0: replace personal data with consistent fake values before anyone practises.
// Regex finds emails, phone numbers and IP addresses. One model pass finds names, addresses and company
// names in free text. Known author names from Jira are added too.
// Technical tokens (error codes, versions, product names, reference numbers) stay, because the practice needs them.
// A value that also appears in the team's own KB or SOP pages is shared team knowledge, not personal data,
// so it stays too: otherwise the cleaned ticket and the uncleaned KB would no longer match.
import { PII, PII_SCHEMA, PII_SYS } from './prompts.js';

const FIRST = ['Dana', 'Alex', 'Jordan', 'Sam', 'Robin', 'Taylor', 'Casey', 'Morgan', 'Jamie', 'Avery', 'Riley', 'Quinn', 'Rowan', 'Elliot', 'Noor', 'Kai', 'Imani', 'Mateo', 'Lena', 'Tomas', 'Aiko', 'Ravi', 'Sofia', 'Yusuf'];
const LAST = ['Ortiz', 'Lindqvist', 'Okafor', 'Brennan', 'Marsh', 'Tanaka', 'Haddad', 'Novak', 'Castillo', 'Weber', 'Achebe', 'Moreau', 'Kowalski', 'Iyer', 'Duarte', 'Fischer', 'Nakamura', 'Owens', 'Reyes', 'Sato'];
const COMPANY = ['Northwind Traders', 'Bluefin Partners', 'Kestrel Group', 'Harbor & Vale', 'Ironleaf Ltd', 'Quayside Foods', 'Tallow Analytics', 'Granite Peak Co'];
const PLACE = ['Hotel Arcadia', 'Riverside Inn', 'Park Plaza Suites', 'The Linden Lodge', 'Harborview Hotel', 'Maple Court'];
const STREET = ['14 Elm Row', '220 Station Road', '7 Quarry Lane', '91 Canal Street', '3 Orchard Close'];

function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function regexFinds(text) {
  const out = [];
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) out.push({ value: m[0], type: 'email' });
  for (const m of text.matchAll(/(?<![\w.])\+?\d[\d ().-]{7,}\d(?![\w.])/g)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15 && !/^\d{4}-\d\d-\d\d/.test(m[0]) && !/^[\d.]+$/.test(m[0])) out.push({ value: m[0].trim(), type: 'phone' });
  }
  for (const m of text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) out.push({ value: m[0], type: 'ip' });
  return out;
}

/** Build a consistent real -> fake map. A person's first name alone also maps to the fake first name. */
export function buildMap(items, { keep = [] } = {}) {
  const map = new Map();
  const used = new Set();
  const keepLc = new Set(keep.map((k) => k.toLowerCase()));
  const pick = (list, seed) => { for (let i = 0; i < list.length; i++) { const v = list[(seed + i) % list.length]; if (!used.has(v)) { used.add(v); return v; } } return `${list[seed % list.length]} ${used.size}`; };
  const sameShape = (v, seed) => v.replace(/\d/g, (d, i) => String((Number(d) + 3 + ((seed >>> (i % 16)) & 7)) % 10)).replace(/[a-z]/g, (c, i) => String.fromCharCode(97 + ((c.charCodeAt(0) - 97 + 5 + (seed % 7) + i) % 26)));
  let ipN = 0, phoneN = 0, ticketN = 0;
  // people first, so emails can reuse fake names
  const order = { person: 0, company: 1, place: 1, address: 1 };
  const sorted = [...items].sort((a, b) => (order[a.type] ?? 2) - (order[b.type] ?? 2));
  // A fake value must never be one of the real values (a real "Jordan" must not appear as someone's fake name).
  for (const { value } of items) for (const w of String(value || '').split(/\s+/)) used.add(w);
  for (const { value, type } of sorted) {
    const v = String(value || '').trim();
    if (v.length < 2 || map.has(v) || keepLc.has(v.toLowerCase())) continue;
    const seed = hash(v);
    let fake;
    if (type === 'person') {
      const parts = v.split(/\s+/);
      const f = pick(FIRST, seed); let l = LAST[(seed >>> 8) % LAST.length]; for (let i = 1; used.has(l) && i < LAST.length; i++) l = LAST[((seed >>> 8) + i) % LAST.length];
      fake = parts.length > 1 ? `${f} ${l}` : f;
      if (parts.length > 1 && parts[0].length > 2 && !map.has(parts[0]) && !keepLc.has(parts[0].toLowerCase())) map.set(parts[0], f);
      if (parts.length > 1 && parts.at(-1).length > 2 && !map.has(parts.at(-1)) && !keepLc.has(parts.at(-1).toLowerCase())) map.set(parts.at(-1), l);
    } else if (type === 'email') {
      const local = v.split('@')[0].toLowerCase();
      const person = [...map.entries()].find(([real, f]) => /\s/.test(f) && local.includes(real.split(/\s+/)[0].toLowerCase()));
      fake = person ? `${person[1].toLowerCase().replace(/\s+/g, '.')}@example.com` : `contact${map.size + 1}@example.com`;
    } else if (type === 'phone') fake = `+1 555 01${String(10 + (phoneN++ % 90))}`;
    else if (type === 'ip') fake = `10.20.${30 + Math.floor(ipN / 200)}.${10 + (ipN++ % 200)}`;
    else if (type === 'ticket') fake = `REF-${1000 + (++ticketN)}`;
    else if (type === 'company') fake = pick(COMPANY, seed);
    else if (type === 'place') fake = pick(PLACE, seed);
    else if (type === 'address') fake = pick(STREET, seed);
    else fake = sameShape(v, seed);
    if (fake.toLowerCase() === v.toLowerCase()) fake = sameShape(v, seed + 1);
    map.set(v, fake);
  }
  return map;
}

export function applyMap(text, map) {
  if (!text || !map.size) return text;
  // Longest first. Names match case-sensitively ("Mark" the agent, not "mark as done");
  // emails and codes match in any case. Placeholders stop a fake value from being replaced again.
  const keys = [...map.keys()].sort((a, b) => b.length - a.length);
  const fakes = [];
  let out = text;
  for (const k of keys) {
    const ci = /[@\d]/.test(k) || k === k.toUpperCase();
    const re = new RegExp(`(?<![A-Za-z0-9])${esc(k)}(?![A-Za-z0-9])`, ci ? 'gi' : 'g');
    out = out.replace(re, () => { fakes.push(map.get(k)); return `\u0000${fakes.length - 1}\u0000`; });
  }
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => fakes[Number(i)]);
}

/**
 * Clean a ticket. Returns {ticket: cleaned copy, map: [[real, fake], ...]}.
 * keep: values that must stay (product names, KB titles, system names the lead lists).
 * shared: the text of the team's KB and SOP pages; a found value that also appears there stays.
 * Known Jira author names are always replaced, even when a KB page names them.
 */
export async function cleanTicket(t, llm, { keep = [], shared = '' } = {}) {
  const texts = [t.summary || '', ...t.thread.map((m) => m.body), t.resolution || ''];
  const all = texts.join('\n\n');
  const inShared = (v) => !!shared && new RegExp(`(?<![A-Za-z0-9])${esc(v)}(?![A-Za-z0-9])`, 'i').test(shared);
  const items = regexFinds(all).filter((it) => !inShared(it.value));
  const names = new Set([t.customer?.name, ...t.thread.map((m) => m.author)].filter(Boolean));
  for (const n of names) items.push({ value: n, type: 'person' });
  try {
    const r = await llm.json(PII_SYS, PII(all), PII_SCHEMA);
    for (const it of r.items || []) {
      if (!it?.value || !all.includes(it.value) || inShared(it.value)) continue;
      items.push({ value: it.value, type: it.type === 'employee_id' || it.type === 'username' ? 'id' : it.type });
    }
  } catch { /* regex and known names still apply; the lead preview is the second check */ }
  const map = buildMap(items, { keep });
  const A = (s) => applyMap(s, map);
  const cleaned = {
    ...t,
    summary: A(t.summary),
    resolution: A(t.resolution),
    customer: { ...(t.customer || {}), name: A(t.customer?.name || 'Customer') },
    thread: t.thread.map((m) => ({ ...m, author: A(m.author || ''), body: A(m.body) })),
  };
  return { ticket: cleaned, map: [...map.entries()] };
}
