// Build one practice case from a canonical ticket: clean it (step 0), build the customer card (steps 1-2), keep a debrief copy.
import { cleanTicket } from './pii.js';
import { buildCustomerCard } from './customer.js';
import { practiceValue } from './scoring.js';

/**
 * t: canonical ticket {key, request_type, summary, customer, thread, resolution, kb_used}
 * Returns {pc, piiMap}. pc is safe to store: it holds only cleaned text.
 */
export async function buildPracticeCase(t, llm, { keep = [], keepIds = [], allowSensitive = false, sensitive = [] } = {}) {
  const value = practiceValue(t, { allowSensitive, sensitive });
  const { ticket: c, map } = await cleanTicket(t, llm, { keep, keepIds });
  const customer = await buildCustomerCard(c, llm);
  const pc = {
    key: c.key,
    requestType: c.request_type || 'General',
    summary: c.summary || '',
    resolution: c.resolution || '',
    kbUsed: c.kb_used || [],
    customer,
    debrief: c.thread.map((m) => ({ from: m.from, author: m.author || (m.from === 'customer' ? 'Customer' : 'Agent'), public: m.public !== false, body: m.body })),
    value,
  };
  return { pc, piiMap: map };
}

/** For the debrief: the turn (1-based) at which each fact came out in a run, or null. */
export function factTimeline(pc, turnsReleased) {
  const at = {};
  turnsReleased.forEach((rel, i) => { for (const id of rel || []) if (!(id in at)) at[id] = i + 1; });
  return pc.customer.facts.map((f) => ({ id: f.id, detail: f.detail, asked_by: f.asked_by, kind: f.kind, turn: at[f.id] ?? null }));
}
