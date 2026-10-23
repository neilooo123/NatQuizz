// Déroulé commun à tous les quiz (espèces, vocabulaire) :
// une question à la fois, correction immédiate, puis le score.

import { useState, type FormEvent, type ReactNode } from 'react'
import { checkAnswer, type MatchResult } from '../quiz/match'
import { Icon } from './Icon'

export interface RunnerQuestion {
  /** La bonne réponse. */
  expected: string
  /** Réponses proposées (questions à choix multiples). */
  choices?: string[]
}

export interface QuizAnswer<Q> {
  question: Q
  given: string
  result: MatchResult
}

interface RunnerProps<Q extends RunnerQuestion> {
  questions: Q[]
  /** true : on écrit la réponse ; false : on la choisit parmi `choices`. */
  typing: boolean
  title: string
  placeholder?: string
  /** Réponse en italique (noms latins). */
  italicAnswer?: boolean
  /** Ce qui est montré pour poser la question (photo, définition…). */
  renderPrompt: (question: Q) => ReactNode
  /** La correction affichée après la réponse. */
  renderSolution: (question: Q) => ReactNode
  onFinish: (answers: QuizAnswer<Q>[]) => void
  onQuit: () => void
}

export function QuizRunner<Q extends RunnerQuestion>({
  questions,
  typing,
  title,
  placeholder,
  italicAnswer = false,
  renderPrompt,
  renderSolution,
  onFinish,
  onQuit,
}: RunnerProps<Q>) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer<Q>[]>([])
  const [typed, setTyped] = useState('')
  const question = questions[index]
  const current: QuizAnswer<Q> | undefined = answers[index]
  const score = answers.filter((a) => a.result !== 'wrong').length

  function answer(given: string) {
    if (current) return
    const result: MatchResult = typing ? checkAnswer(given, question.expected) : given === question.expected ? 'exact' : 'wrong'
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

      {renderPrompt(question)}

      <h2 style={{ margin: 0 }}>{title}</h2>

      {typing ? (
        // key : le champ est recréé à chaque question, et reprend le focus.
        <form key={index} className="stack" onSubmit={handleSubmit}>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            readOnly={!!current}
            placeholder={placeholder}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            style={{ fontStyle: italicAnswer ? 'italic' : undefined }}
          />
          {!current && (
            <button className="btn btn-primary" disabled={!typed.trim()}>
              Valider
            </button>
          )}
        </form>
      ) : (
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
      )}

      {current && (
        <div className={`notice ${current.result === 'wrong' ? 'error' : 'success'} stack`} style={{ gap: 4 }}>
          <strong>
            {current.result === 'exact' && 'Bravo ! 🎉'}
            {current.result === 'close' && 'Presque parfait ! Petite faute acceptée.'}
            {current.result === 'wrong' && 'Raté…'}
          </strong>
          {renderSolution(question)}
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

interface ResultsProps<Q> {
  answers: QuizAnswer<Q>[]
  /** Une erreur à revoir (affichée dans la liste « À revoir »). */
  renderMistake: (answer: QuizAnswer<Q>, index: number) => ReactNode
  onReplayMistakes?: () => void
  onReplay: () => void
  onSetup: () => void
}

export function QuizResults<Q>({ answers, renderMistake, onReplayMistakes, onReplay, onSetup }: ResultsProps<Q>) {
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
          {mistakes.map(renderMistake)}
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
