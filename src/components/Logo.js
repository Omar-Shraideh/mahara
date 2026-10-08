import { html } from "../lib/core.js";

export function Logo(props) {
  var s = props.size || 28;
  return html`<svg width=${s} height=${s} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <rect x="0" y="0" width="32" height="32" rx="8" fill="#0f4c4a"></rect>
    <rect x="7" y="8.5" width="18" height="2.4" rx="1.2" fill="#fbf8f2" opacity="0.9"></rect>
    <rect x="5.5" y="13.6" width="21" height="4.8" rx="1.6" fill="#b98a3e"></rect>
    <rect x="7" y="14.8" width="15" height="2.4" rx="1.2" fill="#0b2b42" opacity="0.8"></rect>
    <rect x="7" y="21.1" width="12" height="2.4" rx="1.2" fill="#fbf8f2" opacity="0.9"></rect>
  </svg>`;
}
