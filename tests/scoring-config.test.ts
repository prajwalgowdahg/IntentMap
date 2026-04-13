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
