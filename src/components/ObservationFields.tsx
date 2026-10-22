import { useState } from 'react'
import type { ObservationInput } from '../db/repo'
import { formatCoords, osmUrl, toDateInputValue, withDate } from '../lib/format'
import { getCurrentPosition } from '../location/geo'
import { Icon } from './Icon'

interface Props {
  value: ObservationInput
  onChange: (value: ObservationInput) => void
  /** Recherche de la position en cours (lancée par la page). */
  locating?: boolean
}

/** Champs d'une observation : date, lieu, position GPS, observateur. */
export function ObservationFields({ value, onChange, locating = false }: Props) {
  const [searching, setSearching] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const set = (patch: Partial<ObservationInput>) => onChange({ ...value, ...patch })
  const hasPosition = value.latitude !== null && value.longitude !== null

  async function useMyPosition() {
    setSearching(true)
    setGpsError(null)
    const position = await getCurrentPosition()
    setSearching(false)
    if (position) set(position)
    else setGpsError("Position introuvable. Vérifie que la localisation est autorisée pour l'appli.")
  }

  return (
    <>
      <label className="field">
        <span>Date de l'observation</span>
        <input
          type="date"
          required
          value={toDateInputValue(value.observedAt)}
          max={toDateInputValue(new Date().toISOString())}
          onChange={(e) => e.target.value && set({ observedAt: withDate(value.observedAt, e.target.value) })}
        />
      </label>

      <label className="field">
        <span>Lieu</span>
        <input value={value.placeName} onChange={(e) => set({ placeName: e.target.value })} placeholder="ex. Forêt de Brocéliande" />
      </label>

      <div className="field">
        <span>Position GPS</span>
        {locating || searching ? (
          <span className="muted small">Recherche de la position…</span>
        ) : hasPosition ? (
          <span className="small">
            <a href={osmUrl(value.latitude!, value.longitude!)} target="_blank" rel="noreferrer">
              {formatCoords(value.latitude!, value.longitude!)}
            </a>
          </span>
        ) : (
          <span className="muted small">Aucune position</span>
        )}
        {gpsError && <span className="small" style={{ color: 'var(--c-danger)' }}>{gpsError}</span>}
        <div className="row">
          <button type="button" className="btn btn-small" onClick={useMyPosition} disabled={locating || searching}>
            <Icon name="pin" size={18} /> Ma position actuelle
          </button>
          {hasPosition && (
            <button type="button" className="btn btn-small btn-outline" onClick={() => set({ latitude: null, longitude: null })}>
              Effacer
            </button>
          )}
        </div>
      </div>

      <label className="field">
        <span>Observateur</span>
        <input value={value.observer} onChange={(e) => set({ observer: e.target.value })} />
      </label>
    </>
  )
}
