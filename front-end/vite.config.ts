import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'offline.html'],
        devOptions: {
          enabled: true,
        },
        workbox: {
          globPatterns: isDev ? [] : ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
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
  }
})