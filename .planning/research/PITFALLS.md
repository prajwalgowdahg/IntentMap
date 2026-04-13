# Pitfalls Research

**Domain:** TypeScript npm library refactoring (production readiness)
**Researched:** 2026-04-12
**Confidence:** HIGH (common refactoring patterns, well-documented mistakes)

## Critical Pitfalls

### 1. Moving files breaks import paths silently
- **Warning sign:** After moving files to `src/`, imports like `from './tokenizer.js'` may resolve differently depending on module resolution strategy
- **Prevention:** Move all files first, update all imports, then run `tsc --noEmit` to catch every broken import before touching any logic
- **Phase:** Phase 1 (restructure)

### 2. Changing public API breaks existing tests
- **Warning sign:** Adding validation to `match()` means tests that pass `undefined` or weird values will start throwing instead of returning results
- **Prevention:** Fix file layout and make it build FIRST. Then add validation in a separate phase so test failures are clearly from validation, not from broken imports
- **Phase:** Phase 2 (validation)

### 3. React hook refactoring introduces new bugs
- **Warning sign:** Fixing the `useIntent` stale closure by adding `handler` to deps causes re-subscription on every render, potentially firing handlers multiple times
- **Prevention:** Use `useRef` pattern for handler reference (store handler in ref, subscribe once, call `ref.current()` in the callback). Test with `@testing-library/react-hooks` or `renderHook`
- **Phase:** Phase 3 (hooks)

### 4. Stemmer changes silently change all match scores
- **Warning sign:** Fixing "caring"->"car" changes the stem of "caring", which changes the vector for any intent containing "care" or "caring", which changes all scores
- **Prevention:** Snapshot the current match results for all existing test inputs BEFORE touching the stemmer. After any stemmer change, compare results. If scores shift, it's intentional and documented
- **Phase:** Phase 4 (scoring)

### 5. Adding input validation changes error behavior
- **Warning sign:** Code that currently handles `match(undefined)` gracefully (returns no-match) will start throwing `TypeError`. Consumers may depend on the current behavior
- **Prevention:** Since this is v0.x and the user approved breaking changes, throw descriptive errors. Document all breaking changes in CHANGELOG. This is the right time for it
- **Phase:** Phase 2 (validation)

### 6. Debounce implementation creates cleanup complexity
- **Warning sign:** If debounce uses `setTimeout` and the element is unbound or destroyed before the timeout fires, the callback runs against cleared state
- **Prevention:** Store timeout IDs per element. Clear them in the cleanup function returned by `bind()` and in `destroy()`. Test cleanup explicitly
- **Phase:** Phase 3 (DOM binding)

### 7. Configurable weights change default behavior
- **Warning sign:** If weights are normalized (sum to 1.0), the current 0.35/0.65 ratio must produce identical results when explicitly configured vs when using defaults
- **Prevention:** Default to `undefined` in config, apply 0.35/0.65 only when undefined. When explicitly set, normalize. Test that `{ weights: { cosine: 0.35, keyword: 0.65 } }` produces identical scores to no weights config
- **Phase:** Phase 4 (scoring)

### 8. Test files moved to `tests/` break vitest
- **Warning sign:** vitest.config.ts already expects `tests/**/*.test.ts`, but current test imports use `'../src/index.js'`. After moving, these paths must be updated
- **Prevention:** Move test files, update import paths to `'../src/index.js'` (relative from tests/), run `vitest run` immediately to verify
- **Phase:** Phase 1 (restructure)

## Phase-Wise Risk Assessment

| Phase | Risk Level | Key Risk |
|-------|-----------|----------|
| 1. Restructure | MEDIUM | Import path breakage — mitigated by `tsc --noEmit` after move |
| 2. Validation + Fixes | MEDIUM | Breaking existing test expectations — mitigated by updating tests in same phase |
| 3. DOM + React | HIGH | Hook lifecycle bugs — mitigated by dedicated hook tests with renderHook |
| 4. Scoring + Config | LOW | Score drift — mitigated by snapshot comparison |
| 5. Package Quality | LOW | Process issues — mitigated by checklist approach |

---
*Pitfalls research: 2026-04-12*
