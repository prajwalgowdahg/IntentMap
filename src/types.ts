export interface IntentDefinition {
  patterns: string[]
  threshold?: number
  meta?: Record<string, unknown>
}

export interface IntentConfig {
  intents: Record<string, IntentDefinition>
  defaultThreshold?: number
  caseSensitive?: boolean
  debug?: boolean
}

export interface MatchResult {
  matched: boolean
  intent: string | null
  confidence: number
  scores: Record<string, number>
  input: string
}

export interface BoundEvent {
  element: HTMLElement
  eventType: string
  extractor?: (event: Event) => string
  handler: (result: MatchResult, event: Event) => void
}

export type IntentHandler = (result: MatchResult, event?: Event) => void

export interface IntentMapInstance {
  match(input: string): MatchResult
  on(intent: string, handler: IntentHandler): () => void
  off(intent: string, handler: IntentHandler): void
  bind(element: HTMLElement, options?: BindOptions): () => void
  addIntent(name: string, definition: IntentDefinition): void
  removeIntent(name: string): void
  train(intent: string, examples: string[]): void
  getIntents(): string[]
  destroy(): void
}

export interface BindOptions {
  on?: string | string[]
  extractor?: (event: Event) => string
  filter?: (result: MatchResult) => boolean
  debounce?: number
}

export type TokenVector = Map<string, number>
