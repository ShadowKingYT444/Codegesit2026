// Wire the Forge platform into the service: Forge SQL, KVS, LLMs, async events and product APIs.
import api, { route, assumeTrustedRoute } from '@forge/api';
import sql, { migrationRunner } from '@forge/sql';
import { kvs } from '@forge/kvs';
import { chat } from '@forge/llm';
import { Queue } from '@forge/events';
import { forgeSqlDriver } from './store/db.js';
import { makeRepo } from './store/repo.js';
import { makeSettings } from './store/settings.js';
import { forgeLlm } from './engine/llm.js';
import { makeJsm } from './jira/jsm.js';
import { makeConfluence } from './jira/confluence.js';
import { makeService } from './service.js';

const caseQueue = new Queue({ key: 'case-builder' });
const turnQueue = new Queue({ key: 'practice-turns' });
const driver = forgeSqlDriver(sql, migrationRunner);

// Paths below are built by our own code from fixed templates plus encoded values, so they are trusted routes.
const jiraAs = (who) => (path, opts) => api[who]().requestJira(assumeTrustedRoute(path), opts);
const confAs = (who) => (path, opts) => api[who]().requestConfluence(assumeTrustedRoute(path), opts);

function makeUsers(settings, { userContext }) {
  const leadCache = new Map();
  return {
    async isLead(accountId) {
      if (!accountId) return false;
      if (leadCache.has(accountId)) return leadCache.get(accountId);
      const { leadGroup } = await settings.get();
      let lead = false;
      try {
        const r = await api.asApp().requestJira(route`/rest/api/3/user/groups?accountId=${accountId}`, { headers: { Accept: 'application/json' } });
        if (r.ok) lead = (await r.json()).some((g) => g.name === leadGroup);
      } catch { /* fall through to the admin check */ }
      if (!lead && userContext) {
        try {
          const r = await api.asUser().requestJira(route`/rest/api/3/mypermissions?permissions=ADMINISTER`, { headers: { Accept: 'application/json' } });
          if (r.ok) lead = !!(await r.json()).permissions?.ADMINISTER?.havePermission;
        } catch { /* not a Jira admin */ }
      }
      leadCache.set(accountId, lead);
      return lead;
    },
    async names(ids) {
      const out = {};
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const qs = chunk.map((a) => `accountId=${encodeURIComponent(a)}`).join('&');
        try {
          const r = await api.asApp().requestJira(assumeTrustedRoute(`/rest/api/3/user/bulk?maxResults=50&${qs}`), { headers: { Accept: 'application/json' } });
          if (r.ok) for (const u of (await r.json()).values || []) out[u.accountId] = u.displayName;
        } catch { /* names are cosmetic */ }
      }
      return out;
    },
    async search(q) {
      const r = await api.asUser().requestJira(route`/rest/api/3/user/search?query=${String(q || '')}&maxResults=10`, { headers: { Accept: 'application/json' } });
      if (!r.ok) return [];
      return (await r.json()).filter((u) => u.accountType === 'atlassian' && u.active !== false).map((u) => ({ accountId: u.accountId, displayName: u.displayName }));
    },
  };
}

/** userContext: true inside a resolver or Rovo action (asUser works), false in consumers and scheduled jobs. */
export async function forgeService({ userContext = false } = {}) {
  const repo = makeRepo(driver);
  await repo.migrate();
  const settings = makeSettings(kvs);
  return makeService({
    repo,
    settings,
    llmFor: (model) => forgeLlm(chat, { model }),
    jsmApp: makeJsm(jiraAs('asApp')),
    jsmUser: userContext ? makeJsm(jiraAs('asUser')) : makeJsm(jiraAs('asApp')),
    confluence: makeConfluence(confAs('asApp')),
    users: makeUsers(settings, { userContext }),
    enqueue: {
      async buildCase(caseIds) {
        for (let i = 0; i < caseIds.length; i += 50) {
          await caseQueue.push(caseIds.slice(i, i + 50).map((caseId) => ({ body: { caseId }, concurrency: { key: 'case-build', limit: 5 } })));
        }
      },
      async runTurn(turnId) { await turnQueue.push({ body: { turnId } }); },
    },
  });
}
