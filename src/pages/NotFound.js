import { html } from "../lib/core.js";
import { TopBar } from "../layout/TopBar.js";
import { navigate } from "../lib/router.js";

// Unknown URLs get a calm page in the same style instead of a blank screen.
export function NotFound(props) {
  var t = props.t;
  return html`<div>
    <${TopBar} t=${t} lang=${props.lang} toggleLang=${props.toggleLang} onHome=${function () { navigate("/"); }} />
    <main className="landing">
      <div className="panel center-msg" style=${{ maxWidth: "640px" }}>
        <h1 style=${{ fontFamily: "var(--font-display)", fontSize: "var(--step-3)" }}>${t("not_found_title")}</h1>
        <p className="muted">${t("not_found_body")}</p>
        <button className="btn btn-primary" onClick=${function () { navigate("/"); }}>${t("go_home")}</button>
      </div>
    </main>
  </div>`;
}
