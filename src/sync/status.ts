import { useSyncExternalStore } from 'react'

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'signed-out' | 'disabled'

export interface SyncStatus {
  state: SyncState
  lastSyncAt: string | null
  error: string | null
}

let status: SyncStatus = {
  state: navigator.onLine ? 'idle' : 'offline',
  lastSyncAt: null,
  error: null,
}

const listeners = new Set<() => void>()

export function getSyncStatus(): SyncStatus {
  return status
}

export function setSyncStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Hook React : l'état de la synchronisation, mis à jour en direct. */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getSyncStatus)
}
