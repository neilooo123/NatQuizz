import { useEffect, useState, type FormEvent } from 'react'
import { useAuth, useUser } from '../auth/AuthProvider'
import { PasswordForm } from '../auth/PasswordForm'
import { Icon } from '../components/Icon'
import { InstallBanner } from '../components/InstallBanner'
import { usePendingCount } from '../db/hooks'
import { runSync } from '../sync/sync'
import { useSyncStatus } from '../sync/status'

interface StorageInfo {
  usedMb: number | null
  persisted: boolean | null
}

export function SettingsPage() {
  const user = useUser()
  const { signOut, setObserverName, localMode } = useAuth()
  const sync = useSyncStatus()
  const pending = usePendingCount()
  const [name, setName] = useState(user.observerName)
  const [nameMessage, setNameMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [storage, setStorage] = useState<StorageInfo>({ usedMb: null, persisted: null })
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    async function load() {
      const estimate = await navigator.storage?.estimate?.()
      const persisted = await navigator.storage?.persisted?.()
      setStorage({
        usedMb: estimate?.usage !== undefined ? Math.round((estimate.usage / 1024 / 1024) * 10) / 10 : null,
        persisted: persisted ?? null,
      })
    }
    void load()
  }, [pending])

  async function saveName(event: FormEvent) {
    event.preventDefault()
    try {
      await setObserverName(name.trim())
      setNameMessage({ text: 'Nom enregistré.' })
    } catch {
      setNameMessage({ text: "Nom enregistré sur cet appareil, mais pas sur ton compte (pas de réseau ?).", error: true })
    }
  }

  async function handleSignOut() {
    const warning = pending
      ? `${pending} modification(s) ne sont pas encore synchronisées. Elles restent sur cet appareil et partiront à ta prochaine connexion. Se déconnecter ?`
      : 'Se déconnecter ?'
    if (window.confirm(warning)) await signOut()
  }

  return (
    <div className="stack">
      <h1>Réglages</h1>

      <form className="card stack" onSubmit={saveName}>
        <h2 style={{ margin: 0 }}>Observateur</h2>
        <label className="field">
          <span>Nom noté sur tes nouvelles observations</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        {nameMessage && <div className={`notice ${nameMessage.error ? 'error' : 'success'}`}>{nameMessage.text}</div>}
        <button className="btn" disabled={name.trim() === user.observerName}>
          Enregistrer
        </button>
      </form>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Synchronisation</h2>
        {localMode ? (
          <p className="muted">Mode local : les données restent sur cet appareil.</p>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              {pending ? `${pending} modification(s) en attente d'envoi.` : 'Tout est sauvegardé sur le cloud.'}
              <br />
              <span className="small muted">
                Dernière synchro :{' '}
                {sync.lastSyncAt ? new Date(sync.lastSyncAt).toLocaleString('fr-FR') : 'pas encore pendant cette session'}
              </span>
            </p>
            {sync.error && <div className="notice error">{sync.error}</div>}
            <button type="button" className="btn" onClick={() => void runSync()} disabled={sync.state === 'syncing'}>
              <Icon name="refresh" size={18} /> {sync.state === 'syncing' ? 'Synchronisation…' : 'Synchroniser maintenant'}
            </button>
          </>
        )}
      </section>

      <section className="card stack" style={{ gap: 4 }}>
        <h2>Stockage sur cet appareil</h2>
        {storage.usedMb !== null && <span>{storage.usedMb} Mo utilisés</span>}
        {storage.persisted !== null && (
          <span className="small muted">
            {storage.persisted
              ? 'Stockage protégé : le navigateur ne videra pas les données.'
              : "Stockage non protégé : installe l'appli sur l'écran d'accueil pour plus de sécurité."}
          </span>
        )}
      </section>

      <InstallBanner dismissible={false} />

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Compte</h2>
        <span className="muted">{user.email}</span>
        {!localMode &&
          (changingPassword ? (
            <PasswordForm email={user.email} submitLabel="Changer le mot de passe" />
          ) : (
            <button type="button" className="btn" onClick={() => setChangingPassword(true)}>
              Changer de mot de passe
            </button>
          ))}
        <button type="button" className="btn btn-danger" onClick={handleSignOut}>
          Se déconnecter
        </button>
      </section>

      <p className="small muted" style={{ textAlign: 'center' }}>
        NatQuizz · version 0.1
      </p>
    </div>
  )
}
