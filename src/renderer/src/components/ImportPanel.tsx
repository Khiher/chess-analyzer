import { useState } from 'react'
import type { AnalysisProgress, EngineInfo } from '@shared/ipc'

interface ImportPanelProps {
  readonly engine: EngineInfo | null
  readonly busy: boolean
  readonly progress: AnalysisProgress | null
  readonly error: string | null
  readonly notice: string | null
  readonly onAnalyze: (pgn: string, depth: number) => void
  readonly onCancel: () => void
  /** Resolve a Lichess game URL/id to PGN text (delegated to the main process). */
  readonly onImportUrl: (url: string) => Promise<string>
}

const DEPTHS = [10, 14, 16, 20] as const
const DEFAULT_DEPTH = 16

/**
 * The entry screen: paste a PGN or pull one from a Lichess URL, pick a search
 * depth, and start (or cancel) analysis. Engine availability, progress, and
 * errors surface here so the review screen stays focused on results.
 */
export function ImportPanel({
  engine,
  busy,
  progress,
  error,
  notice,
  onAnalyze,
  onCancel,
  onImportUrl
}: ImportPanelProps): React.JSX.Element {
  const [pgn, setPgn] = useState('')
  const [url, setUrl] = useState('')
  const [depth, setDepth] = useState<number>(DEFAULT_DEPTH)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  async function handleImportUrl(): Promise<void> {
    setImportError(null)
    setImporting(true)
    try {
      const imported = await onImportUrl(url.trim())
      setPgn(imported)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }

  const pct =
    progress && progress.totalPlies > 0
      ? Math.round((progress.analyzedPlies / progress.totalPlies) * 100)
      : 0

  return (
    <section className="import-panel">
      <div className="url-row">
        <input
          type="text"
          className="url-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Lichess game URL or id…"
          spellCheck={false}
          disabled={busy || importing}
        />
        <button
          type="button"
          className="secondary"
          onClick={() => void handleImportUrl()}
          disabled={busy || importing || url.trim().length === 0}
        >
          {importing ? 'Fetching…' : 'Import'}
        </button>
      </div>
      {importError && <p className="error">{importError}</p>}

      <textarea
        value={pgn}
        onChange={(e) => setPgn(e.target.value)}
        placeholder="…or paste a PGN here"
        rows={10}
        spellCheck={false}
        disabled={busy}
      />

      <div className="actions">
        <label className="depth">
          Depth
          <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} disabled={busy}>
            {DEPTHS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        {busy ? (
          <button type="button" className="danger" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAnalyze(pgn, depth)}
            disabled={pgn.trim().length === 0 || !engine?.available}
          >
            Analyze game
          </button>
        )}

        {busy && progress && (
          <span className="progress">
            {progress.analyzedPlies} / {progress.totalPlies} positions ({pct}%)
          </span>
        )}
      </div>

      {busy && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{error}</p>}
      {engine && !engine.available && (
        <p className="error">
          Stockfish engine not found. Add a binary under <code>resources/engines/</code> (see its
          README) to enable analysis.
        </p>
      )}
    </section>
  )
}
