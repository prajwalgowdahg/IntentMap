import { describe, expect, it } from 'vitest'
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

describe('matchTopK()', () => {
  it('returns alternatives in descending confidence order', () => {
    const im = createIntentMap(config)
    const result = im.matchTopK('buy now')
    const alternatives = result.alternatives ?? []

    expect(alternatives).toHaveLength(3)
    expect(alternatives[0]?.intent).toBe('checkout')
    expect(alternatives[0]?.confidence ?? 0).toBeGreaterThanOrEqual(
      alternatives[1]?.confidence ?? 0
    )
    expect(alternatives[1]?.confidence ?? 0).toBeGreaterThanOrEqual(
      alternatives[2]?.confidence ?? 0
    )
  })

  it('keeps the top winner identical to match()', () => {
    const im = createIntentMap(config)
    const matchResult = im.match('look up sneakers')
    const rankedResult = im.matchTopK('look up sneakers', { limit: 4 })

    expect(rankedResult.intent).toBe(matchResult.intent)
    expect(rankedResult.confidence).toBe(matchResult.confidence)
    expect(rankedResult.alternatives?.[0]?.intent).toBe(matchResult.intent)
  })

  it('respects a limit larger than the number of intents', () => {
    const im = createIntentMap(config)
    const result = im.matchTopK('buy now', { limit: 10 })
    expect(result.alternatives).toHaveLength(4)
  })

  it('returns an empty alternatives list when limit is zero', () => {
    const im = createIntentMap(config)
    const result = im.matchTopK('buy now', { limit: 0 })
    expect(result.intent).toBe('checkout')
    expect(result.alternatives).toEqual([])
  })

  it('clamps negative limits to an empty alternatives list', () => {
    const im = createIntentMap(config)
    const result = im.matchTopK('buy now', { limit: -5 })
    expect(result.intent).toBe('checkout')
    expect(result.alternatives).toEqual([])
  })

  it('breaks score ties using intent insertion order', () => {
    const im = createIntentMap({
      intents: {
        first: defineIntent(['hello there']),
        second: defineIntent(['hello there']),
        third: defineIntent(['goodbye']),
      },
      defaultThreshold: 0.1,
    })

    const result = im.matchTopK('hello there', { limit: 2 })

    expect(result.intent).toBe('first')
    expect(result.alternatives?.map((entry) => entry.intent)).toEqual(['first', 'second'])
  })
})
