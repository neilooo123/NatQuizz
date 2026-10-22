import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Icon } from '../components/Icon'
import { ObservationFields } from '../components/ObservationFields'
import { ObservationPhoto } from '../components/ObservationPhoto'
import { PhotoPicker } from '../components/PhotoPicker'
import { getDb } from '../db/db'
import { useObservation, useSpeciesSummaries } from '../db/hooks'
import { replacePhoto, updateObservation, type ObservationInput } from '../db/repo'
import type { Observation } from '../db/types'
import type { ProcessedPhoto } from '../photos/processPhoto'

export function EditObservationPage() {
  const { id } = useParams()
  const observation = useObservation(id)

  if (observation === undefined) return null
  if (!observation || observation.deletedAt) {
    return (
      <div className="empty stack">
        <p>Cette observation n'existe pas (ou plus).</p>
        <Link to="/especes" className="btn">
          Retour à mes espèces
        </Link>
      </div>
    )
  }
  // Le formulaire n'est créé qu'une fois l'observation chargée.
  return <EditObservationForm observation={observation} />
}

function EditObservationForm({ observation }: { observation: Observation }) {
  const navigate = useNavigate()
  const summaries = useSpeciesSummaries()
  const [speciesId, setSpeciesId] = useState(observation.speciesId)
  const [values, setValues] = useState<ObservationInput>({
    observedAt: observation.observedAt,
    latitude: observation.latitude,
    longitude: observation.longitude,
    placeName: observation.placeName,
    observer: observation.observer,
  })
  const [newPhoto, setNewPhoto] = useState<ProcessedPhoto | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    const db = getDb()
    await updateObservation(db, observation.id, values, speciesId)
    if (newPhoto) await replacePhoto(db, observation.id, newPhoto)
    navigate(`/especes/${speciesId}`, { replace: true })
  }

  const speciesOptions = (summaries ?? [])
    .map((s) => s.species)
    .sort((a, b) => a.vernacularName.localeCompare(b.vernacularName, 'fr'))

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Link to={`/especes/${observation.speciesId}`} className="row muted small" style={{ textDecoration: 'none' }}>
        <Icon name="back" size={18} /> Retour à la fiche
      </Link>
      <h1>Modifier l'observation</h1>

      {!newPhoto && <ObservationPhoto observationId={observation.id} photoState={observation.photoState} kind="full" className="photo-large" />}
      <PhotoPicker preview={newPhoto?.full} onPicked={(p) => setNewPhoto(p.photo)} />

      <section className="card stack">
        <label className="field">
          <span>Espèce</span>
          <select value={speciesId} onChange={(e) => setSpeciesId(e.target.value)}>
            {speciesOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.vernacularName}
                {s.latinName ? ` (${s.latinName})` : ''}
              </option>
            ))}
          </select>
          <span className="hint">Pour corriger une erreur d'identification, déplace l'observation vers une autre espèce.</span>
        </label>
        <ObservationFields value={values} onChange={setValues} />
      </section>

      <button className="btn btn-primary btn-block" disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
