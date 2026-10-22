import { usePhotoUrl } from '../db/hooks'
import type { PhotoState } from '../db/types'

const PLACEHOLDER_TEXT: Record<PhotoState, string> = {
  local: 'Photo',
  synced: 'Photo',
  remote: 'Photo en cours de téléchargement',
  'pending-share': 'Photo en attente de réseau',
  none: 'Pas de photo',
}

interface Props {
  observationId: string | null
  photoState?: PhotoState
  kind?: 'thumb' | 'full'
  className?: string
  alt?: string
}

/** Affiche la photo d'une observation, ou un cadre vide si elle n'est pas (encore) disponible. */
export function ObservationPhoto({ observationId, photoState = 'none', kind = 'thumb', className = 'photo', alt = '' }: Props) {
  const url = usePhotoUrl(observationId, kind)
  if (url) return <img src={url} alt={alt} className={className} loading="lazy" />
  if (url === undefined) return <div className="photo-placeholder" aria-busy="true" />
  return (
    <div className="photo-placeholder">
      <span aria-hidden="true">🍂</span>
      {PLACEHOLDER_TEXT[photoState]}
    </div>
  )
}
