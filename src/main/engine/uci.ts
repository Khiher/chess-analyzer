import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface, type Interface } from 'node:readline'
import { EventEmitter } from 'node:events'
import type { PositionEval, Score } from '@core/types'

/**
 * A thin, promise-friendly wrapper around a single UCI engine process
 * (Stockfish). It speaks the UCI text protocol over the child's stdin/stdout and
 * turns `info`/`bestmove` lines into a {@link PositionEval}.
 *
 * One instance owns exactly one engine process. Concurrency is handled a level
 * up by the engine pool, not here.
 */

export interface AnalyzeOptions {
  /** FEN of the position to analyze. */
  readonly fen: string
  /** Target search depth. */
  readonly depth: number
}

export class UciEngine extends EventEmitter {
  private proc: ChildProcessWithoutNullStreams | null = null
  private rl: Interface | null = null
  private ready = false

  constructor(private readonly enginePath: string) {
    super()
  }

  /** Spawn the process and complete the `uci` / `isready` handshake. */
  async start(): Promise<void> {
    if (this.proc) return
    const proc = spawn(this.enginePath, [], { stdio: 'pipe' })
    this.proc = proc
    this.rl = createInterface({ input: proc.stdout })
    proc.on('error', (err) => this.emit('error', err))

    this.send('uci')
    await this.waitFor((line) => line === 'uciok')
    this.send('isready')
    await this.waitFor((line) => line === 'readyok')
    this.ready = true
  }

  /** Analyze one position to the requested depth and resolve its evaluation. */
  async analyze({ fen, depth }: AnalyzeOptions): Promise<PositionEval> {
    if (!this.ready) throw new Error('UciEngine.analyze called before start()')

    const sideToMove = fen.split(' ')[1] === 'b' ? 'black' : 'white'
    let lastScore: Score = { type: 'cp', value: 0 }
    let lastDepth = 0
    let pv: string[] = []

    this.send('ucinewgame')
    this.send(`position fen ${fen}`)
    this.send(`go depth ${depth}`)

    const bestMove = await new Promise<string | null>((resolve, reject) => {
      const onLine = (line: string): void => {
        if (line.startsWith('info')) {
          const parsed = parseInfoLine(line, sideToMove)
          if (parsed) {
            lastScore = parsed.score
            lastDepth = parsed.depth
            pv = parsed.pv
          }
        } else if (line.startsWith('bestmove')) {
          this.off('line', onLine)
          this.off('error', onErr)
          const token = line.split(/\s+/)[1]
          resolve(token && token !== '(none)' ? token : null)
        }
      }
      const onErr = (err: Error): void => {
        this.off('line', onLine)
        reject(err)
      }
      this.on('line', onLine)
      this.once('error', onErr)
    })

    return { fen, depth: lastDepth, score: lastScore, pv, bestMove }
  }

  /** Terminate the engine process. Promise-typed for a uniform pool API. */
  stop(): Promise<void> {
    if (!this.proc) return Promise.resolve()
    this.send('quit')
    this.proc.kill()
    this.rl?.close()
    this.proc = null
    this.rl = null
    this.ready = false
    return Promise.resolve()
  }

  private send(command: string): void {
    this.proc?.stdin.write(`${command}\n`)
  }

  private waitFor(predicate: (line: string) => boolean): Promise<void> {
    return new Promise((resolve) => {
      const onLine = (line: string): void => {
        if (predicate(line)) {
          this.off('line', onLine)
          resolve()
        }
      }
      // Attach the readline forwarder lazily on first wait.
      this.rl?.on('line', (line: string) => this.emit('line', line.trim()))
      this.on('line', onLine)
    })
  }
}

/** Parse a UCI `info ... score ... pv ...` line into a normalized evaluation. */
export function parseInfoLine(
  line: string,
  sideToMove: 'white' | 'black'
): { score: Score; depth: number; pv: string[] } | null {
  const tokens = line.split(/\s+/)
  const scoreIdx = tokens.indexOf('score')
  if (scoreIdx === -1) return null

  const kind = tokens[scoreIdx + 1]
  const raw = Number(tokens[scoreIdx + 2])
  if (!Number.isFinite(raw)) return null

  // UCI scores are from the side-to-move's perspective; normalize to White.
  const sign = sideToMove === 'white' ? 1 : -1
  const score: Score =
    kind === 'mate' ? { type: 'mate', value: sign * raw } : { type: 'cp', value: sign * raw }

  const depthIdx = tokens.indexOf('depth')
  const depth = depthIdx !== -1 ? Number(tokens[depthIdx + 1]) : 0

  const pvIdx = tokens.indexOf('pv')
  const pv = pvIdx !== -1 ? tokens.slice(pvIdx + 1) : []

  return { score, depth: Number.isFinite(depth) ? depth : 0, pv }
}
