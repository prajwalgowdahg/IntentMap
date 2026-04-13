export { IntentMap } from './IntentMap.js'
export * from './types.js'

import { IntentMap } from './IntentMap.js'
import type { IntentConfig, IntentMapInstance } from './types.js'

export function createIntentMap(config: IntentConfig): IntentMapInstance {
  return new IntentMap(config)
}

export function defineIntent(
  patterns: string[],
  options: { threshold?: number; meta?: Record<string, unknown> } = {}
) {
  return { patterns, ...options }
}
