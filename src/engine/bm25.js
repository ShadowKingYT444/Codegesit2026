// Small BM25 text search with no AI. Used to pick KB articles for grading and for the trainee's KB search.
const STOP = new Set('the a an and or to of in on for with is are was be it this that you your i we our my me can could would please have has had do does did not no yes if at as by from any what which when how about there their they them so just also get got'.split(' '));
export const terms = (s) => (String(s || '').toLowerCase().match(/[a-z0-9][a-z0-9\-]+/g) || []).filter((w) => !STOP.has(w));

export class BM25 {
  constructor(docs, k1 = 1.4, b = 0.75) { // docs: {id: text}
    this.k1 = k1; this.b = b;
    this.ids = Object.keys(docs);
    this.tf = this.ids.map((id) => { const m = new Map(); for (const w of terms(docs[id])) m.set(w, (m.get(w) || 0) + 1); return m; });
    this.len = this.tf.map((m) => [...m.values()].reduce((a, c) => a + c, 0));
    this.avg = this.len.reduce((a, c) => a + c, 0) / Math.max(1, this.len.length);
    this.df = new Map();
    for (const m of this.tf) for (const w of m.keys()) this.df.set(w, (this.df.get(w) || 0) + 1);
  }
  search(query, n = 5) {
    const N = this.ids.length, q = [...new Set(terms(query))];
    const scored = this.ids.map((id, i) => {
      let s = 0;
      for (const w of q) {
        const f = this.tf[i].get(w); if (!f) continue;
        const idf = Math.log(1 + (N - this.df.get(w) + 0.5) / (this.df.get(w) + 0.5));
        s += idf * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * this.len[i] / this.avg));
      }
      return [id, s];
    }).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
    return scored.slice(0, n).map(([id]) => id);
  }
}
