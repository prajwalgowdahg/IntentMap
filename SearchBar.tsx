import React, { useState } from 'react'
import { useIntentMap, useIntent } from 'intentmap/react'
import { defineIntent } from 'intentmap'

export default function SearchBar() {
  const [status, setStatus] = useState('')
  const [confidence, setConfidence] = useState(0)

  const im = useIntentMap({
    defaultThreshold: 0.2,
    intents: {
      search: defineIntent(['search for', 'find', 'look up', 'show me', 'filter']),
      checkout: defineIntent(['buy', 'purchase', 'add to cart', 'order']),
      support: defineIntent(['help', 'broken', 'issue', 'not working', 'contact']),
    },
  })

  useIntent(im, 'search', (result) => {
    setStatus(`Searching... (${(result.confidence * 100).toFixed(0)}% confident)`)
    setConfidence(result.confidence)
  })

  useIntent(im, 'checkout', (result) => {
    setStatus(`Redirecting to checkout... (${(result.confidence * 100).toFixed(0)}%)`)
    setConfidence(result.confidence)
  })

  useIntent(im, 'support', (result) => {
    setStatus(`Opening support... (${(result.confidence * 100).toFixed(0)}%)`)
    setConfidence(result.confidence)
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = im.match(e.target.value)
    im.emit(result)
    if (!result.matched) {
      setStatus('')
      setConfidence(0)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <input
        type="text"
        placeholder="Type a command or search..."
        onChange={handleChange}
        style={{ width: '100%', fontSize: 16, padding: '8px 12px' }}
      />
      {status && (
        <p style={{ marginTop: 8, color: '#555' }}>
          {status}
          <span style={{ marginLeft: 8 }}>
            <progress value={confidence} max={1} />
          </span>
        </p>
      )}
    </div>
  )
}
