// Variables d'environnement lues par Vite (fichier .env.local ou GitHub Actions).
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_KEY?: string
}
