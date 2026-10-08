import { html } from "../lib/core.js";

export function Toast(props) {
  if (!props.text) return null;
  return html`<div className="toast" role="status" aria-live="polite">${props.text}</div>`;
}
