# Chess Analyzer

A desktop chess game analyzer (Electron + React + TypeScript) in the spirit of
Chess.com's Game Review: import a PGN or a Chess.com/Lichess game, run local
Stockfish analysis, and see per-move classification and accuracy — fully offline.

## Status

Early scaffold. The analysis core (PGN parsing, win%, accuracy, move
classification) is implemented and unit-tested; the Electron shell, engine
wrapper, importers, and a minimal review UI are in place. Coaching narration and
result caching are planned (see `CLAUDE.md`).

## Getting started

Requires **Node 24 LTS** (see `.node-version`) and a Stockfish binary.

```bash
npm install
# Place a Stockfish binary in resources/engines/ — see that folder's README.
npm run dev
```

## Scripts

- `npm run dev` — run the app with hot reload
- `npm run check` — format check, lint, type-check, and unit tests (the CI gate)
- `npm test` — unit tests only
- `npm run dist` — build a platform installer

## Project layout

```
src/
  core/      framework-free chess & analysis logic (unit-tested)
  shared/    IPC contract shared across the process boundary
  main/      Electron main process: engine, importers, analysis, IPC
  preload/   the contextBridge exposing window.chess to the renderer
  renderer/  React UI
resources/
  engines/   Stockfish binaries (not committed)
  models/    local LLM files for coaching (not committed, downloaded on demand)
```

See `CLAUDE.md` for architecture rules and contribution guidance.

## Licensing note

Stockfish is GPL-licensed and is distributed **alongside** this app (invoked as a
separate process over UCI), not linked into it.
