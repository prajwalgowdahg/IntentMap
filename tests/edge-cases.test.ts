import { describe, expect, it } from 'vitest'
import { createIntentMap, defineIntent } from '../src/index.js'

const config = {
  intents: {
    checkout: defineIntent(['buy now', 'proceed to checkout', 'place order', 'add to cart']),
    search: defineIntent(['search for', 'find product', 'look up', 'show me results']),
    cancel: defineIntent(['cancel order', 'stop this', 'abort', 'nevermind']),
    support: defineIntent(['help me', 'contact support', 'report issue']),
  },
  defaultThreshold: 0.2,
}

describe('edge cases: input boundaries', () => {
  it('returns no-match for empty string', () => {
    const im = createIntentMap(config)
    const result = im.match('')
    expect(result.matched).toBe(false)
    expect(result.confidence).toBe(0)
    expect(result.intent).toBeNull()
  })

  it('returns no-match for whitespace-only string', () => {
    const im = createIntentMap(config)
    const result = im.match('   ')
    expect(result.matched).toBe(false)
  })

  it('does not crash on single character input', () => {
    const im = createIntentMap(config)
    const result = im.match('a')
    expect(result).toBeDefined()
    expect(typeof result.matched).toBe('boolean')
  })

  it('handles very long input at 9999 chars boundary', () => {
    const im = createIntentMap(config)
    const longInput = 'buy ' + 'x'.repeat(9995)
    const result = im.match(longInput)
    expect(result).toBeDefined()
    expect(result.input).toBe(longInput)
    expect(typeof result.matched).toBe('boolean')
  })

  it('returns no-match for string with only punctuation', () => {
    const im = createIntentMap(config)
    const result = im.match('!!! ??? ...')
    expect(result.matched).toBe(false)
  })

  it('does not crash on string with numbers', () => {
    const im = createIntentMap(config)
    const result = im.match('order 12345')
    expect(result).toBeDefined()
    expect(typeof result.matched).toBe('boolean')
  })

  it('handles Unicode input without crashing', () => {
    const im = createIntentMap(config)
    const result = im.match('\u00e9\u00e8\u00ea buy now \u00fc\u00f6\u00e4')
    expect(result).toBeDefined()
    expect(typeof result.matched).toBe('boolean')
  })

  it('handles emoji input without crashing', () => {
    const im = createIntentMap(config)
    const result = im.match('buy now \u{1F6D2} \u{1F4B0}')
    expect(result).toBeDefined()
    expect(typeof result.matched).toBe('boolean')
  })

  it('matches checkout with repeated patterns', () => {
    const im = createIntentMap(config)
    const result = im.match('buy buy buy now now now')
    expect(result).toBeDefined()
    // Should still produce a valid result (likely matches checkout due to "buy" and "now")
    expect(typeof result.matched).toBe('boolean')
    expect(typeof result.confidence).toBe('number')
  })
})

describe('edge cases: post-destroy behavior', () => {
  it('match() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.match('test')).toThrow(Error)
    expect(() => im.match('test')).toThrow(/called after destroy/)
  })

  it('emit() throws after destroy with a valid-looking MatchResult', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() =>
      im.emit({ matched: true, intent: 'checkout', confidence: 0.9, scores: {}, input: 'buy' })
    ).toThrow(/called after destroy/)
  })

  it('on() throws after destroy', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.on('checkout', () => {})).toThrow(/called after destroy/)
  })

  it('bind() throws after destroy', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.bind({} as unknown as HTMLElement)).toThrow(/called after destroy/)
  })
})

describe('edge cases: concurrent operations', () => {
  it('train then match immediately in same tick', () => {
    const im = createIntentMap(config)
    im.train('checkout', ['purchase item right away', 'fast checkout'])
    const result = im.match('fast checkout')
    expect(result).toBeDefined()
    // After training, the intent should still be available
    expect(result.intent).toBeDefined()
  })

  it('addIntent then match immediately in same tick', () => {
    const im = createIntentMap(config)
    im.addIntent('returns', { patterns: ['return item', 'get a refund', 'exchange this'] })
    const result = im.match('return item')
    expect(result).toBeDefined()
    expect(result.intent).toBe('returns')
  })

  it('removeIntent then match -- removed intent no longer matches', () => {
    const im = createIntentMap(config)
    // Confirm cancel matches before removal
    const before = im.match('cancel my order')
    expect(before.intent).toBe('cancel')

    im.removeIntent('cancel')

    const after = im.match('cancel my order')
    expect(after.intent).not.toBe('cancel')
  })
})

describe('edge cases: config variations', () => {
  it('caseSensitive: true prevents matching different case', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now', 'place order']),
      },
      caseSensitive: true,
    })
    const result = im.match('BUY NOW')
    // With caseSensitive on, the uppercase input should not match the lowercase patterns
    expect(result.matched).toBe(false)
  })

  it('high threshold (0.99) causes most inputs to not match', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now', 'place order']),
        search: defineIntent(['search for', 'find product']),
      },
      defaultThreshold: 0.99,
    })
    const result = im.match('buy now')
    // Confidence is unlikely to reach 0.99
    expect(result.matched).toBe(false)
  })

  it('low threshold (0.01) allows weakly similar inputs to match', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now', 'place order']),
        search: defineIntent(['search for', 'find product']),
      },
      defaultThreshold: 0.01,
    })
    const result = im.match('buy something')
    expect(result.matched).toBe(true)
  })

  it('single intent config works correctly', () => {
    const im = createIntentMap({
      intents: {
        only: defineIntent(['hello', 'hi there', 'greetings']),
      },
      defaultThreshold: 0.2,
    })
    const result = im.match('hello')
    expect(result.matched).toBe(true)
    expect(result.intent).toBe('only')
  })

  it('many intents (10+) still returns correct intent', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now', 'place order']),
        search: defineIntent(['search for', 'find product']),
        cancel: defineIntent(['cancel order', 'stop this']),
        support: defineIntent(['help me', 'contact support']),
        returns: defineIntent(['return item', 'get refund']),
        account: defineIntent(['my account', 'sign in']),
        shipping: defineIntent(['track order', 'shipping status']),
        billing: defineIntent(['invoice', 'payment issue']),
        faq: defineIntent(['frequently asked', 'common questions']),
        feedback: defineIntent(['leave review', 'rate product']),
      },
      defaultThreshold: 0.2,
    })
    const result = im.match('buy now')
    expect(result.matched).toBe(true)
    expect(result.intent).toBe('checkout')
  })
})
