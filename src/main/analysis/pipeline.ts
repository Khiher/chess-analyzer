import {
  parsePgn,
  winPercentForColor,
  moveAccuracy,
  gameAccuracyForColor,
  classifyMove,
  scoreToCentipawns
} from '@core/index'
import type { AnalyzedMove, GameAccuracy, ParsedGame, PositionEval } from '@core/types'
import type { EnginePool } from '../engine/engine-pool'

/**
 * Orchestrates a full game review: PGN -> per-ply FENs -> engine evals ->
 * win%/accuracy/classification -> per-move verdicts + game accuracy.
 *
 * This module is pure orchestration; all chess math lives in `@core` and all
 * engine I/O lives in the engine pool, so the pipeline itself stays testable by
 * injecting a fake pool.
 */

export interface AnalyzeGameOptions {
  readonly depth: number
  readonly onProgress?: (completed: number, total: number) => void
}

export interface GameReview {
  readonly game: ParsedGame
  readonly moves: readonly AnalyzedMove[]
  readonly accuracy: GameAccuracy
}

export async function analyzeGame(
  pgn: string,
  pool: EnginePool,
  { depth, onProgress }: AnalyzeGameOptions
): Promise<GameReview> {
  const game = parsePgn(pgn)
  const { positions } = game

  // Evaluate the position BEFORE each move plus the final position, so every
  // move has a "before" and "after" eval (the after of move N is the before of
  // move N+1).
  const fens = positions.map((p) => p.fenBefore)
  const lastFen = positions.at(-1)?.fenAfter
  if (lastFen) fens.push(lastFen)

  const evals = await pool.analyzePositions(fens, depth, onProgress)

  const moves: AnalyzedMove[] = positions.map((pos, i) => {
    const evalBefore = evals[i]
    const evalAfter = evals[i + 1]
    return buildAnalyzedMove(pos, evalBefore, evalAfter)
  })

  return { game, moves, accuracy: computeGameAccuracy(moves) }
}

function buildAnalyzedMove(
  pos: ParsedGame['positions'][number],
  evalBefore: PositionEval | undefined,
  evalAfter: PositionEval | undefined
): AnalyzedMove {
  const scoreBefore = evalBefore?.score ?? { type: 'cp', value: 0 }
  const scoreAfter = evalAfter?.score ?? scoreBefore

  const winPercentBefore = winPercentForColor(scoreBefore, pos.color)
  const winPercentAfter = winPercentForColor(scoreAfter, pos.color)
  const accuracy = moveAccuracy(winPercentBefore, winPercentAfter)

  const bestMoveUci = evalBefore?.bestMove ?? null
  const playedUci = `${pos.from}${pos.to}`
  const isBestMove = bestMoveUci !== null && bestMoveUci.startsWith(playedUci)

  const classification = classifyMove({ winPercentBefore, winPercentAfter, isBestMove })

  return {
    ...pos,
    winPercentBefore,
    winPercentAfter,
    accuracy,
    classification,
    bestMoveUci,
    bestLineUci: evalBefore?.pv ?? [],
    playedLineUci: evalAfter?.pv ?? [],
    scoreBefore,
    scoreAfter
  }
}

function computeGameAccuracy(moves: readonly AnalyzedMove[]): GameAccuracy {
  const forColor = (color: 'white' | 'black'): number => {
    const own = moves.filter((m) => m.color === color)
    const accs = own.map((m) => m.accuracy)
    const winPercents = own.map((m) => m.winPercentAfter)
    return gameAccuracyForColor(accs, winPercents)
  }
  return { white: forColor('white'), black: forColor('black') }
}

/** Re-exported for callers that only need the raw centipawn view of a score. */
export { scoreToCentipawns }
