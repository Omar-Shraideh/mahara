# Mahara

See what every applicant can do before you read a CV.

Mahara gives entry-level applicants in Jordan a 10-minute work sample instead of a CV screen. The employer invites an applicant, the applicant does 8 minutes of real work for the role on the office device, answers two short questions about their own answer, and the employer gets a level (Emerging, Job-ready or Strong) with a score and a reason for each skill. It works in English and Arabic. This build covers the Customer Support role.

## Product

| Area | What it does |
|---|---|
| Start page `/` | Explains the product and shows an example result. |
| Invites `/workspace/invites` | Invite an applicant (validated name, email and role), see every invite and its status, start a test, cancel an unused invite. |
| Results `/workspace/results` | Graded sessions, strongest first, with filters by level and task language. |
| Report `/workspace/results/:id` | Level, scores by skill with reasons and evidence quotes, ownership score, time used, tab switches, blocked pastes. Summary, Work and Assessment details tabs. Shortlist, and "Disagree with score". |
| Candidate session `/session/...` | Language choice and consent, the 8-minute task with paste switched off and autosave, two 60-second questions about their own answer, then a finish screen. |

The Employer / Candidate switch in the top bar lets one laptop play both sides, which is how the product is used: the applicant sits at the office device.

## Tech stack

- **Frontend:** React 18 with [htm](https://github.com/developit/htm) templates, built with Vite 6. The screens and the CSS are carried over from the approved design as they are, so the look is identical.
- **Backend:** Node.js 20 and Express 4 on one port. It serves the app, a small JSON API, live updates (Server-Sent Events), and all Claude calls.
- **Scoring:** Mahara's own rules-based scoring engine grades every answer against the fixed rubric, with a reason and an exact evidence quote for each skill. No AI key or outside service is needed. Optional: with `ANTHROPIC_API_KEY` set, Claude writes the tasks and grades, and the engine becomes the safety net.
- **Storage:** one JSON file (`data/mahara-db.json`), written atomically.
- **Fonts:** Readex Pro, Alexandria and IBM Plex Mono, self-hosted through Fontsource, so there are no runtime calls to Google Fonts.

**Choices that differ from the default request:**
- **JavaScript and htm instead of TypeScript and JSX:** this keeps every approved screen identical. Rewriting about 1,000 lines of templates into TSX would have risked visual and behaviour drift for no gain at a demo.
- **No Tailwind:** the approved design is already a hand-tuned stylesheet, and `src/styles.css` is that stylesheet unchanged.

## Running locally

Requirements: Node.js 18.18 or newer.

```bash
npm install
npm run dev        # development, http://localhost:3000 (hot reload)
# or
npm run build && npm start   # production build
npm test           # starts a throwaway server and runs one full session through the API
```

## Replit

1. Create a new Repl from the **Node.js** template.
2. Drag `mahara-replit.zip` into the Files panel.
3. In the **Shell** tab run: `unzip -o mahara-replit.zip -d . && rm mahara-replit.zip`
5. Press **Run**. The first run installs packages and builds, which takes about a minute. After that the preview opens on the start page.

`.replit` runs `npm run replit` (install, build, start) and maps port 3000 to the public URL. If the build ever fails, the app still starts from the prebuilt `dist/` folder included in the zip.

**Publishing:** to get a permanent public URL, use **Deploy**. Choose **Reserved VM** if it is offered, so one always-on server keeps the data during the event. Then check that the deployment's Secrets include `ANTHROPIC_API_KEY`.

## Environment variables

None are required. See [ENVIRONMENT.md](ENVIRONMENT.md) for the full list:

| Variable | Required | Purpose |
|---|---|---|
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` / `..._API_KEY` | No (set by Replit) | Claude through Replit AI Integrations, billed to Replit credits |
| `ANTHROPIC_API_KEY` | No | Claude with your own key (takes priority). Without either, the built-in rules are used and the app says so. |
| `ANTHROPIC_MODEL_FAST` / `ANTHROPIC_MODEL_GRADER` | No | Model names (defaults `claude-haiku-4-5` and `claude-sonnet-5`, each falling back to `claude-sonnet-4-6`). |
| `SEED_DEMO_DATA` | No | `false` starts with an empty database. |
| `DEMO_RESET_TOKEN` | No | Allows resetting the demo data remotely. |

## Demo account

There is no login. The employer workspace opens directly, and the candidate side runs on the same device from **Start test**, as in the product design. All people in the demo data are fictional and use `@example.com` addresses.

## Demo flow

A 3–5 minute script is in [DEMO_GUIDE.md](DEMO_GUIDE.md): invite an applicant, take the test as the candidate, then open the graded report. The guide includes a backup path.

## Architecture

```
Browser (React + htm)                         Server (Express, one port)
  screens  ──fetch──►  /api/db/:collection/:id  ──►  JSON file store ──► data/mahara-db.json
           ◄──SSE────  /api/events (live changes, AI status)
           ──fetch──►  /api/ai/task, /api/ai/questions ──► Claude (server-side key)
           ──fetch──►  /api/attempts/:id/grade ──► grading pipeline ──► writes result
                                                        └─► built-in rules if Claude is missing or failing
```

**Shared code (`shared/`)** runs on both server and browser:
- `logic.js` holds scoring, levels, validation, timers and filters.
- `blueprints.js` holds the Customer Support task, rubric and graded examples.
- `prompts.js` holds the three Claude prompts.
- `engine.js` holds the generate, question and grade pipeline: two grading runs, a third if they disagree by more than 1, and quote checks.
- `fallbackGrader.js` is the built-in rules grader.
- `i18n.js` holds the English and Arabic strings.

**Grading** runs on the server, so it finishes even if the browser closes. Each result records what produced it (`ai_mode`: `claude`, `mock` for built-in rules, or `seed` for demo data), and the report shows it.

**Data persistence:** the database is a JSON file. That was a deliberate choice: there is nothing to install or compile on Replit, and the data is small. The data survives page refreshes and server restarts in the workspace. On Replit, files written by a *Deployment* do not survive a redeploy (see [Replit's deployment docs](https://docs.replit.com/hosting/deployments/about-deployments)), so a redeploy starts again from the demo data. For a real launch, move `server/db.js` to Replit PostgreSQL. It is the only file that touches storage.

**Security:**
- The API key stays on the server, and the browser never sees it.
- Inputs are validated on the server: collection and id whitelist, invite name, email and role checks, size limits, and stripping of unsafe keys.
- Errors are returned as short JSON messages without stack traces.
- There is no authentication, by design for this demo.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Server, storage and AI status |
| GET | `/api/data` | All invites, attempts and actions |
| GET | `/api/events` | Live updates (Server-Sent Events) |
| PUT / PATCH / DELETE | `/api/db/:collection/:id` | Create or replace, update, delete a record (`invites`, `attempts`, `actions`) |
| POST | `/api/ai/task` | Generate a task `{ role, lang }` |
| POST | `/api/ai/questions` | Two follow-up questions `{ attempt_id }` |
| POST | `/api/attempts/:id/grade` | Start grading (returns 202, results arrive over `/api/events`) |
| POST | `/api/demo/reset` | Restore demo data (local only, or with `DEMO_RESET_TOKEN`) |

## Project structure

```
server/   index.js (routes), db.js (storage), ai.js (AI service), claude.js (Claude API), seed.js (demo data)
shared/   logic, blueprints, prompts, engine, fallbackGrader, i18n
src/      App.js (routing), lib/ (store, api, router, helpers), components/, layout/, pages/, styles.css
public/   favicon.svg, mascot/*.webp
scripts/  smoke-test.js (npm test), reset-demo.js (npm run reset-demo)
```

## Known limits

- **One role:** this build has Customer Support only, which is the only role with a verified task and rubric.
- **One server:** the JSON store expects a single server instance. Use Reserved VM, not autoscaling, when deploying.
- **Rules grader:** the built-in grader is deliberately simple. It matches the three hand-graded English examples criterion by criterion. It is a fallback, not a replacement for Claude.
