import { html, useState, useEffect, useRef, useCallback, L } from "../lib/core.js";
import { Mascot } from "../components/Mascot.js";
import { Spinner } from "../components/Spinner.js";
import { Toast } from "../components/Toast.js";
import { ExamShell } from "../layout/ExamShell.js";
import { runGrading } from "../lib/grading.js";
import { byId, clone, resolveBlueprint, roleLabel } from "../lib/helpers.js";
import { useNow, usePasteBlock } from "../lib/hooks.js";

export function DefendScreen(props) {
  var t = props.t, lang = props.lang, data = props.data, store = props.store, ctx = props.ctx;
  var a = byId(data.attempts, props.id);
  var bp = a ? resolveBlueprint(a, data.blueprints) : null;
  var s1 = useState(""), answer = s1[0], setAnswer = s1[1];
  var s2 = useState(""), toast = s2[0], setToast = s2[1];
  var s3 = useState(false), failed = s3[0], setFailed = s3[1];
  var s4 = useState(0), retryN = s4[0], setRetryN = s4[1];
  var wrap = useRef(null);
  var blocked = useRef(0);
  var generating = useRef(false);
  var saving = useRef(false);
  var now = useNow(250);

  useEffect(function () {
    if (!a || !bp || generating.current) return;
    // "defending" with no questions yet means the page was refreshed while they were loading
    if ((a.status === "submitted" || a.status === "defending") && !(a.followups && a.followups.length)) {
      generating.current = true;
      setFailed(false);
      store.update("attempts", a.id, { status: "defending" })
        .then(function () { return ctx.engine.generateQuestions(bp, a.task, a.submission, a.lang, a.id); })
        .then(function (r) { return store.update("attempts", a.id, { followups: r.questions.map(function (q) { return { text: q }; }), followups_source: r.source }); })
        .catch(function () { setFailed(true); generating.current = false; });
    }
  }, [a && a.status, a && a.followups && a.followups.length, retryN]);

  var followups = (a && a.followups) || [];
  var idx = -1;
  for (var i = 0; i < followups.length; i++) { if (!followups[i].answered_at) { idx = i; break; } }
  var current = idx >= 0 ? followups[idx] : null;

  useEffect(function () {
    if (a && current && !current.shown_at) {
      var copy = clone(followups); copy[idx].shown_at = Date.now();
      store.update("attempts", a.id, { followups: copy });
      setAnswer(""); blocked.current = 0;
    }
  }, [a && a.id, idx, current && current.shown_at]);

  var onBlocked = useCallback(function () {
    blocked.current++;
    setToast(t("paste_blocked"));
    setTimeout(function () { setToast(""); }, 2500);
  }, [t]);
  usePasteBlock(wrap, onBlocked);

  var remaining = current && current.shown_at ? L.remainingSec(current.shown_at, now, L.DEFEND_SEC) : L.DEFEND_SEC;

  function save(timedOut) {
    if (!a || !current || saving.current) return;
    saving.current = true;
    var copy = clone(followups);
    copy[idx].answer = answer;
    copy[idx].answered_at = Date.now();
    copy[idx].blocked_pastes = blocked.current;
    copy[idx].timed_out = !!timedOut;
    var last = idx === followups.length - 1;
    var patch = { followups: copy };
    if (last) {
      var totalBlocked = copy.reduce(function (n, f) { return n + (f.blocked_pastes || 0); }, 0);
      patch.status = "defended";
      patch.telemetry = Object.assign({}, a.telemetry || {}, { blocked_pastes_defend: totalBlocked });
      patch.defended_at = Date.now();
    }
    store.update("attempts", a.id, patch).then(function () {
      saving.current = false;
      setAnswer("");
      if (last) {
        props.goCand({ name: "done", id: a.id });
        setTimeout(function () { runGrading(props.ctxRef.current, a.id); }, 300); // OQ-45
      }
    }, function () { saving.current = false; setToast(t("conn_error")); setTimeout(function () { setToast(""); }, 4000); });
  }

  useEffect(function () { if (current && current.shown_at && remaining <= 0) save(true); }, [remaining, current && current.shown_at]);

  if (!a) return html`<${ExamShell} ...${props}><${Spinner} /><//>`;
  if (a.status === "defended" || a.status === "grading" || a.status === "graded") {
    setTimeout(function () { props.goCand({ name: "done", id: a.id }); }, 0);
    return html`<${ExamShell} ...${props}><${Spinner} /><//>`;
  }
  var tl = a.lang;
  return html`<div ref=${wrap}>
    <${ExamShell} ...${props} roleLabel=${roleLabel(a, lang, data.blueprints)}
      status=${current ? t("question_n", { n: idx + 1 }) : t("defend_title")}
      remaining=${current ? remaining : null} limit=${L.DEFEND_SEC} lowAt=${10}
      footer=${current ? html`<span className="small muted">${t("defend_intro")}</span>
        <button className="btn btn-primary btn-lg" onClick=${function () { save(false); }}>${idx === followups.length - 1 ? t("finish") : t("next")}</button>` : null}>
      <div className="exam-cols single">
        ${!current ? html`<div className="panel panel-pad-lg center-msg">
          <div className="intro-head" style=${{ width: "100%" }}><h1 style=${{ fontFamily: "var(--font-display)", fontSize: "var(--step-3)" }}>${t("defend_title")}</h1><${Mascot} pose="think" h=${104} blob=${true} /></div>
          ${failed ? html`<div className="stack"><p className="error-text" role="alert">${t("task_failed")}</p><div><button className="btn btn-primary" onClick=${function () { generating.current = false; setRetryN(retryN + 1); }}>${t("try_again")}</button></div></div>` : html`<p className="row"><${Spinner} /> ${t("preparing_questions")}</p>`}
        </div>` : html`<section className="stack-lg" dir=${tl === "ar" ? "rtl" : "ltr"} lang=${tl}>
          <span className="label-caps">${t("defend_title")}</span>
          <p className="question-card" id="q-text">${current.text}</p>
          <textarea className="textarea" rows="8" aria-labelledby="q-text" data-field=${"defend" + (idx + 1)} value=${answer}
            onInput=${function (e) { setAnswer(e.target.value); }} autoFocus></textarea>
        </section>`}
      </div>
    <//>
    <${Toast} text=${toast} />
  </div>`;
}
