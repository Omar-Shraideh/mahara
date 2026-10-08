import { html } from "../lib/core.js";

export function Mascot(props) {
  return html`<span className=${"mascot-wrap" + (props.blob ? " blob" : "") + (props.className ? " " + props.className : "")} aria-hidden="true"><img className="mascot" src=${"/mascot/" + props.pose + ".webp"} alt="" draggable="false" style=${{ height: props.h + "px" }} /></span>`;
}
