import type { ChessApi } from '@shared/ipc'

/** Ambient typing for the bridge exposed by the preload script. */
declare global {
  interface Window {
    readonly chess: ChessApi
  }
}

export {}
