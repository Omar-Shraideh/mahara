import { html, useState } from "../lib/core.js";
import { Mascot } from "../components/Mascot.js";
import { Spinner } from "../components/Spinner.js";
import { ExamShell } from "../layout/ExamShell.js";
import { byId, newId, requestFullscreen, resolveBlueprint, roleLabel } from "../lib/helpers.js";
import { WaitingScreen } from "./WaitingScreen.js";

export function ExamIntro(props) {
  var t = props.t, lang = props.lang, data = props.data, store = props.store, ctx = props.ctx;
  var iv = byId(data.invites, props.inviteId);
  var s1 = useState(null), taskLang = s1[0], setTaskLang = s1[1];
  var s2 = useState(false), consent = s2[0], setConsent = s2[1];
  var s3 = useState(false), busy = s3[0], setBusy = s3[1];
  var s4 = useState(""), err = s4[0], setErr = s4[1];
  var bp = iv ? resolveBlueprint(iv, data.blueprints) : null;

  if (!iv) return html`<${WaitingScreen} ...${props} />`;
  if (iv.status !== "invited") {
    return html`<${ExamShell} ...${props} roleLabel=${roleLabel(iv, lang, data.blueprints)}>
      <div className="exam-cols single"><div className="panel panel-pad-lg center-msg"><p>${t("status_" + iv.status)}</p>
        <button className="btn btn-primary" onClick=${props.onExit}>${t("to_employer")}</button></div></div>
    <//>`;
  }

  function start() {
    if (!taskLang || !consent || busy) return;
    var live = byId(ctx.data.invites, iv.id) || iv;
    if (live.status !== "invited") { setErr(t("status_" + live.status)); return; }
    if (!bp) { setErr(t("task_failed")); return; }
    requestFullscreen();
    setBusy(true); setErr("");
    var id = newId("att");
    var base = {
      invite_id: live.id, employer_id: "owner", role: live.role, kind: live.kind || "verified",
      blueprint_id: bp.id, blueprint_family: bp.family_id || bp.id, blueprint_version: bp.version || 1,
      lang: taskLang, candidate_name: live.candidate_name, status: "generating", created_at: Date.now(),
      consent_at: Date.now(), is_demo: false
    };
    store.set("attempts", id, base)
      .then(function () { return ctx.engine.generateTask(bp, taskLang); })
      .then(function (task) {
        return store.update("attempts", id, { task: task, status: "in_progress", ai_mode: task.ai_mode })
          .then(function () { return store.update("invites", live.id, { status: "in_progress", attempt_id: id }); })
          .then(function () {
            props.setSession({ invite_id: live.id, attempt_id: id });
            props.goCand({ name: "task", id: id });
          });
      })
      .catch(function () {
        store.update("attempts", id, { status: "generation_failed" }).catch(function () {});
        setErr(t("task_failed")); setBusy(false);
      });
  }

  return html`<${ExamShell} ...${props} roleLabel=${roleLabel(iv, lang, data.blueprints)} status=${iv.candidate_name}
    footer=${html`<span className="small muted">${busy ? t("preparing_task") : t("rule_time")}</span>
      <button className="btn btn-primary btn-lg" disabled=${!taskLang || !consent || busy} onClick=${start}>${busy ? html`<${Spinner} />` : null}${err ? t("try_again") : t("start_task")}</button>`}>
    <div className="exam-cols single">
      <div className="stack-lg">
        <div className="intro-head"><h1 style=${{ fontFamily: "var(--font-display)", fontSize: "var(--step-4)", lineHeight: 1.1 }}>${t("cand_title")}</h1><${Mascot} pose="typing" h=${104} blob=${true} /></div>
        <div className="panel panel-pad-lg stack-lg">
          <div className="stack">
            <span className="label-caps" id="lang-q">${t("choose_lang")}</span>
            <div className="lang-choice" role="group" aria-labelledby="lang-q">
              <button aria-pressed=${taskLang === "ar"} lang="ar" onClick=${function () { setTaskLang("ar"); }}>العربية</button>
              <button aria-pressed=${taskLang === "en"} lang="en" onClick=${function () { setTaskLang("en"); }}>English</button>
            </div>
          </div>
          <div className="stack">
            <span className="label-caps">${t("before_start")}</span>
            <ul className="rules">
              <li>${t("rule_time")}</li>
              <li>${t("rule_ai")}</li>
              <li>${t("rule_paste")}</li>
              <li>${t("rule_tabs")}</li>
              <li>${t("rule_results")}</li>
            </ul>
          </div>
          <label className="check" htmlFor="consent">
            <input id="consent" type="checkbox" checked=${consent} onChange=${function (e) { setConsent(e.target.checked); }} />
            <span>${t("consent")}</span>
          </label>
          ${err ? html`<p className="error-text" role="alert">${err}</p>` : null}
        </div>
      </div>
    </div>
  <//>`;
}
