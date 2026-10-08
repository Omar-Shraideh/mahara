import { useState, useEffect } from "./core.js";

export function usePasteBlock(ref, onBlocked) {
  useEffect(function () {
    var el = ref.current;
    if (!el) return;
    function isField(t) { return t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT"); }
    function block(e) {
      if (!isField(e.target)) return;
      e.preventDefault();
      onBlocked(e.target.getAttribute("data-field") || "field", e.type);
    }
    function before(e) {
      if (!isField(e.target)) return;
      if (e.inputType === "insertFromPaste" || e.inputType === "insertFromDrop" || e.inputType === "insertFromPasteAsQuotation") {
        e.preventDefault();
        onBlocked(e.target.getAttribute("data-field") || "field", e.inputType);
      }
    }
    el.addEventListener("paste", block, true);
    el.addEventListener("drop", block, true);
    el.addEventListener("beforeinput", before, true);
    return function () {
      el.removeEventListener("paste", block, true);
      el.removeEventListener("drop", block, true);
      el.removeEventListener("beforeinput", before, true);
    };
  }, [ref, onBlocked]);
}
export function useNow(intervalMs) {
  var s = useState(Date.now()), now = s[0], setNow = s[1];
  useEffect(function () {
    var id = setInterval(function () { setNow(Date.now()); }, intervalMs || 500);
    return function () { clearInterval(id); };
  }, [intervalMs]);
  return now;
}
