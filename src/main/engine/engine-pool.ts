import { cpus } from 'node:os'
import { UciEngine } from './uci'
import type { PositionEval } from '@core/types'

/**
 * A fixed-size pool of {@link UciEngine} workers that analyzes many positions
 * concurrently. Positions are handed to whichever engine is free; the pool caps
 * concurrency so a full-game analysis doesn't spawn dozens of Stockfish
 * processes and starve the machine.
 */
/** Thrown by {@link EnginePool.analyzePositions} when analysis was cancelled. */
export class AnalysisCancelledError extends Error {
  constructor() {
    super('Analysis cancelled')
    this.name = 'AnalysisCancelledError'
  }
}

export class EnginePool {
  private engines: UciEngine[] = []
  private readonly size: number
  private cancelled = false

  constructor(
    private readonly enginePath: string,
    size?: number
  ) {
    // Leave headroom for the UI/OS; never fewer than one worker.
    this.size = size ?? Math.max(1, Math.min(4, cpus().length - 1))
  }

  /** Whether this pool was cancelled (lets callers distinguish cancel from error). */
  get wasCancelled(): boolean {
    return this.cancelled
  }

  /**
   * Cancel any in-flight analysis. Sets the cancel flag and stops every engine,
   * which rejects the pending analyze() calls; {@link analyzePositions} then
   * throws {@link AnalysisCancelledError} instead of returning partial results.
   */
  async cancel(): Promise<void> {
    this.cancelled = true
    await this.stop()
  }

  async start(): Promise<void> {
    this.engines = await Promise.all(
      Array.from({ length: this.size }, async () => {
        const engine = new UciEngine(this.enginePath)
        await engine.start()
        return engine
      })
    )
  }

  /**
   * Analyze a batch of FENs to a fixed depth, preserving input order.
   * `onProgress` fires once per completed position.
   */
  async analyzePositions(
    fens: readonly string[],
    depth: number,
    onProgress?: (completed: number, total: number) => void
  ): Promise<PositionEval[]> {
    if (this.engines.length === 0) throw new Error('EnginePool.start() was not called')

    const results = new Array<PositionEval>(fens.length)
    let nextIndex = 0
    let completed = 0

    const worker = async (engine: UciEngine): Promise<void> => {
      while (true) {
        if (this.cancelled) return
        const index = nextIndex++
        if (index >= fens.length) return
        const fen = fens[index]
        if (fen === undefined) return
        try {
          results[index] = await engine.analyze({ fen, depth })
        } catch (err) {
          // A rejection during cancellation is expected (we killed the engine);
          // swallow it so only the real errors propagate.
          if (this.cancelled) return
          throw err
        }
        completed += 1
        onProgress?.(completed, fens.length)
      }
    }

    await Promise.all(this.engines.map((engine) => worker(engine)))
    if (this.cancelled) throw new AnalysisCancelledError()
    return results
  }

  async stop(): Promise<void> {
    await Promise.all(this.engines.map((engine) => engine.stop()))
    this.engines = []
  }
}
