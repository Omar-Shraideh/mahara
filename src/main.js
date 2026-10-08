import "@fontsource/readex-pro/400.css";
import "@fontsource/readex-pro/500.css";
import "@fontsource/readex-pro/600.css";
import "@fontsource/alexandria/500.css";
import "@fontsource/alexandria/600.css";
import "@fontsource/alexandria/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./styles.css";
import { createRoot } from "react-dom/client";
import { html } from "./lib/core.js";
import { createApiStore } from "./lib/store.js";
import { createClientEngine } from "./lib/engine.js";
import { App } from "./App.js";

var store = createApiStore();
var engine = createClientEngine();
createRoot(document.getElementById("app")).render(html`<${App} store=${store} engine=${engine} />`);
