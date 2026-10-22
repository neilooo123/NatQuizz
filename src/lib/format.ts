const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/** « 23 octobre 2026 » */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

/** Date au format attendu par <input type="date"> (heure locale). */
export function toDateInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Remplace le jour d'une date ISO en gardant son heure. */
export function withDate(iso: string, dateInput: string): string {
  const [year, month, day] = dateInput.split('-').map(Number)
  const d = new Date(iso)
  d.setFullYear(year, month - 1, day)
  return d.toISOString()
}

export function formatCoords(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

export function osmUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}
