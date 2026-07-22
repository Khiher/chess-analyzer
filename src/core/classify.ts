import type { MoveClassification } from './types'

/**
 * Move classification.
 *
 * The deterministic tiers (best/excellent/good/inaccuracy/mistake/blunder) are
 * driven purely by how much win% a move gave up. The "special" tiers require
 * extra signals the engine eval alone cannot provide:
 *   - `book`      : the position is still in known opening theory
 *   - `brilliant` : a sound sacrifice (needs material + tactical context)
 *   - `great`     : the only move that holds an otherwise-lost/winning position
 *   - `miss`      : a large drop specifically when a win was available
 * These are supplied by the analysis pipeline via {@link ClassifyContext}; when
 * absent we fall back to the deterministic tier so classification always resolves.
 */

/** Win%-loss thresholds (for the moving player). Tunable in one place. */
export const CLASSIFICATION_THRESHOLDS = {
  /** <= this win% loss and the move matched the engine's best => 'best'. */
  best: 0,
  excellent: 2,
  good: 5,
  inaccuracy: 10,
  mistake: 20
  // anything worse than `mistake` is a blunder
} as const

export interface ClassifyContext {
  /** Win% for the mover before the move (0..100). */
  readonly winPercentBefore: number
  /** Win% for the mover after the move (0..100). */
  readonly winPercentAfter: number
  /** Did the played move match the engine's top choice? */
  readonly isBestMove: boolean
  /** Is the position still within known opening theory? */
  readonly isBook?: boolean
  /** Did the mover sacrifice material on a move that is nonetheless strong? */
  readonly isSoundSacrifice?: boolean
  /** Was this the only move that avoids a large win% collapse? */
  readonly isOnlyMove?: boolean
}

/** Deterministic tier from win% loss alone. */
export function classifyByWinLoss(winLoss: number, isBestMove: boolean): MoveClassification {
  const t = CLASSIFICATION_THRESHOLDS
  if (winLoss <= t.best) return isBestMove ? 'best' : 'excellent'
  if (winLoss <= t.excellent) return 'excellent'
  if (winLoss <= t.good) return 'good'
  if (winLoss <= t.inaccuracy) return 'inaccuracy'
  if (winLoss <= t.mistake) return 'mistake'
  return 'blunder'
}

/** Full classification, layering the special tiers over the deterministic base. */
export function classifyMove(ctx: ClassifyContext): MoveClassification {
  const winLoss = Math.max(0, ctx.winPercentBefore - ctx.winPercentAfter)
  const base = classifyByWinLoss(winLoss, ctx.isBestMove)

  if (ctx.isBook) return 'book'

  // A sound sacrifice that stays strong is brilliant.
  if (ctx.isSoundSacrifice && winLoss <= CLASSIFICATION_THRESHOLDS.good) return 'brilliant'

  // The single move that holds a critical position is "great".
  if (ctx.isOnlyMove && ctx.isBestMove) return 'great'

  // A large drop from a winning/equal position where a clear win existed is a "miss".
  if ((base === 'mistake' || base === 'blunder') && ctx.winPercentBefore >= 55) return 'miss'

  return base
}
