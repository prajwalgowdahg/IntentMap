# intentmap

> Map UI events and text to semantic user intents — locally, offline, zero dependencies.

[![npm version](https://img.shields.io/npm/v/intentmap)](https://www.npmjs.com/package/intentmap)
[![bundle size](https://img.shields.io/bundlephobia/minzip/intentmap)](https://bundlephobia.com/package/intentmap)
[![license](https://img.shields.io/npm/l/intentmap)](LICENSE)
[![CI](https://github.com/prajwalgowdahg/IntentMap/actions/workflows/ci.yml/badge.svg)](https://github.com/prajwalgowdahg/IntentMap/actions/workflows/ci.yml)

**intentmap** sits between your event handlers and business logic. You define intents with example phrases — intentmap matches incoming text to them in real-time using local vector similarity. No API keys. No network calls. No cold starts.

```
user types: "I want to finish my purchase" → { intent: "checkout", confidence: 0.84 }
```

---

## Install

```bash
npm install intentmap
# or
pnpm add intentmap
# or
yarn add intentmap
```

---

## Quick start

```typescript
import { createIntentMap, defineIntent } from 'intentmap'

const im = createIntentMap({
  intents: {
    checkout: defineIntent([
      'buy now',
      'proceed to checkout',
      'place order',
      'complete purchase',
    ]),
    search: defineIntent([
      'search for',
      'find product',
      'look up',
      'show me results',
    ]),
    cancel: defineIntent([
      'cancel order',
      'go back',
      'never mind',
      'abort',
    ], { threshold: 0.35 }),
  },
  defaultThreshold: 0.25,
})

// One-shot matching
const result = im.match('I want to complete my purchase')
// { matched: true, intent: 'checkout', confidence: 0.82, scores: {...} }

// Event-driven
im.on('checkout', (result) => console.log('checkout:', result.confidence))
im.on('cancel', (result) => console.log('cancel:', result.confidence))
im.on('*', (result) => console.log('any match:', result.intent))

// Emit manually
im.emit(im.match('never mind'))
```

---

## API

### `createIntentMap(config)`

Creates a new IntentMap instance.

```typescript
const im = createIntentMap({
  intents: Record<string, IntentDefinition>,
  defaultThreshold?: number,   // default: 0.25
  caseSensitive?: boolean,     // default: false
  debug?: boolean,             // default: false
})
```

### `defineIntent(patterns, options?)`

Helper to define an intent with patterns and optional config.

```typescript
defineIntent(
  ['buy now', 'add to cart'],
  { threshold: 0.3, meta: { route: '/checkout' } }
)
```

### `im.match(input)`

Synchronously scores `input` against all intents.

```typescript
const result: MatchResult = im.match('look up sneakers')
// {
//   matched:    true,
//   intent:     'search',
//   confidence: 0.76,
//   scores:     { search: 0.76, checkout: 0.02, cancel: 0.01 },
//   input:      'look up sneakers'
// }
```

### `im.on(intent, handler)` → `unsubscribe()`

Register a handler that fires when `intent` is matched. Use `'*'` to catch all results.

```typescript
const off = im.on('checkout', (result, event) => { ... })
off() // unsubscribe
```

### `im.off(intent, handler)`

Remove a specific handler.

### `im.emit(result, event?)`

Manually trigger handlers for a match result.

### `im.bind(element, options?)` → `unbind()`

Attach intentmap to a DOM element. Fires matching handlers on every event.

```typescript
const unbind = im.bind(searchInput, {
  on: 'input',                            // event type(s)
  extractor: (e) => e.target.value,       // how to extract text
  filter: (result) => result.confidence > 0.5,  // optional gate
})
unbind() // clean up
```

### `im.addIntent(name, definition)`

Dynamically add an intent after creation.

```typescript
im.addIntent('navigate', {
  patterns: ['go to', 'open page', 'navigate to'],
  threshold: 0.3,
})
```

### `im.removeIntent(name)`

Remove an intent and its handlers.

### `im.train(intent, examples)`

Add more example phrases to sharpen matching for an intent.

```typescript
im.train('checkout', ['ready to pay', 'confirm my order'])
```

### `im.getIntents()` → `string[]`

List all registered intent names.

### `im.destroy()`

Unbind all DOM listeners, clear all handlers and intents. Call on component unmount.

---

## React

```typescript
import { defineIntent } from 'intentmap'
import { useIntentMap, useIntent } from 'intentmap/react'

function SearchBar() {
  const im = useIntentMap({
    intents: {
      search:   defineIntent(['search for', 'find', 'look up']),
      checkout: defineIntent(['buy', 'purchase', 'add to cart']),
    },
  })

  useIntent(im, 'search', (result) => console.log('searching!', result.confidence))
  useIntent(im, 'checkout', (result) => console.log('checkout!', result.confidence))

  return (
    <input
      onChange={(e) => im.emit(im.match(e.target.value))}
      placeholder="Type to search or buy..."
    />
  )
}
```

---

## How it works

intentmap uses **TF-IDF-inspired vector similarity** with bigram tokenisation:

1. Each pattern is tokenised and converted into a weighted term-frequency vector
2. Intent vectors are averaged across all their patterns
3. On `match()`, the input is vectorised and cosine similarity is computed against each intent
4. The highest-scoring intent above `threshold` wins

Everything runs synchronously in ~1ms. No WASM, no model files, no network.

---

## Benchmarks

| Input length | Intents | Match time |
|---|---|---|
| short (1–5 words) | 10 | ~0.3ms |
| medium (5–20 words) | 10 | ~0.6ms |
| long (20–50 words) | 20 | ~1.1ms |

---

## Bundle size

| Export | Size (minzipped) |
|---|---|
| `intentmap` (core) | ~3.2 kB |
| `intentmap/react` | ~1.1 kB |

---

## License

MIT
