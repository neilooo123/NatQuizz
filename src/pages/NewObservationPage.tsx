import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useUser } from '../auth/AuthProvider'
import { Icon } from '../components/Icon'
import { ObservationFields } from '../components/ObservationFields'
import { PhotoPicker, type PickedPhoto } from '../components/PhotoPicker'
import { SpeciesFields } from '../components/SpeciesFields'
import { getDb } from '../db/db'
import { useSpecies, useSpeciesSummaries } from '../db/hooks'
import { addObservation, type ObservationInput, type SpeciesInput } from '../db/repo'
import { nowIso } from '../lib/ids'
import { getCurrentPosition } from '../location/geo'
import { normalize } from '../quiz/match'

export function NewObservationPage() {
  const user = useUser()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // ?espece=… : ajout d'une observation à une fiche existante.
  const targetId = params.get('espece') ?? undefined
  const target = useSpecies(targetId)
  const summaries = useSpeciesSummaries()

  const [picked, setPicked] = useState<PickedPhoto | null>(null)
  const [species, setSpecies] = useState<SpeciesInput>({ vernacularName: '', latinName: '', category: '' })
  const [observation, setObservation] = useState<ObservationInput>({
    observedAt: nowIso(),
    latitude: null,
    longitude: null,
    placeName: '',
    observer: user.observerName,
  })
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // L'espèce existe-t-elle déjà ? (fiche ciblée, ou même nom vernaculaire)
  const existing = useMemo(() => {
    if (target) return target
    const key = normalize(species.vernacularName)
    return key ? summaries?.find((s) => normalize(s.species.vernacularName) === key)?.species : undefined
  }, [target, species.vernacularName, summaries])

  const suggestions = useMemo(
    () => (summaries ?? []).map((s) => s.species.vernacularName).sort((a, b) => a.localeCompare(b, 'fr')),
    [summaries],
  )

  async function handlePicked(p: PickedPhoto) {
    setPicked(p)
    const { takenAt, latitude, longitude } = p.metadata
    setObservation((o) => ({
      ...o,
      observedAt: takenAt ? takenAt.toISOString() : o.observedAt,
      latitude: latitude ?? o.latitude,
      longitude: longitude ?? o.longitude,
    }))
    // Photo prise à l'instant sans GPS (cas de l'iPhone) : on demande la position du téléphone.
    if (latitude === null && p.fromCamera) {
      setLocating(true)
      const position = await getCurrentPosition()
      setLocating(false)
      if (position) setObservation((o) => ({ ...o, ...position }))
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!picked) {
      setError("Ajoute d'abord une photo.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { speciesId } = await addObservation(getDb(), {
        speciesId: existing?.id,
        species,
        observation,
        photo: picked.photo,
      })
      navigate(`/especes/${speciesId}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  const speciesValue: SpeciesInput = existing
    ? { vernacularName: target ? existing.vernacularName : species.vernacularName, latinName: existing.latinName, category: existing.category }
    : species

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {target && (
        <Link to={`/especes/${target.id}`} className="row muted small" style={{ textDecoration: 'none' }}>
          <Icon name="back" size={18} /> {target.vernacularName}
        </Link>
      )}
      <h1>{target ? 'Ajouter une observation' : 'Nouvelle observation'}</h1>

      <PhotoPicker preview={picked?.photo.full} onPicked={handlePicked} />

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Espèce</h2>
        <SpeciesFields
          value={speciesValue}
          onChange={(v) => setSpecies(v)}
          suggestions={target ? [] : suggestions}
          readOnly={!!target}
          detailsReadOnly={!!existing}
        />
        {existing && !target && (
          <div className="notice success small">
            Cette espèce est déjà dans ta base : l'observation sera ajoutée à sa fiche.
          </div>
        )}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Observation</h2>
        <ObservationFields value={observation} onChange={setObservation} locating={locating} />
      </section>

      {error && <div className="notice error">{error}</div>}
      <button className="btn btn-primary btn-block" disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
