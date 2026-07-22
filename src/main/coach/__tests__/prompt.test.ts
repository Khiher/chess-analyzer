import { describe, it, expect } from 'vitest'
import type { MoveFacts } from '@core/index'
import { buildMovePrompt, COACH_SYSTEM_PROMPT } from '../prompt'

const facts: MoveFacts = {
  ply: 40,
  moveNumber: 21,
  color: 'white',
  san: 'Qxf7',
  classification: 'blunder',
  winPercentBefore: 64,
  winPercentAfter: 12,
  winPercentLost: 52,
  evalBefore: { type: 'cp', value: 80 },
  evalAfter: { type: 'cp', value: -210 },
  bestMoveSan: 'Rfe1',
  bestLineSan: ['Rfe1', 'Nc6'],
  playedLineSan: ['Kxf7']
}

describe('buildMovePrompt', () => {
  it('carries the system guardrail and embeds the facts JSON', () => {
    const { system, user } = buildMovePrompt(facts)
    expect(system).toBe(COACH_SYSTEM_PROMPT)
    expect(system).toContain('Use ONLY the facts')
    expect(user).toContain('"san": "Qxf7"')
    expect(user).toContain('"classification": "blunder"')
  })

  it('defaults the question when none is given', () => {
    expect(buildMovePrompt(facts).user).toContain('Question: Explain this move to me.')
  })

  it('passes a caller question through verbatim', () => {
    const { user } = buildMovePrompt(facts, 'Why was this so bad?')
    expect(user).toContain('Question: Why was this so bad?')
  })
})
