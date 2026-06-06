import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    // KISS: Manually define the alias since native tsconfigPaths doesn't exist without a plugin
    alias: {
      '@': '/src'
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Changed from localhost to 127.0.0.1 to prevent Node IPv6 proxy dropping
        changeOrigin: true,
        secure: false,
      },
      '/sanctum': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})