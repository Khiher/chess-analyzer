import { cpus } from 'node:os'
import { UciEngine } from './uci'
import type { PositionEval } from '@core/types'

/**
 * A fixed-size pool of {@link UciEngine} workers that analyzes many positions
 * concurrently. Positions are handed to whichever engine is free; the pool caps
 * concurrency so a full-game analysis doesn't spawn dozens of Stockfish
 * processes and starve the machine.
 */
export class EnginePool {
  private engines: UciEngine[] = []
  private readonly size: number

  constructor(
    private readonly enginePath: string,
    size?: number
  ) {
    // Leave headroom for the UI/OS; never fewer than one worker.
    this.size = size ?? Math.max(1, Math.min(4, cpus().length - 1))
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
        const index = nextIndex++
        if (index >= fens.length) return
        const fen = fens[index]
        if (fen === undefined) return
        results[index] = await engine.analyze({ fen, depth })
        completed += 1
        onProgress?.(completed, fens.length)
      }
    }

    await Promise.all(this.engines.map((engine) => worker(engine)))
    return results
  }

  async stop(): Promise<void> {
    await Promise.all(this.engines.map((engine) => engine.stop()))
    this.engines = []
  }
}
