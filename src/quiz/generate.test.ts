import { describe, expect, it } from 'vitest'
import { buildQuiz, eligibleSpecies, type QuizSpecies } from './generate'

const species = (id: string, name: string, latin: string, category: string, photos = 1): QuizSpecies => ({
  id,
  vernacularName: name,
  latinName: latin,
  category,
  photoObservationIds: Array.from({ length: photos }, (_, i) => `${id}-obs${i}`),
})

const pool: QuizSpecies[] = [
  species('a', 'Rouge-gorge familier', 'Erithacus rubecula', 'oiseau'),
  species('b', 'Mésange bleue', 'Cyanistes caeruleus', 'oiseau'),
  species('c', 'Merle noir', 'Turdus merula', 'oiseau'),
  species('d', 'Pic épeiche', '', 'oiseau'),
  species('e', 'Chêne pédonculé', 'Quercus robur', 'arbre'),
  species('f', 'Hêtre commun', 'Fagus sylvatica', 'arbre', 3),
  species('g', 'Sans photo', 'Nullus', 'arbre', 0),
]

describe('eligibleSpecies', () => {
  it('écarte les espèces sans photo', () => {
    expect(eligibleSpecies(pool, 'facile').map((s) => s.id)).not.toContain('g')
  })

  it('garde seulement les espèces avec un nom latin au niveau difficile', () => {
    expect(eligibleSpecies(pool, 'difficile').map((s) => s.id)).not.toContain('d')
  })

  it('filtre par groupe', () => {
    expect(eligibleSpecies(pool, 'moyen', 'arbre').map((s) => s.id)).toEqual(['e', 'f'])
  })
})

describe('buildQuiz', () => {
  it('ne pose pas deux fois la même espèce', () => {
    const questions = buildQuiz(eligibleSpecies(pool, 'moyen'), pool, 'moyen', 100)
    const ids = questions.map((q) => q.speciesId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBe(6)
  })

  it('respecte le nombre de questions demandé', () => {
    expect(buildQuiz(pool, pool, 'moyen', 3)).toHaveLength(3)
  })

  it('propose 4 noms différents dont la bonne réponse au niveau facile', () => {
    for (let run = 0; run < 20; run++) {
      for (const q of buildQuiz(eligibleSpecies(pool, 'facile'), pool, 'facile', 10)) {
        expect(q.choices).toHaveLength(4)
        expect(new Set(q.choices).size).toBe(4)
        expect(q.choices).toContain(q.expected)
      }
    }
  })

  it('pioche les mauvaises réponses dans le même groupe en priorité', () => {
    const [q] = buildQuiz([pool[0]], pool, 'facile', 1)
    const birds = ['Rouge-gorge familier', 'Mésange bleue', 'Merle noir', 'Pic épeiche']
    expect([...q.choices!].sort()).toEqual([...birds].sort())
  })

  it('attend le nom latin au niveau difficile', () => {
    const [q] = buildQuiz([pool[4]], pool, 'difficile', 1)
    expect(q.expected).toBe('Quercus robur')
    expect(q.choices).toBeUndefined()
  })

  it('choisit une des photos de l’espèce', () => {
    const [q] = buildQuiz([pool[5]], pool, 'moyen', 1)
    expect(pool[5].photoObservationIds).toContain(q.observationId)
  })
})
