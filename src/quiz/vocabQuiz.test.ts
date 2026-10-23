import { describe, expect, it } from 'vitest'
import type { VocabWord } from '../vocab/parse'
import { buildVocabQuiz } from './vocabQuiz'

const word = (w: string, themes: string[]): VocabWord => ({ word: w, definition: `Définition de ${w}`, themes, source: '' })

const pool: VocabWord[] = [
  word('Canopée', ['Forêt']),
  word('Lisière', ['Forêt', 'Paysage']),
  word('Humus', ['Sol', 'Forêt']),
  word('Futaie', ['Forêt']),
  word('Migration', ['Animaux']),
  word('Hibernation', ['Animaux']),
]

describe('buildVocabQuiz', () => {
  it('ne pose pas deux fois le même mot et respecte le nombre demandé', () => {
    const questions = buildVocabQuiz(pool, pool, 'moyen', 4)
    expect(questions).toHaveLength(4)
    expect(new Set(questions.map((q) => q.expected)).size).toBe(4)
    expect(questions.every((q) => q.choices === undefined)).toBe(true)
  })

  it('propose 4 mots différents dont le bon au niveau facile', () => {
    for (let run = 0; run < 20; run++) {
      for (const q of buildVocabQuiz(pool, pool, 'facile', 10)) {
        expect(q.choices).toHaveLength(4)
        expect(new Set(q.choices).size).toBe(4)
        expect(q.choices).toContain(q.expected)
      }
    }
  })

  it('pioche les mauvaises réponses parmi les mots du même thème en priorité', () => {
    const [q] = buildVocabQuiz([pool[0]], pool, 'facile', 1)
    expect([...q.choices!].sort()).toEqual(['Canopée', 'Futaie', 'Humus', 'Lisière'])
  })
})
