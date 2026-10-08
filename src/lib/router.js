// Minimal history router: real URLs that survive a refresh, no extra dependency.
import { useState, useEffect } from "react";

var listeners = new Set();
function notify() { listeners.forEach(function (fn) { fn(); }); }

export function navigate(to, opts) {
  var here = window.location.pathname + window.location.search;
  if (here !== to) {
    if (opts && opts.replace) window.history.replaceState({}, "", to);
    else window.history.pushState({}, "", to);
    notify();
  }
  if (!(opts && opts.keepScroll)) window.scrollTo(0, 0);
}

export function useLocation() {
  var s = useState(function () { return { path: window.location.pathname, search: window.location.search }; });
  var setLoc = s[1];
  useEffect(function () {
    function update() { setLoc({ path: window.location.pathname, search: window.location.search }); }
    listeners.add(update);
    window.addEventListener("popstate", update);
    return function () { listeners.delete(update); window.removeEventListener("popstate", update); };
  }, []);
  return s[0];
}

// Turns a path into the screen the locked app showed.
export function parseRoute(path, search) {
  var p = path.replace(/\/+$/, "") || "/";
  var m;
  if (p === "/") return { area: "landing" };
  if (p === "/workspace" || p === "/workspace/invites") return { area: "workspace", tab: "invites" };
  if (p === "/workspace/results") return { area: "workspace", tab: "results" };
  if ((m = p.match(/^\/workspace\/results\/([A-Za-z0-9_-]+)$/))) return { area: "workspace", tab: "results", result: m[1] };
  if (p === "/session") return { area: "candidate", cand: { name: "resume" } };
  if ((m = p.match(/^\/session\/start\/([A-Za-z0-9_-]+)$/))) return { area: "candidate", cand: { name: "intro", inviteId: m[1] } };
  if ((m = p.match(/^\/session\/task\/([A-Za-z0-9_-]+)$/))) return { area: "candidate", cand: { name: "task", id: m[1] } };
  if ((m = p.match(/^\/session\/defend\/([A-Za-z0-9_-]+)$/))) return { area: "candidate", cand: { name: "defend", id: m[1] } };
  if (p === "/session/done") return { area: "candidate", cand: { name: "done", noWork: /(^|[?&])nowork=1/.test(search || "") } };
  return { area: "notfound" };
}

export function candPath(r) {
  if (r.name === "intro") return "/session/start/" + r.inviteId;
  if (r.name === "task") return "/session/task/" + r.id;
  if (r.name === "defend") return "/session/defend/" + r.id;
  if (r.name === "done") return "/session/done" + (r.noWork ? "?nowork=1" : "");
  return "/session";
}
