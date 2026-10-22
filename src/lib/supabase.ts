import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

/** Vrai quand l'URL et la clé Supabase sont renseignées. */
export const isSupabaseConfigured = Boolean(url && key)

// La clé « publishable » est publique par nature : ce sont les règles RLS
// de la base (voir supabase/schema.sql) qui protègent les données.
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'non-configuree', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // « pkce » : le lien de confirmation par email revient avec ?code=…
    // ce qui ne gêne pas la navigation par # de l'appli.
    flowType: 'pkce',
  },
})

/**
 * Chemin d'une nouvelle photo dans le stockage Supabase : « <utilisateur>/<observation>-<version>.jpg ».
 * La version change à chaque remplacement de photo, pour que les autres
 * appareils sachent qu'ils doivent la télécharger à nouveau.
 */
export function newPhotoPath(userId: string, observationId: string): string {
  return `${userId}/${observationId}-${Date.now().toString(36)}.jpg`
}

export const PHOTO_BUCKET = 'photos'
