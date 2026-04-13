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

describe('createIntentMap config validation', () => {
  it('throws TypeError when given null', () => {
    expect(() => createIntentMap(null as unknown as Record<string, unknown>)).toThrow(
      TypeError
    )
    expect(() => createIntentMap(null as unknown as Record<string, unknown>)).toThrow(
      /\[intentmap\] createIntentMap\(\) expected a config object/
    )
  })

  it('throws TypeError when given undefined', () => {
    expect(() =>
      createIntentMap(undefined as unknown as Record<string, unknown>)
    ).toThrow(TypeError)
  })

  it('throws TypeError when config.intents is null', () => {
    expect(() =>
      createIntentMap({ intents: null } as unknown as Record<string, unknown>)
    ).toThrow(TypeError)
    expect(() =>
      createIntentMap({ intents: null } as unknown as Record<string, unknown>)
    ).toThrow(/\[intentmap\] createIntentMap\(\) config\.intents/)
  })

  it('throws TypeError when patterns is an empty array', () => {
    expect(() => createIntentMap({ intents: { x: { patterns: [] } } })).toThrow(TypeError)
  })

  it('throws TypeError when patterns contains non-strings', () => {
    expect(() =>
      createIntentMap({ intents: { x: { patterns: [123] } } } as unknown as Record<
        string,
        unknown
      >)
    ).toThrow(TypeError)
  })

  it('throws TypeError when defaultThreshold is not a number', () => {
    expect(() =>
      createIntentMap({
        intents: { x: { patterns: ['hello'] } },
        defaultThreshold: 'bad',
      } as unknown as Record<string, unknown>)
    ).toThrow(TypeError)
  })

  it('succeeds with empty intents object', () => {
    const im = createIntentMap({ intents: {} })
    expect(im).toBeDefined()
    expect(im.getIntents()).toEqual([])
  })

  it('succeeds with unknown extra properties', () => {
    const im = createIntentMap({
      intents: { x: { patterns: ['hello'] } },
      extraProp: 'allowed',
    } as Record<string, unknown>)
    expect(im).toBeDefined()
  })
})

describe('match() input validation', () => {
  it('throws TypeError for number input', () => {
    const im = createIntentMap(config)
    expect(() => im.match(42 as unknown as string)).toThrow(TypeError)
    expect(() => im.match(42 as unknown as string)).toThrow(
      /\[intentmap\] match\(\) expected a string, got number/
    )
  })

  it('throws TypeError for null input', () => {
    const im = createIntentMap(config)
    expect(() => im.match(null as unknown as string)).toThrow(TypeError)
    expect(() => im.match(null as unknown as string)).toThrow(/got null/)
  })
})

describe('match() max length', () => {
  it('returns no-match for string > 10000 chars (does not throw)', () => {
    const im = createIntentMap(config)
    const longInput = 'a'.repeat(10_001)
    const result = im.match(longInput)
    expect(result.matched).toBe(false)
    expect(result.intent).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it('works normally for string at exactly 10000 chars', () => {
    const im = createIntentMap(config)
    const boundaryInput = `buy now ${'x'.repeat(10_000 - 8)}`
    const result = im.match(boundaryInput)
    expect(result).toBeDefined()
    expect(result.input).toBe(boundaryInput)
    expect(typeof result.matched).toBe('boolean')
  })
})

describe('on() validation', () => {
  it('throws TypeError when intent is a number', () => {
    const im = createIntentMap(config)
    expect(() => im.on(123 as unknown as string, () => {})).toThrow(TypeError)
    expect(() => im.on(123 as unknown as string, () => {})).toThrow(
      /\[intentmap\] on\(\) expected intent name/
    )
  })

  it('throws TypeError when handler is not a function', () => {
    const im = createIntentMap(config)
    expect(() => im.on('name', 'notfn' as unknown as () => void)).toThrow(TypeError)
    expect(() => im.on('name', 'notfn' as unknown as () => void)).toThrow(
      /\[intentmap\] on\(\) expected handler/
    )
  })
})

describe('addIntent() validation', () => {
  it('throws TypeError when name is a number', () => {
    const im = createIntentMap(config)
    expect(() => im.addIntent(123 as unknown as string, { patterns: ['hello'] })).toThrow(
      TypeError
    )
  })

  it('throws TypeError when name is empty string', () => {
    const im = createIntentMap(config)
    expect(() => im.addIntent('', { patterns: ['hello'] })).toThrow(TypeError)
  })

  it('throws TypeError when patterns is empty', () => {
    const im = createIntentMap(config)
    expect(() => im.addIntent('name', { patterns: [] })).toThrow(TypeError)
  })
})

describe('train() validation', () => {
  it('throws TypeError when intent is a number', () => {
    const im = createIntentMap(config)
    expect(() => im.train(123 as unknown as string, ['x'])).toThrow(TypeError)
  })

  it('throws Error when intent does not exist', () => {
    const im = createIntentMap(config)
    expect(() => im.train('missing', ['x'])).toThrow(Error)
    expect(() => im.train('missing', ['x'])).toThrow(/not found/)
  })

  it('throws TypeError when examples is empty', () => {
    const im = createIntentMap(config)
    expect(() => im.train('checkout', [])).toThrow(TypeError)
  })

  it('throws TypeError when examples is not an array', () => {
    const im = createIntentMap(config)
    expect(() => im.train('checkout', 'notarray' as unknown as string[])).toThrow(
      TypeError
    )
  })
})

describe('bind() validation', () => {
  it('throws TypeError when element is null', () => {
    const im = createIntentMap(config)
    expect(() => im.bind(null as unknown as HTMLElement, {})).toThrow(TypeError)
    expect(() => im.bind(null as unknown as HTMLElement, {})).toThrow(/HTMLElement/)
  })
})

describe('destroy-state guards', () => {
  it('match() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.match('test')).toThrow(Error)
    expect(() => im.match('test')).toThrow(/called after destroy/)
  })

  it('on() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.on('checkout', () => {})).toThrow(/called after destroy/)
  })

  it('emit() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() =>
      im.emit({ matched: false, intent: null, confidence: 0, scores: {}, input: '' })
    ).toThrow(/called after destroy/)
  })

  it('bind() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.bind({} as unknown as HTMLElement)).toThrow(/called after destroy/)
  })

  it('addIntent() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.addIntent('new', { patterns: ['hello'] })).toThrow(
      /called after destroy/
    )
  })

  it('removeIntent() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.removeIntent('checkout')).toThrow(/called after destroy/)
  })

  it('train() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.train('checkout', ['example'])).toThrow(/called after destroy/)
  })

  it('getIntents() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.getIntents()).toThrow(/called after destroy/)
  })

  it('off() throws Error after destroy()', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.off('checkout', () => {})).toThrow(/called after destroy/)
  })
})

describe('destroy() idempotency', () => {
  it('does not throw when called twice', () => {
    const im = createIntentMap(config)
    im.destroy()
    expect(() => im.destroy()).not.toThrow()
  })
})
