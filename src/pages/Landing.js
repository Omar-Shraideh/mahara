import { html, B } from "../lib/core.js";
import { LevelBadge } from "../components/LevelBadge.js";
import { Mascot } from "../components/Mascot.js";

export function Landing(props) {
  var t = props.t, lang = props.lang;
  var ex = B.VERIFIED.customer_support.graded_examples[0];
  var rubric = B.VERIFIED.customer_support.rubric;
  return html`<main className="landing">
    <section className="landing-grid">
      <div className="hero">
        <span className="kicker">${t("landing_kicker")}</span>
        <h1>${t("landing_title")}</h1>
        <p className="lede">${t("landing_body")}</p>
        <div className="row"><button className="btn btn-primary btn-lg" onClick=${props.openEmployer}>${t("landing_cta")}</button></div>
        <div className="panel how-panel">
          <${Mascot} pose="walk" h=${200} blob=${true} />
          <div className="how-text">
            <h2 className="h3" style=${{ fontSize: "var(--step-1)", marginBlockEnd: "4px" }}>${t("landing_how_title")}</h2>
            <ol className="how">${["landing_step1", "landing_step3", "landing_step4", "landing_step5"].map(function (k) { return html`<li key=${k}><span>${t(k)}</span></li>`; })}</ol>
          </div>
        </div>
      </div>
      <aside className="panel raised stack" aria-label="Example result">
        <div className="row-between">
          <span className="small muted">${lang === "ar" ? "مثال (بيانات تجريبية)" : "Example result (synthetic)"}</span>
          <${LevelBadge} t=${t} level="strong" />
        </div>
        <h3 style=${{ fontFamily: "var(--font-display)", fontSize: "var(--step-2)" }}>${B.ROLES.customer_support[lang]}</h3>
        <div className="scores">
          ${rubric.map(function (c) {
            var s = ex.scores[c.id][0];
            return html`<div className="score" key=${c.id}>
              <div className="score-head"><span className="score-name">${B.CRITERIA_NAMES[c.id][lang]}</span><bdi className="score-val">${s} / 4</bdi></div>
              <div className="bar"><span style=${{ width: (s / 4 * 100) + "%" }}></span></div>
            </div>`;
          })}
        </div>
        <p className="small muted">${t("landing_label")}</p>
      </aside>
    </section>
  </main>`;
}
