# Ride-Along

**Practice tickets for new Jira Service Management agents, built from your team's own solved tickets.**

AI now answers the easy tickets that used to teach new agents the job. Ride-Along gives the practice back: every solved
ticket becomes a safe practice rep with an AI customer.

A new agent practises on an AI customer that was built from a real solved ticket. The customer only knows what the real
customer knew, and it only tells a detail when the agent asks the right question. Each reply is graded against your own
KB articles, your SOPs and the real resolution. When the agent proposes a fix, the customer tells them if it worked.
After the run, the agent sees the real ticket side by side with their own run.

Built for Atlassian Codegeist 2026 ("Build with context. Ship with confidence."). Runs fully on Atlassian:
Forge functions, Forge SQL, Forge KVS, Forge Queues and Forge LLMs. No data leaves Atlassian.

## What it does

| For the trainee | For the team lead |
| --- | --- |
| Practise a real ticket, with an SLA clock and the KB search panel open | Build a practice track from a JQL query (or a demo pack) |
| A green, amber or red mark on each reply, with the quote and the KB or SOP line it breaks | Preview each AI customer and test it before trainees see it |
| The customer says "fixed", "still broken" or "now it is worse" when you propose a fix | See each trainee's weak spots by error type and by request type |
| A debrief: what the customer knew, which details you never asked for, the real thread | Confirm "ready for the live queue" when the numbers say so |
| Suggested next tickets that train your weakest skill | Mark a grade wrong; Ride-Along counts the overrides |

A Rovo agent ("Ride-Along coach") can run a whole practice ticket in chat, show weak spots, show queue readiness and
build a track. The same tools are an **MCP server** (`rovo:mcp`), so any AI client that your site admin allows
(for example Claude or Cursor) can practise a ticket or ask "who is ready for the queue?". A **Rovo skill**
(`skills/ride-along-practice/SKILL.md`) tells any agent how to coach without giving away the answer.

| MCP tool | What it does |
| --- | --- |
| `list-practice-tickets` | Your practice tickets by track, solved or not, and the suggested next ones |
| `start-practice` | Opens a run on the ticket that best trains your weak spots |
| `send-practice-reply` | Sends your reply; returns the customer's answer and the grade in one call |
| `practice-debrief` | Ends the run; details you drew out, details you never asked for, the real fix |
| `weak-spots` | Error rates by type and request type |
| `queue-readiness` | For leads: who looks ready for the live queue |
| `build-track` | For leads: build a track from a JQL filter of solved tickets |

The tools always act as the signed-in user (`context.principal`), with that user's Ride-Along permissions.

## How well it works (blind tests)

All numbers are from offline tests on held-out ticket sets that the prompts never saw during design.
The scripts and results are in `test/` and `test/results/`.

| Check | Result |
| --- | --- |
| AI customer turns that are clean (tell only what was earned, no agent-only words) | **96.9%** of 96 turns (one plain AI call scored 81%) |
| Details the customer should give when asked, that it gave | 98.0% |
| Agent-only words that leaked into a customer reply | 0.0% |
| Solved check: wrong or unrelated fixes called "solved" | **0 of 112** |
| Solved check: the real agent's fix message called "solved" | 45 of 60 (most misses are fixes that still wait on another team's approval) |
| Data cleaning: people's names removed | **187 of 187** |
| Data cleaning: email addresses removed | 6 of 6 |
| Data cleaning: technical words kept (error codes, versions, hosts) | 95.7% |

## How it works

```
 JQL / demo pack ──► case-builder queue ──► build-case function
                                              0  clean personal data (regex + known names + one AI pass;
                                                 consistent fake values; the map goes to KVS secret storage)
                                              1  customer card: facts the customer knows, and the question that earns each
                                              2  secret word list: words only the agent side used (no AI)
                                              ▼
                                            Forge SQL: tracks, cases
 Trainee reply ──► resolver.send ──► practice-turns queue ──► run-turn function
                                              3  SELECT: which facts did this message earn? Is it a fix?
                                              6  if it is a fix: solved check (solved / not_yet / made_worse)
                                              4  SPEAK: the customer replies (it never sees the ticket or the resolution)
                                              5  guard: a reply with a secret word is made again once, then trimmed
                                              +  grader (in parallel): one grounded call against KB, SOPs, resolution
                                              ▼
                                            Forge SQL: runs, turns ──► Custom UI polls the turn
 Daily scheduled trigger ──► cleanup function (deletes runs older than the retention setting)
 Rovo agent / MCP client ──► actions (rovo:mcp tools) ──► the same service; send-practice-reply runs the turn inline
```

Design points:

- **The customer never sees the answer.** Only the solved check and the grader see the resolution. The customer
  model gets the persona, the earned facts and the conversation, nothing else.
- **A no-AI guard** stops agent-only words (internal hostnames, ticket references, fix steps) from leaking into a
  customer reply, even if the model tries.
- **Grades cite their source.** Each error has the exact quote from the trainee's reply and the KB or SOP line.
- **Coach maths:** each error type uses a smoothed rate `(errors + 1) / (turns + 3)` over the last 20 graded turns.
  Readiness for a track is: at least 80% of its tickets solved and at most 15% red replies; a lead confirms it.
- **Portable SQL:** the same SQL runs on Forge SQL and on `node:sqlite` in the tests.
- **Reply first, grade second:** the customer reply is saved and shown as soon as it is ready; the grade, which runs
  at the same time, lands a moment later.
- **Instant demo:** the 30 demo-pack cases are prebuilt with the same pipeline (`scripts/prebuild-demo.mjs`), so a demo
  track is ready at once with no model calls.

## Repository layout

```
manifest.yml                 Forge modules: JSM queue page, project page, global lead page, Rovo agent and actions,
                             two queues and consumers, scheduled trigger, SQL, LLM, Custom UI resource
src/engine/                  The AI customer (customer.js), prompts, grader, solved check, data cleaning, coach
src/store/                   SQL migrations, repository, settings (KVS)
src/jira/                    JSM and Confluence clients, ADF to text
src/service.js               All app logic, independent of Forge (tested on sqlite)
src/forge.js                 Wires the service to Forge SQL, KVS, LLMs, Queues and the Jira REST API
src/handlers/                Resolver, queue consumers, Rovo actions
src/demo/packs.js            Three demo packs (IT desk, SaaS support, retail) with KB, SOPs and tickets
src/demo/prebuilt.js         The demo-pack cases, prebuilt (generated by scripts/prebuild-demo.mjs)
src/actions.js               Rovo actions and MCP tools (Forge-free; handlers/actions.js wires them)
skills/ride-along-practice/  Rovo skill: how an agent coaches a practice run
docs/DEMO_SCRIPT.md          The 3-minute demo video script
static/practice/             Custom UI (React 19 + Vite). build/ is committed so `forge deploy` works at once
scripts/prebuild-demo.mjs    Rebuilds src/demo/prebuilt.js after you change a pack (needs the claude CLI)
scripts/seed-demo-site.mjs   Optional: copy a demo pack into a real JSM project and Confluence space
test/unit/                   Backend tests (node:test)
test/run-sim.mjs, eval-*.mjs Offline evals (need the blind-test worlds and the claude CLI; not needed to deploy)
```

## Run the tests on your computer

You need Node.js 22.23.4 or newer (Node 24 works).

```bash
npm install
npm test                                   # 39 backend tests, scripted model, sqlite
cd static/practice && npm install && npm test   # 7 UI tests (jsdom)
```

To look at the screens without Jira, start the dev server. It uses a fixture backend:

```bash
cd static/practice && npm run dev
# http://localhost:5173/                         team lead view (queue page)
# http://localhost:5173/?role=trainee            trainee view
# http://localhost:5173/?module=ride-along-lead-page   global lead page
```

## Deploy to your Atlassian site (steps you do)

These steps use your own Atlassian account and API token. Do them on your own computer.

1. Install the Forge CLI.
   ```bash
   npm install -g @forge/cli@latest
   ```
2. Log in with your own Atlassian API token (create one at id.atlassian.com, Security, API tokens).
   ```bash
   forge login
   ```
3. Register the app. This replaces the placeholder app id in `manifest.yml` with your own.
   ```bash
   forge register ride-along
   ```
4. Install packages and build the UI.
   ```bash
   npm install
   npm run build
   ```
5. Check the app.
   ```bash
   forge lint
   forge eligibility        # optional: checks "Runs on Atlassian"
   ```
6. Get a site with Jira Service Management, Confluence and Rovo. A free developer demo site works:
   ```bash
   forge site provision
   ```
7. Deploy and install.
   ```bash
   forge deploy
   forge install --demo-site --product Jira      # or: forge install --site your-site.atlassian.net --product Jira
   ```
8. Check the cost settings. Forge LLM calls are billed as Forge usage. Building one practice ticket and
   running one practice run takes about 15 to 30 model calls. Check the current Forge pricing before you build big tracks.

### Turn on the MCP server (optional)

The MCP tools are off for outside AI clients until a site or org admin turns them on: Atlassian Administration,
Apps, Sites, your site, Connected apps, Ride-Along, Tools. The endpoint is `https://mcp.atlassian.com/forge/<appId>`,
where `<appId>` is the id after `ari:cloud:ecosystem::app/` in `manifest.yml`. The client signs in with OAuth and acts
with that user's own permissions. Inside Atlassian, the Rovo coach agent uses the same tools with no setup.

### First use

1. In Jira admin, create a group named `ride-along-leads` and add the team leads. (Jira admins are leads too.)
2. Open a service project, then **Ride-Along** in the queue sidebar. Go to **Settings**:
   set the Confluence **KB space key**, the **SOP label** (default `sop`) and the terms that must never be changed
   (product names).
3. Go to **Tracks**, **New track**. Use a demo pack for a first try, or a JQL query for your own solved tickets,
   for example `project = ITSD AND resolution = Done AND created > -180d`.
4. When the cases are ready, open one and click **Test the AI customer**. Then add trainees to the track.
5. Trainees open Ride-Along from the queue sidebar and click **Practise**.

### Optional: put a demo pack into real Jira and Confluence

This shows the "from your own tickets" path end to end. It uses your own API token from environment variables:

```bash
export ATLASSIAN_SITE=your-site.atlassian.net
export ATLASSIAN_EMAIL=you@example.com
export ATLASSIAN_API_TOKEN=...
node scripts/seed-demo-site.mjs --project ITSD --space KB --pack it --dry-run   # look first
node scripts/seed-demo-site.mjs --project ITSD --space KB --pack it
```

Then build a track with `project = ITSD AND labels = ride-along-demo`.
One API token posts as one person, so the script marks customer follow-ups with `[customer]` and the resolution with
`[resolution]`. Ride-Along reads these tags.

## Known limits

These parts are written and tested offline, but not yet run on a live Atlassian site:

- The calls to the live JSM and Confluence REST APIs (shapes come from the docs and are tested with fixtures).
- The seed script.
- Lead detection (`ride-along-leads` group membership, or the Jira admin permission).
- The Rovo action and MCP context: the code reads the user from `context.principal.accountId`.
- `rovo:mcp` and `rovo:skill` are Preview modules. From Jan 5 2027, apps with these modules must also define `app.rovo`
  (tag, description, keywords) to deploy. The Forge CLI used to build this (15.1.0) does not accept `app.rovo` yet, so
  add it when your CLI does.
- Forge SQL is a Preview feature; the migrations use plain MySQL types only.

Other limits:

- The solved check is strict. When a fix still needs another team's approval, it says "not yet".
- One practice turn takes a few seconds. The customer reply shows first; the grade follows.

## Licence

MIT
