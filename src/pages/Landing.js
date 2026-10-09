import { html, useState, useEffect, useRef, B, L } from "../lib/core.js";
import { LevelBadge } from "../components/LevelBadge.js";
import { Mascot } from "../components/Mascot.js";
import { SquaresBackground } from "../components/SquaresBackground.js";

// Landing: two lines and a button on one side, a chat-style scoring demo on the other.
// The visitor taps one of three sample replies (the blueprint's hand-graded examples) and
// Mahara answers with the level, the five skill scores and one evidence quote.
// Nothing here calls the AI: the scores are the pre-graded examples.
var bp = B.VERIFIED.customer_support;
var byLabel = {};
bp.graded_examples.forEach(function (ex) { byLabel[ex.label] = ex; });
// Not sorted best-to-worst, so the visitor has to read them.
var OPTIONS = [
  { key: "A", ex: byLabel.middle, excerpt: "We apologise for the delay in your order. We will look into it…" },
  { key: "B", ex: byLabel.strong, excerpt: "I'm sorry your order ZH-48213 is now four days late…" },
  { key: "C", ex: byLabel.weak, excerpt: "Delays happen because of the courier company, it is not our fault…" }
];

function resultFor(ex) {
  var criteria = bp.rubric.map(function (rc) {
    var s = ex.scores[rc.id];
    return { id: rc.id, score: s[0], reason: s[1], quote: s[2] };
  });
  var level = L.levelFor(L.weightedScore(criteria, bp.rubric).P);
  var weakest = criteria.reduce(function (min, c) { return c.score < min.score ? c : min; }, criteria[0]);
  // Evidence: the quote behind the most heavily weighted skill that has one.
  var byWeight = bp.rubric.slice().sort(function (a, b) { return b.weight - a.weight; });
  var evidence = "";
  byWeight.some(function (rc) { var q = ex.scores[rc.id][2]; if (q) { evidence = q; return true; } return false; });
  return { criteria: criteria, level: level, weakest: weakest, evidence: evidence };
}

// Headline: each word rises in with a short stagger; the [bracketed] phrase gets a
// hand-drawn highlighter underline that draws itself after the words land.
function Headline(props) {
  var parts = String(props.text).split(/(\[[^\]]+\])/);
  var i = 0;
  var out = [];
  parts.forEach(function (part, p) {
    if (!part) return;
    if (part.charAt(0) === "[") {
      var phrase = part.slice(1, -1);
      out.push(html`<span key=${"k" + p} className="hl-word hl-key" style=${{ animationDelay: (i++ * 55) + "ms" }}>${phrase}<svg className="hl-underline" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M3 9.5 C 38 4.5, 82 3.2, 122 5.6 S 182 9.8, 197 5"></path></svg></span>`);
      out.push(" ");
      return;
    }
    part.split(/\s+/).forEach(function (w, j) {
      if (!w) return;
      out.push(html`<span key=${"w" + p + "-" + j} className="hl-word" style=${{ animationDelay: (i++ * 55) + "ms" }}>${w}</span>`);
      out.push(" ");
    });
  });
  return html`<h1 aria-label=${props.text.replace(/[\[\]]/g, "")}><span aria-hidden="true">${out}</span></h1>`;
}

export function Landing(props) {
  var t = props.t, lang = props.lang;
  var s1 = useState("B"), pick = s1[0], setPick = s1[1];
  var s2 = useState(false), typing = s2[0], setTyping = s2[1];
  var timer = useRef(null);
  useEffect(function () { return function () { clearTimeout(timer.current); }; }, []);

  function choose(key) {
    if (key === pick && !typing) return;
    setPick(key);
    setTyping(true);
    clearTimeout(timer.current);
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(function () { setTyping(false); }, reduce ? 0 : 750);
  }

  var opt = OPTIONS.filter(function (o) { return o.key === pick; })[0];
  var r = resultFor(opt.ex);
  var skill = function (id) { return B.CRITERIA_NAMES[id][lang]; };
  var avatar = html`<span className="chat-avatar" aria-hidden="true"><${Mascot} pose="cheer" h=${64} /></span>`;

  return html`<main className="landing">
    <${SquaresBackground} />
    <section className="landing-split">
      <div className="hero">
        <${Headline} text=${t("landing_title")} />
        <p className="lede">${t("landing_sub")}</p>
        <div className="row"><button className="btn btn-primary btn-lg" onClick=${props.openEmployer}>${t("landing_cta")}</button></div>
      </div>

      <section className="chat" aria-label=${t("chat_status")}>
        <header className="chat-head">
          ${avatar}
          <div className="chat-who">
            <strong>${t("chat_name")}</strong>
            <span className="chat-status"><span className="chat-dot" aria-hidden="true"></span>${t("chat_status")}</span>
          </div>
          <span className="chat-pill">${t("chat_pill")}</span>
        </header>

        <div className="chat-body">
          <div className="msg bot">${avatar}<p className="bubble">${t("chat_hello")}</p></div>

          <div className="msg you">
            <div className="bubble you-bubble"><strong>${t("chat_ask", { x: opt.key })}</strong><span lang="en" dir="ltr">“${opt.excerpt}”</span></div>
            <span className="you-tag">${t("chat_you")}</span>
          </div>

          ${typing
            ? html`<div className="msg bot">${avatar}<p className="bubble typing" role="status" aria-label=${t("chat_scoring")}><i></i><i></i><i></i></p></div>`
            : html`<div className="msg bot" aria-live="polite">
                ${avatar}
                <div className="bot-stack">
                  <div className="result-card" key=${opt.key}>
                    <div className="result-card-head">
                      <span>${t("chat_card", { x: opt.key })}</span>
                      <${LevelBadge} t=${t} level=${r.level} />
                    </div>
                    ${r.criteria.map(function (c, idx) {
                      var weak = c.id === r.weakest.id;
                      return html`<div className=${"rc-row" + (weak ? " weak" : "")} key=${c.id}>
                        <span className="rc-name">${skill(c.id)}${weak ? html` <span className="rc-tag">${t("chat_weakest")}</span>` : null}</span>
                        <span className="rc-bar" aria-hidden="true"><span style=${{ width: (c.score / 4 * 100) + "%", animationDelay: (idx * 70) + "ms" }}></span></span>
                        <bdi className="rc-val">${c.score} / 4</bdi>
                      </div>`;
                    })}
                    ${r.evidence ? html`<div className="rc-evidence"><span className="label-caps">${t("chat_evidence")}</span><mark lang="en" dir="ltr">“${r.evidence}”</mark></div>` : null}
                  </div>
                </div>
              </div>`}
        </div>

        <footer className="chat-foot">
          <div className="chat-chips">
            ${OPTIONS.map(function (o) {
              return html`<button key=${o.key} type="button" className="chip-btn" aria-pressed=${pick === o.key} onClick=${function () { choose(o.key); }}>${t("chat_ask", { x: o.key })}</button>`;
            })}
          </div>
        </footer>
      </section>
    </section>
  </main>`;
}
