import type { AnalyzedMove } from '@core/types'
import { classificationView } from '../lib/review'

interface MoveListProps {
  readonly moves: readonly AnalyzedMove[]
  /** Currently selected ply index into `moves`; -1 means the start position. */
  readonly currentPly: number
  readonly onSelect: (ply: number) => void
}

interface Cell {
  readonly move: AnalyzedMove
  readonly ply: number
}

/** A scrollable, clickable move list grouped into full moves (White | Black). */
export function MoveList({ moves, currentPly, onSelect }: MoveListProps): React.JSX.Element {
  const rows: { number: number; white?: Cell; black?: Cell }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i]
    if (!white) break
    const black = moves[i + 1]
    rows.push({
      number: white.moveNumber,
      white: { move: white, ply: i },
      ...(black ? { black: { move: black, ply: i + 1 } } : {})
    })
  }

  return (
    <div className="move-list" role="list">
      {rows.map((row) => (
        <div className="move-row" role="listitem" key={row.number}>
          <span className="move-num">{row.number}.</span>
          <MoveCell cell={row.white} currentPly={currentPly} onSelect={onSelect} />
          <MoveCell cell={row.black} currentPly={currentPly} onSelect={onSelect} />
        </div>
      ))}
    </div>
  )
}

function MoveCell({
  cell,
  currentPly,
  onSelect
}: {
  cell: Cell | undefined
  currentPly: number
  onSelect: (ply: number) => void
}): React.JSX.Element {
  if (!cell) return <span className="move-cell empty" />
  const { move, ply } = cell
  const view = classificationView(move.classification)
  const isCurrent = ply === currentPly

  return (
    <button
      type="button"
      className={`move-cell ${move.classification}${isCurrent ? ' current' : ''}`}
      onClick={() => onSelect(ply)}
      title={`${view.label} · accuracy ${move.accuracy.toFixed(0)}`}
    >
      <span className="move-san">{move.san}</span>
      <span className="move-symbol">{view.symbol}</span>
    </button>
  )
}
