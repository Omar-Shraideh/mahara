# Environment variables

Mahara runs with **no settings at all**. Every variable below is optional. Add them in Replit under **Tools → Secrets** (the padlock icon): click **New secret**, enter the name exactly as written, paste the value, and save. Then press **Stop** and **Run** so the app picks it up.

If you publish with **Deploy**, open the deployment's settings and check that the same secrets are listed there too.

Never put a real key in a file. `.env.example` lists the names only.

## Connecting the AI: pick one

### Option A (no key of your own): Replit AI Integrations
Replit can give the app Claude access and bill it to your Replit credits. Open the **Agent** in your Repl and send:

> Set up the Anthropic (Replit managed) AI integration for this app. Don't change any code.

Approve when it asks. Replit then sets `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY` itself, and Mahara uses them automatically. Press **Stop** and **Run** afterwards.
- **Plan:** Replit says this is not available on the free Starter plan. On Pro and Enterprise, an admin may have to switch it on in the organization settings.
- **Deployments:** Replit's docs don't say whether it carries over to a published Deployment. Check `/api/health` on the deployed URL.

### Option B: your own Anthropic key

### `ANTHROPIC_API_KEY`
- **What it does:** turns on Claude. Claude writes a fresh task for each applicant, writes the two follow-up questions from their answer, and grades the work against the rubric (two runs, plus a third if they disagree).
- **Required?** No, but use it for judging. It is what the product promises.
- **Where to get it:** [console.anthropic.com](https://console.anthropic.com) → API keys → Create key. It starts with `sk-ant-`.
- **If it's missing:** the app works fully, but tasks come from the built-in task template and scores from Mahara's built-in rules. A beige bar at the top says "Offline mode: Claude is not connected…", and each report says it was scored by the built-in rules.
- **If it's wrong or expired:** the first call fails. Mahara switches to the built-in rules and shows the same bar. Nothing crashes.
- **Cost:** each test session makes about 5–7 Claude calls (1 task, 1 question set, 4–6 grading calls).

## Optional

| Name | Default | What it does | If missing |
|---|---|---|---|
| `ANTHROPIC_MODEL_FAST` | `claude-haiku-4-5` | Model for writing tasks and questions (falls back to `claude-sonnet-4-6`) | Default is used |
| `ANTHROPIC_MODEL_GRADER` | `claude-sonnet-5` | Model for grading (falls back to `claude-sonnet-4-6`) | Default is used |
| `SEED_DEMO_DATA` | `true` | When the database is empty, fill it with the fictional demo data. `false` starts empty. | Demo data is added |
| `DEMO_RESET_TOKEN` | (none) | Lets you reset demo data from outside the Repl with a request header `x-demo-reset-token`. | Reset only works from the Replit Shell (`npm run reset-demo`) |
| `PORT` | `3000` | Port the server listens on. Replit handles this, so leave it alone. | 3000 |
| `DATA_FILE` | `data/mahara-db.json` | Where the database file is stored | Default path |
| `ANTHROPIC_TIMEOUT_MS` | 25000 for tasks and questions, 60000 for grading | How long to wait for Claude before falling back | Defaults are used |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | Only for testing against a proxy | Default is used |

**Model names:** if a model isn't available to your account, Mahara moves to the next one in its list. Only if none work does it switch to the built-in rules. The server log shows the reason.

## Checking it worked

Open `https://<your-repl-url>/api/health`. You should see `"mode":"claude"`, and `"provider":"replit"` or `"anthropic"`. `"mode":"mock"` means the built-in rules are active, and `"reason"` says why: `no_api_key` or `not_granted`.
