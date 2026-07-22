import type { MoveFacts } from '@core/index'

/**
 * Prompt construction for model backends.
 *
 * The system prompt pins the guardrail that makes a small local model reliable:
 * it may only use the supplied facts and must not invent chess. The user message
 * carries the verified {@link MoveFacts} as JSON plus the question. This module
 * is pure string-building so it can be unit-tested without a model.
 */

export const COACH_SYSTEM_PROMPT = [
  'You are a chess coach helping a student understand a single move from their game.',
  '',
  'Rules you must follow:',
  '- Use ONLY the facts in the provided JSON. Do not invent moves, evaluations,',
  '  threats, or piece locations that are not stated in the facts.',
  '- Refer to moves in standard algebraic notation exactly as given.',
  '- If the facts do not answer the question, say you do not have that information.',
  '- Be concise, concrete, and encouraging. Explain in plain language a club',
  '  player can follow. Do not restate the raw JSON.'
].join('\n')

export interface CoachPrompt {
  readonly system: string
  readonly user: string
}

/** Build the system+user prompt pair for explaining one move. */
export function buildMovePrompt(facts: MoveFacts, question?: string): CoachPrompt {
  const ask = question?.trim() || 'Explain this move to me.'
  const user = [
    'Verified facts about the move (JSON):',
    JSON.stringify(facts, null, 2),
    '',
    `Question: ${ask}`
  ].join('\n')
  return { system: COACH_SYSTEM_PROMPT, user }
}
