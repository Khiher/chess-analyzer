import { describe, it, expect } from 'vitest'
import { classifyMove, classifyByWinLoss } from '../classify'

describe('classifyByWinLoss', () => {
  it('labels a zero-loss engine move as best', () => {
    expect(classifyByWinLoss(0, true)).toBe('best')
  })

  it('labels a zero-loss non-engine move as excellent', () => {
    expect(classifyByWinLoss(0, false)).toBe('excellent')
  })

  it('escalates through the tiers as win% loss grows', () => {
    expect(classifyByWinLoss(3, false)).toBe('good')
    expect(classifyByWinLoss(8, false)).toBe('inaccuracy')
    expect(classifyByWinLoss(15, false)).toBe('mistake')
    expect(classifyByWinLoss(40, false)).toBe('blunder')
  })
})

describe('classifyMove', () => {
  it('flags book moves regardless of eval', () => {
    expect(
      classifyMove({ winPercentBefore: 50, winPercentAfter: 48, isBestMove: true, isBook: true })
    ).toBe('book')
  })

  it('flags a sound sacrifice as brilliant', () => {
    expect(
      classifyMove({
        winPercentBefore: 60,
        winPercentAfter: 58,
        isBestMove: false,
        isSoundSacrifice: true
      })
    ).toBe('brilliant')
  })

  it('flags the only saving move as great', () => {
    expect(
      classifyMove({
        winPercentBefore: 45,
        winPercentAfter: 45,
        isBestMove: true,
        isOnlyMove: true
      })
    ).toBe('great')
  })

  it('flags a blunder from a winning position as a miss', () => {
    expect(classifyMove({ winPercentBefore: 80, winPercentAfter: 40, isBestMove: false })).toBe(
      'miss'
    )
  })

  it('falls back to the deterministic tier with no special signals', () => {
    expect(classifyMove({ winPercentBefore: 50, winPercentAfter: 42, isBestMove: false })).toBe(
      'inaccuracy'
    )
  })
})
