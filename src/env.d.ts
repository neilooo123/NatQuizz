// Valeurs fixées au moment de la construction (voir vite.config.ts).
declare const __APP_VERSION__: string
declare const __BUILD_DATE__: string

// Variables d'environnement lues par Vite (fichier .env.local ou GitHub Actions).
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_KEY?: string
}
