import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTicket, makeJsm } from '../../src/jira/jsm.js';
import { makeConfluence } from '../../src/jira/confluence.js';
import { adfToText, storageToText } from '../../src/jira/adf.js';

const issue = {
  key: 'ITSD-7', fields: {
    summary: 'VPN down', created: '2026-10-01T10:00:00.000+0000', resolution: { name: 'Done' }, reporter: { accountId: 'cust-1', displayName: 'Pat Doe' },
    description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'GlobalProtect says ' }, { type: 'text', text: 'Gateway not responding' }] }] },
  },
};
const req = { requestType: { name: 'VPN / Remote access' }, reporter: { accountId: 'cust-1', displayName: 'Pat Doe' } };
const comments = [
  { body: 'Which network are you on?', public: true, author: { accountId: 'agent-1', displayName: 'Sam Agent' }, created: { iso8601: '2026-10-01T10:05:00+0000' } },
  { body: 'Hotel wifi, version 6.1.3', public: true, author: { accountId: 'cust-1', displayName: 'Pat Doe' } },
  { body: 'gp-portal-eu-01 shows IPSec timeout', public: false, author: { accountId: 'agent-1', displayName: 'Sam Agent' } },
  { body: '[customer] Also my colleague has it too', public: true, author: { accountId: 'agent-1', displayName: 'Sam Agent' } },
  { body: 'Switch to the TCP gateway please', public: true, author: { accountId: 'agent-1', displayName: 'Sam Agent' } },
  { body: '[resolution] Hotel blocked UDP 4501; moved user to TCP gateway per KB.', public: false, author: { accountId: 'agent-1', displayName: 'Sam Agent' } },
];
const links = [{ object: { url: 'https://x.atlassian.net/wiki/spaces/KB/pages/12345/VPN', title: 'VPN' } }, { object: { url: 'https://example.com' } }];

test('toTicket builds the canonical ticket from JSM shapes', () => {
  const t = toTicket({ issue, req, comments, links });
  assert.equal(t.request_type, 'VPN / Remote access');
  assert.equal(t.thread[0].from, 'customer');
  assert.match(t.thread[0].body, /Gateway not responding/);
  assert.deepEqual(t.thread.map((m) => m.from), ['customer', 'agent', 'customer', 'agent', 'customer', 'agent']);
  assert.equal(t.thread[3].public, false);
  assert.equal(t.thread[4].body, 'Also my colleague has it too');
  assert.equal(t.resolution, 'Hotel blocked UDP 4501; moved user to TCP gateway per KB.');
  assert.deepEqual(t.kb_used, ['PAGE-12345']);
});

test('resolution falls back to the last agent comments', () => {
  const t = toTicket({ issue, req, comments: comments.slice(0, 5), links: [] });
  assert.match(t.resolution, /TCP gateway/);
});

test('jsm client pages through JQL search with nextPageToken', async () => {
  const calls = [];
  const pages = [{ issues: [{ key: 'A-1', fields: { summary: 'a' } }], nextPageToken: 't2' }, { issues: [{ key: 'A-2', fields: { summary: 'b' } }] }];
  const request = async (path, opts) => { calls.push([path, opts && JSON.parse(opts.body)]); return { ok: true, json: async () => pages.shift() }; };
  const keys = await makeJsm(request).searchKeys('project = A', 5);
  assert.deepEqual(keys.map((k) => k.key), ['A-1', 'A-2']);
  assert.equal(calls[1][1].nextPageToken, 't2');
});

test('confluence client reads pages and searches with CQL', async () => {
  const request = async (path) => ({ ok: true, json: async () => (path.startsWith('/wiki/api/v2/pages/') ? { id: '9', title: 'SOP: identity', body: { storage: { value: '<p>Verify <b>identity</b></p><ul><li>Call back</li></ul>' } } } : { results: [{ content: { id: '9', title: 'SOP: identity' }, excerpt: 'Verify' }] }) });
  const c = makeConfluence(request);
  const sops = await c.sops({ label: 'sop' });
  assert.equal(sops[0].id, 'PAGE-9');
  assert.match(sops[0].body, /Verify identity\n- Call back/);
  assert.equal((await c.search('vpn gateway'))[0].id, 'PAGE-9');
});

test('adf and storage to text', () => {
  assert.equal(adfToText({ type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] }] }] }).trim(), '- one');
  assert.equal(storageToText('a&amp;b<br/>c'), 'a&b\nc');
});
