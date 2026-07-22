/**
 * Accuracy scoring.
 *
 * Per-move accuracy maps how much win% a player gave up on a move to a 0..100
 * score via Lichess' published exponential. Game accuracy per color blends a
 * volatility-weighted mean with a harmonic mean, so a single catastrophic blunder
 * is penalized without being able to be "averaged away" by many quiet moves.
 */

/** Accuracy curve constants (Lichess' published values). */
const ACC_A = 103.1668
const ACC_B = -0.04354
const ACC_C = -3.1669

/**
 * Accuracy for a single move given the win% (for the moving player) before and
 * after the move. A move that loses no win% scores ~100; large drops decay fast.
 */
export function moveAccuracy(winPercentBefore: number, winPercentAfter: number): number {
  const winLoss = Math.max(0, winPercentBefore - winPercentAfter)
  const raw = ACC_A * Math.exp(ACC_B * winLoss) + ACC_C
  return clamp(raw, 0, 100)
}

/** Standard deviation of a numeric sample (population form). */
function stdev(values: readonly number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/** Harmonic mean, guarding against zero/negative entries. */
function harmonicMean(values: readonly number[]): number {
  if (values.length === 0) return 0
  const denom = values.reduce((a, b) => a + 1 / Math.max(b, 1e-6), 0)
  return values.length / denom
}

/** Weighted arithmetic mean; falls back to a plain mean if all weights are ~0. */
function weightedMean(values: readonly number[], weights: readonly number[]): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight <= 1e-9) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  }
  const weighted = values.reduce((acc, v, i) => acc + v * (weights[i] ?? 0), 0)
  return weighted / totalWeight
}

/**
 * Combine one player's per-move accuracies into a single game accuracy.
 *
 * Each move is weighted by the local volatility of the position (the stdev of
 * win% in a sliding window around it), so mistakes in sharp positions count for
 * more. The volatility-weighted mean is then averaged with the harmonic mean of
 * the same accuracies to keep blunders from washing out.
 *
 * @param accuracies  per-move accuracy values for a single color, in order
 * @param winPercents the same player's win% at each of those moves, in order
 */
export function gameAccuracyForColor(
  accuracies: readonly number[],
  winPercents: readonly number[]
): number {
  if (accuracies.length === 0) return 0

  const windowRadius = 2
  const weights = accuracies.map((_, i) => {
    const start = Math.max(0, i - windowRadius)
    const end = Math.min(winPercents.length, i + windowRadius + 1)
    // Weight is volatility (stdev) of the surrounding win% window, floored so a
    // perfectly flat game still yields a defined, non-zero weighting.
    return Math.max(0.5, stdev(winPercents.slice(start, end)))
  })

  const volatilityWeighted = weightedMean(accuracies, weights)
  const harmonic = harmonicMean(accuracies)
  return clamp((volatilityWeighted + harmonic) / 2, 0, 100)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
