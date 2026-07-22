import { describe, it, expect } from 'vitest'
import type { MoveFacts } from '@core/index'
import { renderMoveExplanation, TemplateCoach } from '../template'

function moveFacts(partial: Partial<MoveFacts> = {}): MoveFacts {
  return {
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
    bestLineSan: ['Rfe1', 'Nc6', 'Bd5'],
    playedLineSan: ['Kxf7', 'Qh5+'],
    ...partial
  }
}

describe('renderMoveExplanation', () => {
  it('narrates a blunder with the win% swing, eval, and engine line', () => {
    const text = renderMoveExplanation(moveFacts())
    expect(text).toContain('21. Qxf7 is a blunder')
    expect(text).toContain("dropped White's winning chances from 64% to 12%")
    expect(text).toContain('+0.80 → -2.10')
    expect(text).toContain('The engine preferred Rfe1')
    expect(text).toContain('Rfe1 Nc6 Bd5')
    expect(text).toContain('After Qxf7, play is likely to continue Kxf7 Qh5+')
  })

  it('uses black move notation for black moves', () => {
    const text = renderMoveExplanation(moveFacts({ color: 'black', san: 'Nf6', moveNumber: 5 }))
    expect(text).toContain('5… Nf6')
    expect(text).toContain("Black's winning chances")
  })

  it('acknowledges when the played move was the engine top choice', () => {
    const text = renderMoveExplanation(
      moveFacts({
        classification: 'best',
        san: 'Rfe1',
        bestMoveSan: 'Rfe1',
        winPercentBefore: 60,
        winPercentAfter: 60,
        winPercentLost: 0,
        bestLineSan: ['Rfe1', 'Nc6']
      })
    )
    expect(text).toContain('is the best move')
    expect(text).toContain("This was the engine's top choice")
    expect(text).toContain('holds the evaluation')
    expect(text).not.toContain('The engine preferred')
  })

  it('renders mate scores', () => {
    const text = renderMoveExplanation(
      moveFacts({ evalBefore: { type: 'cp', value: 80 }, evalAfter: { type: 'mate', value: -3 } })
    )
    expect(text).toContain('#-3')
  })
})

describe('TemplateCoach', () => {
  it('reports itself as an available template backend', async () => {
    expect(await new TemplateCoach().status()).toEqual({
      backend: 'template',
      available: true,
      model: null
    })
  })

  it('streams the same text it resolves with', async () => {
    const coach = new TemplateCoach()
    const chunks: string[] = []
    const full = await coach.explainMove({ facts: moveFacts() }, (c) => chunks.push(c))
    expect(chunks.join('')).toBe(full)
    expect(full.length).toBeGreaterThan(0)
  })
})
