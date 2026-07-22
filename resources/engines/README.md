# Engine binaries

The Stockfish executables are **not** committed to git (they are large and
platform-specific). Place the binary for your platform in this folder using the
exact names below — `src/main/engine/stockfish-path.ts` resolves them by name.

| Platform      | Expected filename                |
| ------------- | -------------------------------- |
| Windows x64   | `stockfish-windows-x86-64.exe`   |
| macOS (Apple) | `stockfish-macos-arm64`          |
| macOS (Intel) | `stockfish-macos-x86-64`         |
| Linux x64     | `stockfish-ubuntu-x86-64`        |

Download official builds from https://stockfishchess.org/download/ (GPL-licensed;
distributed alongside, not linked into, this app). On macOS/Linux, mark the file
executable: `chmod +x <file>`.

For packaged builds, `electron-builder.yml` copies this folder into the app's
resources so the same lookup works in production.
