// Data store backed by the Mahara server. Same interface as the locked app's store
// (watch / set / update / remove), so every screen works unchanged.
// Live updates arrive over Server-Sent Events; if those drop, it falls back to polling.
import { api } from "./api.js";

export const COLLECTIONS = ["invites", "attempts", "actions", "blueprints"];

function clone(o) { return JSON.parse(JSON.stringify(o)); }

export function createApiStore() {
  var data = {};
  COLLECTIONS.forEach(function (c) { data[c] = null; });
  var listeners = {};
  var aiListeners = [];
  var statusListeners = [];
  var ai = null;
  var status = "loading"; // loading | ready | error
  var chains = {};

  function emit(c) { if (data[c]) (listeners[c] || []).forEach(function (fn) { fn(data[c]); }); }
  function apply(c, list) { if (COLLECTIONS.indexOf(c) === -1 || !Array.isArray(list)) return; data[c] = list; emit(c); }
  function setAi(st) { if (!st) return; ai = st; aiListeners.forEach(function (fn) { fn(st); }); }
  function setStatus(s) { status = s; statusListeners.forEach(function (fn) { fn(s); }); }

  function loadAll() {
    return api.get("/api/data").then(function (r) {
      COLLECTIONS.forEach(function (c) { apply(c, (r.data && r.data[c]) || []); });
      setAi(r.ai);
      setStatus("ready");
    }, function (e) {
      if (status !== "ready") setStatus("error");
      throw e;
    });
  }

  var pollId = null;
  function startPolling() { if (!pollId) pollId = setInterval(function () { loadAll().catch(function () {}); }, 5000); }
  function stopPolling() { if (pollId) { clearInterval(pollId); pollId = null; } }

  function connect() {
    if (typeof EventSource === "undefined") { startPolling(); return; }
    var es = new EventSource("/api/events");
    es.addEventListener("hello", function (e) {
      stopPolling();
      try { setAi(JSON.parse(e.data).ai); } catch (x) { /* ignore */ }
      loadAll().catch(function () {});
    });
    es.addEventListener("change", function (e) {
      try { var p = JSON.parse(e.data); apply(p.c, p.list); } catch (x) { /* ignore */ }
    });
    es.addEventListener("ai", function (e) { try { setAi(JSON.parse(e.data)); } catch (x) { /* ignore */ } });
    es.onerror = function () { startPolling(); }; // EventSource reconnects by itself; poll meanwhile
  }

  // Writes to the same record run one after another (autosave and submit never race).
  function serial(path, fn) {
    var prev = chains[path] || Promise.resolve();
    var next = prev.catch(function () {}).then(fn);
    chains[path] = next;
    return next;
  }
  function url(c, id) { return "/api/db/" + encodeURIComponent(c) + "/" + encodeURIComponent(id); }
  function after(c) { return function (r) { apply(c, r.list); }; }
  function toStoreError(e) { throw { code: e.code === "invalid_argument" ? "invalid_argument" : e.code, message: e.message }; }

  var ready = loadAll().catch(function () {});
  connect();

  return {
    kind: "api",
    ready: ready,
    reload: function () { setStatus("loading"); return loadAll(); },
    status: function () { return status; },
    onStatus: function (fn) { statusListeners.push(fn); return function () { statusListeners = statusListeners.filter(function (x) { return x !== fn; }); }; },
    ai: function () { return ai; },
    onAi: function (fn) { aiListeners.push(fn); if (ai) fn(ai); return function () { aiListeners = aiListeners.filter(function (x) { return x !== fn; }); }; },
    watch: function (c, fn) {
      (listeners[c] = listeners[c] || []).push(fn);
      if (data[c]) setTimeout(function () { fn(data[c]); }, 0);
      return function () { listeners[c] = (listeners[c] || []).filter(function (x) { return x !== fn; }); };
    },
    set: function (c, id, body) { return serial(c + "/" + id, function () { return api.put(url(c, id), clone(body)).then(after(c), toStoreError); }); },
    update: function (c, id, patch) { return serial(c + "/" + id, function () { return api.patch(url(c, id), clone(patch)).then(after(c), toStoreError); }); },
    remove: function (c, id) { return serial(c + "/" + id, function () { return api.del(url(c, id)).then(after(c), toStoreError); }); }
  };
}
