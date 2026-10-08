import { html, useState, useEffect, useRef, useCallback, L, B } from "../lib/core.js";
import { ConfirmDialog } from "../components/ConfirmDialog.js";
import { Spinner } from "../components/Spinner.js";
import { Toast } from "../components/Toast.js";
import { ExamShell } from "../layout/ExamShell.js";
import { byId, resolveBlueprint, roleLabel } from "../lib/helpers.js";
import { useNow, usePasteBlock } from "../lib/hooks.js";

export function TaskScreen(props) {
  var t = props.t, lang = props.lang, data = props.data, store = props.store, ctx = props.ctx;
  var a = byId(data.attempts, props.id);
  var bp = a ? resolveBlueprint(a, data.blueprints) : null;
  var s1 = useState(function () { return (a && a.draft_fields) || {}; }), fields = s1[0], setFields = s1[1];
  var s2 = useState(""), toast = s2[0], setToast = s2[1];
  var s3 = useState(false), confirmOpen = s3[0], setConfirmOpen = s3[1];
  var s4 = useState(typeof navigator !== "undefined" ? navigator.onLine !== false : true), online = s4[0], setOnline = s4[1];
  var wrap = useRef(null);
  var tel = useRef({ blocked: (a && a.telemetry_partial && a.telemetry_partial.blocked_paste_events) || [], tabs: (a && a.telemetry_partial && a.telemetry_partial.tab_switches) || 0 });
  var submitted = useRef(false);
  var lastSaved = useRef(JSON.stringify(fields));
  var now = useNow(500);

  useEffect(function () {
    if (a && a.status === "in_progress" && !a.started_at) store.update("attempts", a.id, { started_at: Date.now() });
  }, [a && a.id, a && a.started_at]);

  useEffect(function () {
    function vis() { if (document.visibilityState === "hidden") tel.current.tabs++; }
    function on() { setOnline(true); }
    function off() { setOnline(false); }
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return function () { document.removeEventListener("visibilitychange", vis); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  var onBlocked = useCallback(function (field) {
    var started = (a && a.started_at) || Date.now();
    tel.current.blocked.push({ t_ms: Date.now() - started, field: field });
    setToast(t("paste_blocked"));
    setTimeout(function () { setToast(""); }, 2500);
  }, [a && a.started_at, t]);
  usePasteBlock(wrap, onBlocked);

  useEffect(function () {
    if (!a) return;
    var id = setInterval(function () {
      var snap = JSON.stringify(fields);
      if (snap !== lastSaved.current && !submitted.current) {
        lastSaved.current = snap;
        store.update("attempts", a.id, { draft_fields: fields, telemetry_partial: { blocked_paste_events: tel.current.blocked, tab_switches: tel.current.tabs } }).catch(function () {});
      }
    }, 10000);
    return function () { clearInterval(id); };
  }, [a && a.id, fields]);

  var started = a && a.started_at;
  var remaining = started ? L.remainingSec(started, now, L.TIME_LIMIT_SEC) : L.TIME_LIMIT_SEC;

  function submit(auto) {
    if (submitted.current || !a) return;
    submitted.current = true;
    setConfirmOpen(false);
    var spec = ctx.engine.fieldsSpec(a.role, a.lang, bp);
    var now2 = Date.now();
    var used = Math.min(L.TIME_LIMIT_SEC, Math.round((now2 - (a.started_at || now2)) / 1000));
    var telemetry = { time_used_sec: used, blocked_paste_events: tel.current.blocked, blocked_paste_count: tel.current.blocked.length, tab_switches: tel.current.tabs, auto_submitted: !!auto };
    if (L.isEmptySubmission(fields)) {
      store.update("attempts", a.id, { fields: fields, submission: "", submitted_at: now2, telemetry: telemetry, status: "no_work" })
        .then(function () { return store.update("invites", a.invite_id, { status: "no_work" }); })
        .then(function () { props.goCand({ name: "done", id: a.id, noWork: true }); });
      return;
    }
    var submission = L.buildSubmissionText(spec, fields);
    if (auto) setToast(t("time_up"));
    store.update("attempts", a.id, { fields: fields, submission: submission, submitted_at: now2, telemetry: telemetry, status: "submitted" })
      .then(function () { props.goCand({ name: "defend", id: a.id }); })
      .catch(function () { submitted.current = false; setToast(t("offline")); });
  }

  useEffect(function () { if (started && remaining <= 0 && !submitted.current) submit(true); }, [remaining, started]);

  if (!a || !bp) return html`<${ExamShell} ...${props}><${Spinner} /><//>`;
  if (a.status !== "in_progress") {
    if (a.status === "submitted" || a.status === "defending") setTimeout(function () { props.goCand({ name: "defend", id: a.id }); }, 0);
    return html`<${ExamShell} ...${props}><${Spinner} /><//>`;
  }
  var tl = a.lang;
  var dirAttr = tl === "ar" ? "rtl" : "ltr";
  var spec = B.FIELDS[a.role] || null;

  function fieldEl(key, label, rows) {
    return html`<div className="field" key=${key}>
      <label htmlFor=${"f-" + key}>${label}</label>
      <textarea id=${"f-" + key} data-field=${key} className="textarea" rows=${rows || 4} value=${fields[key] || ""}
        onInput=${function (e) { var v = e.target.value; setFields(function (f) { var c = Object.assign({}, f); c[key] = v; return c; }); }}
        spellCheck="true"></textarea>
    </div>`;
  }

  var brief = html`<section className="stack" dir=${dirAttr} lang=${tl}>
    <p className="task-text prewrap">${a.task.task_text}</p>
    <p className="deliverable">${a.task.deliverable}</p>
  </section>`;

  var content = html`<div className="exam-cols">
        <div className="exam-brief">${brief}</div>
        <section className="stack-lg" dir=${dirAttr} lang=${tl}>
          ${(spec || [{ key: "answer", label: { en: "Your answer", ar: "إجابتك" }, rows: 16 }]).map(function (f) { return fieldEl(f.key, f.label[tl], Math.max(f.rows + 3, 4)); })}
        </section>
      </div>`;

  return html`<div ref=${wrap}>
    <${ExamShell} ...${props} roleLabel=${roleLabel(a, lang, data.blueprints)} status=${t("reminder")}
      remaining=${remaining} limit=${L.TIME_LIMIT_SEC} lowAt=${60}
      footer=${html`<span className="small muted">${online ? t("autosave_note") : t("offline")}</span>
        <button className="btn btn-primary btn-lg" onClick=${function () { setConfirmOpen(true); }}>${t("submit")}</button>`}>
      ${content}
    <//>
    <${ConfirmDialog} open=${confirmOpen} text=${t("submit_confirm")} yes=${t("submit_yes")} no=${t("not_yet")}
      onYes=${function () { submit(false); }} onNo=${function () { setConfirmOpen(false); }} />
    <${Toast} text=${toast} />
  </div>`;
}
