import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    // The worktree ships both legacy .js (stale, compiled long ago) and
    // current .tsx files for many components. Vite's default order puts
    // .js BEFORE .tsx, so without this list every edit to a .tsx silently
    // resolved to the pre-built .js and Hot Module Replacement reported
    // success while the browser kept rendering the old code. Promoting
    // .tsx / .ts above .js fixes the resolution — edits to the .tsx win.
    extensions: [
      ".mjs",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".json",
    ],
  },
  server: {
    // host: true binds to all network interfaces (0.0.0.0) so phones on
    // the same WiFi can hit http://<PC-LAN-IP>:5173. Without this Vite
    // listens only on 127.0.0.1 and the phone times out.
    host: true,
    proxy: {
      // ORDER MATTERS — Vite matches proxies by the FIRST hit on the
      // path prefix. The AI chat lives on :3002, so we route it
      // first; everything else under /api falls through to the
      // scout backend at :3001.
      "/api/loldata-ai": {
        target: "http://localhost:3002",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/loldata-ai$/, "/chat/ask"),
      },

      // Catch-all backend proxy. Letting Vite forward /api means the
      // phone hits http://<PC-LAN-IP>:5173/api/scout/feed/... and Vite
      // talks to localhost:3001 on the PC's behalf — no need to expose
      // the backend on the LAN. Frontend should fetch with relative
      // URLs (see src/config.ts → API_BASE_URL = "" in dev).
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        // ws:true lets Vite proxy the WebSocket upgrade for live lobby
        // chat (/api/scout/lobby/:slug/ws) through to the Bun backend.
        ws: true,
      },

      "/lolcdn": {
        target: "https://cdn2.loldata.cc",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/lolcdn/, ""),
      },
    },
  },
})
