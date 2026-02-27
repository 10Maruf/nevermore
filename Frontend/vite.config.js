import { defineConfig } from 'vite'

// Dev proxy: allows the app running on http://localhost:5173 to call
// /backend/* without triggering browser CORS.
// Requests like /backend/api/... are proxied to the real cPanel backend.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
    headers: {
      'X-Dev-Proxy': 'enabled',
    },
    proxy: {
      // API calls: use local backend (which can connect to remote cPanel DB)
      '/backend/api': {
        target: 'http://localhost',
        changeOrigin: true,
      },

      '/backend': {
        target: 'http://localhost',
        changeOrigin: true,
      },
    },
  },
})
