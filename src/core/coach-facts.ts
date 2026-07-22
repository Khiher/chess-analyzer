import { Chess } from 'chess.js'
import type { AnalyzedMove, Color, GameAccuracy, MoveClassification, Score } from './types'

/**
 * Coaching facts layer — the deterministic seam between engine analysis and the
 * natural-language coach.
 *
 * It distills the raw {@link AnalyzedMove} list into a compact, JSON-friendly
 * structure the coach LLM is allowed to see. The model narrates ONLY these
 * facts; it never sees a board or reasons about the position itself. Keeping the
 * distillation here (framework-free, unit-tested) is what stops a small local
 * model from inventing chess: every number and every line it can cite is
 * precomputed and correct.
 */

/** Tunable shaping constants, in one place so the facts stay compact. */
export const COACH_FACTS = {
  /** Max plies of any principal variation rendered into SAN. */
  maxLinePlies: 6,
  /** Max critical moments surfaced in the game summary. */
  maxCriticalMoments: 6
} as const

/** Classifications that count as "something went wrong", worst-first friendly. */
const CRITICAL: ReadonlySet<MoveClassification> = new Set([
  'inaccuracy',
  'mistake',
  'miss',
  'blunder'
])

/** The minimal analyzed-game shape the facts layer needs (a `GameReview`). */
export interface AnalyzedGame {
  readonly headers: Readonly<Record<string, string>>
  readonly moves: readonly AnalyzedMove[]
  readonly accuracy: GameAccuracy
}

/** Coach-ready facts about a single half-move. */
export interface MoveFacts {
  readonly ply: number
  readonly moveNumber: number
  readonly color: Color
  /** Move actually played, in SAN. */
  readonly san: string
  readonly classification: MoveClassification
  readonly winPercentBefore: number
  readonly winPercentAfter: number
  /** Win% the mover gave up on this move (>= 0), precomputed so the model can't mis-subtract. */
  readonly winPercentLost: number
  readonly evalBefore: Score
  readonly evalAfter: Score
  /** Engine's preferred move in SAN, or null when it matched the move played / is unavailable. */
  readonly bestMoveSan: string | null
  /** Engine's recommended line from before the move, in SAN (up to {@link COACH_FACTS.maxLinePlies}). */
  readonly bestLineSan: readonly string[]
  /** Expected continuation after the move played, in SAN. */
  readonly playedLineSan: readonly string[]
}

/** Coach-ready facts about a whole game. */
export interface GameFacts {
  readonly white: string
  readonly black: string
  readonly whiteElo?: string
  readonly blackElo?: string
  readonly result: string
  readonly opening?: string
  readonly eco?: string
  readonly accuracy: GameAccuracy
  readonly totalPlies: number
  /** Count of each classification, per side. */
  readonly classificationCounts: Record<Color, Partial<Record<MoveClassification, number>>>
  /** Worst moments of the game, ranked by win% lost, capped for compactness. */
  readonly criticalMoments: readonly MoveFacts[]
}

/** Build the game-level summary facts. */
export function buildGameFacts(game: AnalyzedGame): GameFacts {
  const h = game.headers
  const criticalMoments = game.moves
    .map((_, i) => buildMoveFacts(game, i))
    .filter((m) => CRITICAL.has(m.classification))
    .sort((a, b) => b.winPercentLost - a.winPercentLost)
    .slice(0, COACH_FACTS.maxCriticalMoments)

  return {
    white: h.White ?? 'White',
    black: h.Black ?? 'Black',
    ...(h.WhiteElo ? { whiteElo: h.WhiteElo } : {}),
    ...(h.BlackElo ? { blackElo: h.BlackElo } : {}),
    result: h.Result ?? '*',
    ...(h.Opening ? { opening: h.Opening } : {}),
    ...(h.ECO ? { eco: h.ECO } : {}),
    accuracy: game.accuracy,
    totalPlies: game.moves.length,
    classificationCounts: countClassifications(game.moves),
    criticalMoments
  }
}

/** Build the coach-ready facts for one half-move (by 0-based ply / array index). */
export function buildMoveFacts(game: AnalyzedGame, ply: number): MoveFacts {
  const move = game.moves[ply]
  if (!move) throw new RangeError(`No analyzed move at ply ${ply}`)

  const bestLineSan = uciLineToSan(move.fenBefore, move.bestLineUci)
  const playedLineSan = uciLineToSan(move.fenAfter, move.playedLineUci)
  const bestMoveSan =
    bestLineSan[0] ??
    (move.bestMoveUci ? (uciLineToSan(move.fenBefore, [move.bestMoveUci])[0] ?? null) : null)

  return {
    ply: move.ply,
    moveNumber: move.moveNumber,
    color: move.color,
    san: move.san,
    classification: move.classification,
    winPercentBefore: move.winPercentBefore,
    winPercentAfter: move.winPercentAfter,
    winPercentLost: Math.max(0, move.winPercentBefore - move.winPercentAfter),
    evalBefore: move.scoreBefore,
    evalAfter: move.scoreAfter,
    bestMoveSan,
    bestLineSan,
    playedLineSan
  }
}

function countClassifications(
  moves: readonly AnalyzedMove[]
): Record<Color, Partial<Record<MoveClassification, number>>> {
  const counts: Record<Color, Partial<Record<MoveClassification, number>>> = {
    white: {},
    black: {}
  }
  for (const m of moves) {
    const side = counts[m.color]
    side[m.classification] = (side[m.classification] ?? 0) + 1
  }
  return counts
}

/**
 * Replay a UCI line from a FEN and return it in SAN, truncated to
 * {@link COACH_FACTS.maxLinePlies}. Stops cleanly at the first move chess.js
 * rejects rather than throwing, so a malformed PV never breaks fact-building.
 */
function uciLineToSan(fen: string, uciMoves: readonly string[]): string[] {
  const chess = new Chess(fen)
  const san: string[] = []
  for (const uci of uciMoves.slice(0, COACH_FACTS.maxLinePlies)) {
    const parsed = parseUci(uci)
    if (!parsed) break
    try {
      san.push(chess.move(parsed).san)
    } catch {
      break
    }
  }
  return san
}

/** Parse a UCI move string ("g1f3", "e7e8q") into a chess.js move object. */
function parseUci(uci: string): { from: string; to: string; promotion?: string } | null {
  if (uci.length < 4) return null
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined
  return promotion ? { from, to, promotion } : { from, to }
}
