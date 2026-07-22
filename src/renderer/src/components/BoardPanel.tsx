import { Chessboard, type Arrow } from 'react-chessboard'
import type { Color } from '@core/types'
import { uciToSquares } from '../lib/review'

interface BoardPanelProps {
  /** FEN of the position to display. */
  readonly fen: string
  readonly orientation: Color
  /** Squares of the move that led to this position, highlighted; null at start. */
  readonly lastMove: { from: string; to: string } | null
  /** Engine's preferred move (UCI) for the position before the played move. */
  readonly bestMoveUci: string | null
  /** Whether to draw the best-move suggestion arrow (only when the move was weak). */
  readonly showBestArrow: boolean
}

const LAST_MOVE_STYLE: React.CSSProperties = { background: 'rgba(122, 162, 247, 0.32)' }
const BEST_ARROW_COLOR = '#6bcf6b'

/**
 * The chessboard. It is purely presentational: driven by a FEN we already
 * computed in the pipeline, with an optional last-move highlight and best-move
 * arrow. No chess-rules or engine logic runs here — the renderer stays sandboxed.
 */
export function BoardPanel({
  fen,
  orientation,
  lastMove,
  bestMoveUci,
  showBestArrow
}: BoardPanelProps): React.JSX.Element {
  const squareStyles: Record<string, React.CSSProperties> = {}
  if (lastMove) {
    squareStyles[lastMove.from] = LAST_MOVE_STYLE
    squareStyles[lastMove.to] = LAST_MOVE_STYLE
  }

  const best = showBestArrow ? uciToSquares(bestMoveUci) : null
  const arrows: Arrow[] = best
    ? [{ startSquare: best.from, endSquare: best.to, color: BEST_ARROW_COLOR }]
    : []

  return (
    <div className="board">
      <Chessboard
        options={{
          id: 'review-board',
          position: fen,
          boardOrientation: orientation,
          allowDragging: false,
          showAnimations: true,
          animationDurationInMs: 150,
          squareStyles,
          arrows
        }}
      />
    </div>
  )
}
