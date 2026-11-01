import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

// VITE_BACKEND=selfhosted → API propia (carpeta server/) en lugar de Base44.
const selfHosted = process.env.VITE_BACKEND === 'selfhosted'
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // En desarrollo (y en "vite preview") las llamadas /api van a la API local.
  server: selfHosted ? { proxy: { '/api': { target: apiTarget, changeOrigin: false } } } : undefined,
  preview: selfHosted ? { proxy: { '/api': { target: apiTarget, changeOrigin: false } } } : undefined,
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    // El plugin de Base44 (editor visual, analítica, proxy) solo aplica cuando se usa Base44.
    ...(selfHosted ? [] : [base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    })]),
    react(),
    VitePWA({
      // "prompt": la versión nueva se instala solo cuando el usuario acepta (ver PWAManager),
      // así nunca se recarga la página a mitad de un reporte o de un cierre de pago.
      registerType: 'prompt',
      injectRegister: false, // el registro lo hace src/components/pwa/PWAManager.jsx
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Control de Labores | TaskFlow Pro',
        short_name: 'Labores',
        description: 'Control de labores, asistencia, tareas, pagos y reportes corporativos.',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f8fafc',
        theme_color: '#059669',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Reporte diario', url: '/DailyReports', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Asistencia', url: '/Attendance', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Tareas', url: '/Tasks', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        // Se precachea solo la "carcasa" de la app (JS, CSS, HTML, iconos).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Rutas de la SPA: cualquier navegación devuelve index.html (también sin conexión)...
        navigateFallback: '/index.html',
        // ...excepto la API de Base44 y las rutas internas de la plataforma.
        navigateFallbackDenylist: [/^\/api\//, /^\/__/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            // Datos, nóminas, salarios y autenticación: NUNCA desde caché (son privados y cambian).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            // Imágenes y mosaicos del mapa: rápidos desde caché y se refrescan en segundo plano.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'labores-images',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ]
});