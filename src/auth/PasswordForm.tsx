import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { translateAuthError } from './errors'

interface Props {
  /** Email du compte, pour que le gestionnaire de mots de passe associe le bon compte. */
  email: string
  submitLabel: string
  onDone?: () => void
}

/** Choix d'un nouveau mot de passe (saisi deux fois pour éviter les fautes de frappe). */
export function PasswordForm({ email, submitLabel, onDone }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setMessage({ text: 'Les deux mots de passe ne sont pas identiques.', error: true })
      return
    }
    setBusy(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setMessage({ text: translateAuthError(error.message), error: true })
      return
    }
    setPassword('')
    setConfirm('')
    setMessage({ text: 'Mot de passe changé !' })
    onDone?.()
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {/* Champ invisible : aide le navigateur à enregistrer le mot de passe pour le bon compte. */}
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <label className="field">
        <span>Nouveau mot de passe</span>
        <input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className="field">
        <span>Confirme le mot de passe</span>
        <input type="password" autoComplete="new-password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <span className="hint">Accepte l'enregistrement proposé par ton navigateur pour ne plus l'oublier.</span>
      </label>
      {message && <div className={`notice ${message.error ? 'error' : 'success'}`}>{message.text}</div>}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Un instant…' : submitLabel}
      </button>
    </form>
  )
}
