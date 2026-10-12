import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward /api calls to the Express server so we avoid CORS issues in development
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
