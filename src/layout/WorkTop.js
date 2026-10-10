import { html } from "../lib/core.js";
import { ModeSwitch } from "../components/ModeSwitch.js";

export function WorkTop(props) {
  var t = props.t, data = props.data;
  var graded = data.attempts.filter(function (a) { return a.status === "graded"; }).length;
  var items = [["invites", t("nav_invites"), data.invites.length], ["results", t("nav_results"), graded]];
  var active = props.route.name === "result" ? "results" : props.tab;
  return html`<header className="wtop">
    <div className="wtop-inner">
      <nav className="wtabs" aria-label="Workspace">
        ${items.map(function (x) {
          return html`<button key=${x[0]} className="wtab" aria-current=${active === x[0] ? "page" : null} onClick=${function () { props.openTab(x[0]); }}>
            <span className="wtab-label">${x[1]}</span><span className="nav-count">${x[2]}</span>
          </button>`;
        })}
      </nav>
      <${ModeSwitch} t=${t} mode="employer" showLabel=${false} toEmployer=${function () {}} toCandidate=${props.toCandidate} />
      <button className="lang-btn" onClick=${props.toggleLang} lang=${props.lang === "ar" ? "en" : "ar"}>${t("lang_toggle")}</button>
    </div>
    ${props.aiMode === "mock" ? html`<p className="ai-note">${t("ai_mode_mock")}</p>` : null}
  </header>`;
}
