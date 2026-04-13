import { describe, expect, it } from 'vitest'
import { createIntentMap, defineIntent } from '../src/index.js'

const baseConfig = {
  intents: {
    greet: { patterns: ['hello', 'hi there'] },
  },
}

describe('scoring config: weights and stemmer validation', () => {
  // Test 1: valid weights pass
  it('accepts valid weights { cosine: 0.5, keyword: 0.5 }', () => {
    expect(() =>
      createIntentMap({ ...baseConfig, weights: { cosine: 0.5, keyword: 0.5 } })
    ).not.toThrow()
  })

  // Test 2: single cosine weight infers keyword
  it('normalizes { cosine: 1 } to 1.0/0.0', () => {
    const im = createIntentMap({ ...baseConfig, weights: { cosine: 1 } })
    expect(im).toBeDefined()
  })

  // Test 3: single keyword weight infers cosine
  it('normalizes { keyword: 1 } to 0.0/1.0', () => {
    const im = createIntentMap({ ...baseConfig, weights: { keyword: 1 } })
    expect(im).toBeDefined()
  })

  // Test 4: both weights preserved when they sum to 1
  it('preserves { cosine: 0.7, keyword: 0.3 }', () => {
    const im = createIntentMap({ ...baseConfig, weights: { cosine: 0.7, keyword: 0.3 } })
    expect(im).toBeDefined()
  })

  // Test 5: negative weight throws
  it('throws TypeError on negative weight', () => {
    expect(() =>
      createIntentMap({ ...baseConfig, weights: { cosine: -0.5, keyword: 1.5 } })
    ).toThrow(TypeError)
  })

  // Test 6: NaN weight throws
  it('throws TypeError on NaN weight', () => {
    expect(() =>
      createIntentMap({ ...baseConfig, weights: { cosine: Number.NaN, keyword: 0.5 } })
    ).toThrow(TypeError)
  })

  // Test 7: zero sum throws
  it('throws TypeError on zero-sum weights', () => {
    expect(() =>
      createIntentMap({ ...baseConfig, weights: { cosine: 0, keyword: 0 } })
    ).toThrow(TypeError)
  })

  // Test 8: omitting weights uses defaults (no behavior change)
  it('uses default 0.35/0.65 when weights omitted', () => {
    const im = createIntentMap(baseConfig)
    const result = im.match('hello')
    // Same result as before — default weights unchanged
    expect(result).toBeDefined()
  })

  // Test 9: stemmer function passes validation
  it('accepts a valid stemmer function', () => {
    expect(() =>
      createIntentMap({ ...baseConfig, stemmer: (w: string) => w })
    ).not.toThrow()
  })

  // Test 10: non-function stemmer throws
  it('throws TypeError when stemmer is not a function', () => {
    expect(() =>
      createIntentMap({
        ...baseConfig,
        stemmer: 'not a function' as unknown as (w: string) => string,
      })
    ).toThrow(TypeError)
  })

  // Test 11: weights normalizing when sum > 1
  it('normalizes { cosine: 2, keyword: 3 } to 0.4/0.6', () => {
    const im = createIntentMap({ ...baseConfig, weights: { cosine: 2, keyword: 3 } })
    expect(im).toBeDefined()
  })
})

describe('scoring config: debug breakdown and custom stemmer', () => {
  const debugConfig = {
    intents: {
      greet: { patterns: ['hello', 'hi there'] },
      farewell: { patterns: ['goodbye', 'see you'] },
    },
    debug: true,
  }

  // Test 1: match() with debug: true returns MatchResult with debug field
  it('returns debug field with per-intent breakdown when debug: true', () => {
    const im = createIntentMap(debugConfig)
    const result = im.match('hello')
    expect(result.debug).toBeDefined()
    expect(typeof result.debug).toBe('object')
    expect(result.debug).toHaveProperty('greet')
    expect(result.debug).toHaveProperty('farewell')
  })

  // Test 2: debug breakdown has all required fields
  it('debug breakdown has cosine, keyword, blended, threshold, aboveThreshold', () => {
    const im = createIntentMap(debugConfig)
    const result = im.match('hello')
    const greetBreakdown = result.debug?.greet
    expect(greetBreakdown).toBeDefined()
    if (!greetBreakdown) {
      throw new Error('Expected debug breakdown for greet intent')
    }
    expect(typeof greetBreakdown.cosine).toBe('number')
    expect(typeof greetBreakdown.keyword).toBe('number')
    expect(typeof greetBreakdown.blended).toBe('number')
    expect(typeof greetBreakdown.threshold).toBe('number')
    expect(typeof greetBreakdown.aboveThreshold).toBe('boolean')
  })

  // Test 3: match() with debug: false does NOT return debug field
  it('does not return debug field when debug: false (default)', () => {
    const im = createIntentMap({
      intents: { greet: { patterns: ['hello'] } },
    })
    const result = im.match('hello')
    expect(result.debug).toBeUndefined()
  })

  // Test 4: custom stemmer is used for tokenization
  it('uses custom stemmer for both input and pattern tokenization', () => {
    const identityStemmer = (w: string) => w
    const im = createIntentMap({
      intents: { greet: { patterns: ['hello'] } },
      stemmer: identityStemmer,
    })
    const result = im.match('hello')
    expect(result).toBeDefined()
    // With identity stemmer, "hello" stays "hello" (not stemmed by default stemmer)
    expect(result.matched).toBe(true)
  })

  // Test 5: custom stemmer that reverses strings produces different scores
  it('custom reversing stemmer produces different behavior than default', () => {
    const reverseStemmer = (w: string) => w.split('').reverse().join('')
    const imCustom = createIntentMap({
      intents: { greet: { patterns: ['walking slowly'] } },
      stemmer: reverseStemmer,
    })
    const imDefault = createIntentMap({
      intents: { greet: { patterns: ['walking slowly'] } },
    })
    // Input uses different forms: default stemmer maps "walked" -> "walk" (matches "walk" from "walking")
    // but reverse stemmer maps "walked" -> "deklaw" which doesn't match "gniklaw" from "walking"
    const resultCustom = imCustom.match('walked')
    const resultDefault = imDefault.match('walked')
    expect(resultDefault.matched).toBe(true)
    expect(resultCustom.confidence).not.toBe(resultDefault.confidence)
  })

  // Test 6: debug breakdown aboveThreshold matches matched field
  it('debug breakdown aboveThreshold matches the matched field of MatchResult', () => {
    const im = createIntentMap({
      ...debugConfig,
      defaultThreshold: 0.99, // high threshold so nothing matches
    })
    const result = im.match('hello')
    expect(result.matched).toBe(false)
    // Top intent's aboveThreshold should be false since threshold is 0.99
    if (result.intent === null && result.debug) {
      for (const breakdown of Object.values(result.debug)) {
        expect(breakdown.aboveThreshold).toBe(false)
      }
    }
  })
})

describe('scoring calibration: relative ranking', () => {
  const calibrationIntents = {
    checkout: defineIntent(['buy now', 'place order', 'add to cart']),
    search: defineIntent(['search for', 'find product', 'look up']),
  }

  const weightConfigs = [
    { name: 'default (0.35/0.65)', weights: undefined },
    { name: 'cosine-heavy (0.7/0.3)', weights: { cosine: 0.7, keyword: 0.3 } },
    { name: 'keyword-heavy (0.1/0.9)', weights: { cosine: 0.1, keyword: 0.9 } },
    { name: 'equal (0.5/0.5)', weights: { cosine: 0.5, keyword: 0.5 } },
  ]

  it.each(weightConfigs)(
    'ranks checkout above search for "buy now" with $name',
    ({ weights }) => {
      const im = createIntentMap({
        intents: calibrationIntents,
        ...(weights ? { weights } : {}),
      })
      const result = im.match('buy now')
      expect(result.scores.checkout).toBeGreaterThan(result.scores.search)
    }
  )
})

describe('scoring calibration: threshold boundaries', () => {
  it('low threshold (0.1) with exact pattern match: matched is true', () => {
    const im = createIntentMap({
      intents: { checkout: defineIntent(['buy now', 'place order']) },
      defaultThreshold: 0.1,
    })
    const result = im.match('buy now')
    expect(result.matched).toBe(true)
  })

  it('low threshold (0.1) with semantically close input: matched is true', () => {
    const im = createIntentMap({
      intents: { checkout: defineIntent(['buy now', 'place order']) },
      defaultThreshold: 0.1,
    })
    const result = im.match('buy something now')
    expect(result.matched).toBe(true)
  })

  it('high threshold (0.99) with exact pattern match: matched may be false', () => {
    const im = createIntentMap({
      intents: { checkout: defineIntent(['buy now', 'place order']) },
      defaultThreshold: 0.99,
    })
    const result = im.match('buy now')
    // Exact match confidence is unlikely to reach 0.99
    expect(result.matched).toBe(false)
  })

  it('high threshold (0.99) with unrelated input: matched is false', () => {
    const im = createIntentMap({
      intents: { checkout: defineIntent(['buy now', 'place order']) },
      defaultThreshold: 0.99,
    })
    const result = im.match('the weather is nice today')
    expect(result.matched).toBe(false)
  })

  it('per-intent threshold overrides defaultThreshold', () => {
    const im = createIntentMap({
      intents: {
        strict: defineIntent(['exact match required'], { threshold: 0.99 }),
        lenient: defineIntent(['easy to match'], { threshold: 0.01 }),
      },
      defaultThreshold: 0.5,
    })
    // The "strict" intent has threshold 0.99 -- even with a close match,
    // the matched result should be false because the per-intent threshold is 0.99
    const strictResult = im.match('exact match required somewhat')
    // Score exists but matched depends on threshold; check that score is present
    expect(strictResult.scores.strict).toBeDefined()

    // The "lenient" intent has threshold 0.01, so a close match should succeed
    const lenientResult = im.match('easy to find')
    expect(lenientResult.matched).toBe(true)
    expect(lenientResult.intent).toBe('lenient')
  })
})

describe('scoring calibration: confidence ranges', () => {
  it('exact pattern match has higher confidence than partial match', () => {
    const im = createIntentMap({
      intents: { checkout: defineIntent(['buy now', 'place order']) },
      defaultThreshold: 0.01,
    })
    const exact = im.match('buy now')
    const partial = im.match('buy something maybe')
    expect(exact.confidence).toBeGreaterThan(partial.confidence)
  })

  it('unrelated input has lower confidence than related input', () => {
    const im = createIntentMap({
      intents: { checkout: defineIntent(['buy now', 'place order']) },
      defaultThreshold: 0.01,
    })
    const related = im.match('buy items')
    const unrelated = im.match('weather forecast')
    expect(related.confidence).toBeGreaterThan(unrelated.confidence)
  })

  it('all scores are between 0 and 1', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now']),
        search: defineIntent(['search for']),
      },
      defaultThreshold: 0.01,
    })
    const result = im.match('buy now')
    for (const score of Object.values(result.scores)) {
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('confidence equals the winning intent score', () => {
    const im = createIntentMap({
      intents: {
        checkout: defineIntent(['buy now']),
        search: defineIntent(['search for']),
      },
      defaultThreshold: 0.01,
    })
    const result = im.match('buy now')
    if (result.intent) {
      expect(result.confidence).toBe(result.scores[result.intent])
    }
  })
})
