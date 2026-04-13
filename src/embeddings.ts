import { buildNgrams, stem, tokenize } from './tokenizer.js'
import type { TokenVector } from './types.js'

export function buildVector(text: string, caseSensitive = false): TokenVector {
  const tokens = tokenize(text, caseSensitive).map(stem)
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

interface PatternEntry {
  vec: TokenVector
  stems: string[]
}

export class VectorStore {
  private store: Map<string, PatternEntry[]> = new Map()
  private averageCache: Map<string, TokenVector> = new Map()
  private stemCache: Map<string, string[]> = new Map()

  add(intent: string, text: string, caseSensitive = false): void {
    const stems = tokenize(text, caseSensitive).map(stem)
    const vec = buildVector(text, caseSensitive)
    const existing = this.store.get(intent) ?? []
    existing.push({ vec, stems })
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
