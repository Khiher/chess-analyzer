import { useCallback, useEffect, useState } from 'react'
import type { AnalyzeGameResult, AnalysisProgress, EngineInfo } from '@shared/ipc'
import { ImportPanel } from './components/ImportPanel'
import { ReviewScreen } from './components/ReviewScreen'

/** Message the main process uses to mark a cancelled (vs failed) analysis. */
const CANCELLED_MARKER = 'ANALYSIS_CANCELLED'

/**
 * Top-level app: owns the import → analyze → review flow and the single
 * `window.chess` bridge. The heavy lifting (engine, network, parsing) all lives
 * in the main process; this component only orchestrates state and swaps between
 * the import panel and the review screen.
 */
export function App(): React.JSX.Element {
  const [engine, setEngine] = useState<EngineInfo | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [result, setResult] = useState<AnalyzeGameResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void window.chess.getEngineInfo().then(setEngine)
    return window.chess.onAnalysisProgress(setProgress)
  }, [])

  const handleAnalyze = useCallback((pgn: string, depth: number): void => {
    setError(null)
    setNotice(null)
    setResult(null)
    setBusy(true)
    void window.chess
      .analyzeGame({ pgn, depth })
      .then(setResult)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes(CANCELLED_MARKER)) {
          setNotice('Analysis cancelled.')
        } else {
          setError(message)
        }
      })
      .finally(() => {
        setBusy(false)
        setProgress(null)
      })
  }, [])

  const handleCancel = useCallback((): void => {
    void window.chess.cancelAnalysis()
  }, [])

  const handleImportUrl = useCallback((url: string): Promise<string> => {
    return window.chess.importFromUrl(url)
  }, [])

  const handleNewGame = useCallback((): void => {
    setResult(null)
    setError(null)
    setNotice(null)
  }, [])

  return (
    <main className="app">
      <header className="app-header">
        <h1>Chess Analyzer</h1>
        <span className={engine?.available ? 'engine ok' : 'engine missing'}>
          {engine ? `${engine.name}: ${engine.available ? 'ready' : 'not found'}` : 'checking…'}
        </span>
      </header>

      {result ? (
        <ReviewScreen result={result} onNewGame={handleNewGame} />
      ) : (
        <ImportPanel
          engine={engine}
          busy={busy}
          progress={progress}
          error={error}
          notice={notice}
          onAnalyze={handleAnalyze}
          onCancel={handleCancel}
          onImportUrl={handleImportUrl}
        />
      )}
    </main>
  )
}
