import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { appUrl } from '../share/share'
import { useAuth } from './AuthProvider'
import { translateAuthError } from './errors'

type Mode = 'signin' | 'signup' | 'reset'

export function LoginPage() {
  const { startLocalMode } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [observerName, setObserverName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { observer_name: observerName.trim() }, emailRedirectTo: appUrl() },
        })
        if (error) throw error
        if (!data.session) {
          setInfo('Compte créé ! Clique sur le lien reçu par email pour le confirmer, puis connecte-toi.')
          setMode('signin')
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() })
        if (error) throw error
        setInfo(
          "Si un compte existe pour cette adresse, un email vient de partir (regarde aussi dans les spams). Ouvre le lien sur cet appareil, dans ce même navigateur, pour choisir un nouveau mot de passe.",
        )
      }
    } catch (e) {
      setError(translateAuthError(e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }

  const submitLabel = { signin: 'Se connecter', signup: 'Créer mon compte', reset: 'Recevoir un lien par email' }[mode]

  return (
    <div className="center-screen">
      <form className="stack" style={{ width: '100%', maxWidth: 400 }} onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={72} height={72} style={{ margin: '0 auto 12px' }} />
          <h1>NatQuizz</h1>
          <p className="muted">Ta base faune et flore, et des quiz pour apprendre les espèces.</p>
        </div>

        {mode === 'reset' ? (
          <div>
            <h2 style={{ marginBottom: 4 }}>Mot de passe oublié</h2>
            <p className="small muted" style={{ margin: 0 }}>
              Indique l'email de ton compte : tu recevras un lien pour choisir un nouveau mot de passe.
            </p>
          </div>
        ) : (
          <div className="tabs" role="tablist">
            <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')}>
              Se connecter
            </button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>
              Créer un compte
            </button>
          </div>
        )}

        {info && <div className="notice success">{info}</div>}
        {error && <div className="notice error">{error}</div>}

        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        {mode !== 'reset' && (
          <label className="field">
            <span>Mot de passe</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'signup' && (
              <span className="hint">Accepte l'enregistrement proposé par ton navigateur pour ne pas l'oublier.</span>
            )}
          </label>
        )}

        {mode === 'signup' && (
          <label className="field">
            <span>Ton nom d'observateur</span>
            <input required value={observerName} onChange={(e) => setObserverName(e.target.value)} placeholder="ex. Neil" />
            <span className="hint">Il sera noté sur tes observations. Tu pourras le changer plus tard.</span>
          </label>
        )}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Un instant…' : submitLabel}
        </button>

        {mode === 'signin' && (
          <button type="button" className="link-button" onClick={() => switchMode('reset')}>
            Mot de passe oublié ?
          </button>
        )}
        {mode === 'reset' && (
          <button type="button" className="link-button" onClick={() => switchMode('signin')}>
            Retour à la connexion
          </button>
        )}

        <p className="small muted" style={{ textAlign: 'center' }}>
          Une connexion internet est nécessaire la première fois. Ensuite, l'appli fonctionne aussi hors ligne.
        </p>

        {import.meta.env.DEV && (
          <button type="button" className="btn btn-outline btn-block" onClick={startLocalMode}>
            Mode local (développement, sans compte)
          </button>
        )}
      </form>
    </div>
  )
}
