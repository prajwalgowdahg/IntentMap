# Technology Stack

**Analysis Date:** 2026-04-12

## Languages

**Primary:**
- TypeScript 5.5+ - All source code, configuration, and tests. Target: ES2020 with DOM lib support.

**Secondary:**
- TSX (TypeScript JSX) - React component examples only (`SearchBar.tsx`)
- YAML - GitHub Actions CI/release workflow (`release.yml`)
- JSON - Configuration files (`package.json`, `tsconfig.json`, `biome.json`, `config.json`)

## Runtime

**Environment:**
- Node.js >=18.0.0 (specified in `package.json` engines)
- CI uses Node 20 (specified in `release.yml`)
- Also runs in browsers (DOM lib included in `tsconfig.json`, DOM API usage in `IntentMap.ts`)

**Package Manager:**
- npm (inferred from `npm ci`, `npm run` scripts in `release.yml`)
- Lockfile: Not present in repository (no `package-lock.json` committed)
- No `node_modules` directory present

## Frameworks

**Core:**
- None - This is a zero-runtime-dependency library. All NLP/embedding logic is hand-rolled.

**React Integration (Optional):**
- React >=17.0.0 - Optional peer dependency for the `intentmap/react` subpath export
  - React 18.3.1 used as devDependency for type checking and example components
  - `react.ts` provides three hooks: `useIntentMap`, `useIntent`, `useIntentBind`
  - `SearchBar.tsx` is a demo/example component (not published as part of the library)

**Testing:**
- Vitest 2.0.5 - Test runner with globals enabled
  - Config: `vitest.config.ts`
  - Coverage: `@vitest/coverage-v8` 2.0.5 with V8 provider
  - 26 tests across 2 test files

**Build/Dev:**
- tsup 8.2.4 - Bundler producing dual ESM + CJS output with `.d.ts` declarations
  - Config: `tsup.config.ts`
  - Entry points: `src/index.ts` (main), `src/adapters/react.ts` (React subpath)
  - Outputs: `dist/index.js` (ESM), `dist/index.cjs` (CJS), `dist/index.d.ts` (types)
  - Outputs: `dist/adapters/react.js` (ESM), `dist/adapters/react.cjs` (CJS)
  - Sourcemaps enabled, tree-shaking enabled, no minification
- TypeScript 5.5.4 - Type checker (`tsc --noEmit`)
  - Config: `tsconfig.json`
  - Strict mode with `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitReturns`
- Biome 1.8.3 - Linting and formatting (replaces ESLint + Prettier)
  - Config: `biome.json`
  - Single quotes, no semicolons, 2-space indent, 90 char line width, trailing commas (es5)
- @changesets/cli 2.27.7 - Versioning and publishing workflow
  - Config: `config.json` (changeset config)
  - Publishes to npm as `intentmap`

## Key Dependencies

**Critical:**
- Zero runtime dependencies - The library's core selling point is zero deps. All NLP logic (tokenization, stemming, TF-IDF-like vector building, cosine similarity) is implemented from scratch.

**Dev-only:**
- `vitest` ^2.0.5 - Test runner
- `@vitest/coverage-v8` ^2.0.5 - Code coverage
- `tsup` ^8.2.4 - Build bundler
- `typescript` ^5.5.4 - Type checking
- `@biomejs/biome` ^1.8.3 - Linting and formatting
- `@changesets/cli` ^2.27.7 - Release management
- `react` ^18.3.1 - Dev dependency for React adapter type checking
- `@types/react` ^18.3.3 - React type definitions

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2020
- Module: NodeNext (ESM-first)
- Strict mode enabled with additional safety flags
- Root: `src/`, Output: `dist/`
- Includes DOM types for browser API access

**Build (`tsup.config.ts`):**
- Dual format: ESM + CJS
- Declaration files generated (`.d.ts`, `.d.cts`)
- `react` treated as external dependency
- Banner comment injected into built files with version and license info

**Linting/Formatting (`biome.json`):**
- Organize imports enabled
- Recommended rules + custom: `noForEach` off, `useConst` error, `useTemplate` error
- Single quotes, no semicolons, 2-space indent, 90-char line width

**Changeset (`config.json`):**
- Access: public (npm)
- Base branch: main
- Auto-update internal dependencies on patch

**Vitest (`vitest.config.ts`):**
- Globals: true
- Environment: node
- Test files: `tests/**/*.test.ts`
- Coverage includes `src/**/*.ts`, excludes `src/adapters/**`

## Platform Requirements

**Development:**
- Node.js >=18.0.0
- npm for package management
- No .env files required
- No external services required (fully offline)

**Production:**
- npm registry (for publishing)
- GitHub Actions (for CI/release pipeline)
- No server infrastructure - this is a client-side library

**Browser Support:**
- ES2020-compatible browsers (target from `tsconfig.json`)
- DOM API usage: `HTMLElement.addEventListener`, `HTMLElement.removeEventListener`, `Event` target access, `dataset`, `innerText`, `textContent`

---

*Stack analysis: 2026-04-12*
