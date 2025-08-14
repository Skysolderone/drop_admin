import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
   server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // 若后端不带 /api 前缀可开启重写：
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploadurlpic': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploadsurlpic': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
