import { useEffect, useState } from 'react'
import type { AnalyzeGameResult, AnalysisProgress, EngineInfo } from '@shared/ipc'

/**
 * Minimal end-to-end shell: paste a PGN, run analysis, show per-move verdicts
 * and game accuracy. This is intentionally plain — the real board, eval bar, and
 * coaching UI build on top of this same `window.chess` bridge.
 */
export function App(): React.JSX.Element {
  const [pgn, setPgn] = useState('')
  const [engine, setEngine] = useState<EngineInfo | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [result, setResult] = useState<AnalyzeGameResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void window.chess.getEngineInfo().then(setEngine)
    return window.chess.onAnalysisProgress(setProgress)
  }, [])

  async function handleAnalyze(): Promise<void> {
    setError(null)
    setResult(null)
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

  return (
    <main className="app">
      <header>
        <h1>Chess Analyzer</h1>
        <span className={engine?.available ? 'engine ok' : 'engine missing'}>
          {engine ? `${engine.name}: ${engine.available ? 'ready' : 'not found'}` : 'checking…'}
        </span>
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
                <span className="san">
                  {m.moveNumber}
                  {m.color === 'white' ? '.' : '…'} {m.san}
                </span>
                <span className="tag">{m.classification}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  )
}
