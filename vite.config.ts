import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api/loldata-ai': {
        target: 'https://ai.loldata.cc',
        changeOrigin: true,
        secure: true,
        // riscrive /api/loldata-ai -> /chat/ask
        rewrite: (path) => path.replace(/^\/api\/loldata-ai$/, '/chat/ask'),
      },
    },
  },
})
