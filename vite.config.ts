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
    proxy: {
      "/api/loldata-ai": {
        target: "http://localhost:3002",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/loldata-ai$/, "/chat/ask"),
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
