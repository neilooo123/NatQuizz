// Format des liens de partage (contenus dans les QR codes).
//
// Le lien contient directement les infos texte de la fiche, pour qu'elle
// puisse être importée même sans réseau. Les noms des champs sont courts
// pour que le QR code reste petit et facile à scanner.

export interface ShareLinkObservation {
  /** id de l'observation d'origine */
  i: string
  /** date d'observation (ISO) */
  d: string
  /** nom du lieu */
  p: string
  la: number | null
  lo: number | null
  /** observateur */
  ob: string
}

export interface ShareLinkData {
  /** identifiant du partage (pour récupérer les photos sur le cloud) */
  id: string
  /** nom vernaculaire */
  v: string
  /** nom latin */
  l: string
  /** groupe */
  c: string
  /** observation principale */
  o?: ShareLinkObservation
}

/** Contenu complet d'un partage, stocké sur Supabase. */
export interface SharePayload {
  version: 1
  species: { vernacularName: string; latinName: string; category: string }
  observations: SharePayloadObservation[]
}

export interface SharePayloadObservation {
  sourceId: string
  observedAt: string
  latitude: number | null
  longitude: number | null
  placeName: string
  observer: string
  /** lien temporaire vers la photo (valable 30 jours) */
  photoUrl: string | null
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

const roundCoord = (n: number | null) => (n === null ? null : Math.round(n * 1e5) / 1e5)

export function encodeShareData(data: ShareLinkData): string {
  const compact: ShareLinkData = data.o
    ? { ...data, o: { ...data.o, la: roundCoord(data.o.la), lo: roundCoord(data.o.lo) } }
    : data
  return toBase64Url(JSON.stringify(compact))
}

const isString = (x: unknown): x is string => typeof x === 'string'
const isCoord = (x: unknown): x is number | null => x === null || (typeof x === 'number' && Number.isFinite(x))

/** Lit le contenu d'un lien ; renvoie null s'il est invalide. */
export function decodeShareData(encoded: string): ShareLinkData | null {
  try {
    const data: unknown = JSON.parse(fromBase64Url(encoded))
    if (!data || typeof data !== 'object') return null
    const d = data as Record<string, unknown>
    if (!isString(d.id) || !isString(d.v) || !d.v.trim() || !isString(d.l) || !isString(d.c)) return null

    const result: ShareLinkData = { id: d.id, v: d.v, l: d.l, c: d.c }
    if (d.o && typeof d.o === 'object') {
      const o = d.o as Record<string, unknown>
      if (isString(o.i) && isString(o.d) && isString(o.p) && isCoord(o.la) && isCoord(o.lo) && isString(o.ob)) {
        result.o = { i: o.i, d: o.d, p: o.p, la: o.la, lo: o.lo, ob: o.ob }
      }
    }
    return result
  } catch {
    return null
  }
}

/** Lien complet à mettre dans le QR code. */
export function buildShareUrl(data: ShareLinkData, appUrl: string): string {
  return `${appUrl}#/import?d=${encodeShareData(data)}`
}

/** Retrouve la partie « d=… » dans un lien collé ou scanné. */
export function extractShareParam(text: string): string | null {
  const match = text.trim().match(/[?&]d=([A-Za-z0-9_-]+)/)
  return match ? match[1] : null
}

export function isSharePayload(x: unknown): x is SharePayload {
  if (!x || typeof x !== 'object') return false
  const p = x as Partial<SharePayload>
  return p.version === 1 && !!p.species && isString(p.species.vernacularName) && Array.isArray(p.observations)
}
