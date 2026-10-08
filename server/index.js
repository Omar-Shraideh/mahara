// Mahara server: serves the app and a small JSON API on one port (Replit-friendly).
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createDb, COLLECTIONS } from "./db.js";
import { createAiService } from "./ai.js";
import { buildDemoData } from "./seed.js";
import L from "../shared/logic.js";
import B from "../shared/blueprints.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEV = process.env.NODE_ENV === "development";
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, "data", "mahara-db.json");
const SEED = String(process.env.SEED_DEMO_DATA || "true").toLowerCase() !== "false";

const db = createDb(DATA_FILE);
if (db.isEmpty() && SEED) {
  db.replaceAll(buildDemoData());
  console.log("[db] Seeded fictional demo data into " + DATA_FILE);
}

// ---------- live updates (Server-Sent Events) ----------
const clients = new Set();
function send(res, event, payload) { res.write("event: " + event + "\ndata: " + JSON.stringify(payload) + "\n\n"); }
function broadcast(event, payload) { clients.forEach(function (res) { try { send(res, event, payload); } catch (e) { /* closed */ } }); }
db.events.on("change", function (c, list) { broadcast("change", { c: c, list: list }); });

const ai = createAiService({ db: db, onStatus: function (st) { broadcast("ai", st); } });

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "512kb" }));

// ---------- helpers ----------
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function cleanDoc(v, depth) {
  depth = depth || 0;
  if (depth > 8) return null;
  if (Array.isArray(v)) return v.slice(0, 500).map(function (x) { return cleanDoc(x, depth + 1); });
  if (v && typeof v === "object") {
    var o = {};
    Object.keys(v).forEach(function (k) { if (!BAD_KEYS.has(k)) o[k] = cleanDoc(v[k], depth + 1); });
    return o;
  }
  if (typeof v === "string") return v.slice(0, 20000);
  return v;
}
function fail(res, status, code, message) { res.status(status).json({ error: { code: code, message: message } }); }
function checkTarget(req, res) {
  if (COLLECTIONS.indexOf(req.params.c) === -1) { fail(res, 404, "unknown_collection", "Unknown collection."); return false; }
  if (!ID_RE.test(req.params.id)) { fail(res, 400, "bad_id", "Invalid id."); return false; }
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) { if (req.method !== "DELETE") { fail(res, 400, "bad_body", "Expected a JSON object."); return false; } }
  return true;
}
// Server-side checks for the records people type in.
function validateInvite(doc) {
  if (!doc) return "Missing invite.";
  var name = String(doc.candidate_name || "").trim();
  if (!name || name.length > 100) return "Applicant name is required (100 characters at most).";
  if (!L.isValidEmail(doc.candidate_email)) return "Applicant email is not valid.";
  if (B.ROLE_KEYS.indexOf(doc.role) === -1) return "Unknown role.";
  return null;
}

// ---------- API ----------
app.get("/api/health", function (req, res) {
  res.json({ ok: true, ai: ai.status(), storage: { kind: "json-file", records: COLLECTIONS.reduce(function (n, c) { return n + db.list(c).length; }, 0) } });
});

app.get("/api/data", function (req, res) { res.json({ data: db.all(), ai: ai.status() }); });

app.get("/api/events", function (req, res) {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  send(res, "hello", { ai: ai.status() });
  clients.add(res);
  var ping = setInterval(function () { res.write(": ping\n\n"); }, 20000);
  req.on("close", function () { clearInterval(ping); clients.delete(res); });
});

app.put("/api/db/:c/:id", function (req, res) {
  if (!checkTarget(req, res)) return;
  var doc = cleanDoc(req.body);
  if (req.params.c === "invites") { var err = validateInvite(doc); if (err) return fail(res, 400, "invalid_invite", err); }
  res.json({ ok: true, list: db.set(req.params.c, req.params.id, doc) });
});

app.patch("/api/db/:c/:id", function (req, res) {
  if (!checkTarget(req, res)) return;
  var list = db.update(req.params.c, req.params.id, cleanDoc(req.body));
  if (!list) return fail(res, 404, "invalid_argument", "That record no longer exists.");
  res.json({ ok: true, list: list });
});

app.delete("/api/db/:c/:id", function (req, res) {
  if (!checkTarget(req, res)) return;
  res.json({ ok: true, list: db.remove(req.params.c, req.params.id) });
});

app.post("/api/ai/task", async function (req, res) {
  var role = req.body && req.body.role, lang = req.body && req.body.lang;
  if (B.ROLE_KEYS.indexOf(role) === -1 || (lang !== "en" && lang !== "ar")) return fail(res, 400, "bad_request", "Role and language are required.");
  try { res.json({ task: await ai.generateTask(role, lang), ai: ai.status() }); }
  catch (e) { console.error("[api] task", e); fail(res, 502, "task_failed", "The task could not be prepared."); }
});

app.post("/api/ai/questions", async function (req, res) {
  var id = req.body && req.body.attempt_id;
  var a = id && ID_RE.test(id) ? db.get("attempts", id) : null;
  if (!a) return fail(res, 404, "not_found", "Attempt not found.");
  try { res.json(await ai.generateQuestions(a)); }
  catch (e) { console.error("[api] questions", e); fail(res, 502, "questions_failed", "The questions could not be prepared."); }
});

app.post("/api/attempts/:id/grade", function (req, res) {
  if (!ID_RE.test(req.params.id)) return fail(res, 400, "bad_id", "Invalid id.");
  var a = db.get("attempts", req.params.id);
  if (!a) return fail(res, 404, "not_found", "Attempt not found.");
  if (["defended", "grading_failed", "grading", "graded"].indexOf(a.status) === -1) return fail(res, 409, "not_ready", "This session is not ready to grade yet.");
  if (a.status === "graded") return res.json({ ok: true, status: "graded" });
  ai.gradeAttempt(a.id); // runs in the background; the UI follows along through /api/events
  res.status(202).json({ ok: true, status: "grading" });
});

// Reset to the fictional demo data. Allowed from this machine (npm run reset-demo), or remotely with DEMO_RESET_TOKEN.
app.post("/api/demo/reset", function (req, res) {
  var token = process.env.DEMO_RESET_TOKEN;
  var local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].indexOf(req.socket.remoteAddress) !== -1 && !req.headers["x-forwarded-for"];
  var ok = local || (token && req.get("x-demo-reset-token") === token);
  if (!ok) return fail(res, 403, "forbidden", "Reset is only allowed from the server itself or with DEMO_RESET_TOKEN.");
  db.replaceAll(buildDemoData());
  res.json({ ok: true });
});

app.use("/api", function (req, res) { fail(res, 404, "not_found", "Unknown API route."); });

// JSON errors only, never stack traces.
app.use(function (err, req, res, next) {
  if (res.headersSent) return next(err);
  var status = err.status || err.statusCode || 500;
  if (err.type === "entity.too.large") return fail(res, 413, "too_large", "That request is too large.");
  if (err.type === "entity.parse.failed") return fail(res, 400, "bad_json", "The request body is not valid JSON.");
  console.error("[server]", err);
  fail(res, status >= 400 && status < 600 ? status : 500, "server_error", "Something went wrong on the server. Please try again.");
});

// ---------- the app ----------
async function start() {
  if (DEV) {
    const { createServer } = await import("vite");
    const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(ROOT, "dist");
    if (!fs.existsSync(path.join(dist, "index.html"))) {
      console.error("[server] dist/ is missing. Run `npm run build` first.");
    }
    app.use(express.static(dist, { index: false, maxAge: "1h", setHeaders: function (res, p) { if (p.endsWith(".html")) res.setHeader("Cache-Control", "no-cache"); } }));
    // Every non-API route serves the app, so refreshing /workspace/results/... works.
    app.get("*", function (req, res) { res.setHeader("Cache-Control", "no-cache"); res.sendFile(path.join(dist, "index.html")); });
  }
  app.listen(PORT, "0.0.0.0", function () {
    var st = ai.status();
    console.log("Mahara is running on port " + PORT + (DEV ? " (development)" : ""));
    console.log("AI: " + (st.mode === "claude" ? "Claude (" + st.models.fast + " for tasks, " + st.models.grader + " for grading)" : "built-in rules (set ANTHROPIC_API_KEY to use Claude)"));
  });
}
start();
