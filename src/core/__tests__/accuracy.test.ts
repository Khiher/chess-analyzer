import { describe, it, expect } from 'vitest'
import { moveAccuracy, gameAccuracyForColor, clamp } from '../accuracy'

describe('moveAccuracy', () => {
  it('scores a move that loses no win% near 100', () => {
    expect(moveAccuracy(60, 60)).toBeCloseTo(100, 0)
  })

  it('never rewards a gain in win% above the max', () => {
    expect(moveAccuracy(40, 90)).toBeLessThanOrEqual(100)
  })

  it('decreases as more win% is lost', () => {
    expect(moveAccuracy(70, 40)).toBeLessThan(moveAccuracy(70, 60))
  })

  it('scores a catastrophic blunder low', () => {
    expect(moveAccuracy(90, 10)).toBeLessThan(20)
  })

  it('stays within [0, 100]', () => {
    expect(moveAccuracy(100, 0)).toBeGreaterThanOrEqual(0)
    expect(moveAccuracy(0, 100)).toBeLessThanOrEqual(100)
  })
})

describe('gameAccuracyForColor', () => {
  it('returns 0 for an empty game', () => {
    expect(gameAccuracyForColor([], [])).toBe(0)
  })

  it('returns ~100 for a flawless game', () => {
    const acc = [100, 100, 100, 100]
    const wp = [50, 52, 51, 53]
    expect(gameAccuracyForColor(acc, wp)).toBeCloseTo(100, 0)
  })

  it('penalizes a single blunder without averaging it away', () => {
    const acc = [100, 100, 100, 5, 100, 100]
    const wp = [50, 52, 51, 12, 14, 13]
    const score = gameAccuracyForColor(acc, wp)
    expect(score).toBeLessThan(90)
    expect(score).toBeGreaterThan(0)
  })
})

describe('clamp', () => {
  it('bounds values to the range', () => {
    expect(clamp(-5, 0, 100)).toBe(0)
    expect(clamp(150, 0, 100)).toBe(100)
    expect(clamp(42, 0, 100)).toBe(42)
  })
})
