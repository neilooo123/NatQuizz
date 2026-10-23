import { useEffect, useState } from 'react'

const ONE_HOUR = 60 * 60 * 1000

/**
 * Bandeau « Nouvelle version installée » : la mise à jour s'installe toute seule
 * en arrière-plan ; il suffit ensuite de recharger quand ça nous arrange.
 */
export function UpdateBanner() {
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    const sw = navigator.serviceWorker
    if (!sw) return

    // À la toute première installation, il n'y a pas d'ancienne version : pas de bandeau.
    const hadVersion = !!sw.controller
    const onControllerChange = () => {
      if (hadVersion) setUpdated(true)
    }
    // Cherche une nouvelle version au retour dans l'appli, puis toutes les heures.
    const checkForUpdate = () => void sw.getRegistration().then((registration) => registration?.update())
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }

    sw.addEventListener('controllerchange', onControllerChange)
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(checkForUpdate, ONE_HOUR)
    return () => {
      sw.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [])

  if (!updated) return null

  return (
    <div className="update-banner" role="status">
      <span>Une nouvelle version de NatQuizz est installée.</span>
      <div className="row">
        <button type="button" className="btn btn-primary btn-small" onClick={() => window.location.reload()}>
          Recharger
        </button>
        <button type="button" className="btn btn-small btn-outline" onClick={() => setUpdated(false)}>
          Plus tard
        </button>
      </div>
    </div>
  )
}
