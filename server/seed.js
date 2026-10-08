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

// Two extra hand-written samples (fictional) so the results list shows a realistic spread.
var EXTRA = {
  hala: {
    lang: "en",
    fields: {
      reply: "Hi Rana,\nI'm really sorry about the wait on order {order}. I checked and the courier tried to deliver it on 4 October but couldn't reach you, so it's now at our depot. We'll arrange another delivery soon and I'll keep you updated.\nThanks for your patience,\nHala",
      note: "{order} delivery attempt failed on 4 Oct, customer unreachable. Please rebook."
    },
    followups: [
      { q: "Why did you mention the courier's attempt in your reply?", a: "Because the record shows they came on the 4th, so I wanted her to know the parcel isn't lost and it's at the depot, without saying it was her fault." },
      { q: "What would you change if the customer said she was home all day on the 4th?", a: "I'd apologise again, believe her, and ask the depot to check with the driver. I'd also offer to deliver at a time she chooses." }
    ],
    scores: {
      empathy: [3, "Apologises for the wait on this specific order, but does not acknowledge why it matters to her.", "I'm really sorry about the wait on order {order}"],
      resolution: [2, "Promises another delivery but gives no date or time the customer can plan around.", "We'll arrange another delivery soon"],
      accuracy: [4, "Uses the attempted delivery and the depot from the order facts.", "the courier tried to deliver it on 4 October but couldn't reach you"],
      clarity: [4, "Short and easy to follow.", ""],
      escalation: [3, "The note names the failed attempt but not which team should rebook.", "delivery attempt failed on 4 Oct, customer unreachable"]
    },
    ownership: 3
  },
  sara: {
    lang: "ar",
    fields: {
      reply: "مرحباً،\nنعتذر عن تأخر طلبك {order}. حسب سجل التوصيل، حاول السائق تسليم الطلب يوم 4 تشرين الأول ولم يتمكن من الوصول إليك. سنتواصل معك قريباً لتحديد موعد جديد.\nشكراً لتفهمك",
      note: "الطلب {order} لم يُسلَّم بسبب عدم الرد. يرجى المتابعة."
    },
    followups: [
      { q: "لماذا لم تحدد موعداً جديداً للتوصيل في ردّك؟", a: "ما كنت متأكدة من الموعد المتاح، فما حبيت أوعد بشي ما بقدر ألتزم فيه." },
      { q: "ماذا ستفعل لو اتصلت العميلة وقالت إنها تحتاج الطلب اليوم؟", a: "بحكي مع المستودع إذا في سائق متاح اليوم، وإذا لا بعرض عليها تستلمه بنفسها من المستودع." }
    ],
    scores: {
      empathy: [2, "اعتذار مهذب لكنه لا يعترف بانزعاج العميلة تحديداً.", "نعتذر عن تأخر طلبك {order}"],
      resolution: [2, "يعد بالتواصل قريباً دون موعد أو خطوة محددة.", "سنتواصل معك قريباً لتحديد موعد جديد"],
      accuracy: [4, "يذكر محاولة التسليم الواردة في سجل التوصيل بشكل صحيح.", "حاول السائق تسليم الطلب يوم 4 تشرين الأول"],
      clarity: [4, "رد قصير وواضح.", ""],
      escalation: [2, "الملاحظة تذكر المشكلة لكن لا تحدد الفريق المسؤول.", "يرجى المتابعة"]
    },
    ownership: 2
  }
};

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
    { key: "noor", name: "Noor Abbadi", email: "noor.abbadi@example.com", order: "ZH-48245", sample: fromExample(bp.demo_ar, "ZH-48245"), ago: 1 * DAY + 5 * HOUR, used: 455, tabs: 0, pastes: 1, shortlist: true },
    { key: "hala", name: "Hala Saleh", email: "hala.saleh@example.com", order: "ZH-48377", sample: fromExample(EXTRA.hala, "ZH-48377"), ago: 1 * DAY + 1 * HOUR, used: 388, tabs: 1, pastes: 0 },
    { key: "sara", name: "Sara Nasser", email: "sara.nasser@example.com", order: "ZH-48502", sample: fromExample(EXTRA.sara, "ZH-48502"), ago: 20 * HOUR, used: 301, tabs: 0, pastes: 0 },
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

  // Upcoming and cancelled invites, so the Invites tab shows a working pipeline.
  out.invites.inv_demo7 = { candidate_name: "Dana Majali", candidate_email: "dana.majali@example.com", role: "customer_support", kind: "verified", session_code: code(), status: "invited", attempt_id: null, created_at: now - 40 * 60000, is_demo: true };
  out.invites.inv_demo8 = { candidate_name: "Tariq Hijazi", candidate_email: "tariq.hijazi@example.com", role: "customer_support", kind: "verified", session_code: code(), status: "invited", attempt_id: null, created_at: now - 26 * HOUR, is_demo: true };
  out.invites.inv_demo9 = { candidate_name: "Rawan Qudah", candidate_email: "rawan.qudah@example.com", role: "customer_support", kind: "verified", session_code: code(), status: "cancelled", attempt_id: null, created_at: now - 3 * DAY, cancelled_at: now - 2 * DAY, is_demo: true };
  return out;
}
