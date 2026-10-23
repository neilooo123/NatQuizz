/** Traduit en français les messages d'erreur de Supabase les plus courants. */
export function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email ou mot de passe incorrect.'
  if (/already registered/i.test(message)) return 'Un compte existe déjà avec cet email.'
  if (/password should be at least/i.test(message)) return 'Le mot de passe doit faire au moins 6 caractères.'
  if (/should be different/i.test(message)) return "Choisis un mot de passe différent de l'ancien."
  if (/email not confirmed/i.test(message)) return "Ton email n'est pas encore confirmé (regarde dans ta boîte mail)."
  if (/rate limit|too many/i.test(message)) return 'Trop de tentatives : réessaie dans quelques minutes.'
  if (/session missing|not authenticated/i.test(message)) return 'Session expirée : reconnecte-toi puis réessaie.'
  if (/fetch|network/i.test(message)) return 'Pas de connexion internet : elle est nécessaire pour cette action.'
  return message
}
