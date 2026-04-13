import { describe, expect, it } from 'vitest'
import { buildNgrams, normalize, stem, tokenize } from '../src/tokenizer.js'

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

describe('stem()', () => {
  it.each([
    // ing suffix (length > 6): word must be 7+ chars
    ['running', 'runn'], // 7 > 6, strips 'ing'
    ['painting', 'paint'], // 8 > 6, strips 'ing'
    ['caring', 'caring'], // 6 is NOT > 6, unchanged (boundary)
    // tion suffix (length > 6): word must be 7+ chars
    ['fraction', 'frac'], // 8 > 6, strips 'tion'
    ['creation', 'crea'], // 8 > 6, strips 'tion'
    ['action', 'action'], // 6 is NOT > 6, unchanged (boundary)
    // ness suffix (length > 6): word must be 7+ chars
    ['happiness', 'happi'], // 9 > 6, strips 'ness'
    ['darkness', 'dark'], // 8 > 6, strips 'ness'
    ['sadness', 'sad'], // 7 > 6, strips 'ness'
    // ment suffix (length > 6): word must be 7+ chars
    ['movement', 'move'], // 8 > 6, strips 'ment'
    ['agreement', 'agree'], // 9 > 6, strips 'ment'
    ['enjoyment', 'enjoy'], // 9 > 6, strips 'ment'
    // ed suffix (length > 5): word must be 6+ chars
    ['walked', 'walk'], // 6 > 5, strips 'ed'
    ['jumped', 'jump'], // 6 > 5, strips 'ed'
    ['hoped', 'hoped'], // 5 is NOT > 5, unchanged (boundary)
    ['cared', 'cared'], // 5 is NOT > 5, unchanged (boundary)
    // er suffix (length > 5): word must be 6+ chars
    ['runner', 'runn'], // 6 > 5, strips 'er'
    ['teacher', 'teach'], // 7 > 5, strips 'er'
    ['player', 'play'], // 6 > 5, strips 'er'
    // ly suffix (length > 5): word must be 6+ chars
    ['quickly', 'quick'], // 7 > 5, strips 'ly'
    ['softly', 'soft'], // 6 > 5, strips 'ly'
    ['badly', 'badly'], // 5 is NOT > 5, unchanged (boundary)
    // es suffix (length > 4): word must be 5+ chars
    ['buses', 'bus'], // 5 > 4, strips 'es'
    ['boxes', 'box'], // 5 > 4, strips 'es'
    ['wishes', 'wish'], // 6 > 4, strips 'es'
    // s suffix (length > 4): word must be 5+ chars
    ['tests', 'test'], // 5 > 4, strips 's'
    ['hello', 'hello'], // 5 > 4 but does not end in 's', unchanged
    ['runs', 'runs'], // 4 is NOT > 4, unchanged (boundary)
    ['maps', 'maps'], // 4 is NOT > 4, unchanged (boundary)
    // Short-word guards (length <= 3 returns unchanged)
    ['run', 'run'],
    ['the', 'the'],
    ['go', 'go'],
    ['a', 'a'],
    ['an', 'an'],
    // Additional boundary: 'goes' (4 chars)
    ['goes', 'goes'], // 4 is NOT > 4 for 'es' or 's', unchanged
    // 'boxed' (5 chars) -- 'ed' needs > 5, false. Falls through all rules.
    ['boxed', 'boxed'],
    // Words with no matching suffix rule
    ['world', 'world'],
    ['python', 'python'],
  ] as const)('stem("%s") => "%s"', (input, expected) => {
    expect(stem(input)).toBe(expected)
  })
})
