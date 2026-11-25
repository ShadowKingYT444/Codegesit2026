# Ride-Along | App and testing handoff

Ride-Along helps Jira Service Management teams train new support agents. A lead turns resolved tickets into practice cases. A trainee works through a case with a simulated customer, gets feedback grounded in the team's knowledge base and standard operating procedures, and reviews the original ticket in a debrief.

## How it works

1. A lead creates a track from a built-in demo pack or a JQL query. A Forge queue builds the cases. For imported tickets, the app cleans personal information and separates customer-visible facts from internal notes and the real resolution.
2. A trainee starts a case in the React UI. Each reply goes through a Forge resolver and queue. The customer reveals facts when the trainee asks relevant questions. A separate grader uses the knowledge base, procedures, and real resolution to assess replies. A proposed fix can resolve the case, leave it open, or make it worse.
3. The debrief compares the run with the original ticket and shows facts the trainee missed. Leads can see practice results and review readiness. The Rovo Coach can start a run, show weak spots and readiness, and build a track.

The backend workflow lives in [`src/service.js`](src/service.js), the AI logic in [`src/engine/`](src/engine/), and Forge wiring in [`src/forge.js`](src/forge.js) and [`manifest.yml`](manifest.yml). The React app is in [`static/practice/`](static/practice/). See the [README](README.md) for deployment and configuration details.

## Run the local checks

Use Node.js 22.23.4 or newer. Run these commands from the repository root:

```sh
npm ci
npm --prefix static/practice ci
npm test
npm --prefix static/practice test
npm --prefix static/practice run build
```

Expect 34 backend tests and 7 UI tests to pass. The backend suite uses SQLite and a scripted model. The UI suite uses fixture data. With the Forge CLI installed, `npm run validate` also checks the manifest schema offline.

## Try the browser demo

Run `npm --prefix static/practice run dev -- --host 127.0.0.1 --port 5173`. The dev server uses the fixture backend, so it can run without a Jira site, Forge login, or model calls.

1. Open the [trainee view](http://127.0.0.1:5173/?role=trainee) and click **Practise** on the VPN ticket.
2. Send `What network are you on right now?` and check that the customer reveals a detail. Try `Please reinstall GlobalProtect.` and check that it is marked **Wrong fix**, with a knowledge-base reference.
3. Send `Switch to the TCP gateway and connect.` and check that the case is marked solved. Click **See the real ticket** and check that the debrief shows the source timeline and facts you missed.
4. In the [lead view](http://127.0.0.1:5173/), open **Tracks**, select **IT desk: first two weeks**, preview a case, and click **Test the AI customer**. The [lead dashboard](http://127.0.0.1:5173/?module=ride-along-lead-page) opens on team progress.

## Verify on a Jira test site

Use the Forge `development` environment and a Jira Service Management test site. Follow the [README deployment steps](README.md#deploy-to-your-atlassian-site-steps-you-do) with the intended Forge registration. A fresh clone has a placeholder app ID. Run `forge lint` before deploying. If it reports a duplicate `id` in [`src/store/repo.js`](src/store/repo.js), remove the first `id: r.id` from the case mapper and keep the final one after the `case_json` spread so the database ID wins. This fix passed Forge lint and the backend suite in the local checkout.

1. Install the development build on Jira and open a service project. Go to **Queues → Ride-Along practice** as a Jira admin or a member of `ride-along-leads`.
2. Create a track from a demo pack and wait for its cases to become ready. Preview one, then assign a trainee. Use a trainee account to complete a case and check the grade, debrief, and lead progress view.
3. To verify the live integrations, configure the Confluence KB space and SOP label, then build another track from solved test tickets using JQL. Check that the ticket import works and the grade cites the expected KB or SOP text. If testing Rovo, ask Ride-Along Coach to start a practice run.

The local handoff verifies the automated suites, browser fixture flows, and Forge lint with a registered app ID and the fix above. The Jira steps cover the live services that fixture tests cannot exercise.
