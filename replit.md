# Mahara: notes for Replit Agent

This app is finished and tested. Please do not redesign, rewrite or restructure it.

## Run
- `.replit` runs `npm run replit` (install, build, start) on port 3000. Nothing else is needed.
- Health check: `GET /api/health`. `"mode":"claude"` means AI is connected.

## AI (the only setup task)
- The app uses Anthropic Claude **only through the Replit AI Integrations environment variables**:
  `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` and `AI_INTEGRATIONS_ANTHROPIC_API_KEY`.
- Please set up the **Anthropic (Replit managed)** AI integration so these two variables exist. No code change is needed: `server/ai.js` already reads them and calls `POST {base}/v1/messages`.
- Models tried in order: `claude-haiku-4-5` (tasks, questions); `claude-sonnet-5`, then `claude-sonnet-4-6` (grading).
- If the variables are missing, the app still works with built-in rules and shows an "Offline mode" note.

## Structure
- `server/` holds Express (API, live updates), the JSON-file database, and the AI service.
- `shared/` holds scoring logic, the task blueprint, prompts, the AI engine, the rules grader, and English and Arabic strings.
- `src/` holds the React screens (htm templates) and `styles.css`, which is the approved design, unchanged.
