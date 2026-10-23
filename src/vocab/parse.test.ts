import { describe, expect, it } from 'vitest'
import { listThemes, parseVocabulary, wordsForTheme } from './parse'
import { VOCABULARY } from './vocabulary'

const sample = [
  'mot\tdéfinition\tthèmes',
  'Canopée\tÉtage supérieur de la forêt.\tForêt;Botanique',
  '',
  '"Sève"\t"Liquide qui circule dans les plantes."\t Botanique ; arbres ',
  'canopée\tDoublon à ignorer.\tForêt',
  'Mot sans définition\t\tForêt',
  'Humus\tSol formé par la décomposition des feuilles.',
].join('\r\n')

describe('parseVocabulary', () => {
  const words = parseVocabulary(sample)

  it("ignore l'en-tête, les lignes vides, incomplètes et les doublons", () => {
    expect(words.map((w) => w.word)).toEqual(['Canopée', 'Sève', 'Humus'])
  })

  it('découpe les thèmes et retire les guillemets et espaces', () => {
    expect(words[1]).toEqual({
      word: 'Sève',
      definition: 'Liquide qui circule dans les plantes.',
      themes: ['Botanique', 'arbres'],
      source: '',
    })
  })

  it('accepte un mot sans thème', () => {
    expect(words[2].themes).toEqual([])
  })

  it('lit la colonne source et un en-tête « Nom / Définition »', () => {
    const table = [
      'Nom\tDéfinition\tThème\tSources',
      'Chiroptère \t« Qui vole avec ses mains ». Cela désigne les chauves-souris.\tChiroptères\tOFB formation',
      'Ubiquiste\tEspèce qui occupe des niches écologiques diverses.\tGénéral ; Chiroptères\tOFB formation',
    ].join('\n')
    expect(parseVocabulary(table)).toEqual([
      {
        word: 'Chiroptère',
        definition: '« Qui vole avec ses mains ». Cela désigne les chauves-souris.',
        themes: ['Chiroptères'],
        source: 'OFB formation',
      },
      {
        word: 'Ubiquiste',
        definition: 'Espèce qui occupe des niches écologiques diverses.',
        themes: ['Général', 'Chiroptères'],
        source: 'OFB formation',
      },
    ])
  })
})

describe('thèmes', () => {
  const words = parseVocabulary(sample)

  it('liste les thèmes sans doublons, par ordre alphabétique', () => {
    expect(listThemes(words)).toEqual(['arbres', 'Botanique', 'Forêt'])
  })

  it('filtre les mots par thème sans tenir compte des majuscules ni des accents', () => {
    expect(wordsForTheme(words, 'botanique').map((w) => w.word)).toEqual(['Canopée', 'Sève'])
    expect(wordsForTheme(words, 'foret').map((w) => w.word)).toEqual(['Canopée'])
    expect(wordsForTheme(words, '')).toHaveLength(3)
  })
})

describe('le fichier vocabulaire.tsv', () => {
  it('est lisible et contient assez de mots pour le niveau facile', () => {
    expect(VOCABULARY.length).toBeGreaterThanOrEqual(4)
    for (const w of VOCABULARY) {
      expect(w.word).not.toBe('')
      expect(w.definition).not.toBe('')
    }
  })
})
