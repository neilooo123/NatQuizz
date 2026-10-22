import { normalize } from './match'

export type QuizLevel = 'facile' | 'moyen' | 'difficile'

export const LEVELS: { id: QuizLevel; label: string; description: string }[] = [
  { id: 'facile', label: 'Facile', description: 'Une photo, 4 noms vernaculaires proposés.' },
  { id: 'moyen', label: 'Moyen', description: 'Une photo, il faut écrire le nom vernaculaire.' },
  { id: 'difficile', label: 'Difficile', description: 'Une photo, il faut écrire le nom latin.' },
]

/** Une espèce telle que le quiz la voit : ses noms et ses observations avec photo. */
export interface QuizSpecies {
  id: string
  vernacularName: string
  latinName: string
  category: string
  photoObservationIds: string[]
}

export interface QuizQuestion {
  speciesId: string
  observationId: string
  /** La bonne réponse (nom vernaculaire, ou nom latin au niveau difficile). */
  expected: string
  /** Niveau facile : les 4 noms proposés, dans le désordre. */
  choices?: string[]
}

type Random = () => number

export function shuffle<T>(items: T[], random: Random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Nombre minimal d'espèces pour jouer à un niveau. */
export function minSpeciesFor(level: QuizLevel): number {
  return level === 'facile' ? 4 : 1
}

/** Espèces utilisables : au moins une photo, et un nom latin pour le niveau difficile. */
export function eligibleSpecies(species: QuizSpecies[], level: QuizLevel, category = ''): QuizSpecies[] {
  return species.filter(
    (s) =>
      s.photoObservationIds.length > 0 &&
      (!category || s.category === category) &&
      (level !== 'difficile' || s.latinName.trim() !== ''),
  )
}

/** Choisit 3 mauvaises réponses, de préférence dans le même groupe que la bonne. */
function pickDistractors(target: QuizSpecies, pool: QuizSpecies[], random: Random): string[] {
  const seen = new Set([normalize(target.vernacularName)])
  const sameGroup = shuffle(pool.filter((s) => s.category && s.category === target.category), random)
  const others = shuffle(pool.filter((s) => !s.category || s.category !== target.category), random)

  const distractors: string[] = []
  for (const s of [...sameGroup, ...others]) {
    const key = normalize(s.vernacularName)
    if (seen.has(key)) continue
    seen.add(key)
    distractors.push(s.vernacularName)
    if (distractors.length === 3) break
  }
  return distractors
}

/**
 * Prépare une série de questions.
 * @param targets espèces à faire deviner (déjà filtrées)
 * @param pool toutes les espèces, pour piocher les mauvaises réponses du niveau facile
 */
export function buildQuiz(
  targets: QuizSpecies[],
  pool: QuizSpecies[],
  level: QuizLevel,
  count: number,
  random: Random = Math.random,
): QuizQuestion[] {
  return shuffle(targets, random)
    .slice(0, count)
    .map((species) => {
      const ids = species.photoObservationIds
      const question: QuizQuestion = {
        speciesId: species.id,
        observationId: ids[Math.floor(random() * ids.length)],
        expected: level === 'difficile' ? species.latinName : species.vernacularName,
      }
      if (level === 'facile') {
        question.choices = shuffle([species.vernacularName, ...pickDistractors(species, pool, random)], random)
      }
      return question
    })
}
