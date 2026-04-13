export interface IntentDefinition {
  patterns: string[]
  threshold?: number
  meta?: Record<string, unknown>
}

export interface IntentWeights {
  cosine?: number
  keyword?: number
}

export interface IntentConfig {
  intents: Record<string, IntentDefinition>
  defaultThreshold?: number
  caseSensitive?: boolean
  debug?: boolean
  weights?: IntentWeights
  stemmer?: (word: string) => string
}

export interface IntentScoreBreakdown {
  cosine: number
  keyword: number
  blended: number
  threshold: number
  aboveThreshold: boolean
}

export interface MatchOptions {
  explain?: boolean
}

export interface MatchTopKOptions extends MatchOptions {
  limit?: number
}

export interface RankedIntentMatch {
  intent: string
  confidence: number
  threshold: number
  matched: boolean
}

export interface MatchExplanation {
  matchedPattern: string | null
  keywordHits: string[]
  topSignals: string[]
}

export interface MatchResult {
  matched: boolean
  intent: string | null
  confidence: number
  scores: Record<string, number>
  input: string
  debug?: Record<string, IntentScoreBreakdown>
  alternatives?: RankedIntentMatch[]
  explanation?: MatchExplanation
}

export interface BoundEvent {
  element: HTMLElement
  eventType: string
  extractor?: (event: Event) => string
  handler: (result: MatchResult, event: Event) => void
}

export type IntentHandler = (result: MatchResult, event?: Event) => void

export interface IntentMapInstance {
  match(input: string, options?: MatchOptions): MatchResult
  matchTopK(input: string, options?: MatchTopKOptions): MatchResult
  on(intent: string, handler: IntentHandler): () => void
  off(intent: string, handler: IntentHandler): void
  bind(element: HTMLElement, options?: BindOptions): () => void
  addIntent(name: string, definition: IntentDefinition): void
  removeIntent(name: string): void
  train(intent: string, examples: string[]): void
  getIntents(): string[]
  destroy(): void
  readonly isAlive: boolean
}

export interface BindOptions {
  on?: string | string[]
  extractor?: (event: Event) => string
  filter?: (result: MatchResult) => boolean
  debounce?: number
}

export type TokenVector = Map<string, number>
