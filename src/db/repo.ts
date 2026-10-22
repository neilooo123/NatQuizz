// Toutes les écritures dans la base locale passent par ici.
// Chaque modification est marquée « dirty » puis la synchronisation est prévenue.

import { newId, nowIso } from '../lib/ids'
import type { ProcessedPhoto } from '../photos/processPhoto'
import { normalize } from '../quiz/match'
import { notifyLocalChange } from '../sync/events'
import type { NatDb } from './db'
import type { Observation, Species } from './types'

export interface SpeciesInput {
  vernacularName: string
  latinName: string
  category: string
}

export interface ObservationInput {
  observedAt: string
  latitude: number | null
  longitude: number | null
  placeName: string
  observer: string
}

function cleanSpecies(input: SpeciesInput): SpeciesInput {
  return {
    vernacularName: input.vernacularName.trim(),
    latinName: input.latinName.trim(),
    category: input.category,
  }
}

function cleanObservation(input: ObservationInput): ObservationInput {
  return { ...input, placeName: input.placeName.trim(), observer: input.observer.trim() }
}

/** Cherche une espèce par son nom vernaculaire (sans tenir compte des accents ni des majuscules). */
export async function findSpeciesByName(db: NatDb, vernacularName: string): Promise<Species | undefined> {
  const key = normalize(vernacularName)
  if (!key) return undefined
  return db.species.filter((s) => !s.deletedAt && normalize(s.vernacularName) === key).first()
}

/** Cherche une espèce par son nom latin. */
export async function findSpeciesByLatin(db: NatDb, latinName: string): Promise<Species | undefined> {
  const key = normalize(latinName)
  if (!key) return undefined
  return db.species.filter((s) => !s.deletedAt && normalize(s.latinName) === key).first()
}

/** Crée une fiche espèce, sans observation. */
export async function createSpecies(db: NatDb, input: SpeciesInput): Promise<string> {
  const now = nowIso()
  const id = newId()
  await db.species.add({ id, ...cleanSpecies(input), createdAt: now, updatedAt: now, deletedAt: null, dirty: 1 })
  notifyLocalChange()
  return id
}

/**
 * Enregistre une nouvelle observation.
 * Sans speciesId, l'observation rejoint l'espèce qui porte le même nom
 * vernaculaire, ou une nouvelle fiche est créée.
 */
export async function addObservation(
  db: NatDb,
  args: { speciesId?: string; species: SpeciesInput; observation: ObservationInput; photo: ProcessedPhoto | null },
): Promise<{ speciesId: string; observationId: string }> {
  const now = nowIso()
  const species = cleanSpecies(args.species)
  const observationId = newId()

  const speciesId = await db.transaction('rw', db.species, db.observations, db.photos, async () => {
    let id = args.speciesId
    if (!id) {
      const existing = await findSpeciesByName(db, species.vernacularName)
      if (existing) {
        id = existing.id
        // Complète la fiche existante si des informations manquaient.
        const patch: Partial<Species> = {}
        if (!existing.latinName && species.latinName) patch.latinName = species.latinName
        if (!existing.category && species.category) patch.category = species.category
        if (Object.keys(patch).length) await db.species.update(id, { ...patch, updatedAt: now, dirty: 1 })
      } else {
        id = newId()
        await db.species.add({ id, ...species, createdAt: now, updatedAt: now, deletedAt: null, dirty: 1 })
      }
    }

    const observation: Observation = {
      id: observationId,
      speciesId: id,
      ...cleanObservation(args.observation),
      photoState: args.photo ? 'local' : 'none',
      photoPath: null,
      shareId: null,
      shareSourceId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dirty: 1,
    }
    await db.observations.add(observation)
    if (args.photo) await db.photos.put({ id: observationId, ...args.photo })
    return id
  })

  notifyLocalChange()
  return { speciesId, observationId }
}

export async function updateSpecies(db: NatDb, id: string, input: SpeciesInput): Promise<void> {
  await db.species.update(id, { ...cleanSpecies(input), updatedAt: nowIso(), dirty: 1 })
  notifyLocalChange()
}

/** Modifie une observation ; speciesId permet de la déplacer vers une autre espèce. */
export async function updateObservation(db: NatDb, id: string, input: ObservationInput, speciesId?: string): Promise<void> {
  const patch: Partial<Observation> = { ...cleanObservation(input), updatedAt: nowIso(), dirty: 1 }
  if (speciesId) patch.speciesId = speciesId
  await db.observations.update(id, patch)
  notifyLocalChange()
}

/** Remplace la photo d'une observation. */
export async function replacePhoto(db: NatDb, id: string, photo: ProcessedPhoto): Promise<void> {
  await db.transaction('rw', db.observations, db.photos, async () => {
    await db.photos.put({ id, ...photo })
    await db.observations.update(id, { photoState: 'local', updatedAt: nowIso(), dirty: 1 })
  })
  notifyLocalChange()
}

export async function deleteObservation(db: NatDb, id: string): Promise<void> {
  await db.transaction('rw', db.observations, db.photos, async () => {
    // Suppression « douce » : la ligne reste pour que la suppression
    // soit transmise aux autres appareils.
    await db.observations.update(id, { deletedAt: nowIso(), updatedAt: nowIso(), dirty: 1 })
    await db.photos.delete(id)
  })
  notifyLocalChange()
}

export async function deleteSpecies(db: NatDb, id: string): Promise<void> {
  const now = nowIso()
  await db.transaction('rw', db.species, db.observations, db.photos, async () => {
    await db.species.update(id, { deletedAt: now, updatedAt: now, dirty: 1 })
    const observations = await db.observations.where('speciesId').equals(id).toArray()
    for (const o of observations) {
      if (o.deletedAt) continue
      await db.observations.update(o.id, { deletedAt: now, updatedAt: now, dirty: 1 })
      await db.photos.delete(o.id)
    }
  })
  notifyLocalChange()
}
