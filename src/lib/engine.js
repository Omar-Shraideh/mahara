// Client side of the AI engine. Helpers (field labels, criterion names) run locally;
// anything that calls Claude goes to the server, which holds the API key.
import AI from "../../shared/engine.js";
import { api } from "./api.js";

export function createClientEngine() {
  var local = AI.createEngine({});
  var state = { mode: "mock", reason: "" };
  return {
    state: state,
    fieldsSpec: local.fieldsSpec,
    roleName: local.roleName,
    criterionName: local.criterionName,
    generateTask: function (bp, lang) {
      return api.post("/api/ai/task", { role: bp.role, lang: lang }).then(function (r) { return r.task; });
    },
    generateQuestions: function (bp, task, submission, lang, attemptId) {
      return api.post("/api/ai/questions", { attempt_id: attemptId });
    }
  };
}
