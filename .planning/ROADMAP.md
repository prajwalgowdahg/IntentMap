# Roadmap: intentMap

## Overview

Transform intentMap from a functionally-complete but structurally-broken v0.1.0 into a production-ready npm package. The journey starts with fixing the file layout (unblocking all tooling), then layers in package infrastructure and input validation, fixes known bugs, hardens the React adapter, adds scoring configurability, and locks everything in with comprehensive test coverage. Each phase delivers a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Build Pipeline** - Restructure files to src/ and fix all tooling commands
- [ ] **Phase 2: Package & Validation** - Add package infrastructure and input validation on all public API methods
- [x] **Phase 3: Engine & DOM Fixes** - Fix known bugs in matcher, DOM binding, and add debounce support (completed 2026-04-13)
- [ ] **Phase 4: React Adapter** - Harden React hooks with stale closure fixes and proper cleanup
- [ ] **Phase 5: Scoring Configuration** - Make scoring weights configurable and add debug mode
- [ ] **Phase 6: Test Coverage** - Comprehensive tests for React hooks, DOM binding, edge cases, and scoring calibration

## Phase Details

### Phase 1: Build Pipeline
**Goal**: Developers can run build, typecheck, lint, and test against a correctly structured src/ directory
**Depends on**: Nothing (first phase)
**Requirements**: BLD-01, BLD-02, BLD-03, BLD-04, BLD-05, BLD-06, BLD-07
**Success Criteria** (what must be TRUE):
  1. `npm run build` produces working ESM + CJS output in `dist/` with type declarations
  2. `npm run typecheck` passes with strict mode and all safety flags enabled
  3. `npm run lint` passes against `src/` and `tests/` directories
  4. `npm run test` passes with all 26 existing tests
  5. `import { createIntentMap } from 'intentmap'` and `import { useIntentMap } from 'intentmap/react'` both resolve from the built output
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Restructure files into src/, tests/, examples/ and verify full build pipeline

### Phase 2: Package & Validation
**Goal**: The package has proper npm infrastructure and all public API methods reject invalid input with clear error messages
**Depends on**: Phase 1
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04, PKG-05, VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06, VAL-07, VAL-08
**Success Criteria** (what must be TRUE):
  1. `.gitignore`, `LICENSE`, and `package-lock.json` are present and committed
  2. Package metadata contains real author values (no placeholders) and changeset config is in `.changeset/config.json`
  3. Calling `createIntentMap()` with an invalid config object throws a descriptive `TypeError`
  4. Calling `match()` with non-string input, or calling any public method after `destroy()`, throws a descriptive error
  5. `match()` silently returns no-match for input exceeding 10,000 characters instead of crashing
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Add LICENSE, patch .gitignore, and update package.json metadata (PKG-01 through PKG-05)
- [ ] 02-02-PLAN.md — Add input validation to all public methods with comprehensive tests (VAL-01 through VAL-08)

### Phase 3: Engine & DOM Fixes
**Goal**: The matching engine and DOM binding behave correctly with no known bugs, and bind() supports debounce
**Depends on**: Phase 2
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04, BUG-05, DOM-01, DOM-02, DOM-03
**Success Criteria** (what must be TRUE):
  1. Calling `bind()` multiple times on the same element does not register duplicate event listeners
  2. `bind()` with a `debounce` option waits the specified milliseconds between match calls, and the timeout is cleaned up on unbind or destroy
  3. `match()` with no registered intents returns a clean no-match result instead of crashing on an undefined sort result
  4. `removeIntent()` fully cleans up associated handlers, DOM bindings, and vector store entries
  5. Text extraction from bound elements uses `textContent` (not `innerText`) and tokenization is computed once per match call
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md -- Fix double tokenization in matcher, textContent priority in extractText, verify no-intent edge case (BUG-02, BUG-03, BUG-04)
- [ ] 03-02-PLAN.md — Fix duplicate bind, add debounce support, verify removeIntent cleanup (BUG-01, BUG-05, DOM-01, DOM-02, DOM-03)

### Phase 4: React Adapter
**Goal**: React hooks handle lifecycle correctly with no stale closures, proper cleanup, and graceful destroyed-state handling
**Depends on**: Phase 3
**Requirements**: RCT-01, RCT-02, RCT-03, RCT-04
**Success Criteria** (what must be TRUE):
  1. `useIntentMap` re-creates the IntentMap instance when its `key` prop changes
  2. `useIntent` fires the latest handler reference on each match without re-subscribing (no stale closure)
  3. `useIntentBind` cleans up DOM event listeners on component unmount without leaking
  4. All three hooks behave gracefully when the IntentMap instance has been destroyed (no crashes)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Scoring Configuration
**Goal**: Developers can tune scoring weights and use a custom stemmer, and debug mode reveals per-intent scoring breakdowns
**Depends on**: Phase 3
**Requirements**: SCR-01, SCR-02, SCR-03, SCR-04
**Success Criteria** (what must be TRUE):
  1. `IntentConfig` accepts a `weights` option that adjusts cosine and keyword scoring ratios, normalized internally to sum to 1.0
  2. Omitting `weights` in config produces identical results to the original 0.35/0.65 default (no behavior change)
  3. `MatchResult` includes a `debug` field with per-intent scoring breakdown when `debug: true` is set in config
  4. `IntentConfig` accepts a `stemmer` option that replaces the default stemmer with a custom function
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Test Coverage
**Goal**: The test suite comprehensively covers React hooks, DOM binding, stemmer edge cases, boundary conditions, and scoring calibration
**Depends on**: Phase 4, Phase 5
**Requirements**: TST-01, TST-02, TST-03, TST-04, TST-05, TST-06
**Success Criteria** (what must be TRUE):
  1. React hook tests cover all three hooks (useIntentMap, useIntent, useIntentBind) using `@testing-library/react` or `renderHook`
  2. DOM binding tests cover `bind()`, text extraction, event listener cleanup, and debounce behavior using jsdom
  3. Stemmer unit tests cover known edge cases (caring, hoped, running, buses, etc.)
  4. Edge case tests cover empty string, very long input, Unicode/emoji, post-destroy calls, and concurrent train/match
  5. Scoring calibration tests verify confidence ranges and threshold boundaries
  6. All original 26 tests continue to pass after all changes
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6
Note: Phase 4 and Phase 5 depend on Phase 3 but not on each other. They can execute in parallel if desired, but the canonical order is 4 then 5.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Build Pipeline | 1/1 | Complete | 2026-04-13 |
| 2. Package & Validation | 2/2 | Complete | 2026-04-13 |
| 3. Engine & DOM Fixes | 1/2 | Complete    | 2026-04-13 |
| 4. React Adapter | 0/? | Not started | - |
| 5. Scoring Configuration | 0/? | Not started | - |
| 6. Test Coverage | 0/? | Not started | - |
