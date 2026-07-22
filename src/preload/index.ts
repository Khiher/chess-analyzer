import { contextBridge, ipcRenderer } from 'electron'
import {
  IpcChannel,
  IpcEvent,
  type AnalysisProgress,
  type AnalyzeGameRequest,
  type ChessApi,
  type CoachTokenEvent,
  type ExplainMoveRequest
} from '@shared/ipc'

/**
 * The preload bridge. This is the entire, minimal surface the renderer is
 * allowed to touch. Each method is a typed wrapper over an IPC channel — no Node
 * or Electron internals ever leak into the renderer's `window`.
 */
const api: ChessApi = {
  importPgn: (pgn) => ipcRenderer.invoke(IpcChannel.ImportPgn, pgn),
  importFromUrl: (url) => ipcRenderer.invoke(IpcChannel.ImportFromUrl, url),
  analyzeGame: (req: AnalyzeGameRequest) => ipcRenderer.invoke(IpcChannel.AnalyzeGame, req),
  cancelAnalysis: () => ipcRenderer.invoke(IpcChannel.CancelAnalysis),
  getEngineInfo: () => ipcRenderer.invoke(IpcChannel.GetEngineInfo),
  onAnalysisProgress: (listener) => {
    const handler = (_e: unknown, payload: AnalysisProgress): void => listener(payload)
    ipcRenderer.on(IpcEvent.AnalysisProgress, handler)
    return () => ipcRenderer.removeListener(IpcEvent.AnalysisProgress, handler)
  },
  explainMove: (req: ExplainMoveRequest) => ipcRenderer.invoke(IpcChannel.ExplainMove, req),
  getCoachInfo: () => ipcRenderer.invoke(IpcChannel.GetCoachInfo),
  onCoachToken: (listener) => {
    const handler = (_e: unknown, payload: CoachTokenEvent): void => listener(payload)
    ipcRenderer.on(IpcEvent.CoachToken, handler)
    return () => ipcRenderer.removeListener(IpcEvent.CoachToken, handler)
  }
}

contextBridge.exposeInMainWorld('chess', api)
