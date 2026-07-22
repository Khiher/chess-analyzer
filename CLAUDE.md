# CLAUDE.md

Guidance for AI agents (and humans) working in this repository. Read this before
making changes.

## What this is

A cross-platform **desktop** chess game analyzer (Electron + React + TypeScript),
similar to Chess.com's Game Review: import a PGN or a Chess.com/Lichess game, run
engine analysis, and get per-move classification, accuracy scores, and (later)
coaching narration.

## Commands

| Task            | Command                 |
| --------------- | ----------------------- |
| Install         | `npm install`           |
| Run in dev      | `npm run dev`           |
| Type-check      | `npm run typecheck`     |
| Lint            | `npm run lint`          |
| Format          | `npm run format`        |
| Unit tests      | `npm test`              |
| All gates       | `npm run check`         |
| Build (unpacked)| `npm run package`       |
| Build installer | `npm run dist`          |

`npm run check` runs the same gates as CI (format, lint, typecheck, test). Run it
before opening a PR.

## Architecture (and the rules that keep it stable)

Three process contexts, strictly separated:

- **`src/main/`** — Electron main process. Owns ALL privileged work: spawning the
  Stockfish engine (`engine/`), network imports (`importers/`), the file system,
  and analysis orchestration (`analysis/`). Node and Electron APIs live here only.
- **`src/preload/`** — the bridge. Exposes a single typed object (`window.chess`)
  via `contextBridge`. This is the entire surface the renderer may use.
- **`src/renderer/`** — the React UI. Runs sandboxed with `contextIsolation: true`
  and `nodeIntegration: false`.
- **`src/core/`** — framework-free chess/analysis logic (PGN parsing, win%,
  accuracy, classification). No Electron, no engine I/O, no React. Importable by
  any context and covered by unit tests. **Put pure logic here** so it stays
  testable.
- **`src/shared/`** — types shared across the IPC boundary (the `ipc.ts` contract).

### Non-negotiable rules

1. **The renderer never imports `electron`, `node:*`, the engine, or the network
   layer.** It talks to the main process only through `window.chess` (defined by
   `src/shared/ipc.ts` and implemented in `src/preload/`). To add a capability,
   add a channel to the shared contract, implement it in `main/ipc/handlers.ts`,
   and expose it in `preload/index.ts`.
2. **Never weaken the `webPreferences` security settings** in `main/index.ts`
   (`sandbox`, `contextIsolation`, `nodeIntegration`) without review.
3. **Pure chess logic goes in `src/core/`** with a unit test, not in the main
   process or a React component.
4. **Engine binaries and model files are never committed** (see `.gitignore` and
   `resources/engines/README.md`). They are resolved at runtime / bundled at
   package time.

## Contribution workflow (stable-repo rules)

- **`main` is the integration branch.** Do work on a feature branch and merge via
  a pull request; CI (`.github/workflows/ci.yml`) must be green before merge.
- **Direct pushes to `main` are blocked server-side** by the `protect-main`
  repository ruleset, which requires a pull request and all four green CI checks
  (`Lint, type-check & test` + the three `Electron build (*)` jobs) before merge,
  and forbids force-pushes and branch deletion.
- A committed pre-push hook (`.githooks/pre-push`) gives the same guard locally
  plus a fast `npm run check` before every push, so problems surface before they
  reach CI. It is activated by the `prepare` script on `npm install` (or manually
  with `git config core.hooksPath .githooks`). Emergency bypass: `git push
  --no-verify` (the server ruleset still applies).
- Run `npm run check` before opening a PR; it mirrors the CI gate exactly.

## Analysis model

Win% and accuracy use the documented Lichess model (Chess.com's is proprietary);
all tunable constants live in `src/core/winprob.ts`, `accuracy.ts`, and
`classify.ts` so they can be recalibrated without touching callers.

## Roadmap notes

- Coaching narration is planned as a separate module: deterministic facts from
  the engine/classifier feed a small local LLM (or optional BYO cloud key) that
  only turns facts into prose — it never reasons about the position itself. A
  template fallback renders when no model is available.
- Analysis-result caching (keyed by game hash) is planned via a `CacheStore`
  interface so a SQLite backend can drop in later without a native-module
  dependency in the first build.
