import { Matcher } from './matcher.js'
import type {
  BindOptions,
  IntentConfig,
  IntentDefinition,
  IntentHandler,
  IntentMapInstance,
  MatchResult,
} from './types.js'

export class IntentMap implements IntentMapInstance {
  private matcher: Matcher
  private handlers: Map<string, Set<IntentHandler>> = new Map()
  private wildcardHandlers: Set<IntentHandler> = new Set()
  private boundElements: Map<HTMLElement, (() => void)[]> = new Map()

  constructor(config: IntentConfig) {
    this.matcher = new Matcher({
      defaultThreshold: config.defaultThreshold ?? 0.25,
      caseSensitive: config.caseSensitive ?? false,
      debug: config.debug ?? false,
    })

    for (const [name, def] of Object.entries(config.intents)) {
      this.matcher.addIntent(name, def.patterns, def.threshold)
    }
  }

  match(input: string): MatchResult {
    return this.matcher.match(input)
  }

  emit(result: MatchResult, event?: Event): void {
    if (result.matched && result.intent) {
      const handlers = this.handlers.get(result.intent)
      handlers?.forEach((h) => h(result, event))
    }
    this.wildcardHandlers.forEach((h) => h(result, event))
  }

  on(intent: string, handler: IntentHandler): () => void {
    if (intent === '*') {
      this.wildcardHandlers.add(handler)
      return () => this.wildcardHandlers.delete(handler)
    }
    if (!this.handlers.has(intent)) {
      this.handlers.set(intent, new Set())
    }
    this.handlers.get(intent)?.add(handler)
    return () => this.off(intent, handler)
  }

  off(intent: string, handler: IntentHandler): void {
    if (intent === '*') {
      this.wildcardHandlers.delete(handler)
      return
    }
    this.handlers.get(intent)?.delete(handler)
  }

  bind(element: HTMLElement, options: BindOptions = {}): () => void {
    const { on: eventTypes = ['input', 'change'], extractor, filter } = options

    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes]
    const cleanupFns: (() => void)[] = []

    for (const eventType of types) {
      const listener = (event: Event) => {
        const text = extractor ? extractor(event) : extractText(event)

        if (!text) return

        const result = this.match(text)
        if (filter && !filter(result)) return

        this.emit(result, event)
      }

      element.addEventListener(eventType, listener)
      cleanupFns.push(() => element.removeEventListener(eventType, listener))
    }

    this.boundElements.set(element, [
      ...(this.boundElements.get(element) ?? []),
      ...cleanupFns,
    ])

    return () => {
      cleanupFns.forEach((fn) => fn())
      const remaining = this.boundElements
        .get(element)
        ?.filter((fn) => !cleanupFns.includes(fn))
      if (remaining?.length) {
        this.boundElements.set(element, remaining)
      } else {
        this.boundElements.delete(element)
      }
    }
  }

  addIntent(name: string, definition: IntentDefinition): void {
    this.matcher.addIntent(name, definition.patterns, definition.threshold)
  }

  removeIntent(name: string): void {
    this.matcher.removeIntent(name)
    this.handlers.delete(name)
  }

  train(intent: string, examples: string[]): void {
    this.matcher.train(intent, examples)
  }

  getIntents(): string[] {
    return this.matcher.getIntents()
  }

  destroy(): void {
    for (const [element, cleanupFns] of this.boundElements) {
      cleanupFns.forEach((fn) => fn())
    }
    this.boundElements.clear()
    this.handlers.clear()
    this.wildcardHandlers.clear()
    this.matcher.clear()
  }
}

function extractText(event: Event): string {
  const target = event.target as HTMLElement & {
    value?: string
    textContent?: string | null
    innerText?: string
    dataset?: DOMStringMap
  }

  if ('value' in target && typeof target.value === 'string') {
    return target.value
  }
  if (target.dataset?.intent) {
    return target.dataset.intent
  }
  return target.innerText ?? target.textContent ?? ''
}
