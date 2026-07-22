import { Chess } from 'chess.js'
import type { Color, GamePosition, ParsedGame } from './types'

/**
 * PGN parsing.
 *
 * Turns a PGN string into a flat, engine-ready list of half-moves, each carrying
 * the FEN before and after the move. All chess-rules logic is delegated to
 * chess.js; this module only shapes its output into our domain types.
 */

/** Parse a single-game PGN into headers + an expanded ply list. */
export function parsePgn(pgn: string): ParsedGame {
  const chess = new Chess()
  // chess.js throws on malformed PGN; let the caller decide how to surface it.
  chess.loadPgn(pgn)

  const headers = chess.header() as Record<string, string>
  const verbose = chess.history({ verbose: true })

  const positions: GamePosition[] = verbose.map((move, index) => {
    const color: Color = move.color === 'w' ? 'white' : 'black'
    return {
      ply: index,
      moveNumber: Math.floor(index / 2) + 1,
      color,
      san: move.san,
      from: move.from,
      to: move.to,
      fenBefore: move.before,
      fenAfter: move.after
    }
  })

  return { headers, positions }
}

/** Number of half-moves in a parsed game. */
export function plyCount(game: ParsedGame): number {
  return game.positions.length
}
