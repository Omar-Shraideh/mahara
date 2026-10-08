// Mahara storage: one JSON file, loaded into memory at boot and written atomically on every change.
// Chosen deliberately for the hackathon: no native modules to compile on Replit, nothing to set up,
// and the whole dataset is small (tens of invites and results). See README > Architecture.
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";

export const COLLECTIONS = ["invites", "attempts", "actions", "blueprints"];

function emptyData() {
  var d = {};
  COLLECTIONS.forEach(function (c) { d[c] = {}; });
  return d;
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

export function createDb(file) {
  var events = new EventEmitter();
  events.setMaxListeners(200);
  var data = emptyData();

  function load() {
    try {
      var raw = fs.readFileSync(file, "utf8");
      var parsed = JSON.parse(raw);
      var d = emptyData();
      COLLECTIONS.forEach(function (c) { if (parsed && typeof parsed[c] === "object" && parsed[c]) d[c] = parsed[c]; });
      data = d;
      return true;
    } catch (e) {
      if (e.code !== "ENOENT") console.warn("[db] Could not read " + file + " (" + e.message + "). Starting empty.");
      data = emptyData();
      return false;
    }
  }

  function save() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    var tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  }

  function list(c) {
    return Object.keys(data[c]).map(function (id) { return Object.assign({ id: id }, data[c][id]); });
  }

  function changed(c) { save(); events.emit("change", c, list(c)); }

  load();

  return {
    events: events,
    file: file,
    isEmpty: function () { return COLLECTIONS.every(function (c) { return Object.keys(data[c]).length === 0; }); },
    list: list,
    all: function () { var o = {}; COLLECTIONS.forEach(function (c) { o[c] = list(c); }); return o; },
    get: function (c, id) { return data[c][id] ? Object.assign({ id: id }, clone(data[c][id])) : null; },
    set: function (c, id, doc) { var d = clone(doc); delete d.id; data[c][id] = d; changed(c); return list(c); },
    update: function (c, id, patch) {
      if (!data[c][id]) return null;
      var p = clone(patch); delete p.id;
      data[c][id] = Object.assign({}, data[c][id], p);
      changed(c);
      return list(c);
    },
    remove: function (c, id) { delete data[c][id]; changed(c); return list(c); },
    replaceAll: function (next) {
      data = emptyData();
      COLLECTIONS.forEach(function (c) { if (next[c]) data[c] = clone(next[c]); });
      save();
      COLLECTIONS.forEach(function (c) { events.emit("change", c, list(c)); });
    }
  };
}
