# intentMap

## What This Is

A zero-dependency TypeScript library for offline intent matching using TF-IDF-style vector scoring and keyword overlap. General JS developers install it, define intents with example phrases, and get confidence-scored matches in real time. Includes optional React hooks.

## Core Value

`match(input)` returns a reliable, confidence-scored intent -- fast, offline, zero deps. If that doesn't work, nothing else matters.

## Requirements

### Validated

<!-- Existing capabilities already shipped in v0.1.0 -->

- ✓ Core `createIntentMap(config)` factory with TypeScript types
- ✓ `defineIntent(patterns, options?)` helper for intent definitions
- ✓ `IntentMap.match(input)` synchronous offline intent scoring
- ✓ Blended scoring engine (65% keyword overlap + 35% cosine similarity)
- ✓ Lightweight suffix-stripping stemmer
- ✓ Bigram tokenization with TF-IDF-inspired vector normalization
- ✓ Event system: `on(intent, handler)` / `off()` with `'*'` wildcard
- ✓ `IntentMap.emit(result, event?)` for manual handler dispatch
- ✓ `IntentMap.bind(element, options?)` for DOM event binding
- ✓ `IntentMap.addIntent()` / `removeIntent()` for dynamic intent management
- ✓ `IntentMap.train(intent, examples)` for incremental learning
- ✓ `IntentMap.destroy()` for clean teardown
- ✓ React adapter: `useIntentMap`, `useIntent`, `useIntentBind` hooks
- ✓ Dual ESM + CJS build via tsup with `.d.ts` declarations
- ✓ `intentmap/react` subpath export
- ✓ 26 unit tests across tokenizer and core matching
- ✓ CI workflow for Node 18, 20, 22
- ✓ Zero runtime dependencies

### Active

<!-- Production readiness goals -->

- [ ] File structure reorganized: source in `src/`, tests in `tests/`, configs aligned
- [ ] Build pipeline functional: `npm run build`, `typecheck`, `lint`, `test` all pass
- [ ] All known bugs fixed (duplicate bind listeners, edge cases in matcher)
- [ ] Input validation on all public API methods with descriptive error messages
- [ ] Input length limits to prevent memory issues with oversized strings
- [ ] Debounce/throttle option for DOM binding to prevent per-keystroke matching
- [ ] Stemmer edge cases resolved or documented ("caring"->"car", "hoped"->"hop")
- [ ] Scoring weights made configurable via `IntentConfig`
- [ ] React hooks tested: initialization, handler registration, cleanup, stale closures
- [ ] DOM binding tested: event listeners, cleanup, text extraction
- [ ] Edge case tests: empty input, Unicode, emoji, methods after destroy(), concurrent train/match
- [ ] `.gitignore` and `LICENSE` files added
- [ ] `package-lock.json` committed for reproducible builds
- [ ] Changeset config moved to `.changeset/config.json`
- [ ] Placeholder metadata replaced with real values
- [ ] `innerText` performance issue in DOM binding resolved (prefers `textContent`)
- [ ] Tokenization called once per match instead of twice

### Out of Scope

- Async/web worker matching -- acceptable for current scale, defer to future
- Persistence (serialize/deserialize trained models) -- not needed for v1.0
- Pre-built keyword index for large-scale deployments -- under 100 patterns is fine
- Mobile app support -- web-first
- Additional language support beyond English stemming
- Sandboxed iframe security hardening -- low priority

## Context

**Brownfield project.** v0.1.0 is functionally complete but architecturally broken -- the file layout doesn't match any tool config (tsup, tsconfig, vitest all reference `src/` which doesn't exist). Build, test, and typecheck commands all fail. The library works if you run tests against root-level files with vitest directly, but the published package would be non-functional.

Key issues identified in codebase audit:
- 6 tech debt items including the critical file layout mismatch
- 3 known bugs (duplicate bind listeners, fragile matcher edge cases, innerText perf)
- 2 security considerations (no input length limits, unsanitized tokenization)
- 6 test coverage gaps (React hooks, stem(), bind(), edge cases, scoring calibration)
- Missing infrastructure (.gitignore, LICENSE, package-lock.json, proper changeset config)

## Constraints

- **Zero runtime deps**: Must remain zero. All fixes are hand-rolled.
- **TypeScript strict**: `tsconfig.json` uses strict mode with `noUncheckedIndexedAccess`, `noImplicitReturns`
- **ES2020 target**: Must run in modern browsers and Node 18+
- **Breaking changes OK**: Willing to break the API to get it right (major refactor)
- **Dual format**: Must ship ESM + CJS with type declarations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Major refactor over patch | Too many structural issues to fix incrementally | — Pending |
| Keep blended scoring (65/35) | Works well empirically, just needs to be configurable | — Pending |
| Move to src/ directory structure | All tool configs already expect it | — Pending |
| Accept breaking API changes | Better to break now at v0.x than at v1.x | — Pending |

---
*Last updated: 2026-04-12 after initialization*
