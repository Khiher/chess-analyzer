import { describe, it, expect } from 'vitest'
import { winPercentFromCp, winPercentForColor, scoreToCentipawns } from '../winprob'

describe('winPercentFromCp', () => {
  it('is 50% at a dead-equal evaluation', () => {
    expect(winPercentFromCp(0)).toBeCloseTo(50, 5)
  })

  it('is symmetric around zero', () => {
    expect(winPercentFromCp(300) + winPercentFromCp(-300)).toBeCloseTo(100, 5)
  })

  it('increases monotonically with advantage', () => {
    expect(winPercentFromCp(100)).toBeGreaterThan(winPercentFromCp(0))
    expect(winPercentFromCp(500)).toBeGreaterThan(winPercentFromCp(100))
  })

  it('stays within [0, 100]', () => {
    expect(winPercentFromCp(100000)).toBeLessThanOrEqual(100)
    expect(winPercentFromCp(-100000)).toBeGreaterThanOrEqual(0)
  })
})

describe('scoreToCentipawns', () => {
  it('passes centipawn scores through unchanged', () => {
    expect(scoreToCentipawns({ type: 'cp', value: 250 })).toBe(250)
  })

  it('maps a White mate to a large positive value', () => {
    expect(scoreToCentipawns({ type: 'mate', value: 3 })).toBeGreaterThan(9000)
  })

  it('maps a Black mate to a large negative value', () => {
    expect(scoreToCentipawns({ type: 'mate', value: -3 })).toBeLessThan(-9000)
  })

  it('rates a faster mate at least as high as a slower one', () => {
    expect(scoreToCentipawns({ type: 'mate', value: 1 })).toBeGreaterThanOrEqual(
      scoreToCentipawns({ type: 'mate', value: 8 })
    )
  })
})

describe('winPercentForColor', () => {
  it('flips perspective for Black', () => {
    const score = { type: 'cp', value: 300 } as const
    expect(winPercentForColor(score, 'white')).toBeCloseTo(
      100 - winPercentForColor(score, 'black'),
      5
    )
  })
})
