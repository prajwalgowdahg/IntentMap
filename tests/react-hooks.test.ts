// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIntent, useIntentBind, useIntentMap } from '../src/adapters/react.js'
import { createIntentMap, defineIntent } from '../src/index.js'
import type { IntentMapInstance } from '../src/types.js'

const config = {
  intents: { greet: defineIntent(['hello', 'hi there']) },
  defaultThreshold: 0.2,
}

describe('useIntentMap', () => {
  it('creates a working IntentMapInstance', () => {
    const { result } = renderHook(() => useIntentMap(config))
    expect(result.current.isAlive).toBe(true)
    expect(typeof result.current.match).toBe('function')
  })

  it('destroys instance on unmount', () => {
    const { result, unmount } = renderHook(() => useIntentMap(config))
    const instance = result.current
    expect(instance.isAlive).toBe(true)
    unmount()
    expect(instance.isAlive).toBe(false)
  })

  it('re-creates instance when key changes', () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useIntentMap(config, key),
      { initialProps: { key: 'a' } }
    )
    const firstInstance = result.current
    expect(firstInstance.isAlive).toBe(true)

    rerender({ key: 'b' })
    expect(result.current).not.toBe(firstInstance)
    expect(firstInstance.isAlive).toBe(false)
    expect(result.current.isAlive).toBe(true)
  })

  it('does not re-create when key is undefined and re-render happens', () => {
    const { result, rerender } = renderHook(() => useIntentMap(config))
    const firstInstance = result.current
    rerender()
    expect(result.current).toBe(firstInstance)
  })
})

describe('useIntent', () => {
  // Use createIntentMap directly to control lifecycle independently.
  // Using useIntentMap here would cause cleanup-order issues: the map hook
  // destroys the instance first, then useIntent's cleanup calls off() on the
  // already-destroyed instance, which throws.
  let im: IntentMapInstance
  let hookResult: ReturnType<typeof renderHook> | null = null

  afterEach(() => {
    // Unmount hook first so React cleanup (off()) runs while instance is alive,
    // then destroy the externally-created instance.
    if (hookResult) {
      hookResult.unmount()
      hookResult = null
    }
    if (im?.isAlive) im.destroy()
  })

  it('fires handler when intent matches', () => {
    im = createIntentMap(config)
    const handler = vi.fn()
    hookResult = renderHook(() => useIntent(im, 'greet', handler))

    const matchResult = im.match('hello')
    im.emit(matchResult)

    expect(handler).toHaveBeenCalledOnce()
  })

  it('uses latest handler without re-subscription', () => {
    im = createIntentMap(config)
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()
    hookResult = renderHook(
      ({ handler }: { handler: typeof firstHandler }) => useIntent(im, 'greet', handler),
      { initialProps: { handler: firstHandler } }
    )

    hookResult.rerender({ handler: secondHandler })

    const matchResult = im.match('hello')
    im.emit(matchResult)

    expect(firstHandler).not.toHaveBeenCalled()
    expect(secondHandler).toHaveBeenCalledOnce()
  })

  it('does not fire handler for non-matching intent', () => {
    im = createIntentMap(config)
    const handler = vi.fn()
    hookResult = renderHook(() => useIntent(im, 'checkout', handler))

    // Emit a greet match -- should NOT trigger checkout handler
    const matchResult = im.match('hello')
    im.emit(matchResult)

    // Handler should not fire because the intent name 'checkout' doesn't match 'greet'
    expect(handler).not.toHaveBeenCalled()
  })
})

function BindTestComponent({ im }: { im: IntentMapInstance }) {
  const { ref, lastMatch } = useIntentBind(im)
  return React.createElement(
    'div',
    null,
    React.createElement('input', { ref, 'data-testid': 'input' }),
    React.createElement('span', { 'data-testid': 'result' }, lastMatch?.intent ?? 'none')
  )
}

describe('useIntentBind', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('binds to input and updates lastMatch on input event', () => {
    const im = createIntentMap(config)
    render(React.createElement(BindTestComponent, { im }))

    const input = screen.getByTestId('input')
    act(() => {
      fireEvent.input(input, { target: { value: 'hello' } })
    })

    expect(screen.getByTestId('result').textContent).toBe('greet')
  })

  it('cleans up binding on unmount', () => {
    const im = createIntentMap(config)
    const { unmount } = render(React.createElement(BindTestComponent, { im }))

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow()
    expect(im.isAlive).toBe(true)
  })

  it('handles destroyed instance gracefully', () => {
    const im = createIntentMap(config)
    im.destroy()

    // Suppress expected console.warn from hook
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Rendering with a destroyed instance should not crash
    expect(() => {
      render(React.createElement(BindTestComponent, { im }))
    }).not.toThrow()

    expect(warnSpy).toHaveBeenCalled()
  })
})
