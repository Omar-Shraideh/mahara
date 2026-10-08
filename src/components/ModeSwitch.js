import { html } from "../lib/core.js";
import { Icon } from "./Icon.js";

export function ModeSwitch(props) {
  var t = props.t;
  return html`<div className="stack-sm switch-wrap" style=${{ gap: "4px" }}>
    ${props.showLabel ? html`<span className="switcher-label">${t("view_as")}</span>` : null}
    <div className="switcher" role="group" aria-label=${t("view_as")}>
      <button type="button" aria-pressed=${props.mode === "employer"} onClick=${props.toEmployer}><${Icon} name="briefcase" />${t("view_employer")}</button>
      <button type="button" aria-pressed=${props.mode === "candidate"} onClick=${props.toCandidate}><${Icon} name="user" />${t("view_candidate")}</button>
    </div>
  </div>`;
}
