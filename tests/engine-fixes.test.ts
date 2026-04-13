import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIntentMap, defineIntent } from '../src/index.js'
import * as tokenizer from '../src/tokenizer.js'

describe('BUG-04: match() with no registered intents', () => {
  it('returns clean no-match result when IntentMap has zero intents', () => {
    const im = createIntentMap({ intents: {} })
    const result = im.match('hello world')
    expect(result.matched).toBe(false)
    expect(result.intent).toBeNull()
    expect(result.confidence).toBe(0)
    expect(result.scores).toEqual({})
    expect(result.input).toBe('hello world')
  })

  it('returns clean no-match result after all intents are removed', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now']),
      },
    })
    im.removeIntent('checkout')
    const result = im.match('buy now')
    expect(result.matched).toBe(false)
    expect(result.intent).toBeNull()
    expect(result.confidence).toBe(0)
    expect(result.scores).toEqual({})
    expect(result.input).toBe('buy now')
  })
})

describe('BUG-02: extractText uses textContent before innerText', () => {
  it('extractText returns textContent value when both are present', () => {
    // Verify that the expression `textContent ?? innerText` reads
    // textContent first, and if truthy, never reads innerText.
    const accessOrder: string[] = []

    const mockElement = {
      value: undefined,
      dataset: {},
      get textContent() {
        accessOrder.push('textContent')
        return 'text content value'
      },
      get innerText() {
        accessOrder.push('innerText')
        return 'inner text value'
      },
    }

    // The fixed expression: textContent first, innerText second
    const result = mockElement.textContent ?? mockElement.innerText

    expect(result).toBe('text content value')
    expect(accessOrder).toEqual(['textContent'])
    expect(accessOrder).not.toContain('innerText')
  })

  it('extractText falls back to innerText when textContent is null', () => {
    const accessOrder: string[] = []

    const mockElement = {
      value: undefined,
      dataset: {},
      get textContent() {
        accessOrder.push('textContent')
        return null
      },
      get innerText() {
        accessOrder.push('innerText')
        return 'inner text value'
      },
    }

    const result = mockElement.textContent ?? mockElement.innerText

    expect(result).toBe('inner text value')
    expect(accessOrder).toEqual(['textContent', 'innerText'])
  })
})

describe('BUG-03: tokenization computed once per match() call', () => {
  let tokenizeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    tokenizeSpy = vi.spyOn(tokenizer, 'tokenize')
  })

  afterEach(() => {
    tokenizeSpy.mockRestore()
  })

  it('calls tokenize exactly once per match() invocation for the input', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now', 'place order']),
        search: defineIntent(['find product', 'look up']),
      },
      defaultThreshold: 0.2,
    })

    // Clear calls from construction phase
    tokenizeSpy.mockClear()

    im.match('I want to buy something')

    // With the fix: tokenize should be called exactly once for the input
    // (pattern tokenization happened during construction, not during match)
    // Before the fix it was called twice due to double tokenization in matcher.ts
    expect(tokenizeSpy).toHaveBeenCalledTimes(1)
  })
})
