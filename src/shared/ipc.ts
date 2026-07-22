/**
 * The IPC contract between the renderer and the main process.
 *
 * This is the ONLY surface the renderer may use to reach privileged code. The
 * renderer never imports Node, Electron, the engine, or the network layer
 * directly — it calls these typed channels through the preload bridge. Keeping
 * the contract in one shared module means both sides type-check against the same
 * definitions.
 */

import type { AnalyzedMove, GameAccuracy, ParsedGame } from '@core/types'

/** Request/response channels (renderer invokes, main handles and replies). */
export const IpcChannel = {
  ImportPgn: 'game:import-pgn',
  ImportFromUrl: 'game:import-from-url',
  AnalyzeGame: 'analysis:analyze-game',
  CancelAnalysis: 'analysis:cancel',
  GetEngineInfo: 'engine:info',
  ExplainMove: 'coach:explain-move',
  GetCoachInfo: 'coach:info'
} as const

/** One-way progress events (main emits, renderer subscribes). */
export const IpcEvent = {
  AnalysisProgress: 'analysis:progress',
  CoachToken: 'coach:token'
} as const

export interface AnalyzeGameRequest {
  readonly pgn: string
  /** Search depth per position; higher = slower but stronger. */
  readonly depth?: number
}

export interface AnalyzeGameResult {
  readonly game: ParsedGame
  readonly moves: readonly AnalyzedMove[]
  readonly accuracy: GameAccuracy
}

export interface AnalysisProgress {
  readonly analyzedPlies: number
  readonly totalPlies: number
}

export interface EngineInfo {
  readonly name: string
  readonly available: boolean
  readonly path: string | null
}

/** Ask the coach to explain a single analyzed half-move of the last game. */
export interface ExplainMoveRequest {
  /** 0-based ply index into the analyzed game's move list. */
  readonly ply: number
  /** Optional free-form question about the move. */
  readonly question?: string
}

/** Which coach backend is active and whether it can answer right now. */
export interface CoachInfo {
  readonly backend: 'ollama' | 'cloud' | 'template'
  readonly available: boolean
  readonly model: string | null
}

/** One streamed chunk of a coach explanation. */
export interface CoachTokenEvent {
  readonly chunk: string
}

/** Shape exposed on `window.chess` by the preload bridge. */
export interface ChessApi {
  importPgn(pgn: string): Promise<ParsedGame>
  importFromUrl(url: string): Promise<string>
  analyzeGame(req: AnalyzeGameRequest): Promise<AnalyzeGameResult>
  cancelAnalysis(): Promise<void>
  getEngineInfo(): Promise<EngineInfo>
  onAnalysisProgress(listener: (p: AnalysisProgress) => void): () => void
  /** Explain a move of the most recently analyzed game; resolves with full text. */
  explainMove(req: ExplainMoveRequest): Promise<string>
  getCoachInfo(): Promise<CoachInfo>
  /** Subscribe to streamed explanation chunks; returns an unsubscribe function. */
  onCoachToken(listener: (e: CoachTokenEvent) => void): () => void
}
