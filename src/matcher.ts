import { VectorStore, buildVector, cosineSimilarity } from './embeddings.js'
import { stem, tokenize } from './tokenizer.js'
import type { IntentConfig, MatchResult } from './types.js'

const COSINE_WEIGHT = 0.35
const KEYWORD_WEIGHT = 0.65

export class Matcher {
  private store: VectorStore
  private thresholds: Map<string, number> = new Map()
  private defaultThreshold: number
  private caseSensitive: boolean
  private debug: boolean

  constructor(config: {
    defaultThreshold: number
    caseSensitive: boolean
    debug: boolean
  }) {
    this.store = new VectorStore()
    this.defaultThreshold = config.defaultThreshold ?? 0.25
    this.caseSensitive = config.caseSensitive ?? false
    this.debug = config.debug ?? false
  }

  addIntent(name: string, patterns: string[], threshold?: number): void {
    this.store.addAll(name, patterns, this.caseSensitive)
    if (threshold !== undefined) {
      this.thresholds.set(name, threshold)
    }
  }

  train(intent: string, examples: string[]): void {
    this.store.addAll(intent, examples, this.caseSensitive)
  }

  removeIntent(name: string): void {
    this.store.remove(name)
    this.thresholds.delete(name)
  }

  match(input: string): MatchResult {
    const inputVec = buildVector(input, this.caseSensitive)
    const inputStems = tokenize(input, this.caseSensitive).map(stem)
    const intents = this.store.getIntents()
    const scores: Record<string, number> = {}

    for (const intent of intents) {
      const avgVec = this.store.getAverage(intent)
      const cosine = cosineSimilarity(inputVec, avgVec)
      const keyword = this.store.bestKeywordScore(intent, inputStems)
      const blended = COSINE_WEIGHT * cosine + KEYWORD_WEIGHT * keyword
      scores[intent] = Number.parseFloat(blended.toFixed(4))
    }

    if (this.debug) {
      console.debug('[intentmap] scores:', scores, 'for input:', input)
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
    const [topIntent, topScore] = sorted[0] ?? [null, 0]
    const threshold = topIntent
      ? (this.thresholds.get(topIntent) ?? this.defaultThreshold)
      : this.defaultThreshold

    const matched = topScore > threshold

    return {
      matched,
      intent: matched ? topIntent : null,
      confidence: topScore,
      scores,
      input,
    }
  }

  getIntents(): string[] {
    return this.store.getIntents()
  }

  clear(): void {
    this.store.clear()
    this.thresholds.clear()
  }
}
