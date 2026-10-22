import { describe, expect, it } from 'vitest'
import type { Observation } from '../db/types'
import { mergeObservation, mergedPhotoState, observationToRow, type ObservationRow } from './mapping'

const row = (patch: Partial<ObservationRow> = {}): ObservationRow => ({
  id: 'obs1',
  user_id: 'user1',
  species_id: 'sp1',
  photo_path: 'user1/obs1-a.jpg',
  observed_at: '2026-10-20T10:00:00Z',
  latitude: 48.1,
  longitude: -1.6,
  place_name: 'Rennes',
  observer: 'Neil',
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-21T10:00:00Z',
  deleted_at: null,
  ...patch,
})

const local = (patch: Partial<Observation> = {}): Observation => ({
  id: 'obs1',
  speciesId: 'sp1',
  observedAt: '2026-10-20T10:00:00Z',
  latitude: 48.1,
  longitude: -1.6,
  placeName: 'Rennes',
  observer: 'Neil',
  photoState: 'synced',
  photoPath: 'user1/obs1-a.jpg',
  shareId: null,
  shareSourceId: null,
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
  deletedAt: null,
  dirty: 0,
  ...patch,
})

describe('mergedPhotoState', () => {
  it('nouvelle observation venue du cloud : photo à télécharger', () => {
    expect(mergedPhotoState(undefined, row())).toBe('remote')
  })

  it('même photo déjà présente : rien à faire', () => {
    expect(mergedPhotoState(local(), row())).toBe('synced')
  })

  it('photo remplacée sur un autre appareil : à télécharger à nouveau', () => {
    expect(mergedPhotoState(local(), row({ photo_path: 'user1/obs1-b.jpg' }))).toBe('remote')
  })

  it('une photo locale pas encore envoyée reste prioritaire', () => {
    expect(mergedPhotoState(local({ photoState: 'local' }), row())).toBe('local')
  })

  it('photo de partage en attente conservée tant que le cloud n’a rien', () => {
    expect(mergedPhotoState(local({ photoState: 'pending-share', photoPath: null }), row({ photo_path: null }))).toBe(
      'pending-share',
    )
  })

  it('observation supprimée : plus de photo', () => {
    expect(mergedPhotoState(local(), row({ deleted_at: '2026-10-22T10:00:00Z' }))).toBe('none')
  })
})

describe('mergeObservation', () => {
  it('garde la version locale si elle a des modifications non envoyées', () => {
    expect(mergeObservation(local({ dirty: 1 }), row())).toBeNull()
  })

  it('prend la version du cloud et conserve les infos de partage locales', () => {
    const merged = mergeObservation(local({ shareId: 'share1', shareSourceId: 'src1' }), row({ place_name: 'Brocéliande' }))
    expect(merged?.placeName).toBe('Brocéliande')
    expect(merged?.shareId).toBe('share1')
    expect(merged?.dirty).toBe(0)
    expect(merged?.updatedAt).toBe('2026-10-21T10:00:00Z')
  })

  it('aller-retour local → cloud → local sans perte', () => {
    const original = local()
    const sent = { ...observationToRow(original, 'user1'), updated_at: original.updatedAt }
    expect(mergeObservation(undefined, sent)).toEqual({ ...original, photoState: 'remote' })
  })
})
