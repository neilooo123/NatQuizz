import { normalize } from '../quiz/match'

export interface VocabWord {
  word: string
  definition: string
  themes: string[]
  /** D'où vient la définition (formation, livre…) ; peut être vide. */
  source: string
}

/** Retire les guillemets ajoutés par certains tableurs autour d'une cellule. */
function cleanCell(cell: string): string {
  const trimmed = cell.trim()
  return trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2
    ? trimmed.slice(1, -1).replace(/""/g, '"').trim()
    : trimmed
}

/**
 * Lit le tableau de vocabulaire : une ligne par mot, colonnes séparées par
 * une tabulation (mot, définition, thèmes séparés par « ; », source facultative).
 * La ligne d'en-tête, les lignes vides et les doublons sont ignorés.
 */
export function parseVocabulary(text: string): VocabWord[] {
  const words: VocabWord[] = []
  const seen = new Set<string>()

  for (const line of text.split(/\r?\n/)) {
    const [word = '', definition = '', themes = '', source = ''] = line.split('\t').map(cleanCell)
    if (!word || !definition) continue
    // Ligne d'en-tête (« Mot » ou « Nom », « Définition »…).
    if (normalize(definition) === 'definition') continue

    const key = normalize(word)
    if (seen.has(key)) continue
    seen.add(key)

    words.push({
      word,
      definition,
      themes: themes
        .split(';')
        .map((t) => t.trim())
        .filter(Boolean),
      source,
    })
  }
  return words
}

/** Liste des thèmes (sans doublons, ordre alphabétique). */
export function listThemes(words: VocabWord[]): string[] {
  const byKey = new Map<string, string>()
  for (const w of words) for (const t of w.themes) if (!byKey.has(normalize(t))) byKey.set(normalize(t), t)
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'fr'))
}

/** Les mots d'un thème ('' = tous les mots). */
export function wordsForTheme(words: VocabWord[], theme: string): VocabWord[] {
  if (!theme) return words
  const key = normalize(theme)
  return words.filter((w) => w.themes.some((t) => normalize(t) === key))
}
