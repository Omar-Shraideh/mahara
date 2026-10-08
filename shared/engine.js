/* Mahara AI engine: task generation, defend-it questions and the grading pipeline (Customer Support only).
   The Claude call is injected (`sample`, implemented server-side in server/claude.js).
   When Claude is unavailable, Mahara's built-in rules (shared/fallbackGrader.js) score the work and the UI says so. */
import L from "./logic.js";
import B from "./blueprints.js";
import P from "./prompts.js";
import { rulesRun } from "./fallbackGrader.js";

var HIDE_CODES = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"];
var MAX_CALLS_PER_RUN = 3; // initial + 2 regrades (DEC-09)

function roleName(roleKey, lang) {
  return (B.ROLES[roleKey] || {})[lang] || roleKey;
}

function criterionName(c, lang) {
  if (c.name) return c.name;
  var n = B.CRITERIA_NAMES[c.id];
  return n ? n[lang] || n.en : c.id;
}

function fieldsSpec(roleKey, lang) {
  return B.FIELDS[roleKey].map(function (f) { return { key: f.key, label: f.label[lang] }; });
}

function createEngine(opts) {
  opts = opts || {};
  var sample = opts.sample || null;
  var state = { mode: sample ? "claude" : "mock", reason: sample ? "" : "unavailable" };
  var log = opts.log || function () {};

  function markUnavailable(code) {
    state.mode = "mock";
    state.reason = code;
    if (opts.onModeChange) opts.onModeChange(state);
  }

  // One JSON call to Claude; returns {ok, value, code}
  function callJson(prompt, tier) {
    if (state.mode !== "claude" || !sample) return Promise.resolve({ ok: false, code: "mock" });
    var started = Date.now();
    return sample.json(prompt, { modelTier: tier, cache: false }).then(function (v) {
      log({ op: "sample", tier: tier, ms: Date.now() - started, ok: true });
      return { ok: true, value: v };
    }, function (e) {
      var code = (e && e.code) || "upstream_error";
      log({ op: "sample", tier: tier, ms: Date.now() - started, ok: false, code: code });
      if (HIDE_CODES.indexOf(code) !== -1) markUnavailable(code);
      return { ok: false, code: code, text: e && e.text };
    });
  }

  // ---------------- task generation ----------------

  function mockTask(bp, lang) {
    var vars = Object.assign({}, (bp.mock_variables || {})[lang] || {});
    if (vars.order_id) vars.order_id = vars.order_id.replace(/\d{3}$/, String(100 + Math.floor(Math.random() * 899)));
    var deliverables = {
      customer_support: { en: "Write your reply to the customer, then a 2-line internal note to the logistics team.", ar: "اكتب ردّك على العميل، ثم ملاحظة داخلية من سطرين لفريق التوصيل." }
    };
    var d = deliverables[bp.role];
    var tpl = (bp.mock_template && bp.mock_template[lang]) || bp.scenario_template;
    return { variables: vars, task_text: L.fillTemplate(tpl, vars), deliverable: d[lang], ai_mode: "mock" };
  }

  function generateTask(bp, lang) {
    var aiVars = bp.ai_variables || bp.variables;
    var prompt = P.taskPrompt({
      roleName: roleName(bp.role, lang), lang: lang, scenarioTemplate: bp.scenario_template,
      plantedIssue: bp.planted_issue, aiVariables: aiVars
    });
    var markers = bp.planted_markers;
    var checkBp = { ai_variables: aiVars, planted_markers: Array.isArray(markers) ? markers : markers && markers[lang] ? markers[lang] : null };
    var attempt = 0;
    function finish(t) {
      t.facts = t.variables.facts || "";
      return t;
    }
    function tryOnce() {
      attempt++;
      return callJson(prompt, "quick").then(function (r) {
        if (!r.ok) {
          if (r.code === "mock") return finish(mockTask(bp, lang));
          if (attempt < 3 && r.code !== "rate_limited") return tryOnce();
          var err = new Error("TASK_GENERATION_FAILED"); err.code = r.code; throw err;
        }
        var errors = L.validateTaskOutput(r.value, checkBp, lang);
        if (errors.length === 0) {
          var v = r.value;
          return finish({ variables: v.variables, task_text: v.task_text, deliverable: v.deliverable, ai_mode: "claude" });
        }
        log({ op: "task_invalid", errors: errors, attempt: attempt });
        if (attempt < 3) return tryOnce();
        var e2 = new Error("TASK_GENERATION_FAILED"); e2.code = "invalid_output"; e2.details = errors; throw e2;
      });
    }
    return tryOnce();
  }

  // ---------------- defend-it questions ----------------

  function generateQuestions(bp, task, submission, lang) {
    var fallback = (bp.fallback_questions || {})[lang] || (lang === "ar"
      ? ["ما أهم قرار اتخذته في إجابتك، ولماذا؟", "ما الذي ستغيّره لو تغيّرت إحدى الوقائع في المهمة؟"]
      : ["What was the most important choice you made in your answer, and why?", "What would you change if one of the facts in the task were different?"]);
    var prompt = P.defendPrompt({ taskText: task.task_text, submission: submission, lang: lang });
    var attempt = 0;
    function tryOnce() {
      attempt++;
      return callJson(prompt, "quick").then(function (r) {
        if (!r.ok) {
          if (r.code === "mock") return { questions: fallback, source: "fallback_mock" };
          if (attempt < 3 && r.code !== "rate_limited") return tryOnce();
          return { questions: fallback, source: "fallback" }; // OQ-34 recommendation
        }
        var qs = r.value && r.value.questions;
        var ok = Array.isArray(qs) && qs.length === 2 && qs.every(function (q) {
          return typeof q === "string" && q.trim().length >= 5 && q.length <= 300 && L.isInLanguage(q, lang);
        });
        if (ok) return { questions: qs.map(function (q) { return q.trim(); }), source: "claude" };
        if (attempt < 3) return tryOnce();
        return { questions: fallback, source: "fallback" };
      });
    }
    return tryOnce();
  }

  // ---------------- grading ----------------

  function graderFacts(bp, task, lang) {
    return (task.facts || "") + "\nPlanted issue: " + bp.planted_issue;
  }

  function exampleBlocks(bp) {
    if (!bp.graded_examples || !bp.graded_examples.length) return null;
    return bp.graded_examples.map(function (ex) {
      var spec = fieldsSpec(bp.role, ex.lang);
      var scores = {};
      Object.keys(ex.scores).forEach(function (k) { scores[k] = ex.scores[k][0]; });
      return { label: ex.label, submission: L.buildSubmissionText(spec, ex.fields), followups: ex.followups, scores: scores, ownership: ex.ownership };
    });
  }

  // Built-in rules grader (used when Claude is not connected or unreachable).
  function mockRun(bp, submission, followups, salt, lang, task) {
    return rulesRun(bp, submission, followups, lang, task);
  }

  function oneRun(input, runNo) {
    var calls = 0;
    var history = [];
    function tryOnce(retryNote) {
      calls++;
      var prompt = P.gradePrompt(Object.assign({}, input.promptArgs, { retryNote: retryNote }));
      return callJson(prompt, "default").then(function (r) {
        if (!r.ok) {
          if (r.code === "mock") {
            var m = mockRun(input.bp, input.submission, input.followups, runNo, input.promptArgs.lang, input.task);
            return { run: m, calls: calls, ai_mode: "mock", history: history };
          }
          history.push({ call: calls, error: r.code });
          if (calls < MAX_CALLS_PER_RUN && r.code !== "rate_limited") return tryOnce(retryNote);
          return { failed: true, calls: calls, history: history };
        }
        var v = L.validateGradeRun(r.value, input.rubric, input.submission);
        if (v.ok) return { run: r.value, calls: calls, ai_mode: "claude", history: history };
        history.push({ call: calls, errors: v.errors });
        if (calls < MAX_CALLS_PER_RUN) {
          var note = v.quoteMisses
            ? "Your previous answer had evidence quotes that were not exact copies of the submission. Copy each quote character for character, or use \"\"."
            : "Your previous answer did not match the required format: " + v.errors.slice(0, 4).join("; ") + ".";
          return tryOnce(note);
        }
        return { failed: true, calls: calls, history: history };
      });
    }
    return tryOnce(null);
  }

  // attempt: {submission, followups, task, lang}
  function grade(bp, attempt) {
    var lang = attempt.lang;
    var rubric = bp.rubric.map(function (c) { return Object.assign({}, c, { name: criterionName(c, lang) }); });
    var input = {
      bp: bp, rubric: bp.rubric, submission: attempt.submission, followups: attempt.followups, task: attempt.task,
      promptArgs: {
        taskText: attempt.task.task_text + "\n" + (attempt.task.deliverable || ""),
        facts: graderFacts(bp, attempt.task, lang),
        rubric: rubric, submission: attempt.submission, followups: attempt.followups,
        examples: exampleBlocks(bp), lang: lang
      }
    };
    var started = Date.now();
    return Promise.all([oneRun(input, 1), oneRun(input, 2)]).then(function (two) {
      if (two[0].failed || two[1].failed) return { failed: true, runs: two, ms: Date.now() - started };
      var runs = [two[0].run, two[1].run];
      var meta = [two[0], two[1]];
      var third = L.needsThirdRun(runs[0], runs[1]) ? oneRun(input, 3) : Promise.resolve(null);
      return third.then(function (t3) {
        if (t3 && t3.failed) return { failed: true, runs: meta.concat([t3]), ms: Date.now() - started };
        if (t3) { runs.push(t3.run); meta.push(t3); }
        var final = L.combineRuns(runs, bp.rubric);
        var allRules = meta.every(function (m) { return m.ai_mode === "mock"; });
        if (allRules) final.runs_used = 1; // the rules grader is deterministic: one pass, reported honestly
        var ws = L.weightedScore(final.criteria, bp.rubric);
        var modes = meta.map(function (m) { return m.ai_mode; });
        return {
          failed: false,
          runs: runs,
          calls: meta.map(function (m) { return m.calls; }),
          final: final,
          W: ws.W,
          P: ws.P,
          level: L.levelFor(ws.P),
          ai_mode: modes.indexOf("mock") !== -1 ? "mock" : "claude",
          ms: Date.now() - started
        };
      });
    });
  }

  return {
    state: state,
    generateTask: generateTask,
    mockTask: mockTask,
    generateQuestions: generateQuestions,
    grade: grade,
    fieldsSpec: fieldsSpec,
    roleName: roleName,
    criterionName: criterionName
  };
}

var api = { createEngine: createEngine };
export default api;
