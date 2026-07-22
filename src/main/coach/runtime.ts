import type { MoveFacts } from '@core/index'

/**
 * Coach runtime abstraction.
 *
 * The coach turns deterministic {@link MoveFacts} into natural-language prose.
 * Every backend — the offline template renderer, a local Ollama model, or a BYO
 * cloud model — implements this one interface, so the IPC layer and renderer are
 * agnostic to which is active. Backends narrate the facts; they never reason
 * about the position themselves.
 */

/** Which backend is answering, and whether it is usable right now. */
export interface CoachStatus {
  readonly backend: 'ollama' | 'cloud' | 'template'
  readonly available: boolean
  /** Model identifier when a model backend is active, else null. */
  readonly model: string | null
}

/** A request to explain one analyzed half-move. */
export interface ExplainMoveInput {
  readonly facts: MoveFacts
  /** Optional free-form question; backends that can't use it narrate the move. */
  readonly question?: string
}

/** Receives incremental output as it is produced (for streaming UIs). */
export type TokenSink = (chunk: string) => void

export interface CoachRuntime {
  /** Report the active backend and whether it can currently answer. */
  status(): Promise<CoachStatus>
  /**
   * Produce a prose explanation of a move, streaming chunks to `onToken` as they
   * arrive and resolving with the complete text.
   */
  explainMove(input: ExplainMoveInput, onToken?: TokenSink): Promise<string>
}
