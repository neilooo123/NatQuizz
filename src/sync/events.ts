// Petit système d'événements : chaque modification locale prévient la
// synchronisation, sans que la base ait besoin de connaître le module de synchro.

type Listener = () => void

const listeners = new Set<Listener>()

export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyLocalChange(): void {
  for (const listener of listeners) listener()
}
