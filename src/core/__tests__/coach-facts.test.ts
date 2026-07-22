import { describe, it, expect } from 'vitest'
import { buildGameFacts, buildMoveFacts, COACH_FACTS, type AnalyzedGame } from '../coach-facts'
import type { AnalyzedMove, MoveClassification, Score } from '../types'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
const cp = (value: number): Score => ({ type: 'cp', value })

function makeMove(partial: Partial<AnalyzedMove> = {}): AnalyzedMove {
  return {
    ply: 0,
    moveNumber: 1,
    color: 'white',
    san: 'e4',
    from: 'e2',
    to: 'e4',
    fenBefore: START,
    fenAfter: AFTER_E4,
    winPercentBefore: 50,
    winPercentAfter: 50,
    accuracy: 100,
    classification: 'best',
    bestMoveUci: null,
    bestLineUci: [],
    playedLineUci: [],
    scoreBefore: cp(20),
    scoreAfter: cp(20),
    ...partial
  }
}

function game(moves: readonly AnalyzedMove[], headers: Record<string, string> = {}): AnalyzedGame {
  return { headers, moves, accuracy: { white: 90, black: 85 } }
}

describe('buildMoveFacts — UCI line → SAN', () => {
  it('renders the engine best line in SAN from the position before the move', () => {
    const facts = buildMoveFacts(
      game([makeMove({ bestLineUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6'] })]),
      0
    )
    expect(facts.bestLineSan).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
    expect(facts.bestMoveSan).toBe('e4')
  })

  it('handles promotion moves', () => {
    const promoFen = '8/P7/8/8/8/8/8/k6K w - - 0 1'
    const facts = buildMoveFacts(
      game([makeMove({ fenBefore: promoFen, bestLineUci: ['a7a8q'] })]),
      0
    )
    expect(facts.bestLineSan).toEqual(['a8=Q+'])
    expect(facts.bestMoveSan).toBe('a8=Q+')
  })

  it('stops the line at the first illegal/garbage UCI move instead of throwing', () => {
    const facts = buildMoveFacts(game([makeMove({ bestLineUci: ['e2e4', 'zzzz', 'e7e5'] })]), 0)
    expect(facts.bestLineSan).toEqual(['e4'])
  })

  it('truncates a long line to COACH_FACTS.maxLinePlies', () => {
    const longLine = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6', 'd2d3', 'f8c5']
    const facts = buildMoveFacts(game([makeMove({ bestLineUci: longLine })]), 0)
    expect(facts.bestLineSan).toHaveLength(COACH_FACTS.maxLinePlies)
  })

  it('falls back to the single best move when no PV line is present', () => {
    const facts = buildMoveFacts(game([makeMove({ bestLineUci: [], bestMoveUci: 'g1f3' })]), 0)
    expect(facts.bestMoveSan).toBe('Nf3')
    expect(facts.bestLineSan).toEqual([])
  })

  it('computes win% lost as a non-negative swing', () => {
    const facts = buildMoveFacts(game([makeMove({ winPercentBefore: 60, winPercentAfter: 20 })]), 0)
    expect(facts.winPercentLost).toBe(40)
  })

  it('never reports a negative swing when win% went up', () => {
    const facts = buildMoveFacts(game([makeMove({ winPercentBefore: 40, winPercentAfter: 55 })]), 0)
    expect(facts.winPercentLost).toBe(0)
  })

  it('throws on an out-of-range ply', () => {
    expect(() => buildMoveFacts(game([makeMove()]), 3)).toThrow(RangeError)
  })
})

describe('buildGameFacts', () => {
  const moves: AnalyzedMove[] = [
    makeMove({
      ply: 0,
      color: 'white',
      classification: 'best',
      winPercentBefore: 50,
      winPercentAfter: 50
    }),
    makeMove({
      ply: 1,
      color: 'black',
      classification: 'inaccuracy',
      winPercentBefore: 50,
      winPercentAfter: 42
    }),
    makeMove({
      ply: 2,
      color: 'white',
      classification: 'blunder',
      winPercentBefore: 60,
      winPercentAfter: 20
    }),
    makeMove({
      ply: 3,
      color: 'black',
      classification: 'mistake',
      winPercentBefore: 55,
      winPercentAfter: 40
    })
  ]

  it('extracts player/opening headers, falling back sensibly when absent', () => {
    const facts = buildGameFacts(
      game(moves, {
        White: 'Magnus',
        Black: 'Hikaru',
        WhiteElo: '2850',
        Result: '1-0',
        Opening: 'Italian Game',
        ECO: 'C50'
      })
    )
    expect(facts.white).toBe('Magnus')
    expect(facts.black).toBe('Hikaru')
    expect(facts.whiteElo).toBe('2850')
    expect(facts.blackElo).toBeUndefined()
    expect(facts.result).toBe('1-0')
    expect(facts.opening).toBe('Italian Game')
    expect(facts.eco).toBe('C50')
    expect(facts.totalPlies).toBe(4)
  })

  it('defaults names and result when headers are empty', () => {
    const facts = buildGameFacts(game(moves))
    expect(facts.white).toBe('White')
    expect(facts.black).toBe('Black')
    expect(facts.result).toBe('*')
    expect(facts.opening).toBeUndefined()
  })

  it('counts classifications per side', () => {
    const facts = buildGameFacts(game(moves))
    expect(facts.classificationCounts.white).toEqual({ best: 1, blunder: 1 })
    expect(facts.classificationCounts.black).toEqual({ inaccuracy: 1, mistake: 1 })
  })

  it('ranks critical moments by win% lost and excludes clean moves', () => {
    const facts = buildGameFacts(game(moves))
    expect(facts.criticalMoments.map((m) => m.classification)).toEqual([
      'blunder', // lost 40
      'mistake', // lost 15
      'inaccuracy' // lost 8
    ])
    expect(facts.criticalMoments.some((m) => m.classification === 'best')).toBe(false)
  })

  it('caps critical moments at COACH_FACTS.maxCriticalMoments', () => {
    const many: AnalyzedMove[] = Array.from({ length: 10 }, (_, i) =>
      makeMove({
        ply: i,
        classification: 'mistake' as MoveClassification,
        winPercentBefore: 60,
        winPercentAfter: 60 - i
      })
    )
    const facts = buildGameFacts(game(many))
    expect(facts.criticalMoments).toHaveLength(COACH_FACTS.maxCriticalMoments)
  })
})
