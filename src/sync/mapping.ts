// Conversion entre les données locales (Dexie) et les lignes de la base Supabase,
// et règles de fusion lors de la récupération des données du cloud.

import type { Observation, PhotoState, Species } from '../db/types'

export interface SpeciesRow {
  id: string
  user_id: string
  vernacular_name: string
  latin_name: string
  category: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ObservationRow {
  id: string
  user_id: string
  species_id: string
  photo_path: string | null
  observed_at: string
  latitude: number | null
  longitude: number | null
  place_name: string
  observer: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// updated_at est fixé par le serveur : inutile de l'envoyer.
export function speciesToRow(s: Species, userId: string): Omit<SpeciesRow, 'updated_at'> {
  return {
    id: s.id,
    user_id: userId,
    vernacular_name: s.vernacularName,
    latin_name: s.latinName,
    category: s.category,
    created_at: s.createdAt,
    deleted_at: s.deletedAt,
  }
}

export function rowToSpecies(row: SpeciesRow): Species {
  return {
    id: row.id,
    vernacularName: row.vernacular_name,
    latinName: row.latin_name,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    dirty: 0,
  }
}

export function observationToRow(o: Observation, userId: string): Omit<ObservationRow, 'updated_at'> {
  return {
    id: o.id,
    user_id: userId,
    species_id: o.speciesId,
    photo_path: o.photoPath,
    observed_at: o.observedAt,
    latitude: o.latitude,
    longitude: o.longitude,
    place_name: o.placeName,
    observer: o.observer,
    created_at: o.createdAt,
    deleted_at: o.deletedAt,
  }
}

/** Décide de l'état de la photo après réception d'une observation venant du cloud. */
export function mergedPhotoState(local: Observation | undefined, row: ObservationRow): PhotoState {
  if (row.deleted_at) return 'none'
  // Une nouvelle photo attend d'être envoyée : elle est prioritaire.
  if (local?.photoState === 'local') return 'local'
  if (row.photo_path) {
    const sameFile = local?.photoPath === row.photo_path && local.photoState === 'synced'
    return sameFile ? 'synced' : 'remote'
  }
  if (local?.photoState === 'pending-share') return 'pending-share'
  return 'none'
}

/**
 * Fusionne une observation reçue du cloud avec la version locale.
 * Renvoie null si la version locale a des modifications non envoyées
 * (elle est alors conservée et sera envoyée à la prochaine synchro).
 */
export function mergeObservation(local: Observation | undefined, row: ObservationRow): Observation | null {
  if (local?.dirty) return null
  return {
    id: row.id,
    speciesId: row.species_id,
    observedAt: row.observed_at,
    latitude: row.latitude,
    longitude: row.longitude,
    placeName: row.place_name,
    observer: row.observer,
    photoState: mergedPhotoState(local, row),
    photoPath: row.photo_path,
    shareId: local?.shareId ?? null,
    shareSourceId: local?.shareSourceId ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    dirty: 0,
  }
}
