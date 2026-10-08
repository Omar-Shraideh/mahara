import { html, useState } from "../lib/core.js";
import { Icon } from "../components/Icon.js";
import { Logo } from "../components/Logo.js";

export function Rail(props) {
  var t = props.t;
  var cs = useState(false), col = cs[0], setCol = cs[1];
  var toggleLabel = col ? t("rail_expand") : t("rail_collapse");
  return html`<aside className=${"rail" + (col ? " collapsed" : "")}>
    <button className="brand" onClick=${props.onHome} aria-label=${t("brand")}><span className="logo-tile"><${Logo} size=${28} /></span><span className="brand-name rail-lbl">${t("brand")}</span></button>
    <button className="btn rail-cta" onClick=${function () { props.openTab("invites", true); }} title=${t("nav_invite_cta")} aria-label=${t("nav_invite_cta")}><${Icon} name="plus" /><span className="rail-lbl">${t("nav_invite_cta")}</span></button>
    <button className="rail-col" onClick=${function () { setCol(!col); }} aria-expanded=${!col} aria-label=${toggleLabel} title=${toggleLabel}><${Icon} name=${col ? "expand" : "collapse"} /><span className="rail-lbl">${t("rail_collapse")}</span></button>
  </aside>`;
}
