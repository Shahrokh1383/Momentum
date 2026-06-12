import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: { '@': '/src' },
    },
    server: {
      proxy: {
        '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
        '/sanctum': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false },
      },
    },
  };
});