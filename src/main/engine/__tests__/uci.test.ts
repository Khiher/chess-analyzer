import { describe, it, expect } from 'vitest'
import { parseInfoLine } from '../uci'

describe('parseInfoLine', () => {
  it('parses a centipawn score from White to move', () => {
    const r = parseInfoLine('info depth 20 score cp 34 pv e2e4 e7e5', 'white')
    expect(r?.score).toEqual({ type: 'cp', value: 34 })
    expect(r?.depth).toBe(20)
    expect(r?.pv).toEqual(['e2e4', 'e7e5'])
  })

  it('flips the sign of a Black-to-move score to White perspective', () => {
    const r = parseInfoLine('info depth 18 score cp 50 pv d7d5', 'black')
    expect(r?.score).toEqual({ type: 'cp', value: -50 })
  })

  it('parses a mate score and normalizes perspective', () => {
    const r = parseInfoLine('info depth 30 score mate 3 pv f3f7', 'black')
    expect(r?.score).toEqual({ type: 'mate', value: -3 })
  })

  it('returns null for lines without a score', () => {
    expect(parseInfoLine('info depth 1 seldepth 2 nodes 20', 'white')).toBeNull()
  })
})
