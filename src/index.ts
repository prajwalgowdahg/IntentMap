export { IntentMap } from './IntentMap.js'
export * from './types.js'

import { IntentMap } from './IntentMap.js'
import type { IntentConfig, IntentMapInstance } from './types.js'

export function createIntentMap(config: unknown): IntentMapInstance {
  if (typeof config !== 'object' || config === null) {
    throw new TypeError(
      `[intentmap] createIntentMap() expected a config object, got ${config === null ? 'null' : typeof config}`
    )
  }

  const cfg = config as Record<string, unknown>

  // Required: intents
  if (typeof cfg.intents !== 'object' || cfg.intents === null) {
    throw new TypeError(
      `[intentmap] createIntentMap() config.intents must be an object, got ${cfg.intents === null ? 'null' : typeof cfg.intents}`
    )
  }

  // Validate each intent entry (but allow empty intents object)
  for (const [name, def] of Object.entries(cfg.intents as Record<string, unknown>)) {
    if (typeof def !== 'object' || def === null) {
      throw new TypeError(
        `[intentmap] createIntentMap() config.intents["${name}"] must be an object, got ${typeof def}`
      )
    }
    const intentDef = def as Record<string, unknown>
    if (!Array.isArray(intentDef.patterns)) {
      throw new TypeError(
        `[intentmap] createIntentMap() config.intents["${name}"].patterns must be an array`
      )
    }
    if (intentDef.patterns.length === 0) {
      throw new TypeError(
        `[intentmap] createIntentMap() config.intents["${name}"].patterns must be a non-empty array`
      )
    }
    for (const p of intentDef.patterns) {
      if (typeof p !== 'string') {
        throw new TypeError(
          `[intentmap] createIntentMap() config.intents["${name}"].patterns must contain only strings`
        )
      }
    }
  }

  // Optional fields type checks (only when provided)
  if (
    'defaultThreshold' in cfg &&
    cfg.defaultThreshold !== undefined &&
    typeof cfg.defaultThreshold !== 'number'
  ) {
    throw new TypeError(
      `[intentmap] createIntentMap() config.defaultThreshold must be a number, got ${typeof cfg.defaultThreshold}`
    )
  }
  if (
    'caseSensitive' in cfg &&
    cfg.caseSensitive !== undefined &&
    typeof cfg.caseSensitive !== 'boolean'
  ) {
    throw new TypeError(
      `[intentmap] createIntentMap() config.caseSensitive must be a boolean, got ${typeof cfg.caseSensitive}`
    )
  }
  if ('debug' in cfg && cfg.debug !== undefined && typeof cfg.debug !== 'boolean') {
    throw new TypeError(
      `[intentmap] createIntentMap() config.debug must be a boolean, got ${typeof cfg.debug}`
    )
  }

  // Do NOT reject unknown properties

  return new IntentMap(config as IntentConfig)
}

export function defineIntent(
  patterns: string[],
  options: { threshold?: number; meta?: Record<string, unknown> } = {}
) {
  return { patterns, ...options }
}
