// Small fetch wrapper. Errors come back as { code, message } and never as raw stack traces.
async function request(method, url, body) {
  var res;
  try {
    res = await fetch(url, {
      method: method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw { code: "offline", message: "Can't reach the Mahara server." };
  }
  var json = null;
  try { json = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    var err = (json && json.error) || {};
    throw { code: err.code || "http_" + res.status, message: err.message || "Request failed (" + res.status + ")." };
  }
  return json;
}

export const api = {
  get: function (url) { return request("GET", url); },
  post: function (url, body) { return request("POST", url, body || {}); },
  put: function (url, body) { return request("PUT", url, body); },
  patch: function (url, body) { return request("PATCH", url, body); },
  del: function (url) { return request("DELETE", url); }
};
