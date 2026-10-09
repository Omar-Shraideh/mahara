# Mahara: notes for Replit Agent

This app is finished and tested. Please do not redesign, rewrite, restructure it, or add an AI integration.

## Run
- `.replit` runs `npm run replit` (install, build, start) on port 3000. Nothing else is needed: no secrets, no database setup, no AI keys.
- Health check: `GET /api/health`.

## How scoring works
- Mahara grades with its own rules-based scoring engine (`shared/fallbackGrader.js`) against a fixed rubric. This is intentional.
- The code can optionally use Claude if `ANTHROPIC_API_KEY` is set later, but that is not wanted now.

## Structure
- `server/` holds Express (API, live updates), the JSON-file database, and the grading service.
- `shared/` holds scoring logic, the task blueprint, the scoring engine, and English and Arabic strings.
- `src/` holds the React screens (htm templates) and `styles.css`, which is the approved design. Keep it as it is.
