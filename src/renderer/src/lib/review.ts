/**
 * Presentation helpers for the game-review UI.
 *
 * These are pure, framework-free view mappings (no React, no engine) so they can
 * be unit-tested directly. Chess/analysis math still lives in `@core`; this
 * module only formats those results for display.
 */

import { winPercentForColor } from '@core/winprob'
import type { AnalyzedMove, Color, MoveClassification, Score } from '@core/types'

/** How a classification should read in the UI. */
export interface ClassificationView {
  /** Short glyph shown next to the move (e.g. "!!", "?", "★"). */
  readonly symbol: string
  /** Human-readable name, capitalized. */
  readonly label: string
  /** Coarse tone used for grouping/coloring summaries. */
  readonly tone: 'good' | 'neutral' | 'inaccuracy' | 'bad'
}

const CLASSIFICATION_VIEWS: Record<MoveClassification, ClassificationView> = {
  brilliant: { symbol: '!!', label: 'Brilliant', tone: 'good' },
  great: { symbol: '!', label: 'Great', tone: 'good' },
  best: { symbol: '★', label: 'Best', tone: 'good' },
  excellent: { symbol: '✔', label: 'Excellent', tone: 'good' },
  good: { symbol: '✓', label: 'Good', tone: 'neutral' },
  book: { symbol: '📖', label: 'Book', tone: 'neutral' },
  inaccuracy: { symbol: '?!', label: 'Inaccuracy', tone: 'inaccuracy' },
  mistake: { symbol: '?', label: 'Mistake', tone: 'bad' },
  miss: { symbol: '⤫', label: 'Miss', tone: 'bad' },
  blunder: { symbol: '??', label: 'Blunder', tone: 'bad' }
}

/** All classifications in display order (best → worst), for legends/summaries. */
export const CLASSIFICATION_ORDER: readonly MoveClassification[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'book',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder'
]

/** View metadata for a classification. */
export function classificationView(c: MoveClassification): ClassificationView {
  return CLASSIFICATION_VIEWS[c]
}

/** Win% in [0, 100] for White, from a White-perspective {@link Score}. */
export function whiteWinPercent(score: Score): number {
  return winPercentForColor(score, 'white')
}

/**
 * Format a White-perspective {@link Score} as a compact eval label:
 *   +1.2, -0.3, 0.0, M5 (White mates in 5), -M3 (Black mates in 3).
 */
export function formatScore(score: Score): string {
  if (score.type === 'mate') {
    return score.value >= 0 ? `M${score.value}` : `-M${Math.abs(score.value)}`
  }
  const pawns = score.value / 100
  const sign = pawns > 0 ? '+' : ''
  return `${sign}${pawns.toFixed(1)}`
}

const SQUARE = /^[a-h][1-8]$/

/** Split a UCI move ("e2e4", "e7e8q") into its from/to squares, or null. */
export function uciToSquares(uci: string | null): { from: string; to: string } | null {
  if (!uci || uci.length < 4) return null
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  if (!SQUARE.test(from) || !SQUARE.test(to)) return null
  return { from, to }
}

/** Count each classification for one color across a game's analyzed moves. */
export function classificationCounts(
  moves: readonly AnalyzedMove[],
  color: Color
): Record<MoveClassification, number> {
  const counts = Object.fromEntries(CLASSIFICATION_ORDER.map((c) => [c, 0])) as Record<
    MoveClassification,
    number
  >
  for (const move of moves) {
    if (move.color === color) counts[move.classification] += 1
  }
  return counts
}
