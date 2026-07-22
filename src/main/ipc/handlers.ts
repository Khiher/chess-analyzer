import { ipcMain, type BrowserWindow } from 'electron'
import { parsePgn } from '@core/index'
import {
  IpcChannel,
  IpcEvent,
  type AnalyzeGameRequest,
  type AnalyzeGameResult,
  type EngineInfo
} from '@shared/ipc'
import { EnginePool } from '../engine/engine-pool'
import { resolveStockfishPath } from '../engine/stockfish-path'
import { analyzeGame } from '../analysis/pipeline'
import { fetchGamePgn } from '../importers/lichess'

const DEFAULT_DEPTH = 16

/**
 * Registers every IPC handler exactly once. The renderer reaches these only
 * through the preload bridge; nothing here trusts renderer input beyond the
 * typed contract, and all engine/network/file work stays on this side.
 */
export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IpcChannel.ImportPgn, (_e, pgn: string) => {
    // Parse eagerly so malformed PGN fails fast with a clear error.
    return parsePgn(pgn)
  })

  ipcMain.handle(IpcChannel.ImportFromUrl, async (_e, url: string) => {
    // v1 supports Lichess game URLs/ids; Chess.com archive import is wired
    // through the importer module and can be surfaced here next.
    const id = extractLichessId(url)
    if (!id) throw new Error('Unrecognized game URL')
    return fetchGamePgn(id)
  })

  ipcMain.handle(
    IpcChannel.AnalyzeGame,
    async (_e, req: AnalyzeGameRequest): Promise<AnalyzeGameResult> => {
      const enginePath = resolveStockfishPath()
      if (!enginePath) {
        throw new Error('Stockfish engine not found. See resources/engines/README.md.')
      }

      const pool = new EnginePool(enginePath)
      await pool.start()
      try {
        const review = await analyzeGame(req.pgn, pool, {
          depth: req.depth ?? DEFAULT_DEPTH,
          onProgress: (completed, total) => {
            getWindow()?.webContents.send(IpcEvent.AnalysisProgress, {
              analyzedPlies: completed,
              totalPlies: total
            })
          }
        })
        return review
      } finally {
        await pool.stop()
      }
    }
  )

  ipcMain.handle(IpcChannel.CancelAnalysis, () => {
    // Cancellation is a follow-up: track the active pool and stop() it here.
  })

  ipcMain.handle(IpcChannel.GetEngineInfo, (): EngineInfo => {
    const path = resolveStockfishPath()
    return { name: 'Stockfish', available: path !== null, path }
  })
}

/** Extract a Lichess game id from a URL or accept a bare id. */
function extractLichessId(input: string): string | null {
  const match = input.match(/lichess\.org\/([\w-]{8,})/)
  if (match) return match[1] ?? null
  if (/^[\w-]{8,}$/.test(input.trim())) return input.trim()
  return null
}
