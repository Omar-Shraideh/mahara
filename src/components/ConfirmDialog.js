import { html } from "../lib/core.js";

export function ConfirmDialog(props) {
  if (!props.open) return null;
  return html`<div className="overlay" role="dialog" aria-modal="true">
    <div className="dialog">
      <p>${props.text}</p>
      <div className="row">
        <button className="btn btn-primary" onClick=${props.onYes} autoFocus>${props.yes}</button>
        <button className="btn btn-quiet" onClick=${props.onNo}>${props.no}</button>
      </div>
    </div>
  </div>`;
}
