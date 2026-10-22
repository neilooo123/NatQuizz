import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { ObservationPhoto } from '../components/ObservationPhoto'
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
import { checkAnswer, type MatchResult } from '../quiz/match'

interface Answer {
  question: QuizQuestion
  given: string
  result: MatchResult
}

type Phase =
  | { name: 'setup' }
  | { name: 'play'; questions: QuizQuestion[] }
  | { name: 'results'; questions: QuizQuestion[]; answers: Answer[] }

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
      <QuizPlay
        questions={phase.questions}
        level={level}
        speciesById={speciesById}
        onFinish={(answers) => setPhase({ name: 'results', questions: phase.questions, answers })}
        onQuit={() => setPhase({ name: 'setup' })}
      />
    )
  }

  if (phase.name === 'results') {
    const mistakes = phase.answers.filter((a) => a.result === 'wrong')
    return (
      <QuizResults
        answers={phase.answers}
        speciesById={speciesById}
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
          Pas encore assez d'espèces avec photo pour ce quiz.{' '}
          <Link to="/observer">Ajoute une observation</Link> !
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

interface PlayProps {
  questions: QuizQuestion[]
  level: QuizLevel
  speciesById: Map<string, QuizSpecies>
  onFinish: (answers: Answer[]) => void
  onQuit: () => void
}

function QuizPlay({ questions, level, speciesById, onFinish, onQuit }: PlayProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [typed, setTyped] = useState('')
  const question = questions[index]
  const current: Answer | undefined = answers[index]
  const species = speciesById.get(question.speciesId)
  const score = answers.filter((a) => a.result !== 'wrong').length

  function answer(given: string) {
    if (current) return
    const result: MatchResult = level === 'facile' ? (given === question.expected ? 'exact' : 'wrong') : checkAnswer(given, question.expected)
    setAnswers([...answers, { question, given, result }])
  }

  function next() {
    if (index + 1 >= questions.length) {
      onFinish(answers)
      return
    }
    setIndex(index + 1)
    setTyped('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (current) next()
    else if (typed.trim()) answer(typed)
  }

  return (
    <div className="stack">
      <div className="row">
        <strong>
          Question {index + 1} / {questions.length}
        </strong>
        <span className="spacer" />
        <span className="badge">Score : {score}</span>
        <button type="button" className="btn btn-small btn-outline" onClick={onQuit}>
          Arrêter
        </button>
      </div>
      <div className="progress">
        <div style={{ width: `${((index + (current ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      <ObservationPhoto key={question.observationId} observationId={question.observationId} kind="full" className="photo-large" alt="Quelle est cette espèce ?" />

      <h2 style={{ margin: 0 }}>{level === 'difficile' ? 'Quel est son nom latin ?' : 'Quelle est cette espèce ?'}</h2>

      {level === 'facile' ? (
        <div className="choices">
          {question.choices!.map((choice) => {
            let tone = ''
            if (current && choice === question.expected) tone = 'correct'
            else if (current && choice === current.given) tone = 'wrong'
            return (
              <button key={choice} type="button" className={`choice ${tone}`} disabled={!!current} onClick={() => answer(choice)}>
                {choice}
              </button>
            )
          })}
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            readOnly={!!current}
            placeholder={level === 'difficile' ? 'Genre espèce' : 'Nom vernaculaire'}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            style={{ fontStyle: level === 'difficile' ? 'italic' : undefined }}
          />
          {!current && (
            <button className="btn btn-primary" disabled={!typed.trim()}>
              Valider
            </button>
          )}
        </form>
      )}

      {current && (
        <div className={`notice ${current.result === 'wrong' ? 'error' : 'success'} stack`} style={{ gap: 4 }}>
          <strong>
            {current.result === 'exact' && 'Bravo ! 🎉'}
            {current.result === 'close' && 'Presque parfait ! Petite faute acceptée.'}
            {current.result === 'wrong' && 'Raté…'}
          </strong>
          {species && (
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
          )}
        </div>
      )}

      {current && (
        <button type="button" className="btn btn-primary btn-block" onClick={next} autoFocus>
          {index + 1 >= questions.length ? 'Voir mon score' : 'Question suivante'}
        </button>
      )}
    </div>
  )
}

interface ResultsProps {
  answers: Answer[]
  speciesById: Map<string, QuizSpecies>
  onReplayMistakes?: () => void
  onReplay: () => void
  onSetup: () => void
}

function QuizResults({ answers, speciesById, onReplayMistakes, onReplay, onSetup }: ResultsProps) {
  const score = answers.filter((a) => a.result !== 'wrong').length
  const ratio = answers.length ? score / answers.length : 0
  const mistakes = answers.filter((a) => a.result === 'wrong')
  const message =
    ratio === 1 ? 'Sans faute, bravo ! 🏆' : ratio >= 0.7 ? 'Très bien ! 🍁' : ratio >= 0.4 ? 'Pas mal, continue ! 🌱' : 'Courage, ça viendra ! 🌰'

  return (
    <div className="stack">
      <h1>Résultat</h1>
      <div className="card stack" style={{ alignItems: 'center' }}>
        <div className="score">
          {score} / {answers.length}
        </div>
        <strong>{message}</strong>
      </div>

      {mistakes.length > 0 && (
        <section className="stack">
          <h2 style={{ margin: 0 }}>À revoir</h2>
          {mistakes.map((a) => {
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
          })}
        </section>
      )}

      {onReplayMistakes && (
        <button type="button" className="btn btn-primary btn-block" onClick={onReplayMistakes}>
          <Icon name="refresh" /> Rejouer mes erreurs
        </button>
      )}
      <div className="row">
        <button type="button" className="btn" style={{ flex: 1 }} onClick={onReplay}>
          Rejouer
        </button>
        <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onSetup}>
          Changer de quiz
        </button>
      </div>
    </div>
  )
}
