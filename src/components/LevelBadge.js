import { html, L } from "../lib/core.js";

export function LevelBadge(props) {
  var t = props.t, level = props.level;
  if (!level) return null;
  var n = L.levelRank(level) + 1;
  return html`<span className=${"level " + level + (props.large ? " lg" : "")}>
    <span className="steps" aria-hidden="true">${[1, 2, 3].map(function (i) { return html`<i key=${i} className=${i <= n ? "on" : ""}></i>`; })}</span>
    ${t("level_" + level)}
  </span>`;
}
