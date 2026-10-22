// Hooks React qui lisent la base locale.
// useLiveQuery relance la requête automatiquement à chaque modification :
// l'écran se met à jour tout seul (y compris après une synchro).

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { getDb } from './db'
import type { Observation, Species } from './types'

export interface SpeciesSummary {
  species: Species
  observationCount: number
  /** Observation la plus récente avec une photo (pour la miniature). */
  coverObservationId: string | null
  lastObservedAt: string | null
}

/** Toutes les espèces (non supprimées) avec quelques infos sur leurs observations. */
export function useSpeciesSummaries(): SpeciesSummary[] | undefined {
  return useLiveQuery(async () => {
    const db = getDb()
    const [species, observations] = await Promise.all([
      db.species.filter((s) => !s.deletedAt).toArray(),
      db.observations.filter((o) => !o.deletedAt).toArray(),
    ])

    const bySpecies = new Map<string, Observation[]>()
    for (const o of observations) {
      const list = bySpecies.get(o.speciesId) ?? []
      list.push(o)
      bySpecies.set(o.speciesId, list)
    }

    return species.map((s) => {
      const list = (bySpecies.get(s.id) ?? []).sort((a, b) => b.observedAt.localeCompare(a.observedAt))
      const cover = list.find((o) => o.photoState !== 'none') ?? null
      return {
        species: s,
        observationCount: list.length,
        coverObservationId: cover?.id ?? null,
        lastObservedAt: list[0]?.observedAt ?? null,
      }
    })
  })
}

export function useSpecies(id: string | undefined): Species | null | undefined {
  return useLiveQuery(async () => (id ? ((await getDb().species.get(id)) ?? null) : null), [id])
}

/** Observations d'une espèce, de la plus récente à la plus ancienne. */
export function useObservations(speciesId: string | undefined): Observation[] | undefined {
  return useLiveQuery(async () => {
    if (!speciesId) return []
    const list = await getDb().observations.where('speciesId').equals(speciesId).toArray()
    return list.filter((o) => !o.deletedAt).sort((a, b) => b.observedAt.localeCompare(a.observedAt))
  }, [speciesId])
}

export function useObservation(id: string | undefined): Observation | null | undefined {
  return useLiveQuery(async () => (id ? ((await getDb().observations.get(id)) ?? null) : null), [id])
}

/** Adresse affichable (blob:…) de la photo d'une observation ; null si pas de photo, undefined pendant le chargement. */
export function usePhotoUrl(observationId: string | null | undefined, kind: 'thumb' | 'full'): string | null | undefined {
  const blob = useLiveQuery(
    async () => (observationId ? ((await getDb().photos.get(observationId))?.[kind] ?? null) : null),
    [observationId, kind],
  )
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (blob === undefined || (blob && !url)) return undefined
  return url
}

/** Nombre d'éléments modifiés sur l'appareil et pas encore envoyés au cloud. */
export function usePendingCount(): number {
  return (
    useLiveQuery(async () => {
      const db = getDb()
      const [species, observations, shares] = await Promise.all([
        db.species.where('dirty').equals(1).count(),
        db.observations.where('dirty').equals(1).count(),
        db.pendingShares.count(),
      ])
      return species + observations + shares
    }) ?? 0
  )
}
