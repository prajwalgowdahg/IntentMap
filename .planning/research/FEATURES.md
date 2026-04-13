# Feature Landscape

**Domain:** Production-quality npm library (offline intent matching)
**Researched:** 2026-04-12
**Confidence:** HIGH (npm DX expectations are well-established; codebase gaps confirmed by audit)

## Table Stakes

Features developers expect from any npm package they'd trust in production.
Missing any of these means the developer writes it themselves instead of installing your package.

| # | Feature | Why Expected | Complexity | Current State | Notes |
|---|---------|--------------|------------|---------------|-------|
| 1 | **Input validation with descriptive errors** | Every npm library validates public API inputs. Without it, consumers get cryptic stack traces inside internal functions (e.g., `text.replace is not a function` when passing null to `match()`). This is the single biggest trust killer. | Low | MISSING | Validate types and shapes at every public method boundary. Throw `TypeError`/`RangeError` with messages like `match() expected a string, got null`. See error pattern below. |
| 2 | **Working build pipeline** | `npm run build`, `test`, `typecheck`, `lint` must all pass. If the package cannot be built, it cannot be published. Developers clone the repo to evaluate quality; broken builds mean instant exit. | Low | BROKEN | File layout mismatch: source at root, all tools expect `src/`. Move files, update imports. |
| 3 | **LICENSE file** | MIT license requires including license text. npm shows warnings on publish without it. Corporate users cannot adopt packages without a license file. | Low | MISSING | Create `LICENSE` file with MIT text and copyright line. `package.json` already declares `"license": "MIT"`. |
| 4 | **`.gitignore`** | Every repo needs one. Without it, `node_modules/`, `dist/`, and build artifacts get committed. Signal of an unfinished project. | Low | MISSING | Standard Node.js `.gitignore` covering `node_modules/`, `dist/`, `.env`, coverage. |
| 5 | **`package-lock.json` committed** | `npm ci` (used in CI/CD) requires a lockfile. Without it, builds are non-reproducible. The release workflow references `npm ci` and will fail. | Low | MISSING | Run `npm install` and commit the resulting lockfile. |
| 6 | **Comprehensive test suite** | Developers judge library quality by test coverage. The current 26 tests cover the happy path only. Missing: React hooks, DOM binding, stemmer, edge cases, scoring calibration. Zero coverage on the most complex integration points (hooks, bind). | Medium | PARTIAL (26 tests, major gaps) | Priority test additions: (1) React hooks with `@testing-library/react-hooks`, (2) `bind()` with jsdom, (3) `stem()` unit tests, (4) edge cases (empty input, Unicode, post-destroy calls), (5) scoring calibration assertions. |
| 7 | **TypeScript types that work** | Consumers using TypeScript need types that actually resolve. The `src/` path mismatch means `tsc --noEmit` fails, and published `.d.ts` files would reference wrong paths. | Low | BROKEN | Fix file layout. The `tsup` build with `dts: true` handles generation once source is in the right place. |
| 8 | **Proper error messages (not stack traces)** | When a consumer misuses the API, they should see `"IntentMap.addIntent() expected a non-empty string for name, got ''"` not `"Cannot read properties of undefined (reading 'patterns')"`. Errors at the boundary, not deep in internals. | Low | MISSING | Wrap all public methods with validation. Pattern: check args, throw descriptive error, then do work. |
| 9 | **`destroy()` that prevents post-destroy calls** | Calling `match()` after `destroy()` currently runs against cleared state silently. Should throw or return a consistent "destroyed" result. Other libraries in this space (event emitters, state machines) guard against post-teardown usage. | Low | MISSING | Add a `destroyed` flag. Check it at the start of every public method. Throw `"Cannot call match() on a destroyed IntentMap"`. |
| 10 | **Debounce option for DOM binding** | `bind()` fires `match()` on every keystroke. This is a performance footgun that every consumer must handle themselves. For a library whose primary use case is real-time text input, debounce is table stakes. | Low | MISSING | Add `debounce` option to `BindOptions`: `{ debounce?: number }`. Implement with a simple `setTimeout`/`clearTimeout` wrapper (zero deps). Default to no debounce for backward compat. |
| 11 | **Dual ESM + CJS build that actually works** | `package.json` exports map is correct, but the build fails because tsup entry paths don't match source locations. The subpath `intentmap/react` export is non-functional. | Low | BROKEN | Fix file layout. tsup config and exports map are well-structured; they just need the files to exist where they're referenced. |
| 12 | **`sideEffects: false` with tree-shaking that works** | Already declared in `package.json`. But if the build is broken, this is academic. Once the build works, verify that `import { match } from 'intentmap'` only pulls in what's needed. | Low | DECLARED but unverified | Verify with a bundle analyzer after build is fixed. |

## Differentiators

Features that set intentMap apart from alternatives (writing it yourself, using a full NLP library, using a cloud API).
These are what make someone choose this package instead of rolling their own.

| # | Feature | Value Proposition | Complexity | Current State | Notes |
|---|---------|-------------------|------------|---------------|-------|
| 1 | **Configurable scoring weights** | The 65/35 keyword-to-cosine ratio works well but is empirical. Letting consumers tune this for their domain (e.g., more weight to keyword overlap for command-heavy UIs) is a real differentiator over a "black box" scorer. | Low | HARDCODED | Add `weights?: { cosine?: number; keyword?: number }` to `IntentConfig`. Normalize internally so they sum to 1.0. Default to current values. |
| 2 | **Debug mode with scoring breakdown** | `debug: true` currently just `console.debug`s raw scores. A proper debug mode that shows per-intent breakdowns (keyword score, cosine score, individual pattern matches) would make the library uniquely debuggable compared to opaque NLP services. | Medium | STUB | Extend `MatchResult` to include an optional `debug` field when debug mode is on. Show which patterns contributed most. This is a DX differentiator. |
| 3 | **React hooks that are actually safe** | `useIntent` has a stale closure footgun. `useIntentMap` ignores config changes. `useIntentBind` leaks cleanup. Making these hooks bulletproof (proper deps, cleanup, memoization) would make this the go-to intent library for React devs. The competitive landscape for well-typed, well-tested React hooks for intent matching is empty. | Medium | FRAGILE | (1) `useIntentMap`: accept a `key` prop for re-creation. (2) `useIntent`: use `useRef` for handler to avoid stale closures. (3) `useIntentBind`: cleanup on unmount, debounce support. |
| 4 | **Zero dependency promise (maintained)** | Zero runtime deps is a genuine differentiator. Most alternatives pull in `natural`, `compromise`, or similar (each 500KB+). The promise must be maintained and documented. | N/A (maintenance discipline) | YES | Document in README. Add a CI check or `package.json` validation that no runtime deps slip in. |
| 5 | **Incremental training with `.train()`** | The ability to improve matching at runtime without recreating the entire map is uncommon in lightweight libraries. Most require a full re-initialization. | Low | YES | Already works. Just needs tests and documentation of the pattern. |
| 6 | **Sub-100KB bundle size** | For comparison: `natural` is ~3MB, `compromise` is ~300KB. If intentMap ships under 10KB minified, that's a strong differentiator for performance-sensitive apps. | N/A (already small) | LIKELY | Verify actual bundle size after build is fixed. The codebase is ~500 lines of TS; gzipped output should be well under 10KB. |
| 7 | **`matchAll()` returning ranked results** | Currently returns a single `MatchResult` with all scores. A `matchAll()` or option to get ranked results with full score breakdown would help consumers build multi-intent UIs (e.g., "did you mean X or Y?"). | Low | PARTIAL | `scores` is already in the result. Consider a helper `getRankedMatches(result)` or a `topN` option. Low effort, high utility. |
| 8 | **Serialization / `toJSON()` / `fromJSON()`** | Persist trained models to `localStorage` or send to server. This is listed as out-of-scope in PROJECT.md for v1, but it's the most-requested feature for any ML-like library. Worth considering for v1.1. | Medium | NOT BUILT | Defer per project decision. But design the internal state structure so serialization is possible later (use plain objects, no circular refs). |

## Anti-Features

Things to explicitly NOT build. These seem tempting but would hurt the project.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|-------------|-----------|-------------------|
| 1 | **Full NLP pipeline (POS tagging, NER, dependency parsing)** | This is a focused intent matcher, not a general NLP library. Adding POS taggers or named entity recognition would explode the bundle size and break the zero-dep promise. Libraries like `compromise` or `natural` already fill this space. | Stay focused on intent matching. Document that consumers needing NER or POS should use a dedicated NLP library alongside intentMap. |
| 2 | **Cloud API or LLM integration** | The entire value proposition is offline, local, zero-dep. Adding any network call or API key requirement would destroy the core identity. | Keep all computation local. If consumers want LLM fallback, they implement that in their own code. |
| 3 | **Web worker / async matching** | Listed as out-of-scope in PROJECT.md and correctly so. The complexity of worker management, serialization of match results, and API surface change (sync to async) is significant. For the target use case (<100 intents, sub-millisecond matches), synchronous is the right call. | Keep `match()` synchronous. Document performance characteristics so consumers know when to consider alternatives. If needed later, add `matchAsync()` as a separate method, not a replacement. |
| 4 | **Multi-language stemming beyond English** | The stemmer is already fragile for English. Adding rules for other languages would compound the problem and require language detection. This is a deep rabbit hole. | Document that the stemmer is English-only. Provide a `stemmer?: (word: string) => string` option in config so consumers can plug in their own. This is the extension point, not built-in multi-language support. |
| 5 | **Built-in UI components** | The library ships a `SearchBar.tsx` demo component. This should stay a demo, not become a supported API surface. Building and maintaining UI components is a different product with different concerns (a11y, i18n, styling, browser compat). | Keep `SearchBar.tsx` as a demo/example only. Do not export it from the package. The `files` array in `package.json` correctly excludes it (only ships `dist/`, README, CHANGELOG, LICENSE). |
| 6 | **Persistence / storage layer** | `localStorage`, `IndexedDB`, or any storage integration adds complexity, browser-specific code, and data migration concerns. This is application logic, not library logic. | Provide `toJSON()`/`fromJSON()` as pure serialization (defer to v1.1). Let consumers handle storage. |
| 7 | **Framework-specific adapters beyond React** | Vue, Svelte, Angular, Solid adapters would multiply maintenance burden with minimal differentiation. Each framework has different lifecycle patterns. | Provide the core API cleanly. The community can build adapters. Only commit to React since it's already started and is the largest ecosystem. |
| 8 | **Complex configuration DSL / YAML / JSON loading** | Some NLP libraries let you define intents in YAML or JSON files. This adds parser complexity, file I/O concerns, and is overkill for a library where intents are defined in code. | Keep the programmatic API (`createIntentMap({ intents: { ... } })`). TypeScript types provide better DX than a config file format. |
| 9 | **Analytics / telemetry / usage tracking** | Any form of data collection, even anonymized, would violate the "offline, local" promise and destroy trust. | No telemetry, no tracking, no phone-home. Ever. |

## Feature Dependencies

The following dependency chain must be respected in the roadmap. Features build on each other; getting the order wrong means rework.

```
File layout fix (move to src/)
  |
  +--> Build pipeline works (tsup, tsc, vitest all pass)
  |      |
  |      +--> Input validation + error messages (requires passing typecheck)
  |      |
  |      +--> Test suite expansion (requires passing vitest)
  |      |      |
  |      |      +--> React hook tests (requires jsdom setup)
  |      |      |
  |      |      +--> DOM binding tests (requires jsdom setup)
  |      |      |
  |      |      +--> Edge case tests (requires working match)
  |      |
  |      +--> Debounce for bind() (requires working tests to verify)
  |
  +--> Package infrastructure (.gitignore, LICENSE, package-lock.json)
         |
         +--> publishable package (requires all above)

Configurable scoring weights (independent, can be done anytime after build works)
  |
  +--> Scoring calibration tests (depends on configurable weights)

Debug mode enhancement (independent, can be done after build works)
  |
  +--> Depends on scoring weights being configurable (to show both components)

Custom stemmer option (independent)
  |
  +--> No dependencies, but should be designed AFTER input validation pattern is established

destroy() guard (independent)
  |
  +--> Must come AFTER input validation (same validation pattern)
```

## MVP Recommendation

For a v1.0 release that earns developer trust, prioritize in this order:

### Must-Have (no release without these)
1. **File layout fix + working build** -- nothing else matters if the package can't be built
2. **Input validation with descriptive errors** -- the biggest trust signal for a utility library
3. **Package infrastructure** (.gitignore, LICENSE, package-lock.json, real metadata)
4. **`destroy()` guard** -- prevent silent post-teardown bugs
5. **Debounce option for `bind()`** -- the primary use case (real-time input) needs this
6. **Test suite to 80%+ coverage** -- specifically: React hooks, DOM binding, stemmer, edge cases
7. **Configurable scoring weights** -- makes the library adaptable to different domains

### Should-Have (for a strong v1.0)
8. **Debug mode with scoring breakdown** -- DX differentiator
9. **Safe React hooks** (stale closure fix, cleanup, key-based re-creation)
10. **Custom stemmer option** -- extensibility without multi-language support

### Defer to v1.1+
11. **`toJSON()` / `fromJSON()`** -- serialization (design for it now, build later)
12. **`matchAll()` / ranked results helper** -- nice-to-have API sugar
13. **`matchAsync()` / web worker** -- only if real-world perf data demands it

## What "Just Writing It Yourself" Looks Like

The alternative to installing intentMap is a developer writing ~50 lines of keyword matching:

```typescript
// What a developer would write instead
function matchIntent(input: string, intents: Record<string, string[]>): string | null {
  const words = input.toLowerCase().split(/\s+/)
  let bestIntent = null
  let bestScore = 0
  for (const [intent, patterns] of Object.entries(intents)) {
    const patternWords = patterns.flatMap(p => p.toLowerCase().split(/\s+/))
    const overlap = patternWords.filter(w => words.includes(w)).length / patternWords.length
    if (overlap > bestScore) { bestScore = overlap; bestIntent = intent }
  }
  return bestScore > 0.25 ? bestIntent : null
}
```

intentMap must be materially better than this 50-line version. The value it adds:
- **Cosine similarity** (semantic proximity, not just keyword overlap)
- **Configurable blended scoring** (tunable weights)
- **Incremental training** (improve without rebuilding)
- **React hooks** (lifecycle-safe integration)
- **Event system** (decouple matching from handling)
- **TypeScript types** (IntelliSense, type safety)

If any of these don't work correctly, the developer is better off with their 50-line version. The features above are the value; the table stakes below are the price of admission.

## Sources

- Codebase audit: all 7 TypeScript source files, 2 test files, package.json (HIGH confidence -- direct observation)
- CONCERNS.md: 6 tech debt items, 3 bugs, 2 security issues, 6 test gaps (HIGH confidence -- direct observation)
- npm library DX expectations: established community standards, well-documented patterns (HIGH confidence -- domain knowledge)
- Competitive landscape: `natural` (full NLP, ~3MB), `compromise` (NLP, ~300KB), `nlp.js` (node-specific, heavy). No direct competitor in the "lightweight offline intent matching" niche. (MEDIUM confidence -- based on training data, external search unavailable)
