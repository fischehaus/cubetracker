import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: API liegt bei localhost:8000 (lokales Backend), in Prod kommt
// VITE_API_BASE aus der Build-Env (gesetzt im Render-Static-Site-Service).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
