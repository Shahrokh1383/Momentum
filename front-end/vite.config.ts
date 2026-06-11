import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      VitePWA({
        // Switch to injectManifest for full control over the service worker
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: false, // We register manually in main.tsx

        includeAssets: ['favicon.ico', 'offline.html', 'assets/icon.jpg'],

        // Enable PWA in dev mode (uses our custom sw.ts)
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        },

        injectManifest: {
          // Precache app shell + key static assets
          globPatterns: [
            '**/*.{js,css,html,ico,png,jpg,jpeg,webp,woff,woff2,ttf}',
          ],

          // EXCLUDE Font Awesome JS bundles & sprites (too large, we use CSS version)
          globIgnores: [
            '**/node_modules/**/*',
            '**/FontAwesome/js/**',
            '**/FontAwesome/sprites/**',
            'sw.js',
            'workbox-*.js',
          ],

          // Increase size limit for the main JS bundle (~547 KB)
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
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
            { src: '/assets/logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/assets/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/assets/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
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