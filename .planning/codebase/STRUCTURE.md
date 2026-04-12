# Codebase Structure

**Analysis Date:** 2026-04-12

## Directory Layout

```
intentMap/
├── .planning/                # GSD planning documents
│   └── codebase/             # Codebase analysis docs (this file)
├── index.ts                  # Package entry point (factory + re-exports)
├── IntentMap.ts              # Core orchestrator class
├── matcher.ts                # Scoring algorithm and threshold logic
├── embeddings.ts             # Vector store, TF-IDF vectors, similarity
├── tokenizer.ts              # Tokenization, stemming, n-grams
├── types.ts                  # Shared TypeScript interfaces and types
├── react.ts                  # React adapter (hooks)
├── SearchBar.tsx             # React example component
├── demo.ts                   # Vanilla TypeScript usage demo
├── intentmap.test.ts         # Integration/unit tests for IntentMap
├── tokenizer.test.ts         # Unit tests for tokenizer
├── package.json              # NPM package manifest
├── tsconfig.json             # TypeScript compiler config
├── tsup.config.ts            # Build config (tsup/esbuild)
├── vitest.config.ts          # Test runner config
├── biome.json                # Linter/formatter config
├── config.json               # Changesets release config
├── .npmignore                # Files excluded from npm package
├── release.yml               # GitHub Actions release workflow
├── CHANGELOG.md              # Version history
└── README.md                 # Project documentation
```

**Important Note on Current vs. Intended Structure:**

All source files currently reside at the project root. However, the build and test configuration files reference a different layout:
- `tsconfig.json`: `"rootDir": "src"`, `"include": ["src"]`
- `tsup.config.ts`: entry points are `src/index.ts` and `src/adapters/react.ts`
- `vitest.config.ts`: test pattern `tests/**/*.test.ts`, coverage on `src/**/*.ts`

The directories `src/`, `tests/`, and `examples/` do not yet exist. A restructure is needed to align the actual file locations with the configured build/test paths.

## Intended Directory Layout (after restructure)

Based on build/test configs and `.npmignore`:

```
intentMap/
├── src/                      # All source code (tsconfig rootDir)
│   ├── index.ts              # Package entry point
│   ├── IntentMap.ts          # Core orchestrator
│   ├── matcher.ts            # Scoring engine
│   ├── embeddings.ts         # Vector store and similarity
│   ├── tokenizer.ts          # Text processing
│   ├── types.ts              # Type definitions
│   └── adapters/             # Framework adapters
│       └── react.ts          # React hooks
├── tests/                    # Test files (vitest include path)
│   ├── intentmap.test.ts     # Core integration tests
│   └── tokenizer.test.ts     # Tokenizer unit tests
├── examples/                 # Demo/example code
│   ├── demo.ts               # Vanilla TS demo
│   └── SearchBar.tsx          # React example component
├── dist/                     # Build output (gitignored, generated)
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── biome.json
├── config.json
├── .npmignore
├── release.yml
├── CHANGELOG.md
└── README.md
```

## Key File Locations

**Entry Points:**
- `index.ts`: Main package entry -- exports `IntentMap`, `createIntentMap`, `defineIntent`, and all types
- `react.ts`: React adapter entry -- exports `useIntentMap`, `useIntent`, `useIntentBind`

**Configuration:**
- `package.json`: Package manifest, scripts, dependencies, dual-format exports
- `tsconfig.json`: TypeScript config targeting ES2020, NodeNext modules, strict mode
- `tsup.config.ts`: Build config with dual entry points, ESM + CJS output, DTS generation
- `vitest.config.ts`: Test config with v8 coverage provider
- `biome.json`: Linting and formatting rules
- `config.json`: Changesets configuration for versioning

**Core Logic:**
- `IntentMap.ts`: Orchestrator class (150 lines) -- event handling, DOM binding, delegation to Matcher
- `matcher.ts`: Scoring engine (81 lines) -- blended cosine + keyword scoring, threshold comparison
- `embeddings.ts`: Vector operations (125 lines) -- `VectorStore` class, TF-IDF vectorization, similarity functions
- `tokenizer.ts`: Text processing (50 lines) -- tokenization, stop words, n-grams, stemming
- `types.ts`: Type definitions (52 lines) -- all shared interfaces and types

**Framework Adapters:**
- `react.ts`: React hooks (57 lines) -- `useIntentMap`, `useIntent`, `useIntentBind`

**Testing:**
- `intentmap.test.ts`: Integration tests (188 lines) -- tests for `match()`, `on()`, `emit()`, `addIntent()`, `removeIntent()`, `train()`, `destroy()`
- `tokenizer.test.ts`: Unit tests (52 lines) -- tests for `tokenize()`, `buildNgrams()`, `normalize()`

**Examples:**
- `demo.ts`: Vanilla TypeScript usage demo (72 lines)
- `SearchBar.tsx`: React component example (60 lines)

## Naming Conventions

**Files:**
- Source files: `camelCase.ts` -- e.g., `IntentMap.ts`, `embeddings.ts`, `tokenizer.ts`
  - Exception: `index.ts` for package entry (conventional)
  - Exception: `SearchBar.tsx` uses `PascalCase` (React component convention)
- Test files: `<module>.test.ts` -- e.g., `intentmap.test.ts`, `tokenizer.test.ts`
- Config files: `kebab-case` or dot-prefixed -- e.g., `tsup.config.ts`, `vitest.config.ts`, `.npmignore`

**Exports (package.json):**
- Main entry: `.` -> `dist/index.js` / `dist/index.cjs`
- Adapter entry: `./react` -> `dist/adapters/react.js` / `dist/adapters/react.cjs`

**Classes:**
- `PascalCase` -- e.g., `IntentMap`, `Matcher`, `VectorStore`

**Functions:**
- `camelCase` -- e.g., `createIntentMap`, `defineIntent`, `buildVector`, `cosineSimilarity`
- Factory functions: `create*` prefix for factory pattern (e.g., `createIntentMap`)
- Helper functions: descriptive verb phrases (e.g., `defineIntent`, `buildNgrams`, `tokenize`, `stem`)

**Types/Interfaces:**
- `PascalCase` -- e.g., `IntentConfig`, `MatchResult`, `IntentHandler`, `BindOptions`
- Type aliases: `PascalCase` -- e.g., `TokenVector`, `IntentHandler`

**Variables:**
- `camelCase` -- e.g., `inputVec`, `topScore`, `cleanupFns`, `defaultThreshold`
- Constants: `UPPER_SNAKE_CASE` -- e.g., `COSINE_WEIGHT`, `KEYWORD_WEIGHT`, `STOP_WORDS`

## Where to Add New Code

**New Intent Pattern / Configuration:**
- Add patterns to the `intents` object passed to `createIntentMap()` at the call site
- No changes to library source needed

**New Core Module (e.g., new scoring strategy):**
- Primary code: Create new file at project root (intended: `src/<module>.ts`)
- Wire into: `matcher.ts` (scoring logic) or `IntentMap.ts` (orchestration)
- Types: Add to `types.ts` if new public interfaces are needed

**New Framework Adapter (e.g., Vue, Svelte):**
- Primary code: Create new file (intended: `src/adapters/<framework>.ts`)
- Build config: Add new entry to `tsup.config.ts` under `entry` (e.g., `'adapters/vue': 'src/adapters/vue.ts'`)
- Package exports: Add new export path in `package.json` `exports` field
- Coverage: Already excluded via `vitest.config.ts` (`exclude: ['src/adapters/**']`)

**New Test File:**
- Location: Project root alongside source (intended: `tests/<module>.test.ts`)
- Import pattern: `import { ... } from '../src/<module>.js'` (note `.js` extension for ESM)
- Run: `npm test` (vitest discovers all test files)

**New Example:**
- Location: Project root (intended: `examples/`)
- Note: `.npmignore` already excludes `examples/` from the published package

**New Utility Function:**
- Shared helpers: Add to `tokenizer.ts` (text processing) or `embeddings.ts` (vector math)
- If a new category of utility is needed, create a new module and import in the consuming layer

## Import Patterns

**Extension style:** All local imports use `.js` extension (ESM convention with NodeNext module resolution):
```typescript
import { Matcher } from './matcher.js'
import type { MatchResult } from './types.js'
```

**Import separation:** Type-only imports use `import type`:
```typescript
import type { IntentConfig, IntentMapInstance } from './types.js'
```

**Path aliases:** None configured. All imports use relative paths.

**Adapter imports:** The React adapter imports from the parent package using a relative path:
```typescript
import { createIntentMap } from '../index.js'
```
After restructure, this will become:
```typescript
import { createIntentMap } from '../index.js'  // from src/adapters/react.ts -> src/index.ts
```

## Special Directories

**`.planning/`:**
- Purpose: GSD workflow planning documents
- Generated: By GSD tools
- Committed: Yes (part of the project)

**`dist/` (does not yet exist):**
- Purpose: Build output (ESM + CJS + type declarations)
- Generated: Yes, by `npm run build` (tsup)
- Committed: No (gitignored via standard practices)
- Structure: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/adapters/react.js`, etc.

**`node_modules/` (does not yet exist):**
- Purpose: Development dependencies
- Generated: Yes, by `npm install`
- Committed: No

## Dependency Graph

```
index.ts
├── IntentMap.ts
│   ├── matcher.ts
│   │   ├── embeddings.ts
│   │   │   ├── tokenizer.ts
│   │   │   └── types.ts
│   │   └── types.ts
│   └── types.ts
├── types.ts (re-exported)
│
react.ts (adapter)
├── index.ts (createIntentMap)
├── types.ts
└── react (peer dependency)
    |
SearchBar.tsx (example)
├── react.ts (useIntentMap, useIntent)
├── index.ts (defineIntent)
└── react (peer dependency)

demo.ts (example)
└── index.ts (createIntentMap, defineIntent)
```

No circular dependencies exist. The graph is a clean DAG with `tokenizer.ts` and `types.ts` as leaf nodes.

---

*Structure analysis: 2026-04-12*
