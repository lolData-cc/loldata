import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api/loldata-ai": {
        target: "https://ai.loldata.cc",
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
