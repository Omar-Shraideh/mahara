// Grading runs on the server (it keeps going even if this tab closes). The screens follow the
// attempt's status through live updates: defended -> grading -> graded (or grading_failed).
import { api } from "./api.js";

var gradingInFlight = {};
export var viewedThisSession = {}; // FR-RES-10: log one view per result per page load

export function runGrading(ctx, attemptId) {
  if (gradingInFlight[attemptId]) return gradingInFlight[attemptId];
  var p = api.post("/api/attempts/" + encodeURIComponent(attemptId) + "/grade")
    .catch(function (e) { console.warn("Grading request failed:", e && e.message); })
    .then(function () { delete gradingInFlight[attemptId]; });
  gradingInFlight[attemptId] = p;
  return p;
}
