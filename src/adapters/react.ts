import { useCallback, useEffect, useRef, useState } from 'react'
import { createIntentMap } from '../index.js'
import type {
  IntentConfig,
  IntentHandler,
  IntentMapInstance,
  MatchResult,
} from '../types.js'

export function useIntentMap(config: IntentConfig, key?: unknown): IntentMapInstance {
  const instanceRef = useRef<IntentMapInstance | null>(null)
  const configRef = useRef(config)
  const keyRef = useRef(key)

  // Re-create instance when key changes (and previous key was defined)
  if (
    instanceRef.current === null ||
    (keyRef.current !== undefined && keyRef.current !== key)
  ) {
    if (instanceRef.current?.isAlive) {
      instanceRef.current.destroy()
    }
    instanceRef.current = createIntentMap(configRef.current)
  }

  // Always keep config ref up to date
  configRef.current = config
  keyRef.current = key

  useEffect(() => {
    const instance = instanceRef.current
    return () => {
      if (instance?.isAlive) {
        instance.destroy()
      }
    }
  }, [])

  return instanceRef.current
}

export function useIntent(
  im: IntentMapInstance,
  intent: string,
  handler: IntentHandler
): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  const stableWrapper = useRef((result: MatchResult, event?: Event) => {
    handlerRef.current(result, event)
  })

  useEffect(() => {
    if (!im.isAlive) {
      console.warn('[intentmap] useIntent: IntentMap instance has been destroyed')
      return
    }
    const off = im.on(intent, stableWrapper.current)
    return off
  }, [im, intent])
}

export function useIntentBind(
  im: IntentMapInstance,
  options?: {
    on?: string | string[]
    filter?: (result: MatchResult) => boolean
  }
) {
  const [lastMatch, setLastMatch] = useState<MatchResult | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)
  const unbindRef = useRef<(() => void) | null>(null)

  const bindRef = useCallback(
    (element: HTMLElement | null) => {
      // Clean up previous binding
      if (unbindRef.current) {
        unbindRef.current()
        unbindRef.current = null
      }

      if (!element) {
        elementRef.current = null
        return
      }

      elementRef.current = element

      if (!im.isAlive) {
        console.warn('[intentmap] useIntentBind: IntentMap instance has been destroyed')
        return
      }

      const unbind = im.bind(element, {
        ...options,
        extractor: (e) => {
          const t = e.target as HTMLInputElement
          return t.value ?? ''
        },
      })
      unbindRef.current = unbind
    },
    [im, options]
  )

  useEffect(() => {
    if (!im.isAlive) {
      console.warn('[intentmap] useIntentBind: IntentMap instance has been destroyed')
      return
    }
    const off = im.on('*', (result) => setLastMatch(result))
    return () => {
      off()
      if (unbindRef.current) {
        unbindRef.current()
        unbindRef.current = null
      }
    }
  }, [im])

  return { ref: bindRef, lastMatch }
}
