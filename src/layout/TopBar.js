import { html } from "../lib/core.js";
import { Logo } from "../components/Logo.js";

export function TopBar(props) {
  var t = props.t;
  return html`<header className="topbar"><div className="topbar-inner">
    <button className="brand" onClick=${props.onHome}><${Logo} /><span className="brand-name">${t("brand")}</span></button>
    <span className="spacer"></span>
    <button className="lang-btn" onClick=${props.toggleLang} lang=${props.lang === "ar" ? "en" : "ar"}>${t("lang_toggle")}</button>
  </div></header>`;
}
