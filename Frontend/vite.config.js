import { defineConfig } from 'vite'

// Dev proxy: forwards /api/* to the local Laravel backend (php artisan serve --port=8000).
// Only used as fallback if VITE_API_BASE_URL is not set in .env.
export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
