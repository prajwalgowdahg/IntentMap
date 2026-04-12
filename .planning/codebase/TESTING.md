# Testing Patterns

**Analysis Date:** 2026-04-12

## Test Framework

**Runner:**
- Vitest v2.0.5
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in `expect` (compatible with Jest API)
- Uses `expect.arrayContaining()`, `expect.toBeGreaterThan()`, etc.

**Run Commands:**
```bash
npm test               # vitest run (single run)
npm run test:watch     # vitest (watch mode)
npm run test:coverage  # vitest run --coverage
```

## Test File Organization

**Location:**
- Currently at project root: `intentmap.test.ts`, `tokenizer.test.ts`
- Config expects `tests/**/*.test.ts` (tests in a `tests/` directory)
- Tests import source from `../src/` (expecting `src/` directory layout)
- This is a structural discrepancy: test files and source files are both at root level, but imports assume a `src/` and `tests/` directory structure

**Naming:**
- Source file: `tokenizer.ts` -> Test file: `tokenizer.test.ts`
- Source file: `IntentMap.ts` (via `index.ts`) -> Test file: `intentmap.test.ts`
- Pattern: `{module}.test.ts`

**Expected Structure (based on config):**
```
tests/
  tokenizer.test.ts
  intentmap.test.ts
src/
  index.ts
  IntentMap.ts
  matcher.ts
  tokenizer.ts
  embeddings.ts
  types.ts
  adapters/
    react.ts
```

## Test Structure

**Suite Organization:**
Tests use `describe()`/`it()` blocks with clear hierarchical grouping. Each `describe` covers one method or concept:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createIntentMap, defineIntent } from '../src/index.js'

describe('IntentMap.match()', () => {
  let im: ReturnType<typeof createIntentMap>

  beforeEach(() => {
    im = createIntentMap(config)
  })

  it('matches exact patterns', () => {
    const result = im.match('buy now')
    expect(result.matched).toBe(true)
    expect(result.intent).toBe('checkout')
  })
})
```

**Patterns:**
- **Setup:** Use `beforeEach()` for fresh instances per test (avoids state leakage)
- **Teardown:** No explicit teardown needed; `destroy()` is tested as functionality
- **Assertion style:** Multiple assertions per test for result objects (check `matched`, `intent`, `confidence` together)
- **Globals:** `globals: true` in vitest config means `describe`, `it`, `expect` are available globally, but tests still import them explicitly from `vitest` (belt-and-suspenders approach)

## Mocking

**Framework:** Vitest built-in (`vi`)

**Patterns:**
```typescript
import { vi } from 'vitest'

it('fires handler when intent matches', () => {
  const im = createIntentMap(config)
  const handler = vi.fn()
  im.on('checkout', handler)
  im.emit(im.match('add to cart'))
  expect(handler).toHaveBeenCalledOnce()
})
```

**What to Mock:**
- Event handlers: Use `vi.fn()` to create spy functions for verifying callback invocations
- Assertions on mocks: `toHaveBeenCalledOnce()`, `not.toHaveBeenCalled()`, `toHaveBeenCalledTimes(n)`

**What NOT to Mock:**
- The IntentMap class itself -- tests use the real implementation
- The matcher/tokenizer/embeddings -- tested through integration
- No mocking of internal modules; tests exercise the full stack from `createIntentMap()` through tokenization and vector matching

**Mocking style:** Lightweight spying only. No deep mocking or module mocking used.

## Fixtures and Factories

**Test Data:**
A shared config object is defined at the top of test files as a module-level constant:

```typescript
const config = {
  intents: {
    checkout: defineIntent(['buy now', 'proceed to checkout', 'place order', 'complete purchase', 'add to cart']),
    search: defineIntent(['search for', 'find product', 'look up', 'show me results', 'filter items']),
    cancel: defineIntent(['cancel order', 'stop this', 'abort', 'nevermind', 'go back', 'undo']),
    support: defineIntent(['help me', 'contact support', 'report issue', 'something is broken', 'not working']),
  },
  defaultThreshold: 0.2,
}
```

**Location:**
- Fixtures defined inline at the top of each test file
- No shared fixture files or test helper modules
- No dedicated `fixtures/` or `helpers/` directory

**Factory pattern:**
- Use `createIntentMap(config)` in tests to get fresh instances
- Use `defineIntent()` helper to construct intent definitions in test data

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**Configuration:**
```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['src/**/*.ts'],
  exclude: ['src/adapters/**'],
}
```

**View Coverage:**
```bash
npm run test:coverage   # generates text, JSON, and HTML reports
```

**Coverage scope:**
- Includes: all `.ts` files under `src/`
- Excludes: `src/adapters/` (React hooks not coverage-tracked)

## Test Types

**Unit Tests:**
- Scope: Individual pure functions (tokenization, stemming, normalization)
- Approach: Direct function import, test input/output with no side effects
- Example: `tokenizer.test.ts` tests `tokenize()`, `buildNgrams()`, `normalize()` in isolation
- Assertions are specific and granular: checking individual array contents

**Integration Tests:**
- Scope: Full IntentMap lifecycle through public API
- Approach: Create instance via `createIntentMap()`, exercise `match()`, `on()`, `emit()`, `train()`, `addIntent()`, `removeIntent()`, `destroy()`
- Example: `intentmap.test.ts` tests end-to-end matching from text input through tokenization and vector comparison to final result
- Tests verify cross-cutting behavior: event handlers fire correctly, dynamic intent addition works, training improves matching

**E2E Tests:** Not used

**Missing test coverage:**
- `embeddings.ts` has no dedicated test file (tested indirectly via `intentmap.test.ts`)
- `matcher.ts` has no dedicated test file (tested indirectly via `intentmap.test.ts`)
- `react.ts` hooks have no tests
- `SearchBar.tsx` component has no tests
- DOM binding (`IntentMap.bind()`) has no tests (requires DOM environment)
- The `stem()` function in `tokenizer.ts` is not directly tested (only tested indirectly through matching)

## Common Patterns

**Async Testing:**
- Not used. All core functions are synchronous. No async/await in tests.

**Error Testing:**
```typescript
it('cleans up without throwing', () => {
  const im = createIntentMap(config)
  im.on('checkout', () => {})
  expect(() => im.destroy()).not.toThrow()
})
```
- Uses `expect(() => fn()).not.toThrow()` for verifying safe cleanup
- No negative error path testing (no tests for invalid input handling)

**Negative assertions:**
```typescript
it('returns matched: false for unrecognised input', () => {
  const result = im.match('xyzzy foobar baz quux')
  expect(result.matched).toBe(false)
  expect(result.intent).toBeNull()
})
```

**Comparison assertions:**
```typescript
it('checkout scores highest for purchase input', () => {
  const result = im.match('add to cart')
  const checkoutScore = result.scores['checkout'] ?? 0
  const searchScore = result.scores['search'] ?? 0
  expect(checkoutScore).toBeGreaterThan(searchScore)
})
```

**Test independence:**
- Each test creates its own IntentMap instance (via `beforeEach` or inline)
- No shared mutable state between tests
- No test ordering dependencies

## Vitest Configuration Details

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,           // describe/it/expect available globally
    environment: 'node',     // Node.js environment (no jsdom)
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/adapters/**'],
    },
  },
})
```

**Environment:** Node -- DOM-dependent code (`.bind()`, React hooks) cannot be tested without adding `jsdom` or `happy-dom` environment. The current config does not support testing DOM interactions.

---

*Testing analysis: 2026-04-12*
