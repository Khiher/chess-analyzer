import type { Score } from '@core/types'
import { formatScore, whiteWinPercent } from '../lib/review'

/**
 * A vertical evaluation bar (White at the bottom). The white segment's height is
 * White's win% for the position on the board; the numeric eval sits on the
 * leading side, mirroring the Chess.com / Lichess review layout.
 */
export function EvalBar({ score }: { score: Score | null }): React.JSX.Element {
  const whitePct = score ? whiteWinPercent(score) : 50
  const label = score ? formatScore(score) : '–'
  const whiteLeads = whitePct >= 50

  return (
    <div className="eval-bar" title={`White win chance: ${whitePct.toFixed(0)}%`}>
      <div className="eval-bar-white" style={{ height: `${whitePct}%` }} />
      <span className={`eval-bar-label ${whiteLeads ? 'lead-white' : 'lead-black'}`}>{label}</span>
    </div>
  )
}
