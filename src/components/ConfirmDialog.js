import { html, useEffect } from "../lib/core.js";

// Yes/no confirmation. Esc or a click on the dimmed backdrop counts as "no".
export function ConfirmDialog(props) {
  var open = props.open, onNo = props.onNo;
  useEffect(function () {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape" && onNo) { e.preventDefault(); onNo(); } }
    document.addEventListener("keydown", onKey);
    return function () { document.removeEventListener("keydown", onKey); };
  }, [open, onNo]);
  if (!open) return null;
  return html`<div className="overlay" role="dialog" aria-modal="true" aria-label=${props.text}
    onClick=${function (e) { if (e.target === e.currentTarget && onNo) onNo(); }}>
    <div className="dialog">
      <p>${props.text}</p>
      <div className="row">
        <button className="btn btn-primary" onClick=${props.onYes} autoFocus>${props.yes}</button>
        <button className="btn btn-quiet" onClick=${onNo}>${props.no}</button>
      </div>
    </div>
  </div>`;
}
