import { html, L } from "../lib/core.js";
import { Logo } from "../components/Logo.js";
import { ModeSwitch } from "../components/ModeSwitch.js";

export function ExamShell(props) {
  var t = props.t;
  var pct = props.limit ? Math.max(0, Math.min(100, (props.remaining / props.limit) * 100)) : null;
  return html`<div className="exam">
    <header className="exam-bar" style=${{ position: "sticky" }}>
      <div className="exam-bar-inner">
        <span className="brand" aria-label=${t("brand")}><${Logo} size=${26} /></span>
        <div className="exam-role">
          ${props.roleLabel ? html`<span className="r">${props.roleLabel}</span>` : html`<span className="r">${t("brand")}</span>`}
          ${props.status ? html`<span className="small muted">${props.status}</span>` : null}
        </div>
        <span className="spacer"></span>
        ${props.remaining != null ? html`<div className="timer-wrap">
          <span className=${"timer" + (props.remaining <= (props.lowAt || 60) ? " low" : "")} role="timer">${L.formatMMSS(props.remaining)}</span>
          <span className="small muted">${t("time_left")}</span>
          <span className="visually-hidden" aria-live="polite">${props.remaining === 300 || props.remaining === 60 || props.remaining === 10 ? L.formatMMSS(props.remaining) : ""}</span>
        </div>` : null}
        <button className="lang-btn" onClick=${props.toggleLang} lang=${props.lang === "ar" ? "en" : "ar"}>${t("lang_toggle")}</button>
        <${ModeSwitch} t=${t} mode="candidate" toEmployer=${props.onExit} toCandidate=${function () {}} />
      </div>
      ${pct != null ? html`<div className="exam-progress" aria-hidden="true"><span style=${{ width: pct + "%" }}></span></div>` : null}
    </header>
    <main className="exam-body">${props.children}</main>
    ${props.footer ? html`<footer className="exam-foot"><div className="exam-foot-inner">${props.footer}</div></footer>` : null}
  </div>`;
}
