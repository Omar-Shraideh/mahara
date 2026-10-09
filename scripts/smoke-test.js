// End-to-end check of the server: starts Mahara on a spare port with a throwaway database,
// runs one full candidate session through the API, and checks it gets graded.
// Run in the Replit Shell:  npm test
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3199;
const BASE = "http://127.0.0.1:" + PORT;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mahara-test-"));
const env = Object.assign({}, process.env, { PORT: String(PORT), NODE_ENV: "production", DATA_FILE: path.join(dataDir, "db.json") });
const server = spawn(process.execPath, [path.join(ROOT, "server/index.js")], { env, stdio: ["ignore", "pipe", "pipe"] });
let failed = 0;
const check = (cond, msg) => { console.log((cond ? "  ok   " : "  FAIL ") + msg); if (!cond) failed++; };
const call = async (method, url, body) => {
  const r = await fetch(BASE + url, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let up = false;
  for (let i = 0; i < 40 && !up; i++) { await sleep(250); try { up = (await call("GET", "/api/health")).status === 200; } catch (e) { /* starting */ } }
  check(up, "server starts");
  const health = (await call("GET", "/api/health")).json;
  console.log("  AI mode: " + health.ai.mode + (health.ai.mode === "claude" ? "" : " (built-in rules)"));
  const data = (await call("GET", "/api/data")).json.data;
  check(data.attempts.length >= 6, "demo results are seeded (" + data.attempts.length + ")");
  const page = await fetch(BASE + "/workspace/results/att_demo1");
  check(page.status === 200 && (await page.text()).includes('id="app"'), "deep links load the app");
  check((await call("PUT", "/api/db/invites/inv_bad", { candidate_name: "", candidate_email: "x", role: "customer_support" })).status === 400, "invalid invite is rejected");
  const inv = "inv_smoke", att = "att_smoke";
  check((await call("PUT", "/api/db/invites/" + inv, { candidate_name: "Smoke Test", candidate_email: "smoke.test@example.com", role: "customer_support", kind: "verified", session_code: "SMK234", status: "invited", created_at: Date.now() })).status === 200, "invite saved");
  const task = (await call("POST", "/api/ai/task", { role: "customer_support", lang: "en" })).json.task;
  check(task && task.task_text && task.deliverable, "task generated (" + task.ai_mode + ")");
  const submission = "[Reply to the customer]\nI'm sorry your order is late. The courier tried to deliver but couldn't reach you. I've booked a new delivery for tomorrow between 4 and 7 pm.\n\n[Internal note to logistics (2 lines)]\nFailed delivery, customer unreachable. Depot team please confirm the new slot.";
  await call("PUT", "/api/db/attempts/" + att, { invite_id: inv, role: "customer_support", kind: "verified", lang: "en", candidate_name: "Smoke Test", status: "submitted", task, submission, created_at: Date.now() });
  const q = (await call("POST", "/api/ai/questions", { attempt_id: att })).json;
  check(q && q.questions && q.questions.length === 2, "two follow-up questions");
  await call("PATCH", "/api/db/attempts/" + att, { status: "defended", followups: q.questions.map((x) => ({ text: x, answer: "Because a delivery window is something the driver can keep, and the call ahead avoids another missed delivery." })) });
  // The server starts grading by itself when the defend answers are saved, so this call may find it already done.
  const g = await call("POST", "/api/attempts/" + att + "/grade");
  check(g.status === 202 || (g.status === 200 && g.json && g.json.status === "graded"), "grading started");
  let a = null;
  for (let i = 0; i < 120; i++) { await sleep(500); a = (await call("GET", "/api/data")).json.data.attempts.find((x) => x.id === att); if (a.status === "graded" || a.status === "grading_failed") break; }
  check(a && a.status === "graded", "session graded: " + (a && a.level) + " via " + (a && a.ai_mode));
} catch (e) {
  failed++; console.error("  FAIL " + (e && e.message));
} finally {
  server.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll checks passed.");
  process.exit(failed ? 1 : 0);
}
