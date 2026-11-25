#!/usr/bin/env node
// Optional: copy a demo pack into a real JSM project and Confluence space, so the demo shows the
// "from your own tickets" path end to end (JQL import, internal notes, KB links, SOP pages).
//
// Run it on YOUR computer against YOUR demo site. It uses your own Atlassian API token from environment
// variables; nothing is sent anywhere else.
//
//   export ATLASSIAN_SITE=your-site.atlassian.net
//   export ATLASSIAN_EMAIL=you@example.com
//   export ATLASSIAN_API_TOKEN=...            # from id.atlassian.com > Security > API tokens
//   node scripts/seed-demo-site.mjs --project ITSD --space KB --pack it [--dry-run]
//
// What it creates:
//   - one Confluence page per KB article in --space, and one page per SOP with the label "sop"
//   - one JSM request per pack ticket in --project, labelled ride-along-demo, with:
//       customer follow-ups as public comments starting "[customer]" (Ride-Along reads these as customer messages,
//       because one API token can only post as one person), agent replies as public comments,
//       internal notes as internal comments, and the resolution as an internal "[resolution]" comment
//   - a remote link from each request to its KB pages, then a move to a Done-like status if one exists
// Then build a track in Ride-Along with:  project = ITSD AND labels = ride-along-demo
import { PACKS } from '../src/demo/packs.js';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true] : null)).filter(Boolean));
const { ATLASSIAN_SITE: SITE, ATLASSIAN_EMAIL: EMAIL, ATLASSIAN_API_TOKEN: TOKEN } = process.env;
const DRY = !!args['dry-run'];
if (!args.project || !args.space) { console.error('usage: node scripts/seed-demo-site.mjs --project KEY --space KEY [--pack it|saas|retail] [--dry-run]'); process.exit(2); }
if (!DRY && (!SITE || !EMAIL || !TOKEN)) { console.error('Set ATLASSIAN_SITE, ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN first.'); process.exit(2); }
const pack = PACKS.find((p) => p.id === (args.pack || 'it'));
if (!pack) { console.error(`Unknown pack. Choose: ${PACKS.map((p) => p.id).join(', ')}`); process.exit(2); }

const auth = 'Basic ' + Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
async function api(method, path, body) {
  if (DRY) { console.log(`[dry-run] ${method} ${path}`); return { id: '0', key: 'DRY-1', values: [], _links: {} }; }
  const r = await fetch(`https://${SITE}${path}`, { method, headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}
const html = (s) => s.split('\n').map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('');

// 1. Confluence pages
const space = (await api('GET', `/wiki/api/v2/spaces?keys=${encodeURIComponent(args.space)}`)).results?.[0];
if (!DRY && !space) throw new Error(`Confluence space ${args.space} not found`);
const pageIdOf = {};
for (const doc of [...pack.kb, ...pack.sop]) {
  const p = await api('POST', '/wiki/api/v2/pages', { spaceId: space?.id, status: 'current', title: `${doc.id}: ${doc.title}`, body: { representation: 'storage', value: html(doc.body) } });
  pageIdOf[doc.id] = p.id;
  if (doc.id.startsWith('SOP')) await api('POST', `/wiki/rest/api/content/${p.id}/label`, [{ prefix: 'global', name: 'sop' }]);
  console.log(`page ${doc.id} -> ${p.id}`);
}

// 2. Service desk and request types
const desks = (await api('GET', '/rest/servicedeskapi/servicedesk?limit=100')).values || [];
const desk = desks.find((d) => d.projectKey === args.project);
if (!DRY && !desk) throw new Error(`No service desk for project ${args.project}`);
const types = desk ? (await api('GET', `/rest/servicedeskapi/servicedesk/${desk.id}/requesttype?limit=100`)).values || [] : [];
const typeFor = (name) => types.find((t) => t.name.toLowerCase() === name.toLowerCase()) || types.find((t) => name.toLowerCase().includes(t.name.toLowerCase().split(' ')[0])) || types[0];

// 3. Requests
for (const t of pack.tickets) {
  const rt = typeFor(t.request_type);
  const [first, ...rest] = t.thread;
  const req = await api('POST', '/rest/servicedeskapi/request', { serviceDeskId: desk?.id, requestTypeId: rt?.id, requestFieldValues: { summary: t.summary, description: first.body } });
  const key = req.issueKey || req.key;
  await api('PUT', `/rest/api/3/issue/${key}`, { update: { labels: [{ add: 'ride-along-demo' }] } });
  for (const m of rest) {
    const body = m.from === 'customer' ? `[customer] ${m.body}` : m.body;
    await api('POST', `/rest/servicedeskapi/request/${key}/comment`, { body, public: m.public !== false });
  }
  await api('POST', `/rest/servicedeskapi/request/${key}/comment`, { body: `[resolution] ${t.resolution}`, public: false });
  for (const kb of t.kb_used || []) {
    if (pageIdOf[kb]) await api('POST', `/rest/api/3/issue/${key}/remotelink`, { object: { url: `https://${SITE}/wiki/spaces/${args.space}/pages/${pageIdOf[kb]}`, title: kb } });
  }
  try {
    const tr = (await api('GET', `/rest/api/3/issue/${key}/transitions`)).transitions || [];
    const done = tr.find((x) => /resolve|done|close|complete/i.test(x.name));
    if (done) await api('POST', `/rest/api/3/issue/${key}/transitions`, { transition: { id: done.id } });
  } catch (e) { console.warn(`could not resolve ${key}: ${e.message}`); }
  console.log(`request ${t.key} -> ${key}`);
}
console.log(`Done. In Ride-Along, build a track with: project = ${args.project} AND labels = ride-along-demo`);
console.log(`Then set the KB space key to ${args.space} in Ride-Along settings.`);
