// Installation de l'appli sur l'écran d'accueil.
// Chrome / Edge / Android proposent une fenêtre d'installation ; sur iPhone,
// il faut passer par le bouton Partager de Safari.

import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt = event as BeforeInstallPromptEvent
  notify()
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  notify()
})

/** Vrai si l'appli est ouverte depuis l'écran d'accueil (installée). */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export async function promptInstall(): Promise<void> {
  await deferredPrompt?.prompt()
  deferredPrompt = null
  notify()
}

/** Vrai quand le navigateur peut afficher sa fenêtre d'installation. */
export function useCanPromptInstall(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => deferredPrompt !== null,
  )
}
