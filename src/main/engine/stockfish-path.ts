import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * Resolves the path to the bundled Stockfish executable for the current platform.
 *
 * In development the binary lives under `resources/engines/`. In a packaged app
 * electron-builder copies that folder to `process.resourcesPath`. Binaries are
 * NOT committed to git (see .gitignore); see resources/engines/README.md for how
 * to obtain them.
 */

function binaryName(): string {
  switch (process.platform) {
    case 'win32':
      return 'stockfish-windows-x86-64.exe'
    case 'darwin':
      return process.arch === 'arm64' ? 'stockfish-macos-arm64' : 'stockfish-macos-x86-64'
    default:
      return 'stockfish-ubuntu-x86-64'
  }
}

export function resolveStockfishPath(): string | null {
  const name = binaryName()
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'engines', name)]
    : [join(app.getAppPath(), 'resources', 'engines', name)]

  return candidates.find((p) => existsSync(p)) ?? null
}
