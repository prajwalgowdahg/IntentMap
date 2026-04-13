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
  private unbindFns: Map<HTMLElement, () => void> = new Map()
  private debounceTimers: Map<HTMLElement, ReturnType<typeof setTimeout>> = new Map()
  private destroyed = false

  private guardNotDestroyed(methodName: string): void {
    if (this.destroyed) {
      throw new Error(`[intentmap] ${methodName}() called after destroy()`)
    }
  }

  get isAlive(): boolean {
    return !this.destroyed
  }

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
    this.guardNotDestroyed('match')
    if (typeof input !== 'string') {
      throw new TypeError(
        `[intentmap] match() expected a string, got ${input === null ? 'null' : typeof input}`
      )
    }
    if (input.length > 10_000) {
      return { matched: false, intent: null, confidence: 0, scores: {}, input }
    }
    return this.matcher.match(input)
  }

  emit(result: MatchResult, event?: Event): void {
    this.guardNotDestroyed('emit')
    if (result.matched && result.intent) {
      const handlers = this.handlers.get(result.intent)
      handlers?.forEach((h) => h(result, event))
    }
    this.wildcardHandlers.forEach((h) => h(result, event))
  }

  on(intent: string, handler: IntentHandler): () => void {
    this.guardNotDestroyed('on')
    if (typeof intent !== 'string') {
      throw new TypeError(
        `[intentmap] on() expected intent name as a string, got ${intent === null ? 'null' : typeof intent}`
      )
    }
    if (typeof handler !== 'function') {
      throw new TypeError(
        `[intentmap] on() expected handler as a function, got ${typeof handler}`
      )
    }
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
    this.guardNotDestroyed('off')
    if (typeof intent !== 'string') {
      throw new TypeError(
        `[intentmap] off() expected intent name as a string, got ${intent === null ? 'null' : typeof intent}`
      )
    }
    if (typeof handler !== 'function') {
      throw new TypeError(
        `[intentmap] off() expected handler as a function, got ${typeof handler}`
      )
    }
    if (intent === '*') {
      this.wildcardHandlers.delete(handler)
      return
    }
    this.handlers.get(intent)?.delete(handler)
  }

  bind(element: HTMLElement, options: BindOptions = {}): () => void {
    this.guardNotDestroyed('bind')
    if (element === null || element === undefined) {
      throw new TypeError(
        `[intentmap] bind() expected an HTMLElement, got ${element === null ? 'null' : 'undefined'}`
      )
    }
    if (typeof HTMLElement !== 'undefined' && !(element instanceof HTMLElement)) {
      throw new TypeError(
        `[intentmap] bind() expected an HTMLElement, got ${typeof element}`
      )
    }
    if (options !== undefined && (typeof options !== 'object' || options === null)) {
      throw new TypeError(
        `[intentmap] bind() expected options as an object, got ${typeof options}`
      )
    }

    // Debounce validation
    const debounceMs = options.debounce
    if (debounceMs !== undefined && (typeof debounceMs !== 'number' || debounceMs <= 0)) {
      throw new TypeError(
        `[intentmap] bind() debounce must be a positive number, got ${debounceMs}`
      )
    }

    // Duplicate bind check: skip silently, return existing unbind function
    if (this.unbindFns.has(element)) {
      return this.unbindFns.get(element)!
    }

    const { on: eventTypes = ['input', 'change'], extractor, filter } = options

    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes]
    const cleanupFns: (() => void)[] = []

    for (const eventType of types) {
      const listener = (event: Event) => {
        const text = extractor ? extractor(event) : extractText(event)

        if (!text) return

        if (debounceMs) {
          const existing = this.debounceTimers.get(element)
          if (existing) clearTimeout(existing)
          const timer = setTimeout(() => {
            this.debounceTimers.delete(element)
            const result = this.match(text)
            if (filter && !filter(result)) return
            this.emit(result, event)
          }, debounceMs)
          this.debounceTimers.set(element, timer)
        } else {
          const result = this.match(text)
          if (filter && !filter(result)) return
          this.emit(result, event)
        }
      }

      element.addEventListener(eventType, listener)
      cleanupFns.push(() => element.removeEventListener(eventType, listener))
    }

    this.boundElements.set(element, [
      ...(this.boundElements.get(element) ?? []),
      ...cleanupFns,
    ])

    const unbind = () => {
      if (!this.boundElements.has(element) && !this.unbindFns.has(element)) return
      cleanupFns.forEach((fn) => fn())
      const remaining = this.boundElements
        .get(element)
        ?.filter((fn) => !cleanupFns.includes(fn))
      if (remaining?.length) {
        this.boundElements.set(element, remaining)
      } else {
        this.boundElements.delete(element)
      }
      if (this.debounceTimers.has(element)) {
        clearTimeout(this.debounceTimers.get(element)!)
        this.debounceTimers.delete(element)
      }
      this.unbindFns.delete(element)
    }

    this.unbindFns.set(element, unbind)
    return unbind
  }

  addIntent(name: string, definition: IntentDefinition): void {
    this.guardNotDestroyed('addIntent')
    if (typeof name !== 'string' || name === '') {
      throw new TypeError(
        `[intentmap] addIntent() expected name as a non-empty string, got ${name === null ? 'null' : typeof name}`
      )
    }
    if (typeof definition !== 'object' || definition === null) {
      throw new TypeError(
        `[intentmap] addIntent() expected definition as an object, got ${definition === null ? 'null' : typeof definition}`
      )
    }
    if (!Array.isArray(definition.patterns) || definition.patterns.length === 0) {
      throw new TypeError(
        '[intentmap] addIntent() expected definition.patterns as a non-empty array'
      )
    }
    for (const p of definition.patterns) {
      if (typeof p !== 'string') {
        throw new TypeError(
          '[intentmap] addIntent() expected definition.patterns to contain only strings'
        )
      }
    }
    this.matcher.addIntent(name, definition.patterns, definition.threshold)
  }

  removeIntent(name: string): void {
    this.guardNotDestroyed('removeIntent')
    if (typeof name !== 'string') {
      throw new TypeError(
        `[intentmap] removeIntent() expected name as a string, got ${name === null ? 'null' : typeof name}`
      )
    }
    this.matcher.removeIntent(name)
    this.handlers.delete(name)
  }

  train(intent: string, examples: string[]): void {
    this.guardNotDestroyed('train')
    if (typeof intent !== 'string') {
      throw new TypeError(
        `[intentmap] train() expected intent name as a string, got ${intent === null ? 'null' : typeof intent}`
      )
    }
    if (!Array.isArray(examples) || examples.length === 0) {
      throw new TypeError('[intentmap] train() expected a non-empty array of examples')
    }
    if (!this.matcher.getIntents().includes(intent)) {
      throw new Error(`[intentmap] train() intent "${intent}" not found`)
    }
    this.matcher.train(intent, examples)
  }

  getIntents(): string[] {
    this.guardNotDestroyed('getIntents')
    return this.matcher.getIntents()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    for (const [, timer] of this.debounceTimers) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
    for (const [, cleanupFns] of this.boundElements) {
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
  return target.textContent ?? target.innerText ?? ''
}
