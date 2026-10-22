import { usePendingCount } from '../db/hooks'
import { runSync } from '../sync/sync'
import { useSyncStatus } from '../sync/status'

/** Petite pastille indiquant l'état de la synchronisation. Un clic relance la synchro. */
export function SyncIndicator() {
  const { state, error } = useSyncStatus()
  const pending = usePendingCount()

  let label: string
  let tone: string
  switch (state) {
    case 'syncing':
      label = 'Synchronisation…'
      tone = 'syncing'
      break
    case 'offline':
      label = pending ? `Hors ligne · ${pending} en attente` : 'Hors ligne'
      tone = pending ? 'pending' : ''
      break
    case 'error':
      label = 'Serveur indisponible'
      tone = 'error'
      break
    case 'signed-out':
      label = 'Reconnecte-toi'
      tone = 'error'
      break
    case 'disabled':
      label = 'Mode local'
      tone = ''
      break
    default:
      label = pending ? `${pending} en attente` : 'Synchronisé'
      tone = pending ? 'pending' : 'ok'
  }

  return (
    <button
      type="button"
      className={`sync-indicator ${tone}`}
      title={error ?? 'Cliquer pour synchroniser maintenant'}
      onClick={() => void runSync()}
    >
      <span className="dot" />
      {label}
    </button>
  )
}
