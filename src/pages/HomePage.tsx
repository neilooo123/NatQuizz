import { Link } from 'react-router'
import { useUser } from '../auth/AuthProvider'
import { Icon } from '../components/Icon'
import { InstallBanner } from '../components/InstallBanner'
import { ObservationPhoto } from '../components/ObservationPhoto'
import { useSpeciesSummaries } from '../db/hooks'

export function HomePage() {
  const user = useUser()
  const summaries = useSpeciesSummaries() ?? []
  const observationCount = summaries.reduce((total, s) => total + s.observationCount, 0)
  const recent = summaries
    .filter((s) => s.coverObservationId && s.lastObservedAt)
    .sort((a, b) => b.lastObservedAt!.localeCompare(a.lastObservedAt!))
    .slice(0, 4)

  return (
    <div className="stack">
      <div>
        <h1>Bonjour {user.observerName || 'naturaliste'} 🍂</h1>
        <p className="muted">Qu'as-tu observé aujourd'hui ?</p>
      </div>

      <InstallBanner />

      <Link to="/observer" className="action-card">
        <span className="action-icon">
          <Icon name="camera" size={28} />
        </span>
        <span>
          <strong>Nouvelle observation</strong>
          <span className="muted small">Photographie une plante ou un animal</span>
        </span>
      </Link>
      <Link to="/quiz" className="action-card accent">
        <span className="action-icon">
          <Icon name="quiz" size={28} />
        </span>
        <span>
          <strong>Quiz</strong>
          <span className="muted small">Teste tes connaissances</span>
        </span>
      </Link>
      <Link to="/especes" className="action-card olive">
        <span className="action-icon">
          <Icon name="leaf" size={28} />
        </span>
        <span>
          <strong>Mes espèces</strong>
          <span className="muted small">Ta base faune et flore</span>
        </span>
      </Link>

      <div className="stats">
        <div className="stat">
          <b>{summaries.length}</b> espèce{summaries.length > 1 ? 's' : ''}
        </div>
        <div className="stat">
          <b>{observationCount}</b> observation{observationCount > 1 ? 's' : ''}
        </div>
      </div>

      {recent.length > 0 && (
        <section className="stack" style={{ gap: 8 }}>
          <h2 style={{ margin: 0 }}>Dernières observations</h2>
          <div className="thumb-row">
            {recent.map((s) => (
              <Link key={s.species.id} to={`/especes/${s.species.id}`} title={s.species.vernacularName}>
                <ObservationPhoto observationId={s.coverObservationId} alt={s.species.vernacularName} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link to="/scanner" className="btn btn-outline btn-block">
        <Icon name="qr" /> Scanner une fiche partagée
      </Link>
    </div>
  )
}
