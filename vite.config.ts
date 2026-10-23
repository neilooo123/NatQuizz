import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // L'appli est publiée sur https://neilooo123.github.io/NatQuizz/
  base: '/NatQuizz/',
  // L'appli est mise en cache sur le téléphone : un fichier JS un peu gros n'est pas gênant.
  build: { chunkSizeWarningLimit: 1000 },
  plugins: [
    react(),
    VitePWA({
      // « prompt » : l'appli affiche un bandeau quand une nouvelle version est prête
      // (pas de rechargement automatique qui effacerait un formulaire en cours).
      registerType: 'prompt',
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
