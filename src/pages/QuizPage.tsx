import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ObservationPhoto } from '../components/ObservationPhoto'
import { QuizResults, QuizRunner, type QuizAnswer } from '../components/QuizRunner'
import { CATEGORIES } from '../db/categories'
import { getDb } from '../db/db'
import {
  buildQuiz,
  eligibleSpecies,
  LEVELS,
  minSpeciesFor,
  type QuizLevel,
  type QuizQuestion,
  type QuizSpecies,
} from '../quiz/generate'

type Phase =
  | { name: 'setup' }
  | { name: 'play'; questions: QuizQuestion[] }
  | { name: 'results'; answers: QuizAnswer<QuizQuestion>[] }

/** Espèces avec au moins une photo disponible sur l'appareil (pour jouer hors ligne). */
function useQuizSpecies(): QuizSpecies[] | undefined {
  return useLiveQuery(async () => {
    const db = getDb()
    const [species, observations] = await Promise.all([
      db.species.filter((s) => !s.deletedAt).toArray(),
      db.observations.filter((o) => !o.deletedAt && (o.photoState === 'local' || o.photoState === 'synced')).toArray(),
    ])
    return species.map((s) => ({
      id: s.id,
      vernacularName: s.vernacularName,
      latinName: s.latinName,
      category: s.category,
      photoObservationIds: observations.filter((o) => o.speciesId === s.id).map((o) => o.id),
    }))
  })
}

export function QuizPage() {
  const allSpecies = useQuizSpecies()
  const [level, setLevel] = useState<QuizLevel>('facile')
  const [category, setCategory] = useState('')
  const [count, setCount] = useState(10)
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })

  const speciesById = useMemo(() => new Map((allSpecies ?? []).map((s) => [s.id, s])), [allSpecies])

  if (!allSpecies) return null

  const eligible = eligibleSpecies(allSpecies, level, category)
  const minimum = minSpeciesFor(level)
  const notEnoughForChoices = level === 'facile' && allSpecies.length < 4

  function start(targets: QuizSpecies[], questionCount: number) {
    setPhase({ name: 'play', questions: buildQuiz(targets, allSpecies!, level, questionCount) })
  }

  if (phase.name === 'play') {
    return (
      <QuizRunner
        questions={phase.questions}
        typing={level !== 'facile'}
        title={level === 'difficile' ? 'Quel est son nom latin ?' : 'Quelle est cette espèce ?'}
        placeholder={level === 'difficile' ? 'Genre espèce' : 'Nom vernaculaire'}
        italicAnswer={level === 'difficile'}
        renderPrompt={(q) => (
          <ObservationPhoto key={q.observationId} observationId={q.observationId} kind="full" className="photo-large" alt="Quelle est cette espèce ?" />
        )}
        renderSolution={(q) => {
          const species = speciesById.get(q.speciesId)
          if (!species) return null
          return (
            <span>
              C'était <strong>{species.vernacularName}</strong>
              {species.latinName && (
                <>
                  {' '}
                  (<span className="latin">{species.latinName}</span>)
                </>
              )}
              .
            </span>
          )
        }}
        onFinish={(answers) => setPhase({ name: 'results', answers })}
        onQuit={() => setPhase({ name: 'setup' })}
      />
    )
  }

  if (phase.name === 'results') {
    const mistakes = phase.answers.filter((a) => a.result === 'wrong')
    return (
      <QuizResults
        answers={phase.answers}
        renderMistake={(a) => {
          const s = speciesById.get(a.question.speciesId)
          return (
            <div key={a.question.observationId} className="observation-card row" style={{ flexWrap: 'nowrap', gap: 0 }}>
              <div style={{ width: 110, flexShrink: 0 }}>
                <ObservationPhoto observationId={a.question.observationId} />
              </div>
              <div style={{ padding: '8px 12px' }}>
                <strong>{s?.vernacularName}</strong>
                {s?.latinName && <div className="latin small">{s.latinName}</div>}
                <div className="small muted">Ta réponse : {a.given || '—'}</div>
              </div>
            </div>
          )
        }}
        onReplayMistakes={
          mistakes.length
            ? () => start(mistakes.map((a) => speciesById.get(a.question.speciesId)!).filter(Boolean), mistakes.length)
            : undefined
        }
        onReplay={() => start(eligible, count)}
        onSetup={() => setPhase({ name: 'setup' })}
      />
    )
  }

  const presentCategories = CATEGORIES.filter((c) => allSpecies.some((s) => s.category === c.id))

  return (
    <div className="stack">
      <h1>Quiz</h1>

      <div className="stack" style={{ gap: 8 }}>
        {LEVELS.map((l) => (
          <label key={l.id} className={`level-option ${level === l.id ? 'active' : ''}`}>
            <input type="radio" name="level" checked={level === l.id} onChange={() => setLevel(l.id)} />
            <span>
              <strong>{l.label}</strong>
              <br />
              <span className="small muted">{l.description}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Groupe</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Tous</option>
            {presentCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Questions</span>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={1000}>Toutes</option>
          </select>
        </label>
      </div>

      <p className="small muted">
        {eligible.length} espèce{eligible.length > 1 ? 's' : ''} disponible{eligible.length > 1 ? 's' : ''} pour ce quiz
        {level === 'difficile' && ' (seules celles qui ont un nom latin)'}.
      </p>

      {notEnoughForChoices ? (
        <div className="notice">Le niveau facile propose 4 noms : il faut au moins 4 espèces dans ta base.</div>
      ) : eligible.length < minimum ? (
        <div className="notice">
          Pas encore assez d'espèces avec photo pour ce quiz. <Link to="/observer">Ajoute une observation</Link> !
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={notEnoughForChoices || eligible.length < minimum}
        onClick={() => start(eligible, count)}
      >
        C'est parti !
      </button>
    </div>
  )
}
