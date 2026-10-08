import { html, L, I } from "../lib/core.js";
import { LevelBadge } from "../components/LevelBadge.js";
import { Mascot } from "../components/Mascot.js";
import { roleLabel } from "../lib/helpers.js";

export function ResultsTab(props) {
  var t = props.t, lang = props.lang, data = props.data;
  var f = props.filters, setF = props.setFilters;
  var shortlisted = {};
  data.actions.forEach(function (a) { if (a.action === "shortlist") shortlisted[a.attempt_id] = true; });
  var invitesById = {};
  data.invites.forEach(function (iv) { invitesById[iv.id] = iv; });
  var rows = data.attempts.filter(function (a) { return a.status === "graded"; }).map(function (a) {
    var iv = invitesById[a.invite_id] || {};
    return {
      id: a.id, name: iv.candidate_name || a.candidate_name || "", role_label: roleLabel(a, lang, data.blueprints),
      role_filter_key: a.role,
      kind: "verified", lang: a.lang, level: a.level, graded_at: a.graded_at || 0,
      is_demo: !!a.is_demo, shortlisted: !!shortlisted[a.id]
    };
  });
  var list = L.filterAndSortResults(rows, f);
  function sel(id, label, value, options, onChange) {
    return html`<div className="field">
      <label htmlFor=${id}>${label}</label>
      <select id=${id} className="select" value=${value} onChange=${function (e) { onChange(e.target.value); }}>
        ${options.map(function (o) { return html`<option key=${o[0]} value=${o[0]}>${o[1]}</option>`; })}
      </select>
    </div>`;
  }
  return html`<section className="stack-lg">
    <div className="page-head"><div className="stack-sm"><h1 className="page-title">${t("results_title")}</h1><p className="muted">${t("results_sub")}</p></div></div>
    <div className="panel">
      <div className="grid-form">
        ${sel("f-level", t("filter_level"), f.minLevel, [["emerging", t("all")], ["job_ready", t("level_job_ready") + "+"], ["strong", t("level_strong")]], function (v) { setF(Object.assign({}, f, { minLevel: v })); })}
        ${sel("f-lang", t("filter_lang"), f.lang, [["all", t("all")], ["en", t("lang_en")], ["ar", t("lang_ar")]], function (v) { setF(Object.assign({}, f, { lang: v })); })}
      </div>
    </div>
    ${rows.length === 0 ? html`<div className="panel empty-panel"><div className="stack"><p>${t("results_none")}</p><div><button className="btn btn-primary" onClick=${function () { props.openTab("invites", true); }}>${t("nav_invite_cta")}</button></div></div><${Mascot} pose="point" h=${116} blob=${true} /></div>` : null}
    ${rows.length > 0 && list.length === 0 ? html`<div className="panel center-msg"><p>${t("results_empty")}</p>
      <button className="btn btn-quiet" onClick=${function () { setF({ role: "all", minLevel: "emerging", lang: "all", kind: "all" }); }}>${t("clear_filters")}</button></div>` : null}
    <div className="result-list">
      ${list.map(function (r) {
        return html`<button key=${r.id} className="result-row" onClick=${function () { props.go({ name: "result", id: r.id }); }}>
          <span className="stack-sm" style=${{ gap: "2px", minWidth: 0 }}><span className="name">${r.name}</span><span className="meta">${r.role_label}</span></span>
          <span className="row hide-sm" style=${{ gap: "6px" }}>
            <span className="chip">${r.lang === "ar" ? t("lang_ar") : t("lang_en")}</span>
            ${r.is_demo ? html`<span className="chip demo">${t("demo_data")}</span>` : null}
            ${r.shortlisted ? html`<span className="chip gold">${t("shortlisted")}</span>` : null}
          </span>
          <span className="small muted hide-sm"><bdi>${I.formatDate(r.graded_at, lang)}</bdi></span>
          <${LevelBadge} t=${t} level=${r.level} />
        </button>`;
      })}
    </div>
  </section>`;
}
