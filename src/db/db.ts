import Dexie, { type Table } from 'dexie'
import type { MetaRecord, Observation, PendingShare, PhotoRecord, Species } from './types'

/**
 * La base de données locale (IndexedDB), une par utilisateur :
 * si deux personnes utilisent le même appareil, leurs données restent séparées.
 */
export class NatDb extends Dexie {
  species!: Table<Species, string>
  observations!: Table<Observation, string>
  photos!: Table<PhotoRecord, string>
  pendingShares!: Table<PendingShare, string>
  meta!: Table<MetaRecord, string>

  constructor(name: string) {
    super(name)
    // Seuls les champs listés ici sont indexés (utilisables dans where()).
    this.version(1).stores({
      species: 'id, dirty',
      observations: 'id, speciesId, photoState, shareId, shareSourceId, dirty',
      photos: 'id',
      pendingShares: 'id',
      meta: 'key',
    })
  }
}

let current: NatDb | null = null

/** Ouvre la base de l'utilisateur connecté. */
export function openUserDb(userId: string): NatDb {
  const name = `natquizz-${userId}`
  if (current?.name !== name) {
    current?.close()
    current = new NatDb(name)
  }
  return current
}

/** La base de l'utilisateur connecté (ou null si personne n'est connecté). */
export function getDbOrNull(): NatDb | null {
  return current
}

export function getDb(): NatDb {
  if (!current) throw new Error('Aucun utilisateur connecté')
  return current
}

export function closeUserDb(): void {
  current?.close()
  current = null
}

export async function getMeta(db: NatDb, key: string): Promise<string | null> {
  return (await db.meta.get(key))?.value ?? null
}

export async function setMeta(db: NatDb, key: string, value: string): Promise<void> {
  await db.meta.put({ key, value })
}
