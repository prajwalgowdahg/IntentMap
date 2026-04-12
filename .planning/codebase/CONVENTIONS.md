# Coding Conventions

**Analysis Date:** 2026-04-12

## Naming Patterns

**Files:**
- Use PascalCase for primary class files: `IntentMap.ts`, `SearchBar.tsx`
- Use camelCase for utility/module files: `tokenizer.ts`, `embeddings.ts`, `matcher.ts`, `react.ts`
- Use lowercase for barrel/entry files: `index.ts`
- Test files mirror source name with `.test.ts` suffix: `tokenizer.test.ts`, `intentmap.test.ts`
- Config files use kebab-case or tool name: `vitest.config.ts`, `tsup.config.ts`

**Functions:**
- Use camelCase for all functions: `createIntentMap()`, `defineIntent()`, `tokenize()`, `buildVector()`, `cosineSimilarity()`, `keywordOverlap()`, `extractText()`
- Factory functions use `create` prefix: `createIntentMap()`
- Configuration/definition helpers use `define` prefix: `defineIntent()`
- Boolean-return functions currently not present but would use `is`/`has` prefix per JS convention
- Private helper functions are module-scoped (not exported): `extractText()` in `IntentMap.ts`

**Variables:**
- Use camelCase: `defaultThreshold`, `caseSensitive`, `inputStems`
- Use UPPER_SNAKE_CASE for constants: `COSINE_WEIGHT`, `KEYWORD_WEIGHT`, `STOP_WORDS`
- Use descriptive names: `cleanupFns`, `wildcardHandlers`, `boundElements`

**Types:**
- Use PascalCase for interfaces and types: `IntentConfig`, `MatchResult`, `IntentMapInstance`, `BoundEvent`, `TokenVector`, `IntentDefinition`, `BindOptions`
- Use PascalCase for classes: `IntentMap`, `Matcher`, `VectorStore`
- Interface names use no `I` prefix (NOT `IIntentConfig`)
- Type aliases used for simple/union types: `IntentHandler`, `TokenVector`
- Private interface types for internal structures: `PatternEntry` in `embeddings.ts`

**React hooks:**
- Use `use` prefix: `useIntentMap()`, `useIntent()`, `useIntentBind()`

## Code Style

**Formatter:** Biome (`biome.json`)
- Config location: `biome.json` at project root
- Indent: 2 spaces
- Line width: 90 characters
- Quotes: single quotes (`'`)
- Semicolons: asNeeded (omit where not required)
- Trailing commas: es5 style (commas in lists/objects, not in type parameters)
- Import organization: enabled (auto-sorted)

**Linting:**
- Tool: Biome linter with recommended rules
- Custom rules:
  - `noForEach`: OFF (`.forEach()` is allowed)
  - `useConst`: ERROR (prefer `const` where possible)
  - `useTemplate`: ERROR (prefer template literals over string concatenation)

**Scripts from `package.json`:**
```bash
npm run lint          # biome check ./src ./tests
npm run lint:fix      # biome check --write ./src ./tests
npm run format        # biome format --write ./src ./tests
npm run typecheck     # tsc --noEmit
```

## Import Organization

**Order:**
1. External package imports: `import React, { useState } from 'react'`
2. Internal module imports (relative): `import { Matcher } from './matcher.js'`
3. Type-only imports: `import type { IntentConfig, ... } from './types.js'`

**Path Aliases:**
- No path aliases configured in `tsconfig.json`
- All imports use relative paths with `.js` extension (NodeNext module resolution): `from './matcher.js'`

**Import convention:**
- Separate runtime imports from type imports: use `import type` for types
- Example from `IntentMap.ts`:
```typescript
import { Matcher } from './matcher.js'
import type {
  IntentConfig,
  IntentDefinition,
  IntentHandler,
  IntentMapInstance,
  MatchResult,
  BindOptions,
} from './types.js'
```

## Error Handling

**Patterns:**
- No explicit error throwing in the codebase. Functions return result objects instead.
- The `match()` method always returns a `MatchResult` -- never throws. No-match returns `{ matched: false, intent: null, confidence: number, scores: {...}, input: string }`.
- Null-safe access patterns with optional chaining and nullish coalescing:
  - `config.defaultThreshold ?? 0.25`
  - `handlers?.forEach((h) => h(result, event))`
  - `this.handlers.get(intent)?.delete(handler)`
- Guards for empty states:
  - `if (patternTokens.length === 0) return 0` in `keywordOverlap()`
  - `if (!text) return` in event listener within `bind()`
  - `if (magnitude > 0)` before normalizing in `buildVector()`
- Test assertions verify no-throw behavior: `expect(() => im.destroy()).not.toThrow()`

## Logging

**Framework:** console (native)

**Patterns:**
- Debug logging gated behind `config.debug` flag:
```typescript
if (this.debug) {
  console.debug('[intentmap] scores:', scores, 'for input:', input)
}
```
- Uses `console.debug` with `[intentmap]` prefix for namespacing
- No structured logging library used
- Demo file (`demo.ts`) uses `console.log` for output

## Comments

**When to Comment:**
- JSDoc comments used for public utility functions explaining purpose:
```typescript
/**
 * Keyword overlap score: fraction of pattern stems found in input stems.
 * This is the primary signal — if core words match, the intent is likely right.
 */
```
```typescript
/**
 * Lightweight suffix-stripping stemmer.
 * Handles the most common English inflections without a full Porter stemmer.
 */
```
- Inline comments are rare; code is self-documenting through naming
- No TODO/FIXME/HACK comments found

**JSDoc/TSDoc:**
- Used sparingly, only on exported utility functions that need context beyond their name
- Not used on methods of exported classes (methods are self-explanatory via naming)
- Not used on React hooks

## Function Design

**Size:** Functions are small and focused. Most are under 20 lines. The longest functions are `IntentMap.bind()` (~30 lines) and `Matcher.match()` (~25 lines).

**Parameters:** Use object parameters for configuration. Options objects with destructuring:
```typescript
bind(element: HTMLElement, options: BindOptions = {}): () => void {
  const { on: eventTypes = ['input', 'change'], extractor, filter } = options
```

**Return Values:**
- Functions that can fail return result objects, not exceptions: `MatchResult`
- Event subscription returns cleanup function: `on() => () => void`
- Factory functions return interface types, not concrete classes: `createIntentMap(): IntentMapInstance`

## Module Design

**Exports:**
- Use named exports exclusively. No default exports except in React components (`SearchBar.tsx` uses `export default function SearchBar()`).
- Classes are exported directly: `export class IntentMap`, `export class Matcher`, `export class VectorStore`
- Utility functions are exported individually: `export function tokenize()`, `export function stem()`
- Types are re-exported through barrel file: `export * from './types.js'` in `index.ts`

**Barrel Files:**
- `index.ts` is the main barrel/entry point, exporting `IntentMap` class and all types
- `index.ts` also defines and exports factory functions: `createIntentMap()`, `defineIntent()`
- React adapter has separate entry: `react.ts` exports `useIntentMap`, `useIntent`, `useIntentBind`

**Module boundaries:**
- `types.ts` contains all shared interfaces/types -- single source of truth
- `tokenizer.ts` handles text processing (tokenize, stem, normalize, ngrams)
- `embeddings.ts` handles vector math and storage (VectorStore, cosineSimilarity)
- `matcher.ts` handles intent matching logic (combines embeddings + keyword matching)
- `IntentMap.ts` is the public API class (orchestrates matcher + event handlers + DOM binding)
- `react.ts` provides React hooks adapter

## TypeScript Configuration

**Strictness:** Very strict (`tsconfig.json`)
- `strict: true`
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- Target: ES2020 with DOM lib included

**Key patterns enforced by strict config:**
- Must handle `undefined` from index access: `result.scores['checkout'] ?? 0`
- Optional properties require exact handling, not just `T | undefined`
- All code paths must return a value

## Structural Note

**Important discrepancy:** The `tsconfig.json` specifies `rootDir: "src"` and `vitest.config.ts` specifies `include: ['tests/**/*.test.ts']`, and `tsup.config.ts` references `src/index.ts` and `src/adapters/react.ts`. The `package.json` lint scripts reference `./src ./tests`. However, **source files currently live at the project root** (`IntentMap.ts`, `matcher.ts`, etc.) and **test files are also at root** (`intentmap.test.ts`, `tokenizer.test.ts`). The tests import from `../src/` which would only work if source files were moved into a `src/` directory. This layout mismatch needs resolution.

---

*Convention analysis: 2026-04-12*
