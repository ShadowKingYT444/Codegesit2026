// Async event consumers: case building (one event per ticket) and practice turns (model calls up to 5 minutes).
import Resolver from '@forge/resolver';
import { forgeService } from '../forge.js';

const caseResolver = new Resolver();
caseResolver.define('build', async ({ payload }) => {
  const s = await forgeService();
  return s.buildCase(payload.caseId);
});
export const buildCase = caseResolver.getDefinitions();

const turnResolver = new Resolver();
turnResolver.define('turn', async ({ payload }) => {
  const s = await forgeService();
  return s.processTurn(payload.turnId);
});
export const runTurn = turnResolver.getDefinitions();

export async function cleanup() {
  const s = await forgeService();
  const r = await s.cleanup();
  console.log(`retention: deleted ${r.deleted} old practice runs`);
  return r;
}
