import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'
import { appUrl } from '../share/share'

type Mode = 'signin' | 'signup'

function translateError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email ou mot de passe incorrect.'
  if (/already registered/i.test(message)) return 'Un compte existe déjà avec cet email.'
  if (/password should be at least/i.test(message)) return 'Le mot de passe doit faire au moins 6 caractères.'
  if (/email not confirmed/i.test(message)) return "Ton email n'est pas encore confirmé (regarde dans ta boîte mail)."
  if (/fetch|network/i.test(message)) return 'Pas de connexion internet : elle est nécessaire pour se connecter.'
  return message
}

export function LoginPage() {
  const { startLocalMode } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [observerName, setObserverName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
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
      }
    } catch (e) {
      setError(translateError(e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <form className="stack" style={{ width: '100%', maxWidth: 400 }} onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={72} height={72} style={{ margin: '0 auto 12px' }} />
          <h1>NatQuizz</h1>
          <p className="muted">Ta base faune et flore, et des quiz pour apprendre les espèces.</p>
        </div>

        <div className="tabs" role="tablist">
          <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>
            Se connecter
          </button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Créer un compte
          </button>
        </div>

        {info && <div className="notice success">{info}</div>}
        {error && <div className="notice error">{error}</div>}

        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
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
        </label>
        {mode === 'signup' && (
          <label className="field">
            <span>Ton nom d'observateur</span>
            <input required value={observerName} onChange={(e) => setObserverName(e.target.value)} placeholder="ex. Neil" />
            <span className="hint">Il sera noté sur tes observations. Tu pourras le changer plus tard.</span>
          </label>
        )}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Un instant…' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
        </button>
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
