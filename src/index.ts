export { IntentMap } from './IntentMap.js'
export * from './types.js'

import { IntentMap } from './IntentMap.js'
import type { IntentConfig, IntentMapInstance, IntentWeights } from './types.js'

interface NormalizedWeights {
  cosine: number
  keyword: number
}

function normalizeWeights(weights: IntentWeights | undefined): NormalizedWeights {
  if (weights === undefined) {
    return { cosine: 0.35, keyword: 0.65 }
  }

  const cosine = weights.cosine
  const keyword = weights.keyword

  // Validate individual values if provided
  if (
    cosine !== undefined &&
    (typeof cosine !== 'number' || Number.isNaN(cosine) || cosine < 0)
  ) {
    throw new TypeError(
      '[intentmap] createIntentMap() config.weights.cosine must be a non-negative number'
    )
  }
  if (
    keyword !== undefined &&
    (typeof keyword !== 'number' || Number.isNaN(keyword) || keyword < 0)
  ) {
    throw new TypeError(
      '[intentmap] createIntentMap() config.weights.keyword must be a non-negative number'
    )
  }

  // Single weight provided: infer the other
  if (cosine !== undefined && keyword === undefined) {
    if (cosine < 0 || Number.isNaN(cosine)) {
      throw new TypeError(
        '[intentmap] createIntentMap() config.weights.cosine must be a non-negative number'
      )
    }
    return { cosine, keyword: 1 - cosine }
  }
  if (keyword !== undefined && cosine === undefined) {
    if (keyword < 0 || Number.isNaN(keyword)) {
      throw new TypeError(
        '[intentmap] createIntentMap() config.weights.keyword must be a non-negative number'
      )
    }
    return { cosine: 1 - keyword, keyword }
  }

  // Both provided: normalize to sum 1.0
  const c = cosine as number
  const k = keyword as number
  const sum = c + k
  if (sum === 0) {
    throw new TypeError(
      '[intentmap] createIntentMap() config.weights cannot have a zero sum'
    )
  }
  return { cosine: c / sum, keyword: k / sum }
}

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

  // Validate and normalize weights if provided
  if ('weights' in cfg && cfg.weights !== undefined) {
    if (typeof cfg.weights !== 'object' || cfg.weights === null) {
      throw new TypeError(
        `[intentmap] createIntentMap() config.weights must be an object, got ${typeof cfg.weights}`
      )
    }
    // normalizeWeights validates negative/NaN/zero-sum and normalizes
    normalizeWeights(cfg.weights as IntentWeights)
  }

  // Validate stemmer if provided
  if (
    'stemmer' in cfg &&
    cfg.stemmer !== undefined &&
    typeof cfg.stemmer !== 'function'
  ) {
    throw new TypeError(
      `[intentmap] createIntentMap() config.stemmer must be a function, got ${typeof cfg.stemmer}`
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
