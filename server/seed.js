// Fictional demo data so Mahara opens with real-looking activity.
// Every person here is invented. Seeded records carry is_demo: true and show a "Demo data" chip in the UI.
import L from "../shared/logic.js";
import B from "../shared/blueprints.js";

var bp = B.VERIFIED.customer_support;
var DELIVERABLE = {
  en: "Write your reply to the customer, then a 2-line internal note to the logistics team.",
  ar: "اكتب ردّك على العميل، ثم ملاحظة داخلية من سطرين لفريق التوصيل."
};

function fieldsSpec(lang) { return B.FIELDS.customer_support.map(function (f) { return { key: f.key, label: f.label[lang] }; }); }

function makeTask(lang, orderId) {
  var vars = Object.assign({}, bp.mock_variables[lang], { order_id: orderId });
  var tpl = (bp.mock_template && bp.mock_template[lang]) || bp.scenario_template;
  return { variables: vars, task_text: L.fillTemplate(tpl, vars), deliverable: DELIVERABLE[lang], ai_mode: "seed", facts: vars.facts };
}


function sub(s, order) { return String(s).split("{order}").join(order); }

function fromExample(ex, order) {
  var fields = {};
  Object.keys(ex.fields).forEach(function (k) { fields[k] = sub(ex.fields[k], order).split("ZH-48213").join(order); });
  var scores = {};
  Object.keys(ex.scores).forEach(function (k) {
    var s = ex.scores[k];
    scores[k] = [s[0], sub(s[1], order), sub(s[2], order).split("ZH-48213").join(order)];
  });
  return { lang: ex.lang, fields: fields, followups: ex.followups, scores: scores, ownership: ex.ownership };
}

export function buildDemoData(now) {
  now = now || Date.now();
  var DAY = 86400000, HOUR = 3600000;
  var ex = bp.graded_examples;
  var people = [
    { key: "omar", name: "Omar Khalil", email: "omar.khalil@example.com", order: "ZH-48213", sample: fromExample(ex[0], "ZH-48213"), ago: 2 * DAY + 3 * HOUR, used: 412, tabs: 0, pastes: 0, shortlist: true },
    { key: "lina", name: "Lina Haddad", email: "lina.haddad@example.com", order: "ZH-48318", sample: fromExample(ex[1], "ZH-48318"), ago: 6 * HOUR, used: 236, tabs: 2, pastes: 2 },
    { key: "yazan", name: "Yazan Odeh", email: "yazan.odeh@example.com", order: "ZH-48466", sample: fromExample(ex[2], "ZH-48466"), ago: 3 * HOUR, used: 147, tabs: 0, pastes: 3, flag: "The candidate was very nervous at the start. Worth a second look before deciding." }
  ];

  var out = { invites: {}, attempts: {}, actions: {}, blueprints: {} };
  var codes = {};
  function code() { var c; do { c = L.makeSessionCode(); } while (codes[c]); codes[c] = true; return c; }

  people.forEach(function (p, i) {
    var s = p.sample, lang = s.lang;
    var task = makeTask(lang, p.order);
    var spec = fieldsSpec(lang);
    var submission = L.buildSubmissionText(spec, s.fields);
    var criteria = bp.rubric.map(function (rc) {
      var sc = s.scores[rc.id];
      if (sc[2] && !L.quoteFound(sc[2], submission)) throw new Error("Seed quote not found for " + p.key + "/" + rc.id + ": " + sc[2]);
      return { id: rc.id, score: sc[0], reason: sc[1], evidence_quote: sc[2] };
    });
    var ws = L.weightedScore(criteria, bp.rubric);
    var gradedAt = now - p.ago;
    var created = gradedAt - 25 * 60000;
    var started = created + 4 * 60000;
    var submitted = started + p.used * 1000;
    var invId = "inv_demo" + (i + 1), attId = "att_demo" + (i + 1);
    out.invites[invId] = {
      candidate_name: p.name, candidate_email: p.email, role: "customer_support", kind: "verified",
      session_code: code(), status: "completed", attempt_id: attId, created_at: created - 2 * HOUR, is_demo: true
    };
    var blocked = [];
    for (var k = 0; k < p.pastes; k++) blocked.push({ t_ms: 60000 + k * 45000, field: "reply" });
    out.attempts[attId] = {
      invite_id: invId, employer_id: "owner", role: "customer_support", kind: "verified",
      blueprint_id: bp.id, blueprint_family: bp.id, blueprint_version: bp.version, lang: lang,
      candidate_name: p.name, status: "graded", created_at: created, consent_at: created, is_demo: true,
      task: task, started_at: started, fields: s.fields, submission: submission, submitted_at: submitted,
      telemetry: { time_used_sec: p.used, blocked_paste_events: blocked, blocked_paste_count: blocked.length, tab_switches: p.tabs, auto_submitted: p.used >= 480, blocked_pastes_defend: 0 },
      followups: s.followups.map(function (f, j) {
        var shown = submitted + 20000 + j * 70000;
        return { text: f.q, shown_at: shown, answer: f.a, answered_at: shown + 42000, blocked_pastes: 0, timed_out: false };
      }),
      followups_source: "seed", defended_at: submitted + 160000,
      level: L.levelFor(ws.P), weighted_pct: ws.P,
      result: { criteria: criteria, ownership: s.ownership, runs_used: 2 },
      ai_mode: "seed", graded_at: gradedAt, grading_ms: 21000
    };
    if (p.shortlist) out.actions["sl_" + attId] = { attempt_id: attId, action: "shortlist", created_at: gradedAt + 30 * 60000 };
    if (p.flag) out.actions["flag_demo" + (i + 1)] = { attempt_id: attId, action: "flag", comment: p.flag, created_at: gradedAt + 15 * 60000 };
  });

  return out;
}
