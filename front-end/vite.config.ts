import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'offline.html'],
      // REMOVED: manifest: false,
      devOptions: {
        enabled: true, // CRITICAL: Enables SW in npm run dev mode
      },
      workbox: {
        // CRITICAL: ONLY precache the static shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // CRITICAL: NO runtimeCaching for /api/ - React Query handles this
        navigateFallback: '/index.html',
        // Ensure offline.html is precached
        additionalManifestEntries: [
          { url: '/offline.html', revision: null }
        ],
      },
      manifest: {
        name: 'Momentum',
        short_name: 'Momentum',
        description: 'Build habits with momentum',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#11998e',
        orientation: 'portrait-primary',
        scope: '/',
        icons: [
          {
            src: '/assets/logo-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
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