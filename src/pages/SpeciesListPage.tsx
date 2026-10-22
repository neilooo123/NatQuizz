import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { ObservationPhoto } from '../components/ObservationPhoto'
import { CATEGORIES } from '../db/categories'
import { useSpeciesSummaries } from '../db/hooks'
import { normalize } from '../quiz/match'

type Sort = 'alpha' | 'recent'

export function SpeciesListPage() {
  const summaries = useSpeciesSummaries()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<Sort>('alpha')

  const visible = useMemo(() => {
    const key = normalize(query)
    return (summaries ?? [])
      .filter((s) => !category || s.species.category === category)
      .filter(
        (s) => !key || normalize(s.species.vernacularName).includes(key) || normalize(s.species.latinName).includes(key),
      )
      .sort((a, b) =>
        sort === 'alpha'
          ? a.species.vernacularName.localeCompare(b.species.vernacularName, 'fr')
          : (b.lastObservedAt ?? '').localeCompare(a.lastObservedAt ?? ''),
      )
  }, [summaries, query, category, sort])

  if (!summaries) return null

  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>Mes espèces</h1>
        <span className="spacer" />
        <span className="badge">{summaries.length}</span>
      </div>

      {summaries.length === 0 ? (
        <div className="empty stack">
          <p>Aucune espèce pour l'instant. Pars en balade ! 🌳</p>
          <Link to="/observer" className="btn btn-primary">
            <Icon name="camera" /> Ma première observation
          </Link>
        </div>
      ) : (
        <>
          <input type="search" placeholder="Rechercher (nom vernaculaire ou latin)" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Groupe">
              <option value="">Tous les groupes</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Tri">
              <option value="alpha">De A à Z</option>
              <option value="recent">Plus récentes</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <p className="empty">Aucune espèce ne correspond.</p>
          ) : (
            <div className="species-grid">
              {visible.map((s) => (
                <Link key={s.species.id} to={`/especes/${s.species.id}`} className="species-card">
                  <ObservationPhoto observationId={s.coverObservationId} alt={s.species.vernacularName} />
                  <div className="species-card-body">
                    <strong>{s.species.vernacularName}</strong>
                    <span className="latin">{s.species.latinName || '—'}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
