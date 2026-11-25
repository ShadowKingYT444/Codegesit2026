// Read KB articles and SOP pages from Confluence. Page ids become KB ids of the form PAGE-<id>.
import { storageToText } from './adf.js';

export function makeConfluence(request) {
  const getJson = async (path) => {
    const r = await request(path, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`Confluence ${r.status} on ${path.split('?')[0]}`);
    return r.json();
  };
  const page = async (id) => {
    const p = await getJson(`/wiki/api/v2/pages/${encodeURIComponent(id)}?body-format=storage`);
    return { id: `PAGE-${p.id}`, title: p.title, body: storageToText(p.body?.storage?.value).slice(0, 6000) };
  };
  const cqlIds = async (cql, limit) => {
    const r = await getJson(`/wiki/rest/api/search?cql=${encodeURIComponent(cql)}&limit=${limit}`);
    return (r.results || []).map((x) => ({ id: x.content?.id, title: x.content?.title || x.title, excerpt: storageToText(x.excerpt || '') })).filter((x) => x.id);
  };
  const quote = (s) => String(s).replace(/["\\]/g, ' ');
  return {
    page,
    async pages(ids) { const out = []; for (const id of ids) { try { out.push(await page(String(id).replace(/^PAGE-/, ''))); } catch { /* page gone or no access */ } } return out; },
    async sops({ label = 'sop', spaceKey = '' } = {}) {
      const ids = await cqlIds(`type=page AND label="${quote(label)}"${spaceKey ? ` AND space="${quote(spaceKey)}"` : ''}`, 25);
      return this.pages(ids.map((x) => x.id));
    },
    /** KB search: [{id, title, excerpt}] (no bodies). */
    async search(text, { spaceKey = '', limit = 5 } = {}) {
      const words = String(text).replace(/[^\p{L}\p{N}\s.-]/gu, ' ').trim().split(/\s+/).slice(0, 12).join(' ');
      if (!words) return [];
      const ids = await cqlIds(`type=page AND siteSearch ~ "${quote(words)}"${spaceKey ? ` AND space="${quote(spaceKey)}"` : ''}`, limit);
      return ids.map((x) => ({ id: `PAGE-${x.id}`, title: x.title, excerpt: x.excerpt }));
    },
  };
}
