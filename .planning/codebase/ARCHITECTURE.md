# Architecture

**Analysis Date:** 2026-04-12

## Pattern Overview

**Overall:** Event-driven NLP pipeline with observer pattern, packaged as a zero-dependency TypeScript library.

**Key Characteristics:**
- Tokenization and TF-IDF-style vector matching for intent classification
- Blended scoring: cosine similarity (35%) + keyword overlap (65%)
- Observer/event-bus pattern for intent handlers (named handlers + wildcard `*`)
- DOM event binding for real-time UI intent detection
- Framework-agnostic core with optional React adapter
- No external runtime dependencies; zero-cost abstraction

## Layers

**Public API Layer:**
- Purpose: Exposes the library's consumer-facing interface
- Location: `index.ts`
- Contains: Factory function (`createIntentMap`), helper (`defineIntent`), re-exports from types and IntentMap
- Depends on: `IntentMap.ts`, `types.ts`
- Used by: Consumers of the library (direct import or via React adapter)

**Core Orchestration Layer:**
- Purpose: Coordinates matching, event emission, and DOM binding
- Location: `IntentMap.ts`
- Contains: `IntentMap` class implementing `IntentMapInstance` -- the central orchestrator
- Depends on: `matcher.ts`, `types.ts`
- Used by: `index.ts` (instantiation), `react.ts` (via `createIntentMap`)

**Matching Layer:**
- Purpose: Compares input text against stored intent patterns and produces scored results
- Location: `matcher.ts`
- Contains: `Matcher` class -- holds per-intent thresholds, delegates to `VectorStore`
- Depends on: `embeddings.ts`, `tokenizer.ts`, `types.ts`
- Used by: `IntentMap.ts`

**Embeddings / Vector Storage Layer:**
- Purpose: Builds TF-IDF-style token vectors, computes cosine similarity, manages pattern storage with caching
- Location: `embeddings.ts`
- Contains: `VectorStore` class, `buildVector()`, `cosineSimilarity()`, `keywordOverlap()`, `averageVectors()`
- Depends on: `tokenizer.ts`, `types.ts`
- Used by: `matcher.ts`

**Text Processing Layer:**
- Purpose: Tokenization, stop-word removal, n-gram generation, suffix-stripping stemming
- Location: `tokenizer.ts`
- Contains: `tokenize()`, `buildNgrams()`, `normalize()`, `stem()`
- Depends on: Nothing (leaf module)
- Used by: `embeddings.ts`, `matcher.ts`

**Type Definitions Layer:**
- Purpose: Shared TypeScript interfaces and types for the entire library
- Location: `types.ts`
- Contains: `IntentDefinition`, `IntentConfig`, `MatchResult`, `BoundEvent`, `IntentHandler`, `IntentMapInstance`, `BindOptions`, `TokenVector`
- Depends on: Nothing
- Used by: All other modules

**Adapter Layer:**
- Purpose: Framework-specific integrations (React hooks)
- Location: `react.ts`
- Contains: `useIntentMap()`, `useIntent()`, `useIntentBind()` hooks
- Depends on: `react` (peer dependency), `index.ts` (imports `createIntentMap`), `types.ts`
- Used by: React consumers importing from `intentmap/react`

**Example / Demo Layer:**
- Purpose: Demonstrates library usage in vanilla TypeScript and React
- Location: `demo.ts`, `SearchBar.tsx`
- Contains: Standalone usage examples
- Depends on: `index.ts`, `react.ts`

## Data Flow

**Intent Matching Flow:**

1. Consumer calls `im.match("I want to buy this item")` on an `IntentMapInstance`
2. `IntentMap.match()` delegates to `Matcher.match()` in `matcher.ts`
3. `Matcher.match()` calls `buildVector()` from `embeddings.ts` to tokenize and vectorize the input
4. `Matcher.match()` also tokenizes and stems the input for keyword overlap scoring
5. For each registered intent, `Matcher` retrieves the average pattern vector from `VectorStore.getAverage()` and computes cosine similarity
6. For each registered intent, `Matcher` calls `VectorStore.bestKeywordScore()` to find the best keyword overlap across all stored patterns
7. Blended score: `0.35 * cosine + 0.65 * keyword` for each intent
8. Top-scoring intent is compared against its threshold (per-intent or default 0.25)
9. A `MatchResult` object is returned with `matched`, `intent`, `confidence`, `scores`, and `input`

**Event Binding Flow:**

1. Consumer calls `im.bind(element, { on: 'input' })` on an `IntentMapInstance`
2. `IntentMap.bind()` attaches DOM event listeners on the given element
3. On each DOM event, text is extracted from the event target (`.value`, `.innerText`, `.textContent`, or `data-intent` attribute)
4. Extracted text is passed through `match()`, then `emit()` is called
5. `emit()` fires all handlers registered for the matched intent, plus wildcard handlers

**Training Flow:**

1. Consumer calls `im.train('checkout', ['new example phrase'])`
2. `IntentMap.train()` delegates to `Matcher.train()`
3. `Matcher.train()` passes phrases to `VectorStore.addAll()`
4. `VectorStore` tokenizes, stems, and vectorizes each phrase, storing them under the intent key and invalidating caches

**State Management:**
- All state is in-memory, held in class instances (`IntentMap`, `Matcher`, `VectorStore`)
- `VectorStore` maintains an average-vector cache and stem cache that are invalidated on mutation
- `IntentMap` tracks bound DOM elements for cleanup via `destroy()`
- No persistent state; configuration is provided at construction time

## Key Abstractions

**IntentMapInstance (interface in `types.ts`):**
- Purpose: Defines the full public contract of the library -- `match()`, `on()`, `off()`, `bind()`, `addIntent()`, `removeIntent()`, `train()`, `getIntents()`, `destroy()`
- Examples: `types.ts` (interface definition), `IntentMap.ts` (implementation)
- Pattern: Interface-based design; consumers depend on the interface, not the class

**TokenVector (type alias in `types.ts`):**
- Purpose: Represents a term-frequency vector as `Map<string, number>`
- Examples: `embeddings.ts` (used throughout), `types.ts` (definition)
- Pattern: Type alias for `Map<string, number>`; normalized vectors used for cosine similarity

**VectorStore (class in `embeddings.ts`):**
- Purpose: Stores pattern vectors per intent, provides average vectors and keyword overlap scores with internal caching
- Examples: `embeddings.ts`
- Pattern: Repository pattern with lazy cache invalidation

**Matcher (class in `matcher.ts`):**
- Purpose: Encapsulates the scoring algorithm and threshold logic, decoupled from event handling
- Examples: `matcher.ts`
- Pattern: Strategy encapsulation -- owns the matching algorithm and delegates vector operations to `VectorStore`

**defineIntent (helper in `index.ts`):**
- Purpose: Ergonomic helper to construct an `IntentDefinition` with optional `threshold` and `meta`
- Examples: `index.ts`, `demo.ts`, `SearchBar.tsx`, test files
- Pattern: Factory function with defaults

## Entry Points

**Package Entry (`index.ts`):**
- Location: `index.ts`
- Triggers: `import { createIntentMap, defineIntent } from 'intentmap'`
- Responsibilities: Re-exports `IntentMap` class and all types; provides `createIntentMap()` factory and `defineIntent()` helper

**React Adapter Entry (`react.ts`):**
- Location: `react.ts`
- Triggers: `import { useIntentMap, useIntent, useIntentBind } from 'intentmap/react'`
- Responsibilities: Provides React hooks wrapping the core API for declarative use

**Build Entry Points (configured in `tsup.config.ts`):**
- `src/index.ts` -> `dist/index.js` (ESM) + `dist/index.cjs` (CJS) + type declarations
- `src/adapters/react.ts` -> `dist/adapters/react.js` (ESM) + `dist/adapters/react.cjs` (CJS) + type declarations

## Error Handling

**Strategy:** Defensive with graceful degradation.

**Patterns:**
- `match()` always returns a `MatchResult` -- never throws. Unmatched input returns `{ matched: false, intent: null, confidence: 0, scores: {...}, input: "..." }`
- Empty/null extraction from DOM events short-circuits with early return (no match attempted)
- `stem()` returns short words (length <= 3) unchanged, avoiding over-stripping
- `VectorStore.getAverage()` returns an empty `Map` for unknown intents
- `buildVector()` handles zero-magnitude vectors (skips normalization)
- No try/catch blocks in the codebase -- input validation is structural rather than exception-based

## Cross-Cutting Concerns

**Logging:** Optional debug mode via `config.debug` flag. When enabled, `Matcher.match()` logs `console.debug('[intentmap] scores:', scores, 'for input:', input)` for every match call. Default is off.

**Validation:** No runtime validation of config objects. TypeScript types enforce correctness at compile time. Invalid or missing config values fall back to defaults (e.g., `defaultThreshold ?? 0.25`).

**Authentication:** Not applicable (fully client-side/offline library with no network calls).

**Memory Management:** `IntentMap.destroy()` is the primary cleanup path -- it removes all DOM event listeners, clears handler maps, and clears the matcher/vector store. The React adapter's `useIntentMap` hook calls `destroy()` in a `useEffect` cleanup.

## Build and Package Architecture

**Build Tool:** tsup (powered by esbuild)
- Dual format output: ESM (`dist/index.js`) + CJS (`dist/index.cjs`)
- Type declarations generated via `dts: true`
- React is externalized (`external: ['react']`) -- peer dependency only
- Tree-shaking enabled; `sideEffects: false` in package.json

**Package Exports:**
- `.` -> Core library (index)
- `./react` -> React adapter (hooks)
- Each export provides both ESM and CJS entry points with type declarations

**Important Discrepancy:** Source files currently reside at the project root (e.g., `index.ts`, `IntentMap.ts`), but `tsconfig.json` sets `"rootDir": "src"` and `tsup.config.ts` references `src/index.ts` and `src/adapters/react.ts`. Similarly, `vitest.config.ts` expects tests in `tests/` and coverage on `src/`. The `src/`, `tests/`, and `examples/` directories do not yet exist. This means the project needs a restructure before builds or tests can succeed. The `.npmignore` already lists `src/`, `tests/`, and `examples/`, confirming the intended structure.

---

*Architecture analysis: 2026-04-12*
