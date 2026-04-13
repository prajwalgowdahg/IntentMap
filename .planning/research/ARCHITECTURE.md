# Architecture Patterns

**Domain:** TypeScript npm library (intent matching)
**Researched:** 2026-04-12

## Recommended Architecture

The target architecture is a layered, single-direction dependency flow within `src/`, with framework adapters isolated behind a subpath export boundary.

```
src/
  index.ts              -- Public API surface (barrel)
  core/
    IntentMap.ts         -- Orchestrator: events, DOM binding, lifecycle
    matcher.ts           -- Scoring engine: blended cosine + keyword
    types.ts             -- Shared interfaces and type aliases
  engine/
    vector-store.ts      -- Vector storage, TF-IDF vectors, similarity
    tokenizer.ts         -- Tokenization, stemming, n-grams
  utils/
    validate.ts          -- Input validation helpers and type guards
    errors.ts            -- Custom error classes and error factory functions
  adapters/
    react.ts             -- React hooks (subpath export: intentmap/react)

tests/
  core.test.ts           -- IntentMap + Matcher integration tests
  matcher.test.ts        -- Scoring unit tests
  tokenizer.test.ts      -- Tokenization unit tests
  vector-store.test.ts   -- VectorStore unit tests
  validate.test.ts       -- Validation helper tests
  react.test.tsx         -- React hook tests (with react test utils)
  edge-cases.test.ts     -- Unicode, empty input, destroy, concurrent ops

examples/
  demo.ts                -- Vanilla TypeScript usage
  SearchBar.tsx           -- React component example
```

### Why This Structure Over the Flat Layout

The current flat layout (`index.ts`, `IntentMap.ts`, `matcher.ts`, etc. all at root) has three problems: (1) every tool config already expects `src/` so the build is broken, (2) there is no visual grouping to signal module boundaries, and (3) adding a second adapter (Vue, Svelte) would mean more files at root with no organization signal.

The `src/core/` vs `src/engine/` split matters because it enforces the existing dependency direction. `core` orchestrates and exposes the API. `engine` does the mathematical work. They never import from each other in the wrong direction. Putting `vector-store.ts` in `engine/` instead of keeping it alongside `IntentMap.ts` makes it visually obvious that VectorStore is a data-level component, not an orchestration component.

The `utils/` directory is deliberately small: only `validate.ts` and `errors.ts`. This is not a junk drawer. Validation is a cross-cutting concern that every module needs but should not duplicate. Error types need a single home so that error messages are consistent. If you find yourself wanting to add a third file here, stop and ask whether it belongs in `core/` or `engine/` instead.

### Component Boundaries

| Component | Responsibility | Communicates With | Does NOT Communicate With |
|-----------|---------------|-------------------|--------------------------|
| `index.ts` | Public API barrel. Re-exports types, factory, class. | `core/IntentMap`, `core/types` | `engine/*`, `utils/*` (never directly) |
| `core/IntentMap.ts` | Orchestrator. Event system, DOM binding, lifecycle, delegates matching. | `core/matcher`, `core/types`, `utils/validate`, `utils/errors` | `engine/*` (accessed only through Matcher) |
| `core/matcher.ts` | Scoring engine. Blended cosine + keyword, threshold logic. | `engine/vector-store`, `engine/tokenizer`, `core/types` | `core/IntentMap` (Matcher does not know about IntentMap) |
| `engine/vector-store.ts` | Vector storage, TF-IDF vectorization, cosine similarity, keyword overlap. | `engine/tokenizer`, `core/types` | `core/matcher` (VectorStore does not import Matcher) |
| `engine/tokenizer.ts` | Text processing: tokenize, stem, n-grams, normalize. | Nobody (leaf module) | Everything (everyone depends on this; it depends on nothing) |
| `core/types.ts` | Shared TypeScript interfaces and type aliases. | Nobody (leaf module) | Everything (everyone depends on this; it depends on nothing) |
| `utils/validate.ts` | Input validation: string checks, config guards, length limits. | `utils/errors` | `engine/*` (validation runs at API boundaries, not inside engine) |
| `utils/errors.ts` | Custom error classes (IntentMapError, ValidationError, etc.). | Nobody (leaf module) | Everything (modules import errors, errors import nothing) |
| `adapters/react.ts` | React hooks wrapping core API. | `../index.ts` (createIntentMap), `../core/types`, `react` (peer) | `engine/*`, `core/matcher`, `core/IntentMap` (accessed only through factory) |

### Data Flow

**Intent Matching Flow (primary path):**

```
Consumer
  |
  v
index.ts :: createIntentMap(config) -> IntentMapInstance
  |
  v
core/IntentMap.ts :: match(input)
  |-- utils/validate.ts :: validateMatchInput(input)  [guard]
  |-- utils/validate.ts :: checkNotDestroyed(this)     [guard]
  |
  v
core/matcher.ts :: match(input)
  |-- engine/tokenizer.ts :: tokenize(input), stem(tokens)    [called once]
  |-- engine/vector-store.ts :: buildVector(stems, ngrams)     [vectorize]
  |-- engine/vector-store.ts :: getAverage(intent)             [retrieve]
  |-- engine/vector-store.ts :: cosineSimilarity(inputVec, avgVec)
  |-- engine/vector-store.ts :: bestKeywordScore(intent, inputStems)
  |-- blended = COSINE_WEIGHT * cosine + KEYWORD_WEIGHT * keyword
  |-- threshold comparison
  |
  v
MatchResult { matched, intent, confidence, scores, input }
```

**Key data flow rule:** Data flows downward through layers. `core` calls into `engine`. `engine` never calls up to `core`. `utils` is called at boundary points (entry to `core`), not inside `engine` internals.

**Event Binding Flow:**

```
Consumer :: im.bind(element, options)
  |
  v
core/IntentMap.ts :: bind()
  |-- attaches DOM event listener
  |-- on DOM event: extractText(event)
  |-- validate input (utils/validate)
  |-- this.match(text)  [loops back to matching flow]
  |-- this.emit(result, event)
       |-- fires handlers for matched intent
       |-- fires wildcard handlers
```

**Adapter Data Flow:**

```
React Consumer
  |
  v
adapters/react.ts :: useIntentMap(config)
  |-- imports createIntentMap from ../index.ts
  |-- stores instance in useRef
  |-- cleanup: destroy() in useEffect return
  |
  v
Returns IntentMapInstance (consumer uses same API)
```

## Patterns to Follow

### Pattern 1: Validation at API Boundaries Only

**What:** Input validation runs at the public API surface (`IntentMap.match()`, `IntentMap.addIntent()`, etc.) and nowhere else. Internal engine functions (`tokenize`, `buildVector`, `cosineSimilarity`) trust their inputs.

**When:** Every public method on `IntentMap` class and the `createIntentMap` factory.

**Why:** Avoids redundant validation in tight loops (matching scores across 100 intents should not validate the input string 100 times). Keeps engine code clean and fast. Gives consumers clear, early error messages.

**Example:**

```typescript
// src/utils/validate.ts
import { IntentMapError } from './errors.js'

export function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new IntentMapError(`${label} must be a string, got ${typeof value}`)
  }
  return value
}

export function assertInputLength(input: string, max = 10000): string {
  if (input.length > max) {
    throw new IntentMapError(
      `Input exceeds maximum length (${max} chars). ` +
      `Pass a shorter string or increase IntentConfig.maxInputLength.`
    )
  }
  return input
}

export function assertNotDestroyed(destroyed: boolean): void {
  if (destroyed) {
    throw new IntentMapError(
      'Cannot call methods on a destroyed IntentMap instance. ' +
      'Create a new instance with createIntentMap().'
    )
  }
}
```

```typescript
// src/core/IntentMap.ts -- validation at boundary
import { assertString, assertInputLength, assertNotDestroyed } from '../utils/validate.js'

match(input: string): MatchResult {
  assertNotDestroyed(this.destroyed)
  assertString(input, 'match() input')
  assertInputLength(input, this.maxInputLength)
  return this.matcher.match(input)  // engine trusts input
}
```

### Pattern 2: Single Tokenization per Match

**What:** Tokenize and stem the input exactly once in `matcher.ts`, then pass the results to both `buildVector` and `bestKeywordScore`.

**When:** Every `match()` call. Currently the input is tokenized twice (once in `buildVector`, once separately for keyword stems).

**Why:** Performance improvement and consistency guarantee. If tokenization behavior changes, both scoring paths use the same tokens.

**Example:**

```typescript
// src/core/matcher.ts
import { tokenize, stem, buildNgrams } from '../engine/tokenizer.js'

match(input: string): MatchResult {
  const tokens = tokenize(input, this.caseSensitive)
  const stems = tokens.map(stem)
  const ngrams = buildNgrams(stems, 2)

  const inputVec = buildVectorFromTokens(ngrams)
  // ... rest of matching using shared stems and inputVec
}
```

This requires refactoring `buildVector` in `vector-store.ts` to accept pre-computed tokens instead of raw text. The function splits into two: `buildVectorFromText(text)` for the training path, and `buildVectorFromTokens(ngrams)` for the matching path.

### Pattern 3: Adapter Isolation via Subpath Exports

**What:** Framework adapters live in `src/adapters/` and are published as separate package subpaths (`intentmap/react`). They import only from the public barrel (`index.ts` or specific core modules), never from engine internals.

**When:** Adding any framework integration (React, Vue, Svelte, Solid).

**Why:** Tree-shaking works correctly because adapters are separate entry points. Consumers who do not use React never download React code. Adapters are decoupled from engine internals and can be versioned independently if needed.

**Example (tsup.config.ts):**

```typescript
entry: {
  index: 'src/index.ts',
  'adapters/react': 'src/adapters/react.ts',
  // Future:
  // 'adapters/vue': 'src/adapters/vue.ts',
}
```

```typescript
// src/adapters/react.ts -- only imports from public API
import { createIntentMap } from '../index.js'
import type { IntentConfig, IntentMapInstance } from '../core/types.js'
// NEVER: import { tokenize } from '../engine/tokenizer.js'
```

### Pattern 4: Destroyed-State Guard

**What:** The `IntentMap` class tracks a `destroyed` boolean flag. Every public method checks this flag before proceeding.

**When:** All public methods on `IntentMap` except `destroy()` itself.

**Why:** Prevents use-after-free bugs where consumers call methods after teardown. Currently, calling `match()` after `destroy()` would hit cleared internals and produce garbage results silently.

**Example:**

```typescript
// src/core/IntentMap.ts
private destroyed = false

destroy(): void {
  if (this.destroyed) return  // idempotent
  this.destroyed = true
  // ... actual cleanup
}

match(input: string): MatchResult {
  assertNotDestroyed(this.destroyed)
  // ...
}
```

### Pattern 5: Configurable Scoring Weights

**What:** Move `COSINE_WEIGHT` and `KEYWORD_WEIGHT` from hardcoded constants in `matcher.ts` into `IntentConfig`.

**When:** Construction time. Stored on the Matcher instance.

**Why:** The 65/35 split was chosen empirically. Consumers with different input characteristics (technical jargon vs natural language) may need different weights. Making it configurable costs nothing and unblocks edge cases.

**Example:**

```typescript
// src/core/types.ts
export interface ScoringConfig {
  cosineWeight?: number   // default 0.35
  keywordWeight?: number  // default 0.65
}

export interface IntentConfig {
  intents: Record<string, IntentDefinition>
  defaultThreshold?: number
  caseSensitive?: boolean
  debug?: boolean
  maxInputLength?: number       // default 10000
  scoring?: ScoringConfig
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Engine Imports Core

**What:** Any file under `src/engine/` importing from `src/core/`.

**Why bad:** Creates upward dependency. Engine functions are pure data transformations (tokenize, vectorize, score). They should not know about orchestration concerns like event handling or DOM binding. If engine needs something from core, the dependency is inverted wrong.

**Instead:** Pass the needed data downward as function parameters. If `vector-store.ts` needs a config value, the Matcher passes it as an argument, not by importing from IntentMap.

### Anti-Pattern 2: utils/ as a Junk Drawer

**What:** Putting miscellaneous functions in `utils/` that do not clearly belong to validation or error handling.

**Why bad:** `utils/` becomes the place code goes to die. Functions there are hard to find, poorly organized, and tend to accumulate circular imports.

**Instead:** Only `validate.ts` and `errors.ts` in utils. Helper functions that are text-related go in `engine/tokenizer.ts`. Helper functions that are math-related go in `engine/vector-store.ts`. Helper functions that are orchestration-related go in `core/IntentMap.ts`.

### Anti-Pattern 3: Barrel Re-exports of Internal Modules

**What:** `index.ts` re-exporting everything from every module, including internal engine details like `tokenize` or `VectorStore`.

**Why bad:** Exposes internal implementation details as public API. Consumers start depending on them, making refactoring a breaking change. Tree-shaking effectiveness decreases.

**Instead:** `index.ts` exports only: `createIntentMap`, `defineIntent`, `IntentMap` class, and types from `types.ts`. Internal functions (`tokenize`, `stem`, `buildVector`, `VectorStore`, `Matcher`) are NOT exported.

```typescript
// src/index.ts -- public API ONLY
export { IntentMap } from './core/IntentMap.js'
export type {
  IntentConfig,
  IntentDefinition,
  MatchResult,
  IntentHandler,
  IntentMapInstance,
  BindOptions,
  ScoringConfig,
} from './core/types.js'

import { IntentMap } from './core/IntentMap.js'
import type { IntentConfig, IntentMapInstance } from './core/types.js'

export function createIntentMap(config: IntentConfig): IntentMapInstance {
  return new IntentMap(config)
}

export function defineIntent(
  patterns: string[],
  options: { threshold?: number; meta?: Record<string, unknown> } = {}
) {
  return { patterns, ...options }
}
```

### Anti-Pattern 4: Coupling Adapters to Engine Internals

**What:** `adapters/react.ts` importing directly from `engine/tokenizer.ts` or `engine/vector-store.ts`.

**Why bad:** Adapters should only use the public API (`createIntentMap`, returned instance methods). Direct engine access means the adapter breaks when engine internals change, even if the public API is stable.

**Instead:** Adapters import from `../index.js` (the public barrel) or from `../core/types.js` (type-only imports). All runtime behavior goes through `createIntentMap()` and the returned `IntentMapInstance`.

## Recommended Directory Structure (Complete)

```
intentMap/
├── src/
│   ├── index.ts                    # Public API barrel (entry point)
│   ├── core/
│   │   ├── IntentMap.ts            # Orchestrator class (events, DOM, lifecycle)
│   │   ├── matcher.ts              # Scoring engine (blended cosine + keyword)
│   │   └── types.ts                # All shared TypeScript interfaces
│   ├── engine/
│   │   ├── vector-store.ts         # VectorStore class, buildVector, cosine, keyword
│   │   └── tokenizer.ts            # tokenize, stem, buildNgrams, normalize
│   ├── utils/
│   │   ├── validate.ts             # Input validation helpers
│   │   └── errors.ts               # IntentMapError class
│   └── adapters/
│       └── react.ts                # useIntentMap, useIntent, useIntentBind
├── tests/
│   ├── core.test.ts                # IntentMap integration tests
│   ├── matcher.test.ts             # Scoring unit tests
│   ├── tokenizer.test.ts           # Tokenization and stem tests
│   ├── vector-store.test.ts        # VectorStore unit tests
│   ├── validate.test.ts            # Validation helper tests
│   ├── react.test.tsx              # React hook tests
│   └── edge-cases.test.ts          # Unicode, empty, destroy, concurrent
├── examples/
│   ├── demo.ts                     # Vanilla TS demo
│   └── SearchBar.tsx               # React example
├── dist/                           # Build output (gitignored)
├── .changeset/
│   └── config.json                 # Changesets config (moved from root config.json)
├── .gitignore
├── LICENSE
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── biome.json
├── release.yml
├── CHANGELOG.md
└── README.md
```

### Dependency Graph (After Restructure)

```
src/index.ts
├── src/core/IntentMap.ts
│   ├── src/core/matcher.ts
│   │   ├── src/engine/vector-store.ts
│   │   │   ├── src/engine/tokenizer.ts     [leaf]
│   │   │   └── src/core/types.ts           [leaf]
│   │   └── src/core/types.ts               [leaf]
│   ├── src/core/types.ts                   [leaf]
│   ├── src/utils/validate.ts
│   │   └── src/utils/errors.ts             [leaf]
│   └── src/utils/errors.ts                 [leaf]
├── src/core/types.ts (re-exported)
│
src/adapters/react.ts
├── src/index.ts (createIntentMap)
├── src/core/types.ts (type imports only)
└── react (peer dependency)

tests/*.test.ts
├── src/index.ts (public API tests)
├── src/core/matcher.ts (direct for unit tests)
├── src/engine/tokenizer.ts (direct for unit tests)
├── src/engine/vector-store.ts (direct for unit tests)
└── src/utils/validate.ts (direct for unit tests)
```

No circular dependencies. Clean DAG. Two leaf modules: `tokenizer.ts` and `types.ts`. All arrows point downward.

## Build Order and Refactor Sequence

The refactor must proceed in a specific order because each step unblocks the next. Getting the order wrong means broken imports and failed builds at every step.

### Phase 1: File Restructure (must be first)

1. Create `src/`, `src/core/`, `src/engine/`, `src/utils/`, `src/adapters/`, `tests/`, `examples/` directories.
2. Move `types.ts` to `src/core/types.ts` (leaf module, no import changes needed).
3. Move `tokenizer.ts` to `src/engine/tokenizer.ts` (leaf module, no import changes needed).
4. Move `embeddings.ts` to `src/engine/vector-store.ts`. Update imports: `./tokenizer.js` becomes `../engine/tokenizer.js`, `./types.js` becomes `../core/types.js`.
5. Move `matcher.ts` to `src/core/matcher.ts`. Update imports: `./embeddings.js` becomes `../engine/vector-store.js`, `./tokenizer.js` becomes `../engine/tokenizer.js`, `./types.js` becomes `./types.js` (same directory).
6. Move `IntentMap.ts` to `src/core/IntentMap.ts`. Update imports: `./matcher.js` becomes `./matcher.js` (same directory), `./types.js` becomes `./types.js` (same directory).
7. Move `react.ts` to `src/adapters/react.ts`. Update imports: `../index.js` stays as `../index.js`, `../types.js` becomes `../core/types.js`.
8. Move `index.ts` to `src/index.ts`. Update imports: `./IntentMap.js` becomes `./core/IntentMap.js`, `./types.js` becomes `./core/types.js`.
9. Move test files to `tests/`. Update import paths to reference `../src/` instead of `./`.
10. Move `demo.ts` and `SearchBar.tsx` to `examples/`.
11. Verify: `npm run build` succeeds. `npm run typecheck` succeeds.

**Why this order:** Types and tokenizer are leaf modules with no imports, so moving them first creates zero breakage. Then move inward-to-outward: vector-store (depends on tokenizer + types), matcher (depends on vector-store + tokenizer + types), IntentMap (depends on matcher + types), index (depends on IntentMap + types). Each step only breaks one level of imports.

### Phase 2: Infrastructure Fixes (depends on Phase 1)

1. Move `config.json` to `.changeset/config.json`.
2. Add `.gitignore` with `node_modules/`, `dist/`, `coverage/`, `.env`.
3. Add `LICENSE` file.
4. Run `npm install` to generate `package-lock.json`.
5. Replace placeholder metadata in `package.json`, `tsup.config.ts`, `CHANGELOG.md`.
6. Verify: `npm run build && npm run test && npm run lint && npm run typecheck` all pass.

### Phase 3: Validation and Error Handling (depends on Phase 1)

1. Create `src/utils/errors.ts` with `IntentMapError` class.
2. Create `src/utils/validate.ts` with assertion helpers.
3. Add validation to every public method on `IntentMap`.
4. Add `destroyed` flag and guards.
5. Add input length limits via `IntentConfig.maxInputLength`.
6. Verify: Existing tests pass. Add validation-specific tests.

### Phase 4: Engine Fixes (depends on Phase 1)

1. Refactor `buildVector` to accept pre-tokenized input (single tokenization per match).
2. Fix `bind()` duplicate listener bug.
3. Fix `innerText` fallback to prefer `textContent`.
4. Make scoring weights configurable via `IntentConfig.scoring`.
5. Verify: All existing tests pass. Add engine-specific tests.

### Phase 5: Test Coverage (depends on Phases 3 and 4)

1. Add `stem()` tests.
2. Add `bind()` and DOM tests.
3. Add React hook tests.
4. Add edge case tests.
5. Add scoring calibration tests.

### Phase 6: React Adapter Improvements (depends on Phase 5)

1. Fix `useIntentMap` config staleness.
2. Fix `useIntent` stale closure footgun with better `deps` pattern.
3. Add debounce option to `useIntentBind`.
4. Add React-specific tests.

## Where Specific Concerns Live

| Concern | Location | Rationale |
|---------|----------|-----------|
| Input string validation | `src/utils/validate.ts` | Cross-cutting; called at every API boundary |
| Config object validation | `src/utils/validate.ts` | Same location; validates at construction time |
| Custom error types | `src/utils/errors.ts` | Single source of truth for error messages |
| Type guards (isMatchResult, isIntentConfig) | `src/utils/validate.ts` | Runtime type checking is validation |
| TypeScript interfaces | `src/core/types.ts` | Central type definitions used by all layers |
| Scoring thresholds | `src/core/matcher.ts` | Threshold logic is matching logic |
| Scoring weights | `src/core/matcher.ts` (read from config) | Configurable at construction, applied at match time |
| DOM event handling | `src/core/IntentMap.ts` | Orchestrator owns side effects |
| Event handler registration | `src/core/IntentMap.ts` | Observer pattern is orchestration |
| React lifecycle management | `src/adapters/react.ts` | Framework-specific concern, isolated |
| Tokenization rules | `src/engine/tokenizer.ts` | Pure text processing, no side effects |
| Vector math | `src/engine/vector-store.ts` | Pure computation, no side effects |
| Cache invalidation | `src/engine/vector-store.ts` | Internal to VectorStore, not exposed |
| Destroyed state tracking | `src/core/IntentMap.ts` | Instance lifecycle concern |
| Debounce/throttle | `src/core/IntentMap.ts` (in bind options) | DOM binding concern, stays with orchestrator |

## Scalability Considerations

| Concern | At 10 intents | At 1,000 intents | At 10,000 intents |
|---------|--------------|------------------|-------------------|
| Match latency | Sub-ms (current is fine) | ~10-50ms (acceptable) | ~100-500ms (needs async/web worker) |
| Memory | Negligible | ~5-20MB | ~50-200MB (needs serialization) |
| Module structure | No changes needed | No changes needed | Consider splitting engine into web worker |
| Adapter complexity | No changes needed | No changes needed | Consider streaming match results |

For the current scope (under 100 intents, synchronous matching), this architecture needs zero changes. The module boundaries are set up so that adding async matching later means adding a new `matcher-async.ts` in `core/`, not refactoring the existing structure.

## Sources

- Codebase analysis: All source files read directly from `/Users/prajwalhg/open-source-ideas/intentMap/`
- Build config analysis: `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `package.json`
- Existing architecture documentation: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONCERNS.md`
- Confidence: HIGH on all structural recommendations (based on direct codebase analysis, all tool configs read and verified)
- TypeScript library packaging patterns: Training data (MEDIUM confidence -- standard patterns, verified against actual tsconfig/tsup configs in this project)

---

*Architecture research: 2026-04-12*
