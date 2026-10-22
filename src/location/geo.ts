export interface Position {
  latitude: number
  longitude: number
}

/**
 * Position actuelle du téléphone, ou null si elle n'est pas disponible
 * (GPS refusé, pas de signal…). Le navigateur demande l'autorisation la première fois.
 */
export function getCurrentPosition(timeoutMs = 15000): Promise<Position | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}
