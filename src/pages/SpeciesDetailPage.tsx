import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Icon } from '../components/Icon'
import { ObservationPhoto } from '../components/ObservationPhoto'
import { SharePanel } from '../components/SharePanel'
import { SpeciesFields } from '../components/SpeciesFields'
import { categoryLabel } from '../db/categories'
import { getDb } from '../db/db'
import { useObservations, useSpecies } from '../db/hooks'
import { deleteObservation, deleteSpecies, updateSpecies, type SpeciesInput } from '../db/repo'
import type { Observation } from '../db/types'
import { formatCoords, formatDate, osmUrl, plural } from '../lib/format'

export function SpeciesDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const species = useSpecies(id)
  const observations = useObservations(id)
  const [editing, setEditing] = useState<SpeciesInput | null>(null)
  const [sharing, setSharing] = useState(false)

  if (species === undefined || observations === undefined) return null
  if (!species || species.deletedAt) {
    return (
      <div className="empty stack">
        <p>Cette espèce n'existe pas (ou plus).</p>
        <Link to="/especes" className="btn">
          Retour à mes espèces
        </Link>
      </div>
    )
  }

  async function saveSpecies() {
    if (!editing || !editing.vernacularName.trim()) return
    await updateSpecies(getDb(), species!.id, editing)
    setEditing(null)
  }

  async function removeSpecies() {
    const count = observations!.length
    const message = `Supprimer « ${species!.vernacularName} »${count ? ` et ses ${plural(count, 'observation')}` : ''} ?`
    if (!window.confirm(message)) return
    await deleteSpecies(getDb(), species!.id)
    navigate('/especes', { replace: true })
  }

  return (
    <div className="stack">
      <Link to="/especes" className="row muted small" style={{ textDecoration: 'none' }}>
        <Icon name="back" size={18} /> Mes espèces
      </Link>

      {editing ? (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Modifier la fiche</h2>
          <SpeciesFields value={editing} onChange={setEditing} />
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={saveSpecies}>
              Enregistrer
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>
              Annuler
            </button>
          </div>
        </section>
      ) : (
        <div>
          <h1 style={{ marginBottom: 4 }}>{species.vernacularName}</h1>
          <p className="latin" style={{ fontSize: '1.1rem' }}>
            {species.latinName || 'Nom latin à compléter'}
          </p>
          <div className="row">
            <span className="badge">{categoryLabel(species.category)}</span>
            <span className="muted small">{plural(observations.length, 'observation')}</span>
          </div>
        </div>
      )}

      {!editing && (
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() =>
              setEditing({ vernacularName: species.vernacularName, latinName: species.latinName, category: species.category })
            }
          >
            <Icon name="edit" size={18} /> Modifier
          </button>
          <button type="button" className="btn" onClick={() => setSharing(true)}>
            <Icon name="share" size={18} /> Partager
          </button>
          <Link to={`/observer?espece=${species.id}`} className="btn btn-primary">
            <Icon name="plus" size={18} /> Observation
          </Link>
        </div>
      )}

      {observations.map((o) => (
        <ObservationCard key={o.id} observation={o} />
      ))}

      <button type="button" className="btn btn-danger" onClick={removeSpecies}>
        <Icon name="trash" size={18} /> Supprimer l'espèce
      </button>

      {sharing && (
        <SharePanel
          speciesId={species.id}
          speciesName={species.vernacularName}
          observationId={observations[0]?.id}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  )
}

function ObservationCard({ observation: o }: { observation: Observation }) {
  async function remove() {
    if (!window.confirm('Supprimer cette observation ?')) return
    await deleteObservation(getDb(), o.id)
  }

  return (
    <article className="observation-card">
      <ObservationPhoto observationId={o.id} photoState={o.photoState} kind="full" />
      <div className="observation-body stack" style={{ gap: 6 }}>
        <strong>{formatDate(o.observedAt)}</strong>
        {(o.placeName || o.latitude !== null) && (
          <span className="small">
            <Icon name="pin" size={16} /> {o.placeName}
            {o.latitude !== null && o.longitude !== null && (
              <>
                {o.placeName && ' · '}
                <a href={osmUrl(o.latitude, o.longitude)} target="_blank" rel="noreferrer">
                  {o.placeName ? 'voir sur la carte' : formatCoords(o.latitude, o.longitude)}
                </a>
              </>
            )}
          </span>
        )}
        {o.observer && <span className="small muted">Observé par {o.observer}</span>}
        {o.shareId && <span className="small muted">Reçue par partage</span>}
        <div className="row">
          <Link to={`/observations/${o.id}`} className="btn btn-small">
            <Icon name="edit" size={16} /> Modifier
          </Link>
          <button type="button" className="btn btn-small btn-outline" onClick={remove}>
            <Icon name="trash" size={16} /> Supprimer
          </button>
        </div>
      </div>
    </article>
  )
}
