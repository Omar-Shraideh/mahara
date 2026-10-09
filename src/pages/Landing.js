import { html, useState, B, L } from "../lib/core.js";
import { LevelBadge } from "../components/LevelBadge.js";
import { Mascot } from "../components/Mascot.js";

// Landing: a two-line pitch and one interactive demo. The visitor picks one of three real
// sample replies (the blueprint's hand-graded examples) and sees the level, the five skill
// scores and the evidence highlighted in the reply. Nothing here calls the AI.
var bp = B.VERIFIED.customer_support;
var byLabel = {};
bp.graded_examples.forEach(function (ex) { byLabel[ex.label] = ex; });
// Not sorted best-to-worst, so the visitor has to read them.
var OPTIONS = [
  { key: "A", ex: byLabel.middle },
  { key: "B", ex: byLabel.strong },
  { key: "C", ex: byLabel.weak }
];

function resultFor(ex) {
  var criteria = bp.rubric.map(function (rc) {
    var s = ex.scores[rc.id];
    return { id: rc.id, score: s[0], reason: s[1], quote: s[2] };
  });
  var level = L.levelFor(L.weightedScore(criteria, bp.rubric).P);
  var weakest = criteria.reduce(function (min, c) { return c.score < min.score ? c : min; }, criteria[0]);
  return { criteria: criteria, level: level, weakest: weakest };
}

// Splits the reply into plain and highlighted runs, one highlight per evidence quote found in it.
function highlight(text, quotes) {
  var marks = [];
  quotes.forEach(function (q) {
    if (!q) return;
    var i = text.indexOf(q);
    if (i !== -1) marks.push([i, i + q.length]);
  });
  marks.sort(function (a, b) { return a[0] - b[0]; });
  var out = [], pos = 0;
  marks.forEach(function (m, k) {
    if (m[0] < pos) return; // overlapping quote: keep the first
    if (m[0] > pos) out.push(text.slice(pos, m[0]));
    out.push(html`<mark key=${"m" + k}>${text.slice(m[0], m[1])}</mark>`);
    pos = m[1];
  });
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}

export function Landing(props) {
  var t = props.t, lang = props.lang;
  var s = useState("A"), pick = s[0], setPick = s[1];
  var opt = OPTIONS.filter(function (o) { return o.key === pick; })[0];
  var r = resultFor(opt.ex);
  var reply = opt.ex.fields.reply;
  return html`<main className="landing">
    <section className="hero">
      <h1>${t("landing_title")}</h1>
      <p className="lede">${t("landing_sub")}</p>
      <div className="row"><button className="btn btn-primary btn-lg" onClick=${props.openEmployer}>${t("landing_cta")}</button></div>
    </section>

    <section className="panel raised demo" aria-labelledby="demo-title">
      <div className="demo-head">
        <h2 id="demo-title" className="demo-title">${t("demo_title")}</h2>
        <${Mascot} pose="point" h=${72} />
      </div>

      <div className="demo-grid">
        <div className="demo-col">
          <div className="demo-msg">
            <span className="label-caps">${t("demo_customer")}</span>
            <p>${t("demo_message")}</p>
          </div>
          <div className="demo-fact">
            <span className="label-caps">${t("demo_facts")}</span>
            <p>${t("demo_facts_text")}</p>
          </div>
          <div className="demo-picks" role="group" aria-label=${t("demo_title")}>
            ${OPTIONS.map(function (o) {
              return html`<button key=${o.key} type="button" className="demo-pick" aria-pressed=${pick === o.key} onClick=${function () { setPick(o.key); }}>${t("demo_option", { x: o.key })}</button>`;
            })}
          </div>
        </div>

        <div className="demo-col">
          <span className="label-caps">${t("demo_reply")}</span>
          <p className="demo-reply" lang="en" dir="ltr">${highlight(reply, r.criteria.map(function (c) { return c.quote; }))}</p>
          ${lang === "ar" ? html`<p className="small muted">${t("demo_lang_note")}</p>` : null}
        </div>

        <div className="demo-col" aria-live="polite">
          <div className="row-between">
            <span className="label-caps">${t("demo_result")}</span>
            <${LevelBadge} t=${t} level=${r.level} />
          </div>
          <div className="scores demo-scores">
            ${r.criteria.map(function (c) {
              return html`<div className="score" key=${c.id}>
                <div className="score-head"><span className="score-name">${B.CRITERIA_NAMES[c.id][lang]}</span><bdi className="score-val">${c.score} / 4</bdi></div>
                <div className="bar"><span style=${{ width: (c.score / 4 * 100) + "%" }}></span></div>
              </div>`;
            })}
          </div>
          <p className="demo-why"><strong>${t("demo_weakest")}: ${B.CRITERIA_NAMES[r.weakest.id][lang]}.</strong> <span lang="en" dir="ltr">${r.weakest.reason}</span></p>
        </div>
      </div>

      <p className="small muted">${t("demo_note")} ${t(props.aiMode === "claude" ? "landing_label_ai" : "landing_label")}.</p>
    </section>
  </main>`;
}
