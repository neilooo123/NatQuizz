import { useRegisterSW } from 'virtual:pwa-register/react'

const ONE_HOUR = 60 * 60 * 1000

/** Bandeau « Nouvelle version disponible » quand l'appli a été mise à jour en ligne. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Vérifie aussi régulièrement si une nouvelle version est sortie, appli ouverte.
      if (registration) setInterval(() => void registration.update(), ONE_HOUR)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="update-banner" role="status">
      <span>Nouvelle version de NatQuizz disponible.</span>
      <div className="row">
        <button type="button" className="btn btn-primary btn-small" onClick={() => void updateServiceWorker(true)}>
          Mettre à jour
        </button>
        <button type="button" className="btn btn-small btn-outline" onClick={() => setNeedRefresh(false)}>
          Plus tard
        </button>
      </div>
    </div>
  )
}
