import { describe, expect, it } from 'vitest'
import { buildNgrams, normalize, tokenize } from '../src/tokenizer.js'

describe('tokenize()', () => {
  it('lowercases by default', () => {
    expect(tokenize('Buy Now')).toContain('buy')
  })

  it('removes stop words', () => {
    const tokens = tokenize('I want to buy this item')
    expect(tokens).not.toContain('i')
    expect(tokens).not.toContain('to')
    expect(tokens).not.toContain('this')
    expect(tokens).toContain('buy')
    expect(tokens).toContain('item')
  })

  it('strips punctuation', () => {
    const tokens = tokenize('hello, world!')
    expect(tokens).toContain('hello')
    expect(tokens).toContain('world')
  })

  it('respects caseSensitive option', () => {
    const tokens = tokenize('Buy Now', true)
    expect(tokens).toContain('Buy')
  })
})

describe('buildNgrams()', () => {
  it('includes unigrams', () => {
    const ng = buildNgrams(['buy', 'item'], 2)
    expect(ng).toContain('buy')
    expect(ng).toContain('item')
  })

  it('includes bigrams', () => {
    const ng = buildNgrams(['buy', 'item', 'now'], 2)
    expect(ng).toContain('buy_item')
    expect(ng).toContain('item_now')
  })
})

describe('normalize()', () => {
  it('lowercases and trims', () => {
    expect(normalize('  Hello World  ')).toBe('hello world')
  })

  it('removes punctuation', () => {
    expect(normalize('order: confirmed!')).toBe('order confirmed')
  })
})
