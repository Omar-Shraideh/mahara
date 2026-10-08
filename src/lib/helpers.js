import { B } from "./core.js";

export function newId(prefix) {
  var a = "", chars = "abcdefghijkmnpqrstuvwxyz23456789";
  for (var i = 0; i < 12; i++) a += chars[Math.floor(Math.random() * chars.length)];
  return (prefix || "x") + "_" + a;
}
export function clone(o) { return JSON.parse(JSON.stringify(o)); }
export function safeSession(key, value) {
  try {
    if (value === undefined) { var v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; }
    if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) { return null; }
  return null;
}
export function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
export function resolveBlueprint(item) {
  if (!item) return null;
  return B.VERIFIED[item.role] || null;
}
export function roleLabel(item, lang) {
  if (!item) return "";
  return (B.ROLES[item.role] || {})[lang] || item.role;
}
export function fmtScore(s) { return Number.isInteger(s) ? String(s) : s.toFixed(1); }
export function requestFullscreen() {
  try { var el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(function () {}); } catch (e) { /* not allowed here */ }
}
export function leaveFullscreen() {
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); } catch (e) { /* ignore */ }
}
