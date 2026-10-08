// Root of the Mahara app. Same screens and behaviour as the locked version; the screen is now
// chosen from the URL, so every page can be refreshed or shared as a link.
import { html, useState, useEffect, useRef, useMemo, I } from "./lib/core.js";
import { safeSession, byId, leaveFullscreen } from "./lib/helpers.js";
import { COLLECTIONS } from "./lib/store.js";
import { navigate, useLocation, parseRoute, candPath } from "./lib/router.js";
import { Spinner } from "./components/Spinner.js";
import { TopBar } from "./layout/TopBar.js";
import { Rail } from "./layout/Rail.js";
import { WorkTop } from "./layout/WorkTop.js";
import { ExamShell } from "./layout/ExamShell.js";
import { Landing } from "./pages/Landing.js";
import { ResultsTab } from "./pages/ResultsTab.js";
import { InvitesTab } from "./pages/InvitesTab.js";
import { ResultPage } from "./pages/ResultPage.js";
import { WaitingScreen } from "./pages/WaitingScreen.js";
import { ExamIntro } from "./pages/ExamIntro.js";
import { TaskScreen } from "./pages/TaskScreen.js";
import { DefendScreen } from "./pages/DefendScreen.js";
import { DoneScreen } from "./pages/DoneScreen.js";
import { NotFound } from "./pages/NotFound.js";

export function App(props) {
  var store = props.store, engine = props.engine;
  var initialLang = (function () { try { return localStorage.getItem("mahara-lang") || "en"; } catch (e) { return "en"; } })();
  var s1 = useState(initialLang), lang = s1[0], setLang = s1[1];
  var s6 = useState({ role: "all", minLevel: "emerging", lang: "all", kind: "all" }), filters = s6[0], setFilters = s6[1];
  var s7 = useState({ invites: [], attempts: [], actions: [], blueprints: [] }), data = s7[0], setData = s7[1];
  var s8 = useState(engine.state.mode), aiMode = s8[0], setAiMode = s8[1];
  var s9 = useState(0), focusInvite = s9[0], setFocusInvite = s9[1];
  var s10 = useState(function () { return safeSession("mahara-cand"); }), session = s10[0], setSessionState = s10[1];
  var s11 = useState(store.status()), loadState = s11[0], setLoadState = s11[1];
  var lastWorkspace = useRef("/workspace/invites");
  var t = useMemo(function () { return I.make(lang); }, [lang]);
  var loc = useLocation();
  var route = parseRoute(loc.path, loc.search);
  if (route.area === "workspace") lastWorkspace.current = loc.path;

  useEffect(function () {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("mahara-lang", lang); } catch (e) { /* ignore */ }
  }, [lang]);

  useEffect(function () {
    var unsubs = COLLECTIONS.map(function (c) {
      return store.watch(c, function (list) { setData(function (d) { var n = Object.assign({}, d); n[c] = list; return n; }); });
    });
    unsubs.push(store.onAi(function (st) {
      var mode = st.mode === "mock" && st.reason === "no_api_key" ? "rules" : st.mode; // no AI configured: the scoring engine is the normal mode
      engine.state.mode = mode; engine.state.reason = st.reason; setAiMode(mode);
    }));
    unsubs.push(store.onStatus(setLoadState));
    return function () { unsubs.forEach(function (u) { if (u) u(); }); };
  }, [store]);

  var ctx = { store: store, engine: engine, data: data };
  var ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  function setSession(s) { setSessionState(s); safeSession("mahara-cand", s); }
  function goCand(r) { navigate(candPath(r)); }
  function signOut() { setSession(null); leaveFullscreen(); navigate("/session"); }

  // Resume an in-flight candidate session after a refresh (OQ-01)
  var cand = route.cand || { name: "waiting" };
  useEffect(function () {
    if (route.area !== "candidate" || cand.name !== "resume" || loadState !== "ready") return;
    if (!session) return; // shows the waiting screen
    if (!session.attempt_id) { navigate(candPath({ name: "intro", inviteId: session.invite_id }), { replace: true }); return; }
    var a = byId(data.attempts, session.attempt_id);
    if (!a) { setSession(null); return; }
    if (a.status === "in_progress" || a.status === "generating") navigate(candPath({ name: "task", id: a.id }), { replace: true });
    else if (a.status === "submitted" || a.status === "defending") navigate(candPath({ name: "defend", id: a.id }), { replace: true });
    else setSession(null);
  }, [route.area, cand.name, loadState, data.attempts.length, session && session.attempt_id]);

  function go(r) { if (r.name === "result") navigate("/workspace/results/" + encodeURIComponent(r.id)); }
  function openTab(name, focus) { if (focus) setFocusInvite(Date.now()); navigate("/workspace/" + name); }
  function openTest(inviteId) { setSession({ invite_id: inviteId }); goCand({ name: "intro", inviteId: inviteId }); }
  function toggleLang() { setLang(lang === "ar" ? "en" : "ar"); }
  function toEmployer() { leaveFullscreen(); navigate(lastWorkspace.current || "/workspace/invites"); }

  var common = { t: t, lang: lang, data: data, store: store, engine: engine, ctx: ctx, ctxRef: ctxRef, go: go, goCand: goCand, openTab: openTab, openTest: openTest, toggleLang: toggleLang };

  if (route.area === "notfound") return html`<${NotFound} t=${t} lang=${lang} toggleLang=${toggleLang} />`;

  if (route.area === "landing") {
    return html`<div>
      <${TopBar} t=${t} lang=${lang} toggleLang=${toggleLang} onHome=${function () { navigate("/"); }} />
      <${Landing} ...${common} aiMode=${aiMode} openEmployer=${function () { openTab("invites"); }} />
    </div>`;
  }

  var notReady = loadState !== "ready";
  var loadingBlock = loadState === "error"
    ? html`<div className="panel center-msg" role="alert"><p>${t("conn_error")}</p><button className="btn btn-primary" onClick=${function () { store.reload().catch(function () {}); }}>${t("retry")}</button></div>`
    : html`<div className="panel center-msg"><p className="row"><${Spinner} /> ${t("loading_workspace")}</p></div>`;

  if (route.area === "candidate") {
    var examProps = Object.assign({}, common, { onExit: toEmployer, setSession: setSession, signOut: signOut });
    if (notReady) return html`<${ExamShell} ...${examProps}><div className="exam-cols single">${loadingBlock}</div><//>`;
    if (cand.name === "task") return html`<${TaskScreen} ...${examProps} id=${cand.id} key=${"task" + cand.id} />`;
    if (cand.name === "defend") return html`<${DefendScreen} ...${examProps} id=${cand.id} key=${"def" + cand.id} />`;
    if (cand.name === "done") return html`<${DoneScreen} ...${examProps} noWork=${cand.noWork} />`;
    if (cand.name === "intro") return html`<${ExamIntro} ...${examProps} inviteId=${cand.inviteId} key=${"intro" + cand.inviteId} />`;
    if (cand.name === "resume" && session) return html`<${ExamShell} ...${examProps}><${Spinner} /><//>`;
    return html`<${WaitingScreen} ...${examProps} />`;
  }

  var main = notReady ? loadingBlock
    : route.result ? html`<${ResultPage} ...${common} id=${route.result} key=${route.result} />`
    : route.tab === "results" ? html`<${ResultsTab} ...${common} filters=${filters} setFilters=${setFilters} />`
    : html`<${InvitesTab} ...${common} focusInvite=${focusInvite} />`;

  var toCandidate = function () { navigate("/session"); };
  return html`<div className="workspace">
    <${Rail} ...${common} onHome=${function () { navigate("/"); }} />
    <div className="wcol">
      <${WorkTop} ...${common} route=${route.result ? { name: "result" } : { name: "workspace" }} tab=${route.tab} aiMode=${aiMode} toCandidate=${toCandidate} />
      <main className="main"><div className="main-inner">${main}</div></main>
    </div>
  </div>`;
}
