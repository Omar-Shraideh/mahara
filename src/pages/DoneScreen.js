import { html, useState, useEffect } from "../lib/core.js";
import { Mascot } from "../components/Mascot.js";
import { ExamShell } from "../layout/ExamShell.js";
import { leaveFullscreen } from "../lib/helpers.js";

export function DoneScreen(props) {
  var t = props.t;
  var s = useState(10), n = s[0], setN = s[1];
  useEffect(function () { leaveFullscreen(); }, []);
  useEffect(function () {
    var id = setInterval(function () { setN(function (x) { return x - 1; }); }, 1000);
    return function () { clearInterval(id); };
  }, []);
  useEffect(function () { if (n <= 0) props.signOut(); }, [n]);
  return html`<${ExamShell} ...${props}>
    <div className="exam-cols single"><div className="panel panel-pad-lg center-msg">
      <div className="intro-head" style=${{ width: "100%" }}><h1 style=${{ fontFamily: "var(--font-display)", fontSize: "var(--step-3)" }}>${t("done_title")}</h1>${props.noWork ? null : html`<${Mascot} pose="cheer" h=${104} blob=${true} />`}</div>
      <p>${props.noWork ? t("no_work_body") : t("done_body")}</p>
      <p className="small muted">${t("done_signout", { n: Math.max(0, n) })}</p>
      <button className="btn btn-primary" onClick=${props.signOut}>${t("done_finish")}</button>
    </div></div>
  <//>`;
}
