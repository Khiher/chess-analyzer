import type { MoveClassification, MoveFacts, Score } from '@core/index'
import type { CoachRuntime, CoachStatus, ExplainMoveInput, TokenSink } from './runtime'

/**
 * Template coach — the always-available fallback backend.
 *
 * It renders {@link MoveFacts} into readable prose with no model and no external
 * dependency, so the coaching feature works fully offline the moment a game is
 * analyzed. It is also the deterministic test target for the facts→prose path a
 * model backend later replaces with richer language.
 */

const PHRASE: Record<MoveClassification, string> = {
  brilliant: 'a brilliant move',
  great: 'a great move',
  best: 'the best move',
  excellent: 'an excellent move',
  good: 'a good move',
  book: 'a book move',
  inaccuracy: 'an inaccuracy',
  mistake: 'a mistake',
  miss: 'a missed opportunity',
  blunder: 'a blunder'
}

/** Format a White-perspective score as a compact, human-readable eval. */
function formatEval(score: Score): string {
  if (score.type === 'mate') {
    return score.value >= 0 ? `#${score.value}` : `#-${Math.abs(score.value)}`
  }
  const pawns = score.value / 100
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`
}

/** Render a deterministic prose explanation of a single analyzed move. */
export function renderMoveExplanation(facts: MoveFacts): string {
  const mover = facts.color === 'white' ? 'White' : 'Black'
  const dots = facts.color === 'white' ? '.' : '…'
  const before = Math.round(facts.winPercentBefore)
  const after = Math.round(facts.winPercentAfter)
  const parts: string[] = []

  parts.push(`${facts.moveNumber}${dots} ${facts.san} is ${PHRASE[facts.classification]}.`)

  if (facts.winPercentLost >= 1) {
    parts.push(
      `It dropped ${mover}'s winning chances from ${before}% to ${after}% ` +
        `(engine eval ${formatEval(facts.evalBefore)} → ${formatEval(facts.evalAfter)}).`
    )
  } else {
    parts.push(
      `It holds the evaluation — ${mover} stands at about ${after}% ` +
        `(engine eval ${formatEval(facts.evalAfter)}).`
    )
  }

  if (facts.bestMoveSan && facts.bestMoveSan === facts.san) {
    parts.push("This was the engine's top choice.")
  } else if (facts.bestMoveSan) {
    const line =
      facts.bestLineSan.length > 1 ? ` — the line runs ${facts.bestLineSan.join(' ')}` : ''
    parts.push(`The engine preferred ${facts.bestMoveSan}${line}.`)
  }

  if (facts.playedLineSan.length > 0) {
    parts.push(`After ${facts.san}, play is likely to continue ${facts.playedLineSan.join(' ')}.`)
  }

  return parts.join(' ')
}

/** Emit text to a sink in word-sized chunks, mimicking a streaming model. */
function emitAsTokens(text: string, onToken: TokenSink): void {
  for (const chunk of text.split(/(\s+)/)) {
    if (chunk) onToken(chunk)
  }
}

export class TemplateCoach implements CoachRuntime {
  status(): Promise<CoachStatus> {
    return Promise.resolve({ backend: 'template', available: true, model: null })
  }

  explainMove(input: ExplainMoveInput, onToken?: TokenSink): Promise<string> {
    const text = renderMoveExplanation(input.facts)
    if (onToken) emitAsTokens(text, onToken)
    return Promise.resolve(text)
  }
}
