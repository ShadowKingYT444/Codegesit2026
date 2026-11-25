// Settings and the personal-data maps live in Forge KVS. The maps use secret storage and are never sent to the UI.
export const DEFAULTS = {
  leadGroup: 'ride-along-leads',   // members can build tracks and see every trainee
  kbSpaceKey: '',                  // Confluence space with KB articles (empty: KB search off for JSM tracks)
  sopLabel: 'sop',                 // Confluence label that marks SOP pages
  sopSpaceKey: '',                 // space for SOP pages (empty: same as KB space)
  model: 'claude-sonnet-4-6',      // Forge LLM model id
  turnLimit: 12,                   // a run ends after this many trainee replies
  retentionDays: 180,              // practice runs older than this are deleted
  sensitiveTypes: [],              // extra request types to exclude unless a lead allows them
  keepTerms: [],                   // words the cleaning step must never replace (product names, system names)
  maxCasesPerTrack: 30,
};

export function makeSettings(kv) {
  return {
    async get() { return { ...DEFAULTS, ...((await kv.get('settings')) || {}) }; },
    async save(patch) {
      const cur = { ...DEFAULTS, ...((await kv.get('settings')) || {}) };
      const next = { ...cur };
      for (const k of Object.keys(DEFAULTS)) if (k in patch) next[k] = patch[k];
      next.turnLimit = Math.max(3, Math.min(30, Number(next.turnLimit) || DEFAULTS.turnLimit));
      next.retentionDays = Math.max(7, Math.min(3650, Number(next.retentionDays) || DEFAULTS.retentionDays));
      next.maxCasesPerTrack = Math.max(1, Math.min(100, Number(next.maxCasesPerTrack) || DEFAULTS.maxCasesPerTrack));
      for (const k of ['sensitiveTypes', 'keepTerms']) if (!Array.isArray(next[k])) next[k] = String(next[k] || '').split(',').map((s) => s.trim()).filter(Boolean);
      await kv.set('settings', next);
      return next;
    },
    savePiiMap: (caseId, map) => kv.setSecret(`pii-${caseId}`, map),
    deletePiiMap: (caseId) => kv.deleteSecret(`pii-${caseId}`),
  };
}

/** In-memory stand-in for @forge/kvs, for tests and the local demo. */
export function memoryKv() {
  const m = new Map(), s = new Map();
  return {
    get: async (k) => m.get(k), set: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); },
    getSecret: async (k) => s.get(k), setSecret: async (k, v) => { s.set(k, v); }, deleteSecret: async (k) => { s.delete(k); },
    _secrets: s,
  };
}
