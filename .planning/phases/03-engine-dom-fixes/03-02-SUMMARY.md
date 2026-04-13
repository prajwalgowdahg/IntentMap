---
phase: 03-engine-dom-fixes
plan: 02
subsystem: dom-binding
tags: [bind, dedup, debounce, cleanup, timers, removeIntent]

# Dependency graph
requires:
  - phase: 03-engine-dom-fixes/01
    provides: engine bug fixes (double tokenization, textContent priority)
provides:
  - Duplicate bind prevention via element dedup check
  - Trailing-only debounce support in bind()
  - Debounce timer cleanup on unbind and destroy
  - Verified removeIntent cleanup of matcher + handlers
affects: [04-react-hooks, 06-test-coverage]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-element unbind function storage, debounce with trailing-only edge, timer cleanup on teardown]

key-files:
  created: [tests/dom-binding.test.ts]
  modified: [src/types.ts, src/IntentMap.ts]

key-decisions:
  - "Stored unbind function per element in unbindFns Map to return same reference on duplicate bind()"
  - "Debounce uses trailing-only semantics with per-element timer stored in debounceTimers Map"
  - "Debounce timer cancelled on unbind, destroy, and replaced on subsequent events"
  - "removeIntent cleanup verified correct -- matcher.removeIntent + handlers.delete, no DOM unbind"

patterns-established:
  - "Per-element unbind function storage: unbindFns Map ensures reference equality for duplicate bind calls"
  - "Debounce timer pattern: debounceTimers Map keyed by element, cleared on unbind/destroy/next event"

requirements-completed: [BUG-01, BUG-05, DOM-01, DOM-02, DOM-03]

# Metrics
duration: 13min
completed: 2026-04-13
---

# Phase 3 Plan 02: DOM Binding Fixes Summary

**Fixed duplicate bind with element dedup, added trailing-only debounce to bind(), and verified removeIntent cleanup with 14 new tests**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-13T08:56:17Z
- **Completed:** 2026-04-13T09:09:17Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- Fixed BUG-01: bind() called twice on same element now skips silently and returns the same unbind function reference
- Implemented DOM-01/02: debounce option on bind() waits specified milliseconds, fires only trailing edge
- Implemented DOM-03: debounce timers cancelled on both unbind() and destroy()
- Verified BUG-05: removeIntent() correctly cleans up matcher entries and handlers map entries
- Added debounce validation: rejects zero, negative, and non-number values with TypeError
- All 77 tests pass (63 existing + 14 new)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests** - `8290e8d` (test)
2. **Task 1 (GREEN): Implementation** - `4968f05` (feat)

## Files Created/Modified
- `tests/dom-binding.test.ts` - 14 tests covering duplicate bind, debounce behavior, timer cleanup, removeIntent
- `src/types.ts` - Added `debounce?: number` to BindOptions interface
- `src/IntentMap.ts` - Added unbindFns Map, debounceTimers Map, dedup check, debounce logic, timer cleanup

## Decisions Made
- Stored unbind function per element in a separate `unbindFns` Map to ensure duplicate bind() returns the exact same function reference -- this simplified the dedup check and avoids creating unnecessary closures
- Debounce uses per-element timer stored in `debounceTimers` Map, cleared when a new event arrives (trailing-only), on unbind, and on destroy
- The unbind function has an idempotency guard (`!this.boundElements.has(element) && !this.unbindFns.has(element)`) to safely handle multiple calls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dedup returned new closure instead of same reference**
- **Found during:** Task 1 GREEN phase
- **Issue:** Plan's dedup code returned a new closure each time, but tests required `unbind2 === unbind1`
- **Fix:** Added `unbindFns` Map to store and return the same function reference on duplicate bind
- **Files modified:** src/IntentMap.ts
- **Commit:** 4968f05

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 4 (React hooks) can begin -- bind() API is now stable with dedup and debounce
- Phase 5 (Scoring) is independent and can proceed in parallel
- All 77 tests passing, TypeScript compiles cleanly

## Self-Check: PASSED
- tests/dom-binding.test.ts: FOUND
- src/types.ts: FOUND (contains debounce field)
- src/IntentMap.ts: FOUND (contains unbindFns, debounceTimers, dedup check)
- Commit 8290e8d (RED): FOUND
- Commit 4968f05 (GREEN): FOUND

---
*Phase: 03-engine-dom-fixes*
*Completed: 2026-04-13*
