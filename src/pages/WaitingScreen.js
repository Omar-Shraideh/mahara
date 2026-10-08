import { html } from "../lib/core.js";
import { ExamShell } from "../layout/ExamShell.js";

export function WaitingScreen(props) {
  var t = props.t;
  return html`<${ExamShell} ...${props}>
    <div className="exam-cols single"><div className="panel panel-pad-lg center-msg">
      <h1 style=${{ fontFamily: "var(--font-display)", fontSize: "var(--step-3)" }}>${t("waiting_title")}</h1>
      <p>${t("waiting_body")}</p>
      <button className="btn btn-primary" onClick=${props.onExit}>${t("to_employer")}</button>
    </div></div>
  <//>`;
}
