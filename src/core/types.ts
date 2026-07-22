/**
 * Core domain types shared across the main process, renderer, and analysis logic.
 * This module is framework-free (no Electron, no engine, no React) so it can be
 * unit-tested in isolation and imported anywhere.
 */

export type Color = 'white' | 'black'

/**
 * An engine evaluation of a position, always normalized to White's perspective:
 *  - `cp` positive  => White is better (centipawns)
 *  - `mate` positive => White mates in N; negative => Black mates in N
 */
export type Score =
  | { readonly type: 'cp'; readonly value: number }
  | { readonly type: 'mate'; readonly value: number }

/** One half-move (ply) of a game, expanded from a PGN. */
export interface GamePosition {
  /** 0-based ply index (0 = position after White's first move). */
  readonly ply: number
  /** Full-move number as shown in notation (1, 1, 2, 2, ...). */
  readonly moveNumber: number
  /** Side that made the move leading into this position. */
  readonly color: Color
  /** Move in Standard Algebraic Notation, e.g. "Nf3". */
  readonly san: string
  /** Origin square, e.g. "g1". */
  readonly from: string
  /** Destination square, e.g. "f3". */
  readonly to: string
  /** FEN of the position BEFORE this move was played. */
  readonly fenBefore: string
  /** FEN of the position AFTER this move was played. */
  readonly fenAfter: string
}

/** A parsed game: metadata plus the expanded ply list. */
export interface ParsedGame {
  readonly headers: Readonly<Record<string, string>>
  readonly positions: readonly GamePosition[]
}

/** Move-quality classification, ordered loosely best -> worst. */
export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder'

/** Raw engine analysis of a single position. */
export interface PositionEval {
  readonly fen: string
  /** Search depth reached. */
  readonly depth: number
  /** Best score found, White's perspective. */
  readonly score: Score
  /** Principal variation (best line) in UCI move strings, if available. */
  readonly pv: readonly string[]
  /** Best move in UCI notation, e.g. "g1f3". */
  readonly bestMove: string | null
}

/** Fully analyzed half-move: the played move plus its evaluation and verdict. */
export interface AnalyzedMove extends GamePosition {
  /** Win% for the player who moved, BEFORE their move (0..100). */
  readonly winPercentBefore: number
  /** Win% for the player who moved, AFTER their move (0..100). */
  readonly winPercentAfter: number
  /** Accuracy attributed to this single move (0..100). */
  readonly accuracy: number
  readonly classification: MoveClassification
  /** Engine's preferred move in this position (UCI), if different from played. */
  readonly bestMoveUci: string | null
  /** Evaluation of the position after the played move, White's perspective. */
  readonly scoreAfter: Score
}

/** Per-player accuracy summary for a whole game. */
export interface GameAccuracy {
  readonly white: number
  readonly black: number
}
