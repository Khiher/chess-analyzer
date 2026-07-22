import type { Score } from './types'

/**
 * Win-probability model.
 *
 * We map a centipawn evaluation to an expected-score / "win%" in [0, 100] using
 * the logistic curve popularized by Lichess. Chess.com's exact curve is
 * proprietary; this is a well-documented, well-behaved stand-in and every tunable
 * constant lives here so it can be recalibrated later without touching callers.
 */

/** Logistic steepness constant (Lichess' published value). */
export const WIN_PROB_K = 0.00368208

/** Centipawn-equivalent assigned to a forced mate, so mates dominate the curve. */
const MATE_CP_EQUIVALENT = 10000

/**
 * Convert a raw {@link Score} (White's perspective) to a centipawn value, with
 * mates collapsed to a large signed magnitude that scales with distance-to-mate
 * (mate-in-1 is "better" than mate-in-8).
 */
export function scoreToCentipawns(score: Score): number {
  if (score.type === 'cp') return score.value
  if (score.value === 0) return score.value >= 0 ? MATE_CP_EQUIVALENT : -MATE_CP_EQUIVALENT
  const sign = score.value > 0 ? 1 : -1
  // Shorter mates are worth (slightly) more; clamp the bonus so it never flips sign.
  return sign * (MATE_CP_EQUIVALENT - Math.min(Math.abs(score.value), 100) * 10)
}

/**
 * Win% in [0, 100] for the side to move, given that side's centipawn advantage.
 * 0 cp => 50%. Positive cp trends toward 100, negative toward 0.
 */
export function winPercentFromCp(cp: number): number {
  const clamped = Math.max(-MATE_CP_EQUIVALENT, Math.min(MATE_CP_EQUIVALENT, cp))
  return 50 + 50 * (2 / (1 + Math.exp(-WIN_PROB_K * clamped)) - 1)
}

/**
 * Win% in [0, 100] for the given player, from a White-perspective {@link Score}.
 * For Black we simply flip the sign of the evaluation before mapping.
 */
export function winPercentForColor(score: Score, color: 'white' | 'black'): number {
  const cpWhite = scoreToCentipawns(score)
  const cp = color === 'white' ? cpWhite : -cpWhite
  return winPercentFromCp(cp)
}
