/* Mahara core logic — pure functions, no DOM, no network.
   Runs in the page (window.MaharaLogic) and in Node tests (module.exports). */

var LEVELS = ["emerging", "job_ready", "strong"];
var TIME_LIMIT_SEC = 480;
var DEFEND_SEC = 60;
var SESSION_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0 O 1 I L

// ---------- text helpers ----------

// SC-06: Unicode NFC + collapse whitespace; no case folding, no diacritic stripping.
function normalizeForMatch(s) {
  return String(s == null ? "" : s).normalize("NFC").replace(/\s+/g, " ").trim();
}

function quoteFound(quote, submission) {
  var q = normalizeForMatch(quote);
  if (q === "") return true; // empty quote always passes
  return normalizeForMatch(submission).indexOf(q) !== -1;
}

// Share of Arabic-script letters among all letters (AI-GEN-03).
function arabicShare(text) {
  var letters = String(text || "").match(/\p{L}/gu) || [];
  if (letters.length === 0) return 0;
  var ar = letters.filter(function (ch) { return /\p{Script=Arabic}/u.test(ch); }).length;
  return ar / letters.length;
}

function isInLanguage(text, lang) {
  var share = arabicShare(text);
  return lang === "ar" ? share >= 0.6 : share <= 0.1;
}

// ---------- templates ----------

function placeholders(template) {
  var out = [];
  var re = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, m;
  while ((m = re.exec(String(template || "")))) {
    if (out.indexOf(m[1]) === -1) out.push(m[1]);
  }
  return out;
}

function fillTemplate(template, vars) {
  return String(template || "").replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, function (all, k) {
    return vars && vars[k] != null ? String(vars[k]) : all;
  });
}

// ---------- blueprint validation (FR-CFG-03/04, SCR-02a step 5) ----------

function validateBlueprint(bp, opts) {
  opts = opts || {};
  var errors = [];
  if (!bp || typeof bp !== "object") return ["Blueprint is missing."];
  if (!bp.scenario_template || !String(bp.scenario_template).trim()) errors.push("Scenario template is empty.");
  var ph = placeholders(bp.scenario_template);
  var vars = Array.isArray(bp.variables) ? bp.variables : [];
  if (ph.indexOf("facts") === -1) errors.push("The scenario template must include {facts}.");
  ph.forEach(function (p) { if (vars.indexOf(p) === -1) errors.push("Placeholder {" + p + "} is not listed in variables."); });
  vars.forEach(function (v) { if (ph.indexOf(v) === -1) errors.push("Variable \"" + v + "\" is not used in the template."); });
  if (!bp.planted_issue || !String(bp.planted_issue).trim()) errors.push("There must be exactly one planted issue.");
  if (bp.time_limit_sec !== TIME_LIMIT_SEC) errors.push("Time limit must be 480 seconds.");
  var rubric = Array.isArray(bp.rubric) ? bp.rubric : [];
  var minC = opts.custom ? 4 : 4, maxC = 5;
  if (rubric.length < minC || rubric.length > maxC) errors.push("Rubric needs 4 or 5 criteria (has " + rubric.length + ").");
  var ids = {};
  var sum = 0;
  rubric.forEach(function (c, i) {
    var label = c && c.name ? "\"" + c.name + "\"" : "criterion " + (i + 1);
    if (!c || !c.id || !/^[a-z][a-z0-9_]*$/.test(c.id)) errors.push("Criterion " + (i + 1) + " needs an id in lowercase letters, digits or underscores.");
    else if (ids[c.id]) errors.push("Criterion id \"" + c.id + "\" is used twice.");
    else ids[c.id] = true;
    var w = Number(c && c.weight);
    if (!(w > 0)) errors.push("Weight for " + label + " must be above 0.");
    else sum += w;
    var lv = (c && c.levels) || {};
    (opts.custom ? ["0", "2", "4"] : ["0", "4"]).forEach(function (k) {
      if (!lv[k] || !String(lv[k]).trim()) errors.push("Level " + k + " description missing for " + label + ".");
    });
  });
  if (rubric.length && Math.abs(sum - 1) > 0.001) errors.push("Weights must add up to 1.00 (now " + sum.toFixed(2) + ").");
  var markers = Array.isArray(bp.planted_markers) ? bp.planted_markers.filter(function (x) { return String(x || "").trim(); }) : [];
  if (opts.custom && (markers.length < 1 || markers.length > 3)) errors.push("Give 1 to 3 planted markers.");
  if (!opts.custom) {
    var ex = Array.isArray(bp.graded_examples) ? bp.graded_examples : [];
    if (ex.length !== 3) errors.push("Verified blueprints need exactly 3 graded examples.");
  }
  return errors;
}

function balanceWeights(rubric) {
  var n = rubric.length;
  if (!n) return rubric;
  var base = Math.floor(100 / n), extra = 100 - base * n;
  return rubric.map(function (c, i) {
    var copy = Object.assign({}, c);
    copy.weight = (base + (i < extra ? 1 : 0)) / 100;
    return copy;
  });
}

// ---------- task validation (AI-GEN-01..05) ----------

function validateTaskOutput(out, blueprint, lang) {
  var errors = [];
  if (!out || typeof out !== "object") return ["Output is not an object."];
  if (!out.variables || typeof out.variables !== "object") errors.push("variables missing");
  if (!out.task_text || !String(out.task_text).trim()) errors.push("task_text missing");
  if (!out.deliverable || !String(out.deliverable).trim()) errors.push("deliverable missing");
  if (errors.length) return errors;
  var expected = (blueprint.ai_variables || blueprint.variables || []).slice().sort();
  var got = Object.keys(out.variables).sort();
  expected.forEach(function (k) {
    if (got.indexOf(k) === -1 || !String(out.variables[k] || "").trim()) errors.push("variable " + k + " missing");
  });
  if (!isInLanguage(out.task_text, lang)) errors.push("task_text not in " + lang);
  var low = String(out.task_text).toLowerCase();
  ["rubric", "planted"].forEach(function (w) { if (low.indexOf(w) !== -1) errors.push("task_text mentions " + w); });
  var markers = blueprint.planted_markers && blueprint.planted_markers[lang];
  if (Array.isArray(blueprint.planted_markers)) markers = blueprint.planted_markers;
  if (markers && markers.length && out.variables.facts != null) {
    var facts = String(out.variables.facts).toLowerCase();
    var hit = markers.some(function (m) { return facts.indexOf(String(m).toLowerCase()) !== -1; });
    if (!hit) errors.push("planted issue marker not found in facts");
  }
  return errors;
}

// ---------- grading (FR-GRD, SC-*) ----------

function validateGradeRun(run, rubric, submission) {
  var errors = [];
  if (!run || typeof run !== "object") return { ok: false, errors: ["Grader output is not an object."], quoteMisses: 0 };
  var crit = Array.isArray(run.criteria) ? run.criteria : null;
  if (!crit) errors.push("criteria missing");
  var ids = rubric.map(function (c) { return c.id; });
  var seen = {};
  var quoteMisses = 0;
  (crit || []).forEach(function (c) {
    if (!c || ids.indexOf(c.id) === -1) { errors.push("unknown criterion " + (c && c.id)); return; }
    if (seen[c.id]) errors.push("duplicate criterion " + c.id);
    seen[c.id] = true;
    if (!Number.isInteger(c.score) || c.score < 0 || c.score > 4) errors.push("bad score for " + c.id);
    if (!c.reason || !String(c.reason).trim()) errors.push("reason missing for " + c.id);
    if (String(c.reason || "").length > 250) errors.push("reason too long for " + c.id);
    if (typeof c.evidence_quote !== "string") errors.push("evidence_quote missing for " + c.id);
    else if (!quoteFound(c.evidence_quote, submission)) { errors.push("quote not found for " + c.id); quoteMisses++; }
  });
  ids.forEach(function (id) { if (!seen[id]) errors.push("missing criterion " + id); });
  if (!Number.isInteger(run.ownership) || run.ownership < 0 || run.ownership > 4) errors.push("bad ownership");
  return { ok: errors.length === 0, errors: errors, quoteMisses: quoteMisses };
}

function scoreMap(run) {
  var m = {};
  run.criteria.forEach(function (c) { m[c.id] = c.score; });
  return m;
}

// FR-GRD-03: third run if any criterion differs by more than 1.
function needsThirdRun(r1, r2) {
  var a = scoreMap(r1), b = scoreMap(r2);
  return Object.keys(a).some(function (k) { return Math.abs(a[k] - b[k]) > 1; });
}

function median3(a, b, c) {
  return [a, b, c].sort(function (x, y) { return x - y; })[1];
}

// Combine 2 or 3 valid runs into the final result (SC-04, SC-05, SC-07, SC-09).
function combineRuns(runs, rubric) {
  var byId = runs.map(function (r) {
    var m = {};
    r.criteria.forEach(function (c) { m[c.id] = c; });
    return m;
  });
  var three = runs.length === 3;
  var criteria = rubric.map(function (rc) {
    var scores = byId.map(function (m) { return m[rc.id].score; });
    var final, sourceIdx;
    if (three) {
      final = median3(scores[0], scores[1], scores[2]);
      sourceIdx = scores.indexOf(final);
    } else {
      final = (scores[0] + scores[1]) / 2; // OQ-39 option A (mean)
      sourceIdx = 0; // reason and quote from run 1
    }
    var src = byId[sourceIdx][rc.id];
    return { id: rc.id, score: final, reason: src.reason, evidence_quote: src.evidence_quote };
  });
  var own = runs.map(function (r) { return r.ownership; });
  var ownership = three ? median3(own[0], own[1], own[2]) : (own[0] + own[1]) / 2;
  return { criteria: criteria, ownership: ownership, runs_used: runs.length };
}

// SC-03: weighted score W (0..4) and percentage P (internal only).
function weightedScore(finalCriteria, rubric) {
  var sumW = 0, W = 0;
  rubric.forEach(function (rc) {
    var f = finalCriteria.filter(function (c) { return c.id === rc.id; })[0];
    var w = Number(rc.weight);
    sumW += w;
    W += w * (f ? f.score : 0);
  });
  // integer arithmetic in hundredths to keep 50 and 80 exact (SC-03d)
  var P = Math.round((W / (4 * sumW)) * 1e6) / 1e4;
  return { W: Math.round(W * 1e6) / 1e6, P: P };
}

// SC-03b/c: Emerging < 50 <= Job-ready < 80 <= Strong
function levelFor(P) {
  if (P >= 80) return "strong";
  if (P >= 50) return "job_ready";
  return "emerging";
}

function levelRank(level) { return LEVELS.indexOf(level); }

// ---------- codes ----------

function randomInt(n, rng) {
  if (rng) return Math.floor(rng() * n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    var a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }
  return Math.floor(Math.random() * n);
}

function makeSessionCode(rng) {
  var s = "";
  for (var i = 0; i < 6; i++) s += SESSION_ALPHABET[randomInt(SESSION_ALPHABET.length, rng)];
  return s;
}

function formatSessionCode(code) {
  var c = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length === 6 ? c.slice(0, 3) + "-" + c.slice(3) : c;
}

function parseSessionCode(input) {
  return String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());
}

// ---------- invite lifecycle (FR-INV-04) ----------

var INVITE_TRANSITIONS = {
  invited: ["in_progress", "cancelled", "expired"],
  in_progress: ["completed", "grading_failed", "no_work"],
  grading_failed: ["completed", "grading_failed"],
  completed: [],
  no_work: [],
  cancelled: [],
  expired: []
};

function canTransition(from, to) {
  return (INVITE_TRANSITIONS[from] || []).indexOf(to) !== -1;
}

// OQ-54 proposal: refuse a new invite while one for the same email + role is unused.
function duplicateInvite(invites, email, roleKey, customId) {
  var e = String(email || "").trim().toLowerCase();
  return invites.filter(function (iv) {
    return iv.status === "invited" &&
      String(iv.candidate_email || "").toLowerCase() === e &&
      iv.role === roleKey && (iv.custom_blueprint_id || null) === (customId || null);
  })[0] || null;
}

// ---------- submissions ----------

// fieldsSpec: [{key, label}], values: {key: text}
function buildSubmissionText(fieldsSpec, values) {
  return fieldsSpec.map(function (f) {
    return "[" + f.label + "]\n" + String((values && values[f.key]) || "").trim();
  }).join("\n\n");
}

function isEmptySubmission(values) {
  return !Object.keys(values || {}).some(function (k) { return String(values[k] || "").trim() !== ""; });
}

// ---------- telemetry ----------

function summarizeTelemetry(t) {
  t = t || {};
  var task = Array.isArray(t.blocked_paste_events) ? t.blocked_paste_events.length : (t.blocked_paste_count || 0);
  return {
    time_used_sec: Math.max(0, Math.min(TIME_LIMIT_SEC, Math.round(t.time_used_sec || 0))),
    blocked_pastes_task: task,
    blocked_pastes_defend: t.blocked_pastes_defend || 0,
    tab_switches: t.tab_switches || 0,
    auto_submitted: !!t.auto_submitted
  };
}

function formatMMSS(sec) {
  sec = Math.max(0, Math.round(sec));
  var m = Math.floor(sec / 60), s = sec % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function remainingSec(startedAtMs, nowMs, limitSec) {
  var limit = limitSec || TIME_LIMIT_SEC;
  return Math.max(0, Math.min(limit, Math.ceil(((startedAtMs + limit * 1000) - nowMs) / 1000)));
}

// ---------- results list (FR-RES-01/02) ----------

function filterAndSortResults(results, f) {
  f = f || {};
  var min = f.minLevel ? levelRank(f.minLevel) : 0;
  return results.filter(function (r) {
    if (!r.level) return false;
    if (f.role && f.role !== "all" && r.role_filter_key !== f.role) return false;
    if (f.lang && f.lang !== "all" && r.lang !== f.lang) return false;
    if (f.kind && f.kind !== "all" && r.kind !== f.kind) return false;
    return levelRank(r.level) >= min;
  }).sort(function (a, b) {
    var d = levelRank(b.level) - levelRank(a.level);
    if (d) return d;
    return (b.graded_at || 0) - (a.graded_at || 0);
  });
}

var api = {
  LEVELS: LEVELS, TIME_LIMIT_SEC: TIME_LIMIT_SEC, DEFEND_SEC: DEFEND_SEC, SESSION_ALPHABET: SESSION_ALPHABET,
  normalizeForMatch: normalizeForMatch, quoteFound: quoteFound, arabicShare: arabicShare, isInLanguage: isInLanguage,
  placeholders: placeholders, fillTemplate: fillTemplate, validateBlueprint: validateBlueprint, balanceWeights: balanceWeights,
  validateTaskOutput: validateTaskOutput, validateGradeRun: validateGradeRun, needsThirdRun: needsThirdRun,
  median3: median3, combineRuns: combineRuns, weightedScore: weightedScore, levelFor: levelFor, levelRank: levelRank,
  makeSessionCode: makeSessionCode, formatSessionCode: formatSessionCode, parseSessionCode: parseSessionCode,
  isValidEmail: isValidEmail, canTransition: canTransition, duplicateInvite: duplicateInvite,
  buildSubmissionText: buildSubmissionText,
  isEmptySubmission: isEmptySubmission, summarizeTelemetry: summarizeTelemetry, formatMMSS: formatMMSS,
  remainingSec: remainingSec, filterAndSortResults: filterAndSortResults
};
export default api;
