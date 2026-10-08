// Puts the fictional demo data back. Run in the Replit Shell:  npm run reset-demo
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, "data", "mahara-db.json");

try {
  const res = await fetch("http://127.0.0.1:" + PORT + "/api/demo/reset", { method: "POST" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  console.log("Demo data restored. Refresh the browser tab.");
} catch (e) {
  // Server not running: delete the data file; the next start seeds fresh demo data.
  try { fs.rmSync(DATA_FILE, { force: true }); } catch (x) { /* ignore */ }
  console.log("The app is not running, so the saved data was cleared. Press Run and the demo data comes back.");
}
