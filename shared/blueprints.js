/* Mahara verified blueprints.
   support-late-delivery: scenario, planted issue and rubric from the product brief (B§7.1).
   Customer Support is the only role. Graded examples are drafts written by Claude and need founder review (DEC-05). */

var ROLES = {
  customer_support: { en: "Customer Support Agent", ar: "موظف خدمة العملاء" }
};

var PREVIEWS = {
  customer_support: {
    en: "Reply to an upset customer about a late delivery, then write a two-line note to the logistics team.",
    ar: "ردّ على عميل منزعج من تأخر طلبه، ثم اكتب ملاحظة من سطرين لفريق التوصيل."
  }
};

// Input fields per role (OQ-21: labelled fields)
var FIELDS = {
  customer_support: [
    { key: "reply", label: { en: "Reply to the customer", ar: "الرد على العميل" }, rows: 9 },
    { key: "note", label: { en: "Internal note to logistics (2 lines)", ar: "ملاحظة داخلية لفريق التوصيل (سطران)" }, rows: 3 }
  ]
};

var CRITERIA_NAMES = {
  empathy: { en: "Tone and empathy", ar: "النبرة والتعاطف" },
  resolution: { en: "Resolves the actual issue", ar: "حلّ المشكلة الفعلية" },
  accuracy: { en: "Accuracy against order facts", ar: "الدقة في وقائع الطلب" },
  clarity: { en: "Clarity", ar: "الوضوح" },
  escalation: { en: "Correct escalation", ar: "التصعيد الصحيح" }
};

// ------------------------------------------------------------------
// 1. Customer Support — from the brief (rubric weights and levels 0/2/4 as written).
// ------------------------------------------------------------------
var support = {
  id: "support-late-delivery",
  role: "customer_support",
  kind: "verified",
  status: "approved",
  version: 1,
  draft: false,
  examples_draft: true,
  time_limit_sec: 480,
  scenario_template: "A customer of {company}, an online {store_type} in Amman, writes angrily that order {order_id} is {days_late} days late. Facts: {facts}.",
  mock_template: { ar: "كتب عميل لـ {company}، وهو {store_type} إلكتروني في عمّان، رسالة غاضبة يقول فيها إن الطلب {order_id} متأخر {days_late} أيام. الوقائع: {facts}." },
  variables: ["company", "store_type", "order_id", "days_late", "facts"],
  planted_issue: "The facts show the courier already attempted delivery once.",
  planted_markers: {
    en: ["attempt", "tried to deliver", "tried delivering"],
    ar: ["محاولة", "حاول", "حاولت", "محاولته"]
  },
  rubric: [
    { id: "empathy", weight: 0.2, levels: { "0": "Dismissive or rude", "2": "Polite but generic", "4": "Acknowledges the specific frustration" } },
    { id: "resolution", weight: 0.3, levels: { "0": "No next step", "2": "Vague promise", "4": "Concrete next step with timing" } },
    { id: "accuracy", weight: 0.2, levels: { "0": "Contradicts the facts", "2": "Misses the attempted delivery", "4": "Uses the facts correctly" } },
    { id: "clarity", weight: 0.15, levels: { "0": "Hard to follow", "4": "Short and clear" } },
    { id: "escalation", weight: 0.15, levels: { "0": "No internal note", "4": "Note names the issue and the owner" } }
  ],
  mock_variables: {
    en: { company: "Zahra Home", store_type: "homeware store", order_id: "ZH-48213", days_late: "4", facts: "Ordered on 2 October with 2-day delivery. Courier record: delivery attempted on 4 October at 11:40, nobody answered the phone. The parcel is back at the Tla' Al-Ali depot" },
    ar: { company: "بيت زهرة", store_type: "متجر أدوات منزلية", order_id: "ZH-48213", days_late: "4", facts: "تم الطلب في 2 تشرين الأول مع توصيل خلال يومين. سجل شركة التوصيل: تمت محاولة التسليم في 4 تشرين الأول الساعة 11:40 ولم يرد أحد على الهاتف. الطرد الآن في مستودع تلاع العلي" }
  },
  fallback_questions: {
    en: ["Which part of your reply did you write first, and why?", "What would you change in your reply if the courier had never tried to deliver?"],
    ar: ["أي جزء من ردّك كتبته أولاً، ولماذا؟", "ما الذي ستغيّره في ردّك لو لم تحاول شركة التوصيل التسليم أصلاً؟"]
  },
  graded_examples: [
    {
      label: "strong", lang: "en", draft: true,
      task_text: "A customer of Zahra Home, an online homeware store in Amman, writes angrily that order ZH-48213 is 4 days late. Facts: Ordered on 2 October with 2-day delivery. Courier record: delivery attempted on 4 October at 11:40, nobody answered the phone. The parcel is back at the Tla' Al-Ali depot.",
      fields: {
        reply: "Dear Rana,\nI'm sorry your order ZH-48213 is now four days late, I know you were counting on it this week. I checked the courier record: our driver tried to deliver on 4 October at 11:40 but couldn't reach you by phone, so the parcel went back to our Tla' Al-Ali depot. I've booked a new delivery for tomorrow, 7 October, between 4 and 7 pm, and the driver will call 30 minutes before arriving. If that time doesn't suit you, reply with a better slot or collect it from the depot any day until 9 pm.\nBest regards,\nOmar, Zahra Home support",
        note: "ZH-48213: failed delivery 4 Oct (customer unreachable). Rebooked 7 Oct 4-7 pm; Tla' Al-Ali depot team please confirm and make sure the driver calls ahead."
      },
      followups: [
        { q: "Why did you offer a delivery window instead of an exact time?", a: "Because the driver's route changes during the day, a 3 hour window is something we can actually keep, and the call 30 minutes before fixes the problem from last time when she didn't answer." },
        { q: "What would you change if the courier had never tried to deliver?", a: "Then it's our fault, so I'd apologise for our mistake directly, not mention a missed call, and offer free delivery or a small discount, and the note would go to the courier manager about the missed order." }
      ],
      scores: {
        empathy: [4, "The reply names the four-day delay and acknowledges that she needed it this week.", "I know you were counting on it this week"],
        resolution: [4, "Gives a concrete redelivery date and time window plus a pickup alternative.", "I've booked a new delivery for tomorrow, 7 October, between 4 and 7 pm"],
        accuracy: [4, "Uses the attempted delivery and depot facts correctly.", "our driver tried to deliver on 4 October at 11:40"],
        clarity: [3, "Clear and well ordered, though slightly long for a chat reply.", ""],
        escalation: [4, "The note names the failed delivery, the new slot and the depot team as owner.", "Tla' Al-Ali depot team please confirm"]
      },
      ownership: 4
    },
    {
      label: "middle", lang: "en", draft: true,
      task_text: "A customer of Zahra Home, an online homeware store in Amman, writes angrily that order ZH-48213 is 4 days late. Facts: Ordered on 2 October with 2-day delivery. Courier record: delivery attempted on 4 October at 11:40, nobody answered the phone. The parcel is back at the Tla' Al-Ali depot.",
      fields: {
        reply: "Hello,\nWe apologise for the delay in your order. We will look into it and make sure it is delivered as soon as possible. Thank you for your patience.\nZahra Home",
        note: "Customer is complaining about late order ZH-48213, please check."
      },
      followups: [
        { q: "Why didn't you give the customer a delivery date?", a: "I didn't know the date yet so I didn't want to promise." },
        { q: "What would you change if the parcel had already been delivered to a neighbour?", a: "I would tell her to check with the neighbour." }
      ],
      scores: {
        empathy: [2, "Polite apology but nothing specific to this customer's frustration.", "We apologise for the delay in your order"],
        resolution: [2, "Promises delivery as soon as possible with no concrete step or time.", "make sure it is delivered as soon as possible"],
        accuracy: [2, "Does not mention the attempted delivery or where the parcel is.", ""],
        clarity: [4, "Short and easy to read.", ""],
        escalation: [2, "The note names the order but not the failed delivery or who should act.", "please check"]
      },
      ownership: 2
    },
    {
      label: "weak", lang: "en", draft: true,
      task_text: "A customer of Zahra Home, an online homeware store in Amman, writes angrily that order ZH-48213 is 4 days late. Facts: Ordered on 2 October with 2-day delivery. Courier record: delivery attempted on 4 October at 11:40, nobody answered the phone. The parcel is back at the Tla' Al-Ali depot.",
      fields: {
        reply: "Delays happen because of the courier company, it is not our fault. Please wait.",
        note: ""
      },
      followups: [
        { q: "Why did you say the delay was the courier's fault?", a: "because its usually the courier" },
        { q: "What would you do if the customer replied that she was home all day?", a: "tell her to wait" }
      ],
      scores: {
        empathy: [0, "Dismissive and shifts blame instead of acknowledging the customer.", "it is not our fault"],
        resolution: [0, "No next step beyond asking the customer to wait.", "Please wait."],
        accuracy: [1, "Blames the courier without using the record of the attempted delivery.", "Delays happen because of the courier company"],
        clarity: [2, "Short but unhelpful and abrupt.", ""],
        escalation: [0, "No internal note was written.", ""]
      },
      ownership: 1
    }
  ],
  demo_ar: {
    lang: "ar",
    task_text: "كتب عميل لمتجر بيت زهرة، وهو متجر أدوات منزلية إلكتروني في عمّان، رسالة غاضبة يقول فيها إن الطلب ZH-48213 متأخر 4 أيام. الوقائع: تم الطلب في 2 تشرين الأول مع توصيل خلال يومين. سجل شركة التوصيل: تمت محاولة التسليم في 4 تشرين الأول الساعة 11:40 ولم يرد أحد على الهاتف. الطرد الآن في مستودع تلاع العلي.",
    fields: {
      reply: "مرحباً أستاذة رنا،\nنعتذر جداً عن تأخر طلبك ZH-48213 أربعة أيام، ونفهم انزعاجك. راجعت سجل التوصيل ووجدت أن السائق حاول التسليم يوم 4 تشرين الأول الساعة 11:40 ولم يتمكن من الوصول إليك هاتفياً، فرجع الطرد إلى مستودع تلاع العلي. حجزت لك توصيلاً جديداً غداً بين الساعة 4 و7 مساءً، وسيتصل بك السائق قبل وصوله.\nمع التحية، فريق خدمة العملاء",
      note: "الطلب ZH-48213: فشل التسليم في 4/10 لعدم الرد. أرجو من فريق مستودع تلاع العلي تأكيد موعد الغد."
    },
    followups: [
      { q: "لماذا اخترت أن تذكر محاولة التسليم في ردّك؟", a: "عشان العميلة تعرف إنه في محاولة صارت وما نكون عم نتهرب، وبنفس الوقت ما ألومها، بس أوضح شو صار." },
      { q: "ماذا ستفعل لو قالت العميلة إنها كانت في البيت طوال اليوم؟", a: "بعتذر وبرفع شكوى على شركة التوصيل وبعطيها توصيل مجاني أو خصم صغير." }
    ],
    scores: {
      empathy: [4, "يعتذر بشكل محدد عن تأخير الأيام الأربعة ويعترف بانزعاج العميلة.", "ونفهم انزعاجك"],
      resolution: [4, "يقدّم موعد توصيل جديداً محدداً مع اتصال مسبق من السائق.", "حجزت لك توصيلاً جديداً غداً بين الساعة 4 و7 مساءً"],
      accuracy: [4, "يستخدم وقائع محاولة التسليم والمستودع بشكل صحيح.", "السائق حاول التسليم يوم 4 تشرين الأول الساعة 11:40"],
      clarity: [4, "رد قصير ومرتب وواضح.", ""],
      escalation: [3, "الملاحظة تحدد المشكلة والفريق المسؤول لكنها لا تذكر الوقت المطلوب بدقة.", "أرجو من فريق مستودع تلاع العلي تأكيد موعد الغد"]
    },
    ownership: 4
  }
};

var VERIFIED = { customer_support: support };

var api = {
  ROLES: ROLES, PREVIEWS: PREVIEWS, FIELDS: FIELDS, CRITERIA_NAMES: CRITERIA_NAMES,
  VERIFIED: VERIFIED, ROLE_KEYS: Object.keys(ROLES)
};
export default api;
