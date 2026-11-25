// Read solved Jira Service Management requests and turn each into a canonical ticket:
//   {key, request_type, summary, created, customer:{name}, thread:[{from, author, public, body, date}], resolution, kb_used}
// Customer messages are the description and comments by the reporter. Internal comments come from the
// servicedeskapi "public" flag. Seeded demo data may mark lines with [customer] or [resolution] (see scripts/seed-demo-site.mjs).
import { adfToText, cleanText } from './adf.js';

const CUSTOMER_TAG = /^\s*\[customer\]\s*/i;
const RESOLUTION_TAG = /^\s*(\[resolution\]|resolution:)\s*/i;

/** requester: a function (path, opts) -> fetch Response, e.g. (p, o) => api.asApp().requestJira(route`...`, o). */
export function makeJsm(request) {
  const getJson = async (path, opts) => {
    const r = await request(path, opts);
    if (!r.ok) throw new Error(`Jira ${r.status} on ${path.split('?')[0]}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };

  return {
    /** Issue keys for a JQL query, newest first, up to max. */
    async searchKeys(jql, max = 30) {
      const keys = [];
      let nextPageToken;
      while (keys.length < max) {
        const body = { jql, maxResults: Math.min(100, max - keys.length), fields: ['summary'], ...(nextPageToken ? { nextPageToken } : {}) };
        const r = await getJson('/rest/api/3/search/jql', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
        for (const i of r.issues || []) keys.push({ key: i.key, summary: i.fields?.summary || '' });
        if (!r.nextPageToken || !(r.issues || []).length) break;
        nextPageToken = r.nextPageToken;
      }
      return keys.slice(0, max);
    },

    async loadTicket(key) {
      const issue = await getJson(`/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,resolution,reporter,created,status`);
      let req = null;
      try { req = await getJson(`/rest/servicedeskapi/request/${encodeURIComponent(key)}?expand=requestType`); } catch { /* not a JSM request */ }
      const comments = [];
      for (let start = 0; ; start += 100) {
        const page = await getJson(`/rest/servicedeskapi/request/${encodeURIComponent(key)}/comment?public=true&internal=true&start=${start}&limit=100`).catch(() => ({ values: [], isLastPage: true }));
        comments.push(...(page.values || []));
        if (page.isLastPage !== false || !(page.values || []).length) break;
      }
      let links = [];
      try { links = await getJson(`/rest/api/3/issue/${encodeURIComponent(key)}/remotelink`); } catch { links = []; }
      return toTicket({ issue, req, comments, links });
    },
  };
}

/** Pure conversion, kept separate so it is unit-tested with recorded API shapes. */
export function toTicket({ issue, req, comments, links }) {
  const f = issue.fields || {};
  const reporterId = req?.reporter?.accountId || f.reporter?.accountId;
  const reporterName = req?.reporter?.displayName || f.reporter?.displayName || 'Customer';
  const thread = [];
  const opening = cleanText(adfToText(f.description)) || cleanText(f.summary);
  thread.push({ from: 'customer', author: reporterName, public: true, body: opening, date: f.created });
  let resolutionNote = '';
  const textOf = (c) => cleanText(typeof c.body === 'string' ? c.body : adfToText(c.body));
  // Seeded demo data is posted by one account, so it marks customer lines with [customer]. When any line is tagged,
  // only tagged lines count as the customer's.
  const tagMode = comments.some((c) => CUSTOMER_TAG.test(textOf(c)));
  for (const c of comments) {
    let body = textOf(c);
    if (!body) continue;
    if (RESOLUTION_TAG.test(body)) { resolutionNote = body.replace(RESOLUTION_TAG, ''); if (c.public === false) continue; }
    const tagged = CUSTOMER_TAG.test(body);
    if (tagged) body = body.replace(CUSTOMER_TAG, '');
    const isCustomer = tagMode ? tagged : !!(c.author?.accountId && c.author.accountId === reporterId && c.public !== false);
    thread.push({ from: isCustomer ? 'customer' : 'agent', author: isCustomer ? reporterName : (c.author?.displayName || 'Agent'), public: c.public !== false, body, date: c.created?.iso8601 || c.created });
  }
  const agentMsgs = thread.filter((m) => m.from === 'agent');
  const resolutionName = f.resolution?.name || '';
  const fallback = agentMsgs.slice(-2).map((m) => m.body).join(' ');
  const resolution = cleanText(resolutionNote || [resolutionName && resolutionName !== 'Done' ? `${resolutionName}.` : '', fallback].filter(Boolean).join(' '));
  const kb_used = (links || []).map((l) => (l.object?.url || '').match(/\/pages\/(\d+)/)?.[1]).filter(Boolean).map((id) => `PAGE-${id}`);
  return {
    key: issue.key,
    request_type: req?.requestType?.name || f.issuetype?.name || 'General',
    summary: cleanText(f.summary),
    created: f.created,
    customer: { name: reporterName },
    thread,
    resolution,
    kb_used: [...new Set(kb_used)],
  };
}
