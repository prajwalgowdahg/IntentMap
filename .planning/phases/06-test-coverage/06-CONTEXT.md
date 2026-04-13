# Phase 6: Test Coverage - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Comprehensive tests for React hooks, DOM binding, stemmer edge cases, boundary conditions, and scoring calibration. Six requirements (TST-01 through TST-06). This phase does NOT change any source code — it only adds and expands test files to cover gaps identified across all prior phases.

</domain>

<decisions>
## Implementation Decisions

### React hook testing approach (TST-01)
- Hybrid approach: `renderHook` for useIntentMap and useIntent (simpler, isolated), full component wrapping for useIntentBind (interacts with DOM refs directly)
- Install `@testing-library/react` as a devDependency (provides renderHook and act())
- Full lifecycle coverage for all three hooks: mount/subscription, unmount/cleanup, re-render with new props, key change re-creation, and destroyed instance handling
- Claude's discretion on jsdom environment setup (per-file docblock vs global)

### Coverage threshold (TST-06)
- Claude's discretion on whether to add numeric threshold — decide after seeing actual coverage numbers
- Keep `src/adapters/**` excluded from coverage config (existing behavior)
- All existing tests must continue to pass

### Scoring calibration detail (TST-05)
- Relative ranking tests: verify correct intent ordering for known inputs, not exact confidence values
- Test 4 weight configurations: default (0.35/0.65), cosine-heavy (0.7/0.3), keyword-heavy (0.1/0.9), equal (0.5/0.5)
- Test threshold boundaries: just above threshold should match, just below should not
- Cover both default threshold (0.2) and custom threshold values

### Test file organization
- React hook tests: single `react-hooks.test.ts` with describe blocks per hook
- Edge case tests (TST-04): new `edge-cases.test.ts` file
- Stemmer tests (TST-03): expand existing `tokenizer.test.ts` (only 52 lines currently)
- Calibration tests (TST-05): expand existing `scoring-config.test.ts`

### Claude's Discretion
- Exact jsdom environment configuration strategy
- Whether to add numeric coverage threshold to vitest.config.ts
- Specific test cases within each requirement area
- DOM binding test details (TST-02 — these already exist in `dom-binding.test.ts`, verify coverage gaps)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/intentmap.test.ts` (188 lines): Core matching tests — fixture pattern with `createIntentMap(config)` and `defineIntent()` in `beforeEach`
- `tests/tokenizer.test.ts` (52 lines): Tokenize/ngrams/normalize tests — very thin, room to expand with stem() edge cases
- `tests/dom-binding.test.ts` (325 lines): DOM binding tests already exist — verify they cover TST-02 requirements
- `tests/scoring-config.test.ts` (172 lines): Scoring config tests from Phase 5 — add calibration tests here
- `tests/validation.test.ts` (274 lines): Input validation tests from Phase 2
- `tests/engine-fixes.test.ts` (112 lines): Engine bug fix tests from Phase 3

### Established Patterns
- Fixtures defined inline: `defineIntent()` + `createIntentMap(config)` with shared config object
- `beforeEach()` for fresh instances, no shared mutable state
- `vi.fn()` for handler spies — lightweight mocking only, no module mocking
- Multiple assertions per test for result objects (check `matched`, `intent`, `confidence` together)
- Biome formatting applies to test files (`./src ./tests ./examples`)

### Integration Points
- `vitest.config.ts` — may need jsdom environment or per-file environment docblocks
- `package.json` — add `@testing-library/react` to devDependencies
- `src/adapters/react.ts` — hooks to be tested (useIntentMap, useIntent, useIntentBind)
- `src/tokenizer.ts` — stem() function for edge case testing
- `src/matcher.ts` — scoring logic for calibration tests

</code_context>

<specifics>
## Specific Ideas

- Relative ranking tests are more robust than absolute value tests — they won't break if scoring internals change
- 4 weight configurations (default, cosine-heavy, keyword-heavy, equal) cover the meaningful trade-off space
- Expanding existing test files (tokenizer.test.ts, scoring-config.test.ts) rather than creating new ones keeps the test directory manageable
- react-hooks.test.ts mirrors Phase 4's delivery — all hooks were rewritten together, tested together

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-test-coverage*
*Context gathered: 2026-04-13*
