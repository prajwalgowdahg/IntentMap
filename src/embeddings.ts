import { buildNgrams, stem, tokenize } from './tokenizer.js'
import type { TokenVector } from './types.js'

export function buildVector(text: string, caseSensitive?: boolean): TokenVector
export function buildVector(
  text: string,
  caseSensitive: boolean,
  stems: string[]
): TokenVector
export function buildVector(
  text: string,
  caseSensitive = false,
  stems?: string[]
): TokenVector {
  const tokens = stems ?? tokenize(text, caseSensitive).map(stem)
  const ngrams = buildNgrams(tokens, 2)
  const vec: TokenVector = new Map()

  for (const term of ngrams) {
    vec.set(term, (vec.get(term) ?? 0) + 1)
  }

  const magnitude = Math.sqrt([...vec.values()].reduce((s, v) => s + v * v, 0))
  if (magnitude > 0) {
    for (const [term, freq] of vec) {
      vec.set(term, freq / magnitude)
    }
  }

  return vec
}

export function cosineSimilarity(a: TokenVector, b: TokenVector): number {
  let dot = 0
  for (const [term, aVal] of a) {
    const bVal = b.get(term)
    if (bVal !== undefined) dot += aVal * bVal
  }
  return dot
}

/**
 * Keyword overlap score: fraction of pattern stems found in input stems.
 * This is the primary signal — if core words match, the intent is likely right.
 */
export function keywordOverlap(inputTokens: string[], patternTokens: string[]): number {
  if (patternTokens.length === 0) return 0
  const inputSet = new Set(inputTokens)
  const hits = patternTokens.filter((t) => inputSet.has(t)).length
  return hits / patternTokens.length
}

export function averageVectors(vectors: TokenVector[]): TokenVector {
  if (vectors.length === 0) return new Map()
  const combined: TokenVector = new Map()

  for (const vec of vectors) {
    for (const [term, val] of vec) {
      combined.set(term, (combined.get(term) ?? 0) + val)
    }
  }

  for (const [term, val] of combined) {
    combined.set(term, val / vectors.length)
  }

  return combined
}

export interface PatternEntry {
  text: string
  vec: TokenVector
  stems: string[]
}

export interface PatternExplanation {
  text: string
  keywordHits: string[]
  keywordScore: number
  cosine: number
}

function uniqueKeywordHits(inputTokens: string[], patternTokens: string[]): string[] {
  const patternSet = new Set(patternTokens)
  const seen = new Set<string>()
  const hits: string[] = []

  for (const token of inputTokens) {
    if (patternSet.has(token) && !seen.has(token)) {
      seen.add(token)
      hits.push(token)
    }
  }

  return hits
}

export class VectorStore {
  private store: Map<string, PatternEntry[]> = new Map()
  private averageCache: Map<string, TokenVector> = new Map()
  private stemCache: Map<string, string[]> = new Map()
  private stemmerFn: (word: string) => string

  constructor(stemmerFn?: (word: string) => string) {
    this.stemmerFn = stemmerFn ?? stem
  }

  add(intent: string, text: string, caseSensitive = false): void {
    const stems = tokenize(text, caseSensitive).map(this.stemmerFn)
    const vec = buildVector(text, caseSensitive, stems)
    const existing = this.store.get(intent) ?? []
    existing.push({ text, vec, stems })
    this.store.set(intent, existing)
    this.averageCache.delete(intent)
    this.stemCache.delete(intent)
  }

  addAll(intent: string, texts: string[], caseSensitive = false): void {
    for (const text of texts) this.add(intent, text, caseSensitive)
  }

  getAverage(intent: string): TokenVector {
    const cached = this.averageCache.get(intent)
    if (cached) {
      return cached
    }
    const entries = this.store.get(intent) ?? []
    const avg = averageVectors(entries.map((e) => e.vec))
    this.averageCache.set(intent, avg)
    return avg
  }

  /**
   * Best keyword overlap score: max overlap across all patterns for this intent.
   */
  bestKeywordScore(intent: string, inputStems: string[]): number {
    const entries = this.store.get(intent) ?? []
    let best = 0
    for (const entry of entries) {
      const score = keywordOverlap(inputStems, entry.stems)
      if (score > best) best = score
    }
    return best
  }

  getBestPatternMatch(
    intent: string,
    inputStems: string[],
    inputVec: TokenVector
  ): PatternExplanation | null {
    const entries = this.store.get(intent) ?? []
    let bestEntry: PatternEntry | null = null
    let bestKeywordScore = -1
    let bestCosine = -1
    let bestHits: string[] = []

    for (const entry of entries) {
      const keywordScore = keywordOverlap(inputStems, entry.stems)
      const cosine = cosineSimilarity(inputVec, entry.vec)
      const keywordHits = uniqueKeywordHits(inputStems, entry.stems)

      const shouldReplace =
        keywordScore > bestKeywordScore ||
        (keywordScore === bestKeywordScore && cosine > bestCosine)

      if (shouldReplace) {
        bestEntry = entry
        bestKeywordScore = keywordScore
        bestCosine = cosine
        bestHits = keywordHits
      }
    }

    if (bestEntry === null) {
      return null
    }

    return {
      text: bestEntry.text,
      keywordHits: bestHits,
      keywordScore: bestKeywordScore,
      cosine: bestCosine,
    }
  }

  getIntents(): string[] {
    return [...this.store.keys()]
  }

  remove(intent: string): void {
    this.store.delete(intent)
    this.averageCache.delete(intent)
    this.stemCache.delete(intent)
  }

  clear(): void {
    this.store.clear()
    this.averageCache.clear()
    this.stemCache.clear()
  }
}
