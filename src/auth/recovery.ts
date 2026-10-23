// Retour depuis le lien « mot de passe oublié » reçu par email.
// Supabase prévient avec l'événement PASSWORD_RECOVERY, parfois avant même
// le premier affichage : on l'écoute donc dès le chargement de l'appli.

import { useSyncExternalStore } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

let recovering = false
const listeners = new Set<() => void>()

function setRecovering(value: boolean) {
  recovering = value
  for (const listener of listeners) listener()
}

if (isSupabaseConfigured) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') setRecovering(true)
  })
}

/** Le nouveau mot de passe a été choisi (ou l'utilisateur a annulé). */
export function endRecovery(): void {
  setRecovering(false)
}

/** Vrai quand l'utilisateur arrive depuis le lien de réinitialisation. */
export function useRecovering(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => recovering,
  )
}
