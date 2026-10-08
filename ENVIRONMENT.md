# Environment variables

Mahara runs with **no settings at all**. You can skip this file. Every variable below is optional. Add them in Replit under **Tools → Secrets** (the padlock icon): click **New secret**, enter the name exactly as written, paste the value, and save. Then press **Stop** and **Run** so the app picks it up.

If you publish with **Deploy**, open the deployment's settings and check that the same secrets are listed there too.

Never put a real key in a file. `.env.example` lists the names only.

## AI: not needed

Mahara grades with its own scoring engine against a fixed rubric, so there is **no AI key, no Replit AI integration and no cost**.

### Turning on Claude (optional)
Add one secret, `ANTHROPIC_API_KEY` (from console.anthropic.com; it needs billing set up), then press **Stop** and **Run**. Nothing else changes:
- Claude writes a fresh task for each applicant, writes the two follow-up questions from their own answer, and grades twice against the rubric (three times if the runs disagree).
- The start page and reports switch to the AI wording automatically ("Claude grades it twice…", "AI-assessed, supervised in person").
- If Claude is slow, down or the key is wrong, the scoring engine takes over within seconds and the report says so.
- Cost: roughly 5–7 cents per test session. Set a monthly spend limit in the Anthropic console.
- Check: `/api/health` should show `"mode":"claude"`.

To go back, delete the secret and press **Stop** and **Run**.

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
