import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { categoryLabel } from '../db/categories'
import { getDb } from '../db/db'
import { formatDate } from '../lib/format'
import { decodeShareData, type SharePayload } from '../share/encode'
import { fetchShare, importShare } from '../share/share'

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Délai dépassé')), ms))])
}

export function ImportPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { localMode } = useAuth()
  const encoded = params.get('d')
  const link = useMemo(() => (encoded ? decodeShareData(encoded) : null), [encoded])

  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const alreadyImported = useLiveQuery(
    async () => (link ? getDb().observations.where('shareId').equals(link.id).filter((o) => !o.deletedAt).first() : undefined),
    [link?.id],
  )

  // Avec du réseau, on récupère la fiche complète (avec les photos).
  useEffect(() => {
    if (!link || localMode || !navigator.onLine) {
      setLoading(false)
      return
    }
    let cancelled = false
    withTimeout(fetchShare(link.id), 8000)
      .then((p) => !cancelled && setPayload(p))
      .catch(() => {
        // Hors ligne ou serveur indisponible : on se contente du texte du lien.
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [link, localMode])

  if (!link) {
    return (
      <div className="empty stack">
        <p>Ce lien de partage est invalide ou incomplet.</p>
        <Link to="/scanner" className="btn">
          Scanner à nouveau
        </Link>
      </div>
    )
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      const { speciesId } = await importShare(getDb(), link!, payload)
      navigate(`/especes/${speciesId}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setImporting(false)
    }
  }

  const species = payload?.species ?? { vernacularName: link.v, latinName: link.l, category: link.c }
  const observations = payload?.observations ?? []
  const mainObservation = link.o

  return (
    <div className="stack">
      <h1>Fiche partagée</h1>

      <section className="card stack" style={{ gap: 6 }}>
        <h2 style={{ margin: 0 }}>{species.vernacularName}</h2>
        <span className="latin">{species.latinName || 'Nom latin non renseigné'}</span>
        <span>
          <span className="badge">{categoryLabel(species.category)}</span>
        </span>
      </section>

      {loading ? (
        <div className="notice">Recherche des photos…</div>
      ) : payload ? (
        <div className="stack">
          {observations.map((o) => (
            <article key={o.sourceId} className="observation-card">
              {o.photoUrl ? <img src={o.photoUrl} alt="" className="photo" /> : <div className="photo-placeholder">Pas de photo</div>}
              <div className="observation-body small">
                <strong>{formatDate(o.observedAt)}</strong>
                {o.placeName && <> · {o.placeName}</>}
                {o.observer && <div className="muted">Observé par {o.observer}</div>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          {mainObservation && (
            <div className="card small">
              <strong>{formatDate(mainObservation.d)}</strong>
              {mainObservation.p && <> · {mainObservation.p}</>}
              {mainObservation.ob && <div className="muted">Observé par {mainObservation.ob}</div>}
            </div>
          )}
          <div className="notice">
            La photo n'est pas encore disponible (pas de réseau, ou l'autre personne ne s'est pas encore synchronisée).
            La fiche sera ajoutée tout de suite et la photo arrivera automatiquement plus tard.
          </div>
        </>
      )}

      {alreadyImported && (
        <div className="notice success">
          Tu as déjà importé cette fiche. <Link to={`/especes/${alreadyImported.speciesId}`}>Voir la fiche</Link>
        </div>
      )}
      {error && <div className="notice error">{error}</div>}

      <button type="button" className="btn btn-primary btn-block" onClick={handleImport} disabled={loading || importing}>
        {importing ? 'Ajout en cours…' : 'Ajouter à mes espèces'}
      </button>
    </div>
  )
}
