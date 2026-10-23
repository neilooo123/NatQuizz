import { useState } from 'react'
import { QuizResults, QuizRunner, type QuizAnswer } from '../components/QuizRunner'
import { QuizTabs } from '../components/QuizTabs'
import { buildVocabQuiz, VOCAB_LEVELS, type VocabLevel, type VocabQuestion } from '../quiz/vocabQuiz'
import { listThemes, wordsForTheme, type VocabWord } from '../vocab/parse'
import { VOCABULARY } from '../vocab/vocabulary'

type Phase =
  | { name: 'setup' }
  | { name: 'play'; questions: VocabQuestion[] }
  | { name: 'results'; answers: QuizAnswer<VocabQuestion>[] }

const THEMES = listThemes(VOCABULARY)

/** Thèmes et source d'un mot, affichés une fois la réponse donnée. */
function WordDetails({ word }: { word: VocabWord }) {
  if (!word.themes.length && !word.source) return null
  return (
    <div className="row small">
      {word.themes.map((t) => (
        <span key={t} className="badge">
          {t}
        </span>
      ))}
      {word.source && <span className="muted">Source : {word.source}</span>}
    </div>
  )
}

/** Quiz de vocabulaire nature : retrouver le mot à partir de sa définition. */
export function VocabQuiz() {
  const [level, setLevel] = useState<VocabLevel>('facile')
  const [theme, setTheme] = useState('')
  const [count, setCount] = useState(10)
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })

  const available = wordsForTheme(VOCABULARY, theme)
  // Au niveau facile, il faut au moins 4 mots différents pour proposer 4 réponses.
  const canPlay = available.length > 0 && (level !== 'facile' || VOCABULARY.length >= 4)

  function start(targets: VocabWord[], questionCount: number) {
    setPhase({ name: 'play', questions: buildVocabQuiz(targets, VOCABULARY, level, questionCount) })
  }

  if (phase.name === 'play') {
    return (
      <QuizRunner
        questions={phase.questions}
        typing={level === 'moyen'}
        title="Quel est ce mot ?"
        placeholder="Le mot"
        renderPrompt={(q) => (
          // Les thèmes ne sont montrés qu'après la réponse : ils peuvent la trahir
          // (thème « Chiroptères » pour le mot « Chiroptère »).
          <div className="card definition-card">
            <span className="small muted">Définition</span>
            <p className="definition">{q.word.definition}</p>
          </div>
        )}
        renderSolution={(q) => (
          <>
            <span>
              C'était <strong>{q.word.word}</strong>.
            </span>
            <WordDetails word={q.word} />
          </>
        )}
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
        renderMistake={(a) => (
          <div key={a.question.word.word} className="card stack" style={{ gap: 4 }}>
            <strong>{a.question.word.word}</strong>
            <span className="small">{a.question.word.definition}</span>
            <span className="small muted">Ta réponse : {a.given || '—'}</span>
            <WordDetails word={a.question.word} />
          </div>
        )}
        onReplayMistakes={mistakes.length ? () => start(mistakes.map((a) => a.question.word), mistakes.length) : undefined}
        onReplay={() => start(available, count)}
        onSetup={() => setPhase({ name: 'setup' })}
      />
    )
  }

  return (
    <div className="stack">
      <h1>Quiz</h1>
      <QuizTabs />

      <div className="stack" style={{ gap: 8 }}>
        {VOCAB_LEVELS.map((l) => (
          <label key={l.id} className={`level-option ${level === l.id ? 'active' : ''}`}>
            <input type="radio" name="vocab-level" checked={level === l.id} onChange={() => setLevel(l.id)} />
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
          <span>Thème</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="">Tous</option>
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
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
        {available.length} mot{available.length > 1 ? 's' : ''} disponible{available.length > 1 ? 's' : ''} pour ce quiz.
      </p>

      <button type="button" className="btn btn-primary btn-block" disabled={!canPlay} onClick={() => start(available, count)}>
        C'est parti !
      </button>
    </div>
  )
}
