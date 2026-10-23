import { useAuth } from './AuthProvider'
import { PasswordForm } from './PasswordForm'
import { endRecovery } from './recovery'

/** Affichée quand on arrive depuis le lien « mot de passe oublié » reçu par email. */
export function NewPasswordPage() {
  const { user } = useAuth()

  return (
    <div className="center-screen">
      <div className="stack" style={{ width: '100%', maxWidth: 400 }}>
        <h1>Nouveau mot de passe</h1>
        <p className="muted">Choisis un nouveau mot de passe pour ton compte {user?.email}.</p>
        <PasswordForm email={user?.email ?? ''} submitLabel="Enregistrer le mot de passe" onDone={endRecovery} />
        <button type="button" className="link-button" onClick={endRecovery}>
          Plus tard
        </button>
      </div>
    </div>
  )
}
