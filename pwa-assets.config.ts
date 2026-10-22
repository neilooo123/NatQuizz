import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Génère les icônes de l'appli à partir de public/favicon.svg
// (commande : npm run icons)
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#C2581F' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#C2581F' } },
  },
  images: ['public/favicon.svg'],
})
