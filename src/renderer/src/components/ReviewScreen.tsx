import { useCallback, useEffect, useState } from 'react'
import type { AnalyzeGameResult, CoachInfo } from '@shared/ipc'
import type { Color, MoveClassification } from '@core/types'
import { classificationCounts, classificationView, formatScore, uciToSquares } from '../lib/review'
import { BoardPanel } from './BoardPanel'
import { EvalBar } from './EvalBar'
import { MoveList } from './MoveList'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Classifications worth surfacing as summary chips, in display order. */
const SUMMARY_CHIPS: readonly MoveClassification[] = [
  'brilliant',
  'great',
  'best',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder'
]

interface ReviewScreenProps {
  readonly result: AnalyzeGameResult
  readonly onNewGame: () => void
}

/**
 * The Game Review screen: eval bar + board on the left, a navigable move list on
 * the right, per-player accuracy above. Arrow keys and the on-screen controls
 * step through the game; selecting a move jumps the board to that position.
 */
export function ReviewScreen({ result, onNewGame }: ReviewScreenProps): React.JSX.Element {
  const { moves, accuracy, game } = result
  const lastPly = moves.length - 1
  const [ply, setPly] = useState(-1)
  const [orientation, setOrientation] = useState<Color>('white')

  // Coach: explains the selected move on demand. It streams tokens for a live
  // feel and resolves with the full text; `coachPly` tracks which move the
  // current explanation belongs to so it hides when the user navigates away.
  const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null)
  const [coachPly, setCoachPly] = useState<number | null>(null)
  const [coachText, setCoachText] = useState('')
  const [coachBusy, setCoachBusy] = useState(false)

  const clampPly = useCallback((p: number) => Math.max(-1, Math.min(lastPly, p)), [lastPly])

  useEffect(() => {
    void window.chess.getCoachInfo().then(setCoachInfo)
    return window.chess.onCoachToken((e) => setCoachText((prev) => prev + e.chunk))
  }, [])

  const askCoach = useCallback((p: number): void => {
    setCoachPly(p)
    setCoachText('')
    setCoachBusy(true)
    void window.chess
      .explainMove({ ply: p })
      .then(setCoachText) // authoritative final text (also assembled from streamed chunks)
      .catch((err: unknown) => setCoachText(err instanceof Error ? err.message : String(err)))
      .finally(() => setCoachBusy(false))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      switch (e.key) {
        case 'ArrowLeft':
          setPly((p) => clampPly(p - 1))
          break
        case 'ArrowRight':
          setPly((p) => clampPly(p + 1))
          break
        case 'Home':
          setPly(-1)
          break
        case 'End':
          setPly(lastPly)
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clampPly, lastPly])

  const currentMove = ply >= 0 ? moves[ply] : null
  const fen = currentMove ? currentMove.fenAfter : (moves[0]?.fenBefore ?? START_FEN)
  const lastMove = currentMove ? { from: currentMove.from, to: currentMove.to } : null
  const score = currentMove ? currentMove.scoreAfter : null

  const view = currentMove ? classificationView(currentMove.classification) : null
  const showBestArrow = view ? view.tone === 'inaccuracy' || view.tone === 'bad' : false
  const bestSquares = currentMove ? uciToSquares(currentMove.bestMoveUci) : null

  const white = game.headers['White'] ?? 'White'
  const black = game.headers['Black'] ?? 'Black'
  const resultTag = game.headers['Result'] ?? ''

  return (
    <div className="review">
      <header className="review-header">
        <div className="players">
          <PlayerCard name={white} color="white" accuracy={accuracy.white} moves={moves} />
          <span className="vs">{resultTag || 'vs'}</span>
          <PlayerCard name={black} color="black" accuracy={accuracy.black} moves={moves} />
        </div>
        <button type="button" className="secondary" onClick={onNewGame}>
          New game
        </button>
      </header>

      <div className="review-body">
        <div className="board-area">
          <EvalBar score={score} />
          <BoardPanel
            fen={fen}
            orientation={orientation}
            lastMove={lastMove}
            bestMoveUci={currentMove?.bestMoveUci ?? null}
            showBestArrow={showBestArrow}
          />
        </div>

        <aside className="side">
          <MoveList moves={moves} currentPly={ply} onSelect={setPly} />

          <div className="detail">
            {currentMove && view ? (
              <>
                <span className={`badge ${currentMove.classification}`}>
                  {view.symbol} {view.label}
                </span>
                <span className="detail-san">
                  {currentMove.moveNumber}
                  {currentMove.color === 'white' ? '.' : '…'} {currentMove.san}
                </span>
                {score && <span className="detail-eval">{formatScore(score)}</span>}
                {showBestArrow && bestSquares && (
                  <span className="detail-best">
                    Best: {bestSquares.from}→{bestSquares.to}
                  </span>
                )}
              </>
            ) : (
              <span className="detail-san">Starting position</span>
            )}
          </div>

          <div className="nav">
            <button
              type="button"
              onClick={() => setPly(-1)}
              disabled={ply < 0}
              title="Start (Home)"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={() => setPly((p) => clampPly(p - 1))}
              disabled={ply < 0}
              title="Previous (←)"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => setPly((p) => clampPly(p + 1))}
              disabled={ply >= lastPly}
              title="Next (→)"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => setPly(lastPly)}
              disabled={ply >= lastPly}
              title="End (End)"
            >
              ⏭
            </button>
            <button
              type="button"
              className="flip"
              onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
              title="Flip board"
            >
              ⇅ Flip
            </button>
          </div>

          {currentMove && (
            <div className="coach">
              <div className="coach-head">
                <h2>Coach</h2>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => askCoach(ply)}
                  disabled={coachBusy}
                >
                  {coachBusy && coachPly === ply ? 'Thinking…' : 'Explain this move'}
                </button>
                {coachInfo && (
                  <span className="coach-backend">
                    {coachInfo.backend}
                    {coachInfo.model ? ` · ${coachInfo.model}` : ''}
                  </span>
                )}
              </div>
              {coachPly === ply && coachText && <p className="coach-text">{coachText}</p>}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function PlayerCard({
  name,
  color,
  accuracy,
  moves
}: {
  name: string
  color: Color
  accuracy: number
  moves: AnalyzeGameResult['moves']
}): React.JSX.Element {
  const counts = classificationCounts(moves, color)
  return (
    <div className={`player-card ${color}`}>
      <span className="player-name">{name}</span>
      <span className="player-accuracy">{accuracy.toFixed(1)}</span>
      <span className="player-accuracy-label">accuracy</span>
      <div className="chips">
        {SUMMARY_CHIPS.filter((c) => counts[c] > 0).map((c) => (
          <span key={c} className={`chip ${c}`} title={classificationView(c).label}>
            {classificationView(c).symbol} {counts[c]}
          </span>
        ))}
      </div>
    </div>
  )
}
