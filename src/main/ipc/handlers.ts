import { ipcMain, type BrowserWindow } from 'electron'
import { buildMoveFacts, parsePgn } from '@core/index'
import {
  IpcChannel,
  IpcEvent,
  type AnalyzeGameRequest,
  type AnalyzeGameResult,
  type CoachInfo,
  type EngineInfo,
  type ExplainMoveRequest
} from '@shared/ipc'
import { EnginePool } from '../engine/engine-pool'
import { resolveStockfishPath } from '../engine/stockfish-path'
import { analyzeGame, type GameReview } from '../analysis/pipeline'
import { fetchGamePgn } from '../importers/lichess'
import { createCoachRuntime } from '../coach'

const DEFAULT_DEPTH = 16

/**
 * Sentinel error message the renderer recognizes to render a cancellation as a
 * neutral "cancelled" state rather than a hard failure. Electron serializes only
 * the message string across IPC, so we key on it there.
 */
export const ANALYSIS_CANCELLED_MESSAGE = 'ANALYSIS_CANCELLED'

/** The pool for the analysis currently running, if any, so cancel() can reach it. */
let activePool: EnginePool | null = null

/**
 * Registers every IPC handler exactly once. The renderer reaches these only
 * through the preload bridge; nothing here trusts renderer input beyond the
 * typed contract, and all engine/network/file work stays on this side.
 */
export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  // The coach explains moves of the most recently analyzed game, so we keep the
  // last review in memory rather than re-running the engine. This is the seam
  // where a keyed CacheStore drops in later (see roadmap notes).
  let lastReview: GameReview | null = null
  const coach = createCoachRuntime()

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
      activePool = pool
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
        lastReview = review
        return review
      } catch (err) {
        // Translate a cancellation into the sentinel the renderer expects; let
        // any genuine engine/parse error propagate unchanged.
        if (pool.wasCancelled) throw new Error(ANALYSIS_CANCELLED_MESSAGE)
        throw err
      } finally {
        await pool.stop()
        if (activePool === pool) activePool = null
      }
    }
  )

  ipcMain.handle(IpcChannel.CancelAnalysis, async () => {
    await activePool?.cancel()
  })

  ipcMain.handle(IpcChannel.GetEngineInfo, (): EngineInfo => {
    const path = resolveStockfishPath()
    return { name: 'Stockfish', available: path !== null, path }
  })

  ipcMain.handle(IpcChannel.ExplainMove, async (_e, req: ExplainMoveRequest): Promise<string> => {
    if (!lastReview) {
      throw new Error('No analyzed game available. Analyze a game first.')
    }
    const facts = buildMoveFacts(
      {
        headers: lastReview.game.headers,
        moves: lastReview.moves,
        accuracy: lastReview.accuracy
      },
      req.ply
    )
    const input = req.question !== undefined ? { facts, question: req.question } : { facts }
    return coach.explainMove(input, (chunk) => {
      getWindow()?.webContents.send(IpcEvent.CoachToken, { chunk })
    })
  })

  ipcMain.handle(IpcChannel.GetCoachInfo, async (): Promise<CoachInfo> => {
    const status = await coach.status()
    return { backend: status.backend, available: status.available, model: status.model }
  })
}

/** Extract a Lichess game id from a URL or accept a bare id. */
function extractLichessId(input: string): string | null {
  const match = input.match(/lichess\.org\/([\w-]{8,})/)
  if (match) return match[1] ?? null
  if (/^[\w-]{8,}$/.test(input.trim())) return input.trim()
  return null
}
