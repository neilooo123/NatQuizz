// Synchronisation entre la base locale (IndexedDB) et Supabase.
//
// Principe « local d'abord » : l'appli lit et écrit toujours dans la base
// locale. Quand le réseau est là, on envoie ce qui a changé (« dirty »),
// puis on récupère ce qui a changé ailleurs depuis la dernière fois.

import { getDbOrNull, getMeta, setMeta, type NatDb } from '../db/db'
import { isSupabaseConfigured, newPhotoPath, PHOTO_BUCKET, supabase } from '../lib/supabase'
import { makeThumbnail } from '../photos/processPhoto'
import { resolvePendingShares, uploadPendingShares } from '../share/share'
import { onLocalChange } from './events'
import {
  mergeObservation,
  observationToRow,
  rowToSpecies,
  speciesToRow,
  type ObservationRow,
  type SpeciesRow,
} from './mapping'
import { setSyncStatus } from './status'

const PAGE_SIZE = 1000
const UPSERT_CHUNK = 500
const CURSOR_KEY = 'lastPulledAt'

let running: Promise<void> | null = null
let rerun = false
let timer: ReturnType<typeof setTimeout> | undefined

/** Lance une synchronisation dans un petit moment (regroupe les modifications rapprochées). */
export function requestSync(delayMs = 1500): void {
  clearTimeout(timer)
  timer = setTimeout(() => void runSync(), delayMs)
}

/** Lance une synchronisation tout de suite (ou après celle en cours). */
export function runSync(): Promise<void> {
  if (running) {
    rerun = true
    return running
  }
  running = (async () => {
    try {
      do {
        rerun = false
        await syncOnce()
      } while (rerun)
    } finally {
      running = null
    }
  })()
  return running
}

/** Synchronise au démarrage, au retour du réseau, après chaque modification et toutes les 5 minutes. */
export function startAutoSync(): () => void {
  const onOnline = () => void runSync()
  const onOffline = () => setSyncStatus({ state: 'offline' })
  const onVisible = () => {
    if (document.visibilityState === 'visible') void runSync()
  }

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)
  const stopListening = onLocalChange(() => requestSync())
  const interval = setInterval(() => void runSync(), 5 * 60_000)
  void runSync()

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVisible)
    stopListening()
    clearInterval(interval)
    clearTimeout(timer)
  }
}

async function syncOnce(): Promise<void> {
  const db = getDbOrNull()
  if (!db) return
  if (!isSupabaseConfigured) {
    setSyncStatus({ state: 'disabled' })
    return
  }
  if (!navigator.onLine) {
    setSyncStatus({ state: 'offline' })
    return
  }

  setSyncStatus({ state: 'syncing', error: null })
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    const userId = data.session?.user.id
    if (!userId || db.name !== `natquizz-${userId}`) {
      setSyncStatus({ state: 'signed-out' })
      return
    }

    await uploadPhotos(db, userId)
    await removeDeletedPhotos(db)
    await pushRows(db, userId)
    await uploadPendingShares(db)
    await pullRows(db)
    await downloadPhotos(db)
    await resolvePendingShares(db)
    setSyncStatus({ state: 'idle', lastSyncAt: new Date().toISOString() })
  } catch (error) {
    console.error('Synchronisation impossible', error)
    setSyncStatus({ state: navigator.onLine ? 'error' : 'offline', error: describeError(error) })
  }
}

function describeError(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error)
  if (/fetch|network|load failed/i.test(message)) return 'Serveur injoignable (projet Supabase en pause ?)'
  return message
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

/** 1. Envoie les nouvelles photos dans le stockage Supabase. */
async function uploadPhotos(db: NatDb, userId: string): Promise<void> {
  const waiting = await db.observations
    .where('photoState')
    .equals('local')
    .filter((o) => !o.deletedAt)
    .toArray()

  for (const o of waiting) {
    const photo = await db.photos.get(o.id)
    if (!photo) {
      await db.observations.update(o.id, { photoState: 'none' })
      continue
    }
    const path = newPhotoPath(userId, o.id)
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, photo.full, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    // L'ancienne version de la photo (si elle a été remplacée) n'est plus utile.
    if (o.photoPath) await supabase.storage.from(PHOTO_BUCKET).remove([o.photoPath])
    await db.observations.update(o.id, { photoState: 'synced', photoPath: path, dirty: 1 })
  }
}

/** 2. Supprime du cloud les photos des observations supprimées. */
async function removeDeletedPhotos(db: NatDb): Promise<void> {
  const deleted = await db.observations.filter((o) => !!o.deletedAt && !!o.photoPath).toArray()
  if (!deleted.length) return
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(deleted.map((o) => o.photoPath!))
  if (error) throw error
  for (const o of deleted) {
    await db.observations.update(o.id, { photoPath: null, photoState: 'none', dirty: 1 })
  }
}

/** 3. Envoie les fiches et observations modifiées sur l'appareil. */
async function pushRows(db: NatDb, userId: string): Promise<void> {
  const species = await db.species.where('dirty').equals(1).toArray()
  for (const part of chunks(species, UPSERT_CHUNK)) {
    const { error } = await supabase.from('species').upsert(part.map((s) => speciesToRow(s, userId)))
    if (error) throw error
  }
  await db.transaction('rw', db.species, async () => {
    for (const sent of species) {
      // Si la fiche a encore été modifiée pendant l'envoi, elle reste « dirty ».
      const current = await db.species.get(sent.id)
      if (current?.updatedAt === sent.updatedAt) await db.species.update(sent.id, { dirty: 0 })
    }
  })

  const observations = await db.observations.where('dirty').equals(1).toArray()
  for (const part of chunks(observations, UPSERT_CHUNK)) {
    const { error } = await supabase.from('observations').upsert(part.map((o) => observationToRow(o, userId)))
    if (error) throw error
  }
  await db.transaction('rw', db.observations, async () => {
    for (const sent of observations) {
      const current = await db.observations.get(sent.id)
      if (current?.updatedAt === sent.updatedAt && current.photoPath === sent.photoPath) {
        await db.observations.update(sent.id, { dirty: 0 })
      }
    }
  })
}

async function fetchSince<T>(table: 'species' | 'observations', since: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('updated_at', since)
      .order('updated_at')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data as T[]))
    if (data.length < PAGE_SIZE) return rows
  }
}

/** 4. Récupère ce qui a changé sur le cloud depuis la dernière synchro. */
async function pullRows(db: NatDb): Promise<void> {
  const cursor = await getMeta(db, CURSOR_KEY)
  // Une minute de marge : récupérer deux fois la même ligne ne pose aucun problème.
  const since = cursor ? new Date(Date.parse(cursor) - 60_000).toISOString() : '1970-01-01T00:00:00Z'

  const speciesRows = await fetchSince<SpeciesRow>('species', since)
  const observationRows = await fetchSince<ObservationRow>('observations', since)

  await db.transaction('rw', db.species, db.observations, db.photos, async () => {
    for (const row of speciesRows) {
      const local = await db.species.get(row.id)
      if (local?.dirty) continue
      await db.species.put(rowToSpecies(row))
    }
    for (const row of observationRows) {
      const merged = mergeObservation(await db.observations.get(row.id), row)
      if (!merged) continue
      await db.observations.put(merged)
      if (merged.photoState === 'none') await db.photos.delete(row.id)
    }
  })

  let latest = cursor ? Date.parse(cursor) : 0
  for (const row of [...speciesRows, ...observationRows]) latest = Math.max(latest, Date.parse(row.updated_at))
  if (latest > 0) await setMeta(db, CURSOR_KEY, new Date(latest).toISOString())
}

/** 5. Télécharge les photos venues d'un autre appareil (pour le quiz hors ligne). */
async function downloadPhotos(db: NatDb): Promise<void> {
  const waiting = await db.observations
    .where('photoState')
    .equals('remote')
    .filter((o) => !o.deletedAt && !!o.photoPath)
    .toArray()

  for (const o of waiting) {
    try {
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(o.photoPath!)
      if (error || !data) throw error ?? new Error('Photo introuvable')
      const thumb = await makeThumbnail(data)
      await db.transaction('rw', db.observations, db.photos, async () => {
        const current = await db.observations.get(o.id)
        if (current?.photoState !== 'remote' || current.photoPath !== o.photoPath) return
        await db.photos.put({ id: o.id, full: data, thumb })
        await db.observations.update(o.id, { photoState: 'synced' })
      })
    } catch (error) {
      // On réessaiera à la prochaine synchro.
      console.warn('Photo non téléchargée', o.id, error)
    }
  }
}
