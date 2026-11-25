// Flow 1: score each solved ticket for practice value, with no AI.
export const DEFAULT_SENSITIVE = /\b(hr|human resources|payroll|grievance|harass\w*|disciplin\w*|security incident|phish\w*|breach|legal|lawsuit|subpoena|medical|health|termination|leaver)\b/i;

/**
 * t: canonical ticket. Returns {score 0..100, usable, reasons[]}.
 * Rules from the spec: at least 2 customer turns, a clear resolution, a linked KB article, no sensitive request types.
 */
export function practiceValue(t, { allowSensitive = false, sensitive = [] } = {}) {
  const reasons = [];
  const cust = t.thread.filter((m) => m.from === 'customer');
  const agent = t.thread.filter((m) => m.from === 'agent');
  let score = 0;
  const custTurns = cust.length;
  if (custTurns >= 2) { score += 35; reasons.push(`${custTurns} customer messages`); } else reasons.push('only one customer message: nothing to discover');
  if (custTurns >= 3) score += 10;
  const res = (t.resolution || '').trim();
  if (res.length >= 25) { score += 25; reasons.push('clear resolution'); } else reasons.push('no clear resolution');
  if ((t.kb_used || []).length) { score += 15; reasons.push('linked KB article'); } else reasons.push('no linked KB article');
  if (agent.some((m) => m.public === false)) { score += 5; reasons.push('has internal notes for the debrief'); }
  const openLen = (cust[0]?.body || '').length;
  if (openLen > 40 && openLen < 1500) score += 10; else reasons.push('opening message too short or too long');
  const rt = `${t.request_type || ''} ${t.summary || ''}`;
  const extra = sensitive.filter(Boolean).some((s) => rt.toLowerCase().includes(String(s).toLowerCase()));
  const isSensitive = DEFAULT_SENSITIVE.test(rt) || extra;
  if (isSensitive) reasons.push(allowSensitive ? 'sensitive type (allowed by lead)' : 'sensitive request type: excluded by default');
  const usable = custTurns >= 2 && res.length >= 25 && (!isSensitive || allowSensitive);
  return { score: Math.min(100, score), usable, sensitive: isSensitive, reasons };
}
