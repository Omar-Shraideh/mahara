import { html, useState, useEffect, useRef, L, I } from "../lib/core.js";
import { LevelBadge } from "../components/LevelBadge.js";
import { Mascot } from "../components/Mascot.js";
import { Spinner } from "../components/Spinner.js";
import { runGrading, viewedThisSession } from "../lib/grading.js";
import { byId, fmtScore, newId, resolveBlueprint, roleLabel } from "../lib/helpers.js";

export function summaryLine(t, lang, bp, finals, engine) {
  var list = bp.rubric.map(function (c) { return { c: c, s: finals[c.id] ? finals[c.id].score : 0 }; });
  var max = list.reduce(function (m, x) { return x.s > m.s ? x : m; }, list[0]);
  var min = list.reduce(function (m, x) { return x.s < m.s ? x : m; }, list[0]);
  if (!max || max.s === min.s) return t("summary_even");
  return t("summary_strong", { a: engine.criterionName(max.c, lang), sa: fmtScore(max.s) }) + " " + t("summary_weak", { b: engine.criterionName(min.c, lang), sb: fmtScore(min.s) });
}
export function ResultPage(props) {
  var t = props.t, lang = props.lang, data = props.data, store = props.store, engine = props.engine;
  var a = byId(data.attempts, props.id);
  var s1 = useState(""), flagText = s1[0], setFlagText = s1[1];
  var s2 = useState(""), flagMsg = s2[0], setFlagMsg = s2[1];
  var s3 = useState(""), flagErr = s3[0], setFlagErr = s3[1];
  var s4 = useState("summary"), tab = s4[0], setTab = s4[1];
  var s5 = useState(false), flagOpen = s5[0], setFlagOpen = s5[1];
  var loggedView = useRef(false);

  useEffect(function () {
    if (a && !loggedView.current && !viewedThisSession[a.id]) {
      loggedView.current = true;
      viewedThisSession[a.id] = true;
      store.set("actions", newId("act"), { attempt_id: a.id, action: "view", created_at: Date.now() }).catch(function () {});
    }
  }, [a && a.id]);

  if (!a) return html`<div className="panel"><p>${t("result_not_found")}</p></div>`;
  var iv = byId(data.invites, a.invite_id) || {};
  var bp = resolveBlueprint(a, data.blueprints);
  var tl = a.lang;
  var actions = data.actions.filter(function (x) { return x.attempt_id === a.id; });
  var shortlistAct = actions.filter(function (x) { return x.action === "shortlist"; })[0];
  var flags = actions.filter(function (x) { return x.action === "flag"; });
  var tel = L.summarizeTelemetry(a.telemetry);
  var graded = a.status === "graded";

  function toggleShortlist() {
    if (shortlistAct) store.remove("actions", shortlistAct.id);
    else store.set("actions", "sl_" + a.id, { attempt_id: a.id, action: "shortlist", created_at: Date.now() });
  }
  function sendFlag(e) {
    e.preventDefault();
    if (!flagText.trim()) { setFlagErr(t("flag_err")); return; }
    setFlagErr("");
    store.set("actions", newId("flag"), { attempt_id: a.id, action: "flag", comment: flagText.trim().slice(0, 1000), created_at: Date.now() })
      .then(function () { setFlagText(""); setFlagMsg(t("flag_done")); });
  }

  var finals = {};
  if (graded) (a.result.criteria || []).forEach(function (c) { finals[c.id] = c; });

  var header = html`<header className="panel raised panel-pad-lg report-head">
    <button className="linklike small" style=${{ justifySelf: "start" }} onClick=${function () { props.openTab("results"); }}>${t("back_to_results")}</button>
    <div className="report-top">
      <div className="stack-sm">
        <h1 className="report-name">${iv.candidate_name || a.candidate_name}</h1>
        <p className="muted">${roleLabel(a, lang, data.blueprints)} · <bdi>${I.formatDate(a.graded_at || a.submitted_at || a.created_at, lang)}</bdi> · ${tl === "ar" ? t("lang_ar") : t("lang_en")}</p>
        <div className="row" style=${{ gap: "6px" }}>
          <span className="chip">${t("verified_role")}</span>
          ${a.is_demo ? html`<span className="chip demo">${t("demo_data")}</span>` : null}
          ${bp && bp.draft ? html`<span className="chip gold">${t("draft_blueprint")}</span>` : null}
          ${shortlistAct ? html`<span className="chip gold">${t("shortlisted")}</span>` : null}
        </div>
      </div>
      <div className="stack-sm" style=${{ justifyItems: "end" }}>
        <${LevelBadge} t=${t} level=${a.level} large=${true} />
      </div>
    </div>
    ${graded ? html`<p className="summary-line">${summaryLine(t, lang, bp, finals, engine)}</p>` : null}
    ${graded ? html`<div className="facts">
      <div className="fact" title=${t("ownership_hint")}><span className="label-caps">${t("ownership")}</span><bdi className="v">${fmtScore(a.result.ownership)} / 4</bdi></div>
      <div className="fact"><span className="label-caps">${t("time_used")}</span><bdi className="v">${L.formatMMSS(tel.time_used_sec)} / 8:00</bdi></div>
      <div className="fact"><span className="label-caps">${t("tab_switches")}</span><bdi className="v">${tel.tab_switches}</bdi></div>
      <div className="fact"><span className="label-caps">${t("blocked_pastes")}</span><bdi className="v">${tel.blocked_pastes_task + tel.blocked_pastes_defend}</bdi></div>
    </div>` : null}
    ${graded ? html`<div className="row">
      <button className=${"btn " + (shortlistAct ? "btn-secondary" : "btn-primary")} onClick=${toggleShortlist}>${shortlistAct ? t("unshortlist") : t("shortlist")}</button>
      <button className="btn btn-quiet" aria-expanded=${flagOpen} onClick=${function () { setFlagOpen(!flagOpen); }}>${t("flag_open")}</button>
      ${flags.length ? html`<span className="small muted">${t("flags_count", { n: flags.length })}</span>` : null}
    </div>` : null}
    ${graded && flagOpen ? html`<form className="flag-panel stack" onSubmit=${sendFlag}>
      <label htmlFor="flag-text" style=${{ fontWeight: 500 }}>${t("flag_title")}</label>
      <textarea id="flag-text" className="textarea" rows="3" maxLength="1000" placeholder=${t("flag_placeholder")} value=${flagText}
        onInput=${function (e) { setFlagText(e.target.value); setFlagMsg(""); }}></textarea>
      ${flagErr ? html`<span className="error-text">${flagErr}</span>` : null}
      <div className="row"><button className="btn btn-secondary btn-sm" type="submit">${t("flag_submit")}</button></div>
      ${flagMsg ? html`<p className="small" role="status">${flagMsg}</p>` : null}
    </form>` : null}
  </header>`;

  if (a.status === "no_work") return html`<div className="stack-lg">${header}<div className="panel"><p>${t("no_work")}</p></div></div>`;
  if (!graded) {
    var stateMsg = a.status === "grading" ? html`<p className="row"><${Spinner} /> ${t("grading_now")}</p>`
      : a.status === "grading_failed" ? html`<div className="stack"><p>${t("grading_failed")}</p><div><button className="btn btn-primary" onClick=${function () { runGrading(props.ctx, a.id); }}>${t("retry_grading")}</button></div></div>`
      : a.status === "defended" ? html`<div className="stack"><p>${t("not_graded_yet")}</p><div><button className="btn btn-primary" onClick=${function () { runGrading(props.ctx, a.id); }}>${t("grade_now")}</button></div></div>`
      : html`<p className="muted">${t("status_" + (iv.status || "in_progress"))}</p>`;
    return html`<div className="stack-lg">${header}<div className="panel">${stateMsg}</div></div>`;
  }

  var spec = engine.fieldsSpec(a.role, tl, bp);
  var dirAttr = tl === "ar" ? "rtl" : "ltr";
  var labels = html`<ul className="labels">
    <li><strong>${t("label_ai")}</strong></li>
    ${a.ai_mode === "claude" ? html`<li>${t("label_runs", { n: a.result.runs_used || 2 })}</li>` : null}
    ${bp && bp.draft ? html`<li>${t("label_draft")}</li>` : null}
    ${a.ai_mode === "mock" ? html`<li>${t("label_mock")}</li>` : null}
      ${a.ai_mode === "seed" ? html`<li>${t("label_seed")}</li>` : null}
  </ul>`;

  var body;
  if (tab === "summary") {
    body = html`<div className="report-grid">
      <section className="panel stack-lg" aria-labelledby="h-scores">
        <h2 id="h-scores" className="label-caps">${t("scores_by_skill")}</h2>
        <div className="scores">
          ${bp.rubric.map(function (c) {
            var f = finals[c.id] || { score: 0, reason: "" };
            return html`<div className="score" key=${c.id}>
              <div className="score-head"><span className="score-name">${engine.criterionName(c, lang)}</span><bdi className="score-val">${fmtScore(f.score)} / 4</bdi></div>
              <div className="bar" role="img" aria-label=${fmtScore(f.score) + " / 4"}><span style=${{ width: (f.score / 4 * 100) + "%" }}></span></div>
              <p className="score-reason" dir=${dirAttr} lang=${tl}>${f.reason}</p>
            </div>`;
          })}
        </div>
      </section>
      <aside className="stack-lg">
        <section className="panel stack" aria-labelledby="h-lab">
          <h2 id="h-lab" className="label-caps">${t("sec_label")}</h2>
          ${labels}
          <p className="small muted">${t("ownership")}: ${t("ownership_hint")}</p>
        </section>
      </aside>
    </div>`;
  } else if (tab === "work") {
    body = html`<section className="panel panel-pad-lg" dir=${dirAttr} lang=${tl}>
      <div className="work-top"><span className="label-caps">${t("tab_work")}</span><${Mascot} pose="lens" h=${84} blob=${true} /></div>
      <div className="work-block"><span className="label-caps">${t("task_label")}</span><p className="prewrap">${a.task.task_text}</p></div>
      <div className="work-block"><span className="label-caps">${t("deliverable_label")}</span><p>${a.task.deliverable}</p></div>
      <div className="work-block"><span className="label-caps">${t("submission_label")}</span>
        ${spec.map(function (f) {
          return html`<div key=${f.key} className="stack-sm" style=${{ gap: "2px", marginBlockStart: "6px" }}><strong className="small">${f.label}</strong><p className="prewrap">${(a.fields || {})[f.key] || "—"}</p></div>`;
        })}
      </div>
      <div className="work-block"><span className="label-caps">${t("defend_label")}</span>
        ${(a.followups || []).map(function (q, i) {
          return html`<div className="qa" key=${i}><span className="q">${q.text}</span><span className="prewrap">${q.answer && q.answer.trim() ? q.answer : t("no_answer")}</span></div>`;
        })}
      </div>
    </section>`;
  } else {
    var engineLabel = a.ai_mode === "mock" ? t("ai_mock") : a.ai_mode === "seed" ? t("ai_seed") : t("ai_claude");
    body = html`<div className="report-grid">
      <section className="panel stack" aria-labelledby="h-det">
        <h2 id="h-det" className="label-caps">${t("key_facts")}</h2>
        <dl className="kv">
          <dt>${t("time_used")}</dt><dd><bdi>${L.formatMMSS(tel.time_used_sec)} / 8:00</bdi></dd>
          <dt>${t("blocked_pastes")}</dt><dd><bdi>${tel.blocked_pastes_task + tel.blocked_pastes_defend}</bdi></dd>
          <dt>${t("tab_switches")}</dt><dd><bdi>${tel.tab_switches}</bdi></dd>
          <dt>${t("submitted_status")}</dt><dd>${tel.auto_submitted ? t("auto_submitted") : t("submitted_on_time")}</dd>
          <dt>${t("col_lang")}</dt><dd>${tl === "ar" ? t("lang_ar") : t("lang_en")}</dd>
          <dt>${t("grading_runs")}</dt><dd><bdi>${a.result.runs_used || 2}</bdi></dd>
          <dt>${t("ai_engine")}</dt><dd>${engineLabel}</dd>
          <dt>${t("attempt_id")}</dt><dd><bdi className="mono">${a.id}</bdi></dd>
        </dl>
      </section>
      <section className="panel stack" aria-labelledby="h-lab2">
        <h2 id="h-lab2" className="label-caps">${t("sec_label")}</h2>
        ${labels}
      </section>
    </div>`;
  }

  var tabs = [["summary", t("tab_summary")], ["work", t("tab_work")], ["details", t("tab_details")]];
  return html`<div className="stack-lg">
    ${header}
    <div className="tabs" role="tablist">
      ${tabs.map(function (x) { return html`<button key=${x[0]} role="tab" aria-selected=${tab === x[0]} onClick=${function () { setTab(x[0]); }}>${x[1]}</button>`; })}
    </div>
    ${body}
  </div>`;
}
