import { describe, it, expect } from 'vitest'
import { parsePgn, plyCount } from '../pgn'

const SCHOLARS_MATE = `[Event "Test"]
[Site "?"]
[Date "2026.01.01"]
[Round "1"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`

describe('parsePgn', () => {
  it('extracts headers', () => {
    const game = parsePgn(SCHOLARS_MATE)
    expect(game.headers.White).toBe('Alice')
    expect(game.headers.Black).toBe('Bob')
    expect(game.headers.Result).toBe('1-0')
  })

  it('expands every half-move', () => {
    const game = parsePgn(SCHOLARS_MATE)
    expect(plyCount(game)).toBe(7)
  })

  it('records SAN, color, and move numbers in order', () => {
    const game = parsePgn(SCHOLARS_MATE)
    const first = game.positions[0]
    const last = game.positions.at(-1)
    expect(first?.san).toBe('e4')
    expect(first?.color).toBe('white')
    expect(first?.moveNumber).toBe(1)
    expect(last?.san).toBe('Qxf7#')
    expect(last?.color).toBe('white')
    expect(last?.moveNumber).toBe(4)
  })

  it('provides a valid FEN before and after each move', () => {
    const game = parsePgn(SCHOLARS_MATE)
    const first = game.positions[0]
    expect(first?.fenBefore).toContain('rnbqkbnr')
    expect(first?.fenAfter).not.toBe(first?.fenBefore)
  })

  it('throws on malformed PGN', () => {
    expect(() => parsePgn('this is not a pgn 1. Zz9')).toThrow()
  })
})
