import { VectorStore, buildVector, cosineSimilarity } from './embeddings.js'
import { stem, tokenize } from './tokenizer.js'
import type {
  IntentScoreBreakdown,
  MatchExplanation,
  MatchOptions,
  MatchResult,
  MatchTopKOptions,
  RankedIntentMatch,
} from './types.js'

interface RankedCandidate {
  intent: string
  confidence: number
  threshold: number
  matched: boolean
  index: number
}

interface ScoredIntentSet {
  scores: Record<string, number>
  ranked: RankedCandidate[]
  debug?: Record<string, IntentScoreBreakdown>
  explanation?: MatchExplanation
}

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

  private scoreIntents(input: string, options: MatchOptions = {}): ScoredIntentSet {
    const inputStems = tokenize(input, this.caseSensitive).map(this.stemmer)
    const inputVec = buildVector(input, this.caseSensitive, inputStems)
    const intents = this.store.getIntents()
    const scores: Record<string, number> = {}
    const ranked: RankedCandidate[] = []
    const debugBreakdown: Record<string, IntentScoreBreakdown> = {}

    intents.forEach((intent, index) => {
      const avgVec = this.store.getAverage(intent)
      const cosine = cosineSimilarity(inputVec, avgVec)
      const keyword = this.store.bestKeywordScore(intent, inputStems)
      const blended = this.weights.cosine * cosine + this.weights.keyword * keyword
      const confidence = Number.parseFloat(blended.toFixed(4))
      const threshold = this.thresholds.get(intent) ?? this.defaultThreshold

      scores[intent] = confidence
      ranked.push({
        intent,
        confidence,
        threshold,
        matched: blended > threshold,
        index,
      })

      if (this.debug) {
        debugBreakdown[intent] = {
          cosine,
          keyword,
          blended,
          threshold,
          aboveThreshold: blended > threshold,
        }
      }
    })

    if (this.debug) {
      console.debug('[intentmap] scores:', scores, 'for input:', input)
    }

    ranked.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence
      }
      return a.index - b.index
    })

    const topCandidate = ranked[0]
    let explanation: MatchExplanation | undefined

    if (options.explain && topCandidate) {
      const topPattern = this.store.getBestPatternMatch(
        topCandidate.intent,
        inputStems,
        inputVec
      )
      if (topPattern) {
        const topSignals: string[] = []
        if (topPattern.keywordScore > 0) {
          topSignals.push('keyword overlap')
        }
        if (topPattern.cosine > 0) {
          topSignals.push('cosine similarity')
        }
        if (topCandidate.matched) {
          topSignals.push('threshold pass')
        }

        explanation = {
          matchedPattern: topPattern.text,
          keywordHits: topPattern.keywordHits,
          topSignals,
        }
      } else {
        explanation = {
          matchedPattern: null,
          keywordHits: [],
          topSignals: [],
        }
      }
    }

    return {
      scores,
      ranked,
      ...(this.debug ? { debug: debugBreakdown } : {}),
      ...(explanation ? { explanation } : {}),
    }
  }

  private buildMatchResult(
    input: string,
    scored: ScoredIntentSet,
    alternatives?: RankedIntentMatch[]
  ): MatchResult {
    const topCandidate = scored.ranked[0]
    const topScore = topCandidate?.confidence ?? 0
    const matched = topCandidate?.matched ?? false

    const result: MatchResult = {
      matched,
      intent: matched ? (topCandidate?.intent ?? null) : null,
      confidence: topScore,
      scores: scored.scores,
      input,
    }

    if (scored.debug) {
      result.debug = scored.debug
    }
    if (scored.explanation) {
      result.explanation = scored.explanation
    }
    if (alternatives) {
      result.alternatives = alternatives
    }

    return result
  }

  match(input: string, options: MatchOptions = {}): MatchResult {
    const scored = this.scoreIntents(input, options)
    return this.buildMatchResult(input, scored)
  }

  matchTopK(input: string, options: MatchTopKOptions = {}): MatchResult {
    const scored = this.scoreIntents(input, options)
    const limit = options.limit === undefined ? 3 : Math.max(0, Math.floor(options.limit))
    const alternatives: RankedIntentMatch[] = scored.ranked
      .slice(0, limit)
      .map((candidate) => ({
        intent: candidate.intent,
        confidence: candidate.confidence,
        threshold: candidate.threshold,
        matched: candidate.matched,
      }))

    return this.buildMatchResult(input, scored, alternatives)
  }

  getIntents(): string[] {
    return this.store.getIntents()
  }

  clear(): void {
    this.store.clear()
    this.thresholds.clear()
  }
}
