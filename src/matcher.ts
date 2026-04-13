import { VectorStore, buildVector, cosineSimilarity } from './embeddings.js'
import { stem, tokenize } from './tokenizer.js'
import type { IntentConfig, IntentScoreBreakdown, MatchResult } from './types.js'

export class Matcher {
  private store: VectorStore
  private thresholds: Map<string, number> = new Map()
  private defaultThreshold: number
  private caseSensitive: boolean
  private debug: boolean
  private weights: { cosine: number; keyword: number }
  private stemmer: (word: string) => string

  constructor(config: {
    defaultThreshold: number
    caseSensitive: boolean
    debug: boolean
    weights: { cosine: number; keyword: number }
    stemmer?: (word: string) => string
  }) {
    this.stemmer = config.stemmer ?? stem
    this.store = new VectorStore(this.stemmer)
    this.defaultThreshold = config.defaultThreshold ?? 0.25
    this.caseSensitive = config.caseSensitive ?? false
    this.debug = config.debug ?? false
    this.weights = config.weights
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
    const inputStems = tokenize(input, this.caseSensitive).map(this.stemmer)
    const inputVec = buildVector(input, this.caseSensitive, inputStems)
    const intents = this.store.getIntents()
    const scores: Record<string, number> = {}
    const debugBreakdown: Record<string, IntentScoreBreakdown> = {}

    for (const intent of intents) {
      const avgVec = this.store.getAverage(intent)
      const cosine = cosineSimilarity(inputVec, avgVec)
      const keyword = this.store.bestKeywordScore(intent, inputStems)
      const blended = this.weights.cosine * cosine + this.weights.keyword * keyword
      scores[intent] = Number.parseFloat(blended.toFixed(4))

      if (this.debug) {
        const threshold = this.thresholds.get(intent) ?? this.defaultThreshold
        debugBreakdown[intent] = {
          cosine,
          keyword,
          blended,
          threshold,
          aboveThreshold: blended > threshold,
        }
      }
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

    const result: MatchResult = {
      matched,
      intent: matched ? topIntent : null,
      confidence: topScore,
      scores,
      input,
    }

    if (this.debug) {
      result.debug = debugBreakdown
    }

    return result
  }

  getIntents(): string[] {
    return this.store.getIntents()
  }

  clear(): void {
    this.store.clear()
    this.thresholds.clear()
  }
}
