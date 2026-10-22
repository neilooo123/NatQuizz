/** Les groupes d'espèces proposés dans les formulaires et les filtres. */
export const CATEGORIES = [
  { id: 'arbre', label: 'Arbre' },
  { id: 'fleur', label: 'Fleur' },
  { id: 'plante', label: 'Autre plante' },
  { id: 'champignon', label: 'Champignon' },
  { id: 'oiseau', label: 'Oiseau' },
  { id: 'mammifere', label: 'Mammifère' },
  { id: 'insecte', label: 'Insecte' },
  { id: 'reptile-amphibien', label: 'Reptile / Amphibien' },
  { id: 'animal', label: 'Autre animal' },
] as const

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? 'Non classé'
}
