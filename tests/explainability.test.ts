import { describe, expect, it } from 'vitest'
import { createIntentMap, defineIntent } from '../src/index.js'

describe('explain mode', () => {
  it('returns matchedPattern, keywordHits, and topSignals when enabled', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now', 'proceed to checkout', 'complete purchase']),
        search: defineIntent(['find product', 'look up item']),
      },
      defaultThreshold: 0.2,
    })

    const result = im.match('buy now', { explain: true })

    expect(result.explanation).toBeDefined()
    expect(result.explanation?.matchedPattern).toBe('buy now')
    expect(result.explanation?.keywordHits).toEqual(['buy', 'now'])
    expect(result.explanation?.topSignals).toContain('keyword overlap')
    expect(result.explanation?.topSignals).toContain('cosine similarity')
    expect(result.explanation?.topSignals).toContain('threshold pass')
  })

  it('does not include explanation when explain mode is off', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now']),
      },
    })

    const result = im.match('buy now')
    expect(result.explanation).toBeUndefined()
  })

  it('returns explanation and alternatives together for matchTopK()', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now', 'place order']),
        search: defineIntent(['search for', 'find product']),
        support: defineIntent(['help me', 'contact support']),
      },
      defaultThreshold: 0.2,
    })

    const result = im.matchTopK('buy now', { limit: 2, explain: true })

    expect(result.alternatives).toHaveLength(2)
    expect(result.explanation).toBeDefined()
    expect(result.explanation?.matchedPattern).toBe('buy now')
  })

  it('uses original pattern order as the final tie-breaker for explanations', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now please', 'please buy now']),
      },
      defaultThreshold: 0.2,
    })

    const result = im.match('buy now', { explain: true })

    expect(result.explanation?.matchedPattern).toBe('buy now please')
  })

  it('omits explanation when there are no intents to explain', () => {
    const im = createIntentMap({ intents: {} })
    const result = im.match('hello', { explain: true })
    expect(result.explanation).toBeUndefined()
  })
})
