import { useEffect, useState } from 'react'
import type { AnalyzeGameResult, AnalysisProgress, CoachInfo, EngineInfo } from '@shared/ipc'

/**
 * Minimal end-to-end shell: paste a PGN, run analysis, show per-move verdicts
 * and game accuracy, and click any move to get a coach explanation. This is
 * intentionally plain — the real board, eval bar, and richer coaching UI build
 * on top of this same `window.chess` bridge.
 */
export function App(): React.JSX.Element {
  const [pgn, setPgn] = useState('')
  const [engine, setEngine] = useState<EngineInfo | null>(null)
  const [coach, setCoach] = useState<CoachInfo | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [result, setResult] = useState<AnalyzeGameResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [selectedPly, setSelectedPly] = useState<number | null>(null)
  const [coachText, setCoachText] = useState('')
  const [coachBusy, setCoachBusy] = useState(false)

  useEffect(() => {
    void window.chess.getEngineInfo().then(setEngine)
    void window.chess.getCoachInfo().then(setCoach)
    const offProgress = window.chess.onAnalysisProgress(setProgress)
    const offToken = window.chess.onCoachToken((e) => setCoachText((prev) => prev + e.chunk))
    return () => {
      offProgress()
      offToken()
    }
  }, [])

  async function handleAnalyze(): Promise<void> {
    setError(null)
    setResult(null)
    setSelectedPly(null)
    setCoachText('')
    setBusy(true)
    try {
      const res = await window.chess.analyzeGame({ pgn })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  async function handleExplain(ply: number): Promise<void> {
    setSelectedPly(ply)
    setCoachText('')
    setCoachBusy(true)
    try {
      const text = await window.chess.explainMove({ ply })
      setCoachText(text) // authoritative final text (also assembled from streamed chunks)
    } catch (err) {
      setCoachText(err instanceof Error ? err.message : String(err))
    } finally {
      setCoachBusy(false)
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Chess Analyzer</h1>
        <div className="status">
          <span className={engine?.available ? 'engine ok' : 'engine missing'}>
            {engine ? `${engine.name}: ${engine.available ? 'ready' : 'not found'}` : 'checking…'}
          </span>
          <span className="engine ok">
            {coach ? `Coach: ${coach.backend}${coach.model ? ` (${coach.model})` : ''}` : ''}
          </span>
        </div>
      </header>

      <textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        placeholder="Paste a PGN here…"
        rows={8}
        spellCheck={false}
      />

      <div className="actions">
        <button onClick={() => void handleAnalyze()} disabled={busy || pgn.trim().length === 0}>
          {busy ? 'Analyzing…' : 'Analyze game'}
        </button>
        {progress && (
          <span className="progress">
            {progress.analyzedPlies} / {progress.totalPlies} positions
          </span>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="results">
          <p className="accuracy">
            Accuracy — White {result.accuracy.white.toFixed(1)} · Black{' '}
            {result.accuracy.black.toFixed(1)}
          </p>
          <ol className="moves">
            {result.moves.map((m) => (
              <li key={m.ply} className={`move ${m.classification}`}>
                <button
                  className={`move-btn${selectedPly === m.ply ? ' selected' : ''}`}
                  onClick={() => void handleExplain(m.ply)}
                  disabled={coachBusy}
                >
                  <span className="san">
                    {m.moveNumber}
                    {m.color === 'white' ? '.' : '…'} {m.san}
                  </span>
                  <span className="tag">{m.classification}</span>
                </button>
              </li>
            ))}
          </ol>

          {selectedPly !== null && (
            <aside className="coach">
              <h2>Coach {coachBusy ? '· thinking…' : ''}</h2>
              <p className="coach-text">{coachText || (coachBusy ? '' : 'No explanation.')}</p>
            </aside>
          )}
        </section>
      )}
    </main>
  )
}
