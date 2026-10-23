import type { VocabWord } from '../vocab/parse'
import { shuffle } from './generate'
import { normalize } from './match'

export type VocabLevel = 'facile' | 'moyen'

export const VOCAB_LEVELS: { id: VocabLevel; label: string; description: string }[] = [
  { id: 'facile', label: 'Facile', description: 'Une définition, 4 mots proposés.' },
  { id: 'moyen', label: 'Moyen', description: 'Une définition, il faut écrire le mot.' },
]

export interface VocabQuestion {
  word: VocabWord
  /** Le mot à trouver. */
  expected: string
  /** Niveau facile : les 4 mots proposés, dans le désordre. */
  choices?: string[]
}

/** Choisit 3 mauvaises réponses, de préférence parmi les mots qui partagent un thème. */
function pickDistractors(target: VocabWord, pool: VocabWord[], random: () => number): string[] {
  const targetThemes = new Set(target.themes.map(normalize))
  const sharesTheme = (w: VocabWord) => w.themes.some((t) => targetThemes.has(normalize(t)))
  const close = shuffle(pool.filter(sharesTheme), random)
  const others = shuffle(pool.filter((w) => !sharesTheme(w)), random)

  const seen = new Set([normalize(target.word)])
  const distractors: string[] = []
  for (const w of [...close, ...others]) {
    const key = normalize(w.word)
    if (seen.has(key)) continue
    seen.add(key)
    distractors.push(w.word)
    if (distractors.length === 3) break
  }
  return distractors
}

/**
 * Prépare une série de questions de vocabulaire.
 * @param targets mots à faire deviner (déjà filtrés par thème)
 * @param pool tous les mots, pour piocher les mauvaises réponses du niveau facile
 */
export function buildVocabQuiz(
  targets: VocabWord[],
  pool: VocabWord[],
  level: VocabLevel,
  count: number,
  random: () => number = Math.random,
): VocabQuestion[] {
  return shuffle(targets, random)
    .slice(0, count)
    .map((word) => {
      const question: VocabQuestion = { word, expected: word.word }
      if (level === 'facile') question.choices = shuffle([word.word, ...pickDistractors(word, pool, random)], random)
      return question
    })
}
