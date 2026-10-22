import { describe, expect, it } from 'vitest'
import { checkAnswer, levenshtein, normalize } from './match'

describe('normalize', () => {
  it('ignore accents, majuscules, tirets et espaces en trop', () => {
    expect(normalize('  Rouge-Gorge   Familier ')).toBe('rouge gorge familier')
    expect(normalize('Mésange à longue queue')).toBe('mesange a longue queue')
    expect(normalize("Pic épeiche'")).toBe('pic epeiche')
  })
})

describe('levenshtein', () => {
  it('compte les lettres à changer', () => {
    expect(levenshtein('chat', 'chat')).toBe(0)
    expect(levenshtein('chat', 'chats')).toBe(1)
    expect(levenshtein('chene', 'chaine')).toBe(2)
    expect(levenshtein('', 'abc')).toBe(3)
  })
})

describe('checkAnswer', () => {
  it('accepte la réponse exacte, même sans accents ni majuscules', () => {
    expect(checkAnswer('rouge gorge familier', 'Rouge-gorge familier')).toBe('exact')
    expect(checkAnswer('erithacus rubecula', 'Erithacus rubecula')).toBe('exact')
    expect(checkAnswer('mesange bleue', 'Mésange bleue')).toBe('exact')
  })

  it('tolère une petite faute de frappe', () => {
    expect(checkAnswer('Erithacus rubeculla', 'Erithacus rubecula')).toBe('close')
    expect(checkAnswer('Erytacus rubecula', 'Erithacus rubecula')).toBe('close')
    expect(checkAnswer('Hetre', 'Hêtre')).toBe('exact')
    expect(checkAnswer('Hetrr', 'Hêtre')).toBe('close')
  })

  it('refuse une réponse trop différente', () => {
    expect(checkAnswer('Turdus merula', 'Erithacus rubecula')).toBe('wrong')
    expect(checkAnswer('Erthcus rbcula', 'Erithacus rubecula')).toBe('wrong')
    expect(checkAnswer('', 'Chêne')).toBe('wrong')
  })

  it("n'accepte aucune faute sur un nom très court", () => {
    expect(checkAnswer('Ifs', 'If')).toBe('wrong')
  })
})
