import { describe, expect, it } from 'vitest'
import { buildShareUrl, decodeShareData, encodeShareData, extractShareParam, type ShareLinkData } from './encode'

const data: ShareLinkData = {
  id: '6f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
  v: 'Mésange à longue queue',
  l: 'Aegithalos caudatus',
  c: 'oiseau',
  o: {
    i: '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e',
    d: '2026-10-23T09:15:00.000Z',
    p: 'Forêt de Brocéliande',
    la: 48.0123456789,
    lo: -2.1987654321,
    ob: 'Neil',
  },
}

describe('liens de partage', () => {
  it('encode puis décode sans perte (accents compris)', () => {
    const decoded = decodeShareData(encodeShareData(data))
    expect(decoded?.v).toBe('Mésange à longue queue')
    expect(decoded?.o?.p).toBe('Forêt de Brocéliande')
    expect(decoded?.id).toBe(data.id)
  })

  it('arrondit les coordonnées pour garder un QR code compact', () => {
    const decoded = decodeShareData(encodeShareData(data))
    expect(decoded?.o?.la).toBe(48.01235)
    expect(decoded?.o?.lo).toBe(-2.19877)
  })

  it('produit un lien utilisable dans une adresse', () => {
    const url = buildShareUrl(data, 'https://neilooo123.github.io/NatQuizz/')
    expect(url).toMatch(/^https:\/\/neilooo123\.github\.io\/NatQuizz\/#\/import\?d=[A-Za-z0-9_-]+$/)
    expect(url.length).toBeLessThan(600)
    expect(decodeShareData(extractShareParam(url)!)).toEqual(decodeShareData(encodeShareData(data)))
  })

  it('accepte une fiche sans observation', () => {
    const { o: _, ...withoutObservation } = data
    expect(decodeShareData(encodeShareData(withoutObservation))).toEqual(withoutObservation)
  })

  it('refuse un contenu invalide', () => {
    expect(decodeShareData('nimportequoi')).toBeNull()
    expect(decodeShareData(encodeShareData({ ...data, v: '' }))).toBeNull()
    expect(extractShareParam('https://example.com/')).toBeNull()
  })
})
