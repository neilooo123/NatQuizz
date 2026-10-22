/**
 * Met un texte sous une forme comparable :
 * « Rouge-gorge  Familier » → « rouge gorge familier », « Mésange » → « mesange ».
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[-'’_.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Nombre minimal de lettres à ajouter, retirer ou remplacer pour passer de a à b. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
    }
    previous = current
  }
  return previous[b.length]
}

/** Fautes de frappe tolérées selon la longueur de la réponse attendue. */
export function allowedErrors(length: number): number {
  if (length <= 3) return 0
  if (length <= 7) return 1
  return 2
}

export type MatchResult = 'exact' | 'close' | 'wrong'

/**
 * Compare la réponse tapée à la réponse attendue.
 * Majuscules, accents, tirets et espaces ne comptent pas ;
 * une ou deux fautes de frappe donnent « close » (réponse acceptée).
 */
export function checkAnswer(answer: string, expected: string): MatchResult {
  const a = normalize(answer)
  const e = normalize(expected)
  if (!a || !e) return 'wrong'
  if (a === e) return 'exact'
  return levenshtein(a, e) <= allowedErrors(e.length) ? 'close' : 'wrong'
}
