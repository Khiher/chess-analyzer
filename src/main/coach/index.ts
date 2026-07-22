import type { CoachRuntime } from './runtime'
import { TemplateCoach } from './template'

/** Default local model, when a model backend is added (step 4). */
export const DEFAULT_COACH_MODEL = 'llama3.2:3b'

/**
 * Select the coach backend to use.
 *
 * Today this always returns the offline template coach. Step 4 will probe for a
 * running Ollama server (and a pulled model), preferring it when available and
 * falling back to the template so the feature never goes dark.
 */
export function createCoachRuntime(): CoachRuntime {
  return new TemplateCoach()
}

export * from './runtime'
