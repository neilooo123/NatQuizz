/**
 * État de la photo d'une observation :
 * - local : photo présente sur l'appareil, pas encore envoyée sur le cloud
 * - synced : photo présente sur l'appareil et sur le cloud
 * - remote : photo sur le cloud, pas encore téléchargée sur cet appareil
 * - pending-share : photo d'une fiche partagée, en attente de réseau
 * - none : pas de photo
 */
export type PhotoState = 'local' | 'synced' | 'remote' | 'pending-share' | 'none'

/** 1 = modifié sur l'appareil, à envoyer au cloud. (IndexedDB n'indexe pas les booléens.) */
export type Dirty = 0 | 1

export interface Species {
  id: string
  vernacularName: string
  latinName: string
  category: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  dirty: Dirty
}

export interface Observation {
  id: string
  speciesId: string
  observedAt: string
  latitude: number | null
  longitude: number | null
  placeName: string
  observer: string
  photoState: PhotoState
  /** Chemin du fichier photo sur le cloud (null tant qu'elle n'a pas été envoyée). */
  photoPath: string | null
  /** Partage d'où vient cette observation (si elle a été reçue d'une autre personne). */
  shareId: string | null
  /** Identifiant de l'observation d'origine chez la personne qui a partagé. */
  shareSourceId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  dirty: Dirty
}

export interface PhotoRecord {
  /** Même identifiant que l'observation. */
  id: string
  full: Blob
  thumb: Blob
}

/** Partage créé sur l'appareil, à envoyer au cloud. */
export interface PendingShare {
  id: string
  speciesId: string
  createdAt: string
}

export interface MetaRecord {
  key: string
  value: string
}
