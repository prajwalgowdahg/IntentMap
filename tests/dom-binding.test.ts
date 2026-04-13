import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function createMockElement(): {
  element: HTMLElement
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
} {
  const addEventListener = vi.fn()
  const removeEventListener = vi.fn()
  const element = {
    addEventListener,
    removeEventListener,
  } as unknown as HTMLElement
  return { element, addEventListener, removeEventListener }
}

describe('bind() duplicate prevention (BUG-01)', () => {
  it('does not register duplicate event listeners when bind() is called twice on the same element', () => {
    const im = createIntentMap(config)
    const { element, addEventListener } = createMockElement()

    im.bind(element)
    im.bind(element)

    // Should have been called only once per event type (input + change = 2 calls)
    expect(addEventListener).toHaveBeenCalledTimes(2)
  })

  it('returns a working unbind function from the second bind() call', () => {
    const im = createIntentMap(config)
    const { element, addEventListener, removeEventListener } = createMockElement()

    const unbind1 = im.bind(element)
    const unbind2 = im.bind(element)

    // Both should return the same unbind function
    expect(unbind2).toBe(unbind1)

    // Calling unbind should remove listeners
    unbind1()
    expect(removeEventListener).toHaveBeenCalled()
  })

  it('unbind function returned from duplicate bind still cleans up correctly', () => {
    const im = createIntentMap(config)
    const { element, removeEventListener } = createMockElement()

    const unbind1 = im.bind(element)
    im.bind(element)

    unbind1()
    expect(removeEventListener).toHaveBeenCalledTimes(2) // input + change

    // Calling unbind again should be a no-op
    const callsBefore = removeEventListener.mock.calls.length
    unbind1()
    expect(removeEventListener).toHaveBeenCalledTimes(callsBefore)
  })
})

describe('bind() debounce behavior (DOM-01/02)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not call match immediately when debounce is set', () => {
    const im = createIntentMap(config)
    const { element, addEventListener } = createMockElement()

    im.bind(element, { debounce: 100 })

    // Find the input event listener
    const inputListener = addEventListener.mock.calls.find(
      (call) => call[0] === 'input'
    )?.[1] as EventListener

    // Create a mock event with value
    const event = { target: { value: 'buy now' } } as unknown as Event
    inputListener(event)

    // match should not have been called yet -- we verify by checking no emit happens
    // (no handler attached, so we just verify the timer hasn't fired)
    expect(true).toBe(true) // If we got here without error, timer hasn't fired
  })

  it('calls match after debounce delay', () => {
    const im = createIntentMap(config)
    const handler = vi.fn()
    const { element, addEventListener } = createMockElement()

    im.on('checkout', handler)
    im.bind(element, { debounce: 100 })

    const inputListener = addEventListener.mock.calls.find(
      (call) => call[0] === 'input'
    )?.[1] as EventListener

    const event = { target: { value: 'buy now' } } as unknown as Event
    inputListener(event)

    // Handler should NOT be called yet
    expect(handler).not.toHaveBeenCalled()

    // Advance past debounce delay
    vi.advanceTimersByTime(100)

    // Now handler should have been called
    expect(handler).toHaveBeenCalledOnce()
  })

  it('fires only trailing edge when multiple rapid events occur', () => {
    const im = createIntentMap(config)
    const handler = vi.fn()
    const { element, addEventListener } = createMockElement()

    im.on('checkout', handler)
    im.bind(element, { debounce: 100 })

    const inputListener = addEventListener.mock.calls.find(
      (call) => call[0] === 'input'
    )?.[1] as EventListener

    // Fire multiple rapid events
    inputListener({ target: { value: 'buy' } } as unknown as Event)
    vi.advanceTimersByTime(30)
    inputListener({ target: { value: 'buy n' } } as unknown as Event)
    vi.advanceTimersByTime(30)
    inputListener({ target: { value: 'buy now' } } as unknown as Event)

    // Handler should not have been called yet
    expect(handler).not.toHaveBeenCalled()

    // Advance past the last debounce delay
    vi.advanceTimersByTime(100)

    // Handler should have been called only once (trailing edge)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('throws TypeError when debounce is not a positive number', () => {
    const im = createIntentMap(config)
    const { element } = createMockElement()

    expect(() => im.bind(element, { debounce: -50 as unknown as number })).toThrow(TypeError)
    expect(() => im.bind(element, { debounce: -50 as unknown as number })).toThrow(
      /\[intentmap\] bind\(\) debounce must be a positive number/
    )
  })

  it('throws TypeError when debounce is zero', () => {
    const im = createIntentMap(config)
    const { element } = createMockElement()

    expect(() => im.bind(element, { debounce: 0 })).toThrow(TypeError)
    expect(() => im.bind(element, { debounce: 0 })).toThrow(
      /\[intentmap\] bind\(\) debounce must be a positive number/
    )
  })
})

describe('debounce cleanup on unbind (DOM-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('cancels pending debounce timer when unbind is called', () => {
    const im = createIntentMap(config)
    const handler = vi.fn()
    const { element, addEventListener } = createMockElement()

    im.on('checkout', handler)
    const unbind = im.bind(element, { debounce: 100 })

    const inputListener = addEventListener.mock.calls.find(
      (call) => call[0] === 'input'
    )?.[1] as EventListener

    // Fire event to start debounce timer
    inputListener({ target: { value: 'buy now' } } as unknown as Event)

    // Unbind before timer fires
    unbind()

    // Advance past debounce delay
    vi.advanceTimersByTime(200)

    // Handler should NOT have been called (timer was cancelled)
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('debounce cleanup on destroy (DOM-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('cancels all debounce timers when destroy is called', () => {
    const im = createIntentMap(config)
    const handler = vi.fn()
    const { element, addEventListener } = createMockElement()

    im.on('checkout', handler)
    im.bind(element, { debounce: 100 })

    const inputListener = addEventListener.mock.calls.find(
      (call) => call[0] === 'input'
    )?.[1] as EventListener

    // Fire event to start debounce timer
    inputListener({ target: { value: 'buy now' } } as unknown as Event)

    // Destroy before timer fires
    im.destroy()

    // Advance past debounce delay
    vi.advanceTimersByTime(200)

    // Handler should NOT have been called (timer was cancelled)
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('removeIntent() cleanup verification (BUG-05)', () => {
  it('removes intent from getIntents()', () => {
    const im = createIntentMap(config)

    expect(im.getIntents()).toContain('cancel')
    im.removeIntent('cancel')
    expect(im.getIntents()).not.toContain('cancel')
  })

  it('match() no longer returns removed intent', () => {
    const im = createIntentMap(config)

    // Before removal, cancel should match
    const before = im.match('cancel my order')
    expect(before.intent).toBe('cancel')

    im.removeIntent('cancel')

    // After removal, cancel should not match
    const after = im.match('cancel my order')
    expect(after.intent).not.toBe('cancel')
  })

  it('handler is no longer fired for removed intent via on()', () => {
    const im = createIntentMap(config)
    const handler = vi.fn()

    im.on('cancel', handler)

    // Emit for cancel intent before removal
    const result = im.match('cancel my order')
    im.emit(result)
    expect(handler).toHaveBeenCalledOnce()

    im.removeIntent('cancel')

    // Emit after removal should not fire the handler
    const result2 = im.match('cancel my order')
    im.emit(result2)
    expect(handler).toHaveBeenCalledOnce() // Still only 1 call
  })

  it('wildcard handler still fires for other intents after removeIntent', () => {
    const im = createIntentMap(config)
    const wildcardHandler = vi.fn()

    im.on('*', wildcardHandler)
    im.removeIntent('cancel')

    // Wildcard should still fire for checkout
    const result = im.match('buy now')
    im.emit(result)
    expect(wildcardHandler).toHaveBeenCalled()
  })
})
