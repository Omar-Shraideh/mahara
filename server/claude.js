// Server-side Claude call. The API key never leaves the server.
// Exposes the same shape the shared engine expects: sample.json(prompt, { modelTier }) -> parsed JSON,
// rejecting with { code } so the engine can retry, fall back, or switch to the built-in rules.
const API_VERSION = "2023-06-01";

function codeForStatus(status) {
  if (status === 401 || status === 403) return "not_granted";      // bad or missing key: switch to built-in rules
  if (status === 404) return "not_granted";                        // model name not available on this key
  if (status === 429) return "rate_limited";
  if (status === 400) return "bad_request";
  return "upstream_error";                                         // 500, 529 overloaded, 502/503 and so on
}

// Pull the first JSON object out of a model reply (handles ```json fences and stray prose).
export function parseJsonReply(text) {
  var s = String(text || "").trim();
  var fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try { return JSON.parse(s); } catch (e) { /* fall through */ }
  var a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) return JSON.parse(s.slice(a, b + 1));
  throw new Error("no JSON object in reply");
}

export function createSample(opts) {
  var apiKey = opts.apiKey;
  var baseUrl = (opts.baseUrl || "https://api.anthropic.com").replace(/\/+$/, "").replace(/\/v1$/, "");
  var pick = { fast: 0, grader: 0 }; // index into the model fallback lists
  var models = opts.models;
  var timeoutMs = opts.timeoutMs || 60000;            // grading calls
  var quickTimeoutMs = opts.timeoutMs || 25000;       // task and question calls
  // Circuit breaker: after a timeout, network error or 5xx, fail fast for a minute so retries
  // do not keep a candidate waiting; the built-in rules take over straight away.
  var coolUntil = 0;
  var COOL_MS = 60000;
  var log = opts.log || function () {};
  var sendTemperature = true;

  async function post(body, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    try {
      var res = await fetch(baseUrl + "/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": API_VERSION },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      var text = await res.text();
      var json = null;
      try { json = JSON.parse(text); } catch (e) { /* not JSON */ }
      return { status: res.status, json: json, text: text };
    } finally {
      clearTimeout(timer);
    }
  }

  async function json(prompt, o) {
    var tier = (o && o.modelTier) || "default";
    var kind = tier === "quick" ? "fast" : "grader";
    var model = models[kind][pick[kind]];
    var body = { model: model, max_tokens: tier === "quick" ? 1200 : 2400, messages: [{ role: "user", content: prompt }] };
    if (sendTemperature) body.temperature = tier === "quick" ? 0.7 : 0;
    var ms = tier === "quick" ? quickTimeoutMs : timeoutMs;
    if (Date.now() < coolUntil) throw { code: "upstream_error", message: "Claude was unreachable a moment ago; using built-in rules for now" };
    var r;
    try {
      r = await post(body, ms);
      // Some models reject sampling parameters; retry once without and remember.
      if (r.status === 400 && /temperature/i.test(r.text) && body.temperature !== undefined) {
        sendTemperature = false;
        delete body.temperature;
        r = await post(body, ms);
      }
    } catch (e) {
      var code = e && e.name === "AbortError" ? "timeout" : "network_error";
      coolUntil = Date.now() + COOL_MS;
      log({ op: "claude", tier: tier, ok: false, code: code });
      throw { code: code, message: "Claude request failed (" + code + ")" };
    }
    // Model not available to this account: move to the next model in the list and retry.
    while (r.status === 404 || (r.status === 400 && /model/i.test(r.text))) {
      if (body.model === models[kind][pick[kind]]) {
        if (pick[kind] >= models[kind].length - 1) break;
        pick[kind]++;               // this request is the first to find the model missing
      }                              // otherwise a parallel request already moved on: just use the current one
      body.model = models[kind][pick[kind]];
      log({ op: "claude", tier: tier, ok: false, code: "model_unavailable", message: "switching to " + body.model });
      try { r = await post(body, ms); } catch (e) { coolUntil = Date.now() + COOL_MS; throw { code: "network_error", message: "Claude request failed" }; }
    }
    if (r.status < 200 || r.status >= 300) {
      var c = codeForStatus(r.status);
      if (c === "upstream_error") coolUntil = Date.now() + COOL_MS;
      var msg = r.json && r.json.error && r.json.error.message ? r.json.error.message : "HTTP " + r.status;
      log({ op: "claude", tier: tier, ok: false, code: c, status: r.status, message: msg });
      throw { code: c, message: msg };
    }
    var blocks = (r.json && r.json.content) || [];
    var text = blocks.filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("");
    try {
      var v = parseJsonReply(text);
      log({ op: "claude", tier: tier, ok: true });
      return v;
    } catch (e) {
      log({ op: "claude", tier: tier, ok: false, code: "invalid_json" });
      throw { code: "invalid_json", message: "Claude's reply was not valid JSON", text: text };
    }
  }

  return { json: json, currentModels: function () { return { fast: models.fast[pick.fast], grader: models.grader[pick.grader] }; } };
}
