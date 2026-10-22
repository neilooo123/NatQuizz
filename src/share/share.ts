// Partage d'une fiche espèce entre deux personnes, via un lien / QR code.
//
// 1. La personne qui partage crée le lien (fonctionne hors ligne) ; le
//    partage complet, avec des liens vers les photos, part sur Supabase à la
//    prochaine synchro.
// 2. La personne qui reçoit importe tout de suite les infos texte du lien ;
//    les photos arrivent dès que le partage est disponible sur le cloud.

import type { NatDb } from '../db/db'
import { createSpecies, findSpeciesByLatin, findSpeciesByName } from '../db/repo'
import type { Observation } from '../db/types'
import { newId, nowIso } from '../lib/ids'
import { PHOTO_BUCKET, supabase } from '../lib/supabase'
import { processPhoto, type ProcessedPhoto } from '../photos/processPhoto'
import { notifyLocalChange } from '../sync/events'
import {
  buildShareUrl,
  isSharePayload,
  type ShareLinkData,
  type SharePayload,
  type SharePayloadObservation,
} from './encode'

/** Durée de validité des liens vers les photos partagées. */
const SHARE_DURATION_SECONDS = 30 * 24 * 3600

/** Adresse de l'appli, ex. https://neilooo123.github.io/NatQuizz/ */
export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

/** Prépare le partage d'une espèce et renvoie le lien à mettre dans le QR code. */
export async function createShare(db: NatDb, speciesId: string, mainObservationId?: string): Promise<string> {
  const species = await db.species.get(speciesId)
  if (!species) throw new Error('Espèce introuvable')
  const observations = (await db.observations.where('speciesId').equals(speciesId).toArray()).filter((o) => !o.deletedAt)
  const main = observations.find((o) => o.id === mainObservationId) ?? observations[0]

  const id = newId()
  await db.pendingShares.put({ id, speciesId, createdAt: nowIso() })
  notifyLocalChange()

  const data: ShareLinkData = { id, v: species.vernacularName, l: species.latinName, c: species.category }
  if (main) {
    data.o = { i: main.id, d: main.observedAt, p: main.placeName, la: main.latitude, lo: main.longitude, ob: main.observer }
  }
  return buildShareUrl(data, appUrl())
}

/** Envoie sur Supabase les partages créés sur l'appareil (appelé par la synchro). */
export async function uploadPendingShares(db: NatDb): Promise<void> {
  for (const share of await db.pendingShares.toArray()) {
    const species = await db.species.get(share.speciesId)
    if (!species || species.deletedAt) {
      await db.pendingShares.delete(share.id)
      continue
    }
    const observations = (await db.observations.where('speciesId').equals(share.speciesId).toArray()).filter(
      (o) => !o.deletedAt,
    )
    // Une photo n'est pas encore sur le cloud : on attend la prochaine synchro.
    if (observations.some((o) => o.photoState === 'local')) continue

    const items: SharePayloadObservation[] = []
    for (const o of observations) {
      let photoUrl: string | null = null
      if (o.photoPath) {
        const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(o.photoPath, SHARE_DURATION_SECONDS)
        photoUrl = data?.signedUrl ?? null
      }
      items.push({
        sourceId: o.id,
        observedAt: o.observedAt,
        latitude: o.latitude,
        longitude: o.longitude,
        placeName: o.placeName,
        observer: o.observer,
        photoUrl,
      })
    }

    const payload: SharePayload = {
      version: 1,
      species: { vernacularName: species.vernacularName, latinName: species.latinName, category: species.category },
      observations: items,
    }
    const { error } = await supabase.from('shares').upsert({ id: share.id, payload })
    if (error) throw error
    await db.pendingShares.delete(share.id)
  }
}

/** Récupère le partage complet sur Supabase (null s'il n'y est pas encore). */
export async function fetchShare(shareId: string): Promise<SharePayload | null> {
  const { data, error } = await supabase.rpc('get_share', { share_id: shareId })
  if (error) throw error
  return isSharePayload(data) ? data : null
}

async function downloadSharedPhoto(url: string): Promise<ProcessedPhoto | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await processPhoto(await response.blob())
  } catch {
    return null
  }
}

function linkObservation(link: ShareLinkData): SharePayloadObservation[] {
  if (!link.o) return []
  const o = link.o
  return [{ sourceId: o.i, observedAt: o.d, latitude: o.la, longitude: o.lo, placeName: o.p, observer: o.ob, photoUrl: null }]
}

/**
 * Ajoute une fiche partagée à ses espèces.
 * - payload connu : toutes les observations, avec leurs photos ;
 * - sinon (hors ligne) : l'observation du lien, photo « en attente ».
 * Si l'espèce existe déjà (même nom latin ou vernaculaire), les observations la rejoignent.
 */
export async function importShare(
  db: NatDb,
  link: ShareLinkData,
  payload: SharePayload | null,
  targetSpeciesId?: string,
): Promise<{ speciesId: string; added: number }> {
  const names = payload?.species ?? { vernacularName: link.v, latinName: link.l, category: link.c }
  let speciesId = targetSpeciesId
  if (!speciesId) {
    const existing = (await findSpeciesByLatin(db, names.latinName)) ?? (await findSpeciesByName(db, names.vernacularName))
    speciesId = existing?.id ?? (await createSpecies(db, names))
  }

  let added = 0
  const sources = payload ? payload.observations : linkObservation(link)
  for (const source of sources) {
    const existing = await db.observations
      .where('shareSourceId')
      .equals(source.sourceId)
      .filter((o) => !o.deletedAt)
      .first()
    // Déjà importée avec sa photo : rien à faire.
    if (existing && existing.photoState !== 'pending-share') continue

    const photo = source.photoUrl ? await downloadSharedPhoto(source.photoUrl) : null
    // Sans payload, la photo viendra plus tard ; avec payload mais sans lien, il n'y en a pas.
    const photoState = photo ? 'local' : source.photoUrl || !payload ? 'pending-share' : 'none'
    const now = nowIso()

    if (existing) {
      if (photoState === 'pending-share') continue
      if (photo) await db.photos.put({ id: existing.id, ...photo })
      await db.observations.update(existing.id, { photoState, updatedAt: now, dirty: 1 })
      continue
    }

    const observation: Observation = {
      id: newId(),
      speciesId,
      observedAt: source.observedAt,
      latitude: source.latitude,
      longitude: source.longitude,
      placeName: source.placeName,
      observer: source.observer,
      photoState,
      photoPath: null,
      shareId: link.id,
      shareSourceId: source.sourceId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dirty: 1,
    }
    await db.observations.add(observation)
    if (photo) await db.photos.put({ id: observation.id, ...photo })
    added++
  }

  notifyLocalChange()
  return { speciesId, added }
}

/** Récupère les photos des fiches partagées reçues hors ligne (appelé par la synchro). */
export async function resolvePendingShares(db: NatDb): Promise<void> {
  const waiting = await db.observations
    .where('photoState')
    .equals('pending-share')
    .filter((o) => !o.deletedAt && !!o.shareId)
    .toArray()

  const firstByShare = new Map<string, Observation>()
  for (const o of waiting) if (!firstByShare.has(o.shareId!)) firstByShare.set(o.shareId!, o)

  for (const [shareId, observation] of firstByShare) {
    const payload = await fetchShare(shareId)
    if (!payload) continue // pas encore envoyé par l'autre personne
    const link: ShareLinkData = {
      id: shareId,
      v: payload.species.vernacularName,
      l: payload.species.latinName,
      c: payload.species.category,
    }
    await importShare(db, link, payload, observation.speciesId)
  }
}
