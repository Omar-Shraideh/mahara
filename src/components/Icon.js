import { html } from "../lib/core.js";

export function Icon(props) {
  var p = { results: "M4 19V9M10 19V5M16 19v-7M3 19h18", invites: "M4 6h16v12H4zM4 7l8 6 8-6", roles: "M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8l5.5-.8z", device: "M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM11 17h2", plus: "M12 5v14M5 12h14", collapse: "M11 7l-5 5 5 5M18 7l-5 5 5 5", expand: "M13 7l5 5-5 5M6 7l5 5-5 5", briefcase: "M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16", user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0" };
  return html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${p[props.name]}></path></svg>`;
}
