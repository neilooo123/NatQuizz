import { useState } from 'react'
import { isIos, isStandalone, promptInstall, useCanPromptInstall } from '../lib/install'

const DISMISS_KEY = 'natquizz.install-dismissed'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Invite à installer l'appli sur l'écran d'accueil (pour l'utiliser hors ligne). */
export function InstallBanner({ dismissible = true }: { dismissible?: boolean }) {
  const canPrompt = useCanPromptInstall()
  const [hidden, setHidden] = useState(() => dismissible && wasDismissed())

  if (hidden || isStandalone() || (!canPrompt && !isIos())) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Pas grave : la bannière reviendra.
    }
    setHidden(true)
  }

  return (
    <div className="notice stack" style={{ gap: 8 }}>
      <strong>Installe NatQuizz sur ton écran d'accueil</strong>
      {canPrompt ? (
        <span className="small">Elle s'ouvrira comme une vraie appli et fonctionnera sans réseau.</span>
      ) : (
        <span className="small">
          Dans Safari, touche le bouton <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong>.
        </span>
      )}
      <div className="row">
        {canPrompt && (
          <button type="button" className="btn btn-primary btn-small" onClick={() => void promptInstall()}>
            Installer
          </button>
        )}
        {dismissible && (
          <button type="button" className="btn btn-small btn-outline" onClick={dismiss}>
            Plus tard
          </button>
        )}
      </div>
    </div>
  )
}
