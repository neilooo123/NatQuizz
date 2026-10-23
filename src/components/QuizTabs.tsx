import { useSearchParams } from 'react-router'

export type QuizKind = 'especes' | 'vocabulaire'

/** Le type de quiz choisi, gardé dans l'adresse (#/quiz?type=vocabulaire). */
export function useQuizKind(): QuizKind {
  const [params] = useSearchParams()
  return params.get('type') === 'vocabulaire' ? 'vocabulaire' : 'especes'
}

/** Onglets « Espèces » / « Vocabulaire » en haut de l'écran Quiz. */
export function QuizTabs() {
  const kind = useQuizKind()
  const [, setParams] = useSearchParams()

  return (
    <div className="tabs" role="tablist">
      <button type="button" className={kind === 'especes' ? 'active' : ''} onClick={() => setParams({}, { replace: true })}>
        Espèces
      </button>
      <button
        type="button"
        className={kind === 'vocabulaire' ? 'active' : ''}
        onClick={() => setParams({ type: 'vocabulaire' }, { replace: true })}
      >
        Vocabulaire
      </button>
    </div>
  )
}
