// Forge handlers for the Rovo actions (also the MCP tools). The logic is in ../actions.js.
// The caller is always context.principal.accountId, never an input.
import { forgeService } from '../forge.js';
import { AppError } from '../service.js';
import * as A from '../actions.js';

const who = (payload, context) => context?.principal?.accountId || payload?.context?.accountId;
const safe = (fn) => async (payload, context) => {
  try { return await fn(await forgeService({ userContext: true }), who(payload, context), payload || {}); }
  catch (e) { return e instanceof AppError ? e.message : `Ride-Along could not do that: ${e.message}`; }
};

export const startPractice = safe(A.startPractice);
export const weakSpots = safe(A.weakSpots);
export const queueReadiness = safe(A.queueReadiness);
export const buildTrack = safe(A.buildTrack);
export const listPracticeTickets = safe(A.listPracticeTickets);
export const sendPracticeReply = safe(A.sendPracticeReply);
export const practiceDebrief = safe(A.practiceDebrief);
