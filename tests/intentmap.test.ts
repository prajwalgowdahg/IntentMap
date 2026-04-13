import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createIntentMap, defineIntent } from '../src/index.js'

const config = {
  intents: {
    checkout: defineIntent([
      'buy now',
      'proceed to checkout',
      'place order',
      'complete purchase',
      'add to cart',
    ]),
    search: defineIntent([
      'search for',
      'find product',
      'look up',
      'show me results',
      'filter items',
    ]),
    cancel: defineIntent([
      'cancel order',
      'stop this',
      'abort',
      'nevermind',
      'go back',
      'undo',
    ]),
    support: defineIntent([
      'help me',
      'contact support',
      'report issue',
      'something is broken',
      'not working',
    ]),
  },
  defaultThreshold: 0.2,
}

describe('createIntentMap', () => {
  it('returns an IntentMapInstance', () => {
    const im = createIntentMap(config)
    expect(im).toBeDefined()
    expect(typeof im.match).toBe('function')
    expect(typeof im.matchTopK).toBe('function')
    expect(typeof im.on).toBe('function')
    expect(typeof im.bind).toBe('function')
  })
})

describe('IntentMap.match()', () => {
  let im: ReturnType<typeof createIntentMap>

  beforeEach(() => {
    im = createIntentMap(config)
  })

  it('matches exact patterns', () => {
    const result = im.match('buy now')
    expect(result.matched).toBe(true)
    expect(result.intent).toBe('checkout')
  })

  it('matches semantically similar input', () => {
    const result = im.match('I want to place my order')
    expect(result.matched).toBe(true)
    expect(result.intent).toBe('checkout')
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('matches search intent', () => {
    const result = im.match('look up red sneakers')
    expect(result.matched).toBe(true)
    expect(result.intent).toBe('search')
  })

  it('matches cancel intent', () => {
    const result = im.match('cancel my order please')
    expect(result.matched).toBe(true)
    expect(result.intent).toBe('cancel')
  })

  it('returns matched: false for unrecognised input', () => {
    const result = im.match('xyzzy foobar baz quux')
    expect(result.matched).toBe(false)
    expect(result.intent).toBeNull()
  })

  it('returns scores for all intents', () => {
    const result = im.match('complete purchase')
    expect(Object.keys(result.scores)).toEqual(
      expect.arrayContaining(['checkout', 'search', 'cancel', 'support'])
    )
  })

  it('includes the original input in result', () => {
    const input = 'proceed to checkout'
    const result = im.match(input)
    expect(result.input).toBe(input)
  })

  it('checkout scores highest for purchase input', () => {
    const result = im.match('add to cart')
    const checkoutScore = result.scores.checkout ?? 0
    const searchScore = result.scores.search ?? 0
    expect(checkoutScore).toBeGreaterThan(searchScore)
  })

  it('supports explain mode without changing the primary winner', () => {
    const plain = im.match('add to cart')
    const explained = im.match('add to cart', { explain: true })
    expect(explained.intent).toBe(plain.intent)
    expect(explained.confidence).toBe(plain.confidence)
    expect(explained.explanation).toBeDefined()
  })
})

describe('IntentMap.matchTopK()', () => {
  let im: ReturnType<typeof createIntentMap>

  beforeEach(() => {
    im = createIntentMap(config)
  })

  it('returns ranked alternatives while keeping the top winner consistent', () => {
    const single = im.match('buy now')
    const ranked = im.matchTopK('buy now')

    expect(ranked.intent).toBe(single.intent)
    expect(ranked.confidence).toBe(single.confidence)
    expect(ranked.alternatives).toBeDefined()
    expect(ranked.alternatives?.[0]?.intent).toBe(single.intent)
  })
})

describe('IntentMap.on()', () => {
  it('fires handler when intent matches', () => {
    const im = createIntentMap(config)
    const handler = vi.fn()
    im.on('checkout', handler)
    im.emit(im.match('add to cart'))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not fire handler for different intent', () => {
    const im = createIntentMap(config)
    const handler = vi.fn()
    im.on('cancel', handler)
    im.emit(im.match('buy now'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns an unsubscribe function', () => {
    const im = createIntentMap(config)
    const handler = vi.fn()
    const off = im.on('checkout', handler)
    off()
    im.emit(im.match('buy now'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('wildcard * fires for any matched result', () => {
    const im = createIntentMap(config)
    const handler = vi.fn()
    im.on('*', handler)
    im.emit(im.match('buy now'))
    im.emit(im.match('cancel order'))
    expect(handler).toHaveBeenCalledTimes(2)
  })
})

describe('IntentMap.addIntent() / removeIntent()', () => {
  it('adds a new intent dynamically', () => {
    const im = createIntentMap(config)
    im.addIntent('navigate', {
      patterns: ['go to page', 'navigate to', 'open page', 'redirect to'],
      threshold: 0.2,
    })
    const result = im.match('navigate to home page')
    expect(result.intent).toBe('navigate')
  })

  it('removes an intent', () => {
    const im = createIntentMap(config)
    im.removeIntent('cancel')
    expect(im.getIntents()).not.toContain('cancel')
  })
})

describe('IntentMap.train()', () => {
  it('improves matching with additional examples', () => {
    const im = createIntentMap(config)
    im.train('checkout', ['finish buying', 'ready to pay', 'confirm order'])
    const result = im.match('confirm order')
    expect(result.matched).toBe(true)
    expect(result.intent).toBe('checkout')
  })
})

describe('IntentMap.getIntents()', () => {
  it('returns all registered intent names', () => {
    const im = createIntentMap(config)
    const intents = im.getIntents()
    expect(intents).toEqual(
      expect.arrayContaining(['checkout', 'search', 'cancel', 'support'])
    )
  })
})

describe('IntentMap.destroy()', () => {
  it('cleans up without throwing', () => {
    const im = createIntentMap(config)
    im.on('checkout', () => {})
    expect(() => im.destroy()).not.toThrow()
  })
})
