import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  // L'appli est publiée sur https://neilooo123.github.io/NatQuizz/
  base: '/NatQuizz/',
  // L'appli est mise en cache sur le téléphone : un fichier JS un peu gros n'est pas gênant.
  build: { chunkSizeWarningLimit: 1000 },
  // Numéro de version et date de publication, affichés dans les Réglages.
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      // « autoUpdate » : une nouvelle version s'installe toute seule en arrière-plan.
      // L'appli ne se recharge pas d'elle-même (un formulaire en cours serait perdu) :
      // elle affiche un bandeau « Recharger » (voir UpdateBanner).
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'NatQuizz',
        short_name: 'NatQuizz',
        description: 'Ma base faune et flore, et des quiz pour apprendre les espèces.',
        lang: 'fr',
        start_url: '.',
        display: 'standalone',
        theme_color: '#C2581F',
        background_color: '#FBF6EE',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout ce qui est nécessaire pour fonctionner hors ligne,
        // y compris le lecteur de QR code (fichier .wasm).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
})
