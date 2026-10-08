import { html, useState, useEffect, useRef, L, B, I } from "../lib/core.js";
import { ConfirmDialog } from "../components/ConfirmDialog.js";
import { Mascot } from "../components/Mascot.js";
import { byId, newId, roleLabel } from "../lib/helpers.js";

export function InvitesTab(props) {
  var t = props.t, lang = props.lang, data = props.data, store = props.store;
  var s1 = useState(""), name = s1[0], setName = s1[1];
  var s2 = useState(""), email = s2[0], setEmail = s2[1];
  var s3 = useState("customer_support"), role = s3[0], setRole = s3[1];
  var s4 = useState({}), errs = s4[0], setErrs = s4[1];
  var s5 = useState(null), created = s5[0], setCreated = s5[1];
  var s6 = useState(null), confirmId = s6[0], setConfirmId = s6[1];
  var s7 = useState(false), busy = s7[0], setBusy = s7[1];
  var nameRef = useRef(null);

  useEffect(function () { if (props.focusInvite && nameRef.current) nameRef.current.focus(); }, [props.focusInvite]);


  function validate() {
    var er = {};
    if (!name.trim() || name.trim().length > 100) er.name = t("invite_err_name");
    if (!L.isValidEmail(email)) er.email = t("invite_err_email");
    if (!role) er.role = t("invite_err_role");
    if (!er.email && role) {
      if (L.duplicateInvite(data.invites, email, role, null)) er.form = t("invite_err_dup");
    }
    return er;
  }

  function createInvite(roleKey) {
    var codes = {};
    data.invites.forEach(function (iv) { codes[iv.session_code] = true; });
    var code = L.makeSessionCode();
    while (codes[code]) code = L.makeSessionCode();
    var id = newId("inv");
    var doc = {
      candidate_name: name.trim(), candidate_email: email.trim().toLowerCase(), role: roleKey,
      kind: "verified",
      session_code: code, status: "invited", attempt_id: null, created_at: Date.now(), is_demo: false
    };
    return store.set("invites", id, doc).then(function () {
      setCreated({ id: id, name: doc.candidate_name });
      setName(""); setEmail("");
    });
  }

  function submit(e) {
    if (e) e.preventDefault();
    var er = validate();
    setErrs(er);
    if (Object.keys(er).length || busy) return;
    setCreated(null);
    setBusy(true);
    createInvite(role)
      .catch(function (err) { setErrs({ form: (err && err.code === "offline") ? t("conn_error") : (err && err.message) || t("invite_err_save") }); })
      .then(function () { setBusy(false); });
  }

  function cancelInvite(id) {
    var iv = byId(data.invites, id);
    if (!iv || !L.canTransition(iv.status, "cancelled")) { setConfirmId(null); return; }
    store.update("invites", id, { status: "cancelled", cancelled_at: Date.now() }).then(function () { setConfirmId(null); }, function () { setConfirmId(null); });
  }

  function statusClass(st) {
    return st === "completed" ? "done" : st === "grading_failed" || st === "no_work" ? "risk" : st === "cancelled" || st === "expired" ? "neutral" : "neutral";
  }

  var invites = data.invites.slice().sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
  return html`<section className="stack-lg">
    <div className="page-head"><div className="stack-sm"><h1 className="page-title">${t("invites_title")}</h1><p className="muted">${t("invites_sub")}</p></div></div>

    <form className="panel raised panel-pad-lg stack-lg" onSubmit=${submit} noValidate aria-labelledby="inv-h">
      <h2 id="inv-h" style=${{ fontFamily: "var(--font-display)", fontSize: "var(--step-2)" }}>${t("invite_title")}</h2>
      <div className="grid-form">
        <div className="field">
          <label htmlFor="inv-name">${t("invite_name")}</label>
          <input id="inv-name" ref=${nameRef} className="input" value=${name} maxLength="100" onInput=${function (e) { setName(e.target.value); }} autoComplete="off" disabled=${busy} />
          ${errs.name ? html`<span className="error-text">${errs.name}</span>` : null}
        </div>
        <div className="field">
          <label htmlFor="inv-email">${t("invite_email")}</label>
          <input id="inv-email" className="input" type="email" dir="ltr" value=${email} onInput=${function (e) { setEmail(e.target.value); }} autoComplete="off" disabled=${busy} />
          ${errs.email ? html`<span className="error-text">${errs.email}</span>` : null}
        </div>
      </div>
      <div className="stack-sm">
        <span className="label" id="role-q" style=${{ fontSize: "var(--step--1)", fontWeight: 500 }}>${t("invite_role")}</span>
        <div className="role-grid" role="group" aria-labelledby="role-q">
          ${B.ROLE_KEYS.map(function (k) {
            return html`<button type="button" key=${k} className="role-opt" aria-pressed=${role === k} data-role=${k} disabled=${busy} onClick=${function () { setRole(k); }}>
              <span className="t">${B.ROLES[k][lang]}</span><span className="s">${t("role_verified_hint")}</span>
            </button>`;
          })}
        </div>
        ${errs.role ? html`<span className="error-text">${errs.role}</span>` : null}
      </div>
${errs.form ? html`<p className="error-text">${errs.form}</p>` : null}

      <div className="row-between">
        <p className="small muted" style=${{ maxWidth: "52ch" }}>${t("invite_hint")}</p>
        <button className="btn btn-primary btn-lg" type="submit" disabled=${busy}>${busy ? t("saving") : t("invite_submit")}</button>
      </div>

      ${created ? html`<div className="note row-between" role="status" style=${{ background: "var(--primary-soft)", color: "var(--ink)" }}>
        <span className="row" style=${{ gap: "12px", flexWrap: "nowrap" }}><${Mascot} pose="thumbs" h=${60} /><span>${t("invite_created", { name: created.name })} <span className="muted">${t("start_test_hint")}</span></span></span>
        <button type="button" className="btn btn-primary" onClick=${function () { props.openTest(created.id); }}>${t("start_test")}</button>
      </div>` : null}
    </form>

    ${invites.length === 0 ? html`<p className="muted">${t("invites_empty")}</p>` : html`<div className="table-wrap">
      <table className="t">
        <thead><tr><th>${t("col_name")}</th><th>${t("col_email")}</th><th>${t("col_role")}</th><th>${t("col_status")}</th><th>${t("col_created")}</th><th></th></tr></thead>
        <tbody>
          ${invites.map(function (iv) {
            var canStart = iv.status === "invited";
            var hasResult = !!iv.attempt_id;
            return html`<tr key=${iv.id} className=${hasResult ? "clickable" : ""} onClick=${hasResult ? function () { props.go({ name: "result", id: iv.attempt_id }); } : null}>
              <td className="wrap">${iv.candidate_name} ${iv.is_demo ? html`<span className="chip demo">${t("demo_data")}</span>` : null}</td>
              <td><bdi>${iv.candidate_email}</bdi></td>
              <td className="wrap">${roleLabel(iv, lang, data.blueprints)}</td>
              <td><span className=${"status " + statusClass(iv.status)}>${t("status_" + iv.status)}</span></td>
              <td><bdi>${I.formatDate(iv.created_at, lang)}</bdi></td>
              <td>${canStart ? html`<span className="row" style=${{ gap: "6px", flexWrap: "nowrap" }}>
                <button className="btn btn-primary btn-sm" onClick=${function (e) { e.stopPropagation(); props.openTest(iv.id); }}>${t("start_test")}</button>
                <button className="btn btn-quiet btn-sm" onClick=${function (e) { e.stopPropagation(); setConfirmId(iv.id); }}>${t("cancel_invite")}</button>
              </span>` : null}</td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>`}
    <${ConfirmDialog} open=${!!confirmId} text=${t("confirm_cancel")} yes=${t("yes_cancel")} no=${t("keep")}
      onYes=${function () { cancelInvite(confirmId); }} onNo=${function () { setConfirmId(null); }} />
  </section>`;
}
