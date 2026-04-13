import { createIntentMap, defineIntent } from '../src/index.js'

const im = createIntentMap({
  defaultThreshold: 0.2,
  debug: false,
  intents: {
    checkout: defineIntent([
      'buy now',
      'proceed to checkout',
      'place order',
      'complete purchase',
      'add to cart',
    ]),
    search: defineIntent([
      'search for products',
      'find items',
      'look up',
      'show me results',
      'filter by category',
    ]),
    cancel: defineIntent([
      'cancel order',
      'stop this',
      'abort',
      'never mind',
      'go back',
    ], { threshold: 0.3 }),
    support: defineIntent([
      'help me',
      'contact support',
      'something is broken',
      'report issue',
      'not working',
    ]),
  },
})

im.on('checkout', (result) => {
  console.log(`[checkout] confidence=${result.confidence.toFixed(2)}`)
})

im.on('*', (result) => {
  if (!result.matched) {
    console.log(`[no match] input="${result.input}"`)
  }
})

const inputs = [
  'I want to complete my purchase',
  'Can you help me find red sneakers?',
  'Something is broken on the page',
  'Cancel my subscription please',
  'foobar baz quux',
]

console.log('\n--- intentmap demo ---\n')
for (const input of inputs) {
  const result = im.match(input)
  console.log(`input:      "${input}"`)
  console.log(`intent:     ${result.intent ?? 'none'}`)
  console.log(`confidence: ${result.confidence.toFixed(3)}`)
  console.log(`matched:    ${result.matched}`)
  console.log('---')
  im.emit(result)
}

im.train('checkout', ['finish buying', 'ready to pay', 'confirm order'])
console.log('\nAfter training:')
const trained = im.match('ready to pay for my items')
console.log(`"ready to pay for my items" → ${trained.intent} (${trained.confidence.toFixed(3)})`)

im.destroy()
