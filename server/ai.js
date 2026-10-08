// AI service: task generation, defend-it questions and grading.
// Uses Claude when ANTHROPIC_API_KEY is set; otherwise, or whenever Claude fails, Mahara's built-in
// rules take over so a live demo never stops. Results record which one produced them (ai_mode).
import AI from "../shared/engine.js";
import B from "../shared/blueprints.js";
import { createSample } from "./claude.js";

export function createAiService(opts) {
  var db = opts.db;
  var env = opts.env || process.env;
  var onStatus = opts.onStatus || function () {};
  var apiKey = (env.ANTHROPIC_API_KEY || "").trim();
  var models = {
    fast: (env.ANTHROPIC_MODEL_FAST || "claude-haiku-5-5").trim(),
    grader: (env.ANTHROPIC_MODEL_GRADER || "claude-sonnet-5-5").trim()
  };
  var lastError = "";

  function log(entry) {
    if (!entry.ok) {
      lastError = entry.code + (entry.message ? ": " + entry.message : "");
      console.warn("[ai] Claude call failed:", lastError);
    }
  }

  var sample = apiKey ? createSample({ apiKey: apiKey, baseUrl: env.ANTHROPIC_BASE_URL, models: models, log: log, timeoutMs: Number(env.ANTHROPIC_TIMEOUT_MS) || 0 }) : null;
  var claude = AI.createEngine({ sample: sample, onModeChange: function () { onStatus(status()); } });
  var rules = AI.createEngine({}); // never calls Claude

  function status() {
    return {
      mode: claude.state.mode,               // "claude" or "mock" (built-in rules)
      reason: apiKey ? claude.state.reason || "" : "no_api_key",
      models: apiKey ? models : null,
      last_error: lastError || null
    };
  }

  function blueprint(role) {
    var bp = B.VERIFIED[role];
    if (!bp) { var e = new Error("Unknown role"); e.status = 400; throw e; }
    return bp;
  }

  async function generateTask(role, lang) {
    var bp = blueprint(role);
    try {
      return await claude.generateTask(bp, lang);
    } catch (e) {
      console.warn("[ai] Task generation fell back to built-in task:", e && (e.code || e.message));
      var t = rules.mockTask(bp, lang);
      t.facts = t.variables.facts || "";
      t.ai_mode = "mock";
      return t;
    }
  }

  async function generateQuestions(attempt) {
    var bp = blueprint(attempt.role);
    return claude.generateQuestions(bp, attempt.task, attempt.submission || "", attempt.lang);
  }

  var inFlight = {};

  // Grades an attempt and writes the result to the database (mirrors the original runGrading).
  function gradeAttempt(id) {
    if (inFlight[id]) return inFlight[id];
    var a = db.get("attempts", id);
    if (!a) return Promise.resolve(null);
    var bp = B.VERIFIED[a.role];
    if (!bp) return Promise.resolve(null);
    db.update("attempts", id, { status: "grading", grading_started_at: Date.now(), grading_error: null });
    var input = {
      lang: a.lang,
      submission: a.submission || "",
      followups: (a.followups || []).map(function (f) { return { q: f.text, a: f.answer || "" }; }),
      task: a.task
    };
    var p = claude.grade(bp, input)
      .then(function (g) {
        if (!g.failed) return g;
        console.warn("[ai] Claude grading failed after retries; using built-in rules for", id);
        return rules.grade(bp, input).then(function (r) { r.fallback = true; return r; });
      })
      .then(function (g) {
        if (g.failed) {
          db.update("attempts", id, { status: "grading_failed", grading_error: "Grading did not produce valid results after the retry limit.", grading_ms: g.ms });
          db.update("invites", a.invite_id, { status: "grading_failed" });
          return;
        }
        db.update("attempts", id, {
          status: "graded",
          level: g.level,
          weighted_pct: g.P,
          result: { criteria: g.final.criteria, ownership: g.final.ownership, runs_used: g.final.runs_used },
          runs: g.runs,
          grading_calls: g.calls,
          ai_mode: g.ai_mode,
          grading_fallback: !!g.fallback,
          graded_at: Date.now(),
          grading_ms: g.ms
        });
        db.update("invites", a.invite_id, { status: "completed" });
      })
      .catch(function (e) {
        console.error("[ai] Grading error for", id, e && (e.code || e.message));
        db.update("attempts", id, { status: "grading_failed", grading_error: String((e && (e.code || e.message)) || e) });
        db.update("invites", a.invite_id, { status: "grading_failed" });
      })
      .finally(function () { delete inFlight[id]; onStatus(status()); });
    inFlight[id] = p;
    return p;
  }

  return { status: status, generateTask: generateTask, generateQuestions: generateQuestions, gradeAttempt: gradeAttempt };
}
