import { useEffect, useRef, useCallback, useState } from 'react'
import { createIntentMap } from '../index.js'
import type { IntentConfig, IntentMapInstance, MatchResult, IntentHandler } from '../types.js'

export function useIntentMap(config: IntentConfig): IntentMapInstance {
  const ref = useRef<IntentMapInstance | null>(null)
  if (!ref.current) {
    ref.current = createIntentMap(config)
  }
  useEffect(() => () => ref.current?.destroy(), [])
  return ref.current
}

export function useIntent(
  im: IntentMapInstance,
  intent: string,
  handler: IntentHandler,
  deps: unknown[] = []
): void {
  useEffect(() => {
    const off = im.on(intent, handler)
    return off
  }, [im, intent, ...deps])
}

export function useIntentBind(
  im: IntentMapInstance,
  options?: {
    on?: string | string[]
    filter?: (result: MatchResult) => boolean
  }
) {
  const [lastMatch, setLastMatch] = useState<MatchResult | null>(null)
  const ref = useRef<HTMLElement | null>(null)

  const bindRef = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return
      ref.current = element
      im.bind(element, {
        ...options,
        extractor: (e) => {
          const t = e.target as HTMLInputElement
          return t.value ?? ''
        },
      })
    },
    [im]
  )

  useEffect(() => {
    const off = im.on('*', (result) => setLastMatch(result))
    return off
  }, [im])

  return { ref: bindRef, lastMatch }
}
