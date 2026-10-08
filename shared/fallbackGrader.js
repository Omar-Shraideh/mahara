/* Mahara built-in rules grader.
   Used only when Claude is not connected (no ANTHROPIC_API_KEY) or cannot be reached.
   It reads the candidate's actual reply and internal note and checks them against the
   Customer Support rubric: apology and acknowledgement, a concrete next step with timing,
   use of the order facts (above all the attempted delivery), length, and whether the note
   names the issue and an owner. Every evidence quote is an exact span of the submission,
   so it passes the same quote check as Claude's output. The UI labels these results. */
import L from "./logic.js";

var WORDS = {
  en: {
    apology: /\b(sorry|apolog\w*|regret\w*)\b/i,
    feel: /\b(understand|frustrat\w*|i know|counting on|inconvenien\w*|disappoint\w*|upset)\b/i,
    blame: /(not our fault|isn'?t our fault|courier'?s fault|nothing we can do|blame the courier|delays happen)/i,
    action: /\b(book\w*|rebook\w*|arrang\w*|schedul\w*|resend\w*|re-?deliver\w*|deliver\w*|collect\w*|pick ?up|refund\w*|replac\w*|call you|contact you|send (it|the parcel|your order))\b/i,
    timing: /\b(today|tomorrow|tonight|this (morning|afternoon|evening)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(:\d{2})?\s?(am|pm)|between \d|within \d+|by \d|\d{1,2} (january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec))\b/i,
    vague: /(as soon as possible|\basap\b|\bsoon\b|shortly|look into it|we will check)/i,
    attempt: /(attempt\w*|tried to deliver|tried delivering|tried to reach|couldn'?t reach|could not reach|missed (the )?(call|delivery)|failed delivery|no one answered|nobody answered)/i,
    detail: /(\b\d{1,2}:\d{2}\b|\bdepot\b|\bwarehouse\b|\b\d{1,2} (october|oct)\b)/i,
    owner: /\b(team|depot|courier|logistics|driver|dispatch|warehouse|manager|supervisor|ops|operations)\b/i,
    issue: /\b(fail\w*|attempt\w*|missed|unreachable|no answer|late|delay\w*|rebook\w*|return\w*|redeliver\w*)\b/i,
    sentence: /[^.!?\n]+[.!?]?/g
  },
  ar: {
    apology: /(نعتذر|أعتذر|اعتذر|آسف|آسفين|نأسف|عذراً|عذرا|اعتذار)/,
    feel: /(نفهم|أفهم|انزعاج|إزعاج|نقدّر|نقدر|معك حق|ندرك|أدرك)/,
    blame: /(ليس خطأنا|مش ذنبنا|ليس ذنبنا|مش غلطتنا|الخطأ من شركة التوصيل|ليست مسؤوليتنا)/,
    action: /(حجزت|حجزنا|سنرسل|سنعيد|نعيد|إعادة التوصيل|إعادة إرسال|توصيل جديد|سيتصل|سنتصل|استلام|تستلم|استرداد|استبدال|نرسل|سأرسل|رتبت|رتّبت)/,
    timing: /(اليوم|غداً|غدا|بكرة|الساعة|بين|خلال \d|مساءً|مساء|صباحاً|صباحا|\d{1,2}:\d{2})/,
    vague: /(في أقرب وقت|قريباً|قريبا|بأسرع وقت|سنتابع|سنراجع)/,
    attempt: /(محاولة|حاول|حاولت|محاولته|لم يرد|ما رد|لم نتمكن من الوصول|لم يتمكن)/,
    detail: /(\d{1,2}:\d{2}|مستودع|تلاع العلي|\d{1,2} تشرين)/,
    owner: /(فريق|مستودع|شركة التوصيل|السائق|المدير|المشرف|قسم|العمليات)/,
    issue: /(فشل|محاولة|لم يرد|تأخر|متأخر|إعادة|التسليم)/,
    sentence: /[^.!?؟،\n]+[.!?؟]?/g
  }
};

var REASONS = {
  en: {
    empathy: ["Shifts blame or dismisses the customer instead of acknowledging the problem.",
      "Answers without acknowledging how the customer feels about the delay.",
      "Polite apology, but nothing specific to this customer's situation.",
      "Apologises and refers to the specific order or delay.",
      "Acknowledges the specific frustration and refers to this customer's own order."],
    resolution: ["Offers no next step beyond asking the customer to wait.",
      "Mentions the problem but gives no clear next step.",
      "Promises to help but gives no concrete step or time.",
      "Gives a concrete next step, but no time the customer can rely on.",
      "Gives a concrete next step with a clear time or date."],
    accuracy: ["No reply to check against the order facts.",
      "Puts the delay on someone else without using the delivery record.",
      "Does not mention the attempted delivery recorded in the facts.",
      "Mentions the attempted delivery but leaves out other key facts.",
      "Uses the order facts correctly, including the attempted delivery."],
    clarity: ["No reply was written.",
      "Too long to follow quickly for a customer message.",
      "Very short, so the customer gets little to act on.",
      "Clear and well ordered, though slightly long for a chat reply.",
      "Short, clear and easy to follow."],
    clarity_long2: "Long for a customer message, so the key points are harder to find.",
    escalation: ["No internal note was written.",
      "The note does not say what went wrong or who should act.",
      "The note mentions the order but not the failed delivery or who should act.",
      "The note names the issue but the owner is unclear.",
      "The note names the issue and the team that should act."],
    escalation_owner2: "The note names a team but not what went wrong."
  },
  ar: {
    empathy: ["يُلقي اللوم أو يتجاهل العميل بدل الاعتراف بالمشكلة.",
      "يرد دون الاعتراف بشعور العميل تجاه التأخير.",
      "اعتذار مهذب لكنه عام ولا يخص حالة هذا العميل.",
      "يعتذر ويشير إلى الطلب أو التأخير المحدد.",
      "يعترف بانزعاج العميل تحديداً ويشير إلى طلبه بعينه."],
    resolution: ["لا يقدّم خطوة تالية سوى طلب الانتظار.",
      "يذكر المشكلة دون خطوة تالية واضحة.",
      "يعد بالمساعدة دون خطوة محددة أو موعد.",
      "يقدّم خطوة محددة لكن دون موعد يمكن الاعتماد عليه.",
      "يقدّم خطوة محددة مع موعد أو وقت واضح."],
    accuracy: ["لا يوجد رد لمقارنته بوقائع الطلب.",
      "يُحمّل جهة أخرى مسؤولية التأخير دون استخدام سجل التوصيل.",
      "لا يذكر محاولة التسليم الواردة في الوقائع.",
      "يذكر محاولة التسليم لكنه يُغفل وقائع مهمة أخرى.",
      "يستخدم وقائع الطلب بشكل صحيح بما فيها محاولة التسليم."],
    clarity: ["لم يُكتب أي رد.",
      "طويل جداً بحيث يصعب على العميل متابعته بسرعة.",
      "قصير جداً فلا يجد العميل ما يبني عليه.",
      "واضح ومرتب وإن كان طويلاً قليلاً لرسالة دردشة.",
      "قصير وواضح وسهل المتابعة."],
    clarity_long2: "طويل لرسالة عميل، فيصعب العثور على النقاط الأساسية.",
    escalation: ["لم تُكتب ملاحظة داخلية.",
      "الملاحظة لا تذكر ما حدث ولا من يجب أن يتصرف.",
      "الملاحظة تذكر الطلب لكن ليس فشل التسليم أو الجهة المسؤولة.",
      "الملاحظة تحدد المشكلة لكن الجهة المسؤولة غير واضحة.",
      "الملاحظة تحدد المشكلة والفريق الذي يجب أن يتصرف."],
    escalation_owner2: "الملاحظة تذكر فريقاً لكن لا تذكر ما الذي حدث."
  }
};

// Split "[Label]\ntext\n\n[Label]\ntext" back into the field texts, in field order.
function sections(submission) {
  var out = [];
  var re = /^\[[^\]\n]+\]\n/gm, m, last = null;
  while ((m = re.exec(submission))) {
    if (last) out.push(submission.slice(last.end, m.index).replace(/\s+$/, ""));
    last = { end: m.index + m[0].length };
  }
  if (last) out.push(submission.slice(last.end).replace(/\s+$/, ""));
  if (!out.length) out.push(submission);
  return out;
}

function wordCount(s) { return (String(s || "").match(/[\p{L}\p{N}]+/gu) || []).length; }

// An exact, short span of `text` around the first match of `re` (or "" if none).
function quoteAround(text, re, maxWords) {
  if (!text) return "";
  var m = re.exec(text);
  re.lastIndex = 0;
  if (!m) return "";
  var start = m.index, end = m.index + m[0].length;
  var stops = /[.!?؟\n]/;
  while (start > 0 && !stops.test(text.charAt(start - 1))) start--;
  while (end < text.length && !stops.test(text.charAt(end))) end++;
  var span = text.slice(start, end).trim();
  var words = span.split(/\s+/);
  var limit = maxWords || 14;
  if (words.length > limit) {
    // keep a window of words around the match, sliced from the original text so it stays exact
    var rel = text.slice(start, m.index).trim().split(/\s+/).filter(Boolean).length;
    var from = Math.max(0, Math.min(rel - 3, words.length - limit));
    var piece = words.slice(from, from + limit).join(" ");
    var idx = text.indexOf(piece);
    span = idx >= 0 ? piece : m[0];
  }
  return span;
}

// The first sentence that matches every regex in `all`; quote around the first regex inside it.
function quoteInSentence(text, all, maxWords, none) {
  var re = /[^.!?؟\n]+[.!?؟]?/g, m;
  while ((m = re.exec(text))) {
    var sent = m[0];
    if (all.every(function (r) { return r.test(sent); }) && !(none || []).some(function (r) { return r.test(sent); })) return quoteAround(sent, all[0], maxWords);
  }
  return "";
}

export function rulesRun(bp, submission, followups, lang, task) {
  lang = lang === "ar" ? "ar" : "en";
  var W = WORDS[lang], R = REASONS[lang];
  var parts = sections(String(submission || ""));
  var reply = parts[0] || "", note = parts[1] || "";
  var orderId = task && task.variables && task.variables.order_id ? String(task.variables.order_id) : "";
  var specific = (orderId && reply.indexOf(orderId) !== -1) || /(\b\d+\s*days?\b|\d+\s*(أيام|يوم)|(أربعة|أربع) أيام|four days)/i.test(reply);
  var blame = W.blame.test(reply);
  var has = function (re, s) { re.lastIndex = 0; return re.test(s); };
  var replyWords = wordCount(reply);
  var crit = [];

  // empathy
  var e;
  if (!replyWords) e = 0;
  else if (blame) e = 0;
  else e = Math.min(4, 1 + (has(W.apology, reply) ? 1 : 0) + (has(W.feel, reply) ? 1 : 0) + (specific ? 1 : 0));
  crit.push({ id: "empathy", score: e, reason: R.empathy[e], evidence_quote: e ? quoteAround(reply, has(W.feel, reply) ? W.feel : W.apology) : quoteAround(reply, W.blame) });

  // resolution
  var action = has(W.action, reply), timing = has(W.timing, reply), vague = has(W.vague, reply);
  var r;
  if (!replyWords) r = 0;
  else if (action && timing) r = 4;
  else if (vague) r = 2;
  else if (action) r = 3;
  else if (blame) r = 0;
  else r = 1;
  var rq = r === 4 ? (quoteInSentence(reply, [W.action, W.timing], 14, [W.attempt]) || quoteInSentence(reply, [W.action, W.timing]) || quoteAround(reply, W.action))
    : r === 3 ? quoteAround(reply, W.action) : r === 2 ? quoteAround(reply, W.vague) : "";
  crit.push({ id: "resolution", score: r, reason: R.resolution[r], evidence_quote: rq });

  // accuracy
  var attempt = has(W.attempt, reply) || has(W.attempt, note);
  var detail = has(W.detail, reply) || (orderId && reply.indexOf(orderId) !== -1);
  var a;
  if (!replyWords) a = 0;
  else if (attempt && detail) a = 4;
  else if (attempt) a = 3;
  else if (blame) a = 1;
  else a = 2;
  crit.push({ id: "accuracy", score: a, reason: R.accuracy[a], evidence_quote: attempt ? quoteAround(has(W.attempt, reply) ? reply : note, W.attempt) : (blame ? quoteAround(reply, W.blame) : "") });

  // clarity
  var c, creason;
  if (!replyWords) c = 0;
  else if (replyWords < 15) c = 2;
  else if (replyWords <= 90) c = 4;
  else if (replyWords <= 160) c = 3;
  else if (replyWords <= 260) { c = 2; creason = R.clarity_long2; }
  else c = 1;
  crit.push({ id: "clarity", score: c, reason: creason || R.clarity[c], evidence_quote: "" });

  // escalation
  var noteWords = wordCount(note);
  var issue = noteWords && (has(W.issue, note) || (orderId && note.indexOf(orderId) !== -1));
  var owner = noteWords && has(W.owner, note);
  var esc, ereason;
  if (!noteWords) esc = 0;
  else if (issue && owner) esc = 4;
  else if (issue) esc = 2;
  else if (owner) { esc = 2; ereason = R.escalation_owner2; }
  else esc = 1;
  crit.push({ id: "escalation", score: esc, reason: ereason || R.escalation[esc], evidence_quote: esc >= 2 ? quoteAround(note, owner ? W.owner : W.issue) : "" });

  // keep only criteria the blueprint actually has, in rubric order
  var byId = {};
  crit.forEach(function (x) { byId[x.id] = x; });
  var criteria = bp.rubric.map(function (rc) {
    var x = byId[rc.id] || { id: rc.id, score: 2, reason: lang === "ar" ? "قُيّم وفق وصف المستوى." : "Scored against the level description.", evidence_quote: "" };
    // guarantee the quote check: drop any quote that is not an exact span
    if (x.evidence_quote && !L.quoteFound(x.evidence_quote, submission)) x.evidence_quote = "";
    if (x.reason.length > 200) x.reason = x.reason.slice(0, 197) + "...";
    return x;
  });

  // ownership: do the two answers engage with their own submission?
  var answers = (followups || []).map(function (f) { return String(f.a || "").trim(); });
  var ansText = answers.join(" ");
  var len = ansText.length;
  var own = len < 20 ? 0 : len < 60 ? 1 : len < 140 ? 2 : len < 240 ? 3 : 4;
  if (own > 0) {
    var subWords = {};
    (String(submission).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []).forEach(function (w) { subWords[w] = true; });
    var aw = ansText.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || [];
    var overlap = aw.filter(function (w) { return subWords[w]; }).length / Math.max(1, aw.length);
    if (lang === "en" && overlap < 0.08 && own > 1) own -= 1; // Arabic answers are often in dialect, so word overlap is not a fair signal
    if (answers.filter(Boolean).length < 2 && own > 2) own = 2;
  }
  return { criteria: criteria, ownership: own };
}

export default { rulesRun: rulesRun };
