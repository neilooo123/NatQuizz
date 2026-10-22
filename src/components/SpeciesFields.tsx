import { CATEGORIES } from '../db/categories'
import type { SpeciesInput } from '../db/repo'

interface Props {
  value: SpeciesInput
  onChange: (value: SpeciesInput) => void
  /** Noms des espèces existantes, proposés pendant la saisie. */
  suggestions?: string[]
  /** Fiche existante : noms affichés mais non modifiables ici. */
  readOnly?: boolean
  /** Seuls le nom latin et le groupe sont verrouillés (espèce déjà connue). */
  detailsReadOnly?: boolean
}

/** Champs d'une fiche espèce : nom vernaculaire, nom latin, groupe. */
export function SpeciesFields({ value, onChange, suggestions = [], readOnly = false, detailsReadOnly = false }: Props) {
  const lockDetails = readOnly || detailsReadOnly
  const set = (patch: Partial<SpeciesInput>) => onChange({ ...value, ...patch })

  return (
    <>
      <label className="field">
        <span>Nom vernaculaire</span>
        <input
          required
          list="species-names"
          value={value.vernacularName}
          readOnly={readOnly}
          onChange={(e) => set({ vernacularName: e.target.value })}
          placeholder="ex. Rouge-gorge familier"
        />
        <datalist id="species-names">
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </label>

      <label className="field">
        <span>Nom latin</span>
        <input
          value={value.latinName}
          readOnly={lockDetails}
          onChange={(e) => set({ latinName: e.target.value })}
          placeholder="ex. Erithacus rubecula"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={{ fontStyle: value.latinName ? 'italic' : undefined }}
        />
        {!lockDetails && <span className="hint">Tu pourras le compléter plus tard si tu ne le connais pas.</span>}
      </label>

      <label className="field">
        <span>Groupe</span>
        <select value={value.category} disabled={lockDetails} onChange={(e) => set({ category: e.target.value })}>
          <option value="">Non classé</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
