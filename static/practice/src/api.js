// Calls into the Forge resolver. Outside Forge (vite dev and UI tests), a fixture backend answers instead.
// @forge/bridge throws when it loads outside Jira, so it is imported only inside Forge.
const inForge = typeof window !== 'undefined' && !!window.__bridge;
let bridge = null;
let mock = null;
const getBridge = async () => (bridge ||= await import('@forge/bridge'));

export async function call(name, payload = {}) {
  let r;
  if (inForge) r = await (await getBridge()).invoke(name, payload);
  else if (import.meta.env.DEV || import.meta.env.MODE === 'test') { mock ||= (await import('./mock.js')).mockBackend(); r = await mock(name, payload); } else r = { ok: false, error: { message: 'Open Ride-Along from Jira.' } };
  if (!r || r.ok === false) throw new Error(r?.error?.message || 'Request failed');
  return r.data;
}

export async function moduleKey() {
  if (!inForge) return new URLSearchParams(location.search).get('module') || 'ride-along-queue-page';
  const { view } = await getBridge();
  try { view.theme.enable(); } catch { /* theme is optional */ }
  return (await view.getContext()).moduleKey;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll a practice turn until the customer has answered (or the call failed). With grade: true, also wait for the grade. */
export async function waitForTurn(turnId, { every = 1000, max = 240000, grade = false } = {}) {
  const t0 = Date.now();
  for (;;) {
    const r = await call('getTurn', { turnId });
    if (r.turn.status !== 'pending' && !(grade && r.turn.status === 'replied')) return r;
    if (Date.now() - t0 > max) throw new Error('The customer is taking too long. Refresh to check again.');
    await sleep(every);
  }
}
