import { describe, it, expect } from 'vitest'
import type { AnalyzedMove } from '@core/types'
import {
  CLASSIFICATION_ORDER,
  classificationCounts,
  classificationView,
  formatScore,
  uciToSquares,
  whiteWinPercent
} from '../review'

describe('formatScore', () => {
  it('formats centipawns as signed pawns to one decimal', () => {
    expect(formatScore({ type: 'cp', value: 120 })).toBe('+1.2')
    expect(formatScore({ type: 'cp', value: -30 })).toBe('-0.3')
    expect(formatScore({ type: 'cp', value: 0 })).toBe('0.0')
  })

  it('formats mates from both perspectives', () => {
    expect(formatScore({ type: 'mate', value: 5 })).toBe('M5')
    expect(formatScore({ type: 'mate', value: -3 })).toBe('-M3')
  })
})

describe('whiteWinPercent', () => {
  it('is 50 at a dead-equal position', () => {
    expect(whiteWinPercent({ type: 'cp', value: 0 })).toBeCloseTo(50, 5)
  })

  it('rises above 50 when White is better and mirrors for Black', () => {
    const plus = whiteWinPercent({ type: 'cp', value: 300 })
    const minus = whiteWinPercent({ type: 'cp', value: -300 })
    expect(plus).toBeGreaterThan(50)
    expect(minus).toBeLessThan(50)
    expect(plus + minus).toBeCloseTo(100, 5)
  })
})

describe('uciToSquares', () => {
  it('splits a plain move into from/to', () => {
    expect(uciToSquares('e2e4')).toEqual({ from: 'e2', to: 'e4' })
  })

  it('ignores the promotion suffix', () => {
    expect(uciToSquares('e7e8q')).toEqual({ from: 'e7', to: 'e8' })
  })

  it('returns null for missing or malformed input', () => {
    expect(uciToSquares(null)).toBeNull()
    expect(uciToSquares('e2')).toBeNull()
    expect(uciToSquares('z9z9')).toBeNull()
  })
})

describe('classificationView', () => {
  it('has a view for every classification', () => {
    for (const c of CLASSIFICATION_ORDER) {
      const view = classificationView(c)
      expect(view.symbol.length).toBeGreaterThan(0)
      expect(view.label.length).toBeGreaterThan(0)
    }
  })
})

describe('classificationCounts', () => {
  const move = (
    color: 'white' | 'black',
    classification: AnalyzedMove['classification']
  ): AnalyzedMove => ({ color, classification }) as AnalyzedMove

  it('tallies per color and leaves absent classifications at zero', () => {
    const moves = [
      move('white', 'best'),
      move('white', 'blunder'),
      move('black', 'best'),
      move('white', 'best')
    ]
    const white = classificationCounts(moves, 'white')
    const black = classificationCounts(moves, 'black')
    expect(white.best).toBe(2)
    expect(white.blunder).toBe(1)
    expect(white.good).toBe(0)
    expect(black.best).toBe(1)
    expect(black.blunder).toBe(0)
  })
})
