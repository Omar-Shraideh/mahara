import { defineConfig } from "vite";

// No JSX: screens use htm templates (the locked app's syntax), so no React plugin is needed.
export default defineConfig({
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 900 },
  server: { host: "0.0.0.0" }
});
