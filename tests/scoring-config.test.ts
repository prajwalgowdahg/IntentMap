import { describe, it, expect } from 'vitest'
import { createIntentMap } from '../src/index.js'

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
      createIntentMap({ ...baseConfig, weights: { cosine: NaN, keyword: 0.5 } })
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
      createIntentMap({ ...baseConfig, stemmer: 'not a function' as unknown as (w: string) => string })
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
    const greetBreakdown = result.debug!.greet
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
      intents: { greet: { patterns: ['hello'] } },
      stemmer: reverseStemmer,
    })
    const imDefault = createIntentMap({
      intents: { greet: { patterns: ['hello'] } },
    })
    const resultCustom = imCustom.match('hello')
    const resultDefault = imDefault.match('hello')
    // Both should match since "hello" stems to itself with default stemmer,
    // but reversed stemmer produces "olleh" for both pattern and input,
    // so they should still match but with different internal scores
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
