import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon/favicon.ico',
        'favicon/favicon-16x16.png',
        'favicon/favicon-32x32.png',
        'favicon/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
      ],
      manifest: {
        name: 'Rentabilidad de alquiler',
        short_name: 'Rentabilidad',
        description:
          'Calculá si un alquiler rinde: precio de compra en USD, alquiler mensual en ARS y el dólar oficial actualizado.',
        theme_color: '#17181a',
        background_color: '#17181a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es-AR',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/dolarapi\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dolar-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
            },
          },
        ],
      },
    }),
  ],
})
