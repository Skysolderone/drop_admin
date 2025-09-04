/*
 * @Author: Tommy tommy@example.com
 * @Date: 2025-08-29 16:18:36
 * @LastEditors: Tommy tommy@example.com
 * @LastEditTime: 2025-09-01 16:10:42
 * @FilePath: \drop_admin\vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
   server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // 若后端不带 /api 前缀可开启重写：
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/v1': {
        target: 'http://worldchain_drop_api:9393',
        changeOrigin: true,
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
